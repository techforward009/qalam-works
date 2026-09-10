/**
 * Document Studio local AI loader — browser-only Transformers.js.
 * Mirrors the Whisper lazy-load pattern without sharing Whisper state.
 */
export const QALAM_AI_MODEL_ID = "onnx-community/Qwen2.5-0.5B-Instruct";
export const QALAM_AI_TASK = "text-generation";
export const MAX_NEW_TOKENS = 128;
export const SUMMARIZE_MAX_NEW_TOKENS = 64;

export type QalamAiBackend = "webgpu" | "wasm";
export type QalamAiStatus = "not-loaded" | "loading" | "ready" | "error";

export interface QalamAiLoadProgress {
  status: string;
  file?: string;
  progress?: number;
}

export interface QalamAiLoadedInfo {
  modelId: string;
  dtype: string;
  backend: QalamAiBackend;
  webgpuAvailable: boolean;
  webgpuError: string | null;
  loadMs: number;
  reusedInMemory: boolean;
  availableDtypes: string[];
}

type TextGenPipeline = (
  input: string,
  options?: Record<string, unknown>,
) => Promise<unknown>;

export type TransformersLike = {
  pipeline: (task: string, model: string, options: Record<string, unknown>) => Promise<TextGenPipeline>;
  env: { allowLocalModels: boolean };
  get_available_dtypes?: (id: string) => Promise<string[]>;
};

let pipelineRef: TextGenPipeline | null = null;
let loadedInfo: QalamAiLoadedInfo | null = null;
let loadInFlight: Promise<QalamAiLoadedInfo> | null = null;
let importer: (() => Promise<TransformersLike>) | null = null;
let webGpuDetector: (() => boolean) | null = null;

export function detectWebGpuAvailable(): boolean {
  if (webGpuDetector) return webGpuDetector();
  return typeof navigator !== "undefined" && "gpu" in navigator && navigator.gpu != null;
}

export function chooseAiDtype(available: string[], backend: QalamAiBackend): string {
  const order = backend === "webgpu"
    ? ["q4f16", "q4", "q8", "int8", "fp16", "fp32"]
    : ["q4", "q8", "int8", "fp32", "fp16"];
  for (const dtype of order) {
    if (available.includes(dtype)) return dtype;
  }
  return available[0] ?? "q4";
}

function formatError(err: unknown): string {
  if (err instanceof Error) return err.message || err.name;
  return String(err);
}

async function defaultImportTransformers(): Promise<TransformersLike> {
  const mod = await import("@huggingface/transformers");
  return mod as unknown as TransformersLike;
}

export function setQalamAiTestHooks(hooks?: {
  importTransformers?: () => Promise<TransformersLike>;
  detectWebGpu?: () => boolean;
} | null): void {
  importer = hooks?.importTransformers ?? null;
  webGpuDetector = hooks?.detectWebGpu ?? null;
}

export function getQalamAiLoadedInfo(): QalamAiLoadedInfo | null {
  return loadedInfo ? { ...loadedInfo, reusedInMemory: true } : null;
}

export function isQalamAiReady(): boolean {
  return Boolean(pipelineRef && loadedInfo);
}

export function resetQalamAiForTests(): void {
  pipelineRef = null;
  loadedInfo = null;
  loadInFlight = null;
  importer = null;
  webGpuDetector = null;
}

export async function loadQalamAiPipeline(
  onProgress?: (info: QalamAiLoadProgress) => void,
): Promise<QalamAiLoadedInfo> {
  if (loadedInfo && pipelineRef) return { ...loadedInfo, reusedInMemory: true };
  if (loadInFlight) return loadInFlight;

  loadInFlight = (async () => {
    const started = typeof performance !== "undefined" ? performance.now() : Date.now();
    const webgpuAvailable = detectWebGpuAvailable();
    let webgpuError: string | null = null;
    const transformers = await (importer ?? defaultImportTransformers)();
    transformers.env.allowLocalModels = false;

    let availableDtypes: string[] = [];
    try {
      if (typeof transformers.get_available_dtypes === "function") {
        availableDtypes = await transformers.get_available_dtypes(QALAM_AI_MODEL_ID);
      }
    } catch {
      availableDtypes = [];
    }
    if (availableDtypes.length === 0) availableDtypes = ["q4f16", "q4", "q8", "fp32"];

    const progress_callback = (report: { status?: string; file?: string; progress?: number }) => {
      onProgress?.({
        status: report.status ?? "loading",
        file: report.file,
        progress: typeof report.progress === "number" ? report.progress : undefined,
      });
    };

    async function createPipeline(device: QalamAiBackend, dtype: string): Promise<TextGenPipeline> {
      return transformers.pipeline(QALAM_AI_TASK, QALAM_AI_MODEL_ID, {
        device,
        dtype,
        progress_callback,
      });
    }

    async function createWithDtypeFallback(device: QalamAiBackend): Promise<{ pipe: TextGenPipeline; dtype: string }> {
      const preferred = chooseAiDtype(availableDtypes, device);
      try {
        return { pipe: await createPipeline(device, preferred), dtype: preferred };
      } catch (firstErr) {
        if (preferred !== "fp32") {
          return { pipe: await createPipeline(device, "fp32"), dtype: "fp32" };
        }
        throw firstErr;
      }
    }

    let backend: QalamAiBackend = "wasm";
    let dtype = chooseAiDtype(availableDtypes, "wasm");
    if (webgpuAvailable) {
      try {
        const created = await createWithDtypeFallback("webgpu");
        pipelineRef = created.pipe;
        dtype = created.dtype;
        backend = "webgpu";
      } catch (err) {
        webgpuError = formatError(err);
        const created = await createWithDtypeFallback("wasm");
        pipelineRef = created.pipe;
        dtype = created.dtype;
        backend = "wasm";
      }
    } else {
      const created = await createWithDtypeFallback("wasm");
      pipelineRef = created.pipe;
      dtype = created.dtype;
      backend = "wasm";
    }

    const ended = typeof performance !== "undefined" ? performance.now() : Date.now();
    loadedInfo = {
      modelId: QALAM_AI_MODEL_ID,
      dtype,
      backend,
      webgpuAvailable,
      webgpuError,
      loadMs: Math.round(ended - started),
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

export function normalizeGenerationOutput(raw: unknown, prompt = ""): string {
  let text = "";
  if (typeof raw === "string") text = raw;
  else if (Array.isArray(raw) && raw.length > 0) return normalizeGenerationOutput(raw[0], prompt);
  else if (raw && typeof raw === "object" && "generated_text" in raw) {
    return normalizeGenerationOutput((raw as { generated_text: unknown }).generated_text, prompt);
  }
  let trimmed = text.trim();
  const promptTrim = prompt.trim();
  if (promptTrim && trimmed.startsWith(promptTrim)) trimmed = trimmed.slice(promptTrim.length).trim();
  return trimmed.replace(/^<\|im_start\|>assistant\s*/u, "").trim();
}

export async function generateQalamAiText(
  prompt: string,
  options?: { maxNewTokens?: number },
): Promise<string> {
  if (!pipelineRef) throw new Error("AI is not loaded.");
  const raw = await pipelineRef(prompt, {
    max_new_tokens: options?.maxNewTokens ?? MAX_NEW_TOKENS,
    do_sample: false,
    return_full_text: false,
  });
  return normalizeGenerationOutput(raw, prompt);
}
