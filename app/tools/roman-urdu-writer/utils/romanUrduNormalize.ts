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
  s = s.replace(/a'/gi, "3");
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
