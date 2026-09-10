"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  AI_ACTIONS,
  captureEditorSelection,
  hostedAiUserMessage,
  replaceCapturedSelection,
  requestHostedQalamAi,
  type CapturedSelection,
  type QalamAiAction,
  type QalamAiClientErrorCode,
} from "../utils/qalamAi";

const ACTION_LABELS: Record<QalamAiAction, { en: string; ur: string }> = {
  improve: { en: "Improve writing", ur: "تحریر بہتر بنائیں" },
  summarize: { en: "Summarize", ur: "خلاصہ" },
  simplify: { en: "Simplify", ur: "آسان بنائیں" },
  formal: { en: "Formal rewrite", ur: "رسمی انداز" },
};

export default function QalamAiPanel({
  editor,
  isUr,
  onClose,
}: {
  editor: Editor | null;
  isUr: boolean;
  onClose: () => void;
}) {
  const initialCapture = captureEditorSelection(editor);
  const captureRef = useRef<CapturedSelection | null>(initialCapture.ok ? initialCapture.capture : null);
  const [captureError, setCaptureError] = useState<"empty" | "too-large" | null>(initialCapture.ok ? null : initialCapture.reason);
  const [status, setStatus] = useState<"idle" | "generating" | "ready" | "error">("idle");
  const [error, setError] = useState("");
  const [action, setAction] = useState<QalamAiAction>("improve");
  const [preview, setPreview] = useState("");
  const [stale, setStale] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const result = captureEditorSelection(editor);
    if (result.ok) {
      captureRef.current = result.capture;
      setCaptureError(null);
    } else {
      captureRef.current = null;
      setCaptureError(result.reason);
    }
  }, [editor]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const keepSelection = (event: React.MouseEvent) => event.preventDefault();
  const t = (en: string, ur: string) => (isUr ? ur : en);
  const capture = captureRef.current;

  const run = async () => {
    if (!capture) return;
    setError("");
    setStale(false);
    setStatus("generating");
    try {
      const text = await requestHostedQalamAi(action, capture.text);
      setPreview(text);
      setStatus("ready");
    } catch (err) {
      const code = ((err as { code?: QalamAiClientErrorCode }).code ?? "failed") as QalamAiClientErrorCode;
      setStatus("error");
      setError(hostedAiUserMessage(code, isUr));
    }
  };

  const replace = () => {
    if (!editor || !capture || !preview) return;
    const ok = replaceCapturedSelection(editor, capture, preview);
    if (!ok) {
      setStale(true);
      return;
    }
    onClose();
  };

  const copy = async () => {
    if (!preview) return;
    try {
      await navigator.clipboard.writeText(preview);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center bg-black/20 p-4" data-qalam-ai-overlay="true" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-label={t("Qalam AI — Experimental", "قلم اے آئی — تجرباتی")}
        data-qalam-ai-dialog="true"
        className="mt-16 w-full max-w-md rounded-lg border border-gray-200 bg-white p-3 shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#1A3A2A]">{t("Qalam AI — Experimental", "قلم اے آئی — تجرباتی")}</h2>
          <button type="button" data-qalam-ai-close="true" onMouseDown={keepSelection} onClick={onClose} className="text-xs text-gray-500">
            {t("Close", "بند کریں")}
          </button>
        </div>
        <p className="mb-2 text-[11px] text-gray-500" data-qalam-ai-privacy="true">
          {t(
            "Selected text is sent securely to our AI provider for processing.",
            "منتخب متن پروسیسنگ کے لیے محفوظ طریقے سے ہمارے اے آئی فراہم کنندہ کو بھیجا جاتا ہے۔",
          )}
        </p>
        {captureError === "empty" ? (
          <p data-qalam-ai-empty="true" className="mb-2 text-xs text-amber-800">{t("Select some text first.", "پہلے کچھ متن منتخب کریں۔")}</p>
        ) : null}
        {captureError === "too-large" ? (
          <p data-qalam-ai-too-large="true" className="mb-2 text-xs text-amber-800">{t("Select a smaller passage (about 2000 characters or less).", "چھوٹا اقتباس منتخب کریں۔")}</p>
        ) : null}
        {capture ? (
          <div className="mb-2 max-h-20 overflow-auto rounded border border-gray-100 bg-[#F7F5EF] p-2 text-[11px] text-gray-700" data-qalam-ai-selection="true">
            {capture.text}
          </div>
        ) : null}
        <div className="mb-2 text-[11px] text-gray-500" data-qalam-ai-status="true">
          {status === "generating" ? t("Generating…", "تیار ہو رہا ہے…") : null}
        </div>
        {error ? <p data-qalam-ai-error="true" className="mb-2 text-xs text-red-700">{error}</p> : null}
        {stale ? <p data-qalam-ai-stale="true" className="mb-2 text-xs text-amber-800">{t("Document changed. Please select the text again.", "دستاویز بدل گئی۔ براہ کرم متن دوبارہ منتخب کریں۔")}</p> : null}
        <div className="mb-2 grid grid-cols-2 gap-1">
          {AI_ACTIONS.map((id) => (
            <button
              key={id}
              type="button"
              data-qalam-ai-action={id}
              aria-pressed={action === id}
              onMouseDown={keepSelection}
              onClick={() => setAction(id)}
              className={`rounded border px-2 py-1 text-[11px] ${action === id ? "border-[#1A3A2A] bg-[#1A3A2A] text-white" : "border-gray-200 text-gray-700"}`}
            >
              {isUr ? ACTION_LABELS[id].ur : ACTION_LABELS[id].en}
            </button>
          ))}
        </div>
        <button
          type="button"
          data-qalam-ai-generate="true"
          disabled={!capture || status === "generating"}
          onMouseDown={keepSelection}
          onClick={() => void run()}
          className="mb-2 h-8 w-full rounded bg-[#1A3A2A] text-xs font-semibold text-white disabled:opacity-40"
        >
          {t("Generate", "تیار کریں")}
        </button>
        {preview ? (
          <div data-qalam-ai-preview="true" className="mb-2 max-h-32 overflow-auto rounded border border-gray-200 p-2 text-xs text-gray-800">
            {preview}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-1">
          <button type="button" data-qalam-ai-replace="true" disabled={!preview} onMouseDown={keepSelection} onClick={replace} className="h-7 rounded bg-[#1A3A2A] px-2 text-[11px] font-semibold text-white disabled:opacity-40">
            {t("Replace selection", "انتخاب بدل دیں")}
          </button>
          <button type="button" data-qalam-ai-copy="true" disabled={!preview} onMouseDown={keepSelection} onClick={() => void copy()} className="h-7 rounded border border-gray-200 px-2 text-[11px] text-gray-700 disabled:opacity-40">
            {copied ? t("Copied", "کاپی ہو گیا") : t("Copy", "کاپی")}
          </button>
          <button type="button" data-qalam-ai-retry="true" disabled={!capture || status === "generating"} onMouseDown={keepSelection} onClick={() => void run()} className="h-7 rounded border border-gray-200 px-2 text-[11px] text-gray-700 disabled:opacity-40">
            {t("Retry", "دوبارہ")}
          </button>
        </div>
      </div>
    </div>
  );
}
