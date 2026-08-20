import { describe, test, expect } from "vitest";
import { engineV2 } from "../app/tools/roman-urdu-writer/utils/engineV2";
import { formalStemConvert } from "../app/tools/roman-urdu-writer/utils/romanUrduNormalize";

const cv = (s: string) => engineV2.convert(s).output;
const latin = (s: string) => (s.match(/[A-Za-z]{2,}/g) || []).filter(w => !w.includes("://"));

describe("19A.7 Roman Urdu intelligence", () => {
  test("example words", () => {
    expect(cv("mua'aashray")).toContain("معاشر");
    expect(cv("nafsiaati")).toBe("نفسیاتی");
    expect(cv("qanooni")).toBe("قانونی");
    expect(cv("ghair-zimmedarana")).toBe("غیر ذمہ دارانہ");
    expect(cv("tankhwah")).toBe("تنخواہ");
  });

  test("hard acceptance P1", () => {
    const o = cv("Aam aawam ki falah-o-behbood ke liye tayyar kiye gaye qawaneen aur policy documents par bilaa-ta'assub amal-daramad karwana riyasat ki pehli zimmedari hai.");
    expect(latin(o)).toEqual([]);
    expect(o).toMatch(/فلاح/);
    expect(o).toMatch(/قوانین/);
    expect(o).toMatch(/تعصب/);
    expect(o).toMatch(/عمل درآمد/);
    expect(o).toMatch(/ذمہ داری/);
  });

  test("hard acceptance P2", () => {
    const o = cv("Mulaazmeen ki mahana tankhwah aur pension ki adaiyagi ke liye bank account ki tasdeeq nihayat zaroori hai.");
    expect(latin(o)).toEqual([]);
    expect(o).toMatch(/تنخواہ/);
    expect(o).toMatch(/تصدیق/);
    expect(o).toMatch(/ضروری/);
  });

  test("hard acceptance P3", () => {
    const o = cv("Aaj kal ke jadeed daur mein social media ke bighaar aur naazuk mua'aamlaat par ghair-zimmedarana guftagu ne mu'aashray mein shadeed anjaam paida kar diye hain.");
    expect(latin(o)).toEqual([]);
    expect(o).toMatch(/سوشل/);
    expect(o).toMatch(/غیر ذمہ دارانہ/);
    expect(o).toMatch(/معاشر/);
  });

  test("English safety", () => {
    expect(cv("meeting starts at 5 pm")).toBe("meeting starts at 5 pm");
  });

  test("protection", () => {
    expect(cv("https://example.com/x")).toBe("https://example.com/x");
  });

  test("stem helper", () => {
    expect(formalStemConvert("nafsiaati")).toBe("نفسیاتی");
  });
});
