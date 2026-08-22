/**
 * Roman Urdu normalization + productive formal morphology — Phase 19A.7
 */

const SPELLING_CANON: Record<string, string> = {
  sy: "se",
  say: "se",
  k: "ke",
  ky: "ke",
  mien: "mein",
  me: "mein",
  nhi: "nahi",
  nahin: "nahi",
  mujy: "mujhe",
  mje: "mujhe",
  smjh: "samajh",
  rha: "raha",
  rhi: "rahi",
  rhe: "rahe",
  krte: "karte",
  kia: "kiya",
  ap: "aap",
  tm: "tum",
  yr: "yaar",
  thora: "thoda",
  zrori: "zaroori",
  frq: "farq",
  pdta: "padta",
  hn: "hain",
  ghyr: "ghair",
  ghayr: "ghair",
  guftgo: "guftagu",
  chahye: "chahiye",
  chahyeh: "chahiye",
  daryafth: "daryaft",
  kanoon: "qanoon",
  kanooni: "qanooni",
  zimedari: "zimmedari",
  zimadari: "zimmedari",
  zimmedaar: "zimmedar",
  zimedar: "zimmedar",
  zimmedaarana: "zimmedarana",
  zimedarana: "zimmedarana",
  tankhwa: "tankhwah",
  tankha: "tankhwah",
  tankhwaah: "tankhwah",
  muaamlaat: "muamlaat",
  muaamla: "muamla",
  muashray: "muashray",
  muaashray: "muashray",
  muaashra: "muashra",
  nafsiati: "nafsiaati",
  nafsyati: "nafsiaati",
  riysat: "riyasat",
  riasat: "riyasat",
  adayegi: "adaiyagi",
  adaiagi: "adaiyagi",
  adaiygi: "adaiyagi",
  tasdik: "tasdeeq",
  mulaazmin: "mulaazmeen",
  mulazmeen: "mulaazmeen",
  mulazmin: "mulaazmeen",
  anjam: "anjaam",
  bighar: "bighaar",
  bigaar: "bighaar",
  shadid: "shadeed",
  jadid: "jadeed",
  guftgoo: "guftagu",
  bilataassub: "bilataassub",
  bilataasub: "bilataassub",
  amaldaramad: "amaldaramad",
  amaldarmad: "amaldaramad",
  pehli: "pehli",
  qawaneen: "qawaneen",
  qavanin: "qawaneen",
  mahana: "mahana",
  maahana: "mahana",
  toh: "to",
  tou: "to",
  touh: "to",
  balkay: "balke",
  balkeh: "balke",
  balkey: "balke",
  sakay: "sake",
  sakeh: "sake",
  jasakay: "ja sake",
  jaasakay: "ja sake",
  leysak: "le sak",
  leysakti: "le sakti",
  subayi: "subaii",
  subaai: "subaii",
  suba3i: "subaii",
  sub3i: "subaii",
  jaarihaana: "jarihana",
  jarihaana: "jarihana",
  jarihana: "jarihana",
  masley: "masle",
  maslay: "masle",
  qayim: "qaim",
  qaayim: "qaim",
  qaaim: "qaim",
  jaani: "jaani",
  jaana: "jaana",
  uthaya: "uthaya",
  uthaaya: "uthaya",
  filhaal: "fil haal",
  "fil-haal": "fil haal",
  "fal-haal": "fil haal",
  faalhaal: "fil haal",
  infleshan: "inflation",
  inflayshan: "inflation",
  departmint: "department",
  departement: "department",
  sakey: "sake",
  ley: "le",
  lae: "le",
  leysakta: "le sakta",
  subaee: "subaii",
  // 19A.18 short-form recovery
  bt: "baat",
  btao: "batao",
  btaya: "bataya",
  bta: "bata",
  pta: "pata",
  ptaa: "pata",
  tmhara: "tumhara",
  tumhara: "tumhara",
  tmhari: "tumhari",
  tmhary: "tumhare",
  smjha: "samjha",
  krna: "karna",
  krdiya: "kar diya",
  time: "waqt",
  bary: "bare",
  bari: "bari",
  bnao: "banao",
  bnaya: "banaya",
  khna: "khana",
  rhnaa: "rehna",
  chlo: "chalo",
  chalo: "chalo",
  agla: "agla",
  aisa: "aisa",
  aaisa: "aisa",
  aisy: "aise",
  pehlay: "pehle",
  pahle: "pehle",
  waghera: "waghaira",
  waghaira: "waghaira",
  yahan: "yahan",
  wahan: "wahan",
  whan: "wahan",
  karay: "kare",
  karaye: "kare",
  karey: "kare",
  marzii: "marzi",
  marzee: "marzi",
  marzay: "marzi",
  behtar: "behtar",
  behetar: "behtar",
  bihtar: "behtar",
  khudaa: "khuda",
  hal: "hal",
  halkar: "halkar",
  satah: "sath",
  wifaqi: "wifaqi",
  wifaaqy: "wifaqi",
  mutahidda: "muttahida",
  mutahida: "muttahida",
  "adalat-e-aliya": "adalat aliya",
  "adalat-e-ulya": "adalat aliya",
  "adalat-e-aliva": "adalat aliya",

};

