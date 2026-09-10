import type { Editor } from "@tiptap/core";

export const MAX_SELECTION_CHARS = 2000;
export const QALAM_AI_MODEL_ID = "@cf/zai-org/glm-4.7-flash";
export const QALAM_AI_API_PATH = "/api/qalam-ai";
export const QALAM_AI_TIMEOUT_MS = 30_000;
export const AI_ACTIONS = ["improve", "summarize", "simplify", "formal"] as const;
export type QalamAiAction = (typeof AI_ACTIONS)[number];

export const ACTION_MAX_TOKENS: Record<QalamAiAction, number> = {
  improve: 180,
  simplify: 180,
  formal: 180,
  summarize: 120,
};

export interface CapturedSelection {
  from: number;
  to: number;
  text: string;
}

export type CaptureResult =
  | { ok: true; capture: CapturedSelection }
  | { ok: false; reason: "empty" | "too-large" };

export type QalamAiClientErrorCode = "unavailable" | "limit" | "failed" | "invalid";

const SYSTEM_PROMPT = [
  "You are Qalam AI, a writing assistant.",
  "Preserve the original language of the input (Urdu stays Urdu, English stays English, Arabic/Persian stay as they are).",
  "Preserve meaning unless summarizing.",
  "Output ONLY the requested transformed text.",
  "Do not prepend introductions or explanations such as \"Here is the result\" or \"Here is the rewritten text\".",
  "Preserve URLs, emails, numbers, and obvious names where practical.",
  "Do not mix English commentary into Urdu output.",
].join(" ");

const TASK_INSTRUCTIONS: Record<QalamAiAction, string> = {
  improve: "Improve clarity, fluency and naturalness without changing meaning. Output ONLY the improved text.",
  summarize: "Produce a concise summary in the same language. Output ONLY the summary.",
  simplify: "Make the passage easier to understand while preserving meaning. Output ONLY the simplified text.",
  formal: "Rewrite in a more formal register without changing meaning. Output ONLY the rewritten text.",
};

export function isQalamAiAction(value: unknown): value is QalamAiAction {
  return typeof value === "string" && (AI_ACTIONS as readonly string[]).includes(value);
}

export function actionMaxNewTokens(action: QalamAiAction): number {
  return ACTION_MAX_TOKENS[action];
}

export function buildTaskInstruction(action: QalamAiAction): string {
  return TASK_INSTRUCTIONS[action];
}

export function buildSystemPrompt(): string {
  return SYSTEM_PROMPT;
}

export function buildCloudflareMessages(action: QalamAiAction, text: string): Array<{ role: "system" | "user"; content: string }> {
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
  return isUr
    ? "قلم اے آئی جواب تیار نہیں کر سکا۔ دوبارہ کوشش کریں۔"
    : "Qalam AI could not generate a response. Please try again.";
}

export async function requestHostedQalamAi(action: QalamAiAction, text: string, fetchImpl: typeof fetch = fetch): Promise<string> {
  const res = await fetchImpl(QALAM_AI_API_PATH, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, text }),
  });
  const data = (await res.json().catch(() => ({}))) as { text?: unknown; error?: unknown; code?: unknown };
  if (!res.ok) {
    const code = data.code === "unavailable" || data.code === "limit" || data.code === "invalid" ? data.code : "failed";
    const err = new Error(typeof data.error === "string" ? data.error : "failed") as Error & { code: QalamAiClientErrorCode };
    err.code = code;
    throw err;
  }
  if (typeof data.text !== "string" || !data.text.trim()) {
    const err = new Error("failed") as Error & { code: QalamAiClientErrorCode };
    err.code = "failed";
    throw err;
  }
  return data.text.trim();
}
