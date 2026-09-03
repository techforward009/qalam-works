"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "../../lib/language-context";
import {
  decodeToWhisperPcm,
  isMediaRecorderAvailable,
  recordMicrophoneClip,
} from "./recorder";
import {
  MAX_RECORDING_MS,
  WHISPER_MODEL_ID,
  detectWebGpuAvailable,
  getLoadedPipelineInfo,
  loadWhisperPipeline,
  transcribeUrduLocally,
  type LoadedPipelineInfo,
  type ModelStatus,
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
  },
} as const;

export default function LocalDictationClient() {
  const { language } = useLanguage();
  const isUr = language === "ur";
  const t = COPY[isUr ? "ur" : "en"];

  const [status, setStatus] = useState<ModelStatus>("not-loaded");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [info, setInfo] = useState<LoadedPipelineInfo | null>(null);
  const [transcript, setTranscript] = useState("");
  const [audioDurationSec, setAudioDurationSec] = useState<number | null>(null);
  const [transcribeMs, setTranscribeMs] = useState<number | null>(null);
  const [webgpuAvailable] = useState(() => detectWebGpuAvailable());

  const samplesRef = useRef<Float32Array | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const busyRef = useRef(false);
  const mountedRef = useRef(true);

  const setBusyStatus = (next: ModelStatus) => {
    if (!mountedRef.current) return;
    setStatus(next);
    busyRef.current = next === "loading" || next === "recording" || next === "transcribing";
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
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
    setBusyStatus("loading");
    try {
      const loaded = await loadWhisperPipeline(report => {
        if (!mountedRef.current) return;
        const pct = typeof report.progress === "number" ? ` ${Math.round(report.progress)}%` : "";
        const file = report.file ? ` ${report.file}` : "";
        setProgress(`${report.status}${file}${pct}`.trim());
      });
      if (!mountedRef.current) return;
      setInfo(loaded);
      setProgress("");
      setBusyStatus("ready");
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : String(err));
      setBusyStatus("error");
    }
  }, []);

  const startRecord = useCallback(async () => {
    if (busyRef.current) return;
    if (!isMediaRecorderAvailable()) {
      setError("MediaRecorder is not available in this browser.");
      setBusyStatus("error");
      return;
    }
    setError("");
    setTranscript("");
    setAudioDurationSec(null);
    setTranscribeMs(null);
    samplesRef.current = null;
    const abort = new AbortController();
    abortRef.current = abort;
    setBusyStatus("recording");
    try {
      const clip = await recordMicrophoneClip(MAX_RECORDING_MS, abort.signal);
      if (!mountedRef.current) return;
      const pcm = await decodeToWhisperPcm(clip.blob);
      if (!mountedRef.current) return;
      samplesRef.current = pcm.samples;
      setAudioDurationSec(Number(pcm.durationSec.toFixed(2)));
      setBusyStatus("ready");
    } catch (err) {
      if (!mountedRef.current) return;
      const name = err instanceof Error ? err.name : "";
      const message = err instanceof Error ? err.message : String(err);
      if (name === "NotAllowedError" || /permission|denied/i.test(message)) {
        setError("Microphone permission denied.");
      } else if (name === "AbortError") {
        setBusyStatus(getLoadedPipelineInfo() ? "ready" : "not-loaded");
        return;
      } else {
        setError(message);
      }
      setBusyStatus("error");
    } finally {
      if (abortRef.current === abort) abortRef.current = null;
    }
  }, []);

  const stopRecord = useCallback(() => {
    try {
      abortRef.current?.abort();
    } catch {
      /* already inactive */
    }
  }, []);

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
    setBusyStatus("transcribing");
    const started = performance.now();
    try {
      const text = await transcribeUrduLocally(samplesRef.current);
      if (!mountedRef.current) return;
      setTranscribeMs(Math.round(performance.now() - started));
      setTranscript(text);
      setBusyStatus("ready");
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : String(err));
      setBusyStatus("error");
    }
  }, [info]);

  const clearAll = useCallback(() => {
    if (status === "recording") {
      try { abortRef.current?.abort(); } catch { /* ignore */ }
    }
    samplesRef.current = null;
    setTranscript("");
    setAudioDurationSec(null);
    setTranscribeMs(null);
    setError("");
    setProgress("");
    setStatus(getLoadedPipelineInfo() ? "ready" : "not-loaded");
    busyRef.current = false;
  }, [status]);

  const modelReady = Boolean(getLoadedPipelineInfo() || info);
  const hasAudio = Boolean(samplesRef.current && samplesRef.current.length > 0);
  const naskh = isUr ? "font-naskh" : "";
  const heading = isUr ? "font-nastaliq font-normal" : "";

  return (
    <main className={`mx-auto max-w-3xl px-4 py-8 ${naskh}`} dir={isUr ? "rtl" : "ltr"}>
      <p className="mb-2 text-xs uppercase tracking-wide text-gray-500">Labs</p>
      <h1 className={`text-2xl text-[#1A3A2A] dark:text-white ${heading}`}>{t.title}</h1>
      <p className="mt-2 text-sm text-gray-700 dark:text-[#e8ede9]">{t.intro}</p>
      <p className="mt-2 text-sm text-gray-700 dark:text-[#e8ede9]">{t.privacy}</p>
      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" onClick={loadModel} disabled={status === "loading"} className="rounded-md bg-[#1A3A2A] px-3 py-2 text-sm text-white">{t.load}</button>
        <button type="button" onClick={startRecord} disabled={status === "recording"} className="rounded-md border border-gray-300 px-3 py-2 text-sm">{t.record}</button>
        <button type="button" onClick={stopRecord} disabled={status !== "recording"} className="rounded-md border border-gray-300 px-3 py-2 text-sm">{t.stop}</button>
        <button type="button" onClick={transcribe} disabled={!modelReady || !hasAudio || status === "transcribing"} className="rounded-md bg-[#C4A35A] px-3 py-2 text-sm text-[#1A3A2A]">{t.transcribe}</button>
        <button type="button" onClick={clearAll} className="rounded-md border border-gray-300 px-3 py-2 text-sm">{t.clear}</button>
      </div>
      {progress ? <p className="mt-3 text-sm text-gray-600">{progress}</p> : null}
      {error ? <p className="mt-3 whitespace-pre-wrap text-sm text-red-700">{error}</p> : null}
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
        <div>Model: {WHISPER_MODEL_ID}</div>
        <div>dtype: {info?.dtype ?? "—"}</div>
        <div>Backend used: {info?.backend ?? "—"}</div>
        <div>WebGPU available: {webgpuAvailable ? "yes" : "no"}</div>
        <div>WebGPU init error: {info?.webgpuError ?? "—"}</div>
        <div>Model load time: {info ? `${info.loadMs} ms` : "—"}</div>
        <div>Pipeline reused in memory: {info?.reusedInMemory ? "yes" : info ? "no (first load this page)" : "—"}</div>
        <div>Available dtypes: {info?.availableDtypes.join(", ") ?? "—"}</div>
        <div>Audio duration: {audioDurationSec != null ? `${audioDurationSec} s` : "—"}</div>
        <div>Transcription time: {transcribeMs != null ? `${transcribeMs} ms` : "—"}</div>
      </dl>
    </main>
  );
}
