/**
 * Urdu Writer — Currency and BiDi presentation utilities
 * Phase 19A.13
 *
 * SCOPE: display/presentation layer only.
 * - transformPKRAmount: converts explicit RS./Rs./PKR amounts in-place
 * - renderUrduOutputWithBidi: wraps LTR islands (numbers, dates) in <bdi dir="ltr">
 *   for correct visual display in RTL context WITHOUT altering exported text
 *
 * Rules:
 *   RS. / Rs. / rs. followed by a number → Urdu words + روپے
 *   PKR followed by a number             → same
 *   Plain numbers, %, dates, URLs, emails, phones → NEVER touched
 *
 * Lakh/crore conventions:
 *   1,00,000 = 1 lakh
 *   1,00,00,000 = 1 crore
 *   This function handles plain comma or no-comma digit strings only;
 *   structured Indian notation is normalized in parsing.
 */

// ── Number-word conversion (Urdu, lakh/crore system) ─────────────────────────

const ONES: string[] = [
  "", "ایک", "دو", "تین", "چار", "پانچ", "چھ", "سات", "آٹھ", "نو",
  "دس", "گیارہ", "بارہ", "تیرہ", "چودہ", "پندرہ", "سولہ", "سترہ", "اٹھارہ", "انیس",
  "بیس",
];

const TENS: string[] = [
  "", "", "بیس", "تیس", "چالیس", "پچاس", "ساٹھ", "ستر", "اسی", "نوے",
];

// Pakistani Urdu numbers 21–99 use irregular compound forms (not compositional)
const TWO_DIGIT: Record<number, string> = {
  21:"اکیس",22:"بائیس",23:"تئیس",24:"چوبیس",25:"پچیس",26:"چھبیس",27:"ستائیس",28:"اٹھائیس",29:"انتیس",
  31:"اکتیس",32:"بتیس",33:"تینتیس",34:"چونتیس",35:"پینتیس",36:"چھتیس",37:"سینتیس",38:"اڑتیس",39:"انتالیس",
  41:"اکتالیس",42:"بیالیس",43:"تینتالیس",44:"چوالیس",45:"پینتالیس",46:"چھیالیس",47:"سینتالیس",48:"اڑتالیس",49:"انچاس",
  51:"اکیاون",52:"باون",53:"تریپن",54:"چون",55:"پچپن",56:"چھپن",57:"ستاون",58:"اٹھاون",59:"انسٹھ",
  61:"اکسٹھ",62:"باسٹھ",63:"تریسٹھ",64:"چوسٹھ",65:"پینسٹھ",66:"چھیاسٹھ",67:"سڑسٹھ",68:"اڑسٹھ",69:"انھتر",
  71:"اکہتر",72:"بہتر",73:"تہتر",74:"چوہتر",75:"پچھتر",76:"چھہتر",77:"ستتر",78:"اٹھہتر",79:"انیاسی",
  81:"اکاسی",82:"بیاسی",83:"تراسی",84:"چوراسی",85:"پچاسی",86:"چھیاسی",87:"ستاسی",88:"اٹھاسی",89:"نواسی",
  91:"اکانوے",92:"بانوے",93:"ترانوے",94:"چورانوے",95:"پچانوے",96:"چھیانوے",97:"ستانوے",98:"اٹھانوے",99:"ننانوے",
};

function twoDigit(n: number): string {
  if (n === 0) return "";
  if (n <= 20) return ONES[n];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  if (ones === 0) return TENS[tens];
  return TWO_DIGIT[n] ?? (ONES[ones] + " " + TENS[tens]);
}

function threeDigit(n: number): string {
  const h = Math.floor(n / 100);
  const rem = n % 100;
  const hundreds = h > 0 ? ONES[h] + " سو" : "";
  const rest = rem > 0 ? twoDigit(rem) : "";
  return [hundreds, rest].filter(Boolean).join(" ");
}

/**
 * Convert a plain integer to Urdu words using lakh/crore conventions.
 * Handles up to 9,99,99,999 (10 crore minus 1).
 */
