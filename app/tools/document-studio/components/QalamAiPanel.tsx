"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  generateQalamAiText,
  getQalamAiLoadedInfo,
  isQalamAiReady,
  loadQalamAiPipeline,
  type QalamAiLoadProgress,
} from "../utils/localAi";
import {
  AI_ACTIONS,
  actionMaxNewTokens,
  buildGenerationPrompt,
  captureEditorSelection,
  replaceCapturedSelection,
  type CapturedSelection,
  type QalamAiAction,
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
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "generating" | "error">(
    isQalamAiReady() ? "ready" : "idle",
  );
  const [progress, setProgress] = useState<QalamAiLoadProgress | null>(null);
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
  const info = getQalamAiLoadedInfo();

  const loadModel = async () => {
    setError("");
    setStatus("loading");
    try {
      await loadQalamAiPipeline((report) => setProgress(report));
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const run = async () => {
    if (!capture) return;
    setError("");
    setStale(false);
    setStatus("generating");
    try {
      const prompt = buildGenerationPrompt(action, capture.text);
      const text = await generateQalamAiText(prompt, { maxNewTokens: actionMaxNewTokens(action) });
      setPreview(text);
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : String(err));
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
        <p className="mb-2 text-[11px] text-gray-500">
          {t(
            "Qalam AI runs in your browser. The first use downloads the local AI model.",
            "قلم اے آئی آپ کے براؤزر میں چلتا ہے۔ پہلی مرتبہ مقامی ماڈل ڈاؤن لوڈ ہوتا ہے۔",
          )}
        </p>
        <p className="mb-2 text-[11px] text-gray-500">
          {t("Text is processed locally in your browser.", "متن آپ کے براؤزر میں مقامی طور پر پروسیس ہوتا ہے۔")}
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
          {status === "loading" ? t("Loading model…", "ماڈل لوڈ ہو رہا ہے…") : null}
          {status === "generating" ? t("Generating…", "تیار ہو رہا ہے…") : null}
          {status === "ready" && info ? t(`Ready (${info.backend}, ${info.dtype})`, `تیار (${info.backend}، ${info.dtype})`) : null}
          {status === "idle" ? t("Model not loaded", "ماڈل لوڈ نہیں") : null}
          {progress?.file || typeof progress?.progress === "number" ? (
            <span data-qalam-ai-progress="true"> {progress.file ?? "model"} {typeof progress.progress === "number" ? `${Math.round(progress.progress)}%` : ""}</span>
          ) : null}
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
        {status === "idle" || status === "error" ? (
          <button type="button" data-qalam-ai-load="true" onMouseDown={keepSelection} onClick={() => void loadModel()} className="mb-2 h-8 w-full rounded bg-[#1A3A2A] text-xs font-semibold text-white">
            {t("Load AI", "اے آئی لوڈ کریں")}
          </button>
        ) : null}
        <button
          type="button"
          data-qalam-ai-generate="true"
          disabled={!capture || (status !== "ready" && status !== "error")}
          onMouseDown={keepSelection}
          onClick={() => void run()}
          className="mb-2 h-8 w-full rounded border border-[#1A3A2A] text-xs font-semibold text-[#1A3A2A] disabled:opacity-40"
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
          <button type="button" data-qalam-ai-retry="true" disabled={!capture || status === "loading" || status === "generating"} onMouseDown={keepSelection} onClick={() => void run()} className="h-7 rounded border border-gray-200 px-2 text-[11px] text-gray-700 disabled:opacity-40">
            {t("Retry", "دوبارہ")}
          </button>
        </div>
      </div>
    </div>
  );
}
