"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "../../lib/language-context";
import {
  decodeToWhisperPcm,
  isMediaRecorderAvailable,
  recordMicrophoneClip,
} from "./recorder";
import {
  DEFAULT_WHISPER_MODEL_KEY,
  MAX_RECORDING_MS,
  TRANSCRIBE_WATCHDOG_MS,
  detectWebGpuAvailable,
  getLoadedPipelineInfo,
  loadWhisperPipeline,
  resolveWhisperModel,
  shouldAcceptTranscriptionResult,
  transcribeUrduLocally,
  type LoadedPipelineInfo,
  type ModelStatus,
  type WhisperModelKey,
} from "./whisperLocal";

const COPY = {
  en: {
    title: "Local Whisper Dictation (Labs)",
    intro: "Internal feasibility spike. Not a production Document Studio feature.",
    privacy: "Audio is processed locally in your browser and is not uploaded by Qalam Works.",
    load: "Load model",
    record: "Record",
    stop: "Stop",
    transcribe: "Transcribe",
    clear: "Clear / Retry",
    transcript: "Transcript",
    diagnostics: "Diagnostics",
    statusNotLoaded: "Model not loaded",
    statusLoading: "Loading model…",
    statusReady: "Model ready",
    statusRecording: "Recording…",
    statusProcessing: "Processing recorded audio…",
    statusAudioReady: "Audio ready",
    statusTranscribing: "Transcribing locally…",
    statusDone: "Transcription complete",
    statusError: "Error",
    preview: "Recorded audio preview",
    model: "Model",
    tinyHint: "Tiny — faster / baseline",
    baseHint: "Base — larger / accuracy test",
    reloadToSwitch: "Reload page to change loaded model",
    testHint: "Test passage (do not expect the model to receive this as a prompt): آج موسم بہت اچھا ہے۔ میں صبح جلدی اٹھا اور چائے پی۔ پھر میں نے اپنا کام شروع کیا۔",
    timeout: "Transcription timed out after 120 seconds. The underlying inference may still be running in the browser.",
  },
  ur: {
    title: "مقامی وسپر ڈکٹیشن (لیبز)",
    intro: "داخلی تجربہ۔ یہ Document Studio کی پروڈکشن فیچر نہیں ہے۔",
    privacy: "آڈیو آپ کے براؤزر میں مقامی طور پر پروسیس ہوتی ہے اور قلم ورکس اسے اپ لوڈ نہیں کرتا۔",
    load: "ماڈل لوڈ کریں",
    record: "ریکارڈ",
    stop: "روکیں",
    transcribe: "تحریر بنائیں",
    clear: "صاف / دوبارہ",
    transcript: "تحریر",
    diagnostics: "تشخیصی معلومات",
    statusNotLoaded: "ماڈل لوڈ نہیں ہوا",
    statusLoading: "ماڈل لوڈ ہو رہا ہے…",
    statusReady: "ماڈل تیار ہے",
    statusRecording: "ریکارڈنگ جاری ہے…",
    statusProcessing: "ریکارڈ شدہ آڈیو پروسیس ہو رہی ہے…",
    statusAudioReady: "آڈیو تیار ہے",
    statusTranscribing: "مقامی طور پر تحریر بن رہی ہے…",
    statusDone: "تحریر مکمل ہوگئی",
    statusError: "خرابی",
    preview: "ریکارڈ شدہ آڈیو سنیں",
    model: "ماڈل",
    tinyHint: "Tiny — ہلکا / بنیادی تجربہ",
    baseHint: "Base — بڑا / درستگی کا تجربہ",
    reloadToSwitch: "ماڈل بدلنے کے لیے صفحہ دوبارہ لوڈ کریں",
    testHint: "تجرباتی عبارت (یہ ماڈل کو پرامپٹ کے طور پر نہیں بھیجی جاتی): آج موسم بہت اچھا ہے۔ میں صبح جلدی اٹھا اور چائے پی۔ پھر میں نے اپنا کام شروع کیا۔",
    timeout: "تحریر 120 سیکنڈ بعد رک گئی۔ براؤزر میں انفرنس اب بھی چل رہی ہو سکتی ہے۔",
  },
} as const;

