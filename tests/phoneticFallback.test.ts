
import { describe, test, expect } from "vitest";
import { engineV2 } from "../app/tools/roman-urdu-writer/utils/engineV2";
import { convertRomanUrdu } from "../app/tools/roman-urdu-writer/utils/writerEngine";
const cv = (s: string) => engineV2.convert(s).output;
describe("19A.5 pronunciation fallback", () => {
  test("target literary", () => {
    const o = cv("Dilon mein rehm, tabiyat mein saadgi, khuloos mein muhabbat ata farma.");
    for (const w of ["دلوں","رحم","سادگی","خلوص","محبت","عطا","فرما"]) expect(o).toContain(w);
  });
  test("loanwords", () => {
    expect(cv("kal meeting mein ana")).toBe("کل میٹنگ میں آنا");
    expect(cv("office jana hai")).toBe("آفس جانا ہے");
    expect(cv("video bhejo")).toBe("ویڈیو بھیجو");
    expect(cv("group mein bhejo")).toBe("گروپ میں بھیجو");
    expect(cv("WhatsApp group mein bhejo")).toBe("WhatsApp گروپ میں بھیجو");
  });
  test("english", () => {
    for (const s of ["meeting starts at 5 pm","please send the video","office is closed today","Zoom meeting starts now"])
      expect(cv(s)).toBe(s);
  });
  test("protected", () => {
    for (const s of ["https://example.com/khuloos","muhabbat@example.com","meeting.pdf","video.mp4","user@zarmook.com"])
      expect(cv(s)).toBe(s);
  });
  test("synthetic", () => {
    for (const t of ["zarmook","falgoon","khareesh","dromaal"]) {
      expect(cv(t)).not.toBe(t);
      expect(cv(t)).toMatch(/[\u0600-\u06FF]/);
    }
  });
  test("equiv", () => {
    for (const s of ["kal meeting mein ana","zarmook","meeting starts at 5 pm"])
      expect(convertRomanUrdu(s).output).toBe(engineV2.convert(s).output);
  });
  test("meta", () => {
    const t = convertRomanUrdu("zarmook").tokens.find(x => x.roman === "zarmook")!;
    expect(t.source).toBe("phonetic");
    expect(t.isPassthrough).toBe(false);
    expect(t.isAutoConverted).toBe(true);
  });
});
