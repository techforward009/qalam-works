import { normalizeBookSearch } from "./bookCorpus";
export type LexicalDocument = { text: string; heading?: string };
const K1 = 1.2;
const B = .75;
function termMatches(word: string, term: string): boolean {
  return word === term || /[\u0600-\u06ff]/u.test(term) && term.length >= 3 && word.includes(term);
}
/** BM25 over multilingual topic groups. Each word contributes once per group. */
export function rankLexicalDocuments(documents: readonly LexicalDocument[], groups: readonly (readonly string[])[], direct: readonly string[]): number[] {
  if (!documents.length || !groups.length) return documents.map(() => 0);
  const uniqueGroups = [...new Map(groups.map(g => [g.join("|"), g])).values()];
  const tokens = documents.map(d => normalizeBookSearch(d.text).split(" ").filter(Boolean));
  const average = Math.max(1, tokens.reduce((sum, t) => sum + t.length, 0) / tokens.length);
  const frequencies = tokens.map(words => uniqueGroups.map(group => words.filter(word => group.some(term => termMatches(word, term))).length));
  const documentFrequencies = uniqueGroups.map((_, i) => frequencies.filter(f => f[i] > 0).length);
  return tokens.map((words, doc) => {
    const hits = frequencies[doc].filter(n => n > 0).length;
    if (!hits || uniqueGroups.length > 1 && hits / uniqueGroups.length < .5) return 0;
    const denominatorLength = K1 * (1 - B + B * words.length / average);
    let score = 0;
    uniqueGroups.forEach((_, i) => {
      const tf = frequencies[doc][i]; if (!tf) return;
      const df = documentFrequencies[i];
      const idf = Math.log(1 + (documents.length - df + .5) / (df + .5));
      score += idf * (tf * (K1 + 1)) / (tf + denominatorLength);
    });
    const heading = normalizeBookSearch(documents[doc].heading ?? "").split(" ");
    const headingHits = uniqueGroups.filter(g => heading.some(word => g.some(term => termMatches(word, term)))).length;
    const directHits = direct.filter(term => words.some(word => termMatches(word, term))).length;
    return score * (1 + .1 * directHits + .05 * headingHits);
  });
}
