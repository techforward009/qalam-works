/**
 * Unicode 18.0.0 audit (2026-09-25).
 * Runtime ICU is Unicode 17. The frozen Urdu standardizer is an explicit
 * character map, not a Unicode-version table. These cases lock that
 * Unicode 18 additions pass through and the existing Urdu, Arabic, and
 * Persian letters keep their current maps. No production behavior changes.
 */
import { standardizeUrduText } from "../app/utils/unicode/standardizeUrduText";

const RUFIYAA = "\u{20C2}";
const UAE_DIRHAM = "\u{20C3}";
const OMANI_RIAL = "\u{20C4}";
const CROWN_BEH = "\u{10ED9}";
const LOW_NOON_FATHA = "\u{10EF4}";

describe("Unicode 18.0 audit", () => {
  test("new currency symbols and Arabic Extended-C characters pass through unchanged", () => {
    const input = `قیمت ${RUFIYAA} ${UAE_DIRHAM} ${OMANI_RIAL} ب${LOW_NOON_FATHA} ${CROWN_BEH}`;
    const result = standardizeUrduText(input);
    expect(result.output).toBe(input);
    expect(result.summary.totalCorrections).toBe(0);
    expect(result.output.normalize("NFC")).toBe(result.output);
  });

  test("frozen Urdu, Arabic, and Persian letters stay on the current maps", () => {
    expect(standardizeUrduText("علي كتاب يحيى").output).toBe("علی کتاب یحیی");
    expect(standardizeUrduText("یہ فارسی گ، پ، چ اور ژ ہے۔").output).toBe("یہ فارسی گ، پ، چ اور ژ ہے۔");
    expect(standardizeUrduText("ب\u064E").output).toBe("ب\u064E");
    expect(standardizeUrduText("{{کتاب}}").output).toBe("كتاب");
  });
});
