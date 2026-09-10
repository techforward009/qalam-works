"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  AI_ACTIONS,
  captureEditorSelection,
  hostedAiUserMessage,
  previewDirection,
  replaceCapturedSelection,
  runQalamAiPassage,
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
  const abortRef = useRef<AbortController | null>(null);
  const completedRef = useRef<string[]>([]);
  const nextIndexRef = useRef(0);
  const resumeActionRef = useRef<QalamAiAction | null>(null);
  const [captureError, setCaptureError] = useState<"empty" | "too-large" | null>(initialCapture.ok ? null : initialCapture.reason);
  const [status, setStatus] = useState<"idle" | "generating" | "ready" | "error">("idle");
  const [error, setError] = useState("");
  const [action, setAction] = useState<QalamAiAction>("improve");
  const [preview, setPreview] = useState("");
  const [complete, setComplete] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
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
      if (event.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

  const keepSelection = (event: React.MouseEvent) => event.preventDefault();
  const t = (en: string, ur: string) => (isUr ? ur : en);
  const capture = captureRef.current;

  const handleClose = () => {
    abortRef.current?.abort();
    onClose();
  };

  const run = async (resume: boolean) => {
    if (!capture) return;
    setError("");
    setStale(false);
    setComplete(false);
    if (!resume || resumeActionRef.current !== action) {
      completedRef.current = [];
      nextIndexRef.current = 0;
      resumeActionRef.current = action;
      setPreview("");
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("generating");
    const result = await runQalamAiPassage({
      action,
      text: capture.text,
      signal: controller.signal,
      completed: completedRef.current,
      nextIndex: nextIndexRef.current,
      onProgress: (value) => setProgress(value),
    });
    completedRef.current = result.completed;
    nextIndexRef.current = result.nextIndex;
    if (controller.signal.aborted) return;
    if (result.ok) {
      setPreview(result.text);
      setComplete(true);
      setProgress(null);
      setStatus("ready");
      return;
    }
    setStatus("error");
    setProgress(result.total > 1 ? { current: Math.min(result.nextIndex + 1, result.total), total: result.total } : null);
    setError(hostedAiUserMessage(result.code, isUr));
  };

  const replace = () => {
    if (!editor || !capture || !preview || !complete) return;
    const ok = replaceCapturedSelection(editor, capture, preview);
    if (!ok) {
      setStale(true);
      return;
    }
    handleClose();
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
    <div className="fixed inset-0 z-[90] flex items-start justify-center bg-black/20 p-4" data-qalam-ai-overlay="true" onMouseDown={handleClose}>
      <div
        role="dialog"
        aria-label={t("Qalam AI — Experimental", "قلم اے آئی — تجرباتی")}
        data-qalam-ai-dialog="true"
        className="mt-16 w-full max-w-md rounded-lg border border-gray-200 bg-white p-3 shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#1A3A2A]">{t("Qalam AI — Experimental", "قلم اے آئی — تجرباتی")}</h2>
          <button type="button" data-qalam-ai-close="true" onMouseDown={keepSelection} onClick={handleClose} className="text-xs text-gray-500">
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
          <p data-qalam-ai-too-large="true" className="mb-2 text-xs text-amber-800">
            {t("Select up to about four pages at a time.", "ایک وقت میں تقریباً چار صفحات تک متن منتخب کریں۔")}
          </p>
        ) : null}
        {capture ? (
          <div className="mb-2 max-h-20 overflow-auto rounded border border-gray-100 bg-[#F7F5EF] p-2 text-[11px] text-gray-700" data-qalam-ai-selection="true" dir={previewDirection(capture.text)}>
            {capture.text}
          </div>
        ) : null}
        <div className="mb-2 text-[11px] text-gray-500" data-qalam-ai-status="true">
          {status === "generating" && progress && progress.total > 1
            ? t(`Processing section ${progress.current} of ${progress.total}…`, `حصہ ${progress.current} از ${progress.total} پروسیس ہو رہا ہے…`)
            : status === "generating"
              ? t("Generating…", "تیار ہو رہا ہے…")
              : null}
        </div>
        {status === "generating" && progress && progress.total > 1 ? (
          <div className="mb-2 h-1.5 overflow-hidden rounded bg-gray-100" data-qalam-ai-progress="true" data-qalam-ai-progress-current={progress.current} data-qalam-ai-progress-total={progress.total}>
            <div className="h-full bg-[#1A3A2A]" style={{ width: `${Math.round((progress.current / progress.total) * 100)}%` }} />
          </div>
        ) : null}
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
              onClick={() => {
                setAction(id);
                completedRef.current = [];
                nextIndexRef.current = 0;
                resumeActionRef.current = null;
              }}
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
          onClick={() => void run(false)}
          className="mb-2 h-8 w-full rounded bg-[#1A3A2A] text-xs font-semibold text-white disabled:opacity-40"
        >
          {t("Generate", "تیار کریں")}
        </button>
        {preview && complete ? (
          <div data-qalam-ai-preview="true" className="mb-2 max-h-32 overflow-auto rounded border border-gray-200 p-2 text-xs text-gray-800" dir={previewDirection(preview)}>
            {preview}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-1">
          <button type="button" data-qalam-ai-replace="true" disabled={!preview || !complete} onMouseDown={keepSelection} onClick={replace} className="h-7 rounded bg-[#1A3A2A] px-2 text-[11px] font-semibold text-white disabled:opacity-40">
            {t("Replace selection", "انتخاب بدل دیں")}
          </button>
          <button type="button" data-qalam-ai-copy="true" disabled={!preview || !complete} onMouseDown={keepSelection} onClick={() => void copy()} className="h-7 rounded border border-gray-200 px-2 text-[11px] text-gray-700 disabled:opacity-40">
            {copied ? t("Copied", "کاپی ہو گیا") : t("Copy", "کاپی")}
          </button>
          <button type="button" data-qalam-ai-retry="true" disabled={!capture || status === "generating"} onMouseDown={keepSelection} onClick={() => void run(true)} className="h-7 rounded border border-gray-200 px-2 text-[11px] text-gray-700 disabled:opacity-40">
            {t("Retry", "دوبارہ")}
          </button>
        </div>
      </div>
    </div>
  );
}
