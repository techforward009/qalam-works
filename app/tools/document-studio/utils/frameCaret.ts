export interface FrameCaretEdges {
  left: number;
  right: number;
  center: number;
}

/** First strong character, using the same plaintext rule as the frame. */
function strongDirection(text: string): "ltr" | "rtl" | null {
  for (let i = 0; i < text.length;) {
    const code = text.codePointAt(i)!;
    if ((code >= 0x0590 && code <= 0x08ff) || (code >= 0xfb1d && code <= 0xfdff) || (code >= 0xfe70 && code <= 0xfeff)) return "rtl";
    if ((code >= 0x0041 && code <= 0x005a) || (code >= 0x0061 && code <= 0x007a) || (code >= 0x00c0 && code <= 0x02af) || (code >= 0x0370 && code <= 0x052f)) return "ltr";
    i += code > 0xffff ? 2 : 1;
  }
  return null;
}

function lineAt(value: string, index: number): { start: number; end: number } {
  const breakBefore = value.lastIndexOf("\n", Math.max(0, index - 1));
  const start = breakBefore < 0 ? 0 : breakBefore + 1;
  const breakAfter = value.indexOf("\n", index);
  return { start, end: breakAfter < 0 ? value.length : breakAfter };
}

/** An empty plaintext line continues the previous paragraph's script, then the frame direction. */
function emptyLineDirection(value: string, lineStart: number, elementDirection: "ltr" | "rtl"): "ltr" | "rtl" {
  let boundary = lineStart;
  while (boundary > 0) {
    const prevBreak = value.lastIndexOf("\n", boundary - 2);
    const prevStart = prevBreak < 0 ? 0 : prevBreak + 1;
    const direction = strongDirection(value.slice(prevStart, boundary - 1));
    if (direction) return direction;
    if (prevStart === 0) break;
    boundary = prevStart;
  }
  return elementDirection;
}

/**
 * Horizontal position of a caret on an empty frame line.
 * Returns null when that line already contains text, so the glyph rect stays in use.
 * Justify and full-justify have no gaps on an empty line, so the caret uses the
 * start edge of the line's direction. It is not centered and not forced to one side.
 */
export function emptyFrameCaretLeft(
  value: string,
  index: number,
  textAlign: string,
  elementDirection: "ltr" | "rtl",
  edges: FrameCaretEdges,
): number | null {
  const line = lineAt(value, index);
  if (line.end > line.start) return null;
  const direction = emptyLineDirection(value, line.start, elementDirection);
  const start = direction === "ltr" ? edges.left : edges.right;
  const end = direction === "ltr" ? edges.right : edges.left;
  if (textAlign === "center") return edges.center;
  if (textAlign === "left") return edges.left;
  if (textAlign === "right") return edges.right;
  if (textAlign === "end") return end;
  return start;
}
