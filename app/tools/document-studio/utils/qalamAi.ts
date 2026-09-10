import type { Editor } from "@tiptap/core";
import { detectTextDirection } from "../../../utils/bidi/segmentDirection";

export const MAX_SELECTION_CHARS = 16000;
export const MAX_PROVIDER_CHUNK_CHARS = 2400;
export const CHUNK_TARGET_CHARS = 2000;
export const QALAM_AI_MODEL_ID = "@cf/zai-org/glm-4.7-flash";
export const QALAM_AI_API_PATH = "/api/qalam-ai";
export const QALAM_AI_TIMEOUT_MS = 60_000;
export const MAX_TRUNCATION_DEPTH = 2;
export const AI_ACTIONS = ["improve", "summarize", "simplify", "formal"] as const;
export type QalamAiAction = (typeof AI_ACTIONS)[number];
export const SERVER_AI_ACTIONS = ["improve", "summarize", "simplify", "formal", "summarizeCombine"] as const;
export type ServerQalamAiAction = (typeof SERVER_AI_ACTIONS)[number];

export const ACTION_MAX_TOKENS: Record<ServerQalamAiAction, number> = {
  improve: 1200,
  formal: 1200,
  simplify: 1000,
  summarize: 300,
  summarizeCombine: 400,
};

export interface CapturedSelection {
  from: number;
  to: number;
  text: string;
}

export type CaptureResult =
  | { ok: true; capture: CapturedSelection }
  | { ok: false; reason: "empty" | "too-large" };

export type QalamAiClientErrorCode = "unavailable" | "limit" | "failed" | "invalid" | "truncated";

export interface TextChunk {
  text: string;
  join: "paragraph" | "sentence";
}

const SYSTEM_PROMPT = [
  "You are Qalam AI, a writing assistant.",
  "Preserve the original language of the input (Urdu stays Urdu, English stays English, Arabic/Persian stay as they are).",
  "Preserve all factual claims, names, dates, numbers, quotations, URLs, emails, and the sequence of events.",
  "Do not invent facts. Do not remove substantive information. Do not add commentary.",
  "Output ONLY the requested transformed text.",
  "Do not prepend introductions or explanations such as \"Here is the result\" or \"Here is the rewritten text\".",
  "Do not mix English commentary into Urdu output. Urdu input must yield natural Urdu only.",
].join(" ");

const TASK_INSTRUCTIONS: Record<ServerQalamAiAction, string> = {
  improve:
    "Improve grammar, punctuation, sentence boundaries, readability and fluency without changing meaning or shortening the passage. Keep the complete information from this section. Output ONLY the improved text.",
  summarize: "Produce a concise summary in the same language. Output ONLY the summary.",
  simplify:
    "Make the passage easier to understand while preserving every substantive point. Keep the complete information from this section. Output ONLY the simplified text.",
  formal:
    "Rewrite in a more formal register without changing meaning or shortening the passage. Keep the complete information from this section. Output ONLY the rewritten text.",
  summarizeCombine:
    "Combine the following section summaries into ONE coherent summary in the same language. Do not list parts or add commentary. Output ONLY the combined summary.",
};

const PROTECTED_RE = /(?:https?:\/\/|www\.)[^\s]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

export function isQalamAiAction(value: unknown): value is QalamAiAction {
  return typeof value === "string" && (AI_ACTIONS as readonly string[]).includes(value);
}

export function isServerQalamAiAction(value: unknown): value is ServerQalamAiAction {
  return typeof value === "string" && (SERVER_AI_ACTIONS as readonly string[]).includes(value);
}

export function actionMaxNewTokens(action: ServerQalamAiAction): number {
  return ACTION_MAX_TOKENS[action];
}

export function buildTaskInstruction(action: ServerQalamAiAction): string {
  return TASK_INSTRUCTIONS[action];
}

export function buildSystemPrompt(): string {
  return SYSTEM_PROMPT;
}

