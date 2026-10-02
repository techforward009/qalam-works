export type CalendarSourceArchive = {
  id: string;
  title: string;
  publisher: string;
  url: string;
  capturedAt: string;
  scope: string;
  region?: "all" | "pk" | "in" | "ir";
  /** Structured local record; do not fetch this source at runtime. */
  records: readonly string[];
};

/**
 * Permanent local archive metadata for the calendar layer.
 *
 * The web page remains the provenance link, while the accepted calendar facts
 * are stored locally in the repository. This prevents site outages from
 * removing already-reviewed calendar data.
 *
 * Captured: 2026-10-02.
 */
export const KHATEEB_CALENDAR_SOURCE_ARCHIVE: readonly CalendarSourceArchive[] = [
  {
    id: "shiawaves-rabi-al-thani-1448",
    title: "تقویم شبکۂ امام حسین — ربیع الثانی",
    publisher: "ShiaWaves / شبکۂ امام حسین",
    url: "https://shiawaves.com/persian/shia-calendar/",
    capturedAt: "2026-10-02",
    scope: "ربیع الثانی",
    records: [
      "1: قیام توابین — 65ھ",
      "2 تا 8: ہفتۂ بزرگداشت ولادت امام حسن عسکریؑ",
      "3: سفر تاریخی امام حسن عسکریؑ به جرجان — 255ھ",
      "4: میلاد حضرت عبدالعظیم حسنیؑ — 173ھ",
      "6: ہلاکت ہشام بن عبدالملک — 125ھ",
      "6: ولادت امام حسن عسکریؑ — ایک روایت — 232ھ",
      "8: ولادت امام حسن عسکریؑ — 232ھ",
      "10 تا 13: فاطمیہ اول — روایت 45 روز",
      "10: وفات حضرت فاطمہ معصومہؑ — 201ھ",
      "10: روس کی طرف سے حرم امام رضاؑ پر توپ باری — 1330ھ",
      "12: انقراض بنی امیہ و آغاز حکومت بنی عباس — 132ھ",
      "13: شہادت حضرت فاطمہ زہراؑ — روایت ابن شہر آشوب، 45 روز",
      "13: ارتحال محقق حلیؒ — 676ھ",
      "14: قیام جناب مختارؒ — 66ھ",
      "20: فتوائے انقلاب 1920ء — 1337ھ",
      "22: وفات حضرت موسیٰ مبرقعؒ — 296ھ",
      "25: کنارہ کشی معاویہ بن یزید از خلافت — 64ھ",
      "28: ارتحال علامہ عبدالحسین امینیؒ — 1390ھ",
      "29/30: ہلاکت خالد بن ولید — 21 یا 22ھ",
    ],
  },
  {
    id: "shiastudies-rabi-al-thani",
    title: "وقائع ماہ ربیع الثانی",
    publisher: "مجمع جهانی شیعه شناسی",
    url: "https://shiastudies.com/fa/%D9%88%D9%82%D8%A7%DB%8C%D8%B9-%D9%85%D8%A7%DB%81-%D8%B1%D8%A8%DB%8C%D8%B9-%D8%A7%D9%84%D8%AB%D8%A7%D9%86%DB%8C/",
    capturedAt: "2026-10-02",
    scope: "ربیع الثانی",
    records: [
      "8: ولادت امام حسن عسکریؑ — 232ھ",
      "8: شہادت حضرت فاطمہ زہراؑ — 40 روز والی روایت",
      "10: وفات حضرت فاطمہ معصومہؑ — 201ھ",
      "12: انقراض بنی امیہ",
      "13: شہادت حضرت فاطمہ زہراؑ — ابن شہر آشوب کی نسبت",
      "14: قیام مختار — 66ھ",
      "22: وفات موسیٰ مبرقع — 296ھ",
      "آخری دن: ہلاکت خالد بن ولید — 21ھ",
    ],
  },
  {
    id: "shareekatulhussain-pk-1448",
    title: "شیعہ تقویم — ربیع الثانی 1448ھ",
    publisher: "مسجد و امام بارگاہ شریکۃ الحسینؑ — کراچی",
    url: "https://www.shareekatulhussain.com/?month=9&previewDate=2026-09-23",
    capturedAt: "2026-10-02",
    scope: "پاکستانی مقامی تقویمی استعمال",
    region: "pk",
    records: [
      "10 ربیع الثانی 1448: ولادت امام حسن عسکریؑ",
      "10 ربیع الثانی 1448: وفات حضرت فاطمہ معصومہؑ",
      "14 ربیع الثانی 1448: قیام مختارؒ",
    ],
  },
  {
    id: "alkafeel-10-rabi-al-thani",
    title: "10 ربیع الثانی: امام حسن عسکریؑ کے جشن میلاد کا دن",
    publisher: "الکفیل انٹرنیشنل نیٹ ورک",
    url: "https://alkafeel.net/news/index?id=9634&lang=ur",
    capturedAt: "2026-10-02",
    scope: "10 ربیع الثانی کی روایت",
    records: [
      "10 ربیع الثانی 232ھ: ولادت امام حسن عسکریؑ",
      "ماخذی بیان میں ارشاد مفید اور دیگر کتب کی نسبت سے 10 ربیع الثانی درج ہے",
    ],
  },
  {
    id: "al-shia-10-rabi-al-thani",
    title: "حضرت امام حسن عسکریؑ کی زندگی پر نظر",
    publisher: "الشیعہ اردو",
    url: "https://ur.al-shia.org/%D8%AD%D8%B6%D8%B1%D8%AA-%D8%A7%D9%85%D8%A7%D9%85-%D8%AD%D8%B3%D9%86-%D8%B9%D8%B3%DA%A9%D8%B1%DB%8C%D8%B9/",
    capturedAt: "2026-10-02",
    scope: "10 ربیع الثانی کی روایت",
    records: [
      "10 ربیع الثانی 232ھ: ولادت امام حسن عسکریؑ",
      "صفحے میں اسے اہل تشیع و اہل سنت کے متعدد مصادر کی نسبت سے بیان کیا گیا ہے",
    ],
  },
  {
    id: "ya-mahdi-baltistan-askari",
    title: "امام حسن عسکریؑ کی ولادت اور ابتدائی حالات",
    publisher: "مؤسسه علمی، فرهنگی امام زمان (عج) بلتستان",
    url: "https://ya-mahdi786.blogfa.com/",
    capturedAt: "2026-10-02",
    scope: "10 ربیع الثانی کی روایت",
    region: "pk",
    records: [
      "10 ربیع الثانی 232ھ: ولادت امام حسن عسکریؑ",
      "صفحے میں اس تاریخ کے لیے متعدد تاریخی کتب کے حوالے دیے گئے ہیں",
    ],
  },
] as const;
