import { MAX_RECORDING_MS, TARGET_SAMPLE_RATE, clampRecordingMs } from "./whisperLocal";

export interface RecordedAudio {
  blob: Blob;
  mimeType: string;
  durationMs: number;
  byteSize: number;
}

function pickMimeType(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  if (typeof MediaRecorder === "undefined") return "";
  return candidates.find(type => MediaRecorder.isTypeSupported(type)) ?? "";
}

export function isMediaRecorderAvailable(): boolean {
  return typeof window !== "undefined" && typeof MediaRecorder !== "undefined";
}

export async function recordMicrophoneClip(
  maxMs = MAX_RECORDING_MS,
  signal?: AbortSignal,
): Promise<RecordedAudio> {
  if (!isMediaRecorderAvailable()) throw new Error("MediaRecorder is not available in this browser.");
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("Microphone capture is not available in this browser.");

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  const mimeType = pickMimeType();
  const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  const chunks: BlobPart[] = [];
  const startedAt = Date.now();

  const stopTracks = () => {
    for (const track of stream.getTracks()) {
      try { track.stop(); } catch { /* ignore */ }
    }
  };

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (err?: Error) => {
      if (settled) return;
      settled = true;
      stopTracks();
      if (err) reject(err);
    };

    recorder.ondataavailable = event => {
      if (event.data && event.data.size > 0) chunks.push(event.data);
    };
    recorder.onerror = () => finish(new Error("Recording failed."));
    recorder.onstop = () => {
      const usedType = recorder.mimeType || mimeType || "audio/webm";
      const blob = new Blob(chunks, { type: usedType });
      settled = true;
      stopTracks();
      resolve({
        blob,
        mimeType: usedType,
        durationMs: clampRecordingMs(Date.now() - startedAt, maxMs),
        byteSize: blob.size,
      });
    };

    const requestFinalData = () => {
      try {
        if (typeof recorder.requestData === "function" && recorder.state === "recording") {
          recorder.requestData();
        }
      } catch {
        /* ignore */
      }
    };

    const timer = setTimeout(() => {
      if (recorder.state === "recording") {
        requestFinalData();
        try { recorder.stop(); } catch { /* already inactive */ }
      }
    }, maxMs);

    const onAbort = () => {
      clearTimeout(timer);
      if (recorder.state === "recording") {
        requestFinalData();
        try { recorder.stop(); } catch { /* already inactive */ }
      } else {
        stopTracks();
      }
    };
    signal?.addEventListener("abort", onAbort, { once: true });

    try {
      recorder.start(250);
    } catch (err) {
      clearTimeout(timer);
      finish(err instanceof Error ? err : new Error("Could not start recording."));
    }
  });
}

function mixToMono(buffer: AudioBuffer): Float32Array {
  const length = buffer.length;
  const channels = buffer.numberOfChannels;
  const out = new Float32Array(length);
  for (let ch = 0; ch < channels; ch += 1) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i += 1) out[i] += data[i];
  }
  if (channels > 1) {
    for (let i = 0; i < length; i += 1) out[i] /= channels;
  }
  return out;
}

function resampleLinear(input: Float32Array, fromRate: number, toRate: number): Float32Array {
  if (fromRate === toRate) return input;
  const ratio = fromRate / toRate;
  const outLength = Math.max(1, Math.round(input.length / ratio));
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i += 1) {
    const src = i * ratio;
    const i0 = Math.floor(src);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const t = src - i0;
    out[i] = input[i0] * (1 - t) + input[i1] * t;
  }
  return out;
}

export async function decodeToWhisperPcm(blob: Blob): Promise<{
  samples: Float32Array;
  durationSec: number;
  sampleCount: number;
  sampleRate: number;
}> {
  if (blob.size === 0) {
    throw new Error("Recording produced no audio data.");
  }
  const arrayBuffer = await blob.arrayBuffer();
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) throw new Error("Web Audio is not available.");
  const ctx = new AudioCtx();
  try {
    const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
    const samples = resampleLinear(mixToMono(decoded), decoded.sampleRate, TARGET_SAMPLE_RATE);
    if (samples.length === 0) {
      throw new Error("Recorded audio could not be decoded into samples.");
    }
    return {
      samples,
      durationSec: samples.length / TARGET_SAMPLE_RATE,
      sampleCount: samples.length,
      sampleRate: TARGET_SAMPLE_RATE,
    };
  } finally {
    try { await ctx.close(); } catch { /* ignore */ }
  }
}
