import { describe, expect, it } from "vitest";
import { PUBLIC_SHOWCASE_PROPERTIES, PUBLIC_SHOWCASE_TOTAL_UNITS } from "./public-showcase";

describe("public showcase portfolio", () => {
  it("uses twelve fictional large-building examples with unique images", () => {
    expect(PUBLIC_SHOWCASE_PROPERTIES).toHaveLength(12);
    expect(new Set(PUBLIC_SHOWCASE_PROPERTIES.map((property) => property.imagePath)).size).toBe(12);
    expect(PUBLIC_SHOWCASE_PROPERTIES.map((property) => property.totalUnits)).toEqual(
      expect.arrayContaining([40, 48, 50, 52, 56, 60, 64, 72, 84, 96, 110, 128]),
    );
  });

  it("keeps public records non-identifying and consistently described", () => {
    for (const property of PUBLIC_SHOWCASE_PROPERTIES) {
      expect(property.address).not.toMatch(/\d/);
      expect(property.summary).toBeTruthy();
      expect(property.focus).toHaveLength(3);
    }
    expect(PUBLIC_SHOWCASE_TOTAL_UNITS).toBe(860);
  });
});
