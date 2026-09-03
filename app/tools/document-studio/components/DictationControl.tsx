"use client";

/**
 * DictationControl — Phase 1 Voice Dictation (zero-cost browser implementation)
 *
 * Uses the browser Web Speech API (SpeechRecognition / webkitSpeechRecognition).
 * No audio is sent to Qalam Works servers. No API key required.
 * The server route at /api/document-studio/transcribe is retained for a future
 * optional high-accuracy provider but is NOT called in this implementation.
 *
 * Workflow:
 *   User clicks mic → recognition.start() → browser asks mic permission →
 *   onresult accumulates final speech segments →
 *   User clicks Stop (or timeout) → recognition.stop() →
 *   onend fires → processVoiceTranscript() → insertContentAt(savedPos)
 *
 * Insertion strategy (unchanged from original):
 *   Cursor position captured synchronously when dictation starts.
 *   Bounds-checked and inserted via editor.chain().insertContentAt() on completion.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import type { Editor } from "@tiptap/react";
import { trackEvent } from "../../../lib/analytics";
import {
  processVoiceTranscript,
  splitTranscriptIntoSegments,
  type DictationLanguage,
} from "../utils/voiceDictation";
import { detectBlockDirection } from "../utils/plainTextToDocNode";

// ── Types ─────────────────────────────────────────────────────────────────────

type DictationState = "idle" | "recording" | "error";

// ── Browser capability detection ─────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSpeechRecognitionCtor(): (new () => any) | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// ── Language → BCP-47 map ─────────────────────────────────────────────────────
//
// Web Speech API only accepts one language at a time; "mixed" mode is inherently
// limited. We use ur-PK for mixed and surface this limitation to the user.

const SPEECH_LANG: Record<DictationLanguage, string> = {
  ur:    "ur-PK",
  en:    "en-US",
  mixed: "ur-PK", // browser limitation — labeled "experimental" in the UI
};

/** Maximum continuous recognition duration in ms before auto-stop. */
const MAX_DICTATION_MS = 2 * 60 * 1000; // 2 minutes

// ── Labels ────────────────────────────────────────────────────────────────────

const LABELS = {
  en: {
    dictate:          "Dictate",
    listening:        "Listening…",
    stop:             "Stop",
    errorLabel:       "Mic error",
    dismiss:          "Dismiss",
    langLabel:        "Dictation language",
    langUr:           "Urdu",
    langEn:           "English",
    langMixed:        "Urdu + English ⚠",
    speechNote:       "Qalam Works does not receive or store your audio. Speech recognition is handled by your browser and may use the browser provider's online speech service.",
    mixedNote:        "Urdu + English mode uses Urdu recognition (ur-PK). English words may be recognized with variable accuracy — this is a browser limitation.",
    unsupported:      "Voice dictation requires a browser with Web Speech API support (Chrome, Edge, or Safari).",
    permDenied:       "Microphone access is blocked.",
    permHelp:         "How to allow microphone access",
    permInstructions: "Open this site's permissions in your browser, set Microphone to Allow, then reload the page.",
    permRetry:        "Try again",
    emptyResult:      "No speech detected. Please try again.",
    recognitionError: "Speech recognition failed. Please try again.",
    tooLong:          "Maximum dictation time reached. Inserting now…",
  },
  ur: {
    dictate:          "بولیں",
    listening:        "سن رہا ہے…",
    stop:             "رکیں",
    errorLabel:       "مائک کی خرابی",
    dismiss:          "بند کریں",
    langLabel:        "ڈکٹیشن کی زبان",
    langUr:           "اردو",
    langEn:           "انگریزی",
    langMixed:        "اردو + انگریزی ⚠",
    speechNote:       "قلم ورکس آپ کی آڈیو وصول یا محفوظ نہیں کرتا۔ آواز کی شناخت آپ کا براؤزر کرتا ہے اور اس کے لیے براؤزر فراہم کنندہ کی آن لائن سروس استعمال ہو سکتی ہے۔",
    mixedNote:        "اردو + انگریزی موڈ اردو پہچان (ur-PK) استعمال کرتا ہے۔ انگریزی الفاظ کی پہچان متغیر ہو سکتی ہے — یہ براؤزر کی حد ہے۔",
    unsupported:      "اس براؤزر میں Web Speech API نہیں ہے۔ Chrome، Edge یا Safari استعمال کریں۔",
    permDenied:       "مائک کی اجازت نہیں ملی۔",
    permHelp:         "اجازت کیسے دیں؟",
    permInstructions: "براؤزر میں Qalam Works کی سائٹ کی اجازتیں (Site permissions) کھولیں، Microphone کو Allow کریں، پھر صفحہ دوبارہ لوڈ کریں۔",
    permRetry:        "دوبارہ کوشش کریں",
    emptyResult:      "کوئی آواز نہیں پکڑی گئی۔ دوبارہ کوشش کریں۔",
    recognitionError: "آواز کی پہچان ناکام ہوئی۔ دوبارہ کوشش کریں۔",
    tooLong:          "زیادہ سے زیادہ وقت ختم ہو گیا۔ اب متن شامل کیا جا رہا ہے…",
  },
} as const;

