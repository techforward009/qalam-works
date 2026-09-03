"use client";

/**
 * DictationControl — Phase 1 Voice Dictation (browser Web Speech API)
 *
 * Zero-cost. No audio sent to Qalam Works servers.
 * Single microphone acquisition path: recognition.start() only.
 *
 * Supported browsers (conservative allowlist):
 *   Chrome, Edge, Safari
 * Excluded even if webkitSpeechRecognition is present:
 *   Samsung Internet, Opera, Opera Mini, unknown Chromium forks
 *
 * Camera-access policy is enforced at the HTTP header level
 * (Permissions-Policy: camera=(), microphone=(self) in next.config.ts).
 * This component adds no further camera handling.
 *
 * Preserved from original:
 *   - Urdu / English / Mixed language modes and mixed-mode warning
 *   - saved TipTap cursor insertion (position captured at dictation start)
 *   - deterministic voiceDictation.ts punctuation processing
 *   - 2-minute max duration guard
 *   - permission-denied recovery UI (error kind + inline instructions)
 *   - RTL / LTR direction detection via detectBlockDirection
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

// ── Browser capability / allowlist detection ──────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSpeechRecognitionCtor(): (new () => any) | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Conservative allowlist: Chrome, Edge, Safari.
 * Excludes Samsung Internet, Opera, and other Chromium forks that may expose
 * webkitSpeechRecognition but produce inconsistent permission / recognition UX.
 */
function isSupportedBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/SamsungBrowser/i.test(ua)) return false;
  if (/OPR\/|Opera Mini|OPiOS/i.test(ua)) return false;
  const isEdge   = /Edg\//.test(ua);
  const isChrome = /Chrome\//.test(ua) && !isEdge;
  const isSafari = /Safari\//.test(ua) && !/Chrome\//.test(ua);
  return isEdge || isChrome || isSafari;
}

// ── Language → BCP-47 ─────────────────────────────────────────────────────────
// Mixed mode uses ur-PK — one language at a time is a browser constraint,
// surfaced to the user via the ⚠ label and mixedNote tooltip.

const SPEECH_LANG: Record<DictationLanguage, string> = {
  ur:    "ur-PK",
  en:    "en-US",
  mixed: "ur-PK",
};

const MAX_DICTATION_MS = 2 * 60 * 1000; // 2 minutes

// ── Labels ────────────────────────────────────────────────────────────────────

const LABELS = {
  en: {
    dictate:            "Dictate",
    listening:          "Listening…",
    stop:               "Stop",
    errorLabel:         "Mic error",
    dismiss:            "Dismiss",
    langLabel:          "Dictation language",
    langUr:             "Urdu",
    langEn:             "English",
    langMixed:          "Urdu + English ⚠",
    // Privacy / capability notes — shown as native title attributes
    speechNote:         "Qalam Works does not receive or store your audio. Speech recognition is handled by your browser and may use the browser provider's online speech service.",
    mixedNote:          "Urdu + English mode uses Urdu recognition (ur-PK). English words may be recognized with variable accuracy — this is a browser limitation.",
    // Error messages — keyed by SpeechRecognition error code
    permDenied:         "Microphone access is blocked.",
    permHelp:           "How to allow microphone access",
    permInstructions:   "Open this site's permissions in your browser, set Microphone to Allow, then reload the page.",
    permRetry:          "Try again",
    noSpeech:           "No speech detected. Please try again.",
    audioCapture:       "Microphone unavailable. Please close any other app or tab using the microphone, then try again.",
    networkError:       "Browser speech service is unavailable. Please check your connection and try again.",
    langUnavailable:    "The selected dictation language is not available in this browser.",
    unsupportedBrowser: "For reliable microphone-only dictation, please use Chrome, Edge, or Safari.",
    unsupported:        "Voice dictation requires a browser with Web Speech API support (Chrome, Edge, or Safari).",
    recognitionError:   "Speech recognition failed. Please try again.",
  },
  ur: {
    dictate:            "بولیں",
    listening:          "سن رہا ہے…",
    stop:               "رکیں",
    errorLabel:         "مائک کی خرابی",
    dismiss:            "بند کریں",
    langLabel:          "ڈکٹیشن کی زبان",
    langUr:             "اردو",
    langEn:             "انگریزی",
    langMixed:          "اردو + انگریزی ⚠",
    speechNote:         "قلم ورکس آپ کی آڈیو وصول یا محفوظ نہیں کرتا۔ آواز کی شناخت آپ کا براؤزر کرتا ہے اور اس کے لیے براؤزر فراہم کنندہ کی آن لائن سروس استعمال ہو سکتی ہے۔",
    mixedNote:          "اردو + انگریزی موڈ اردو پہچان (ur-PK) استعمال کرتا ہے۔ انگریزی الفاظ کی پہچان متغیر ہو سکتی ہے — یہ براؤزر کی حد ہے۔",
    permDenied:         "مائک کی اجازت نہیں ملی۔",
    permHelp:           "اجازت کیسے دیں؟",
    permInstructions:   "براؤزر میں Qalam Works کی سائٹ کی اجازتیں (Site permissions) کھولیں، Microphone کو Allow کریں، پھر صفحہ دوبارہ لوڈ کریں۔",
    permRetry:          "دوبارہ کوشش کریں",
    noSpeech:           "کوئی آواز نہیں پکڑی گئی۔ دوبارہ کوشش کریں۔",
    audioCapture:       "مائک دستیاب نہیں۔ کوئی دوسری ایپ یا ٹیب مائک استعمال کر رہی ہے تو بند کریں اور دوبارہ کوشش کریں۔",
    networkError:       "براؤزر کی اسپیچ سروس دستیاب نہیں۔ انٹرنیٹ کنکشن چیک کریں اور دوبارہ کوشش کریں۔",
    langUnavailable:    "منتخب ڈکٹیشن زبان اس براؤزر میں دستیاب نہیں۔",
    unsupportedBrowser: "صرف مائک کے ساتھ قابلِ اعتماد ڈکٹیشن کے لیے Chrome، Edge یا Safari استعمال کریں۔",
    unsupported:        "اس براؤزر میں Web Speech API نہیں ہے۔ Chrome، Edge یا Safari استعمال کریں۔",
    recognitionError:   "آواز کی پہچان ناکام ہوئی۔ دوبارہ کوشش کریں۔",
  },
} as const;

