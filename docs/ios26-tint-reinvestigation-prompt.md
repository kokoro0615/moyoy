# MOYOY iOS 26 Safari ブラウザバー帯 — 崩壊した修正の根本原因再調査

新しいセッションでこのファイルの内容全体をそのまま貼り付けて開始すること。

## プロジェクト
このリポジトリのルート (Next.js 16 / React 19)

対象コミット: `ceb7ae5`（`fix: let Safari read the browser bar tint, and read it
from the artwork`）。**このコミットは `main` にマージ済み・`origin` に push 済み。**
本番デプロイ（Vercel）にも反映されている前提で調査すること。反映されていない場合は
デプロイ状況の確認を最優先で行う。

## 症状
iPhone 実機の iOS 26 Safari で、ページ上下に想定外の帯（ステータスバー/ツールバーの
チント色）が出続けている。前回セッションで「原因を特定し修正した」つもりだったが、
実機確認では改善していない。「崩壊している」との報告あり — 単なる色の不一致ではなく、
レイアウト自体が壊れている可能性も排除しないこと。

## 前回セッションで行ったこと（結論：検証方法が実機を証明していない）
1. `.chrome-tint` という2枚の `position: fixed` アンカー（上端/下端、各16px）を
   `src/components/site-menu.tsx` に追加し、`src/app/globals.css` でスタイリング。
2. アンカーを `z-index: -1`（不透明キャンバスの下）から `opacity: 0`（`z-index: 120`）に変更。
   根拠: https://github.com/andesco/safari-color-tinting のREADME — Safari 26 は
   `display: none` のみサンプリング対象外、`opacity: 0` は依然サンプリングされる、との記載。
3. 章ごとの色定数テーブルを廃止し、写真・マスク・紙の前景を実行時に Canvas でランプ化して
   合成する方式に変更（`src/components/page-motion.tsx`）。
4. `measure()` 内の `window.scrollY` と `getBoundingClientRect()` の不整合バグを修正
   （WebKit のスレッド分離スクロールに起因）。
5. **検証は Playwright の `webkit` プロジェクトのみ**で行い、スクリーンショットのRGB平均と
   JS側で計算した色の距離を測って「一致した」と判断した。

### 検証方法の致命的な欠陥（最優先で疑うべき点）
**Playwright の `webkit` は実機 Safari のネイティブブラウザチューム（ステータスバー/
ツールバー）を一切レンダリングしない。** ステータスバー/ツールバーのチント処理は
Safari アプリ本体（ネイティブ UI 層）が行っており、Playwright がキャプチャする
Web コンテンツの描画結果には現れない。つまり前回のセッションで行った「実測」は、
**「JS が計算した色」と「ページのピクセル色」を比較しただけ**であり、
**Safari が実際にそのアンカーをサンプリングしているかどうかは一度も検証していない。**
これは検証プロセス全体の前提が崩れていたことを意味する。今回のセッションでは
Playwright を根拠に「直った」と判断することを禁止し、実機または Safari Web Inspector
（Mac + ケーブル接続、Develop メニュー経由）でのみ判断すること。

## 優先度順・調査すべき仮説（すべて洗い出すこと。以下は出発点であり網羅ではない）

### 最優先：JS駆動の再サンプリングが機能していない疑い
今回の実装は「スクロールに応じて `--chrome-tint` カスタムプロパティを JS で書き換える」
方式に依存している。しかし調査中に見つけた情報源には矛盾がある：
- 一部の情報源（safari-color-tinting リポジトリ）: "Safari re-samples body as needed.
  WebKit has a live observer that directly updates the colour of Safari UI as it changes."
- 別の情報源（nasedk.in のブログ）: "Changes via JavaScript don't trigger re-sampling"
  because colour derivation occurs "at initial render"。