// ── Component props ───────────────────────────────────────────────────────────

export interface DictationControlProps {
  editor: Editor | null;
  docDir: "rtl" | "ltr";
  isUr: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DictationControl({ editor, docDir, isUr }: DictationControlProps) {
  const lang = isUr ? "ur" : "en";
  const t = LABELS[lang];
  const naskh = isUr ? "font-naskh" : "";

  const [state,       setState]      = useState<DictationState>("idle");
  const [errorMsg,    setErrorMsg]   = useState<string>("");
  /** "permission" for not-allowed errors; "other" for everything else. */
  const [errorKind,   setErrorKind]  = useState<"permission" | "other">("other");
  const [showPermHelp, setShowPermHelp] = useState(false);
  const [dictLang,    setDictLang]   = useState<DictationLanguage>("mixed");
  const [showTooltip, setShowTooltip] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef    = useRef<any>(null);
  const transcriptBufRef  = useRef<string>("");
  const maxTimerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** ProseMirror anchor position captured when dictation starts. */
  const savedPosRef       = useRef<number | null>(null);

  // ── Cleanup ───────────────────────────────────────────────────────────────

  const cleanupRecognition = useCallback(() => {
    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
    if (recognitionRef.current) {
      recognitionRef.current.onresult  = null;
      recognitionRef.current.onend     = null;
      recognitionRef.current.onerror   = null;
      try { recognitionRef.current.abort(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    transcriptBufRef.current = "";
  }, []);

  useEffect(() => () => cleanupRecognition(), [cleanupRecognition]);

  // ── Insert at saved cursor (unchanged from original) ─────────────────────

  const insertAtSavedPosition = useCallback(
    (rawTranscript: string) => {
      if (!editor) return;

      const processed = processVoiceTranscript(rawTranscript, dictLang);
      if (!processed.trim()) {
        setErrorMsg(t.emptyResult);
        setState("error");
        trackEvent("tool_error", {
          tool: "document_studio",
          ...(dictLang !== "mixed" ? { mode: dictLang } : {}),
        });
        return;
      }

      const segments = splitTranscriptIntoSegments(processed);
      const docSize  = editor.state.doc.content.size;
      const insertPos = (() => {
        const s = savedPosRef.current;
        if (s !== null && s >= 0 && s <= docSize) return s;
        return editor.state.selection.anchor;
      })();

      if (segments.length === 1 && !segments[0].isParagraphBreak) {
        editor.chain().focus().insertContentAt(insertPos, segments[0].text).run();
      } else {
        const nodes: object[] = [];
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
      trackEvent("tool_process", {
        tool: "document_studio",
        ...(dictLang !== "mixed" ? { mode: dictLang } : {}),
      });
    },
    [editor, dictLang, docDir, t]
  );

  // ── Stop dictation ────────────────────────────────────────────────────────

  const stopDictation = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
    }
    // onend will fire and handle insertion + state reset
  }, []);

  // ── Start dictation ───────────────────────────────────────────────────────

  const startDictation = useCallback(() => {
    if (!editor) return;

    // ── Capability check ──────────────────────────────────────────────────
    const SpeechRecognitionCtor = getSpeechRecognitionCtor();
    if (!SpeechRecognitionCtor) {
      setErrorMsg(t.unsupported);
      setState("error");
      trackEvent("tool_error", { tool: "document_studio" });
      return;
    }

    // Capture cursor position synchronously before anything can shift focus.
    savedPosRef.current = editor.state.selection.anchor;
    transcriptBufRef.current = "";

    trackEvent("tool_open", { tool: "document_studio" });

    // ── Create and configure SpeechRecognition ────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition: any = new SpeechRecognitionCtor();
    recognitionRef.current = recognition;

    recognition.lang            = SPEECH_LANG[dictLang];
    recognition.continuous      = true;  // keep listening until stop()
    recognition.interimResults  = false; // final segments only — more accurate

    // Accumulate all final speech segments into the buffer.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          const seg = event.results[i][0].transcript ?? "";
          if (seg.trim()) {
            transcriptBufRef.current +=
              (transcriptBufRef.current ? " " : "") + seg.trim();
          }
        }
      }
    };

    // onend fires after stop() or on browser-side silence timeout.
    recognition.onend = () => {
      if (maxTimerRef.current) {
        clearTimeout(maxTimerRef.current);
        maxTimerRef.current = null;
      }
      recognitionRef.current = null;
      const raw = transcriptBufRef.current;
      transcriptBufRef.current = "";
      setState("idle");
      if (raw.trim()) {
        insertAtSavedPosition(raw);
      }
      // If raw is empty, we silently no-op (onend from abort on error
      // already set the error state before calling abort).
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      const code = event.error;
      let msg: string = t.recognitionError;
      let kind: "permission" | "other" = "other";
      if (code === "not-allowed" || code === "service-not-allowed") {
        msg = t.permDenied;
        kind = "permission";
      } else if (code === "no-speech") {
        msg = t.emptyResult;
      }
      // Nullify handlers to prevent onend from trying to insert empty buffer
      recognition.onresult = null;
      recognition.onend = null;
      cleanupRecognition();
      savedPosRef.current = null;
      setErrorMsg(msg);
      setErrorKind(kind);
      setShowPermHelp(false);
      setState("error");
      trackEvent("tool_error", {
        tool: "document_studio",
        ...(dictLang !== "mixed" ? { mode: dictLang } : {}),
      });
    };

    // Max duration guard — stop after 2 minutes
    maxTimerRef.current = setTimeout(() => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }, MAX_DICTATION_MS);

