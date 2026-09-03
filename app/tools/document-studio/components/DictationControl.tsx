"use client";

/**
 * DictationControl — Phase 1 Voice Dictation MVP
 *
 * Press-to-record / stop / transcribe workflow.
 * No realtime streaming. No audio storage. No auto-start.
 *
 * Insertion strategy: captures the editor selection position when recording
 * BEGINS. When transcription returns, bounds-checks the saved position and
 * inserts at that location. Paragraph-break sequences create new ProseMirror
 * paragraph nodes with per-block direction detection.
 *
 * Privacy: first-use tooltip informs user that audio is sent for transcription.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import type { Editor } from "@tiptap/react";
import { trackEvent } from "../../../lib/analytics";
import { processVoiceTranscript, splitTranscriptIntoSegments, type DictationLanguage } from "../utils/voiceDictation";
import { detectBlockDirection } from "../utils/plainTextToDocNode";

// ── Types ─────────────────────────────────────────────────────────────────────

type DictationState = "idle" | "requesting" | "recording" | "transcribing" | "error";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Maximum recording length in milliseconds. */
const MAX_RECORDING_MS = 2 * 60 * 1000; // 2 minutes

/** Preferred MIME types in order of preference. */
const PREFERRED_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/ogg",
  "audio/mp4",
];

