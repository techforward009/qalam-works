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

  // Follow-up fix (2026-08-07): any punctuation mark repeated 2+ times in a
  // row is collapsed to a single occurrence, in any script.
  test("Should collapse duplicated punctuation marks to a single instance", () => {
    const result = standardizeUrduText("کیا یہ ٹھیک ہے؟؟ بالکل!!");
    expect(result.output).toBe("کیا یہ ٹھیک ہے؟ بالکل!");
    expect(result.summary.punctuationFixes).toBeGreaterThan(0);
  });

  test("Should collapse 3+ repeats (e.g. an ellipsis typed as multiple periods) too", () => {
    const result = standardizeUrduText("رکو...");
    expect(result.output).toBe("رکو.");
  });

  // Reported 2026-08-07: "(المتوفی:179ھ)نے" — missing space after a
  // closing bracket and after a colon.
  test("Should insert a missing space after a closing bracket and after a colon", () => {
    const result = standardizeUrduText("اور حضرت امام مالک علیہ الرحمہ (المتوفی:179ھ)نے فرمایا");
    expect(result.output).toBe("اور حضرت امام مالک علیہ الرحمہ (المتوفی: 179ھ) نے فرمایا");
  });
});
