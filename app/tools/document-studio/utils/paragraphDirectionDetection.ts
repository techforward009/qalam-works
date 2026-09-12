/** Strong-script evidence, capped per word so long technical terms cannot dominate. */
export function detectParagraphDirection(text: string, fallback: "rtl" | "ltr" = "rtl"): "rtl" | "ltr" {
  const prose = text.replace(/(?:https?:\/\/|www\.)\S+|[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, " ");
  let rtl = 0;
  let ltr = 0;
  for (const word of prose.match(/[\p{Letter}\p{Mark}]+/gu) ?? []) {
    let wordRtl = 0;
    let wordLtr = 0;
    for (const letter of word) {
      if (!/\p{Letter}/u.test(letter)) continue;
      if (/[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Syriac}\p{Script=Thaana}]/u.test(letter)) wordRtl++;
      else if (/\p{Script=Latin}/u.test(letter)) wordLtr++;
    }
    rtl += Math.min(wordRtl, 4);
    ltr += Math.min(wordLtr, 4);
  }
  // A URL/email alone remains LTR; numbers, punctuation and empty text retain direction.
  if (rtl === 0 && ltr === 0 && prose !== text) return "ltr";
  return rtl === ltr ? fallback : rtl > ltr ? "rtl" : "ltr";
}
