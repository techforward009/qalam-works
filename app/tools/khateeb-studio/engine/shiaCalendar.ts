export type ShiaCalendarRegion = "all" | "pk" | "in" | "ir";
export type IslamicMonthId =
  | "muharram"
  | "safar"
  | "rabi-al-awwal"
  | "rabi-al-thani"
  | "jumada-al-awwal"
  | "jumada-al-thani"
  | "rajab"
  | "shaban"
  | "ramadan"
  | "shawwal"
  | "dhu-al-qadah"
  | "dhu-al-hijjah";

export type ShiaCalendarEvent = {
  id: string;
  month: IslamicMonthId;
  monthLabel: string;
  day: number;
  dayLabel?: string;
  title: string;
  note?: string;
  /** Region-specific date/usage. Omit when the source record is generally applicable. */
  regions?: readonly ShiaCalendarRegion[];
  sourceId: string;
  sourceLabel: string;
  sourceUrl: string;
  sourceCapturedAt: string;
};

export const CALENDAR_MONTHS_1448: readonly { id: IslamicMonthId; label: string }[] = [
  { id: "muharram", label: "محرم" },
  { id: "safar", label: "صفر" },
  { id: "rabi-al-awwal", label: "ربیع الاول" },
  { id: "rabi-al-thani", label: "ربیع الثانی" },
  { id: "jumada-al-awwal", label: "جمادی الاول" },
  { id: "jumada-al-thani", label: "جمادی الثانی" },
  { id: "rajab", label: "رجب" },
  { id: "shaban", label: "شعبان" },
  { id: "ramadan", label: "رمضان" },
  { id: "shawwal", label: "شوال" },
  { id: "dhu-al-qadah", label: "ذوالقعدہ" },
  { id: "dhu-al-hijjah", label: "ذوالحجہ" },
] as const;

const SHIAWAVES_SOURCE = {
  id: "shiawaves-calendar-2026-10-02",
  label: "شبکہ امام حسین / شیعہ تقویم",
  url: "https://shiawaves.com/persian/shia-calendar/",
  capturedAt: "2026-10-02",
} as const;

const SOURCE = {
  sourceLabel: SHIAWAVES_SOURCE.label,
  sourceUrl: SHIAWAVES_SOURCE.url,
  sourceId: SHIAWAVES_SOURCE.id,
  sourceCapturedAt: SHIAWAVES_SOURCE.capturedAt,
} as const;