export function buildCloudflareMessages(action: ServerQalamAiAction, text: string): Array<{ role: "system" | "user"; content: string }> {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `${TASK_INSTRUCTIONS[action]}\n\nText:\n${text}` },
  ];
}

export function captureEditorSelection(editor: Editor | null): CaptureResult {
  if (!editor) return { ok: false, reason: "empty" };
  const { from, to } = editor.state.selection;
  const text = editor.state.doc.textBetween(from, to, "\n", "\n");
  if (!text.trim()) return { ok: false, reason: "empty" };
  if (text.length > MAX_SELECTION_CHARS) return { ok: false, reason: "too-large" };
  return { ok: true, capture: { from, to, text } };
}

export function selectionStillMatches(editor: Editor, capture: CapturedSelection): boolean {
  const size = editor.state.doc.content.size;
  if (capture.from < 0 || capture.to > size || capture.from > capture.to) return false;
  return editor.state.doc.textBetween(capture.from, capture.to, "\n", "\n") === capture.text;
}

export function replaceCapturedSelection(editor: Editor, capture: CapturedSelection, generated: string): boolean {
  if (!generated) return false;
  if (!selectionStillMatches(editor, capture)) return false;
  editor.chain().focus().insertContentAt({ from: capture.from, to: capture.to }, generated).run();
  return true;
}

export function previewDirection(text: string, fallback: "rtl" | "ltr" = "rtl"): "rtl" | "ltr" {
  return detectTextDirection(text, fallback) === "ltr" ? "ltr" : "rtl";
}

export function hostedAiUserMessage(code: QalamAiClientErrorCode, isUr: boolean): string {
  if (code === "unavailable") {
    return isUr ? "قلم اے آئی عارضی طور پر دستیاب نہیں۔" : "Qalam AI is temporarily unavailable.";
  }
  if (code === "limit") {
    return isUr
      ? "قلم اے آئی کی استعمال حد پوری ہو چکی ہے۔ بعد میں دوبارہ کوشش کریں۔"
      : "Qalam AI usage limit has been reached. Please try again later.";
  }
  if (code === "invalid") {
    return isUr ? "منتخب متن درست نہیں۔" : "The selected text could not be processed.";
  }
  if (code === "truncated") {
    return isUr
      ? "اے آئی اس حصے کا مکمل جواب نہیں دے سکا۔ براہِ کرم دوبارہ کوشش کریں۔"
      : "Qalam AI could not finish this section. Please try again.";
  }
  return isUr
    ? "قلم اے آئی جواب تیار نہیں کر سکا۔ دوبارہ کوشش کریں۔"
    : "Qalam AI could not generate a response. Please try again.";
}

function protectedSpans(text: string): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  for (const match of text.matchAll(PROTECTED_RE)) {
    if (match.index == null) continue;
    spans.push([match.index, match.index + match[0].length]);
  }
  return spans;
}

function isProtected(index: number, spans: Array<[number, number]>): boolean {
  return spans.some(([from, to]) => index > from && index < to);
}

function isSentenceEnd(text: string, index: number): boolean {
  const ch = text[index];
  if (ch === "۔" || ch === "؟" || ch === "!" || ch === "؟") return true;
  if (ch === "?" || ch === "!") return true;
  if (ch === ".") {
    const next = text[index + 1];
    return !next || /\s/.test(next);
  }
  return false;
}

function lastGoodSplit(text: string, from: number, to: number, spans: Array<[number, number]>): { at: number; join: TextChunk["join"] } | null {
  for (let i = to; i > from; i -= 1) {
    if (isProtected(i, spans)) continue;
    if (text.slice(i - 2, i) === "\n\n" || text.slice(i, i + 2) === "\n\n") {
      const at = text.slice(i - 2, i) === "\n\n" ? i : i + 2;
      if (at > from && at <= to) return { at, join: "paragraph" };
    }
  }
  for (let i = to - 1; i > from; i -= 1) {
    if (isProtected(i, spans)) continue;
    if (text[i] === "\n") return { at: i + 1, join: "paragraph" };
  }
  for (let i = to - 1; i > from; i -= 1) {
    if (isProtected(i, spans)) continue;
    if (isSentenceEnd(text, i)) return { at: i + 1, join: "sentence" };
  }
  for (let i = to - 1; i > from; i -= 1) {
    if (isProtected(i, spans)) continue;
    if (/\s/.test(text[i])) return { at: i + 1, join: "sentence" };
  }
  return null;
}