**もし後者が正しければ**、Safari は初回ペイント時の `background-color` しかサンプリング
せず、以後 JS がカスタムプロパティを書き換えても再サンプリングされない。この場合、
初回ロード時のアンカー色（`var(--chrome-tint, var(--paper))` のフォールバック値 = 紙色）
がそのまま固定され、スクロールしても永久に紙色の帯が残る——これは報告された症状
（帯が消えない）と完全に一致する。この矛盾を一次情報（WebKit ソースコード / WebKit
Bugzilla / Apple 公式ドキュメント / WebKit blog のリリースノート）で解決すること。
もしこれが真の原因なら、解決策は「JS でのランタイム更新」ではなく、**サーバー側で
初回スクロール位置に対応する正しい色を静的にレンダリングする**方式への転換が必要になる
（ただしこのページはスクロール連動なので、そもそも「JSでの継続更新」抜きに実現できない
可能性があり、この場合は別のアーキテクチャ——例えば章ごとにセクションを分けて各セクション
内に sticky なチントアンカーを配置する等——を検討する必要がある）。

### 優先度2：デプロイ/キャッシュ
- 修正コミットが実際に Vercel 本番に deploy 済みか確認（`git log`、Vercel ダッシュボード
  または `vercel:status` / `vercel:deployments-cicd` スキル使用）。
- 実機での確認が古いキャッシュ（Safari のページキャッシュ、CDN edge cache）を見ていない
  か。ハードリロード・プライベートブラウズでの再確認を指示する。

### 優先度3：ユーザー環境設定
- 実機の Safari 設定「設定 > Apps > Safari > タブ > ウェブサイトの色を表示」がオフに
  なっていないか（この場合そもそもどんな実装でも帯は消えない）。
- 「透明度を下げる」「コントラストを上げる」等のアクセシビリティ設定がチントを無効化
  していないか。

### 優先度4：サンプリングルールの再現条件の見落とし
- 通常のSafariタブ表示か、ホーム画面追加（PWA/standalone）かで挙動が異なる可能性。
  一部情報源が "viewport-fit=cover ... particularly for home-screen web apps" と
  言及しており、通常タブでの挙動が別ルールである可能性を排除できていない。
- アンカーの幾何条件（上端4px以内/下端3px以内、幅80%以上、高さ3px以上）が実機の
  Dynamic Island / セーフエリア込みの実座標で本当に満たされているか、実機の
  Safari Web Inspector で `getBoundingClientRect()` を直接叩いて確認する。
- 他の `position: fixed` 要素（`.menu-open-button` など）がアンカーより優先して
  サンプリングされていないか、全 fixed/sticky 要素を実機で洗い出す。
- 使用中の iOS バージョンが 26.0/26.1/26.2 のどれか確認する。WebKit Bugzilla の
  #302272（#300965 の重複）に "Safari 26.2 で修正済みと報告" との記述があり、
  ユーザーの iOS バージョンによってはエンジン側のバグが未修正のまま残っている
  可能性がある。

### 優先度5：本番環境固有の実行時エラー
- 今回追加した Canvas ベースの色サンプリング（`readRamp()` 内の
  `context.getImageData()`）が本番の画像 CDN（Vercel Image Optimization 等）から
  配信される画像で CORS 起因のタインテッド Canvas エラーを投げていないか。
  `next.config.ts` の画像設定・アセットのオリジンを確認し、実機の Safari Web
  Inspector コンソールでエラーの有無を直接確認する。
- CSP ヘッダー（`next.config.ts` の `securityHeaders`）が何らかの処理をブロック
  していないか。

## Codex 5.6 high への委譲指示（必須）
`@.claude/rules/codex-delegation.md` の手順に従い、上記の矛盾の解決と現行の
正確なサンプリング仕様の洗い出しを Codex に委譲すること。read-only での調査を
先に行う：