    // ── Microphone-only permission preflight ──────────────────────────────
    // Explicitly request audio:true, video:false to ensure the browser shows
    // a microphone-only permission prompt — never camera. On success, every
    // returned track is stopped immediately; no audio is recorded or retained.
    // If getUserMedia is unavailable (older Safari), fall through directly to
    // SpeechRecognition.start() which handles its own permission prompt.
    const runRecognition = () => {
      try {
        recognition.start();
        setState("recording");
      } catch {
        cleanupRecognition();
        savedPosRef.current = null;
        setErrorMsg(t.recognitionError);
        setState("error");
      }
    };

    if (
      typeof navigator !== "undefined" &&
      typeof navigator.mediaDevices?.getUserMedia === "function"
    ) {
      navigator.mediaDevices
        .getUserMedia({ audio: true, video: false })
        .then((stream) => {
          // Permission granted — discard the stream immediately.
          // We do NOT record from this stream; it served only to trigger
          // the browser's microphone-only permission prompt explicitly.
          stream.getTracks().forEach((track) => track.stop());
          runRecognition();
        })
        .catch((err: unknown) => {
          cleanupRecognition();
          savedPosRef.current = null;
          const name = (err as { name?: string }).name ?? "";
          const isPermission =
            name === "NotAllowedError" ||
            name === "SecurityError" ||
            name === "PermissionDeniedError";
          setErrorMsg(isPermission ? t.permDenied : t.recognitionError);
          setErrorKind(isPermission ? "permission" : "other");
          setShowPermHelp(false);
          setState("error");
          trackEvent("tool_error", {
            tool: "document_studio",
            ...(dictLang !== "mixed" ? { mode: dictLang } : {}),
          });
        });
    } else {
      // getUserMedia unavailable (some older or restricted browsers).
      // Fall through to SpeechRecognition directly; it will handle
      // its own permission prompt.
      runRecognition();
    }
  }, [editor, dictLang, insertAtSavedPosition, cleanupRecognition, t]);

  // ── Dismiss error ─────────────────────────────────────────────────────────

  const dismissError = useCallback(() => {
    setErrorMsg("");
    setErrorKind("other");
    setShowPermHelp(false);
    setState("idle");
    cleanupRecognition();
    savedPosRef.current = null;
  }, [cleanupRecognition]);

  // ── Derived UI state ──────────────────────────────────────────────────────

  const isRecording = state === "recording";

  const btnLabel =
    state === "recording" ? t.stop : t.dictate;

  const tooltipText =
    dictLang === "mixed" ? t.mixedNote : t.speechNote;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="relative flex items-center gap-1" dir="ltr">

      {/* Language selector — hidden while recording */}
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

      {/* Mic button */}
      <button
        type="button"
        onClick={isRecording ? stopDictation : state === "idle" ? startDictation : undefined}
        disabled={state !== "idle" && !isRecording}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label={btnLabel}
        className={`h-[38px] px-3 rounded-md text-sm font-semibold border transition-all flex items-center gap-1.5 ${
          isRecording
            ? "bg-red-50 text-red-700 border-red-300 hover:border-red-400 animate-pulse"
            : state === "error"
            ? "bg-red-50 text-red-600 border-red-200"
            : "bg-white text-gray-700 border-gray-200 hover:border-[#B8935A] hover:text-[#1A3A2A]"
        } ${naskh}`}
      >
        <span aria-hidden="true">{isRecording ? "⏹" : "🎙"}</span>
        <span>{isRecording ? t.stop : t.dictate}</span>
      </button>

      {/* Error message */}
      {state === "error" && errorKind === "permission" ? (
        /* Permission-denied: show actionable recovery path */
        <div className={`flex flex-col gap-1.5 text-[12px] max-w-[260px] ${naskh}`} dir={isUr ? "rtl" : "ltr"}>
          <span className="text-red-600 font-medium">{errorMsg}</span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPermHelp(v => !v)}
              className="text-[#1A3A2A] underline underline-offset-2 hover:text-[#B8935A] shrink-0"
            >
              {t.permHelp}
            </button>
            <button
              type="button"
              onClick={() => { dismissError(); startDictation(); }}
              className="bg-[#1A3A2A] text-white rounded px-2 py-0.5 hover:bg-[#244E38] transition-colors shrink-0"
            >
              {t.permRetry}
            </button>
            <button
              type="button"
              onClick={dismissError}
              className="text-gray-400 hover:text-gray-600 underline shrink-0"
            >
              {t.dismiss}
            </button>
          </div>
          {showPermHelp && (
            <p className="text-[11px] text-[#4a6a4a] dark:text-[#9fbfa8] leading-relaxed bg-[#F7F5EF] dark:bg-[#162a1e] border border-[#1A3A2A]/10 rounded px-2 py-1.5">
              {t.permInstructions}
            </p>
          )}
        </div>
      ) : state === "error" ? (
        /* Generic error: message + dismiss only */
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
      ) : null}

      {/* Tooltip — speech note or mixed-mode warning */}
      {showTooltip && state === "idle" && (
        <div
          role="tooltip"
          className={`absolute top-full mt-1 z-50 bg-[#1A3A2A] text-white text-[11px] rounded-lg px-3 py-2 max-w-[280px] leading-snug pointer-events-none shadow-lg ${naskh}`}
        >
          {tooltipText}
        </div>
      )}
    </div>
  );
}
