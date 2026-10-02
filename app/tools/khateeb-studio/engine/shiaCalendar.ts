export type ShiaCalendarEvent = {
  id: string;
  month: "ربیع الثانی";
  day: number;
  title: string;
  note?: string;
  sourceLabel: string;
  sourceUrl: string;
};

/** Seeded from published Shi'a calendar references; lunar day is retained to avoid hiding source discrepancies. */
export const RABI_AL_THANI_1448_EVENTS: readonly ShiaCalendarEvent[] = [
  { id: "r2-01-tawwabin", month: "ربیع الثانی", day: 1, title: "قیامِ توابین", note: "65ھ", sourceLabel: "شبکہ امام حسین / شیعہ تقویم", sourceUrl: "https://shiawaves.com/persian/shia-calendar/" },
  { id: "r2-02-08-askari-week", month: "ربیع الثانی", day: 2, title: "ہفتۂ بزرگداشتِ ولادت امام حسن عسکریؑ", note: "2 تا 8 ربیع الثانی", sourceLabel: "شبکہ امام حسین / شیعہ تقویم", sourceUrl: "https://shiawaves.com/persian/shia-calendar/" },
  { id: "r2-03-jurjan", month: "ربیع الثانی", day: 3, title: "امام حسن عسکریؑ کا جرجان کا تاریخی سفر", note: "255ھ", sourceLabel: "شبکہ امام حسین / شیعہ تقویم", sourceUrl: "https://shiawaves.com/persian/shia-calendar/" },
  { id: "r2-04-abdolazim", month: "ربیع الثانی", day: 4, title: "ولادت حضرت عبدالعظیم حسنیؑ", note: "173ھ", sourceLabel: "شبکہ امام حسین / شیعہ تقویم", sourceUrl: "https://shiawaves.com/persian/shia-calendar/" },
  { id: "r2-06-hisham", month: "ربیع الثانی", day: 6, title: "ہلاکتِ ہشام بن عبدالملک", note: "125ھ", sourceLabel: "شبکہ امام حسین / شیعہ تقویم", sourceUrl: "https://shiawaves.com/persian/shia-calendar/" },
  { id: "r2-06-askari-report", month: "ربیع الثانی", day: 6, title: "ولادت امام حسن عسکریؑ", note: "232ھ؛ ایک روایت", sourceLabel: "شبکہ امام حسین / شیعہ تقویم", sourceUrl: "https://shiawaves.com/persian/shia-calendar/" },
  { id: "r2-08-askari", month: "ربیع الثانی", day: 8, title: "ولادت امام حسن عسکریؑ", note: "232ھ؛ تقویمی ماخذ", sourceLabel: "مجمع جهانی شیعه شناسی", sourceUrl: "https://shiastudies.com/fa/%D9%87%D8%B4%D8%AA%D9%85-%D8%B1%D8%A8%DB%8C%D8%B9-%D8%A7%D9%84%D8%AB%D8%A7%D9%86%DB%8C/" },
  { id: "r2-08-zahra-report", month: "ربیع الثانی", day: 8, title: "شہادت حضرت فاطمہ زہراؑ", note: "40 روز والی روایت", sourceLabel: "مجمع جهانی شیعه شناسی", sourceUrl: "https://shiastudies.com/fa/%D9%87%D8%B4%D8%AA%D9%85-%D8%B1%D8%A8%DB%8C%D8%B9-%D8%A7%D9%84%D8%AB%D8%A7%D9%86%DB%8C/" },
  { id: "r2-10-masuma", month: "ربیع الثانی", day: 10, title: "وفات حضرت فاطمہ معصومہؑ", sourceLabel: "مجمع جهانی شیعه شناسی", sourceUrl: "https://shiastudies.com/fa/%D9%88%D9%82%D8%A7%DB%8C%D8%B9-%D9%85%D8%A7%D9%87-%D8%B1%D8%A8%DB%8C%D8%B9-%D8%A7%D9%84%D8%AB%D8%A7%D9%86%DB%8C/" },
  { id: "r2-10-13-fatimiyya", month: "ربیع الثانی", day: 10, title: "ایامِ بزرگداشت شہادت حضرت فاطمہ زہراؑ", note: "فاطمیہ اول؛ ایک تقویمی روایت", sourceLabel: "شبکہ امام حسین / شیعہ تقویم", sourceUrl: "https://shiawaves.com/persian/shia-calendar/" },
  { id: "r2-12-umayyad", month: "ربیع الثانی", day: 12, title: "انقراض بنی امیہ", sourceLabel: "مجمع جهانی شیعه شناسی", sourceUrl: "https://shiastudies.com/fa/%D9%88%D9%82%D8%A7%DB%8C%D8%B9-%D9%85%D8%A7%D9%87-%D8%B1%D8%A8%DB%8C%D8%B9-%D8%A7%D9%84%D8%AB%D8%A7%D9%86%DB%8C/" },
  { id: "r2-13-fatimiyya", month: "ربیع الثانی", day: 13, title: "شہادت حضرت فاطمہ زہراؑ", note: "45 روز والی روایت", sourceLabel: "مجمع جهانی شیعه شناسی", sourceUrl: "https://shiastudies.com/fa/%D8%B3%DB%8C%D8%B2%D8%AF%D9%87%D9%85-%D8%B1%D8%A8%DB%8C%D8%B9-%D8%A7%D9%84%D8%AB%D8%A7%D9%86%DB%8C/" },
  { id: "r2-14-mukhtar", month: "ربیع الثانی", day: 14, title: "قیامِ مختار", sourceLabel: "مجمع جهانی شیعه شناسی", sourceUrl: "https://shiastudies.com/fa/%D9%88%D9%82%D8%A7%DB%8C%D8%B9-%D9%85%D8%A7%D9%87-%D8%B1%D8%A8%DB%8C%D8%B9-%D8%A7%D9%84%D8%AB%D8%A7%D9%86%DB%8C/" },
  { id: "r2-22-musa-mubarqa", month: "ربیع الثانی", day: 22, title: "وفات موسیٰ مبرقعؒ", sourceLabel: "مجمع جهانی شیعه شناسی", sourceUrl: "https://shiastudies.com/fa/%D9%88%D9%82%D8%A7%DB%8C%D8%B9-%D9%85%D8%A7%D9%87-%D8%B1%D8%A8%DB%8C%D8%B9-%D8%A7%D9%84%D8%AB%D8%A7%D9%86%DB%8C/" },
  { id: "r2-30-khalid", month: "ربیع الثانی", day: 30, title: "مرگ خالد بن ولید", note: "تقویمی ماخذ میں آخری دن", sourceLabel: "مجمع جهانی شیعه شناسی", sourceUrl: "https://shiastudies.com/fa/%D9%88%D9%82%D8%A7%DB%8C%D8%B9-%D9%85%D8%A7%D9%87-%D8%B1%D8%A8%DB%8C%D8%B9-%D8%A7%D9%84%D8%AB%D8%A7%D9%86%DB%8C/" },
] as const;
