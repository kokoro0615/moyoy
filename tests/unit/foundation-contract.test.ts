import { describe, expect, it } from "vitest";

import { foundationContract, targetViewports } from "../../src/lib/foundation-contract";

describe("foundation contract", () => {
  it("keeps unapproved production content and indexing disabled", () => {
    expect(foundationContract).toEqual({
      approvedAssetsConfigured: false,
      approvedCopyConfigured: false,
      foundationOnly: true,
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
});
