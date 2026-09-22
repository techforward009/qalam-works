export type IngestKind = "pdf" | "docx" | "txt" | "md" | "unsupported";

function hasMagic(bytes: Uint8Array, magic: number[]): boolean {
  if (bytes.length < magic.length) return false;
  return magic.every((b, i) => bytes[i] === b);
}

/**
 * Filename + MIME + magic bytes. Unknown binaries are unsupported (no OCR).
 */
export function sniffKind(
  filename: string,
  mimeType: string | undefined,
  bytes: Uint8Array,
): IngestKind {
  const name = filename.toLowerCase();
  const mime = (mimeType ?? "").toLowerCase();

  if (hasMagic(bytes, [0x25, 0x50, 0x44, 0x46]) || name.endsWith(".pdf") || mime === "application/pdf") {
    return "pdf";
  }

  if (
    name.endsWith(".docx") ||
    mime.includes("wordprocessingml") ||
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "docx";
  }

  if (name.endsWith(".md") || mime === "text/markdown" || mime === "text/x-markdown") {
    return "md";
  }

  if (name.endsWith(".txt") || mime === "text/plain") {
    return "txt";
  }

  if (
    hasMagic(bytes, [0x89, 0x50, 0x4e, 0x47]) ||
    hasMagic(bytes, [0xff, 0xd8, 0xff]) ||
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".webp")
  ) {
    return "unsupported";
  }

  return "unsupported";
}

export function mimeForKind(kind: IngestKind, fallback?: string): string {
  if (fallback && fallback.length > 0) return fallback;
  switch (kind) {
    case "pdf":
      return "application/pdf";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "md":
      return "text/markdown";
    case "txt":
      return "text/plain";
    default:
      return "application/octet-stream";
  }
}
