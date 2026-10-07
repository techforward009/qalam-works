import { normalizeBookSearch } from "./bookCorpus";
export type LexicalDocument = { text: string; heading?: string };
const K1 = 1.2;
const B = .75;
const arabicPatterns = new Map<string, RegExp>();
function termMatches(word: string, term: string): boolean {
  if (word === term) return true;
  if (!/^[\u0600-\u06ff]+$/u.test(term)) return false;
  let pattern = arabicPatterns.get(term);
  if (!pattern) {
    const stem = term.replace(/^ال/u, "");
    pattern = new RegExp(`^(?:[وف])?(?:[بكل])?(?:ال)?${stem}(?:ه|ها|هم|هن|هما|ك|كم|كن|كما|نا|ي|ان|ين|ون|ات|اء)?$`, "u");
    if (arabicPatterns.size >= 512) arabicPatterns.delete(arabicPatterns.keys().next().value!);
    arabicPatterns.set(term, pattern);
  }
  return pattern.test(word);
}
function groupFrequency(words: readonly string[], normalized: string, group: readonly string[]): number {
  const wordTerms = group.filter(t => !t.includes(" "));
  const wordsFound = words.filter(word => wordTerms.some(term => termMatches(word, term))).length;
  const phrasesFound = group.filter(t => t.includes(" ") && (` ${normalized} `).includes(` ${t} `)).length;
  return wordsFound + phrasesFound;
}
/** BM25 over multilingual topic groups. Each word contributes once per group. */
export function rankLexicalDocuments(documents: readonly LexicalDocument[], groups: readonly (readonly string[])[], direct: readonly string[], requiredGroups: readonly (readonly string[])[] = []): number[] {
  if (!documents.length || !groups.length) return documents.map(() => 0);
  const normalizedGroups = groups.map(g => [...new Set(g.map(normalizeBookSearch))]);
  const uniqueGroups = [...new Map(normalizedGroups.map(g => [g.join("|"), g])).values()];
  const required = requiredGroups.map(g => g.map(normalizeBookSearch));
  const normalized = documents.map(d => normalizeBookSearch(d.text));
  const tokens = normalized.map(text => text.split(" ").filter(Boolean));
  const average = Math.max(1, tokens.reduce((sum, t) => sum + t.length, 0) / tokens.length);
  const frequencies = tokens.map((words, doc) => uniqueGroups.map(group => groupFrequency(words, normalized[doc], group)));
  const documentFrequencies = uniqueGroups.map((_, i) => frequencies.filter(f => f[i] > 0).length);
  return tokens.map((words, doc) => {
    const hits = frequencies[doc].filter(n => n > 0).length;
    if (!hits || uniqueGroups.length > 1 && hits / uniqueGroups.length < .5) return 0;
    const normalizedHeading = normalizeBookSearch(documents[doc].heading ?? "");
    const headingWords = normalizedHeading.split(" ");
    if (required.length > 1) {
      const covered = required.filter(g => groupFrequency(words, normalized[doc], g) > 0 || groupFrequency(headingWords, normalizedHeading, g) > 0).length;
      if (covered < Math.ceil(required.length * 2 / 3)) return 0;
    }
    const denominatorLength = K1 * (1 - B + B * words.length / average);
    let score = 0;
    uniqueGroups.forEach((_, i) => {
      const tf = frequencies[doc][i]; if (!tf) return;
      const df = documentFrequencies[i];
      const idf = Math.log(1 + (documents.length - df + .5) / (df + .5));
      score += idf * (tf * (K1 + 1)) / (tf + denominatorLength);
    });
    const headingHits = uniqueGroups.filter(g => groupFrequency(headingWords, normalizedHeading, g) > 0).length;
    const directHits = direct.filter(term => words.some(word => termMatches(word, term))).length;
    return score * (1 + .1 * directHits + .05 * headingHits);
  });
}
