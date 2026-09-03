export const WHISPER_MODEL_ID = "onnx-community/whisper-tiny";
export const MAX_RECORDING_MS = 30_000;
export const TARGET_SAMPLE_RATE = 16_000;

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
  modelId: string;
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

function formatError(err: unknown): string {
  if (err instanceof Error) return err.message || err.name;
  return String(err);
}

export async function loadWhisperPipeline(
  onProgress?: (info: LoadProgress) => void,
): Promise<LoadedPipelineInfo> {
  if (loadedInfo && pipelineRef) {
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
        availableDtypes = await registry.get_available_dtypes(WHISPER_MODEL_ID);
      }
    } catch {
      availableDtypes = [];
    }
    if (availableDtypes.length === 0) availableDtypes = ["q8", "int8", "fp32"];
    let dtype = choosePreferredDtype(availableDtypes);

    const progress_callback = (report: { status?: string; file?: string; progress?: number }) => {
      onProgress?.({
        status: report.status ?? "loading",
        file: report.file,
        progress: typeof report.progress === "number" ? report.progress : undefined,
      });
    };

    async function createPipeline(device: WhisperBackend, useDtype: string): Promise<AsrPipeline> {
      return pipeline("automatic-speech-recognition", WHISPER_MODEL_ID, {
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
      modelId: WHISPER_MODEL_ID,
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
  const result = await pipelineRef(samples, { language: "urdu", task: "transcribe" });
  return (result?.text ?? "").trim();
}
