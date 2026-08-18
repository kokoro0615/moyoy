export interface TargetViewport {
  readonly height: number;
  readonly label: "desktop" | "mobile" | "tablet";
  readonly width: number;
}

export const foundationContract = Object.freeze({
  approvedAssetsConfigured: false,
  approvedCopyConfigured: false,
  foundationOnly: true,
  searchIndexingAllowed: false,
});

export const targetViewports: readonly TargetViewport[] = Object.freeze([
  { height: 900, label: "desktop", width: 1440 },
  { height: 1024, label: "tablet", width: 768 },
  { height: 844, label: "mobile", width: 390 },
]);
