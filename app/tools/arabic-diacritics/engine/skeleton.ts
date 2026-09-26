/** Vowels and the Indo-Pak dagger alef. Hamza marks stay, so الامر and الأمر remain distinct. */
const STRIP = /[\u064B-\u0652\u0670]/g;

const FOLD: Record<string, string> = {
  "\u06A9": "\u0643",
  "\u06CC": "\u064A",
  "\u0649": "\u064A",
  "\u06BE": "\u0647",
  "\u06C1": "\u0647",
  "\u06C3": "\u0629",
  "\u0623": "\u0627",
  "\u0625": "\u0627",
  "\u0622": "\u0627",
  "\u0671": "\u0627",
};

/** Letters that do not belong to the Arabic publishing orthography this tool vocalizes. */
const URDU_OR_PERSIAN_ONLY = /[\u0679\u067E\u0686\u0688\u0691\u0698\u06AF\u06BA\u06D2]/;

export function hasVowelMark(text: string): boolean {
  return /[\u064B-\u0652]/.test(text);
}

export function leaveAsUrduOrPersian(text: string): boolean {
  return URDU_OR_PERSIAN_ONLY.test(text);
}

export function skeleton(text: string): string {
  let out = "";
  for (const ch of text.replace(STRIP, "")) {
    const folded = FOLD[ch] ?? ch;
    const code = folded.codePointAt(0) ?? 0;
    if ((code >= 0x0621 && code <= 0x063a) || (code >= 0x0641 && code <= 0x064a) || code === 0x0629) {
      out += folded;
    } else if (code === 0x0654 || code === 0x0655) {
      out += folded;
    }
  }
  return out;
}