type FlowPhase =
  | "not-loaded"
  | "loading"
  | "ready"
  | "recording"
  | "processing"
  | "audio-ready"
  | "transcribing"
  | "done"
  | "error";

const btnBase = "rounded-md px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40";
const btnPrimary = `${btnBase} bg-[#1A3A2A] text-white disabled:bg-gray-400`;
const btnGold = `${btnBase} bg-[#C4A35A] text-[#1A3A2A] disabled:bg-gray-200 disabled:text-gray-500`;
const btnOutline = `${btnBase} border border-gray-300 bg-white disabled:bg-gray-100 disabled:text-gray-400`;

export default function LocalDictationClient() {
  const { language } = useLanguage();
  const isUr = language === "ur";
  const t = COPY[isUr ? "ur" : "en"];

  const [status, setStatus] = useState<ModelStatus>("not-loaded");
  const [flow, setFlow] = useState<FlowPhase>("not-loaded");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [info, setInfo] = useState<LoadedPipelineInfo | null>(null);
  const [transcript, setTranscript] = useState("");
  const [audioDurationSec, setAudioDurationSec] = useState<number | null>(null);
  const [transcribeMs, setTranscribeMs] = useState<number | null>(null);
  const [blobBytes, setBlobBytes] = useState<number | null>(null);
  const [blobMime, setBlobMime] = useState("");
  const [rawDurationMs, setRawDurationMs] = useState<number | null>(null);
  const [pcmCount, setPcmCount] = useState<number | null>(null);
  const [pcmRate, setPcmRate] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [modelKey, setModelKey] = useState<WhisperModelKey>(DEFAULT_WHISPER_MODEL_KEY);
  const [modelLocked, setModelLocked] = useState(false);
  const [outcome, setOutcome] = useState<"success" | "error" | "timeout" | "">("");
  const [webgpuAvailable] = useState(() => detectWebGpuAvailable());

  const samplesRef = useRef<Float32Array | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const busyRef = useRef(false);
  const mountedRef = useRef(true);
  const stopReasonRef = useRef<"user" | "unmount" | null>(null);
  const previewUrlRef = useRef("");
  const runIdRef = useRef(0);
  const timedOutRef = useRef(false);
  const watchdogRef = useRef<number | null>(null);

  const revokePreview = () => {
    if (previewUrlRef.current) {
      try { URL.revokeObjectURL(previewUrlRef.current); } catch { /* ignore */ }
      previewUrlRef.current = "";
    }
    if (mountedRef.current) setPreviewUrl("");
  };

  const setBusyStatus = (next: ModelStatus, nextFlow?: FlowPhase) => {
    if (!mountedRef.current) return;
    setStatus(next);
    if (nextFlow) setFlow(nextFlow);
    busyRef.current =
      next === "loading" ||
      next === "recording" ||
      next === "transcribing" ||
      nextFlow === "processing" ||
      nextFlow === "recording";
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopReasonRef.current = "unmount";
      runIdRef.current += 1;
      timedOutRef.current = true;
      if (watchdogRef.current != null) {
        window.clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
      }
      if (previewUrlRef.current) {
        try { URL.revokeObjectURL(previewUrlRef.current); } catch { /* ignore */ }
        previewUrlRef.current = "";
      }
      const controller = abortRef.current;
      abortRef.current = null;
      busyRef.current = false;
      try {
        controller?.abort();
      } catch {
        /* already aborted */
      }
    };
  }, []);

  const loadModel = useCallback(async () => {
    if (busyRef.current) return;
    setError("");
    setProgress("");
    setBusyStatus("loading", "loading");
    try {
      const loaded = await loadWhisperPipeline(report => {
        if (!mountedRef.current) return;
        const pct = typeof report.progress === "number" ? ` ${Math.round(report.progress)}%` : "";
        const file = report.file ? ` ${report.file}` : "";
        setProgress(`${report.status}${file}${pct}`.trim());
      }, modelKey);
      if (!mountedRef.current) return;
      setInfo(loaded);
      setModelLocked(true);
      setProgress("");
      setBusyStatus("ready", "ready");
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : String(err));
      setBusyStatus("error", "error");
    }
  }, [modelKey]);

  const startRecord = useCallback(async () => {
    if (busyRef.current) return;
    if (!isMediaRecorderAvailable()) {
      setError("MediaRecorder is not available in this browser.");
      setBusyStatus("error", "error");
      return;
    }
    setError("");
    setTranscript("");
    setAudioDurationSec(null);
    setTranscribeMs(null);
    setBlobBytes(null);
    setBlobMime("");
    setRawDurationMs(null);
    setPcmCount(null);
    setPcmRate(null);
    samplesRef.current = null;
    revokePreview();
    runIdRef.current += 1;
    timedOutRef.current = false;
    setOutcome("");
    setTranscribeMs(null);
    if (watchdogRef.current != null) {
      window.clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
    stopReasonRef.current = null;
    const abort = new AbortController();
    abortRef.current = abort;
    setBusyStatus("recording", "recording");
    try {
      const clip = await recordMicrophoneClip(MAX_RECORDING_MS, abort.signal);
      if (!mountedRef.current || stopReasonRef.current === "unmount") return;
      if (mountedRef.current) setFlow("processing");
      setBlobBytes(clip.byteSize);
      setBlobMime(clip.mimeType);
      setRawDurationMs(clip.durationMs);
      if (clip.byteSize === 0) {
        throw new Error("Recording produced no audio data.");
      }
      const objectUrl = URL.createObjectURL(clip.blob);
      previewUrlRef.current = objectUrl;
      setPreviewUrl(objectUrl);
      const pcm = await decodeToWhisperPcm(clip.blob);
      if (!mountedRef.current || stopReasonRef.current === "unmount") return;
      samplesRef.current = pcm.samples;
      setAudioDurationSec(Number(pcm.durationSec.toFixed(2)));
      setPcmCount(pcm.sampleCount);
      setPcmRate(pcm.sampleRate);
      setBusyStatus("ready", "audio-ready");
    } catch (err) {
      if (!mountedRef.current || stopReasonRef.current === "unmount") return;
      const name = err instanceof Error ? err.name : "";
      const message = err instanceof Error ? err.message : String(err);
      if (name === "NotAllowedError" || /permission|denied/i.test(message)) {
        setError("Microphone permission denied.");
      } else {
        setError(message);
      }
      setBusyStatus("error", "error");
    } finally {
      if (abortRef.current === abort) abortRef.current = null;
    }
  }, []);

  const stopRecord = useCallback(() => {
    if (flow !== "recording") return;
    stopReasonRef.current = "user";
    setFlow("processing");
    busyRef.current = true;
    try {
      abortRef.current?.abort();
    } catch {
      /* already inactive */
    }
  }, [flow]);

  const transcribe = useCallback(async () => {
    if (busyRef.current) return;
    if (!getLoadedPipelineInfo() && !info) {
      setError("Load the model first.");
      return;
    }
    if (!samplesRef.current || samplesRef.current.length === 0) {
      setError("Record audio first.");
      return;
    }
    setError("");
    setOutcome("");
    setBusyStatus("transcribing", "transcribing");
    const started = performance.now();
    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    timedOutRef.current = false;
    if (watchdogRef.current != null) window.clearTimeout(watchdogRef.current);
    watchdogRef.current = window.setTimeout(() => {
      if (runIdRef.current !== runId) return;
      timedOutRef.current = true;
      if (!mountedRef.current) return;
      setTranscribeMs(Math.round(performance.now() - started));
      setOutcome("timeout");
      setError(t.timeout);
      setBusyStatus("error", "error");
    }, TRANSCRIBE_WATCHDOG_MS);
    try {
      const text = await transcribeUrduLocally(samplesRef.current);
      if (!shouldAcceptTranscriptionResult(runId, runIdRef.current, timedOutRef.current)) return;
      if (!mountedRef.current) return;
      if (watchdogRef.current != null) {
        window.clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
      }
      setTranscribeMs(Math.round(performance.now() - started));
      setTranscript(text);
      setOutcome("success");
      setBusyStatus("ready", "done");
    } catch (err) {
      if (!shouldAcceptTranscriptionResult(runId, runIdRef.current, timedOutRef.current)) return;
      if (!mountedRef.current) return;
      if (watchdogRef.current != null) {
        window.clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
      }
      setTranscribeMs(Math.round(performance.now() - started));
      setOutcome("error");
      setError(err instanceof Error ? err.message : String(err));
      setBusyStatus("error", "error");
    }
  }, [info, t.timeout]);

  const clearAll = useCallback(() => {
    if (status === "recording" || flow === "recording") {
      try { abortRef.current?.abort(); } catch { /* ignore */ }
    }
    samplesRef.current = null;
    revokePreview();
    runIdRef.current += 1;
    timedOutRef.current = true;
    if (watchdogRef.current != null) {
      window.clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
    setOutcome("");
    setTranscript("");
    setAudioDurationSec(null);
    setTranscribeMs(null);
    setError("");
    setProgress("");
    const ready = Boolean(getLoadedPipelineInfo());
    setStatus(ready ? "ready" : "not-loaded");
    setFlow(ready ? "ready" : "not-loaded");
    setBlobBytes(null);
    setBlobMime("");
    setRawDurationMs(null);
    setPcmCount(null);
    setPcmRate(null);
    busyRef.current = false;
  }, [status, flow]);

  const modelReady = Boolean(getLoadedPipelineInfo() || info);
  const hasAudio = (pcmCount ?? 0) > 0;
  const busy = flow === "loading" || flow === "recording" || flow === "processing" || flow === "transcribing";
  const flowLabel = (() => {
    switch (flow) {
      case "loading": return t.statusLoading;
      case "ready": return t.statusReady;
      case "recording": return t.statusRecording;
      case "processing": return t.statusProcessing;
      case "audio-ready":
        return `${t.statusAudioReady}${audioDurationSec != null ? `: ${audioDurationSec} s` : ""}`;
      case "transcribing": return t.statusTranscribing;
      case "done": return t.statusDone;
      case "error": return t.statusError;
      default: return t.statusNotLoaded;
    }
  })();
  const naskh = isUr ? "font-naskh" : "";
  const heading = isUr ? "font-nastaliq font-normal" : "";

  return (
    <main className={`mx-auto max-w-3xl px-4 py-8 ${naskh}`} dir={isUr ? "rtl" : "ltr"}>
      <p className="mb-2 text-xs uppercase tracking-wide text-gray-500">Labs</p>
      <h1 className={`text-2xl text-[#1A3A2A] dark:text-white ${heading}`}>{t.title}</h1>
      <p className="mt-2 text-sm text-gray-700 dark:text-[#e8ede9]">{t.intro}</p>
      <p className="mt-2 text-sm text-gray-700 dark:text-[#e8ede9]">{t.privacy}</p>
      <div className="mt-6">
        <p className="mb-1 text-sm font-medium">{t.model}</p>
        <div className="flex flex-wrap gap-3 text-sm">
          <label className="inline-flex items-center gap-1">
            <input
              type="radio"
              name="whisper-model"
              value="tiny"
              checked={modelKey === "tiny"}
              disabled={modelLocked || busy}
              onChange={() => setModelKey("tiny")}
            />
            {t.tinyHint}
          </label>
          <label className="inline-flex items-center gap-1">
            <input
              type="radio"
              name="whisper-model"
              value="base"
              checked={modelKey === "base"}
              disabled={modelLocked || busy}
              onChange={() => setModelKey("base")}
            />
            {t.baseHint}
          </label>
        </div>
        {modelLocked ? <p className="mt-1 text-xs text-gray-600">{t.reloadToSwitch}</p> : null}
        <p className="mt-2 text-xs text-gray-600">{t.testHint}</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={loadModel} disabled={busy} className={btnPrimary}>{t.load}</button>
        <button type="button" onClick={startRecord} disabled={!modelReady || busy} className={btnOutline}>{t.record}</button>
        <button type="button" onClick={stopRecord} disabled={flow !== "recording"} className={btnOutline}>{t.stop}</button>
        <button type="button" onClick={transcribe} disabled={!modelReady || !hasAudio || busy} className={btnGold}>{t.transcribe}</button>
        <button type="button" onClick={clearAll} className={btnOutline}>{t.clear}</button>
      </div>
      <p className="mt-3 text-sm font-medium text-[#1A3A2A] dark:text-white">{flowLabel}</p>
      {progress ? <p className="mt-1 text-sm text-gray-600">{progress}</p> : null}
      {error ? <p className="mt-2 whitespace-pre-wrap text-sm text-red-700">{error}</p> : null}
      {previewUrl ? (
        <div className="mt-4">
          <p className="mb-1 text-sm font-medium">{t.preview}</p>
          <audio controls src={previewUrl} preload="metadata" className="w-full" />
        </div>
      ) : null}
      <label className="mt-6 block text-sm font-medium">{t.transcript}</label>
      <textarea
        value={transcript}
        onChange={e => setTranscript(e.target.value)}
        rows={8}
        className={`mt-1 w-full rounded-md border border-gray-300 p-3 text-base ${isUr ? "font-nastaliq text-right" : ""}`}
        dir={isUr ? "rtl" : "auto"}
      />
      <h2 className={`mt-6 text-lg ${heading}`}>{t.diagnostics}</h2>
      <dl className="mt-2 grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
        <div>Status: {status}</div>
        <div>Selected model: {resolveWhisperModel(modelKey).label}</div>
        <div>Model ID: {info?.modelId ?? resolveWhisperModel(modelKey).id}</div>
        <div>Requested dtype: {info?.requestedDtype ?? "q8"}</div>
        <div>Actual dtype: {info?.dtype ?? "—"}</div>
        <div>Backend used: {info?.backend ?? "—"}</div>
        <div>WebGPU available: {webgpuAvailable ? "yes" : "no"}</div>
        <div>WebGPU init error: {info?.webgpuError ?? "—"}</div>
        <div>Model load time: {info ? `${info.loadMs} ms` : "—"}</div>
        <div>Pipeline reused in memory: {info?.reusedInMemory ? "yes" : info ? "no (first load this page)" : "—"}</div>
        <div>Available dtypes: {info?.availableDtypes.join(", ") ?? "—"}</div>
        <div>Flow: {flow}</div>
        <div>Blob size: {blobBytes != null ? `${blobBytes} bytes` : "—"}</div>
        <div>MIME type: {blobMime || "—"}</div>
        <div>Raw recording duration: {rawDurationMs != null ? `${rawDurationMs} ms` : "—"}</div>
        <div>Decoded duration: {audioDurationSec != null ? `${audioDurationSec} s` : "—"}</div>
        <div>PCM sample count: {pcmCount != null ? pcmCount : "—"}</div>
        <div>Target sample rate: {pcmRate != null ? pcmRate : 16000}</div>
        <div>Transcription elapsed: {transcribeMs != null ? `${transcribeMs} ms` : "—"}</div>
        <div>Transcription outcome: {outcome || "—"}</div>
        <div>Watchdog threshold: {TRANSCRIBE_WATCHDOG_MS} ms</div>
      </dl>
    </main>
  );
}