export function toUrduWords(amount: number): string {
  if (amount === 0) return "صفر";
  const parts: string[] = [];

  const crore = Math.floor(amount / 10_000_000);
  amount -= crore * 10_000_000;
  if (crore > 0) parts.push(threeDigit(crore) + " کروڑ");

  const lakh = Math.floor(amount / 100_000);
  amount -= lakh * 100_000;
  if (lakh > 0) parts.push(threeDigit(lakh) + " لاکھ");

  const thousand = Math.floor(amount / 1_000);
  amount -= thousand * 1_000;
  if (thousand > 0) parts.push(twoDigit(thousand) + " ہزار");

  const hundred = Math.floor(amount / 100);
  amount -= hundred * 100;
  if (hundred > 0) parts.push(ONES[hundred] + " سو");

  if (amount > 0) parts.push(twoDigit(amount));

  return parts.join(" ");
}

// ── Currency detection and transformation ─────────────────────────────────────

/**
 * Pattern: RS. / Rs. / rs. / PKR optionally followed by space and a number
 * (with optional commas, e.g. 75,000 or 1,250 or 250,000).
 * Captures: marker and digits.
 *
 * Does NOT match:
 *   - plain numbers without a currency marker
 *   - percentages, dates, phone numbers, codes
 */
const PKR_RE =
  /\b(?:RS\.|Rs\.|rs\.|PKR)\s*([\d,]+(?:\.\d+)?)/g;

/**
 * Transforms explicit Pakistani rupee amounts in a string to Urdu prose.
 * All other content is unchanged.
 *
 * RS. 75,000   →  75,000 (پچھتر ہزار) روپے
 * PKR 250,000  →  250,000 (دو لاکھ پچاس ہزار) روپے
 */
export function transformPKRAmount(text: string): string {
  return text.replace(PKR_RE, (_match, numStr: string) => {
    // Strip commas to get integer value
    const intStr = numStr.replace(/,/g, "").split(".")[0];
    const value = parseInt(intStr, 10);
    if (isNaN(value)) return _match; // safety: leave unchanged

    const words = toUrduWords(value);
    // Preserve original digit formatting (with commas) from source
    const formatted = numStr.includes(".") ? numStr.split(".")[0].replace(/,/g, ",") : numStr;
    return `${formatted} (${words}) روپے`;
  });
}

// ── Bidi-safe patterns ────────────────────────────────────────────────────────

/**
 * Patterns that should be wrapped in <bdi dir="ltr"> when rendered in RTL.
 * These are DISPLAY-ONLY — exported text is never wrapped.
 *
 * Matches:
 *   2025-26     (year ranges)
 *   2025/26     (year ranges slash form)
 *   15%         (percentages)
 *   75,000      (numbers with commas)
 *   3.14        (decimals)
 *   1,250.00    (numbers with both)
 *   Standalone integer sequences that might flip
 *
 * Does NOT match:
 *   Urdu words (U+0600–U+06FF)
 *   URLs/emails (handled by protection layer)
 */
const LTR_ISLAND_RE =
  /(\d[\d,]*(?:\.\d+)?(?:[-/]\d+)*%?|\b\d+(?:[-/]\d+)+)/g;

export type BidiSegment =
  | { kind: "text"; text: string }
  | { kind: "ltr"; text: string };

/**
 * Split a string into alternating Urdu text and LTR-island segments.
 * The caller renders ltr segments as <bdi dir="ltr">.
 */
export function splitBidiSegments(text: string): BidiSegment[] {
  const segments: BidiSegment[] = [];
  let last = 0;

  for (const m of text.matchAll(LTR_ISLAND_RE)) {
    const start = m.index!;
    const end = start + m[0].length;
    if (start > last) segments.push({ kind: "text", text: text.slice(last, start) });
    segments.push({ kind: "ltr", text: m[0] });
    last = end;
  }
  if (last < text.length) segments.push({ kind: "text", text: text.slice(last) });
  return segments;
}
