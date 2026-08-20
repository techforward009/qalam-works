/**
 * Roman Urdu lexical intelligence — Phase 19A.8
 *
 * Word-level Roman → correct Urdu orthography map.
 * Priority: dictionary hit > morphology > phonetic guess.
 * No sentence-specific phrases.
 */

/** Canonical Roman key → Urdu form. Keys are normalized lowercase without apostrophes. */
const LEXICON: Record<string, string> = {
  // employment / finance
  mulaazmeen: "ملازمین",
  mulazmeen: "ملازمین",
  mulaazmin: "ملازمین",
  mulazmin: "ملازمین",
  tankhwah: "تنخواہ",
  tankhah: "تنخواہ",
  tankhwa: "تنخواہ",
  tankha: "تنخواہ",
  tankhwaah: "تنخواہ",
  adaiyagi: "ادائیگی",
  adayegi: "ادائیگی",
  adaiagi: "ادائیگی",
  adaiygi: "ادائیگی",
  tasdeeq: "تصدیق",
  tasdik: "تصدیق",
  tasdeeqq: "تصدیق",
  nihayat: "نہایت",
  nihaiyat: "نہایت",
  zaroori: "ضروری",
  zaruri: "ضروری",
  mahana: "ماہانہ",
  maahana: "ماہانہ",
  pension: "پینشن",
  bank: "بینک",
  account: "اکاؤنٹ",

  // legal / civic
  qanooni: "قانونی",
  kanooni: "قانونی",
  qanoon: "قانون",
  kanoon: "قانون",
  qawaneen: "قوانین",
  qavanin: "قوانین",
  qawanein: "قوانین",
  zimmedari: "ذمہ داری",
  zimedari: "ذمہ داری",
  zimadari: "ذمہ داری",
  zimmedarii: "ذمہ داری",
  zimmedarana: "ذمہ دارانہ",
  zimedarana: "ذمہ دارانہ",
  zimmedaarana: "ذمہ دارانہ",
  zimmedar: "ذمہ دار",
  zimedar: "ذمہ دار",
  riyasat: "ریاست",
  riasat: "ریاست",
  riysat: "ریاست",
  adalat: "عدالت",
  adaalat: "عدالت",
  aaliya: "عالیہ",
  aalia: "عالیہ",
  notice: "نوٹس",
  notis: "نوٹس",
  committee: "کمیٹی",
  comitee: "کمیٹی",
  qaim: "قائم",
  qaaim: "قائم",
  ziyadati: "زیادتی",
  zyadati: "زیادتی",

  // society / discourse
  muashra: "معاشرہ",
  muaashra: "معاشرہ",
  muashray: "معاشرے",
  muaashray: "معاشرے",
  muashre: "معاشرے",
  muaashre: "معاشرے",
  muamla: "معاملہ",
  muaamla: "معاملہ",
  muamlaat: "معاملات",
  muaamlaat: "معاملات",
  nafsiaati: "نفسیاتی",
  nafsiati: "نفسیاتی",
  nafsyati: "نفسیاتی",
  fikri: "فکری",
  nazariyat: "نظریات",
  nazriyat: "نظریات",
  ehtiram: "احترام",
  ehtram: "احترام",
  ihtiram: "احترام",
  tehqeeq: "تحقیق",
  tehqiq: "تحقیق",
  tahqiq: "تحقیق",
  mushkilat: "مشکلات",
  mushkilaat: "مشکلات",
  guftagu: "گفتگو",
  guftgoo: "گفتگو",
  guftugu: "گفتگو",
  bighaar: "بگاڑ",
  bighar: "بگاڑ",
  bigaar: "بگاڑ",
  shadeed: "شدید",
  shadid: "شدید",
  anjaam: "انجام",
  anjam: "انجام",
  aelaan: "اعلان",
  elaan: "اعلان",
  elaaan: "اعلان",
  izafa: "اضافہ",
  izaafa: "اضافہ",
  multavi: "ملتوی",
  multawi: "ملتوی",
  rukawat: "رکاوٹ",
  rukaawat: "رکاوٹ",
  rabta: "رابطہ",
  raabta: "رابطہ",
  rabtah: "رابطہ",
  fori: "فوری",
  fauri: "فوری",
  mukammal: "مکمل",
  mukamill: "مکمل",
  jadeed: "جدید",
  jadid: "جدید",
  daur: "دور",
  naazuk: "نازک",
  nazuk: "نازک",
  paida: "پیدا",
  taassub: "تعصب",
  tassub: "تعصب",
  bilaa: "بلا",
  bila: "بلا",
  amal: "عمل",
  daramad: "درآمد",
  darmad: "درآمد",
  falah: "فلاح",
  behbood: "بہبود",
  aawam: "عوام",
  awam: "عوام",
  aam: "عام",
  tayyar: "تیار",
  kiye: "کیے",
  gaye: "گئے",
  pehli: "پہلی",
  karwana: "کروانا",
  ghair: "غیر",
  ghayr: "غیر",
  social: "سوشل",
  media: "میڈیا",
  policy: "پالیسی",
  documents: "ڈاکومنٹس",
  document: "ڈاکومنٹ",
  meeting: "میٹنگ",
  company: "کمپنی",
  inflation: "انفلیشن",
  investigation: "انویسٹی گیشن",
  verification: "ویریفیکیشن",
  update: "اپ ڈیٹ",
  hr: "ایچ آر",
};

/** Normalize a Roman token to lexicon lookup key. */
export function lexiconKey(token: string): string {
  return token
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/3/g, "")
    .replace(/[^a-z\-]/g, "")
    .replace(/-/g, "");
}

/**
 * Exact / variation dictionary lookup.
 * Returns Urdu form or null.
 */
export function lookupRomanUrduLexicon(token: string): string | null {
  if (!token || token.length < 2) return null;
  const key = lexiconKey(token);
  if (!key) return null;
  if (LEXICON[key]) return LEXICON[key];
  // try without doubled letters collapse
  const collapsed = key.replace(/(.)\1{2,}/g, "$1");
  if (LEXICON[collapsed]) return LEXICON[collapsed];
  // q/k swap for qaf words
  if (key.startsWith("k") && LEXICON["q" + key.slice(1)]) return LEXICON["q" + key.slice(1)];
  if (key.startsWith("q") && LEXICON["k" + key.slice(1)]) return LEXICON["k" + key.slice(1)];
  // zimmedar / zimedar family
  if (key.includes("zimedar")) {
    const alt = key.replace(/zimedar/g, "zimmedar");
    if (LEXICON[alt]) return LEXICON[alt];
  }
  if (key.includes("zimmedar")) {
    const alt = key.replace(/zimmedar/g, "zimedar");
    if (LEXICON[alt]) return LEXICON[alt];
  }
  return null;
}

export const ROMAN_URDU_LEXICON_SIZE = Object.keys(LEXICON).length;
