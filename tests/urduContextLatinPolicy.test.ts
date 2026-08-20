
import { describe, test, expect } from "vitest";
import { engineV2 } from "../app/tools/roman-urdu-writer/utils/engineV2";
import { convertRomanUrdu } from "../app/tools/roman-urdu-writer/utils/writerEngine";
const cv = (s: string) => engineV2.convert(s).output;
const latinWords = (s: string) => (s.match(/[A-Za-z]{2,}/g) || []).filter(w => !w.includes("://"));
describe("Roman Urdu context Latin-leakage policy", () => {
  test("kal meeting mein ana — no Latin", () => {
    const o = cv("kal meeting mein ana");
    expect(o).toContain("میٹنگ");
    expect(latinWords(o)).toEqual([]);
  });
  test("policy documents sentence — no Latin leakage", () => {
    const o = cv("Aam aawam ki falah-o-behbood ke liye policy documents tayyar kiye gaye");
    expect(o).toMatch(/پالیسی/);
    expect(o).toMatch(/ڈاکومنٹ/);
    expect(latinWords(o)).toEqual([]);
  });
  test("Company inflation sentence — no Latin leakage", () => {
    const o = cv("Company ne inflation ki wajah se faisla badal diya");
    expect(o).toMatch(/کمپنی/);
    expect(o).toMatch(/انفلیشن/);
    expect(latinWords(o)).toEqual([]);
  });
  test("HR update in Urdu context converts", () => {
    const o = cv("HR ne update bheja");
    expect(o).toMatch(/ایچ آر/);
    expect(o).toMatch(/اپ ڈیٹ/);
    expect(latinWords(o)).toEqual([]);
  });
  test("pure English remains Latin", () => {
    expect(cv("meeting starts at 5 pm")).toBe("meeting starts at 5 pm");
    expect(cv("please send the video")).toBe("please send the video");
  });
  test("hard protection still exact", () => {
    expect(cv("https://example.com/policy")).toBe("https://example.com/policy");
    expect(cv("report.pdf")).toBe("report.pdf");
  });
  test("writerEngine matches V2 on policy sentences", () => {
    for (const s of ["kal meeting mein ana", "Company ne inflation ki wajah se faisla badal diya", "meeting starts at 5 pm"]) {
      expect(convertRomanUrdu(s).output).toBe(engineV2.convert(s).output);
    }
  });
});
