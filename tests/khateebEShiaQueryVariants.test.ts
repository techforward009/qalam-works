import { describe, expect, test } from "vitest";
import { eShiaQueryVariants } from "../app/tools/khateeb-studio/engine/eshiaQueryVariants";

describe("eShia Urdu concept query expansion", () => {
  test("expands provision and blessing into Arabic search concepts", () => {
    const variants = eShiaQueryVariants("رزق میں برکت کے اسباب");
    expect(variants).toContain("الرزق");
    expect(variants).toContain("البركة");
    expect(variants).toContain("أسباب الرزق");
  });

  test("expands anger control into hadith vocabulary", () => {
    const variants = eShiaQueryVariants("غصے پر قابو پانے کے اسلامی طریقے");
    expect(variants).toContain("الغضب");
    expect(variants).toContain("كظم الغيظ");
    expect(variants).toContain("الحلم");
  });

  test("expands child formation and parents into source vocabulary", () => {
    const variants = eShiaQueryVariants("اولاد کی دینی تربیت میں والدین کی ذمہ داری");
    expect(variants).toContain("تربية الأولاد");
    expect(variants).toContain("بر الوالدين");
  });
});
