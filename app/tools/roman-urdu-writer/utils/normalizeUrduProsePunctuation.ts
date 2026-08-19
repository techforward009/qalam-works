/**
 * Presentation-only Urdu prose punctuation normalization for Qalam Urdu Writer.
 */
const PROTECTED =
  /https?:\/\/[^\s]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|(?:www\.)?[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+|[A-Za-z0-9._-]+\.(?:pdf|docx?|xlsx?|pptx?|mp4|png|jpe?g|gif|txt|csv|zip)|@[\w.]+|#[\w\u0600-\u06FF]+|\d[\d,]*\.?\d*/g;

const ARABIC = /[\u0600-\u06FF]/;
const LATIN = /[A-Za-z]/;

function isProtectedSpan(text: string, index: number): boolean {
  PROTECTED.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PROTECTED.exec(text))) {
    if (index >= m.index && index < m.index + m[0].length) return true;
    if (m.index > index) break;
  }
  return false;
}

function prevSignificant(text: string, i: number): string {
  for (let j = i - 1; j >= 0; j--) {
    if (/\s/.test(text[j])) continue;
    return text[j];
  }
  return "";
}

function nextSignificant(text: string, i: number): string {
  for (let j = i + 1; j < text.length; j++) {
    if (/\s/.test(text[j])) continue;
    return text[j];
  }
  return "";
}

function leftScriptContext(text: string, i: number): "urdu" | "latin" | "none" {
  let sawUrdu = false;
  let sawLatin = false;
  for (let j = i - 1; j >= 0; j--) {
    const ch = text[j];
    if (ch === "\n") break;
    if (ARABIC.test(ch)) {
      sawUrdu = true;
      if (!sawLatin) return "urdu";
    }
    if (LATIN.test(ch)) sawLatin = true;
  }
  if (sawUrdu) return "urdu";
  if (sawLatin) return "latin";
  return "none";
}

function shouldConvertComma(text: string, i: number): boolean {
  const prev = prevSignificant(text, i);
  const next = nextSignificant(text, i);
  if (/\d/.test(prev) && /\d/.test(next)) return false;
  if (LATIN.test(prev)) return false;
  if (ARABIC.test(prev) || ARABIC.test(next)) return true;
  if (leftScriptContext(text, i) === "urdu") return true;
  return false;
}

function shouldConvertSemicolon(text: string, i: number): boolean {
  return ARABIC.test(prevSignificant(text, i)) || leftScriptContext(text, i) === "urdu";
}

function shouldConvertQuestion(text: string, i: number): boolean {
  const prev = prevSignificant(text, i);
  if (ARABIC.test(prev)) return true;
  if (LATIN.test(prev)) return false;
  return false;
}

function shouldConvertPeriod(text: string, i: number): boolean {
  const prev = prevSignificant(text, i);
  const next = nextSignificant(text, i);
  if (/\d/.test(prev) && /\d/.test(next)) return false;
  if (/\d/.test(prev) && !ARABIC.test(next) && leftScriptContext(text, i) === "latin") return false;
  if (ARABIC.test(prev)) return true;
  if (leftScriptContext(text, i) === "urdu") return true;
  return false;
}

export function normalizeUrduProsePunctuation(text: string): string {
  if (!text) return text;
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (isProtectedSpan(text, i)) { out += ch; continue; }
    if (ch === "," && shouldConvertComma(text, i)) { out += "،"; continue; }
    if (ch === ";" && shouldConvertSemicolon(text, i)) { out += "؛"; continue; }
    if (ch === "?" && shouldConvertQuestion(text, i)) { out += "؟"; continue; }
    if (ch === "." && shouldConvertPeriod(text, i)) { out += "۔"; continue; }
    out += ch;
  }
  return out;
}
