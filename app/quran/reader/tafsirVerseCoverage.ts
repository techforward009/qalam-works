export type TafsirCoverageGroup = { sourceKey: string; verses: string[] };

export function tafsirCoverageForRefs(refs: readonly string[], verses: Readonly<Record<string, { refs: readonly string[] }>>): TafsirCoverageGroup[] {
  return [...new Set(refs)].map(sourceKey => ({ sourceKey, verses: Object.entries(verses).filter(([, row]) => row.refs.includes(sourceKey)).map(([key]) => key) }));
}
