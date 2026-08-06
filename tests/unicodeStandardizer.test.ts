// Was importing from a path that no longer exists ("../app/utils/unicodeStandardizer")
// and asserting output/badge text that didn't match the real engine — this test
// never actually ran (no test runner was configured in the repo), so the drift
// went unnoticed. Fixed to the real module path and the real current output.
import { standardizeUrduText } from "../app/utils/unicode/standardizeUrduText";

describe("Unicode Standardizer Engine Tests", () => {
  test("Should normalize Arabic letters, punctuation and spaces correctly", () => {
    const input = "علي عليه السلام ، كربلاء ؛ يحيى ؟";
    const result = standardizeUrduText(input);

    expect(result.output).toBe("علی علیه السلام، کربلاء؛ یحیی؟");
    expect(result.summary.totalCorrections).toBeGreaterThan(0);
    expect(result.badges).toContain("✓ Arabic Letters Normalized");
    expect(result.badges).toContain("✓ Punctuation Corrected");
  });

  test("Should return already standardized badge for clean text", () => {
    const input = "علی کربلا";
    const result = standardizeUrduText(input);

    expect(result.badges).toContain("✓ Text Already Standardized");
    expect(result.summary.totalCorrections).toBe(0);
  });
});
