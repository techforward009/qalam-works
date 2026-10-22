import type { BookCopyMode, BookReadingPage } from "./bookReaderModel";

export type ReaderFlowUnit = {
  key: string;
  kind: "original" | "translation";
  paragraphId: string;
  text: string;
  language: "ar" | "ur" | "en";
  translator?: string;
  source?: string;
};

/** Offsets are half-open JavaScript UTF-16 code-unit offsets into the immutable unit text. */
export type ReaderTextFragment = ReaderFlowUnit & {
  /** original = source paragraph; translation = its exact reviewed translation unit. */
  offsetsInto: "source-paragraph" | "reviewed-translation";
  startOffset: number;
  endOffset: number;
  text: string;
  unitStart: boolean;
  unitEnd: boolean;
};
export type ReaderVisualPage = ReaderTextFragment[];

export function graphemeBoundaries(text: string): number[] {
  if (typeof Intl.Segmenter !== "function") throw new Error("This browser does not support grapheme-safe reader pagination.");
  const boundaries = [0];
  for (const part of new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)) {
    const end = part.index + part.segment.length;
    if (end > boundaries[boundaries.length - 1]) boundaries.push(end);
  }
  return boundaries;
}

function preferTextBreak(text: string, start: number, fitEnd: number, boundaries: readonly number[]) {
  let preferred = fitEnd;
  for (const end of boundaries) {
    if (end <= start || end > fitEnd) continue;
    const last = [...text.slice(start, end)].at(-1) ?? "";
    if (/[\s\p{P}]/u.test(last)) preferred = end;
  }
  return preferred;
}

/**
 * Uses the caller's real DOM layout measurement as the only page-fit decision.
 * The paginator chooses candidate grapheme-safe ranges; it does not estimate
 * page capacity from character or word counts.
 */
export async function paginateMeasuredFlow(
  units: readonly ReaderFlowUnit[],
  fits: (fragments: readonly ReaderTextFragment[], pageIndex: number) => boolean,
): Promise<ReaderVisualPage[]> {
  const pages: ReaderVisualPage[] = [];
  let current: ReaderVisualPage = [];
  const pushPage = () => {
    if (current.length) pages.push(current);
    current = [];
  };

  for (const unit of units) {
    const boundaries = graphemeBoundaries(unit.text);
    let start = 0;
    while (start < unit.text.length) {
      const whole: ReaderTextFragment = { ...unit, startOffset: start, endOffset: unit.text.length,
        offsetsInto: unit.kind === "original" ? "source-paragraph" : "reviewed-translation",
        text: unit.text.slice(start), unitStart: start === 0, unitEnd: true };
      if (fits([...current, whole], pages.length)) {
        current.push(whole);
        break;
      }
      let low = boundaries.findIndex(n => n > start);
      if (low < 0) low = boundaries.length - 1;
      let high = boundaries.length - 1;
      let best = start;
      while (low <= high) {
        const mid = (low + high) >> 1;
        const end = boundaries[mid];
        if (end <= start) { low = mid + 1; continue; }
        const candidate: ReaderTextFragment = { ...unit, startOffset: start, endOffset: end,
          offsetsInto: unit.kind === "original" ? "source-paragraph" : "reviewed-translation",
          text: unit.text.slice(start, end), unitStart: start === 0, unitEnd: end === unit.text.length };
        if (fits([...current, candidate], pages.length)) { best = end; low = mid + 1; }
        else high = mid - 1;
      }
      if (best === start && current.length) {
        // No grapheme fits the remaining space. Retry on an empty page.
        pushPage();
        continue;
      }
      if (best === start) {
        // A single grapheme can only overflow when the available page itself is
        // smaller than that glyph. Preserve it visibly and let acceptance tests flag it.
        best = boundaries.find(n => n > start) ?? unit.text.length;
      } else {
        best = preferTextBreak(unit.text, start, best, boundaries);
      }
      const fragment: ReaderTextFragment = { ...unit, startOffset: start, endOffset: best,
        offsetsInto: unit.kind === "original" ? "source-paragraph" : "reviewed-translation",
        text: unit.text.slice(start, best), unitStart: start === 0, unitEnd: best === unit.text.length };
      current.push(fragment);
      start = best;
      if (start < unit.text.length) pushPage();
    }
  }
  pushPage();
  return pages.length ? pages : [[]];
}

export function reconstructUnit(fragments: readonly ReaderTextFragment[], key: string): string {
  return fragments.filter(fragment => fragment.key === key)
    .sort((a, b) => a.startOffset - b.startOffset)
    .map(fragment => fragment.text).join("");
}

/** Show the translated English prose only in English editions that contain
 * parallel Arabic source paragraphs. The verified source stays unchanged. */
export function shouldDisplayBookParagraph(language: "ar" | "ur" | "en", text: string): boolean {
  return language !== "en" || /[A-Za-z]/u.test(text);
}

export function readingFlowUnits(reading: BookReadingPage, mode: BookCopyMode): ReaderFlowUnit[] {
  const translationsByLastParagraph = new Map<string, typeof reading.translations>();
  for (const translation of reading.translations ?? []) {
    const last = translation.paragraphIds.at(-1);
    if (!last) continue;
    translationsByLastParagraph.set(last, [...(translationsByLastParagraph.get(last) ?? []), translation]);
  }
  const units: ReaderFlowUnit[] = [];
  for (const paragraph of reading.paragraphs) {
    if (mode !== "translation" && shouldDisplayBookParagraph(reading.language, paragraph.text)) units.push({ key: `original:${paragraph.id}`, kind: "original",
      paragraphId: paragraph.id, text: paragraph.text, language: reading.language });
    if (mode !== "original") {
      for (const [index, translation] of (translationsByLastParagraph.get(paragraph.id) ?? []).entries()) {
        units.push({ key: `translation:${paragraph.id}:${index}`, kind: "translation",
          paragraphId: paragraph.id, text: translation.text, language: translation.language,
          translator: translation.translator, source: translation.source });
      }
    }
  }
  return units;
}
