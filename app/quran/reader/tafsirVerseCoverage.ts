/** Link-only coverage; verse-specific paragraph attribution requires editorial review. */
export type TafsirCoverageGroup = { sourceKey: string; verses: string[] };
export type TafsirVerseRange = { surah: number; first: number; last: number };

function parseKey(key: string): { surah: number; ayah: number } | null {
  const parts = key.split(":");
  if (parts.length !== 2 || !parts.every(part => /^[0-9]+$/.test(part))) return null;
  const surah = Number(parts[0]), ayah = Number(parts[1]);
  return surah >= 1 && surah <= 114 && ayah >= 1 && ayah <= 286 ? { surah, ayah } : null;
}

export function indexTafsirCoverage(verses: Readonly<Record<string, { refs: readonly string[] }>>): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const [verse, record] of Object.entries(verses)) {
    if (!parseKey(verse)) continue;
    for (const sourceKey of new Set(record.refs)) {
      const keys = index.get(sourceKey) ?? [];
      keys.push(verse);
      index.set(sourceKey, keys);
    }
  }
  for (const keys of index.values()) keys.sort((a, b) => {
    const x = parseKey(a)!, y = parseKey(b)!;
    return x.surah - y.surah || x.ayah - y.ayah;
  });
  return index;
}

export function tafsirCoverageForRefs(refs: readonly string[], index: ReadonlyMap<string, readonly string[]>): TafsirCoverageGroup[] {
  return [...new Set(refs)].map(sourceKey => ({ sourceKey, verses: [...(index.get(sourceKey) ?? [])] }));
}

export function tafsirCoverageRanges(keys: readonly string[]): TafsirVerseRange[] {
  const sorted = [...new Set(keys)].map(parseKey)
    .filter((part): part is { surah: number; ayah: number } => Boolean(part))
    .sort((a, b) => a.surah - b.surah || a.ayah - b.ayah);
  const ranges: TafsirVerseRange[] = [];
  for (const verse of sorted) {
    const prev = ranges[ranges.length - 1];
    if (prev && prev.surah === verse.surah && prev.last + 1 === verse.ayah) {
      prev.last = verse.ayah;
    } else if (!prev || prev.surah !== verse.surah || prev.last !== verse.ayah) {
      ranges.push({ surah: verse.surah, first: verse.ayah, last: verse.ayah });
    }
  }
  return ranges;
}

export function tafsirDisplayTopicBody(title: string, body: string): string {
  const trimmed = title.trim();
  if (trimmed && body.startsWith(trimmed) && body.slice(trimmed.length).startsWith("\n")) {
    return body.slice(trimmed.length + 1);
  }
  return body;
}
