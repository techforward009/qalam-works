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
 *
 * ── Session model ───────────────────────────────────────────────────────────
 *
 * A LOGICAL SESSION spans from the user clicking Dictate until finalisation.
 * Inside a logical session, the browser's SpeechRecognition instance may end
 * multiple times (e.g. Chrome auto-stops after a short silence). When that
 * happens we restart recognition automatically rather than finalising.
 *
 * Timers:
 *   maxTimerRef      — 2-minute hard limit on the logical session
 *   silenceTimerRef  — 12-second inactivity grace; resets on each new final
 *                      speech result; fires → finalise
 *   restartTimerRef  — 150ms delay before restarting browser recognition after
 *                      a browser auto-end, to avoid rapid-restart loops
 *
 * Key refs:
 *   sessionActiveRef — true while the logical session is running
 *   manualStopRef    — true when the user presses Stop (do not restart)
 *   finalizeSessionRef — ref to the finalise fn so stopDictation can call it
 *                        even when browser recognition is not currently running
 *
 * "no-speech" error during an active session is treated as soft silence
 * (allow the grace period / restart), NOT as a fatal error.
 *
 * Fatal errors (end the session immediately):
 *   not-allowed, service-not-allowed, audio-capture, network,
 *   language-not-supported, language-unavailable
 *
 * ── Direction fix ───────────────────────────────────────────────────────────
 *
 * Single-segment dictation now calls detectBlockDirection on the dictated text
 * and updates the containing block's dir attribute, so Urdu text dictated into
 * an empty or existing paragraph gets RTL direction persisted in the ProseMirror
 * document (same as multi-paragraph dictation already did).
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

const SPEECH_LANG: Record<DictationLanguage, string> = {
  ur:    "ur-PK",
  en:    "en-US",
  mixed: "ur-PK",
};

const MAX_DICTATION_MS  = 2 * 60 * 1000; // 2 minutes — absolute session limit
const SILENCE_GRACE_MS  = 12_000;         // 12 s inactivity before auto-finalise
const RESTART_DELAY_MS  = 150;            // ms delay before restarting browser recognition

// ── Labels ────────────────────────────────────────────────────────────────────

