/**
 * Roman Urdu lexical intelligence — Phase 19A.8 + 19A.9
 *
 * Word-level Roman → correct Urdu orthography map.
 * Priority: exact > variant > phonetic skeleton > strict fuzzy > morphology > phonetic guess.
 * No sentence-specific phrases. No large dictionary dump.
 */

const LEXICON: Record<string, string> = {
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
  shakhs: "شخص",
  mahrum: "محروم",
  huqooq: "حقوق",
  huquq: "حقوق",
  bunyadi: "بنیادی",
  bunyad: "بنیاد",
  wajah: "وجہ",
  mali: "مالی",
  dabao: "دباؤ",
  qadam: "قدم",
  khilaf: "خلاف",
  jari: "جاری",
  us: "اس",
  ke: "کے",
  se: "سے",
  ki: "کی",
  ka: "کا",
  ko: "کو",
  ne: "نے",
  mein: "میں",
  me: "میں",
  hai: "ہے",
  hain: "ہیں",
  sy: "سے",
  say: "سے",
  k: "کے",

};

/** Normalize a Roman token to lexicon lookup key. */
export function lexiconKey(token: string): string {
  return token
    .toLowerCase()
    .replace(/[''\u2019]/g, "")
    .replace(/3/g, "")
    .replace(/[^a-z\-]/g, "")
    .replace(/-/g, "");
}

/**
 * Phonetic skeleton for noisy Roman Urdu matching.
 * shakhs/shaakhs, mahrum/mharoom/mehrum share keys.
 */
export function phoneticKey(token: string): string {
  let t = lexiconKey(token);
  if (!t) return "";
  t = t.replace(/aa+/g, "a").replace(/ee+/g, "i").replace(/ii+/g, "i");
  t = t.replace(/oo+/g, "u").replace(/uu+/g, "u").replace(/ay+/g, "e").replace(/ey+/g, "e");
  t = t.replace(/kh/g, "x").replace(/gh/g, "g").replace(/sh/g, "s").replace(/ch/g, "c");
  t = t.replace(/zh/g, "z").replace(/ph/g, "f").replace(/th/g, "t").replace(/dh/g, "d");
  t = t.replace(/hr/g, "hr").replace(/ny/g, "ny").replace(/qu/g, "q");
  t = t.replace(/[aeiou]/g, "");
  t = t.replace(/(.)\1+/g, "$1");
  return t;
}

function editDistance(a: string, b: string, max = 2): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const m = a.length;
  const n = b.length;
  let prev = new Array(n + 1);
  let cur = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    let rowMin = cur[0];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (cur[j] < rowMin) rowMin = cur[j];
    }
    if (rowMin > max) return max + 1;
    const tmp = prev;
    prev = cur;
    cur = tmp;
  }
  return prev[n];
}

export type LexiconMatchKind = "exact" | "variant" | "phonetic" | "fuzzy";

export interface LexiconMatch {
  urdu: string;
  kind: LexiconMatchKind;
  score: number;
}

const LEXICON_KEYS = Object.keys(LEXICON);

const PARTICLE_URDU = new Set(["کے", "سے", "کی", "کا", "کو", "نے", "میں", "ہے", "ہیں", "اس", "اور", "تو", "پر"]);
const PARTICLE_KEYS = new Set(["k", "ke", "ki", "ka", "ko", "ne", "se", "sy", "say", "me", "mein", "hai", "hain", "us", "to", "par", "pe"]);

const PHONETIC_INDEX: Map<string, string> = (() => {
  const map = new Map<string, string>();
  const byLen = [...LEXICON_KEYS].sort((a, b) => b.length - a.length);
  for (const k of byLen) {
    const pk = phoneticKey(k);
    if (pk.length >= 2 && !map.has(pk)) map.set(pk, LEXICON[k]);
  }
  return map;
})();

export function lookupRomanUrduLexiconDetailed(token: string): LexiconMatch | null {
  if (!token || token.length < 1) return null;
  const key = lexiconKey(token);
  if (!key) return null;

  if (LEXICON[key]) return { urdu: LEXICON[key], kind: "exact", score: 1 };

  // triple+ collapse only (never see→se)
  const collapsed = key.replace(/(.)\1{2,}/g, "$1");
  if (collapsed !== key && LEXICON[collapsed]) {
    return { urdu: LEXICON[collapsed], kind: "variant", score: 0.95 };
  }
  const consCollapse = key.replace(/([bcdfghjklmnpqrstvwxyz])\1+/g, "$1");
  if (consCollapse !== key && LEXICON[consCollapse]) {
    return { urdu: LEXICON[consCollapse], kind: "variant", score: 0.93 };
  }

  if (key.startsWith("k") && LEXICON["q" + key.slice(1)]) {
    return { urdu: LEXICON["q" + key.slice(1)], kind: "variant", score: 0.92 };
  }
  if (key.startsWith("q") && LEXICON["k" + key.slice(1)]) {
    return { urdu: LEXICON["k" + key.slice(1)], kind: "variant", score: 0.92 };
  }
  if (key.includes("zimedar")) {
    const alt = key.replace(/zimedar/g, "zimmedar");
    if (LEXICON[alt]) return { urdu: LEXICON[alt], kind: "variant", score: 0.92 };
  }
  if (key.includes("zimmedar")) {
    const alt = key.replace(/zimmedar/g, "zimedar");
    if (LEXICON[alt]) return { urdu: LEXICON[alt], kind: "variant", score: 0.9 };
  }

  const pk = phoneticKey(key);
  if (pk.length >= 3 && PHONETIC_INDEX.has(pk)) {
    const urdu = PHONETIC_INDEX.get(pk)!;
    if (!(PARTICLE_URDU.has(urdu) && key.length > 2 && !PARTICLE_KEYS.has(key))) {
      return { urdu, kind: "phonetic", score: 0.85 };
    }
  }

  if (key.length >= 5) {
    let best: { urdu: string; dist: number; klen: number } | null = null;
    for (const lk of LEXICON_KEYS) {
      if (PARTICLE_KEYS.has(lk)) continue;
      if (PARTICLE_URDU.has(LEXICON[lk])) continue;
      if (lk[0] !== key[0]) continue;
      if (Math.abs(lk.length - key.length) > 1) continue;
      const d = editDistance(key, lk, 1);
      if (d > 1) continue;
      const pDiff = Math.abs(phoneticKey(lk).length - pk.length);
      if (pk.length >= 2 && pDiff > 1) continue;
      if (!best || d < best.dist || (d === best.dist && lk.length > best.klen)) {
        best = { urdu: LEXICON[lk], dist: d, klen: lk.length };
      }
    }
    if (best) {
      return { urdu: best.urdu, kind: "fuzzy", score: best.dist === 1 ? 0.78 : 1 };
    }
  }

  return null;
}

export function lookupRomanUrduLexicon(token: string): string | null {
  return lookupRomanUrduLexiconDetailed(token)?.urdu ?? null;
}

export const ROMAN_URDU_LEXICON_SIZE = Object.keys(LEXICON).length;