const FORMAL_STEMS: [string, string][] = [
  ["zimmedarana", "ذمہ دارانہ"],
  ["zimmedari", "ذمہ داری"],
  ["zimmedar", "ذمہ دار"],
  ["nafsiaati", "نفسیاتی"],
  ["nafsiati", "نفسیاتی"],
  ["tankhwah", "تنخواہ"],
  ["qanooni", "قانونی"],
  ["qanoon", "قانون"],
  ["qawaneen", "قوانین"],
  ["muashray", "معاشرے"],
  ["muashra", "معاشرہ"],
  ["muamlaat", "معاملات"],
  ["muamla", "معاملہ"],
  ["taassub", "تعصب"],
  ["tassub", "تعصب"],
  ["daramad", "درآمد"],
  ["adaiyagi", "ادائیگی"],
  ["tasdeeq", "تصدیق"],
  ["mulaazmeen", "ملازمین"],
  ["riyasat", "ریاست"],
  ["guftagu", "گفتگو"],
  ["bighaar", "بگاڑ"],
  ["anjaam", "انجام"],
  ["shadeed", "شدید"],
  ["jadeed", "جدید"],
  ["falah", "فلاح"],
  ["behbood", "بہبود"],
  ["ghair", "غیر"],
  ["bilaa", "بلا"],
  ["bila", "بلا"],
  ["amal", "عمل"],
  ["naazuk", "نازک"],
  ["paida", "پیدا"],
  ["daur", "دور"],
  ["bank", "بینک"],
  ["account", "اکاؤنٹ"],
  ["pension", "پینشن"],
  ["social", "سوشل"],
  ["media", "میڈیا"],
  ["karwana", "کروانا"],
  ["nihayat", "نہایت"],
  ["zaroori", "ضروری"],
  ["zaruri", "ضروری"],
  ["pehli", "پہلی"],
  ["aawam", "عوام"],
  ["awam", "عوام"],
  ["tayyar", "تیار"],
  ["kiye", "کیے"],
  ["gaye", "گئے"],
  ["mahana", "ماہانہ"],
  ["jarihana", "جارحانہ"],
  ["jaarihaana", "جارحانہ"],
  ["masle", "مسئلے"],
  ["balke", "بلکہ"],
  ["subaii", "صوبائی"],
  ["subai", "صوبائی"],
  ["adalat", "عدالت"],
  ["qaim", "قائم"],
  ["uthaya", "اٹھایا"],
  ["jaani", "جانی"],
  ["sake", "سکے"],
  ["kare", "کرے"],
  ["tor", "طور"],
  ["taur", "طور"],
  ["bacha", "بچا"],
  ["karein", "کریں"],
  ["karo", "کرو"],
  ["khuda", "خدا"],
  ["marzi", "مرضی"],
  ["behtar", "بہتر"],
  ["hal", "حل"],
  ["sulah", "صلح"],
  ["qaaim", "قائم"],
  ["sakti", "سکتی"],
  ["sakte", "سکتے"],
  ["chalay", "چلے"],
  ["inflation", "انفلیشن"],
  ["department", "ڈیپارٹمنٹ"],
  ["satah", "سطح"],
  ["sath", "سطح"],
  ["wifaqi", "وفاقی"],
  ["muttahida", "متحدہ"],
  ["adalat aliya", "عدالتِ عالیہ"],
  ["adalat", "عدالت"],
  ["aliya", "عالیہ"],
  // ── Izafat chain components (Phase 19A.18) ─────────────────────────────────
  ["haq", "حق"],
  ["tanqeed", "تنقید"],
  ["tanqid", "تنقید"],
  ["raaye", "رائے"],
  ["raai", "رائے"],
  ["raai", "رائے"],
  ["aazaadi", "آزادی"],
  ["azaadi", "آزادی"],
  ["izhaar", "اظہار"],
  ["ikhtilaaf", "اختلاف"],
  ["mustaqbil", "مستقبل"],
  ["qareeb", "قریب"],
  ["ijtimaa", "اجتماع"],
  ["falah", "فلاح"],
  ["behbood", "بہبود"],
  ["hikmat", "حکمت"],
  ["ilm", "علم"],
  ["ism", "اسم"],
  ["maani", "معانی"],
  ["naqd", "نقد"],
  ["nazar", "نظر"],
  ["amaan", "امان"],
  ["tanweeq", "تنظیم"],   // organizational coordination (not ترویج)
  ["zawaal", "زوال"],
  ["zumra", "زمرہ"],
  ["zumray", "زمرے"],
  ["sareehan", "صریحاً"],
  ["pukhta", "پختہ"],
  ["pukhtagii", "پختگی"],
  // ── Apostrophe/ain cluster recovery (Phase 19A.19) ────────────────────────
  // These are the ain-encoded forms produced by encodeAinApostrophes.
  // Format: encoded_roman → correct Urdu
  ["ba3is",      "باعث"],    // baa'is → باعث (cause/reason)
  ["baa3is",     "باعث"],
  ["baais",      "باعث"],
  ["ijtim3ai",   "اجتماعی"], // ijtima'ai → اجتماعی (social/collective adj.)
  ["ijtima3i",   "اجتماعی"],
  ["sho3or",     "شعور"],    // sho'oor → شعور (consciousness)
  ["shu3or",     "شعور"],
  ["sho3oor",    "شعور"],
  ["shu3oor",    "شعور"],
  ["m3ani",      "معانی"],   // ma'ani → معانی (meanings)
  ["ma3ani",     "معانی"],
  ["mu3ashra",   "معاشرہ"],  // mu'aashra → معاشرہ (society)
  ["mu3ashray",  "معاشرے"],  // mu'aashray → معاشرے (of society)
  ["mu3ashrati", "معاشرتی"], // mu'aashrati → معاشرتی (societal adj.)
  ["mu3ashi",    "معاشی"],   // mu'aashi → معاشی (economic)
  ["in3am",      "انعام"],   // in'aam → انعام (reward/prize)
  ["in3aam",     "انعام"],
  ["ja3iz",      "جائز"],    // jaa'iz → جائز (permissible)
  ["jaa3iz",     "جائز"],
  ["t3assub",    "تعصب"],    // ta'assub → تعصب (bigotry) — already works via V2
  ["ta3assub",   "تعصب"],


];