// ── Props ─────────────────────────────────────────────────────────────────────

export interface DictationControlProps {
  editor: Editor | null;
  docDir: "rtl" | "ltr";
  isUr: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DictationControl({ editor, docDir, isUr }: DictationControlProps) {
  const lang  = isUr ? "ur" : "en";
  const t     = LABELS[lang];
  const naskh = isUr ? "font-naskh" : "";

  const [state,        setState]       = useState<DictationState>("idle");
  const [errorMsg,     setErrorMsg]    = useState<string>("");
  const [errorKind,    setErrorKind]   = useState<"permission" | "other">("other");
  const [showPermHelp, setShowPermHelp] = useState(false);
  const [dictLang,     setDictLang]    = useState<DictationLanguage>("mixed");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef   = useRef<any>(null);
  const transcriptBufRef = useRef<string>("");
  const maxTimerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** ProseMirror anchor captured synchronously when dictation starts. */
  const savedPosRef      = useRef<number | null>(null);

  // ── Cleanup ───────────────────────────────────────────────────────────────

  const cleanupRecognition = useCallback(() => {
    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onend    = null;
      recognitionRef.current.onerror  = null;
      try { recognitionRef.current.abort(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
    transcriptBufRef.current = "";
  }, []);

  useEffect(() => () => cleanupRecognition(), [cleanupRecognition]);

  // ── Insert at saved cursor (TipTap) ───────────────────────────────────────

  const insertAtSavedPosition = useCallback(
    (rawTranscript: string) => {
      if (!editor) return;

      const processed = processVoiceTranscript(rawTranscript, dictLang);
      if (!processed.trim()) {
        setErrorMsg(t.noSpeech);
        setErrorKind("other");
        setState("error");
        trackEvent("tool_error", {
          tool: "document_studio",
          ...(dictLang !== "mixed" ? { mode: dictLang } : {}),
        });
        return;
      }

      const segments  = splitTranscriptIntoSegments(processed);
      const docSize   = editor.state.doc.content.size;
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
  }, []);

  // ── Start dictation ───────────────────────────────────────────────────────

  const startDictation = useCallback(() => {
    if (!editor) return;

    // ── Capability check ──────────────────────────────────────────────────
    const SpeechRecognitionCtor = getSpeechRecognitionCtor();
    if (!SpeechRecognitionCtor) {
      setErrorMsg(t.unsupported);
      setErrorKind("other");
      setState("error");
      trackEvent("tool_error", { tool: "document_studio" });
      return;
    }

    // ── Browser allowlist check ───────────────────────────────────────────
    if (!isSupportedBrowser()) {
      setErrorMsg(t.unsupportedBrowser);
      setErrorKind("other");
      setState("error");
      trackEvent("tool_error", { tool: "document_studio" });
      return;
    }

    // Capture cursor synchronously before anything can shift focus.
    savedPosRef.current       = editor.state.selection.anchor;
    transcriptBufRef.current  = "";

    trackEvent("tool_open", { tool: "document_studio" });

    // ── Configure SpeechRecognition ───────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition: any = new SpeechRecognitionCtor();
    recognitionRef.current = recognition;

    recognition.lang           = SPEECH_LANG[dictLang];
    recognition.continuous     = true;
    recognition.interimResults = false;

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

    recognition.onend = () => {
      if (maxTimerRef.current) {
        clearTimeout(maxTimerRef.current);
        maxTimerRef.current = null;
      }
      recognitionRef.current = null;
      const raw = transcriptBufRef.current;
      transcriptBufRef.current = "";
      setState("idle");
      if (raw.trim()) insertAtSavedPosition(raw);
      // Silent no-op when raw is empty (e.g. onend after abort in onerror path).
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      const code = event.error as string;

      // "aborted" fires when recognition.abort() is called intentionally
      // (e.g. cleanupRecognition on unmount or error). Do not show an error.
      if (code === "aborted") return;

      let msg: string  = t.recognitionError;
      let kind: "permission" | "other" = "other";

      if (code === "not-allowed" || code === "service-not-allowed") {
        msg  = t.permDenied;
        kind = "permission";
      } else if (code === "no-speech") {
        msg = t.noSpeech;
      } else if (code === "audio-capture") {
        msg = t.audioCapture;
      } else if (code === "network") {
        msg = t.networkError;
      } else if (code === "language-not-supported" || code === "language-unavailable") {
        msg = t.langUnavailable;
      }
      // All other codes fall through to t.recognitionError (generic).

      recognition.onresult = null;
      recognition.onend    = null;
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

    // 2-minute max duration guard
    maxTimerRef.current = setTimeout(() => {
      if (recognitionRef.current) recognitionRef.current.stop();
    }, MAX_DICTATION_MS);

    try {
      recognition.start();
      setState("recording");
    } catch {
      cleanupRecognition();
      savedPosRef.current = null;
      setErrorMsg(t.recognitionError);
      setErrorKind("other");
      setState("error");
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

  // ── Derived ───────────────────────────────────────────────────────────────

  const isRecording  = state === "recording";
  const tooltipText  = dictLang === "mixed" ? t.mixedNote : t.speechNote;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex items-center gap-1" dir="ltr">

      {/* Language selector — only when idle */}
      {state === "idle" && (
        <select
          value={dictLang}
          onChange={e => setDictLang(e.target.value as DictationLanguage)}
          aria-label={t.langLabel}
          title={t.langLabel}
          className={`h-[38px] rounded-md border border-gray-200 bg-white px-2 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1A3A2A]/25 ${naskh}`}
        >
          <option value="mixed">{t.langMixed}</option>
          <option value="ur">{t.langUr}</option>
          <option value="en">{t.langEn}</option>
        </select>
      )}

      {/* Mic button — native title for discoverability, no layout-disrupting tooltip */}
      <button
        type="button"
        onClick={isRecording ? stopDictation : state === "idle" ? startDictation : undefined}
        disabled={state !== "idle" && !isRecording}
        title={tooltipText}
        aria-label={isRecording ? t.stop : t.dictate}
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

      {/* Error — permission-denied branch with recovery path */}
      {state === "error" && errorKind === "permission" ? (
        <div
          className={`flex flex-col gap-1.5 text-[12px] max-w-[260px] ${naskh}`}
          dir={isUr ? "rtl" : "ltr"}
        >
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
            <p className={`text-[11px] text-[#4a6a4a] dark:text-[#9fbfa8] leading-relaxed bg-[#F7F5EF] dark:bg-[#162a1e] border border-[#1A3A2A]/10 rounded px-2 py-1.5 ${naskh}`}>
              {t.permInstructions}
            </p>
          )}
        </div>
      ) : state === "error" ? (
        /* Generic error — message + dismiss */
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
    </div>
  );
}
