import type { Editor } from "@tiptap/core";
import { MAX_NEW_TOKENS, SUMMARIZE_MAX_NEW_TOKENS } from "./localAi";

export const MAX_SELECTION_CHARS = 2000;
export const AI_ACTIONS = ["improve", "summarize", "simplify", "formal"] as const;
export type QalamAiAction = (typeof AI_ACTIONS)[number];

export interface CapturedSelection {
  from: number;
  to: number;
  text: string;
}

export type CaptureResult =
  | { ok: true; capture: CapturedSelection }
  | { ok: false; reason: "empty" | "too-large" };

const SYSTEM_PROMPT = [
  "You are Qalam AI, a local writing assistant.",
  "Preserve the original language of the input (Urdu stays Urdu, English stays English, Arabic/Persian stay as they are).",
  "Preserve meaning unless summarizing.",
  "Output ONLY the requested transformed text.",
  "Do not prepend explanations such as \"Here is the rewritten text\".",
  "Preserve URLs, emails, numbers, and obvious names where practical.",
  "Do not mix English commentary into Urdu output.",
].join(" ");

const TASK_INSTRUCTIONS: Record<QalamAiAction, string> = {
  improve: "Improve the writing. Keep the same language and meaning. Make it clearer and more natural. Output ONLY the improved text.",
  summarize: "Summarize the text concisely in the same language. Output ONLY the summary.",
  simplify: "Simplify the writing so it is easier to understand. Keep the same language and meaning. Output ONLY the simplified text.",
  formal: "Rewrite the text in a more formal register. Keep the same language and meaning. Output ONLY the rewritten text.",
};

export function actionMaxNewTokens(action: QalamAiAction): number {
  return action === "summarize" ? SUMMARIZE_MAX_NEW_TOKENS : MAX_NEW_TOKENS;
}

export function buildTaskInstruction(action: QalamAiAction): string {
  return TASK_INSTRUCTIONS[action];
}

export function buildGenerationPrompt(action: QalamAiAction, text: string): string {
  return [
    "<|im_start|>system",
    SYSTEM_PROMPT,
    "<|im_end|>",
    "<|im_start|>user",
    `${TASK_INSTRUCTIONS[action]}\n\nText:\n${text}`,
    "<|im_end|>",
    "<|im_start|>assistant",
    "",
  ].join("\n");
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