export const SHIA_CALENDAR_1448_EVENTS: readonly ShiaCalendarEvent[] = [
  // محرم
  { id: "muh-01-husaini-decade", month: "muharram", monthLabel: "محرم", day: 1, dayLabel: "1 تا 10", title: "دهۂ تعظیم شعائر حسینی", note: "آغاز حزن و عزاداری حسینی", ...SOURCE },
  { id: "muh-02-karbala", month: "muharram", monthLabel: "محرم", day: 2, title: "امام حسینؑ کا سرزمینِ کربلا میں ورود", note: "61ھ", ...SOURCE },
  { id: "muh-03-umar-saad", month: "muharram", monthLabel: "محرم", day: 3, title: "عمر بن سعد کا لشکر کے ساتھ کربلا پہنچنا", note: "61ھ", ...SOURCE },
  { id: "muh-06-habib", month: "muharram", monthLabel: "محرم", day: 6, title: "حبیب بن مظاہرؓ کی بنی اسد سے نصرت کی دعوت", note: "61ھ", ...SOURCE },
  { id: "muh-07-water", month: "muharram", monthLabel: "محرم", day: 7, title: "امام حسینؑ اور اہل بیتؑ پر پانی بند کیا جانا", note: "61ھ", ...SOURCE },
  { id: "muh-09-tasua", month: "muharram", monthLabel: "محرم", day: 9, title: "تاسوعائے حسینی", note: "حضرت عباسؑ کے لیے امان نامہ، جنگ میں تاخیر کی درخواست اور اصحاب سے خطبہ", ...SOURCE },
  { id: "muh-10-ashura", month: "muharram", monthLabel: "محرم", day: 10, title: "عاشورائے حسینی اور شہادت امام حسینؑ و اصحاب", note: "61ھ", ...SOURCE },
  { id: "muh-11-zaynab", month: "muharram", monthLabel: "محرم", day: 11, dayLabel: "11 تا 20", title: "دهۂ بزرگداشت حضرت زینب کبریٰؑ", note: "اہل بیتؑ کی اسیری کا آغاز", ...SOURCE },
  { id: "muh-13-bani-asad", month: "muharram", monthLabel: "محرم", day: 13, title: "عزاداریِ بنی اسد اور شہدائے کربلا کی تدفین", note: "61ھ", ...SOURCE },
  { id: "muh-19-sham", month: "muharram", monthLabel: "محرم", day: 19, title: "اسیرانِ اہل بیتؑ کا کوفہ سے شام کی طرف روانہ ہونا", note: "61ھ", ...SOURCE },
  { id: "muh-20-jawn", month: "muharram", monthLabel: "محرم", day: 20, title: "جناب جونؓ کی تدفین", note: "61ھ", ...SOURCE },
  { id: "muh-21-sajjad", month: "muharram", monthLabel: "محرم", day: 21, dayLabel: "21 تا 30", title: "دهۂ بزرگداشت شہادت امام سجادؑ", ...SOURCE },
  { id: "muh-23-askari-shrines", month: "muharram", monthLabel: "محرم", day: 23, title: "سامرا میں امامین عسکریینؑ کے حرم پر حملہ", note: "1427ھ", ...SOURCE },
  { id: "muh-25-sajjad", month: "muharram", monthLabel: "محرم", day: 25, title: "شہادت امام سجادؑ", note: "95ھ", ...SOURCE },
  { id: "muh-28-hudhayfa", month: "muharram", monthLabel: "محرم", day: 28, title: "وفات حذیفہ بن یمانؓ / بعلبک میں اسیرانِ اہل بیتؑ کی آمد", note: "36ھ / 61ھ", ...SOURCE },

  // صفر
  { id: "saf-01-hasan-decade", month: "safar", monthLabel: "صفر", day: 1, dayLabel: "1 تا 10", title: "دهۂ بزرگداشت شہادت امام حسن مجتبیٰؑ", ...SOURCE },
  { id: "saf-02-yazid-court", month: "safar", monthLabel: "صفر", day: 2, title: "اہل بیتؑ کا مجلس یزید میں پہنچنا", note: "61ھ", ...SOURCE },
  { id: "saf-05-ruqayya", month: "safar", monthLabel: "صفر", day: 5, title: "یومِ رقیہ بنت الحسینؑ / شہادت حضرت رقیہؑ", note: "61ھ", ...SOURCE },
  { id: "saf-07-hasan", month: "safar", monthLabel: "صفر", day: 7, title: "شہادت امام حسن مجتبیٰؑ", note: "50ھ", ...SOURCE },
  { id: "saf-08-salman", month: "safar", monthLabel: "صفر", day: 8, title: "وفات سلمان محمدیؓ", note: "36ھ", ...SOURCE },
  { id: "saf-09-ammar", month: "safar", monthLabel: "صفر", day: 9, title: "شہادت عمار بن یاسرؓ / جنگِ نہروان", note: "37ھ / 38ھ", ...SOURCE },
  { id: "saf-11-arbaeen-decade", month: "safar", monthLabel: "صفر", day: 11, dayLabel: "11 تا 20", title: "دهۂ بزرگداشت اربعین حسینی", ...SOURCE },
  { id: "saf-14-muhammad-b-abi-bakr", month: "safar", monthLabel: "صفر", day: 14, title: "شہادت محمد بن ابی بکرؓ", note: "38ھ", ...SOURCE },
  { id: "saf-15-prophet-illness", month: "safar", monthLabel: "صفر", day: 15, title: "رسول اکرمؐ کی بیماری کا آغاز", note: "11ھ", ...SOURCE },
  { id: "saf-20-arbaeen", month: "safar", monthLabel: "صفر", day: 20, title: "اربعین حسینی", note: "جابر بن عبداللہ انصاریؓ کی کربلا آمد اور اہل بیتؑ کی واپسی کی روایات", ...SOURCE },
  { id: "saf-23-prophet-decade", month: "safar", monthLabel: "صفر", day: 23, dayLabel: "23 تا 30", title: "هفتۂ بزرگداشت شہادت رسول خدا ﷺ", ...SOURCE },
  { id: "saf-24-pen", month: "safar", monthLabel: "صفر", day: 24, title: "قلم و دوات طلب کرنے کا واقعہ", note: "11ھ", ...SOURCE },
  { id: "saf-26-usama", month: "safar", monthLabel: "صفر", day: 26, title: "لشکرِ اسامہ کی تیاری", note: "11ھ", ...SOURCE },
  { id: "saf-28-prophet", month: "safar", monthLabel: "صفر", day: 28, title: "شہادت رسول اکرم ﷺ", note: "11ھ", ...SOURCE },
  { id: "saf-28-hasan-report", month: "safar", monthLabel: "صفر", day: 28, title: "شہادت امام حسن مجتبیٰؑ", note: "ایک روایت", ...SOURCE },
  { id: "saf-29-30-rida", month: "safar", monthLabel: "صفر", day: 29, dayLabel: "29/30", title: "شہادت امام رضاؑ", note: "203ھ", ...SOURCE },

  // ربیع الاول
  { id: "r1-01-muhsin-week", month: "rabi-al-awwal", monthLabel: "ربیع الاول", day: 1, dayLabel: "1 تا 7", title: "هفتۂ بزرگداشت حضرت محسن بن علیؑ", ...SOURCE },
  { id: "r1-01-laylat-al-mabit", month: "rabi-al-awwal", monthLabel: "ربیع الاول", day: 1, title: "لیلۃ المبیت اور آیتِ 207 سورۂ بقرہ کا واقعہ", ...SOURCE },
  { id: "r1-01-hijra", month: "rabi-al-awwal", monthLabel: "ربیع الاول", day: 1, title: "ہجرتِ رسول اکرم ﷺ کا آغاز", note: "1ھ", ...SOURCE },
  { id: "r1-03-kaaba-attack", month: "rabi-al-awwal", monthLabel: "ربیع الاول", day: 3, title: "کعبہ پر منجنیق سے حملہ", note: "64ھ", ...SOURCE },
  { id: "r1-04-thawr", month: "rabi-al-awwal", monthLabel: "ربیع الاول", day: 4, title: "غارِ ثور سے مدینہ کی طرف روانگی", note: "1ھ", ...SOURCE },
  { id: "r1-05-sukayna", month: "rabi-al-awwal", monthLabel: "ربیع الاول", day: 5, title: "وفات حضرت سکینہ بنت الحسینؑ", note: "117ھ", ...SOURCE },
  { id: "r1-08-askari", month: "rabi-al-awwal", monthLabel: "ربیع الاول", day: 8, title: "شہادت امام حسن عسکریؑ", note: "260ھ", ...SOURCE },
  { id: "r1-09-baraah-week", month: "rabi-al-awwal", monthLabel: "ربیع الاول", day: 9, dayLabel: "9 تا 15", title: "هفتۂ برائت و فرحۃ الزہراؑ", ...SOURCE },
  { id: "r1-10-khadija", month: "rabi-al-awwal", monthLabel: "ربیع الاول", day: 10, title: "ازدواج رسول اکرم ﷺ و حضرت خدیجہؑ", note: "بعثت سے 15 سال پہلے؛ ایک تقویمی روایت", ...SOURCE },
  { id: "r1-12-quba", month: "rabi-al-awwal", monthLabel: "ربیع الاول", day: 12, title: "رسول اکرم ﷺ کی قبا میں آمد", note: "1ھ", ...SOURCE },
  { id: "r1-14-yazid", month: "rabi-al-awwal", monthLabel: "ربیع الاول", day: 14, title: "ہلاکت یزید بن معاویہ", note: "64ھ", ...SOURCE },
  { id: "r1-16-mawlid-week", month: "rabi-al-awwal", monthLabel: "ربیع الاول", day: 16, dayLabel: "16 تا 25", title: "دهۂ بزرگداشت ولادت رسول اکرم ﷺ و امام جعفر صادقؑ", ...SOURCE },
  { id: "r1-17-mawlid", month: "rabi-al-awwal", monthLabel: "ربیع الاول", day: 17, title: "ولادت رسول اکرم ﷺ اور امام جعفر صادقؑ", note: "83ق", ...SOURCE },
  { id: "r1-23-masuma", month: "rabi-al-awwal", monthLabel: "ربیع الاول", day: 23, title: "حضرت فاطمہ معصومہؑ کی قم آمد", note: "201ھ", ...SOURCE },
  { id: "r1-25-hasan-muawiya", month: "rabi-al-awwal", monthLabel: "ربیع الاول", day: 25, title: "امام حسن مجتبیٰؑ اور معاویہ کے درمیان صلح کا معاہدہ", note: "41ھ", ...SOURCE },

  // ربیع الثانی — موجودہ 24 ریکارڈ، مکمل مقامی ماخذی ساخت کے ساتھ
  { id: "r2-01-tawwabin", month: "rabi-al-thani", monthLabel: "ربیع الثانی", day: 1, title: "قیامِ توابین", note: "65ھ", ...SOURCE },
  { id: "r2-02-08-askari-week", month: "rabi-al-thani", monthLabel: "ربیع الثانی", day: 2, dayLabel: "2 تا 8", title: "ہفتۂ بزرگداشتِ ولادت امام حسن عسکریؑ", note: "2 تا 8 ربیع الثانی", ...SOURCE },
  { id: "r2-03-jurjan", month: "rabi-al-thani", monthLabel: "ربیع الثانی", day: 3, title: "امام حسن عسکریؑ کا جرجان کا تاریخی سفر", note: "255ھ", ...SOURCE },
  { id: "r2-04-abdolazim", month: "rabi-al-thani", monthLabel: "ربیع الثانی", day: 4, title: "ولادت حضرت عبدالعظیم حسنیؑ", note: "173ھ", ...SOURCE },
  { id: "r2-06-hisham", month: "rabi-al-thani", monthLabel: "ربیع الثانی", day: 6, title: "ہلاکتِ ہشام بن عبدالملک", note: "125ھ", ...SOURCE },
  { id: "r2-06-askari", month: "rabi-al-thani", monthLabel: "ربیع الثانی", day: 6, title: "ولادت امام حسن عسکریؑ", note: "232ھ؛ ایک روایت", ...SOURCE },
  { id: "r2-08-askari", month: "rabi-al-thani", monthLabel: "ربیع الثانی", day: 8, title: "ولادت امام حسن عسکریؑ", note: "232ھ؛ ایک معروف تقویمی روایت", sourceId: "shiastudies-rabi-al-thani", sourceLabel: "مجمع جهانی شیعه شناسی", sourceUrl: "https://shiastudies.com/fa/%D9%87%D8%B4%D8%AA%D9%85-%D8%B1%D8%A8%DB%8C%D8%B9-%D8%A7%D9%84%D8%AB%D8%A7%D9%86%DB%8C/", sourceCapturedAt: "2026-10-02" },
  { id: "r2-08-zahra-40", month: "rabi-al-thani", monthLabel: "ربیع الثانی", day: 8, title: "شہادت حضرت فاطمہ زہراؑ", note: "40 روز والی روایت", sourceId: "shiastudies-rabi-al-thani", sourceLabel: "مجمع جهانی شیعه شناسی", sourceUrl: "https://shiastudies.com/fa/%D9%87%D8%B4%D8%AA%D9%85-%D8%B1%D8%A8%DB%8C%D8%B9-%D8%A7%D9%84%D8%AB%D8%A7%D9%86%DB%8C/", sourceCapturedAt: "2026-10-02" },
  { id: "r2-10-fatimiyya", month: "rabi-al-thani", monthLabel: "ربیع الثانی", day: 10, dayLabel: "10 تا 13", title: "ایامِ بزرگداشت شہادت حضرت فاطمہ زہراؑ", note: "فاطمیہ اول؛ روایت 45 روز", ...SOURCE },
  { id: "r2-10-masuma", month: "rabi-al-thani", monthLabel: "ربیع الثانی", day: 10, title: "وفات حضرت فاطمہ معصومہؑ", note: "201ھ", ...SOURCE },
  { id: "r2-10-russian-shelling", month: "rabi-al-thani", monthLabel: "ربیع الثانی", day: 10, title: "حرم امام رضاؑ پر روسی توپ باری اور زائرین کی شہادت", note: "1330ھ؛ ماخذ کا تاریخی اندراج", ...SOURCE },
  { id: "r2-10-askari-pk", month: "rabi-al-thani", monthLabel: "ربیع الثانی", day: 10, title: "ولادت امام حسن عسکریؑ", note: "232ھ؛ پاکستان میں رائج تاریخ", regions: ["pk"], sourceId: "shareekatulhussain-pk-1448", sourceLabel: "مسجد و امام بارگاہ شریکۃ الحسینؑ — کراچی", sourceUrl: "https://www.shareekatulhussain.com/?month=9&previewDate=2026-09-23", sourceCapturedAt: "2026-10-02" },
  { id: "r2-10-askari-alkafeel", month: "rabi-al-thani", monthLabel: "ربیع الثانی", day: 10, title: "ولادت امام حسن عسکریؑ", note: "232ھ؛ 10 ربیع الثانی کی روایت", sourceId: "alkafeel-10-rabi-al-thani", sourceLabel: "الکفیل انٹرنیشنل نیٹ ورک", sourceUrl: "https://alkafeel.net/news/index?id=9634&lang=ur", sourceCapturedAt: "2026-10-02" },
  { id: "r2-10-askari-shia-org", month: "rabi-al-thani", monthLabel: "ربیع الثانی", day: 10, title: "ولادت امام حسن عسکریؑ", note: "232ھ؛ 10 ربیع الثانی کی تاریخی نسبت", sourceId: "al-shia-10-rabi-al-thani", sourceLabel: "الشیعہ اردو", sourceUrl: "https://ur.al-shia.org/%D8%AD%D8%B6%D8%B1%D8%AA-%D8%A7%D9%85%D8%A7%D9%85-%D8%AD%D8%B3%D9%86-%D8%B9%D8%B3%DA%A9%D8%B1%DB%8C%D8%B9/", sourceCapturedAt: "2026-10-02" },
  { id: "r2-10-askari-baltistan", month: "rabi-al-thani", monthLabel: "ربیع الثانی", day: 10, title: "ولادت امام حسن عسکریؑ", note: "232ھ؛ پاکستانی مذہبی ماخذ میں 10 ربیع الثانی", regions: ["pk"], sourceId: "ya-mahdi-baltistan-askari", sourceLabel: "مؤسسه علمی، فرهنگی امام زمان (عج) بلتستان", sourceUrl: "https://ya-mahdi786.blogfa.com/", sourceCapturedAt: "2026-10-02" },
  { id: "r2-12-umayyad", month: "rabi-al-thani", monthLabel: "ربیع الثانی", day: 12, title: "انقراض بنی امیہ اور آغاز حکومت بنی عباس", note: "132ھ", ...SOURCE },
  { id: "r2-13-fatimiyya-45", month: "rabi-al-thani", monthLabel: "ربیع الثانی", day: 13, title: "شہادت حضرت فاطمہ زہراؑ", note: "45 روز والی روایت؛ ابن شہر آشوب کی نسبت", sourceId: "shiastudies-rabi-al-thani", sourceLabel: "مجمع جهانی شیعه شناسی", sourceUrl: "https://shiastudies.com/fa/%D8%B3%DB%8C%D8%B2%D8%AF%D9%87%D9%85-%D8%B1%D8%A8%DB%8C%D8%B9-%D8%A7%D9%84%D8%AB%D8%A7%D9%86%DB%8C/", sourceCapturedAt: "2026-10-02" },
  { id: "r2-13-mohaghegh-hilli", month: "rabi-al-thani", monthLabel: "ربیع الثانی", day: 13, title: "ارتحال محقق حلیؒ", note: "676ھ؛ صاحب شرائع الاسلام", ...SOURCE },
  { id: "r2-14-mukhtar", month: "rabi-al-thani", monthLabel: "ربیع الثانی", day: 14, title: "قیامِ مختارؒ", note: "66ھ", ...SOURCE },
  { id: "r2-20-fatwa-1920", month: "rabi-al-thani", monthLabel: "ربیع الثانی", day: 20, title: "فتوائے انقلابِ 1920ء کے اجرا کی یاد", note: "1337ھ؛ میرزا محمد تقی شیرازیؒ", ...SOURCE },
  { id: "r2-22-musa-mubarqa", month: "rabi-al-thani", monthLabel: "ربیع الثانی", day: 22, title: "وفات موسیٰ مبرقعؒ", note: "296ھ", ...SOURCE },
  { id: "r2-25-muawiya-yazid", month: "rabi-al-thani", monthLabel: "ربیع الثانی", day: 25, title: "معاویہ بن یزید کا خلافت سے کنارہ کش ہونا", note: "64ھ", ...SOURCE },
  { id: "r2-28-amini", month: "rabi-al-thani", monthLabel: "ربیع الثانی", day: 28, title: "ارتحال علامہ عبدالحسین امینیؒ", note: "1390ھ؛ مؤلف الغدیر", ...SOURCE },
  { id: "r2-29-30-khalid", month: "rabi-al-thani", monthLabel: "ربیع الثانی", day: 29, dayLabel: "29/30", title: "ہلاکت خالد بن ولید", note: "21 یا 22ھ؛ ماخذ میں 29/30 ربیع الثانی", ...SOURCE },

  // جمادی الاول
  { id: "j1-01-zaynab-week", month: "jumada-al-awwal", monthLabel: "جمادی الاول", day: 1, dayLabel: "1 تا 7", title: "هفتۂ بزرگداشت ولادت حضرت زینب کبریٰؑ", ...SOURCE },
  { id: "j1-05-zaynab", month: "jumada-al-awwal", monthLabel: "جمادی الاول", day: 5, title: "ولادت حضرت زینب کبریٰؑ", note: "5ھ", ...SOURCE },
  { id: "j1-06-muta", month: "jumada-al-awwal", monthLabel: "جمادی الاول", day: 6, title: "جنگِ مؤتہ اور شہادت جعفر طیارؑ", note: "8ھ", ...SOURCE },
  { id: "j1-10-fatima-second", month: "jumada-al-awwal", monthLabel: "جمادی الاول", day: 10, dayLabel: "10 تا 19", title: "دهۂ بزرگداشت شہادت حضرت فاطمہ زہراؑ", note: "فاطمیہ دوم؛ روایت 75 روز", ...SOURCE },
  { id: "j1-13-fatima-75", month: "jumada-al-awwal", monthLabel: "جمادی الاول", day: 13, title: "شہادت حضرت فاطمہ زہراؑ", note: "75 روز والی روایت", ...SOURCE },
  { id: "j1-19-zayd", month: "jumada-al-awwal", monthLabel: "جمادی الاول", day: 19, title: "شہادت زید بن صوحانؓ", note: "جنگِ جمل، 36ھ", ...SOURCE },
  { id: "j1-26-naeeni", month: "jumada-al-awwal", monthLabel: "جمادی الاول", day: 26, title: "ارتحال میرزا محمد حسین نائینیؒ", note: "1355ھ", ...SOURCE },
  { id: "j1-26-shirazi", month: "jumada-al-awwal", monthLabel: "جمادی الاول", day: 26, title: "ارتحال سید محمد رضا حسینی شیرازیؒ", note: "1429ھ", ...SOURCE },
  { id: "j1-27-abdulmuttalib", month: "jumada-al-awwal", monthLabel: "جمادی الاول", day: 27, title: "وفات حضرت عبدالمطلبؑ", note: "8 عام الفیل", ...SOURCE },
  { id: "j1-29-30-muhammad-simri", month: "jumada-al-awwal", monthLabel: "جمادی الاول", day: 29, dayLabel: "29/30", title: "وفات محمد بن عثمان عمریؒ، نائب دوم امام زمانؑ", note: "305ھ", ...SOURCE },

  // جمادی الثانی
  { id: "j2-01-fatima-third", month: "jumada-al-thani", monthLabel: "جمادی الثانی", day: 1, dayLabel: "1 تا 10", title: "دهۂ بزرگداشت شہادت حضرت فاطمہ زہراؑ", note: "فاطمیہ سوم؛ روایت 95 روز", ...SOURCE },
  { id: "j2-03-fatima-95", month: "jumada-al-thani", monthLabel: "جمادی الثانی", day: 3, title: "شہادت حضرت فاطمہ زہراؑ", note: "95 روز والی روایت", ...SOURCE },
  { id: "j2-04-harun", month: "jumada-al-thani", monthLabel: "جمادی الثانی", day: 4, title: "ہلاکت ہارون عباسی", note: "193ھ", ...SOURCE },
  { id: "j2-09-sharafuddin", month: "jumada-al-thani", monthLabel: "جمادی الثانی", day: 9, title: "وفات سید عبدالحسین شرف الدین عاملیؒ", note: "1377ھ؛ مؤلف المراجعات", ...SOURCE },
  { id: "j2-11-13-umm-al-banin", month: "jumada-al-thani", monthLabel: "جمادی الثانی", day: 11, dayLabel: "11 تا 13", title: "ایامِ بزرگداشت وفات حضرت ام البنینؑ", ...SOURCE },
  { id: "j2-13-umm-al-banin", month: "jumada-al-thani", monthLabel: "جمادی الثانی", day: 13, title: "وفات حضرت ام البنینؑ", note: "64ھ", ...SOURCE },
  { id: "j2-16-hasan-shirazi", month: "jumada-al-thani", monthLabel: "جمادی الثانی", day: 16, title: "شہادت سید حسن شیرازیؒ", note: "1400ھ", ...SOURCE },
  { id: "j2-18-fatima-birthday-week", month: "jumada-al-thani", monthLabel: "جمادی الثانی", day: 18, dayLabel: "18 تا 27", title: "دهۂ بزرگداشت ولادت حضرت فاطمہ زہراؑ", ...SOURCE },
  { id: "j2-20-fatima-birthday", month: "jumada-al-thani", monthLabel: "جمادی الثانی", day: 20, title: "ولادت حضرت فاطمہ زہراؑ", note: "بعثت کے بعد 5 سال", ...SOURCE },
  { id: "j2-22-abu-bakr", month: "jumada-al-thani", monthLabel: "جمادی الثانی", day: 22, title: "مرگ ابوبکر", note: "13ھ", ...SOURCE },
  { id: "j2-24-gulpayegani", month: "jumada-al-thani", monthLabel: "جمادی الثانی", day: 24, title: "ارتحال سید محمد رضا گلپایگانیؒ", note: "1414ھ", ...SOURCE },
  { id: "j2-27-sultan-ali", month: "jumada-al-thani", monthLabel: "جمادی الثانی", day: 27, title: "شہادت سلطان علیؒ، فرزند امام محمد باقرؑ", note: "116ھ", ...SOURCE },
  { id: "j2-29-30-umm-kulthum", month: "jumada-al-thani", monthLabel: "جمادی الثانی", day: 29, dayLabel: "29/30", title: "وفات حضرت ام کلثومؑ / شہادت سید محمدؑ فرزند امام ہادیؑ", note: "61ھ / 252ھ", ...SOURCE },

  // رجب
  { id: "raj-01-baqir", month: "rajab", monthLabel: "رجب", day: 1, title: "ولادت امام محمد باقرؑ", note: "57ھ", ...SOURCE },
  { id: "raj-02-05-hadi", month: "rajab", monthLabel: "رجب", day: 2, dayLabel: "2 تا 5", title: "ایامِ بزرگداشت شہادت امام ہادیؑ", ...SOURCE },
  { id: "raj-03-hadi", month: "rajab", monthLabel: "رجب", day: 3, title: "شہادت امام علی نقی الہادیؑ", note: "254ھ", ...SOURCE },
  { id: "raj-05-ibn-sikkit", month: "rajab", monthLabel: "رجب", day: 5, title: "شہادت ابن سکیتؒ", note: "224ھ", ...SOURCE },
  { id: "raj-06-10-jawad-week", month: "rajab", monthLabel: "رجب", day: 6, dayLabel: "6 تا 10", title: "هفتۂ بزرگداشت ولادت امام جوادؑ", ...SOURCE },
  { id: "raj-07-rida-wilayat", month: "rajab", monthLabel: "رجب", day: 7, title: "امام رضاؑ کی ولایت عہدی کا واقعہ", note: "200ھ", ...SOURCE },
  { id: "raj-10-jawad", month: "rajab", monthLabel: "رجب", day: 10, title: "ولادت امام جوادالائمہؑ", note: "195ھ", ...SOURCE },
  { id: "raj-11-14-ali-week", month: "rajab", monthLabel: "رجب", day: 11, dayLabel: "11 تا 14", title: "هفتۂ بزرگداشت ولادت امیرالمؤمنین علیؑ", ...SOURCE },
  { id: "raj-12-kuufa", month: "rajab", monthLabel: "رجب", day: 12, title: "امیرالمؤمنینؑ کی کوفہ آمد", note: "36ھ", ...SOURCE },
  { id: "raj-13-ali-birthday", month: "rajab", monthLabel: "رجب", day: 13, title: "ولادت امیرالمؤمنین علیؑ", note: "عام الفیل؛ 600ء", ...SOURCE },
  { id: "raj-14-mutamid", month: "rajab", monthLabel: "رجب", day: 14, title: "ہلاکت معتمد عباسی", note: "279ھ", ...SOURCE },
  { id: "raj-15-zaynab", month: "rajab", monthLabel: "رجب", day: 15, title: "شہادت حضرت زینب کبریٰؑ", note: "62ھ", ...SOURCE },
  { id: "raj-17-ahmad-musavi", month: "rajab", monthLabel: "رجب", day: 17, title: "شہادت حضرت احمد بن موسیٰؑ (شاہچراغ)", note: "202ھ", ...SOURCE },
  { id: "raj-18-ibrahim", month: "rajab", monthLabel: "رجب", day: 18, title: "وفات ابراہیم فرزند رسول اکرم ﷺ", note: "7ھ", ...SOURCE },
  { id: "raj-20-26-kazim-week", month: "rajab", monthLabel: "رجب", day: 20, dayLabel: "20 تا 26", title: "هفتۂ بزرگداشت شہادت امام موسیٰ کاظمؑ", ...SOURCE },
  { id: "raj-22-kaashif-al-ghita", month: "rajab", monthLabel: "رجب", day: 22, title: "ارتحال شیخ جعفر کاشف الغطاءؒ", note: "1228ھ", ...SOURCE },
  { id: "raj-23-kazim-illness", month: "rajab", monthLabel: "رجب", day: 23, title: "امام حسن مجتبیٰؑ کے زخمی ہونے / امام کاظمؑ کے مسموم ہونے کے ماخذی اندراجات", note: "40ھ / 183ھ", ...SOURCE },
  { id: "raj-24-khaybar", month: "rajab", monthLabel: "رجب", day: 24, title: "فتح خیبر اور مرحب کا مقابلہ", note: "7ھ", ...SOURCE },
  { id: "raj-25-kazim", month: "rajab", monthLabel: "رجب", day: 25, title: "شہادت امام موسیٰ کاظمؑ", note: "183ھ", ...SOURCE },
  { id: "raj-26-abu-talib", month: "rajab", monthLabel: "رجب", day: 26, title: "وفات حضرت ابو طالبؑ", note: "بعثت کے دسویں سال", ...SOURCE },
  { id: "raj-27-30-mabath", month: "rajab", monthLabel: "رجب", day: 27, dayLabel: "27 تا 30", title: "ایامِ بزرگداشت مبعث رسول اکرم ﷺ", ...SOURCE },
  { id: "raj-28-husayn-makkah", month: "rajab", monthLabel: "رجب", day: 28, title: "امام حسینؑ کی مدینہ سے مکہ کی طرف روانگی", note: "60ھ", ...SOURCE },

  // شعبان
  { id: "sha-01-10-births", month: "shaban", monthLabel: "شعبان", day: 1, dayLabel: "1 تا 10", title: "دهۂ بزرگداشت ولادت امام حسینؑ، حضرت عباسؑ اور امام سجادؑ", ...SOURCE },
  { id: "sha-02-roza", month: "shaban", monthLabel: "شعبان", day: 2, title: "روزے کی فرضیت / غزوہ بنی مصطلق / ہلاکت معتز عباسی", note: "2ھ / 5ھ / 255ھ", ...SOURCE },
  { id: "sha-03-husayn", month: "shaban", monthLabel: "شعبان", day: 3, title: "ولادت امام حسینؑ", note: "4ھ", ...SOURCE },
  { id: "sha-04-abbas", month: "shaban", monthLabel: "شعبان", day: 4, title: "ولادت حضرت ابوالفضل العباسؑ", note: "26ھ", ...SOURCE },
  { id: "sha-05-sajjad", month: "shaban", monthLabel: "شعبان", day: 5, title: "ولادت امام سجادؑ", note: "38ھ", ...SOURCE },
  { id: "sha-10-samhari", month: "shaban", monthLabel: "شعبان", day: 10, title: "آخری توقیعِ مبارک کا صدور", note: "329ھ", ...SOURCE },
  { id: "sha-11-20-mahdawiyyat", month: "shaban", monthLabel: "شعبان", day: 11, dayLabel: "11 تا 20", title: "دهۂ بزرگداشت مهدویت", ...SOURCE },
  { id: "sha-11-ali-akbar", month: "shaban", monthLabel: "شعبان", day: 11, title: "ولادت حضرت علی اکبرؑ", note: "33ھ", ...SOURCE },
  { id: "sha-15-mahdi", month: "shaban", monthLabel: "شعبان", day: 15, title: "ولادت حضرت قائم آل محمدؑ", note: "255ھ", ...SOURCE },
  { id: "sha-15-samari", month: "shaban", monthLabel: "شعبان", day: 15, title: "وفات علی بن محمد سمریؒ اور آغاز غیبت کبریٰ", note: "329ھ", ...SOURCE },
  { id: "sha-18-husayn-b-rooh", month: "shaban", monthLabel: "شعبان", day: 18, title: "وفات حسین بن روح نوبختیؒ", note: "326ھ", ...SOURCE },
  { id: "sha-20-sultan-waizin", month: "shaban", monthLabel: "شعبان", day: 20, title: "ارتحال سلطان الواعظین شیرازیؒ", note: "1291ھ؛ شبہائے پیشاور کے مؤلف", ...SOURCE },
  { id: "sha-21-shabani-rising", month: "shaban", monthLabel: "شعبان", day: 21, title: "شعبانی قیام کے دوران عراق میں شیعہ قتل عام کا ماخذی اندراج", note: "1411ھ", ...SOURCE },
  { id: "sha-23-ruqayya", month: "shaban", monthLabel: "شعبان", day: 23, title: "یادواره ولادت حضرت رقیہؑ", note: "58ھ", ...SOURCE },
  { id: "sha-24-shirazi", month: "shaban", monthLabel: "شعبان", day: 24, title: "ارتحال مجدد اول سید محمد حسن حسینی شیرازیؒ", note: "1312ھ", ...SOURCE },
  { id: "sha-28-mehdi-shirazi", month: "shaban", monthLabel: "شعبان", day: 28, title: "ارتحال سید مهدی حسینی شیرازیؒ", note: "1380ھ", ...SOURCE },

  // رمضان
  { id: "ram-01-10-khadija-week", month: "ramadan", monthLabel: "رمضان", day: 1, dayLabel: "1 تا 10", title: "دهۂ بزرگداشت وفات حضرت خدیجہ کبریٰؑ", ...SOURCE },
  { id: "ram-03-shaykh-mufid", month: "ramadan", monthLabel: "رمضان", day: 3, title: "ارتحال شیخ مفیدؒ", note: "413ھ", ...SOURCE },
  { id: "ram-04-ziyad", month: "ramadan", monthLabel: "رمضان", day: 4, title: "ہلاکت زیاد بن ابیہ", note: "53ھ", ...SOURCE },
  { id: "ram-06-rida-bayah", month: "ramadan", monthLabel: "رمضان", day: 6, title: "لوگوں کی امام رضاؑ سے بیعت", note: "201ھ", ...SOURCE },
  { id: "ram-08-badr", month: "ramadan", monthLabel: "رمضان", day: 8, title: "غزوہ بدر کے لیے رسول اکرم ﷺ کی روانگی", note: "2ھ", ...SOURCE },
  { id: "ram-10-khadija", month: "ramadan", monthLabel: "رمضان", day: 10, title: "وفات حضرت خدیجہ کبریٰؑ", note: "بعثت کا دسواں سال", ...SOURCE },
  { id: "ram-11-17-hasan-week", month: "ramadan", monthLabel: "رمضان", day: 11, dayLabel: "11 تا 17", title: "هفتۂ بزرگداشت ولادت امام حسن مجتبیٰؑ", ...SOURCE },
  { id: "ram-12-brotherhood", month: "ramadan", monthLabel: "رمضان", day: 12, title: "عقدِ اخوت اور رسول اکرم ﷺ و امیرالمؤمنینؑ کی برادری", note: "1ھ", ...SOURCE },
  { id: "ram-13-hajjaj", month: "ramadan", monthLabel: "رمضان", day: 13, title: "ہلاکت حجاج بن یوسف", note: "95ھ", ...SOURCE },
  { id: "ram-14-mukhtar", month: "ramadan", monthLabel: "رمضان", day: 14, title: "شہادت مختار ثقفیؒ", note: "68ھ", ...SOURCE },
  { id: "ram-15-hasan", month: "ramadan", monthLabel: "رمضان", day: 15, title: "ولادت امام حسن مجتبیٰؑ", note: "3ھ", ...SOURCE },
  { id: "ram-15-muslim", month: "ramadan", monthLabel: "رمضان", day: 15, title: "حضرت مسلم بن عقیلؑ کی کوفہ کی طرف روانگی", note: "60ھ", ...SOURCE },
  { id: "ram-18-27-ali-decade", month: "ramadan", monthLabel: "رمضان", day: 18, dayLabel: "18 تا 27", title: "دهۂ بزرگداشت شہادت امیرالمؤمنین علیؑ", ...SOURCE },
  { id: "ram-19-ali-strike", month: "ramadan", monthLabel: "رمضان", day: 19, title: "امیرالمؤمنین علیؑ پر ضربت", note: "40ھ؛ شب قدر اول", ...SOURCE },
  { id: "ram-20-fath-makkah", month: "ramadan", monthLabel: "رمضان", day: 20, title: "فتح مکہ", note: "8ھ", ...SOURCE },
  { id: "ram-21-ali", month: "ramadan", monthLabel: "رمضان", day: 21, title: "شہادت امیرالمؤمنین علیؑ", note: "40ھ؛ شب قدر دوم", ...SOURCE },
  { id: "ram-23-qadr", month: "ramadan", monthLabel: "رمضان", day: 23, title: "شب قدر سوم", note: "ماخذ میں اسی دن یومِ یاری امامین عسکریینؑ بھی درج ہے", ...SOURCE },
  { id: "ram-26-fazil", month: "ramadan", monthLabel: "رمضان", day: 26, title: "ارتحال فاضل دربندیؒ", note: "1286ھ", ...SOURCE },
  { id: "ram-27-majlisi", month: "ramadan", monthLabel: "رمضان", day: 27, title: "وفات علامہ محمد باقر مجلسیؒ", note: "1110ھ", ...SOURCE },

  // شوال
  { id: "shaw-01-eid", month: "shawwal", monthLabel: "شوال", day: 1, title: "عید سعید فطر", ...SOURCE },
  { id: "shaw-03-mutawakkil", month: "shawwal", monthLabel: "شوال", day: 3, title: "ہلاکت متوکل عباسی", note: "247ھ", ...SOURCE },
  { id: "shaw-04-10-baqi-week", month: "shawwal", monthLabel: "شوال", day: 4, dayLabel: "4 تا 10", title: "هفتۂ بزرگداشت تخریب حرم ائمہ بقیعؑ", ...SOURCE },
  { id: "shaw-08-baqi", month: "shawwal", monthLabel: "شوال", day: 8, title: "روزِ بقیع / تخریب حرم ائمہ بقیعؑ", note: "1344ھ", ...SOURCE },
  { id: "shaw-12-bahai", month: "shawwal", monthLabel: "شوال", day: 12, title: "ارتحال شیخ بہائیؒ", note: "1030ھ", ...SOURCE },
  { id: "shaw-13-borujerdi", month: "shawwal", monthLabel: "شوال", day: 13, title: "ارتحال سید حسین طباطبائی بروجردیؒ", note: "1380ھ", ...SOURCE },
  { id: "shaw-14-abdulmalik", month: "shawwal", monthLabel: "شوال", day: 14, title: "ہلاکت عبدالملک بن مروان", note: "86ھ", ...SOURCE },
  { id: "shaw-15-uhud", month: "shawwal", monthLabel: "شوال", day: 15, title: "غزوہ احد اور شہادت حضرت حمزہؑ", note: "3ھ؛ ماخذ میں رد الشمس کا واقعہ بھی درج ہے", ...SOURCE },
  { id: "shaw-17-khandaq", month: "shawwal", monthLabel: "شوال", day: 17, title: "غزوہ خندق اور وفات ابا صلتؓ", note: "5ھ / 207ھ", ...SOURCE },
  { id: "shaw-20-kazim-capture", month: "shawwal", monthLabel: "شوال", day: 20, title: "امام موسیٰ کاظمؑ کی گرفتاری", note: "179ھ", ...SOURCE },
  { id: "shaw-21-30-sadiq-decade", month: "shawwal", monthLabel: "شوال", day: 21, dayLabel: "21 تا 30", title: "دهۂ بزرگداشت شہادت امام جعفر صادقؑ", ...SOURCE },
  { id: "shaw-25-sadiq", month: "shawwal", monthLabel: "شوال", day: 25, title: "شہادت امام جعفر صادقؑ", note: "148ھ", ...SOURCE },
  { id: "shaw-27-taif", month: "shawwal", monthLabel: "شوال", day: 27, title: "رسول اکرم ﷺ کی طائف کی طرف روانگی", note: "بعثت کے دس سال بعد", ...SOURCE },
  { id: "shaw-29-30-wahid-bahbahani", month: "shawwal", monthLabel: "شوال", day: 29, dayLabel: "29/30", title: "ارتحال وحید بہبهانیؒ", note: "1205ھ", ...SOURCE },

  // ذوالقعدہ
  { id: "qid-01-masuma", month: "dhu-al-qadah", monthLabel: "ذوالقعدہ", day: 1, title: "ولادت حضرت فاطمہ معصومہؑ", note: "173ھ", ...SOURCE },
  { id: "qid-02-11-rida-week", month: "dhu-al-qadah", monthLabel: "ذوالقعدہ", day: 2, dayLabel: "2 تا 11", title: "دهۂ بزرگداشت ولادت امام رضاؑ", ...SOURCE },
  { id: "qid-06-ibn-tawus", month: "dhu-al-qadah", monthLabel: "ذوالقعدہ", day: 6, title: "ارتحال سید ابن طاووسؒ", note: "664ھ", ...SOURCE },
  { id: "qid-09-muslim-letter", month: "dhu-al-qadah", monthLabel: "ذوالقعدہ", day: 9, title: "حضرت مسلم بن عقیلؑ کا امام حسینؑ کو خط", note: "60ھ", ...SOURCE },
  { id: "qid-11-rida", month: "dhu-al-qadah", monthLabel: "ذوالقعدہ", day: 11, title: "ولادت امام علی بن موسیٰ الرضاؑ", note: "148ھ", ...SOURCE },
  { id: "qid-17-haeri", month: "dhu-al-qadah", monthLabel: "ذوالقعدہ", day: 17, title: "ارتحال شیخ عبدالکریم حائریؒ", note: "1355ھ", ...SOURCE },
  { id: "qid-21-30-jawad-decade", month: "dhu-al-qadah", monthLabel: "ذوالقعدہ", day: 21, dayLabel: "21 تا 30", title: "دهۂ بزرگداشت شہادت امام جوادؑ", ...SOURCE },
  { id: "qid-23-rida-visit", month: "dhu-al-qadah", monthLabel: "ذوالقعدہ", day: 23, title: "روزِ زیارت امام رضاؑ / شہادت امام رضاؑ کی ایک روایت", note: "203ھ", ...SOURCE },
  { id: "qid-25-dahw-al-ard", month: "dhu-al-qadah", monthLabel: "ذوالقعدہ", day: 25, title: "دحو الارض اور امام رضاؑ کی خراسان روانگی", note: "200ھ", ...SOURCE },
  { id: "qid-26-hujjat-al-balag", month: "dhu-al-qadah", monthLabel: "ذوالقعدہ", day: 26, title: "رسول اکرم ﷺ کا حجة البلاغ کے لیے مدینہ سے روانہ ہونا", note: "10ھ", ...SOURCE },
  { id: "qid-29-30-jawad", month: "dhu-al-qadah", monthLabel: "ذوالقعدہ", day: 29, dayLabel: "29/30", title: "شہادت امام جوادؑ", note: "220ھ", ...SOURCE },

  // ذوالحجہ
  { id: "hij-01-ali-fatima", month: "dhu-al-hijjah", monthLabel: "ذوالحجہ", day: 1, title: "ازدواج امیرالمؤمنین علیؑ و حضرت فاطمہ زہراؑ", note: "2ھ؛ تاریخی اختلاف کے ساتھ", ...SOURCE },
  { id: "hij-04-makkah", month: "dhu-al-hijjah", monthLabel: "ذوالحجہ", day: 4, title: "رسول اکرم ﷺ کا مکہ میں حجة البلاغ کے لیے ورود", note: "10ھ", ...SOURCE },
  { id: "hij-05-08-baqir-week", month: "dhu-al-hijjah", monthLabel: "ذوالحجہ", day: 5, dayLabel: "5 تا 8", title: "دهۂ بزرگداشت شہادت امام محمد باقرؑ", ...SOURCE },
  { id: "hij-07-baqir", month: "dhu-al-hijjah", monthLabel: "ذوالحجہ", day: 7, title: "شہادت امام محمد باقرؑ", note: "114ھ", ...SOURCE },
  { id: "hij-08-arafa-prep", month: "dhu-al-hijjah", monthLabel: "ذوالحجہ", day: 8, title: "یومِ ترویہ / امام حسینؑ کی مکہ سے عراق روانگی", note: "60ھ", ...SOURCE },
  { id: "hij-09-arafa-muslim", month: "dhu-al-hijjah", monthLabel: "ذوالحجہ", day: 9, title: "عرفہ اور شہادت حضرت مسلم بن عقیلؑ و ہانی بن عروہؑ", note: "60ھ؛ تاریخی نسبت", ...SOURCE },
  { id: "hij-10-eid-qurban", month: "dhu-al-hijjah", monthLabel: "ذوالحجہ", day: 10, title: "عید الاضحیٰ", ...SOURCE },
  { id: "hij-13-shaq-al-qamar", month: "dhu-al-hijjah", monthLabel: "ذوالحجہ", day: 13, title: "شق القمر کا ماخذی اندراج", note: "ہجرت سے پانچ سال پہلے؛ ماخذ کی نسبت", ...SOURCE },
  { id: "hij-14-fadak", month: "dhu-al-hijjah", monthLabel: "ذوالحجہ", day: 14, title: "فدک حضرت فاطمہ زہراؑ کو عطا کیے جانے کا ماخذی اندراج", note: "7ھ", ...SOURCE },
  { id: "hij-15-hadi", month: "dhu-al-hijjah", monthLabel: "ذوالحجہ", day: 15, title: "ولادت امام علی نقی الہادیؑ", note: "212ھ", ...SOURCE },
  { id: "hij-18-ghadir", month: "dhu-al-hijjah", monthLabel: "ذوالحجہ", day: 18, title: "عید غدیر خم", note: "10ھ", ...SOURCE },
  { id: "hij-19-karbala-remembrance", month: "dhu-al-hijjah", monthLabel: "ذوالحجہ", day: 19, title: "یومِ مظلومیت کربلا", note: "ماخذ میں عالمی نام گذاری کے طور پر درج", ...SOURCE },
  { id: "hij-20-26-kazim-birth-week", month: "dhu-al-hijjah", monthLabel: "ذوالحجہ", day: 20, dayLabel: "20 تا 26", title: "دهۂ بزرگداشت ولادت امام موسیٰ کاظمؑ", ...SOURCE },
  { id: "hij-22-mitham", month: "dhu-al-hijjah", monthLabel: "ذوالحجہ", day: 22, title: "شہادت میثم تمّارؓ", note: "60ھ", ...SOURCE },
  { id: "hij-23-muslim-sons", month: "dhu-al-hijjah", monthLabel: "ذوالحجہ", day: 23, title: "شہادت محمد و ابراہیم، فرزندان حضرت مسلم بن عقیلؑ", note: "62ھ", ...SOURCE },
  { id: "hij-24-mubahala", month: "dhu-al-hijjah", monthLabel: "ذوالحجہ", day: 24, title: "یومِ مباہلہ، نزول آیت مباہلہ و آیت ولایت کا ماخذی اندراج", note: "10ھ", ...SOURCE },
  { id: "hij-25-hal-ata", month: "dhu-al-hijjah", monthLabel: "ذوالحجہ", day: 25, title: "نزول سورۂ ہل اتی اور پہلی نمازِ جمعہ کا ماخذی اندراج", note: "35ھ؛ ماخذی نسبت", ...SOURCE },
  { id: "hij-27-marwan", month: "dhu-al-hijjah", monthLabel: "ذوالحجہ", day: 27, title: "ہلاکت مروان حمار", note: "132ھ", ...SOURCE },
  { id: "hij-28-harra", month: "dhu-al-hijjah", monthLabel: "ذوالحجہ", day: 28, title: "واقعۂ حرہ کا ماخذی اندراج", note: "63ھ", ...SOURCE },
  { id: "hij-29-30", month: "dhu-al-hijjah", monthLabel: "ذوالحجہ", day: 29, dayLabel: "29/30", title: "پیشوازِ محرم الحرام / ماہ کے آخری ایام", ...SOURCE },
] as const;

export const RABI_AL_THANI_1448_EVENTS = SHIA_CALENDAR_1448_EVENTS.filter(
  (event) => event.month === "rabi-al-thani",
);
