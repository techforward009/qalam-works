import { describe, expect, it } from "vitest";
import { buildPakistanDateShareText, pakistanDatePermalink, reviewedMonthStart } from "../app/tools/date-converter/utils/pakistanDateShare";
import { resolvePakistanOfficialHijriDate } from "../app/tools/date-converter/utils/hijri-authority/resolveOfficialHijriDate";

describe("Forwardable Pakistan Hijri date results", () => {
  const gregorian = { year: 2026, month: 11, day: 4 };
  const reviewed = resolvePakistanOfficialHijriDate(gregorian);
  const hijri = reviewed!.hijri;

  it("uses the reported committee start, with full cited date and original URL", () => {
    expect(hijri).toEqual({ year: 1448, month: 5, day: 23 });
    expect(reviewedMonthStart(gregorian, hijri, reviewed))
      .toEqual({ year: 2026, month: 10, day: 13 });
    const message = buildPakistanDateShareText({
      gregorian, hijri, reviewed, weekday: "بدھ", lang: "ur",
    });
    expect(message).toContain("پاکستانی ہجری تاریخ");
    expect(message).toContain("بدھ");
    expect(message).toContain("نومبر");
    expect(message).toContain("جمادی الاول");
    expect(message).toContain("۱۴۴۸");
    expect(message).toContain("حیثیت:");
    expect(message).toContain("یکم قمری مہینہ:");
    expect(message).toContain("اصل حوالہ: " + reviewed!.sourceUrl);
    expect(message).toContain("قلم ورکس: https://www.qalamworks.com/date/2026-11-04");
    expect(message).not.toContain("1448-05-23");
  });

  it("includes complete Pakistan and source information in English too", () => {
    const message = buildPakistanDateShareText({
      gregorian, hijri, reviewed, weekday: "Wednesday", lang: "en",
    });
    expect(message).toContain("Pakistan Hijri Date");
    expect(message).toContain("Wednesday, 4 November 2026");
    expect(message).toContain("23 Jumada al-Awwal 1448");
    expect(message).not.toContain(reviewed!.sourceUrl);
    expect(message).toContain(pakistanDatePermalink(gregorian));
  });

  it("does not invent a committee source for unverified future dates", () => {
    const unknown = { year: 2027, month: 11, day: 4 };
    expect(resolvePakistanOfficialHijriDate(unknown)).toBeNull();
    const message = buildPakistanDateShareText({
      gregorian: unknown,
      hijri: {year:1449,month:5,day:6},
      reviewed:null,
      weekday:"جمعرات",
      lang:"ur",
    });
    expect(message).toContain("حسابی");
    expect(message).toContain("پاکستان کا مصدقہ اعلان دستیاب نہیں");
    expect(message).not.toContain("اصل حوالہ:");
    expect(message).not.toContain("یکم قمری مہینہ:");
    expect(message).toContain("https://www.qalamworks.com/date/2027-11-04");
  });

  it("honors published historical-month provenance rather than labeling it a direct sighting", () => {
    const past = {year:2020,month:6,day:23};
    const historic = resolvePakistanOfficialHijriDate(past);
    expect(historic?.authority).toBe("reported-official");
    const message = buildPakistanDateShareText({
      gregorian:past, hijri:historic!.hijri, reviewed:historic, weekday:"منگل", lang:"ur",
    });
    expect(message).toContain("تاریخی قمری ریکارڈ");
    expect(message).not.toContain(historic!.sourceUrl);
    expect(message).not.toContain("بمطابق: مرکزی رؤیتِ ہلال کمیٹی پاکستان");
  });
});
