export const MAX_DOCUMENT_IMAGE_BYTES = 2 * 1024 * 1024;
export const MAX_DOCUMENT_IMAGE_TOTAL_BYTES = 8 * 1024 * 1024;
export const DOCUMENT_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

export type DocumentImageValidationError =
  | "unsupported"
  | "oversized"
  | "malformed"
  | "budget";

/** Image metadata is displayed as text and exported as text, never markup. */
export function sanitizeImageMetadata(value: string): string {
  return value.replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, "");
}

export async function validateDocumentImage(file: File): Promise<DocumentImageValidationError | null> {
  if (!DOCUMENT_IMAGE_TYPES.includes(file.type as typeof DOCUMENT_IMAGE_TYPES[number])) return "unsupported";
  if (file.size <= 0 || file.size > MAX_DOCUMENT_IMAGE_BYTES) return "oversized";
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const isPng = header.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => header[index] === value);
  const isJpeg = header.length >= 3 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  const isWebp = header.length >= 12
    && String.fromCharCode(...header.slice(0, 4)) === "RIFF"
    && String.fromCharCode(...header.slice(8, 12)) === "WEBP";
  const signatureMatchesType = (file.type === "image/png" && isPng)
    || (file.type === "image/jpeg" && isJpeg)
    || (file.type === "image/webp" && isWebp);
  if (!signatureMatchesType) return "malformed";
  return null;
}

export function imageDataUrlByteLength(src: string): number {
  const comma = src.indexOf(",");
  if (comma < 0 || !src.slice(0, comma).endsWith(";base64")) return 0;
  const payload = src.slice(comma + 1).replace(/\s/g, "");
  return Math.floor((payload.length * 3) / 4) - (payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0);
}

export function documentImagePayloadBytes(document: { content?: Array<{ type?: string; attrs?: Record<string, unknown>; content?: unknown[] }> }): number {
  const walk = (nodes: Array<{ type?: string; attrs?: Record<string, unknown>; content?: unknown[] }> | undefined): number =>
    (nodes ?? []).reduce<number>((total, node) => {
      if (!node) return total;
      const own = node.type === "image" && typeof node.attrs?.src === "string"
        ? imageDataUrlByteLength(node.attrs.src)
        : 0;
      return total + own + walk(node.content as Array<{ type?: string; attrs?: Record<string, unknown>; content?: unknown[] }> | undefined);
    }, 0);
  return walk(document.content ?? []);
}

export function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Image could not be read."));
    reader.onload = () => {
      if (typeof reader.result !== "string") { reject(new Error("Image could not be read.")); return; }
      // docx supports PNG/JPEG but not WebP. Convert the accepted WebP input
      // before it reaches the persisted document node so every export path is
      // truthful and uses the same stored asset.
      if (file.type !== "image/webp") { resolve(reader.result); return; }
      const image = new Image();
      image.onerror = () => reject(new Error("WebP image could not be converted."));
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d");
        if (!context) { reject(new Error("WebP image could not be converted.")); return; }
        context.drawImage(image, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onerror = () => reject(new Error("Image dimensions could not be read."));
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.src = src;
  });
}