const LABELS = {
  en: {
    dictate:            "Dictate",
    stop:               "Stop",
    errorLabel:         "Mic error",
    dismiss:            "Dismiss",
    langLabel:          "Dictation language",
    langUr:             "Urdu",
    langEn:             "English",
    langMixed:          "Urdu + English ⚠",
    speechNote:         "Qalam Works does not receive or store your audio. Speech recognition is handled by your browser and may use the browser provider's online speech service.",
    mixedNote:          "Urdu + English mode uses Urdu recognition (ur-PK). English words may be recognized with variable accuracy — this is a browser limitation.",
    permDenied:         "Microphone access is blocked.",
    serviceNotAllowed:  "Your browser's speech recognition service is unavailable or blocked. Try a current version of Chrome, Edge, or Safari.",
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
    serviceNotAllowed:  "آپ کے براؤزر کی آواز پہچاننے والی سروس دستیاب نہیں یا بلاک ہے۔ Chrome، Edge یا Safari کا موجودہ ورژن استعمال کریں۔",
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

  const [state,        setState]      = useState<DictationState>("idle");
  const [errorMsg,     setErrorMsg]   = useState<string>("");
  const [errorKind,    setErrorKind]  = useState<"permission" | "other">("other");
  const [showPermHelp, setShowPermHelp] = useState(false);
  const [dictLang,     setDictLang]   = useState<DictationLanguage>("mixed");

  // ── Session lifecycle refs ────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef     = useRef<any>(null);
  const transcriptBufRef   = useRef<string>("");
  const savedPosRef        = useRef<number | null>(null);

  // Session-level control refs
  const sessionActiveRef   = useRef<boolean>(false);
  const manualStopRef      = useRef<boolean>(false);
  const finalizeSessionRef = useRef<(() => void) | null>(null);

  // Timer refs
  const maxTimerRef        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Full cleanup (unmount / dismiss) ─────────────────────────────────────

  const cleanupAll = useCallback(() => {
    sessionActiveRef.current   = false;
    manualStopRef.current      = false;
    finalizeSessionRef.current = null;

    for (const r of [maxTimerRef, silenceTimerRef, restartTimerRef] as const) {
      if (r.current) { clearTimeout(r.current); r.current = null; }
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

  useEffect(() => () => cleanupAll(), [cleanupAll]);

  // ── Insert at saved cursor (TipTap) ───────────────────────────────────────
  //
  // Single-segment: inserts the text, then updates the containing block's
  // dir attribute using detectBlockDirection on the dictated text so that
  // Urdu text in an empty paragraph gets RTL persisted (Issue 2 fix).
  //
  // Multi-segment: each paragraph node already gets a per-block dir attr.

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

      const segments = splitTranscriptIntoSegments(processed);
      const docSize  = editor.state.doc.content.size;
      const insertPos = (() => {
        const s = savedPosRef.current;
        if (s !== null && s >= 0 && s <= docSize) return s;
        return editor.state.selection.anchor;
      })();

      if (segments.length === 1 && !segments[0].isParagraphBreak) {
        // ── Single inline segment ─────────────────────────────────────────
        const newText = segments[0].text;

        // Step 1: insert the text at the saved position.
        editor.chain().focus().insertContentAt(insertPos, newText).run();

        // Step 2: determine direction from the FULL resulting block content
        // and persist it with a position-targeted ProseMirror transaction.
        //
        // We use setNodeMarkup so we can target the exact node by position
        // rather than relying on the current selection (which updateAttributes
        // depends on and which focus() may shift unpredictably).
        try {
          const postState = editor.state;
          // Cursor after insertion; clamp to valid range.
          const anchor = Math.min(
            postState.selection.anchor,
            postState.doc.content.size - 1
          );
          const $pos = postState.doc.resolve(anchor);

          // Walk up to find the innermost block node (paragraph / heading).
          for (let d = $pos.depth; d >= 0; d--) {
            const node = $pos.node(d);
            if (
              node.type.isBlock &&
              (node.type.name === "paragraph" || node.type.name === "heading")
            ) {
              // Full textContent of the block after insertion.
              const fullText = node.textContent;
              const newDir   = detectBlockDirection(fullText, docDir);

              if (node.attrs.dir !== newDir) {
                // $pos.before(d) = position of the node's opening token.
                const nodePos = $pos.before(d);
                const tr = postState.tr.setNodeMarkup(
                  nodePos,
                  undefined,                          // same node type
                  { ...node.attrs, dir: newDir },     // updated dir, all other attrs preserved
                  node.marks
                );
                editor.view.dispatch(tr);
              }
              break;
            }
          }
        } catch {
          // Non-fatal: direction update is best-effort.
        }
      } else {
        // ── Multi-paragraph segments ──────────────────────────────────────
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

  // ── Stop dictation (user-initiated) ──────────────────────────────────────

  const stopDictation = useCallback(() => {
    manualStopRef.current = true;

    if (recognitionRef.current) {
      // Recognition is running → stop it → onend fires → sees manualStopRef
      // → finalises immediately.
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
    } else if (sessionActiveRef.current) {
      // In restart-delay window: cancel pending restart, finalise now.
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      finalizeSessionRef.current?.();
    }
  }, []);

  // ── Start dictation (user-initiated) ─────────────────────────────────────

  const startDictation = useCallback(() => {
    if (!editor) return;

    const SpeechRecognitionCtor = getSpeechRecognitionCtor();
    if (!SpeechRecognitionCtor) {
      setErrorMsg(t.unsupported);
      setErrorKind("other");
      setState("error");
      trackEvent("tool_error", { tool: "document_studio" });
      return;
    }
    if (!isSupportedBrowser()) {
      setErrorMsg(t.unsupportedBrowser);
      setErrorKind("other");
      setState("error");
      trackEvent("tool_error", { tool: "document_studio" });
      return;
    }

    // Capture cursor synchronously before any async work shifts focus.
    savedPosRef.current      = editor.state.selection.anchor;
    transcriptBufRef.current = "";
    sessionActiveRef.current = true;
    manualStopRef.current    = false;

    trackEvent("tool_open", { tool: "document_studio" });

    // ── Helpers defined in this closure so they share the same ctor/lang ──

    function clearSilenceTimer() {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    }

    /**
     * Finalise the logical session: stop all timers, insert the accumulated
     * transcript, and return to idle. Idempotent.
     */
    function finalizeSession() {
      if (!sessionActiveRef.current) return; // already finalised
      sessionActiveRef.current   = false;
      manualStopRef.current      = false;
      finalizeSessionRef.current = null;

      clearSilenceTimer();
      for (const r of [maxTimerRef, restartTimerRef] as const) {
        if (r.current) { clearTimeout(r.current); r.current = null; }
      }
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend    = null;
        recognitionRef.current.onerror  = null;
        try { recognitionRef.current.abort(); } catch { /* ignore */ }
        recognitionRef.current = null;
      }

      const raw = transcriptBufRef.current;
      transcriptBufRef.current = "";
      setState("idle");
      if (raw.trim()) insertAtSavedPosition(raw);
      savedPosRef.current = null;
    }

    // Store so stopDictation can call it during restart-delay windows.
    finalizeSessionRef.current = finalizeSession;

    /**
     * End the session with a fatal error (not-allowed etc.).
     * Shows the appropriate localised error UI.
     */
    function endWithError(msg: string, kind: "permission" | "other") {
      sessionActiveRef.current   = false;
      finalizeSessionRef.current = null;

      clearSilenceTimer();
      for (const r of [maxTimerRef, restartTimerRef] as const) {
        if (r.current) { clearTimeout(r.current); r.current = null; }
      }
      recognitionRef.current   = null;
      transcriptBufRef.current = "";
      savedPosRef.current      = null;

      setErrorMsg(msg);
      setErrorKind(kind);
      setShowPermHelp(false);
      setState("error");
      trackEvent("tool_error", {
        tool: "document_studio",
        ...(dictLang !== "mixed" ? { mode: dictLang } : {}),
      });
    }

    /**
     * Start (or restart) the browser-level SpeechRecognition instance.
     * Called once at session start and again on each browser auto-end.
     */
    function startBrowserRecognition() {
      if (!sessionActiveRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition: any = new SpeechRecognitionCtor!();
      recognitionRef.current = recognition;

      recognition.lang           = SPEECH_LANG[dictLang];
      recognition.continuous     = true;
      recognition.interimResults = false;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        // New speech received → cancel any pending silence timer.
        clearSilenceTimer();
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
        recognitionRef.current = null;
        if (!sessionActiveRef.current) return; // session already ended

        if (manualStopRef.current) {
          // User pressed Stop → finalise immediately.
          finalizeSession();
          return;
        }

        // Browser auto-ended (short silence) → restart after a brief delay.
        //
        // CRITICAL: only start the 12-second inactivity timer if one is NOT
        // already running. Repeated auto-end events during the same silence
        // period must NOT reset/extend the deadline — that would prevent
        // finalization. The timer is only cleared by a new final speech result
        // in onresult, which allows a fresh 12s window after the next auto-end.
        if (!silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            silenceTimerRef.current = null;
            if (sessionActiveRef.current) finalizeSession();
          }, SILENCE_GRACE_MS);
        }

        restartTimerRef.current = setTimeout(() => {
          restartTimerRef.current = null;
          if (sessionActiveRef.current && !manualStopRef.current) {
            startBrowserRecognition();
          }
        }, RESTART_DELAY_MS);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        const code = event.error as string;

        // Intentional abort — no visible error.
        if (code === "aborted") return;

        // "no-speech" during an active session is a soft silence event.
        // Allow the grace-period / restart path rather than showing an error.
        if (code === "no-speech" && sessionActiveRef.current) {
          recognition.onresult = null;
          recognition.onend    = null;
          recognitionRef.current = null;

          // Same guard as onend: don't extend the deadline if a timer is running.
          if (!silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              silenceTimerRef.current = null;
              if (sessionActiveRef.current) finalizeSession();
            }, SILENCE_GRACE_MS);
          }

          restartTimerRef.current = setTimeout(() => {
            restartTimerRef.current = null;
            if (sessionActiveRef.current && !manualStopRef.current) {
              startBrowserRecognition();
            }
          }, RESTART_DELAY_MS);
          return;
        }

        // Fatal errors — end the session with the appropriate message.
        recognition.onresult = null;
        recognition.onend    = null;

        let msg: string = t.recognitionError;
        let kind: "permission" | "other" = "other";

        if (code === "not-allowed") {
          msg  = t.permDenied;
          kind = "permission";
        } else if (code === "service-not-allowed") {
          msg = t.serviceNotAllowed;
        } else if (code === "audio-capture") {
          msg = t.audioCapture;
        } else if (code === "network") {
          msg = t.networkError;
        } else if (code === "language-not-supported" || code === "language-unavailable") {
          msg = t.langUnavailable;
        }
        // All remaining codes → generic t.recognitionError.

        endWithError(msg, kind);
      };

      try {
        recognition.start();
      } catch {
        // start() threw synchronously — treat like a browser auto-end.
        recognitionRef.current = null;
        if (sessionActiveRef.current && !manualStopRef.current) {
          restartTimerRef.current = setTimeout(() => {
            restartTimerRef.current = null;
            if (sessionActiveRef.current) startBrowserRecognition();
          }, RESTART_DELAY_MS);
        }
      }
    }

    // 2-minute absolute session limit.
    maxTimerRef.current = setTimeout(() => {
      maxTimerRef.current = null;
      if (sessionActiveRef.current) finalizeSession();
    }, MAX_DICTATION_MS);

    startBrowserRecognition();
    setState("recording");
  }, [editor, dictLang, insertAtSavedPosition, t]);

  // ── Dismiss error ─────────────────────────────────────────────────────────

  const dismissError = useCallback(() => {
    setErrorMsg("");
    setErrorKind("other");
    setShowPermHelp(false);
    setState("idle");
    cleanupAll();
  }, [cleanupAll]);

  // ── Derived ───────────────────────────────────────────────────────────────

  const isRecording = state === "recording";
  const tooltipText = dictLang === "mixed" ? t.mixedNote : t.speechNote;

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

      {/* Mic button */}
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

      {/* Permission-denied error — with recovery path */}
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
        /* Generic error */
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
