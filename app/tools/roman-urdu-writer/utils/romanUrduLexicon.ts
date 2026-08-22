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
  h: "ہے",
  nahi: "نہیں",
  mujhe: "مجھے",
  aap: "آپ",
  tum: "تم",
  yaar: "یار",
  samajh: "سمجھ",
  raha: "رہا",
  rahi: "رہی",
  rahe: "رہے",
  karte: "کرتے",
  kiya: "کیا",
  gaya: "گیا",
  thoda: "تھوڑا",
  farq: "فرق",
  padta: "پڑتا",
  kya: "کیا",
  haal: "حال",
  kahan: "کہاں",
  kehna: "کہنا",
  abhi: "ابھی",
  tak: "تک",
  theek: "ٹھیک",
  phir: "پھر",
  baat: "بات",
  subah: "صبح",
  subai: "صوبائی",
  subaii: "صوبائی",
  subayi: "صوبائی",
  kare: "کرے",
  karay: "کرے",
  tor: "طور",
  taur: "طور",
  bacha: "بچا",
  bachao: "بچاؤ",
  karey: "کرے",
  karo: "کرو",
  khuda: "خدا",
  khudaa: "خدا",
  marzi: "مرضی",
  marzii: "مرضی",
  marzee: "مرضی",
  behtar: "بہتر",
  behetar: "بہتر",
  kam: "کم",
  hal: "حل",
  aaj: "آج",
  kal: "کل",
  milna: "ملنا",
  detail: "تفصیل",
  reply: "جواب",
  wait: "انتظار",
  scene: "سین",

  // ── 19A.18 Formal register ──────────────────────────────────────────────
  mahkama: "محکمہ",
  mahkamah: "محکمہ",
  dastaveez: "دستاویز",
  dastavez: "دستاویز",
  intizaar: "انتظار",
  intizar: "انتظار",
  farmaan: "فرمان",
  farmaein: "فرمائیں",
  farmaaein: "فرمائیں",
  waqiyaat: "واقعات",
  waqia: "واقعہ",
  tashreeh: "تشریح",
  mutabiq: "مطابق",
  muwafiq: "موافق",
  kirdeh: "کردہ",
  mulaahiza: "ملاحظہ",
  mulaheeza: "ملاحظہ",
  sahih: "صحیح",
  bayan: "بیان",
  bayaan: "بیان",
  lazim: "لازم",
  laazim: "لازم",
  nifaz: "نفاذ",
  nafiz: "نافذ",
  nafa: "نافذ",
  mohtamim: "مہتمم",
  muhtamim: "مہتمم",
  ijtima: "اجتماع",
  haazir: "حاضر",
  jawabdeh: "جوابدہ",
  janab: "جناب",
  maharbani: "مہربانی",
  meharbani: "مہربانی",
  darkhwast: "درخواست",
  darkhwaast: "درخواست",
  tahreer: "تحریر",
  tehreer: "تحریر",
  tajziya: "تجزیہ",
  tahqeeq: "تحقیق",
  muqarrar: "مقررہ",
  muqarrara: "مقررہ",
  muddat: "مدت",
  ittala: "اطلاع",
  saza: "سزا",
  qabil: "قابل",
  afrad: "افراد",
  taraf: "طرف",
  awamul: "عوام",
  sarkari: "سرکاری",
  aspatal: "ہسپتال",
  warzi: "ورزی",
  yakeenan: "یقیناً",
  yaqeenan: "یقیناً",
  rujuu: "رجوع",
  ruju: "رجوع",
  tafseel: "تفصیل",
  wala: "والا",
  website: "ویب سائٹ",
  foran: "فوراً",

  // ── 19A.18 Academic / religious ─────────────────────────────────────────
  saqaafat: "ثقافت",
  saqafat: "ثقافت",
  ehamiyat: "اہمیت",
  ahmiyat: "اہمیت",
  ulama: "علما",
  maqala: "مقالہ",
  maqaala: "مقالہ",
  raahnumai: "رہنمائی",
  rahnumai: "رہنمائی",
  sanad: "سند",
  yafta: "یافتہ",
  ustaad: "استاد",
  ustaz: "استاد",
  taleem: "تعلیم",
  talem: "تعلیم",
  roshan: "روشن",
  falsafa: "فلسفہ",
  falasfa: "فلسفہ",
  nazriya: "نظریہ",
  nazariya: "نظریہ",
  mutalea: "مطالعہ",
  mutala: "مطالعہ",
  tarikh: "تاریخ",
  ahem: "اہم",
  mashriqi: "مشرقی",
  fatwa: "فتویٰ",
  jaari: "جاری",
  bismillah: "بسم اللہ",
  alhamdulillah: "الحمدللہ",
  inshallah: "انشاءاللہ",
  quran: "قرآن",

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

const PHONETIC_INDEX: Map<string, Array<{ rk: string; urdu: string }>> = (() => {
  const map = new Map<string, Array<{ rk: string; urdu: string }>>();
  for (const k of LEXICON_KEYS) {
    const pk = phoneticKey(k);
    if (pk.length < 2) continue;
    const arr = map.get(pk) || [];
    arr.push({ rk: k, urdu: LEXICON[k] });
    map.set(pk, arr);
  }
  return map;
})();

function bestPhoneticHit(key: string, pk: string): string | null {
  const arr = PHONETIC_INDEX.get(pk);
  if (!arr || !arr.length) return null;
  if (arr.length === 1) return arr[0].urdu;
  let best: { urdu: string; d: number; len: number } | null = null;
  for (const { rk, urdu } of arr) {
    const d = editDistance(key, rk, 3);
    if (!best || d < best.d || (d === best.d && rk.length > best.len)) {
      best = { urdu, d, len: rk.length };
    }
  }
  return best?.urdu ?? null;
}

const CHAT_ALIAS: Record<string, string> = {
  nhi: "nahi", nahin: "nahi", mujy: "mujhe", mje: "mujhe", smjh: "samajh",
  rha: "raha", rhi: "rahi", rhe: "rahe", krte: "karte", kia: "kiya",
  ap: "aap", tm: "tum", yr: "yaar", thora: "thoda", zrori: "zaroori",
  frq: "farq", pdta: "padta", hn: "hain",
};

export function lookupRomanUrduLexiconDetailed(token: string): LexiconMatch | null {
  if (!token || token.length < 1) return null;
  let key = lexiconKey(token);
  if (!key) return null;
  if (CHAT_ALIAS[key]) key = CHAT_ALIAS[key];

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
    const urdu = bestPhoneticHit(key, pk);
    if (urdu && !(PARTICLE_URDU.has(urdu) && key.length > 2 && !PARTICLE_KEYS.has(key))) {
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
