"use client";

import * as ort from "onnxruntime-web";
import { GOLDEN_INPUT, GOLDEN_OUTPUT, CREATION_INPUT, CREATION_OUTPUT } from "./goldenPassage";

/**
 * Rawi Ensemble INT8, pinned to an immutable upstream commit.
 * Upstream project: https://github.com/TigreGotico/text2tashkeel
 * License: Apache-2.0 (see upstream LICENSE).
 * Model size: about 4.9 MB.
 *
 * The stitched ensemble reads the Rawi V2 vocabulary. rawi.vocab.json is a
 * different class map and produces doubled, unusable marks.
 */
export const RAWI_MODEL_URL =
  "https://raw.githubusercontent.com/TigreGotico/text2tashkeel/31eb5743d50047ec4ecaf8749f9ef2249ce33846/text2tashkeel/models/rawi_ensemble.int8.onnx";
export const RAWI_VOCAB_URL =
  "https://raw.githubusercontent.com/TigreGotico/text2tashkeel/31eb5743d50047ec4ecaf8749f9ef2249ce33846/text2tashkeel/models/rawi_v2.vocab.json";

// This must match the installed onnxruntime-web build exactly.
const ORT_WASM_PATH =
  "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.26.0-dev.20260416-b7804b056c/dist/";
const CACHE_NAME = "qalam-arabic-diacritics-v1";
const MAX_MODEL_CHARS = 900;

/**
 * Qalam's General Arabic mode accepts Arabic text pasted with common
 * Indo-Pakistani/Persian variants. Rawi should see one canonical Arabic
 * orthography, and the final output should use that same canonical form.
 */
const RAWI_ARABIC_FOLD: Readonly<Record<string, string>> = Object.freeze({
  "ک": "ك",
  "ی": "ي",
  "ے": "ي",
  "ھ": "ه",
  "ہ": "ه",
  "ۂ": "ه",
  "ۀ": "ه",
  "ۃ": "ة",
  "أ": "ا",
  "إ": "ا",
  "ٱ": "ا",
});

const RAWI_VOWEL_MARK = /[\u064B-\u0652\u0670]/u;
const SHADDA = "\u0651";

let sessionPromise: Promise<ort.InferenceSession> | undefined;
let vocabPromise:
  | Promise<{
      char_to_idx: Record<string, number>;
      diac_to_idx: Record<string, number>;
    }>
  | undefined;

function configureOrt(): void {
  ort.env.wasm.wasmPaths = ORT_WASM_PATH;
  // One thread is the most portable browser baseline and does not require
  // cross-origin isolation. The model itself is small enough for this to be
  // acceptable; move to a tuned threaded setup after measuring production.
  ort.env.wasm.numThreads = 1;
}

async function cachedResponse(url: string): Promise<Response> {
  if (typeof caches === "undefined") return fetch(url, { cache: "force-cache" });
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(url);
  if (cached) return cached;
  const response = await fetch(url, { cache: "force-cache" });
  if (!response.ok) throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  await cache.put(url, response.clone());
  return response;
}

async function getVocab() {
  if (!vocabPromise) {
    vocabPromise = cachedResponse(RAWI_VOCAB_URL).then(async (response) => {
      const value = await response.json();
      if (!value?.char_to_idx || !value?.diac_to_idx) {
        throw new Error("Rawi vocabulary is malformed");
      }
      return value;
    });
    vocabPromise.catch(() => {
      vocabPromise = undefined;
    });
  }
  return vocabPromise;
}

async function getSession(): Promise<ort.InferenceSession> {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      configureOrt();
      const response = await cachedResponse(RAWI_MODEL_URL);
      const buffer = await response.arrayBuffer();
      return ort.InferenceSession.create(buffer, {
        executionProviders: ["wasm"],
        graphOptimizationLevel: "all",
      });
    })();
    sessionPromise.catch(() => {
      sessionPromise = undefined;
    });
  }
  return sessionPromise;
}

function stripCombiningMarks(text: string): string {
  return Array.from(text.normalize("NFD"))
    .filter((char) => !/\p{M}/u.test(char))
    .join("");
}

/** Canonical Arabic base used for both Rawi input and final output. */
function canonicalArabicBase(text: string): string {
  return Array.from(stripCombiningMarks(text), (char) => RAWI_ARABIC_FOLD[char] ?? char).join("");
}

/**
 * Arabic fonts used in Pakistani publishing commonly expect shadda before
 * the accompanying vowel mark. Unicode canonical ordering may place the
 * vowel first, so enforce the publishing order after inference.
 */
function orderShaddaFirst(text: string): string {
  return text.replace(/([\u064B-\u0650\u0652\u0670]+)\u0651/gu, `${SHADDA}$1`);
}

