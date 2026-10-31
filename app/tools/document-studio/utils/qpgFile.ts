import type { DocNode } from "./extractPlainText";
import type { DocumentStudioSettings } from "./documentSettings";
import type { StudioFrame } from "../components/StudioObjectLayer";
import type { DocumentViewMode } from "./documentView";

export const QPG_FILE_ACCEPT = ".qpg,.inp,.txt,.docx";
export const QPG_MIME_TYPE = "application/octet-stream";
export const QPG_FORMAT = "qalam-page";
export const QPG_VERSION = 1;

export interface QpgDocument {
  title: string;
  content: DocNode;
  documentSettings: DocumentStudioSettings;
  frames: StudioFrame[];
  minimumPages: number;
  columns: { count: number; gutterMm: number };
  viewMode: DocumentViewMode;
}

export type QpgFile = QpgDocument & { format: typeof QPG_FORMAT; version: typeof QPG_VERSION };

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateEmbeddedImages(node: DocNode): void {
  if (node.type === "image" && !(
    typeof node.attrs?.src === "string" &&
    /^data:image\/(?:png|jpeg|webp);base64,[a-z\d+/]+={0,2}$/i.test(node.attrs.src)
  )) throw new Error("یہ تصویر فائل کے اندر محفوظ نہیں ہو سکتی۔ پہلے تصویر دوبارہ شامل کریں۔");
  node.content?.forEach(validateEmbeddedImages);
}

/** Do not normalize TipTap JSON: unknown attributes and future frame links are preserved. */
export function serializeQpg(document: QpgDocument): string {
  validateQpgDocument(document);
  validateEmbeddedImages(document.content);
  return JSON.stringify({ format: QPG_FORMAT, version: QPG_VERSION, ...document });
}

function validateQpgDocument(value: unknown): asserts value is QpgDocument {
  if (!isObject(value) || typeof value.title !== "string" ||
    !isObject(value.content) || value.content.type !== "doc" || !Array.isArray(value.content.content) ||
    !isObject(value.documentSettings) || value.documentSettings.version !== 1 ||
    !isObject(value.documentSettings.page) || !isObject(value.documentSettings.typography) ||
    !Array.isArray(value.frames) ||
    !value.frames.every(frame => isObject(frame) && typeof frame.id === "string" &&
      typeof frame.kind === "string" && typeof frame.page === "number" &&
      typeof frame.xMm === "number" && typeof frame.yMm === "number" &&
      typeof frame.wMm === "number" && typeof frame.hMm === "number" &&
      typeof frame.text === "string") ||
    !Number.isInteger(value.minimumPages) || (value.minimumPages as number) < 1 ||
    !isObject(value.columns) || !Number.isInteger(value.columns.count) ||
    (value.columns.count as number) < 1 || (value.columns.count as number) > 32 ||
    typeof value.columns.gutterMm !== "number" || !Number.isFinite(value.columns.gutterMm) ||
    !["pages", "facing", "pageless"].includes(String(value.viewMode))
  ) throw new Error("یہ Qalam Page فائل نامکمل یا خراب ہے۔ موجودہ دستاویز محفوظ ہے۔");
}

export function deserializeQpg(json: string): QpgDocument {
  let parsed: unknown;
  try { parsed = JSON.parse(json); }
  catch { throw new Error("یہ Qalam Page فائل خراب ہے۔ موجودہ دستاویز محفوظ ہے۔"); }
  if (!isObject(parsed) || parsed.format !== QPG_FORMAT)
    throw new Error("یہ Qalam Page کی درست فائل نہیں ہے۔ موجودہ دستاویز محفوظ ہے۔");
  if (typeof parsed.version !== "number" || !Number.isInteger(parsed.version))
    throw new Error("فائل کا ورژن درست نہیں ہے۔ موجودہ دستاویز محفوظ ہے۔");
  if (parsed.version > QPG_VERSION)
    throw new Error("یہ Qalam Page کے نئے ورژن کی فائل ہے۔ براہِ کرم پروگرام تازہ کریں۔ موجودہ دستاویز محفوظ ہے۔");
  if (parsed.version !== QPG_VERSION)
    throw new Error("یہ Qalam Page فائل کا پرانا غیر معاون ورژن ہے۔ موجودہ دستاویز محفوظ ہے۔");
  validateQpgDocument(parsed);
  validateEmbeddedImages(parsed.content);
  const { format: _format, version: _version, ...document } = parsed;
  return document as unknown as QpgDocument;
}

export function qpgFilename(title: string): string {
  const safe = title.replace(/\.qpg$/i, "").replace(/[\\/:*?"<>|\u0000-\u001f]/g, "").trim();
  return (safe || "Qalam Page") + ".qpg";
}

export function makeQpgFile(document: QpgDocument): File {
  return new File([serializeQpg(document)], qpgFilename(document.title), { type: QPG_MIME_TYPE });
}

export function downloadQpgFile(file: File): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type ShareNavigator = {
  canShare?: (data: { files: File[] }) => boolean;
  share?: (data: { files: File[] }) => Promise<void>;
};

export async function shareOrDownloadQpg(
  file: File,
  navigatorLike: ShareNavigator,
  download: (file: File) => void = downloadQpgFile,
): Promise<"shared" | "downloaded" | "cancelled"> {
  try {
    if (navigatorLike.share && navigatorLike.canShare?.({ files: [file] })) {
      await navigatorLike.share({ files: [file] });
      return "shared";
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return "cancelled";
  }
  download(file);
  return "downloaded";
}

const LAYOUT_STORAGE = "qalam-qpg-layout-v1";
export function writeStoredQpgLayout(id: string, layout: Pick<QpgDocument, "columns" | "viewMode">): void {
  const all = JSON.parse(localStorage.getItem(LAYOUT_STORAGE) || "{}") as Record<string, unknown>;
  all[id] = layout;
  localStorage.setItem(LAYOUT_STORAGE, JSON.stringify(all));
}
export function readStoredQpgLayout(id: string): Pick<QpgDocument, "columns" | "viewMode"> | null {
  try {
    const layout = (JSON.parse(localStorage.getItem(LAYOUT_STORAGE) || "{}") as Record<string, unknown>)[id];
    if (!isObject(layout) || !isObject(layout.columns) || typeof layout.columns.count !== "number" ||
      typeof layout.columns.gutterMm !== "number" || !["pages","facing","pageless"].includes(String(layout.viewMode))) return null;
    return layout as Pick<QpgDocument, "columns" | "viewMode">;
  } catch { return null; }
}
