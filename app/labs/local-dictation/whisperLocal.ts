export const MAX_RECORDING_MS = 30_000;
export const TARGET_SAMPLE_RATE = 16_000;
export const TRANSCRIBE_WATCHDOG_MS = 120_000;
export const REQUESTED_DTYPE = "q8";
export const URDU_TRANSCRIBE_OPTIONS = {
  language: "urdu",
  task: "transcribe",
} as const;

export type WhisperModelKey = "tiny" | "base";

export const WHISPER_MODELS = {
  tiny: {
    key: "tiny" as const,
    id: "onnx-community/whisper-tiny",
    label: "Whisper Tiny",
  },
  base: {
    key: "base" as const,
    id: "onnx-community/whisper-base",
    label: "Whisper Base",
  },
};

export const DEFAULT_WHISPER_MODEL_KEY: WhisperModelKey = "tiny";
export const WHISPER_MODEL_ID = WHISPER_MODELS.tiny.id;

export const MODEL_SWITCH_MESSAGE =
  "A different Whisper model is already loaded. Reload the page before changing models.";

export type WhisperBackend = "webgpu" | "wasm";
export type ModelStatus =
  | "not-loaded"
  | "loading"
  | "ready"
  | "recording"
  | "transcribing"
  | "error";

export interface LoadProgress {
  status: string;
  file?: string;
  progress?: number;
}

export interface LoadedPipelineInfo {
  modelKey: WhisperModelKey;
  modelId: string;
  requestedDtype: string;
  dtype: string;
  backend: WhisperBackend;
  webgpuAvailable: boolean;
  webgpuError: string | null;
  loadMs: number;
  reusedInMemory: boolean;
  availableDtypes: string[];
}

type AsrPipeline = (audio: Float32Array, options?: Record<string, unknown>) => Promise<{ text?: string }>;

let pipelineRef: AsrPipeline | null = null;
let loadedInfo: LoadedPipelineInfo | null = null;
let loadInFlight: Promise<LoadedPipelineInfo> | null = null;

export function resolveWhisperModel(key: WhisperModelKey = DEFAULT_WHISPER_MODEL_KEY) {
  return WHISPER_MODELS[key] ?? WHISPER_MODELS.tiny;
}

export function detectWebGpuAvailable(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator && navigator.gpu != null;
}

export function choosePreferredDtype(available: string[]): string {
  const order = ["q8", "int8", "uint8", "q4", "fp16", "fp32"];
  for (const dtype of order) {
    if (available.includes(dtype)) return dtype;
  }
  return available[0] ?? "q8";
}

export function clampRecordingMs(ms: number, max = MAX_RECORDING_MS): number {
  if (!Number.isFinite(ms) || ms < 0) return 0;
  return Math.min(ms, max);
}

export function shouldAcceptTranscriptionResult(
  startedRunId: number,
  currentRunId: number,
  timedOut: boolean,
): boolean {
  return currentRunId === startedRunId && !timedOut;
}

function formatError(err: unknown): string {
  if (err instanceof Error) return err.message || err.name;
  return String(err);
}

export async function loadWhisperPipeline(
  onProgress?: (info: LoadProgress) => void,
  modelKey: WhisperModelKey = DEFAULT_WHISPER_MODEL_KEY,
): Promise<LoadedPipelineInfo> {
  const selected = resolveWhisperModel(modelKey);

  if (loadedInfo && pipelineRef) {
    if (loadedInfo.modelKey !== selected.key) {
      throw new Error(MODEL_SWITCH_MESSAGE);
    }
    return { ...loadedInfo, reusedInMemory: true };
  }
  if (loadInFlight) return loadInFlight;

  loadInFlight = (async () => {
    const started = performance.now();
    const webgpuAvailable = detectWebGpuAvailable();
    let webgpuError: string | null = null;
    const transformers = await import("@huggingface/transformers");
    const { pipeline, env } = transformers;
    env.allowLocalModels = false;

    const registry = transformers as unknown as {
      get_available_dtypes?: (id: string) => Promise<string[]>;
    };
    let availableDtypes: string[] = [];
    try {
      if (typeof registry.get_available_dtypes === "function") {
        availableDtypes = await registry.get_available_dtypes(selected.id);
      }
    } catch {
      availableDtypes = [];
    }
    if (availableDtypes.length === 0) availableDtypes = ["q8", "int8", "fp32"];

    const requestedDtype = REQUESTED_DTYPE;
    let dtype = availableDtypes.includes(requestedDtype)
      ? requestedDtype
      : choosePreferredDtype(availableDtypes);

    const progress_callback = (report: { status?: string; file?: string; progress?: number }) => {
      onProgress?.({
        status: report.status ?? "loading",
        file: report.file,
        progress: typeof report.progress === "number" ? report.progress : undefined,
      });
    };

    async function createPipeline(device: WhisperBackend, useDtype: string): Promise<AsrPipeline> {
      return pipeline("automatic-speech-recognition", selected.id, {
        device,
        dtype: useDtype as "q8" | "int8" | "uint8" | "q4" | "fp16" | "fp32",
        progress_callback,
      }) as Promise<AsrPipeline>;
    }

    async function createWithDtypeFallback(device: WhisperBackend): Promise<AsrPipeline> {
      try {
        return await createPipeline(device, dtype);
      } catch (firstErr) {
        if (dtype !== "fp32") {
          const pipe = await createPipeline(device, "fp32");
          dtype = "fp32";
          return pipe;
        }
        throw firstErr;
      }
    }

    let backend: WhisperBackend = "wasm";
    if (webgpuAvailable) {
      try {
        pipelineRef = await createWithDtypeFallback("webgpu");
        backend = "webgpu";
      } catch (err) {
        webgpuError = formatError(err);
        pipelineRef = await createWithDtypeFallback("wasm");
        backend = "wasm";
      }
    } else {
      pipelineRef = await createWithDtypeFallback("wasm");
      backend = "wasm";
    }

    loadedInfo = {
      modelKey: selected.key,
      modelId: selected.id,
      requestedDtype,
      dtype,
      backend,
      webgpuAvailable,
      webgpuError,
      loadMs: Math.round(performance.now() - started),
      reusedInMemory: false,
      availableDtypes,
    };
    return loadedInfo;
  })();

  try {
    return await loadInFlight;
  } finally {
    loadInFlight = null;
  }
}

export function getLoadedPipelineInfo(): LoadedPipelineInfo | null {
  return loadedInfo ? { ...loadedInfo, reusedInMemory: true } : null;
}

export async function transcribeUrduLocally(samples: Float32Array): Promise<string> {
  if (!pipelineRef) throw new Error("Model is not loaded.");
  const result = await pipelineRef(samples, { ...URDU_TRANSCRIBE_OPTIONS });
  return (result?.text ?? "").trim();
}

export function resetWhisperPipelineForTests(): void {
  pipelineRef = null;
  loadedInfo = null;
  loadInFlight = null;
}