function getSupportedMimeType(): string | null {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") return null;
  for (const t of PREFERRED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return null;
}

// ── Labels ────────────────────────────────────────────────────────────────────

const LABELS = {
  en: {
    dictate:      "Dictate",
    listening:    "Listening…",
    transcribing: "Transcribing…",
    stop:         "Stop",
    errorLabel:   "Mic error",
    dismiss:      "Dismiss",
    langLabel:    "Dictation language",
    langUr:       "Urdu",
    langEn:       "English",
    langMixed:    "Urdu + English",
    privacyNote:  "Audio is sent to a transcription service for processing. No audio is stored.",
    unsupported:  "Voice dictation is not supported in this browser.",
    permDenied:   "Microphone permission denied. Please allow microphone access and try again.",
    emptyResult:  "No speech detected. Please try again.",
    serverError:  "Transcription failed. Please try again.",
    tooLong:      "Recording limit reached. Processing now…",
  },
  ur: {
    dictate:      "بولیں",
    listening:    "سن رہا ہے…",
    transcribing: "تحریر ہو رہا ہے…",
    stop:         "رکیں",
    errorLabel:   "مائک کی خرابی",
    dismiss:      "بند کریں",
    langLabel:    "ڈکٹیشن کی زبان",
    langUr:       "اردو",
    langEn:       "انگریزی",
    langMixed:    "اردو + انگریزی",
    privacyNote:  "آڈیو ٹرانسکرپشن کے لیے سرور کو بھیجی جاتی ہے۔ کوئی آڈیو محفوظ نہیں ہوتی۔",
    unsupported:  "یہ براؤزر ڈکٹیشن کی سہولت نہیں دیتا۔",
    permDenied:   "مائک کی اجازت نہیں ملی۔ اجازت دے کر دوبارہ کوشش کریں۔",
    emptyResult:  "کوئی آواز نہیں پکڑی گئی۔ دوبارہ کوشش کریں۔",
    serverError:  "تحریر ناکام ہوئی۔ دوبارہ کوشش کریں۔",
    tooLong:      "ریکارڈنگ کی حد پوری ہو گئی۔ اب پروسیس ہو رہا ہے…",
  },
} as const;

// ── Component props ───────────────────────────────────────────────────────────

export interface DictationControlProps {
  editor: Editor | null;
  /** Current document direction (used as fallback for new paragraphs). */
  docDir: "rtl" | "ltr";
  isUr: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DictationControl({ editor, docDir, isUr }: DictationControlProps) {
  const lang = isUr ? "ur" : "en";
  const t = LABELS[lang];
  const naskh = isUr ? "font-naskh" : "";

  const [state,        setState]       = useState<DictationState>("idle");
  const [errorMsg,     setErrorMsg]    = useState<string>("");
  const [dictLang,     setDictLang]    = useState<DictationLanguage>("mixed");
  const [showPrivacy,  setShowPrivacy] = useState(false);

  // Refs that survive across renders/state transitions
  const mediaStreamRef    = useRef<MediaStream | null>(null);
  const recorderRef       = useRef<MediaRecorder | null>(null);
  const chunksRef         = useRef<BlobPart[]>([]);
  const mimeTypeRef       = useRef<string>("audio/webm");
  const maxTimerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** ProseMirror anchor position captured when recording begins. */
  const savedPosRef       = useRef<number | null>(null);

  // ── Cleanup helper ────────────────────────────────────────────────────────

  const cleanupStream = useCallback(() => {
    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    recorderRef.current = null;
    chunksRef.current   = [];
  }, []);

  useEffect(() => () => cleanupStream(), [cleanupStream]);

  // ── Insert transcript at saved cursor ─────────────────────────────────────

  const insertAtSavedPosition = useCallback(
    (rawTranscript: string) => {
      if (!editor) return;

      const processed = processVoiceTranscript(rawTranscript, dictLang);
      if (!processed.trim()) {
        setErrorMsg(t.emptyResult);
        setState("error");
        trackEvent("tool_error", { tool: "document_studio", ...(dictLang !== "mixed" ? { mode: dictLang } : {}) });
        return;
      }

      const segments = splitTranscriptIntoSegments(processed);
      const docSize  = editor.state.doc.content.size;
      // Bounds-check the saved position; fall back to current anchor.
      const insertPos = (() => {
        const s = savedPosRef.current;
        if (s !== null && s >= 0 && s <= docSize) return s;
        return editor.state.selection.anchor;
      })();

      // Build TipTap insertable content from segments.
      // Single-paragraph: plain string (TipTap handles inline).
      // Multi-paragraph: array of paragraph nodes with per-block dir.
      if (segments.length === 1 && !segments[0].isParagraphBreak) {
        editor
          .chain()
          .focus()
          .insertContentAt(insertPos, segments[0].text)
          .run();
      } else {
        // Build paragraph nodes
        const nodes = [];
        let currentText = "";

        for (const seg of segments) {
          if (seg.isParagraphBreak) {
            if (currentText) {
              nodes.push({
                type: "paragraph",
                attrs: { dir: detectBlockDirection(currentText, docDir) },
                content: [{ type: "text", text: currentText }],
              });
              currentText = "";
            }
          } else {
            currentText = currentText ? currentText + " " + seg.text : seg.text;
          }
        }
        if (currentText) {
          nodes.push({
            type: "paragraph",
            attrs: { dir: detectBlockDirection(currentText, docDir) },
            content: [{ type: "text", text: currentText }],
          });
        }

        if (nodes.length > 0) {
          editor.chain().focus().insertContentAt(insertPos, nodes).run();
        }
      }

      savedPosRef.current = null;
      trackEvent("tool_process", { tool: "document_studio", ...(dictLang !== "mixed" ? { mode: dictLang } : {}) });
    },
    [editor, dictLang, docDir, t]
  );

  // ── Transcription ─────────────────────────────────────────────────────────

  const transcribe = useCallback(
    async (blob: Blob, mimeType: string) => {
      setState("transcribing");

      const form = new FormData();
      form.append("audio", blob, `recording.${mimeType.split("/")[1]?.split(";")[0] ?? "webm"}`);
      form.append("language", dictLang === "mixed" ? "mixed" : dictLang);

      try {
        const resp = await fetch("/api/document-studio/transcribe", {
          method: "POST",
          body: form,
        });
        const data = await resp.json();

        if (!resp.ok || typeof data.text !== "string") {
          throw new Error(data.error ?? "Transcription failed");
        }

        insertAtSavedPosition(data.text);
        setState("idle");
        trackEvent("tool_copy", { tool: "document_studio" }); // dictation_completed maps to tool_copy per analytics schema
      } catch (e) {
        console.error("[DictationControl] transcription error:", (e as Error).message);
        setErrorMsg(t.serverError);
        setState("error");
        trackEvent("tool_error", { tool: "document_studio", ...(dictLang !== "mixed" ? { mode: dictLang } : {}) });
      }
    },
    [dictLang, insertAtSavedPosition, t]
  );

  // ── Stop recording ────────────────────────────────────────────────────────

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    recorder.stop(); // triggers onstop → transcription
  }, []);

  // ── Start recording ───────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    if (!editor) return;

    // ── Check browser support ─────────────────────────────────────────────
    if (typeof navigator === "undefined" ||
        typeof navigator.mediaDevices?.getUserMedia !== "function") {
      setErrorMsg(t.unsupported);
      setState("error");
      return;
    }
    const mimeType = getSupportedMimeType();
    if (!mimeType) {
      setErrorMsg(t.unsupported);
      setState("error");
      return;
    }
    mimeTypeRef.current = mimeType;

    // Capture cursor before anything async changes focus
    savedPosRef.current = editor.state.selection.anchor;

    setState("requesting");
    trackEvent("tool_open", { tool: "document_studio" }); // dictation_started

    // ── Request microphone ────────────────────────────────────────────────
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (e) {
      const name = (e as { name?: string }).name ?? "";
      setErrorMsg(name === "NotAllowedError" || name === "PermissionDeniedError"
        ? t.permDenied
        : t.unsupported);
      setState("error");
      savedPosRef.current = null;
      trackEvent("tool_error", { tool: "document_studio", ...(dictLang !== "mixed" ? { mode: dictLang } : {}) });
      return;
    }

    mediaStreamRef.current = stream;
    chunksRef.current = [];

    // ── Create MediaRecorder ──────────────────────────────────────────────
    const recorder = new MediaRecorder(stream, { mimeType });
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      cleanupStream();
      const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
      chunksRef.current = [];
      if (blob.size === 0) {
        setErrorMsg(t.emptyResult);
        setState("error");
        return;
      }
      transcribe(blob, mimeTypeRef.current);
    };

    recorder.onerror = () => {
      cleanupStream();
      setErrorMsg(t.serverError);
      setState("error");
      trackEvent("tool_error", { tool: "document_studio", ...(dictLang !== "mixed" ? { mode: dictLang } : {}) });
    };

    // ── Max duration enforcer ─────────────────────────────────────────────
    maxTimerRef.current = setTimeout(() => {
      if (recorderRef.current?.state === "recording") {
        recorderRef.current.stop();
      }
    }, MAX_RECORDING_MS);

    recorder.start(1000); // collect chunks every second
    setState("recording");
  }, [editor, cleanupStream, transcribe, t, dictLang]);

  // ── Dismiss error ─────────────────────────────────────────────────────────
  const dismissError = () => {
    setErrorMsg("");
    setState("idle");
    cleanupStream();
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const isRecording     = state === "recording";
  const isBusy          = state !== "idle" && state !== "error";
  const btnLabel = state === "recording"
    ? t.stop
    : state === "requesting"
    ? "…"
    : state === "transcribing"
    ? t.transcribing
    : t.dictate;

  const btnTitle = showPrivacy
    ? ""
    : `${t.dictate} — ${t.privacyNote}`;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex items-center gap-1" dir="ltr">

      {/* Dictation language selector — only when idle */}
      {state === "idle" && (
        <select
          value={dictLang}
          onChange={e => setDictLang(e.target.value as DictationLanguage)}
          aria-label={t.langLabel}
          className={`h-[38px] rounded-md border border-gray-200 bg-white px-2 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1A3A2A]/25 ${naskh}`}
        >
          <option value="mixed">{t.langMixed}</option>
          <option value="ur">{t.langUr}</option>
          <option value="en">{t.langEn}</option>
        </select>
      )}

      {/* Primary mic button */}
      <button
        type="button"
        onClick={isRecording ? stopRecording : state === "idle" ? startRecording : undefined}
        disabled={isBusy && !isRecording}
        title={btnTitle}
        onMouseEnter={() => setShowPrivacy(true)}
        onMouseLeave={() => setShowPrivacy(false)}
        className={`h-[38px] px-3 rounded-md text-sm font-semibold border transition-all flex items-center gap-1.5 ${
          isRecording
            ? "bg-red-50 text-red-700 border-red-300 hover:border-red-400 animate-pulse"
            : state === "transcribing" || state === "requesting"
            ? "bg-amber-50 text-amber-700 border-amber-200 cursor-wait"
            : state === "error"
            ? "bg-red-50 text-red-600 border-red-200"
            : "bg-white text-gray-700 border-gray-200 hover:border-[#B8935A] hover:text-[#1A3A2A]"
        } ${naskh}`}
      >
        {/* Icon */}
        <span aria-hidden="true">
          {isRecording ? "⏹" : state === "transcribing" ? "⏳" : "🎙"}
        </span>
        <span>{btnLabel}</span>
      </button>

      {/* Error state */}
      {state === "error" && (
        <div className={`flex items-center gap-1.5 text-[12px] text-red-600 max-w-[220px] ${naskh}`}>
          <span>{errorMsg || t.errorLabel}</span>
          <button
            type="button"
            onClick={dismissError}
            className="underline text-red-500 hover:text-red-700 shrink-0"
          >
            {t.dismiss}
          </button>
        </div>
      )}

      {/* Privacy tooltip on hover (first-use awareness) */}
      {showPrivacy && state === "idle" && (
        <div
          className={`absolute mt-12 z-50 bg-[#1A3A2A] text-white text-[11px] rounded-lg px-3 py-2 max-w-[260px] leading-snug pointer-events-none shadow-lg ${naskh}`}
          role="tooltip"
        >
          {t.privacyNote}
        </div>
      )}
    </div>
  );
}