```bash
codex exec --model "gpt-5.6-sol" --config model_reasoning_effort=\"high\" --sandbox read-only --full-auto "
Objective: Resolve a contradiction in community-sourced documentation about iOS 26 Safari's
browser-chrome tinting sampling behaviour, and produce a verified, current implementation plan.

Context:
- Safari 26 dropped the theme-color meta tag entirely and instead samples the
  background-color/backdrop-filter of a position:fixed or sticky element near a viewport
  edge, falling back to <body>.
- Two conflicting claims exist in secondary sources:
  (a) https://github.com/andesco/safari-color-tinting says 'Safari re-samples body as
      needed. WebKit has a live observer that directly updates the colour of Safari UI
      as it changes.'
  (b) https://nasedk.in/blog/ios26-safari-toolbar-colors/ says 'Changes via JavaScript
      don't trigger re-sampling' because colour derivation occurs 'at initial render'.
- Our implementation drives the tint by writing a CSS custom property
  (--chrome-tint) on two fixed-position anchor elements from a requestAnimationFrame
  scroll loop in React (src/components/page-motion.tsx). If claim (b) is correct for our
  case, the tint would only ever reflect the anchor's color at first paint/hydration and
  never update on scroll — which matches an observed real-device symptom (persistent
  incorrect band that does not track scroll).

Research (do not trust secondary blogs alone; find primary/canonical sources):
- WebKit source (WebKit/Source/WebKit, browser chrome / theme-color / tab bar tinting
  implementation) via web search of webkit.org / trac.webkit.org / GitHub mirrors.
- WebKit Bugzilla bug 302272 and its duplicate 300965 — current status, any linked patches,
  and exact wording of what triggers re-evaluation (initial layout only? every style
  recalc? every compositing update? mutation observer on inline style?).
- Any official Apple documentation, WWDC 2026 session notes, or Safari Technology Preview
  release notes mentioning 'website tinting' / 'tab bar tinting' / 'toolbar tinting'.
- Safari 26.0 vs 26.1 vs 26.2 vs 26.3 changelogs for any tinting-related fix, especially
  around JS-driven or dynamically-changing background colors.
- Whether tinting behaviour differs between a normal Safari tab and a home-screen
  (standalone display-mode) PWA.

Deliverable:
1. A definitive answer, with citations, on whether and how often Safari re-samples a
   fixed/sticky element's background-color after initial paint (on inline style mutation,
   on requestAnimationFrame-driven style writes, on scroll, or never).
2. If re-sampling on JS-driven changes is NOT reliably supported: propose a concrete
   alternative architecture that does not depend on continuous JS updates to a single pair
   of fixed anchors (e.g. per-section sticky anchors, one real fixed element whose
   background-color is set once per scroll-snap boundary via a cheaper trigger, or any
   pattern used by production sites known to handle this correctly).
3. Confirm current sampling geometry thresholds (top/bottom distance, width %, height
   minimum) against source rather than the community-reverse-engineered numbers we used.
4. Flag any known outstanding WebKit bugs affecting our exact iOS version range that no
   application-level fix can work around.
Output format:
## Findings (with citations)
## Contradiction resolution
## Recommended architecture change
## Remaining known limitations
" 2>/dev/null
```

## 実機検証手順（Playwright は使用禁止。以下のみ有効な検証）
1. Mac + Lightning/USB-C ケーブルで実機を接続し、Safari の「開発」メニュー →
   デバイス名 → 対象ページ を開き Web Inspector を起動する。
2. コンソールに JS エラーが出ていないか確認（Canvas taint, CSP violation 等）。
3. `document.querySelectorAll('.chrome-tint')` の `getBoundingClientRect()` と
   `getComputedStyle()` を実機で直接評価し、幾何条件を満たしているか確認する。
4. 実機で複数のスクロール位置のスクリーンショットを撮影し、ユーザーに確認してもらう
   （自動化テストでの「一致」を根拠にしない）。
5. 修正後、同じ Web Inspector 接続下で「初回ロード時」と「スクロール後」でステータス
   バー/ツールバーの実際の色が変わるかを目視確認する。

## 期待するアウトプット
- 矛盾の一次情報での解決
- 実機で検証可能な、具体的な実装方針の変更案（コード変更前に方針を提示し、
  必要なら承認を得てから実装）
- Playwright ベースの回帰テストは「アンカー色が正しく計算されているか」の保証にしか
  ならないことを明記し、実機確認なしに「修正完了」と報告しないこと

## 申し送り
コミット `ceb7ae5` は `main` にマージ済み・push 済み。新しいセッションは `main` から
作業を開始すること（新規ブランチを切るかは状況に応じて判断）。
