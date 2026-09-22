import type { ProcessingLanguage } from "../../../../utils/processing/types";
import { adaptProcessText } from "../adapter/processTextAdapter";
import {
  CHUNKER_VERSION,
  chunkId,
  type ChunkContentType,
  type DocumentChunk,
  type DocumentPage,
} from "../types/document";

export const MAX_CHUNK_CODE_POINTS = 800;

export type ChunkResult = {
  chunks: DocumentChunk[];
  chunkerVersion: string;
};

const PARA_BREAK = /(?:\r?\n){2,}|\u2029+/g;
const LIST_PREFIX = /^\s*(?:[-*•]|[0-9]{1,3}[.)]|[۰-۹]+[.)])\s/;
const MD_HEADING = /^\s{0,3}#{1,6}\s+\S/;
const TERMINAL_PUNCT = /[۔.!?؟]$/;

function codePointLength(text: string): number {
  return Array.from(text).length;
}

function trimRange(raw: string, start: number, end: number): { start: number; end: number } | null {
  let a = start;
  let b = end;
  while (a < b && /\s/.test(raw[a])) a++;
  while (b > a && /\s/.test(raw[b - 1])) b--;
  if (a >= b) return null;
  return { start: a, end: b };
}

function paragraphRanges(raw: string): { start: number; end: number }[] {
  const ranges: { start: number; end: number }[] = [];
  let last = 0;
  for (const match of raw.matchAll(PARA_BREAK)) {
    const trimmed = trimRange(raw, last, match.index);
    if (trimmed) ranges.push(trimmed);
    last = match.index + match[0].length;
  }
  const tail = trimRange(raw, last, raw.length);
  if (tail) ranges.push(tail);
  return ranges;
}

function classify(text: string): ChunkContentType {
  const first = text.split(/\r?\n/, 1)[0] ?? text;
  if (LIST_PREFIX.test(first)) return "list";
  if (MD_HEADING.test(first)) return "heading";
  if (
    !text.includes("\n") &&
    codePointLength(text) <= 80 &&
    !TERMINAL_PUNCT.test(text.trim())
  ) {
    return "heading";
  }
  return "paragraph";
}

function hardSplit(text: string): string[] {
  const points = Array.from(text);
  const out: string[] = [];
  for (let i = 0; i < points.length; i += MAX_CHUNK_CODE_POINTS) {
    out.push(points.slice(i, i + MAX_CHUNK_CODE_POINTS).join(""));
  }
  return out.filter((part) => part.length > 0);
}

/** Contiguous slices of `slice` only — never rewrite whitespace. */
function oversizedPieces(slice: string): string[] {
  if (codePointLength(slice) <= MAX_CHUNK_CODE_POINTS) return [slice];

  const splitAfter: number[] = [];
  const re = /[۔.!?؟](?:\s+|$)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(slice)) !== null) {
    splitAfter.push(match.index + match[0].length);
  }
  if (splitAfter.length === 0 || splitAfter[splitAfter.length - 1] !== slice.length) {
    splitAfter.push(slice.length);
  }

  const out: string[] = [];
  let start = 0;
  let good = 0;

  const flush = (to: number) => {
    if (to > start) out.push(slice.slice(start, to));
    start = to;
    good = to;
  };

  for (const end of splitAfter) {
    const candidate = slice.slice(start, end);
    if (codePointLength(candidate) <= MAX_CHUNK_CODE_POINTS) {
      good = end;
      continue;
    }
    if (good > start) flush(good);
    const sentence = slice.slice(start, end);
    if (codePointLength(sentence) <= MAX_CHUNK_CODE_POINTS) {
      flush(end);
    } else {
      for (const part of hardSplit(sentence)) out.push(part);
      start = end;
      good = end;
    }
  }
  if (start < slice.length) flush(slice.length);
  return out.filter((part) => part.length > 0);
}

/**
 * Page → paragraph → (optional sentence split) → DocumentChunk[].
 * Never merges across pages. IDs: `{documentId}:p{page}:c{chunk}`.
 */
export function createChunks(
  pages: DocumentPage[],
  mode: ProcessingLanguage = "auto",
): ChunkResult {
  const chunks: DocumentChunk[] = [];

  for (const page of pages) {
    const raw = page.rawText;
    if (raw.trim().length === 0) continue;

    const ranges = paragraphRanges(raw);
    let chunkIndex = 0;
    let paragraphIndex = 0;

    for (const range of ranges) {
      paragraphIndex += 1;
      const paragraph = raw.slice(range.start, range.end);
      const contentType = classify(paragraph);

      for (const piece of oversizedPieces(paragraph)) {
        chunkIndex += 1;
        const adapted = adaptProcessText(piece, mode);
        chunks.push({
          id: chunkId(page.documentId, page.pageNumber, chunkIndex),
          documentId: page.documentId,
          pageNumber: page.pageNumber,
          chunkIndex,
          rawText: piece,
          normalizedText: adapted.normalizedText,
          paragraphIndex,
          language: adapted.language,
          direction: adapted.direction,
          contentType,
        });
      }
    }
  }

  return { chunks, chunkerVersion: CHUNKER_VERSION };
}
