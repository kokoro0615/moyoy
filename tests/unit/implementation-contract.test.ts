import { describe, expect, it } from "vitest";

import {
  implementationContract,
  targetViewports,
} from "../../src/lib/implementation-contract";
import { aboutLines, chapters, products } from "../../src/lib/moyoy-content";

describe("production implementation contract", () => {
  it("separates implemented copy from still-unapproved production derivatives", () => {
    expect(implementationContract).toEqual({
      approvedAssetsConfigured: false,
      approvedCopyConfigured: true,
      foundationOnly: false,
      // DA-FOOTER-01 hides 個人情報保護方針 and サイトご利用にあたって at launch.
      launchHiddenFooterPolicyLinks: true,
      productionAssetsApproved: false,
      searchIndexingAllowed: false,
    });
  });

  it("defines every required fidelity viewport", () => {
    expect(targetViewports).toEqual([
      { height: 900, label: "desktop", width: 1440 },
      { height: 1024, label: "tablet", width: 768 },
      { height: 844, label: "mobile", width: 390 },
    ]);
  });

  it("keeps the approved narrative complete and NEWS-free", () => {
    expect(chapters.map(({ id, number }) => ({ id, number }))).toEqual([
      { id: "root", number: "OO1" },
      { id: "dusk", number: "OO2" },
      { id: "dawn", number: "OO3" },
      { id: "alpine", number: "OO4" },
    ]);
    expect(products).toHaveLength(3);
    expect(aboutLines).toHaveLength(8);
    expect(JSON.stringify({ aboutLines, chapters, products })).not.toContain("NEWS");
  });
});
