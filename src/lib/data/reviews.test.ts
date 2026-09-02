import { describe, expect, it } from "vitest";
import { PUBLIC_REVIEWS } from "./reviews";

describe("public reviews", () => {
  it("publishes only reviews with confirmed source and consent", () => {
    expect(
      PUBLIC_REVIEWS.every(
        (review) => review.sourceConfirmed && review.consentConfirmed,
      ),
    ).toBe(true);
  });

  it("uses a valid 1-5 rating for every published review", () => {
    expect(
      PUBLIC_REVIEWS.every(
        (review) => Number.isInteger(review.rating) && review.rating >= 1 && review.rating <= 5,
      ),
    ).toBe(true);
  });
});
