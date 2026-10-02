export type KhateebSourceKind = "speaker" | "scholar";
export type KhateebRegion = "pk" | "in" | "ir";

export type KhateebProfile = {
  id: string;
  name: string;
  region: KhateebRegion;
  kind: KhateebSourceKind;
  languages: Array<"ur" | "fa" | "ar">;
  corpusFocus: string[];
  notes?: string;
  sourceUrl?: string;
  sourceLabel?: string;
};

/** Seed registry only. This is a source map, not a quality ranking. */
export const KHATEEB_CORPUS: readonly KhateebProfile[] = [
  { id: "talib-johari", name: "علامہ سید طالب جوہریؒ", region: "pk", kind: "scholar", languages: ["ur"], corpusFocus: ["قرآن", "فلسفہ", "کلام", "تاریخ", "منبری استدلال"] },
  { id: "rashid-turabi", name: "علامہ سید رشید ترابیؒ", region: "pk", kind: "speaker", languages: ["ur"], corpusFocus: ["مجالس", "خطابت", "قرآنی استشہاد", "تاریخی و ادبی بیان"], sourceUrl: "https://maablib.org/majalas-e-turabi-1407-az-raza-hussain-turabi-mrtba-syed-zameer-akhtar-naqvi/", sourceLabel: "مجالس ترابی — مآب لائبریری" },
  { id: "azhar-hasan-zaidi", name: "علامہ اظہر حسن زیدیؒ", region: "pk", kind: "speaker", languages: ["ur"], corpusFocus: ["مجالس", "اہل بیتؑ", "منبری بیان"], sourceUrl: "https://maablib.org/khateeb-e-aal-e-muhammad-taqareer-ka-majmuwa-azhar-hasan-zaidi-murtba-khizar-abbas-syed/", sourceLabel: "خطیب آل محمد — مآب لائبریری" },
  { id: "zameer-akhtar-naqvi", name: "علامہ ڈاکٹر سید ضمیر اختر نقویؒ", region: "pk", kind: "scholar", languages: ["ur"], corpusFocus: ["مجالس", "تاریخ", "سیرت", "تحقیق", "موضوعاتی خطابت"] },
  { id: "shahenshah-naqvi", name: "علامہ سید شہنشاہ حسین نقوی", region: "pk", kind: "speaker", languages: ["ur"], corpusFocus: ["مجالس", "خطابات", "اخلاق", "سیرت", "عقائد"], sourceUrl: "https://syedshahenshahhussainnaqvi.com/ur/", sourceLabel: "ویب سائٹ / خطابات" },
  { id: "hasan-zafar-naqvi", name: "علامہ سید حسن ظفر نقوی", region: "pk", kind: "speaker", languages: ["ur"], corpusFocus: ["قرآن", "امامت", "ولایت", "تاریخ", "مجالس"] },
  { id: "jawad-naqvi", name: "علامہ سید جواد نقوی", region: "pk", kind: "scholar", languages: ["ur"], corpusFocus: ["خطبات جمعہ", "قرآن", "دروس", "فکر", "معاصر مسائل"], sourceUrl: "https://syedjawadnaqvi.com/", sourceLabel: "ویب سائٹ / خطابات و دروس" },
  { id: "muhammad-zaki-baqeri", name: "علامہ محمد زکی باقری", region: "pk", kind: "speaker", languages: ["ur"], corpusFocus: ["مجالس", "تاریخ", "سیرت"] },
  { id: "amin-shahidi", name: "علامہ سید امین شہیدی", region: "pk", kind: "speaker", languages: ["ur"], corpusFocus: ["معاصر مسائل", "دینی خطاب", "اجتماعی مباحث"] },
  { id: "ali-naqi-naqvi", name: "آیت اللہ سید علی نقی نقوی لکھنویؒ (نقنؒ)", region: "in", kind: "scholar", languages: ["ur"], corpusFocus: ["تفسیر", "علوم قرآن", "کلام", "حدیث", "عقائد", "فقہ و اصول"], sourceUrl: "https://misbahulqurantrust.org/book/tafseer-faslul-khitab/", sourceLabel: "تفسیر فصل الخطاب — مصباح القرآن ٹرسٹ" },
  { id: "zeeshan-jawadi", name: "علامہ سید ذیشان حیدر جوادیؒ", region: "in", kind: "scholar", languages: ["ur"], corpusFocus: ["قرآن", "حدیث", "رجال", "نہج البلاغہ", "مجالس", "عقائد"], sourceUrl: "https://maablib.org/scholar/life-of-allama-zeeshan-haider-jawadi/", sourceLabel: "سید ذیشان حیدر جوادی — مآب لائبریری" },
  { id: "aqeel-gharaavi", name: "آیت اللہ سید عقیل الغروی", region: "in", kind: "scholar", languages: ["ur", "ar"], corpusFocus: ["قرآن", "فلسفہ", "کلام", "تعلیم", "نہج البلاغہ"] },
  { id: "kalbe-sadiq", name: "مولانا ڈاکٹر کلب صادقؒ", region: "in", kind: "scholar", languages: ["ur"], corpusFocus: ["قرآن", "سائنس", "معاصر مسائل", "عوامی خطاب"] },
  { id: "kalbe-jawad", name: "مولانا سید کلب جواد نقوی", region: "in", kind: "speaker", languages: ["ur"], corpusFocus: ["مجالس", "قرآن", "حدیث", "مذہبی مناسبتیں"] },
  { id: "razi-jafar-naqvi", name: "سید رضی جعفر نقوی", region: "in", kind: "speaker", languages: ["ur"], corpusFocus: ["اردو منبر", "مجالس", "سیرت"] },
  { id: "hossein-ansarian", name: "حجت الاسلام حسین انصاریان", region: "ir", kind: "speaker", languages: ["fa", "ar"], corpusFocus: ["اخلاق", "قرآن", "عرفان", "اہل بیتؑ", "مجالس"] },
  { id: "alireza-panahian", name: "حجت الاسلام علیرضا پناهیان", region: "ir", kind: "speaker", languages: ["fa"], corpusFocus: ["موضوع سازی", "تربیت", "اخلاق", "اجتماعی فکر", "سلسلہ وار خطابات"], sourceUrl: "https://panahian.net/", sourceLabel: "پناہیان — خطابات و آثار" },
  { id: "hamed-kashani", name: "حجت الاسلام حامد کاشانی", region: "ir", kind: "scholar", languages: ["fa", "ar"], corpusFocus: ["حدیث", "رجال", "تاریخ اسلام", "مقتل", "عاشورا", "سیرت اہل بیتؑ"], sourceUrl: "https://www.hkashani.com/", sourceLabel: "حامد کاشانی — سخنرانی و دروس" },
  { id: "masoud-aali", name: "حجت الاسلام مسعود عالی", region: "ir", kind: "speaker", languages: ["fa"], corpusFocus: ["اخلاق", "سیرت", "تربیت", "قرآن", "اہل بیتؑ"] },
  { id: "naser-rafiei", name: "حجت الاسلام دکتر ناصر رفیعی", region: "ir", kind: "scholar", languages: ["fa"], corpusFocus: ["اخلاق", "قرآن", "حدیث", "خاندان", "سیرت"] },
  { id: "mirbaqeri", name: "آیت اللہ سید محمدمهدی میرباقری", region: "ir", kind: "scholar", languages: ["fa"], corpusFocus: ["قرآن", "ولایت", "مهدویت", "تمدنی فکر", "تاریخ"] },
  { id: "abedini", name: "حجت الاسلام محمدرضا عابدینی", region: "ir", kind: "scholar", languages: ["fa"], corpusFocus: ["قرآن", "تربیت", "سیرت اہل بیتؑ", "ابتلاء", "اخلاق"] },
  { id: "raji", name: "حجت الاسلام محمدحسین راجی", region: "ir", kind: "speaker", languages: ["fa"], corpusFocus: ["تاریخ", "اجتماعی مسائل", "دینی فکر", "خطابات"] },
  { id: "shojaei", name: "استاد محمد شجاعی", region: "ir", kind: "speaker", languages: ["fa"], corpusFocus: ["اخلاق", "تربیت", "سلوک", "ابتلاء", "کربلا"] },
  { id: "qaraati", name: "حجت الاسلام محسن قرائتی", region: "ir", kind: "scholar", languages: ["fa"], corpusFocus: ["قرآن فہمی", "تفسیر", "عوامی تعلیم", "عملی نکات"] },
  { id: "ghanbariyan", name: "حجت الاسلام محسن قنبریان", region: "ir", kind: "scholar", languages: ["fa"], corpusFocus: ["قرآن", "عاشورا", "اجتماعی ذمہ داری", "معاصر فکر"] },
  { id: "aghamiri", name: "حجت الاسلام سید حسین آقامیری", region: "ir", kind: "speaker", languages: ["fa"], corpusFocus: ["تاریخ", "سیرت", "معاصر مخاطب", "اخلاق"] },
] as const;

export const REGION_LABELS = { pk: "پاکستان", in: "ہندوستان", ir: "ایران" } as const;
