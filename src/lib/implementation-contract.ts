export interface TargetViewport {
  readonly height: number;
  readonly label: "desktop" | "mobile" | "tablet";
  readonly width: number;
}

/**
 * Adobe Fonts web project supplied verbatim in the source design annotation. It is the
 * delivery path DA-ASSET-01 specifies for Futura PT and 秀英角ゴシック銀 Std.
 */
export const adobeFontsKitId = "yhj3ndj";

export const adobeFontsKitStylesheet = `https://use.typekit.net/${adobeFontsKitId}.css`;

export const implementationContract = Object.freeze({
  approvedAssetsConfigured: false,
  approvedCopyConfigured: true,
  foundationOnly: false,
  /**
   * DA-FOOTER-01: the two leaders of 「この二つのコンテンツは一旦非表示で公開する」 land on the
   * footer links 個人情報保護方針 and サイトご利用にあたって, so both ship hidden at launch.
   */
  launchHiddenFooterPolicyLinks: true,
  productionAssetsApproved: false,
  searchIndexingAllowed: false,
});

export const targetViewports: readonly TargetViewport[] = Object.freeze([
  { height: 900, label: "desktop", width: 1440 },
  { height: 1024, label: "tablet", width: 768 },
  { height: 844, label: "mobile", width: 390 },
]);