export function chunkText(
  text: string,
  maxChars = MAX_PROVIDER_CHUNK_CHARS,
  targetChars = CHUNK_TARGET_CHARS,
): TextChunk[] {
  if (!text) return [];
  if (text.length <= maxChars) return [{ text, join: "paragraph" }];
  const spans = protectedSpans(text);
  const chunks: TextChunk[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    const remaining = text.length - cursor;
    if (remaining <= maxChars) {
      chunks.push({ text: text.slice(cursor), join: chunks.length ? chunks[chunks.length - 1]?.join ?? "paragraph" : "paragraph" });
      break;
    }
    const windowEnd = Math.min(text.length, cursor + targetChars);
    const hardEnd = Math.min(text.length, cursor + maxChars);
    const found = lastGoodSplit(text, cursor + Math.min(200, targetChars / 4), windowEnd, spans)
      ?? lastGoodSplit(text, cursor + 1, hardEnd, spans);
    const at = found && found.at > cursor ? found.at : hardEnd;
    const slice = text.slice(cursor, at);
    const join = found?.join ?? "sentence";
    if (slice) chunks.push({ text: slice, join });
    cursor = at;
    while (cursor < text.length && (text[cursor] === " " || text[cursor] === "\t")) {
      const last = chunks[chunks.length - 1];
      if (last) last.text += text[cursor];
      cursor += 1;
    }
  }
  return chunks.filter((chunk) => chunk.text.length > 0);
}

export function joinedChunkSource(chunks: TextChunk[]): string {
  return chunks.map((chunk) => chunk.text).join("");
}

export function joinTransformedChunks(chunks: TextChunk[], results: string[]): string {
  if (results.length === 0) return "";
  let out = results[0]?.trim() ?? "";
  for (let i = 1; i < results.length; i += 1) {
    const part = results[i]?.trim() ?? "";
    if (!part) continue;
    const prevOriginal = chunks[i - 1]?.text ?? "";
    const nextOriginal = chunks[i]?.text ?? "";
    const paragraph = /\n\s*\n\s*$/.test(prevOriginal) || /^\s*\n\s*\n/.test(nextOriginal) || chunks[i]?.join === "paragraph";
    if (paragraph && (/\n\s*\n/.test(prevOriginal + nextOriginal.slice(0, 4)) || chunks[i]?.join === "paragraph" && /\n/.test(prevOriginal.slice(-2) + nextOriginal.slice(0, 2)))) {
      out += "\n\n" + part;
    } else if (chunks[i]?.join === "paragraph" && /\n/.test(prevOriginal.slice(-1) + nextOriginal.slice(0, 1))) {
      out += "\n\n" + part;
    } else {
      out += (/[\s\n]$/.test(out) ? "" : " ") + part;
    }
  }
  return out;
}

export type HostedAiResponse = { text: string; truncated: boolean };

export async function requestHostedQalamAi(
  action: ServerQalamAiAction,
  text: string,
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<HostedAiResponse> {
  const res = await fetchImpl(QALAM_AI_API_PATH, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, text }),
    signal,
  });
  const data = (await res.json().catch(() => ({}))) as { text?: unknown; error?: unknown; code?: unknown; truncated?: unknown };
  if (!res.ok) {
    const code =
      data.code === "unavailable" || data.code === "limit" || data.code === "invalid" || data.code === "truncated"
        ? data.code
        : "failed";
    const err = new Error(typeof data.error === "string" ? data.error : "failed") as Error & { code: QalamAiClientErrorCode };
    err.code = code;
    throw err;
  }
  if (typeof data.text !== "string" || !data.text.trim()) {
    const err = new Error("failed") as Error & { code: QalamAiClientErrorCode };
    err.code = data.truncated ? "truncated" : "failed";
    throw err;
  }
  return { text: data.text.trim(), truncated: data.truncated === true };
}

