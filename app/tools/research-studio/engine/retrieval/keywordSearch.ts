/**
 * Deterministic keyword retrieval over stored Research Engine chunks.
 * Searches folded tokens of normalizedText. Does not rewrite stored text.
 * No embeddings, dense search, or LLM.
 */
import { adaptProcessText } from "../adapter/processTextAdapter";
import type { DocumentChunk } from "../types/document";
import type { ResearchEngineStore } from "../storage/researchEngineStore";

export const DEFAULT_KEYWORD_K = 5;
export const MAX_KEYWORD_K = 20;

export type RetrievedChunk = {
  chunk: DocumentChunk;
  score: number;
  source: "keyword";
  matchedTerms: string[];
};

export type KeywordSearchOptions = {
  /** 1..MAX_KEYWORD_K. Omitted → DEFAULT_KEYWORD_K. */
  k?: number;
  /** Omit to search every stored document. Empty array matches nothing. */
  documentIds?: string[];
};

const WORD = /[\p{L}\p{N}]+/gu;
const MARKS = /[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;

/** Retriever-only fold. Does not call or change processText. */
export function foldKeywordToken(token: string): string {
  let folded = token
    .normalize("NFC")
    .replace(MARKS, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ؤ/g, "و")
    .replace(/[ئىي]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/ة/g, "ه")
    .toLowerCase();
  if (folded.startsWith("ال") && folded.length >= 4) folded = folded.slice(2);
  return folded;
}

export function keywordTokens(text: string): string[] {
  const source = text.normalize("NFC");
  const tokens: string[] = [];
  for (const match of source.matchAll(WORD)) {
    const folded = foldKeywordToken(match[0]);
    if (folded.length > 0) tokens.push(folded);
  }
  return tokens;
}

function uniqueInOrder(tokens: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const token of tokens) {
    if (seen.has(token)) continue;
    seen.add(token);
    out.push(token);
  }
  return out;
}

function idf(chunkCount: number, documentFrequency: number): number {
  return Math.round(1000 * (Math.log((chunkCount + 1) / (documentFrequency + 1)) + 1));
}

function tfWeight(tf: number): number {
  return Math.round(1000 * (1 + Math.log(tf)));
}

function loadChunks(store: ResearchEngineStore, documentIds: string[] | undefined): DocumentChunk[] {
  const ids = documentIds ?? store.list();
  const chunks: DocumentChunk[] = [];
  for (const id of ids) {
    const loaded = store.get(id);
    if (!loaded.ok) continue;
    const pages = loaded.value.chunks.slice().sort((a, b) => {
      if (a.pageNumber !== b.pageNumber) return a.pageNumber - b.pageNumber;
      if (a.chunkIndex !== b.chunkIndex) return a.chunkIndex - b.chunkIndex;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
    chunks.push(...pages);
  }
  return chunks;
}

function compareHits(a: RetrievedChunk, b: RetrievedChunk): number {
  if (a.score !== b.score) return b.score - a.score;
  if (a.chunk.documentId !== b.chunk.documentId) {
    return a.chunk.documentId < b.chunk.documentId ? -1 : 1;
  }
  if (a.chunk.pageNumber !== b.chunk.pageNumber) return a.chunk.pageNumber - b.chunk.pageNumber;
  if (a.chunk.chunkIndex !== b.chunk.chunkIndex) return a.chunk.chunkIndex - b.chunk.chunkIndex;
  if (a.chunk.id === b.chunk.id) return 0;
  return a.chunk.id < b.chunk.id ? -1 : 1;
}

/**
 * Keyword search. Empty query, no tokens, or no matches → [].
 * Identical corpus + query → identical order.
 */
export function searchKeywords(
  store: ResearchEngineStore,
  query: string,
  options: KeywordSearchOptions = {},
): RetrievedChunk[] {
  const requested = options.k ?? DEFAULT_KEYWORD_K;
  if (!Number.isInteger(requested) || requested < 1) return [];
  const k = Math.min(requested, MAX_KEYWORD_K);

  const queryText = adaptProcessText(query).normalizedText;
  const queryTerms = uniqueInOrder(keywordTokens(queryText));
  if (queryTerms.length === 0) return [];

  const chunks = loadChunks(store, options.documentIds);
  if (chunks.length === 0) return [];

  const counts = chunks.map((chunk) => {
    const tally = new Map<string, number>();
    for (const token of keywordTokens(chunk.normalizedText)) {
      tally.set(token, (tally.get(token) ?? 0) + 1);
    }
    return tally;
  });

  const df = new Map<string, number>();
  for (const term of queryTerms) df.set(term, 0);
  for (const tally of counts) {
    for (const term of queryTerms) {
      if ((tally.get(term) ?? 0) > 0) df.set(term, (df.get(term) ?? 0) + 1);
    }
  }

  const hits: RetrievedChunk[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const tally = counts[i];
    let score = 0;
    const matched: string[] = [];
    for (const term of queryTerms) {
      const tf = tally.get(term) ?? 0;
      if (tf < 1) continue;
      matched.push(term);
      score += idf(chunks.length, df.get(term) ?? 0) * tfWeight(tf);
    }
    if (score < 1 || matched.length === 0) continue;
    hits.push({
      chunk: chunks[i],
      score,
      source: "keyword",
      matchedTerms: matched,
    });
  }

  hits.sort(compareHits);
  return hits.slice(0, k);
}
