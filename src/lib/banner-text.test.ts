import { describe, expect, it } from "vitest";
import { getBalancedBannerTextLines } from "./banner-text";

describe("getBalancedBannerTextLines", () => {
  it("keeps short banner descriptions on one line", () => {
    expect(getBalancedBannerTextLines("Short and focused.")).toEqual(["Short and focused."]);
  });

  it("splits long banner descriptions near the middle word boundary", () => {
    expect(
      getBalancedBannerTextLines(
        "Not Super Food, But Super Soil Soil5 delivers gentle, nature-inspired care for comfortable-looking skin"
      )
    ).toEqual([
      "Not Super Food, But Super Soil Soil5 delivers gentle,",
      "nature-inspired care for comfortable-looking skin"
    ]);
  });
});