export type PassageProgress = { current: number; total: number };

export type PassageResult =
  | { ok: true; text: string; completed: string[]; nextIndex: number; total: number; calls: number }
  | { ok: false; code: QalamAiClientErrorCode; completed: string[]; nextIndex: number; total: number; calls: number };

async function transformChunk(
  action: ServerQalamAiAction,
  chunk: TextChunk,
  fetchImpl: typeof fetch,
  signal: AbortSignal | undefined,
  depth: number,
  onCall: () => void,
): Promise<string> {
  onCall();
  const response = await requestHostedQalamAi(action, chunk.text, fetchImpl, signal);
  if (!response.truncated) return response.text;
  if (depth >= MAX_TRUNCATION_DEPTH) {
    const err = new Error("truncated") as Error & { code: QalamAiClientErrorCode };
    err.code = "truncated";
    throw err;
  }
  const halves = chunkText(chunk.text, Math.min(MAX_PROVIDER_CHUNK_CHARS, Math.max(400, Math.ceil(chunk.text.length / 2))), Math.max(300, Math.ceil(chunk.text.length / 2)));
  if (halves.length < 2) {
    const err = new Error("truncated") as Error & { code: QalamAiClientErrorCode };
    err.code = "truncated";
    throw err;
  }
  const parts: string[] = [];
  for (const half of halves) {
    parts.push(await transformChunk(action, half, fetchImpl, signal, depth + 1, onCall));
  }
  return joinTransformedChunks(halves, parts);
}

export function buildPassageJobs(action: QalamAiAction, text: string): { jobs: Array<{ action: ServerQalamAiAction; chunk: TextChunk }>; combine: boolean } {
  const chunks = chunkText(text);
  if (action !== "summarize") {
    return { jobs: chunks.map((chunk) => ({ action, chunk })), combine: false };
  }
  const jobs = chunks.map((chunk) => ({ action: "summarize" as const, chunk }));
  return { jobs, combine: chunks.length > 1 };
}

export async function runQalamAiPassage(input: {
  action: QalamAiAction;
  text: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  completed?: string[];
  nextIndex?: number;
  onProgress?: (progress: PassageProgress) => void;
}): Promise<PassageResult> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const { jobs, combine } = buildPassageJobs(input.action, input.text);
  const total = jobs.length + (combine ? 1 : 0);
  const completed = [...(input.completed ?? [])];
  let index = Math.max(0, input.nextIndex ?? 0);
  let calls = 0;
  const onCall = () => {
    calls += 1;
  };
  try {
    while (index < jobs.length) {
      if (input.signal?.aborted) throw Object.assign(new Error("failed"), { code: "failed" });
      input.onProgress?.({ current: index + 1, total });
      completed[index] = await transformChunk(jobs[index].action, jobs[index].chunk, fetchImpl, input.signal, 0, onCall);
      index += 1;
    }
    if (combine) {
      input.onProgress?.({ current: total, total });
      const summaries = completed.slice(0, jobs.length).join("\n\n");
      const combined = await transformChunk("summarizeCombine", { text: summaries, join: "paragraph" }, fetchImpl, input.signal, 0, onCall);
      return { ok: true, text: combined, completed: [...completed.slice(0, jobs.length), combined], nextIndex: total, total, calls };
    }
    const sourceChunks = jobs.map((job) => job.chunk);
    return { ok: true, text: joinTransformedChunks(sourceChunks, completed), completed, nextIndex: total, total, calls };
  } catch (err) {
    const code = ((err as { code?: QalamAiClientErrorCode }).code ?? "failed") as QalamAiClientErrorCode;
    return { ok: false, code, completed, nextIndex: index, total, calls };
  }
}
