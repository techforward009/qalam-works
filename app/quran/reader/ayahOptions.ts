/** Clipboard text for "Copy with reference (S:A)". The ayah text itself is unchanged. */
export function ayahReferenceCopy(text: string, surah: number, ayah: number): string {
  return text + " (" + surah + ":" + ayah + ")";
}

/** Keep a small menu inside the viewport, preferring below the marker. */
export function popoverOrigin(
  anchor: { left: number; top: number; bottom: number },
  viewport: { width: number; height: number },
  menu: { width: number; height: number },
  margin = 8,
): { left: number; top: number } {
  let left = anchor.left;
  let top = anchor.bottom + 4;
  if (left + menu.width > viewport.width - margin) left = viewport.width - margin - menu.width;
  if (left < margin) left = margin;
  if (top + menu.height > viewport.height - margin) top = anchor.top - menu.height - 4;
  if (top < margin) top = margin;
  return { left, top };
}

const TRAILING_AYAH_MARK = /(\u06dd[\u0660-\u0669\u06f0-\u06f9]*[\u06d6-\u06ed\u08d3-\u08ff]*)\s*$/u;

/** Ahmed stores the end marker in the verse. Split it so the same glyphs can be the options button. */
export function splitTrailingAyahMark(text: string): { body: string; marker: string | null } {
  const match = TRAILING_AYAH_MARK.exec(text);
  if (!match || match.index === undefined) return { body: text, marker: null };
  return { body: text.slice(0, match.index), marker: match[1] };
}

/** Last word stays with the end marker. Trailing spaces do not swallow the whole line. */
export function splitLastWord(text: string): { prefix: string; last: string } {
  const match = /^(.*?)([^\s]+)\s*$/su.exec(text);
  return match ? { prefix: match[1], last: match[2] } : { prefix: "", last: text };
}

/** Roving index for the two-item ayah menu. A missing focus (-1) lands on the first item. */
export function nextMenuIndex(current: number, count: number, key: "ArrowDown" | "ArrowUp"): number {
  if (count <= 0) return 0;
  const delta = key === "ArrowDown" ? 1 : -1;
  const index = current < 0 ? (delta > 0 ? -1 : 0) : current;
  return (index + delta + count) % count;
}
