export type EShiaSourceExcerpt = {
  text: string;
  start: number;
  end: number;
  matchedTerms: readonly string[];
  startsAtBoundary: boolean;
  endsAtBoundary: boolean;
};

const ARABIC_MARKS = /[ً-ٰٟ]/u;
const BOUNDARY = /[.!؟!؛\n]/u;

function normalizedChar(value: string): string {
  if (ARABIC_MARKS.test(value)) return "";
  return value
    .normalize("NFKC")
    .replace(/[أإآ]/gu, "ا")
    .replace(/ى/gu, "ی")
    .replace(/ي/gu, "ی")
    .replace(/ك/gu, "ک")
    .toLowerCase();
}

function normalizedWithMap(value: string): {
  text: string;
  map: readonly number[];
} {
  let text = "";
  const map: number[] = [];

  for (let index = 0; index < value.length; index += 1) {
    const original = value[index];
    const normalized = normalizedChar(original);
    if (!normalized) continue;

    for (const char of normalized) {
      text += char;
      map.push(index);
    }
  }

  return { text, map };
}

function meaningfulTerms(query: string): readonly string[] {
  const normalized = query
    .normalize("NFKC")
    .replace(/[ً-ٰٟ]/gu, "")
    .replace(/[أإآ]/gu, "ا")
    .replace(/ى/gu, "ی")
    .replace(/ي/gu, "ی")
    .replace(/ك/gu, "ک")
    .toLowerCase();

  return Array.from(
    new Set(
      normalized
        .split(/[^p{L}p{N}]+/u)
        .map((item) => item.trim())
        .filter((item) => item.length >= 3),
    ),
  );
}

function previousBoundary(text: string, from: number, floor: number): number {
  for (let index = from; index >= floor; index -= 1) {
    if (BOUNDARY.test(text[index] ?? "")) return index + 1;
  }
  return floor;
}

function nextBoundary(text: string, from: number, ceiling: number): number {
  for (let index = from; index < ceiling; index += 1) {
    if (BOUNDARY.test(text[index] ?? "")) return index + 1;
  }
  return ceiling;
}

export function extractEShiaSourceExcerpt(
  sourceText: string,
  query: string,
  options: { maxChars?: number } = {},
): EShiaSourceExcerpt | null {
  const clean = sourceText.trim();
  if (!clean) return null;

  const maxChars = Math.max(160, Math.min(options.maxChars ?? 520, 900));
  const normalized = normalizedWithMap(sourceText);
  const terms = meaningfulTerms(query);
  if (!terms.length || !normalized.text) return null;

  const matches: Array<{ term: string; normalizedIndex: number }> = [];
  for (const term of terms) {
    let from = 0;
    while (from < normalized.text.length) {
      const index = normalized.text.indexOf(term, from);
      if (index < 0) break;
      matches.push({ term, normalizedIndex: index });
      from = index + Math.max(1, term.length);
      if (matches.length >= 30) break;
    }
    if (matches.length >= 30) break;
  }
  if (!matches.length) return null;

  const sourceIndexes = matches
    .map((match) => normalized.map[match.normalizedIndex])
    .filter((value): value is number => typeof value === "number")
    .sort((a, b) => a - b);
  if (!sourceIndexes.length) return null;

  // Prefer a window containing the densest cluster of query-term matches.
  let bestStartMatch = sourceIndexes[0];
  let bestCount = 1;
  for (const candidate of sourceIndexes) {
    const count = sourceIndexes.filter(
      (value) => value >= candidate && value <= candidate + maxChars,
    ).length;
    if (count > bestCount) {
      bestCount = count;
      bestStartMatch = candidate;
    }
  }

  const roughStart = Math.max(0, bestStartMatch - Math.floor(maxChars * 0.22));
  const roughEnd = Math.min(sourceText.length, roughStart + maxChars);
  let start = previousBoundary(
    sourceText,
    bestStartMatch,
    Math.max(0, roughStart),
  );
  let end = nextBoundary(
    sourceText,
    Math.min(sourceText.length - 1, bestStartMatch + Math.floor(maxChars * 0.55)),
    roughEnd,
  );

  if (end - start > maxChars) {
    end = start + maxChars;
  }
  if (end <= start) {
    start = roughStart;
    end = roughEnd;
  }

  while (start < end && /s/u.test(sourceText[start] ?? "")) start += 1;
  while (end > start && /s/u.test(sourceText[end - 1] ?? "")) end -= 1;

  const excerpt = sourceText.slice(start, end);
  if (!excerpt.trim()) return null;

  const excerptNorm = normalizedWithMap(excerpt).text;
  const matchedTerms = terms.filter((term) => excerptNorm.includes(term));

  return {
    text: excerpt,
    start,
    end,
    matchedTerms,
    startsAtBoundary:
      start === 0 || BOUNDARY.test(sourceText[Math.max(0, start - 1)] ?? ""),
    endsAtBoundary:
      end === sourceText.length || BOUNDARY.test(sourceText[end - 1] ?? ""),
  };
}
