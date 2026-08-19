export const products = [
  {
    id: "perfume-15",
    category: "Fashion Fragrance",
    name: "PERFUME",
    volume: "15ml",
    dimensions: "W31×D31×H110mm",
    priceLines: ["¥15,000（税抜）"],
    drawing: "pc-product-perfume-15.svg",
    drawingWidth: 30.43,
    drawingHeight: 108.03,
  },
  {
    id: "perfume-50",
    category: "Fashion Fragrance",
    name: "PERFUME",
    volume: "50ml",
    dimensions: "W63×D47×H88mm",
    priceLines: ["¥32,000（税抜）"],
    drawing: "pc-product-perfume-50.svg",
    drawingWidth: 62.14,
    drawingHeight: 86.36,
  },
  {
    id: "diffuser-500",
    category: "Room Fragrance",
    name: "DIFFUSER",
    volume: "500ml",
    dimensions: "W139×D114×H108mm",
    priceLines: [
      "本体＋スティック ¥22,000（税抜）",
      "詰め替え用＋スティック ¥12,000（税抜）",
    ],
    drawing: "pc-product-diffuser-500.svg",
    drawingWidth: 136.09,
    drawingHeight: 244.97,
  },
] as const;

/**
 * DA-MOTION-01/02. Every approved contour export is split into one file per contour path
 * by `scripts/generate-contour-layers.mjs`, so each line can carry its own scroll depth.
 * The recorded box is the source viewBox: stacking the layers at rest reproduces the
 * original drawing pixel for pixel (verified against the unsplit export).
 */
export const contourGroups = {
  hero: {
    layers: 4,
    pc: { width: 1287.14, height: 1344.45 },
    sp: { width: 495.95, height: 920.64 },
  },
  product: {
    layers: 3,
    pc: { width: 1227.05, height: 442.91 },
    sp: { width: 471.74, height: 170.37 },
  },
  footer: {
    layers: 2,
    pc: { width: 1064.96, height: 521.67 },
    sp: { width: 600.13, height: 294.03 },
  },
} as const;

export type ContourGroupName = keyof typeof contourGroups;

export const chapters = [
  {
    id: "root",
    spWidth: 751,
    spHeight: 1733,
    wideHeight: 3866,
    pcHeight: 3624,
    name: "ROOT",
    number: "OO1",
    alt: "深い緑の森に立つ曲がった巨木",
    lines: [
      "深い森の中はまるで夜のようだ。",
      "暗い足元を踏みしめながら進む。",
      "地面の裂け目を下り、奥へ、奥へ。",
      "突如としてひらけた空間には",
      "苔むし、霧が立ちこめている。",
      "わずかに射し込む光に照らされて",
      "中央に浮かび上がる巨木の根。",
      "大地の呼吸だけが聞こえてくる。",
    ],
  },
  {
    id: "dusk",
    spWidth: 751,
    spHeight: 1736,
    wideHeight: 3875,
    pcHeight: 3633,
    name: "DUSK",
    number: "OO2",
    alt: "山の稜線に沈む橙色の太陽",
    lines: [
      "西向きの斜面にたたずみ",
      "橙色の光を浴びて",
      "ひとりぼっちの影が伸びていく。",
      "見渡す限り何も動かず",
      "時間が止まっているかのよう。",
      "ずっとこのままでと祈りながら",
      "一日の余熱を懐にしまいこむ。",
      "すぐに訪れる闇を越えていくために。",
    ],
  },
  {
    id: "dawn",
    spWidth: 751,
    spHeight: 1758,
    wideHeight: 3949,
    pcHeight: 3702,
    name: "DAWN",
    number: "OO3",
    alt: "緑の森へ差し込む朝の光芒",
    lines: [
      "木々の間をまっすぐに貫く",
      "道の先から日が昇ろうとしている。",
      "背後から吹く風に追い越されて",
      "まとう空気が明るく輝き始める。",
      "光に引っ張られているのか",
      "風に押されているのか",
      "体は今にも駆け出しそうな",
      "力と軽やかさを得て、前へ。",
    ],
  },
  {
    id: "alpine",
    spWidth: 751,
    spHeight: 1739,
    wideHeight: 3884,
    pcHeight: 3641,
    name: "ALPINE",
    number: "OO4",
    alt: "青空の下に連なる雪山の稜線",
    lines: [
      "不思議と寒さは感じない。",
      "ひたすらに透き通っている。",
      "山頂は白い光に包まれ",
      "青い空は驚くほど近い。",
      "無風の瞬間",
      "雪がすべての音を吸い込む。",
      "重力が少しだけ弱まり",
      "息を吐いたらふわりと浮かんだ。",
    ],
  },
] as const;

export const aboutLines = [
  "忘れていること。",
  "気づいていないこと。",
  "内側に眠る本当のこと。",
  "呼び覚ますために空気を変える。",
  "日常から一瞬で旅に出る。",
  "心が動けば、それが「はじまり」。",
  "想像のなかで踏み出す一歩が",
  "現実の一歩へとつながっていく。",
] as const;

export const footer = {
  account: "@moyoy-official",
  address: "〒541-0048 大阪市中央区南船場1-11-9 4階 E号",
  company: "株式会社Phono MOYOY事業部",
  copyright: "\u00a9 2026 Phono inc.",
  policyLabels: ["個人情報保護方針", "サイトご利用にあたって"],
  telephone: "tel.06-7777-5945",
} as const;
