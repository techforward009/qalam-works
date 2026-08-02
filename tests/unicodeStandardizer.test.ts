import { standardizeUrduText } from "../app/utils/unicodeStandardizer";

describe("Unicode Standardizer Engine Tests", () => {
  test("Should normalize Arabic letters, punctuation and spaces correctly", () => {
    const input = "علي عليه السلام ، كربلاء ؛ يحيى ؟";
    const result = standardizeUrduText(input);

    expect(result.output).toBe("علی علیہ السلام، کربلا؛ یحییٰ؟");
    expect(result.summary.totalCorrections).toBeGreaterThan(0);
    expect(result.badges).toContain("✓ Arabic letters normalized");
    expect(result.badges).toContain("✓ Punctuation corrected");
  });

  test("Should return already standardized badge for clean text", () => {
    const input = "علی کربلا";
    const result = standardizeUrduText(input);

    expect(result.badges).toContain("✓ Text already standardized");
    expect(result.summary.totalCorrections).toBe(0);
  });
});
