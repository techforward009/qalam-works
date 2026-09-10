/**
 * Document Studio local AI loader — browser-only Transformers.js.
 * Memory-safe: WebGPU q4f16 only. Never fp32/q4/WASM fallbacks.
 */
export const QALAM_AI_MODEL_ID = "onnx-community/Qwen2.5-0.5B-Instruct";
export const QALAM_AI_TASK = "text-generation";
export const QALAM_AI_WEBGPU_DTYPE = "q4f16";
export const MAX_NEW_TOKENS = 128;
export const SUMMARIZE_MAX_NEW_TOKENS = 64;
export const LOW_MEMORY_GB = 4;

export const QALAM_AI_LOW_MEMORY_EN =
  "Qalam AI requires more browser memory on this device. A lighter model will be offered soon.";
export const QALAM_AI_LOW_MEMORY_UR =
  "قلم اے آئی کو اس ڈیوائس پر زیادہ براؤزر میموری درکار ہے۔ جلد ہی ہلکا ماڈل پیش کیا جائے گا۔";
export const QALAM_AI_NO_WEBGPU_EN =
  "Qalam AI currently requires WebGPU. This browser cannot load the model safely. A lighter model will be offered soon.";
export const QALAM_AI_NO_WEBGPU_UR =
  "قلم اے آئی کو فی الحال WebGPU درکار ہے۔ یہ براؤزر ماڈل محفوظ طریقے سے لوڈ نہیں کر سکتا۔ جلد ہی ہلکا ماڈل پیش کیا جائے گا۔";
export const QALAM_AI_WEBGPU_FAILED_EN =
  "Could not load the compact WebGPU model. A lighter model will be offered soon.";
export const QALAM_AI_WEBGPU_FAILED_UR =
  "compact WebGPU ماڈل لوڈ نہیں ہو سکا۔ جلد ہی ہلکا ماڈل پیش کیا جائے گا۔";

export type QalamAiBackend = "webgpu";
export type QalamAiStatus = "not-loaded" | "loading" | "ready" | "error";
export type QalamAiLoadErrorCode = "low-memory" | "no-webgpu" | "webgpu-failed";

export class QalamAiLoadError extends Error {
  readonly code: QalamAiLoadErrorCode;
  constructor(code: QalamAiLoadErrorCode, message: string) {
    super(message);
    this.name = "QalamAiLoadError";
    this.code = code;
  }
}

export interface QalamAiLoadProgress {
  status: string;
  file?: string;
  progress?: number;
}

export interface QalamAiLoadedInfo {
  modelId: string;
  dtype: typeof QALAM_AI_WEBGPU_DTYPE;
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
let deviceMemoryGb: number | null | undefined = undefined;

export function detectWebGpuAvailable(): boolean {
  if (webGpuDetector) return webGpuDetector();
  return typeof navigator !== "undefined" && "gpu" in navigator && navigator.gpu != null;
}

export function getDeviceMemoryGb(): number | null {
  if (deviceMemoryGb !== undefined) return deviceMemoryGb;
  const mem = typeof navigator !== "undefined" ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory : undefined;
  return typeof mem === "number" && Number.isFinite(mem) ? mem : null;
}

export function shouldBlockForLowMemory(memoryGb: number | null = getDeviceMemoryGb()): boolean {
  return memoryGb !== null && memoryGb <= LOW_MEMORY_GB;
}

export function chooseAiDtype(): typeof QALAM_AI_WEBGPU_DTYPE {
  return QALAM_AI_WEBGPU_DTYPE;
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
  deviceMemoryGb?: number | null;
} | null): void {
  importer = hooks?.importTransformers ?? null;
  webGpuDetector = hooks?.detectWebGpu ?? null;
  deviceMemoryGb = hooks && "deviceMemoryGb" in hooks ? hooks.deviceMemoryGb : undefined;
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
  deviceMemoryGb = undefined;
}

export function messageForLoadError(code: QalamAiLoadErrorCode, isUr: boolean): string {
  if (code === "low-memory") return isUr ? QALAM_AI_LOW_MEMORY_UR : QALAM_AI_LOW_MEMORY_EN;
  if (code === "no-webgpu") return isUr ? QALAM_AI_NO_WEBGPU_UR : QALAM_AI_NO_WEBGPU_EN;
  return isUr ? QALAM_AI_WEBGPU_FAILED_UR : QALAM_AI_WEBGPU_FAILED_EN;
}

export async function loadQalamAiPipeline(
  onProgress?: (info: QalamAiLoadProgress) => void,
): Promise<QalamAiLoadedInfo> {
  if (loadedInfo && pipelineRef) return { ...loadedInfo, reusedInMemory: true };
  if (loadInFlight) return loadInFlight;

  loadInFlight = (async () => {
    if (shouldBlockForLowMemory()) {
      throw new QalamAiLoadError("low-memory", QALAM_AI_LOW_MEMORY_EN);
    }
    const webgpuAvailable = detectWebGpuAvailable();
    if (!webgpuAvailable) {
      throw new QalamAiLoadError("no-webgpu", QALAM_AI_NO_WEBGPU_EN);
    }

    const started = typeof performance !== "undefined" ? performance.now() : Date.now();
    const transformers = await (importer ?? defaultImportTransformers)();
    transformers.env.allowLocalModels = false;

    const progress_callback = (report: { status?: string; file?: string; progress?: number }) => {
      onProgress?.({
        status: report.status ?? "loading",
        file: report.file,
        progress: typeof report.progress === "number" ? report.progress : undefined,
      });
    };

    try {
      pipelineRef = await transformers.pipeline(QALAM_AI_TASK, QALAM_AI_MODEL_ID, {
        device: "webgpu",
        dtype: QALAM_AI_WEBGPU_DTYPE,
        progress_callback,
      });
    } catch (err) {
      pipelineRef = null;
      throw new QalamAiLoadError("webgpu-failed", `${QALAM_AI_WEBGPU_FAILED_EN} (${formatError(err)})`);
    }

    const ended = typeof performance !== "undefined" ? performance.now() : Date.now();
    loadedInfo = {
      modelId: QALAM_AI_MODEL_ID,
      dtype: QALAM_AI_WEBGPU_DTYPE,
      backend: "webgpu",
      webgpuAvailable: true,
      webgpuError: null,
      loadMs: Math.round(ended - started),
      reusedInMemory: false,
      availableDtypes: [QALAM_AI_WEBGPU_DTYPE],
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