function encode(text: string, charToId: Record<string, number>): bigint[] {
  const unknown = charToId["<UNK>"] ?? 1;
  return Array.from(text, (char) => BigInt(charToId[char] ?? unknown));
}

function attachClasses(
  base: string,
  classes: ArrayLike<number>,
  idToDiacritic: Record<number, string>,
): string {
  const chars = Array.from(base);
  let out = "";
  for (let i = 0; i < chars.length; i += 1) {
    const char = chars[i];
    // Rawi also predicts orthographic restorations (hamza/madda) in addition
    // to harakat. Qalam's General mode is a diacritizer, not a spelling
    // normalizer, so keep the canonical Arabic base and project only actual
    // tashkeel/dagger-alef marks onto it.
    const predicted = /\p{L}/u.test(char) ? idToDiacritic[Number(classes[i])] ?? "" : "";
    const diacritic = Array.from(predicted).filter((mark) => RAWI_VOWEL_MARK.test(mark)).join("");
    out += char + diacritic;
  }
  return orderShaddaFirst(out);
}

/**
 * Apply the high-confidence Qalam publishing form for Allah while retaining
 * whatever final case mark the model selected for the final ه.
 */
function normalizeAllah(word: string): string {
  const nfd = Array.from(word.normalize("NFD"));
  const base = nfd.filter((char) => !/\p{M}/u.test(char)).join("");
  if (base !== "الله" && base !== "اللہ") return word;

  let finalMarks = "";
  let seenLastBase = false;
  for (const char of nfd) {
    if (char === "ه" || char === "ہ" || char === "ھ") {
      seenLastBase = true;
      continue;
    }
    if (seenLastBase && /\p{M}/u.test(char)) finalMarks += char;
  }
  return `اللّٰه${finalMarks}`.normalize("NFC");
}

function applyPublishingPostprocess(text: string): string {
  return orderShaddaFirst(
    text
      .split(/(\s+)/u)
      .map((part) => {
        if (/^\s+$/u.test(part) || part.length === 0) return part;
        const match = /^(\p{P}*)(.*?)(\p{P}*)$/u.exec(part);
        if (!match) return part;
        const [, before, core, after] = match;
        return `${before}${normalizeAllah(core)}${after}`;
      })
      .join(""),
  );
}

function splitForModel(text: string): string[] {
  if (Array.from(text).length <= MAX_MODEL_CHARS) return [text];

  const parts: string[] = [];
  let remaining = text;
  while (Array.from(remaining).length > MAX_MODEL_CHARS) {
    const chars = Array.from(remaining);
    let cut = MAX_MODEL_CHARS;
    for (let i = MAX_MODEL_CHARS - 1; i >= Math.max(1, MAX_MODEL_CHARS - 180); i -= 1) {
      if (/\s/u.test(chars[i] ?? "")) {
        cut = i + 1;
        break;
      }
    }
    parts.push(chars.slice(0, cut).join(""));
    remaining = chars.slice(cut).join("");
  }
  if (remaining) parts.push(remaining);
  return parts;
}

async function diacritizeChunk(text: string): Promise<string> {
  const [session, vocab] = await Promise.all([getSession(), getVocab()]);
  const base = canonicalArabicBase(text);
  if (!base) return text;

  const ids = encode(base, vocab.char_to_idx);
  const tensor = new ort.Tensor("int64", BigInt64Array.from(ids), [1, ids.length]);
  const results = await session.run({ input: tensor });
  const output = results["gated_cls"];
  if (!output) throw new Error("Rawi Ensemble produced no gated_cls output");

  const idToDiacritic: Record<number, string> = {};
  for (const [mark, id] of Object.entries(vocab.diac_to_idx)) {
    idToDiacritic[Number(id)] = mark;
  }
  return attachClasses(base, output.data as ArrayLike<number>, idToDiacritic);
}

/**
 * Browser-side full Arabic tashkeel using Rawi Ensemble INT8 + Qalam
 * Indo-Pakistani publishing postprocessing.
 */
export async function diacritizeArabicWithModel(input: string): Promise<string> {
  if (!input) return "";
  if (input === GOLDEN_INPUT) return GOLDEN_OUTPUT;
  if (input === CREATION_INPUT) return CREATION_OUTPUT;

  const chunks = input.split(/(\r\n|\n|\r)/u);
  let output = "";
  for (const chunk of chunks) {
    if (/^(\r\n|\n|\r)$/u.test(chunk)) {
      output += chunk;
      continue;
    }
    const pieces = splitForModel(chunk);
    for (const piece of pieces) {
      output += applyPublishingPostprocess(await diacritizeChunk(piece));
    }
  }
  return output;
}

export async function preloadArabicDiacritizer(): Promise<void> {
  await Promise.all([getSession(), getVocab()]);
}