FORMAL_STEMS.sort((a, b) => b[0].length - a[0].length);

export function encodeAinApostrophes(roman: string): string {
  let s = roman;
  s = s.replace(/ua'aa/gi, "u3a");
  s = s.replace(/u'aa/gi, "u3a");
  s = s.replace(/a'aa/gi, "3a");
  s = s.replace(/i'aa/gi, "i3a");
  s = s.replace(/a'a/gi, "3a");
  s = s.replace(/u'a/gi, "u3a");
  s = s.replace(/i'a/gi, "i3a");
  s = s.replace(/a'i/gi, "3i");
  s = s.replace(/a'/gi, "3");
  // ── Phase 19A.19 additions ────────────────────────────────────────────────
  // o'o pattern: sho'oor → sho3or (shعoor → شعور)
  s = s.replace(/o'oo/gi, "o3o");
  s = s.replace(/o'o/gi,  "o3o");
  s = s.replace(/u'oo/gi, "u3o");
  s = s.replace(/u'o/gi,  "u3o");
  // n'a pattern: in'aam → in3aam (انعام)
  s = s.replace(/n'aa/gi, "n3a");
  s = s.replace(/n'a/gi,  "n3a");
  // m'a pattern: im'aa → im3a
  s = s.replace(/m'aa/gi, "m3a");
  s = s.replace(/m'a/gi,  "m3a");
  // ─────────────────────────────────────────────────────────────────────────
  s = s.replace(/'/g, "");
  return s;
}

function collapseExcessRepeats(s: string): string {
  return s.replace(/(.)\1{2,}/g, "$1");
}

export function normalizeRomanUrduToken(token: string): string {
  if (!token) return token;
  let t = token.trim();
  if (/^https?:\/\//i.test(t) || /@/.test(t)) return token;
  t = encodeAinApostrophes(t);
  t = t.toLowerCase();
  t = collapseExcessRepeats(t);
  t = t.replace(/[^a-z0-9\-3]/g, "");
  if (SPELLING_CANON[t]) t = SPELLING_CANON[t];
  return t;
}

export function romanNormalizationCandidates(token: string): string[] {
  const primary = normalizeRomanUrduToken(token);
  const alts = new Set<string>();
  if (primary) alts.add(primary);
  const noAin = primary.replace(/3/g, "");
  if (noAin && noAin !== primary) alts.add(noAin);
  if (primary.startsWith("k") && primary.length > 3) alts.add("q" + primary.slice(1));
  if (primary.startsWith("q")) alts.add("k" + primary.slice(1));
  if (primary.includes("zimedar")) alts.add(primary.replace(/zimedar/g, "zimmedar"));
  if (primary.includes("zimmedar")) alts.add(primary.replace(/zimmedar/g, "zimedar"));
  return [...alts];
}

export function formalStemConvert(token: string): string | null {
  const n = normalizeRomanUrduToken(token).replace(/3/g, "").replace(/-/g, "");
  if (!n || n.length < 3) return null;
  for (const [stem, urdu] of FORMAL_STEMS) {
    if (n === stem) return urdu;
    if (n.startsWith(stem)) {
      const rest = n.slice(stem.length);
      if (!rest) return urdu;
      if (stem.length >= 8) continue;
      const suf = mapSuffix(rest);
      if (suf !== null) return urdu + suf;
    }
  }
  return null;
}

function mapSuffix(rest: string): string | null {
  if (!rest) return "";
  if (/^(iaati|iati|yati)$/.test(rest)) return "یاتی";
  if (/^(aat|at)$/.test(rest)) return "ات";
  if (/^(ana|aanah)$/.test(rest)) return "انہ";
  if (/^(ay|ey|e)$/.test(rest)) return "ے";
  if (/^(i|ee|y)$/.test(rest)) return "ی";
  if (/^(a|ah)$/.test(rest)) return "ہ";
  if (/^(oon|un)$/.test(rest)) return "وں";
  return null;
}

export function morphologyFitScore(roman: string, urdu: string): number {
  if (!roman || !urdu) return 0;
  let score = 0;
  const r = roman.toLowerCase().replace(/3/g, "");
  if (/i$|ee$|y$/.test(r) && urdu.endsWith("ی")) score += 3;
  if (/i$|ee$/.test(r) && urdu.endsWith("ا")) score -= 2;
  if (/iaati$|iati$|yati$/.test(r) && urdu.includes("یاتی")) score += 5;
  if (/iaati$|iati$/.test(r) && urdu.includes("آتا")) score -= 4;
  if (/ana$|aanah$/.test(r) && (urdu.endsWith("انہ") || urdu.endsWith("انا"))) score += 3;
  if (/(ay|ey|e)$/.test(r) && urdu.endsWith("ے")) score += 2;
  if (r.includes("q") && urdu.includes("ق")) score += 2;
  if (r.startsWith("q") && urdu.startsWith("ک")) score -= 2;
  if (roman.includes("3") && urdu.includes("ع")) score += 4;
  if (roman.includes("3") && !urdu.includes("ع")) score -= 5;
  if (r.startsWith("ghair") && urdu.startsWith("غیر")) score += 4;
  if (/tankh/.test(r) && urdu.includes("تنخواہ")) score += 5;
  if (/tankh/.test(r) && urdu.startsWith("تان")) score -= 3;
  if (/nafs/.test(r) && urdu.startsWith("نفس")) score += 4;
  if (/nafs/.test(r) && urdu.startsWith("ناف")) score -= 3;
  if (/muashr|muaashr|mu3aashr/.test(roman.toLowerCase()) && urdu.includes("معاشر")) score += 5;
  if (/muaml|mu3aaml/.test(roman.toLowerCase()) && urdu.includes("معامل")) score += 5;
  return score;
}

export { phoneticKey } from "./romanUrduLexicon";
