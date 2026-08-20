import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { adobeFontsKitStylesheet, paperTint } from "@/lib/implementation-contract";

import "./globals.css";

export const metadata: Metadata = {
  title: "MOYOY",
  robots: {
    follow: false,
    index: false,
  },
};

export const viewport: Viewport = {
  colorScheme: "light",
  initialScale: 1,
  /* Without a declared tint iOS Safari picks its own from the rendered page, and on the
     approved paper page it settled on the chapter tone behind the fixed plate: a dark
     green band above the status bar and below the toolbar. The page top is paper, so
     the tint is stated rather than sampled. */
  themeColor: paperTint,
  viewportFit: "cover",
  width: "device-width",
};

/**
 * Both artboards are resolved against the viewport with `zoom`, and the CSS that
 * computes the ratio depends on `atan2()` over two lengths — the one construct on this
 * page whose implementations still disagree (see `src/app/globals.css`). Shipping Safari
 * answers 0, which makes `zoom` invalid and renders the 1200 px / 375 px canvas at its
 * authored width: the whole page then sits in a centred column with a paper gutter down
 * both edges, and every scroll offset the motion controller derives from the same ratio
 * is wrong with it.
 *
 * This runs while the head is parsed — before anything is painted — and writes both
 * ratios as plain numbers, which every engine that supports `zoom` at all can use. The
 * divisor is `clientWidth` rather than the `100vw` it replaces: the artboard is fitted
 * to `.page-canvas`, whose width excludes a classic scrollbar, and `clientWidth` is also
 * the one reading iOS Safari leaves alone while a pinch-zoom is in progress.
 */
const artboardScaleScript = [
  "(function(){var d=document.documentElement;function s(){",
  "var w=d.clientWidth||window.innerWidth;if(!w)return;",
  'd.style.setProperty("--pc-canvas-scale",String(w/1200));',
  'd.style.setProperty("--sp-canvas-scale",String(w/375));}s();',
  'addEventListener("resize",s,{passive:true});',
  'addEventListener("orientationchange",s,{passive:true});})();',
].join("");

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ja">
      <head>
        <script dangerouslySetInnerHTML={{ __html: artboardScaleScript }} />
        {/* DA-ASSET-01 requires the two named source faces to be reproduced through web
            font delivery, and the source supplies the Adobe Fonts kit that serves them.
            The modern CSS embed replaces the source's script embed: same kit, one
            render-blocking stylesheet instead of a timed script, and no wf-* class
            juggling. The kit is domain-locked, so it only resolves once the deploy
            origin is registered in Adobe Fonts; until then the local subsets below keep
            rendering. See docs/open-questions.md Q-05. */}
        <link href="https://use.typekit.net/" rel="preconnect" />
        <link crossOrigin="anonymous" href="https://p.typekit.net/" rel="preconnect" />
        <link href={adobeFontsKitStylesheet} rel="stylesheet" />
        {/* One measured first-paint text face is preloaded; the Latin subset is small
            enough to arrive with the stylesheet request. */}
        <link
          as="font"
          crossOrigin="anonymous"
          href="/assets/moyoy-candidate/font/moyoy-noto-sans-jp-subset.woff2"
          rel="preload"
          type="font/woff2"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
