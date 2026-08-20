import { describe, test, expect } from "vitest";
import { engineV2 } from "../app/tools/roman-urdu-writer/utils/engineV2";
import { lookupRomanUrduLexicon } from "../app/tools/roman-urdu-writer/utils/romanUrduLexicon";

const cv = (s: string) => engineV2.convert(s).output;

describe("19A.8 Roman Urdu lexicon intelligence", () => {
  test("formal words use dictionary orthography", () => {
    expect(cv("nafsiaati")).toBe("نفسیاتی");
    expect(cv("zimmedarana")).toBe("ذمہ دارانہ");
    expect(cv("tankhwah")).toBe("تنخواہ");
    expect(cv("muaashray")).toBe("معاشرے");
    expect(cv("qanooni")).toBe("قانونی");
  });

  test("Roman variations resolve", () => {
    expect(cv("zimedari")).toBe("ذمہ داری");
    expect(cv("zimadari")).toBe("ذمہ داری");
    expect(cv("nafsiati")).toBe("نفسیاتی");
    expect(cv("tankhah")).toBe("تنخواہ");
    expect(cv("mua'aashray")).toContain("معاشر");
  });

  test("lookup helper", () => {
    expect(lookupRomanUrduLexicon("nafsiaati")).toBe("نفسیاتی");
    expect(lookupRomanUrduLexicon("zimmedarana")).toBe("ذمہ دارانہ");
    expect(lookupRomanUrduLexicon("tehqiq")).toBe("تحقیق");
  });

  test("hard paragraphs remain clean", () => {
    const p1 = cv("Aam aawam ki falah-o-behbood ke liye tayyar kiye gaye qawaneen aur policy documents par bilaa-ta'assub amal-daramad karwana riyasat ki pehli zimmedari hai.");
    expect(p1).toMatch(/نفسیاتی|قوانین|ذمہ داری|تعصب|فلاح/);
    expect((p1.match(/[A-Za-z]{2,}/g) || []).filter(w => !w.includes("://"))).toEqual([]);

    const p2 = cv("Mulaazmeen ki mahana tankhwah aur pension ki adaiyagi ke liye bank account ki tasdeeq nihayat zaroori hai.");
    expect(p2).toMatch(/تنخواہ/);
    expect(p2).toMatch(/ضروری/);

    const p3 = cv("Aaj kal ke jadeed daur mein social media ke bighaar aur naazuk mua'aamlaat par ghair-zimmedarana guftagu ne mu'aashray mein shadeed anjaam paida kar diye hain.");
    expect(p3).toMatch(/ذمہ دارانہ/);
    expect(p3).toMatch(/معاشر/);
  });

  test("English safety preserved", () => {
    expect(cv("meeting starts at 5 pm")).toBe("meeting starts at 5 pm");
  });
});
