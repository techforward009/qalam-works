export type KhateebNoteScope = {
  topicId: string;
  seriesLength: number;
  layer: "fresh" | "research";
  sessionNumber: number;
};

export type StoredKhateebNote = {
  text: string;
  updatedAt: string;
  topicTitleUr?: string;
  topicTitleEn?: string;
  sessionTitleUr?: string;
  sessionTitleEn?: string;
};

export const KHATEEB_NOTE_PREFIX = "qalam-khateeb-note-v1";

export function khateebNoteKey(scope: KhateebNoteScope): string {
  return [
    KHATEEB_NOTE_PREFIX,
    scope.topicId,
    scope.seriesLength,
    scope.layer,
    scope.sessionNumber,
  ].join(":");
}

export function parseKhateebNoteKey(key: string): KhateebNoteScope | null {
  const parts = key.split(":");
  if (parts.length !== 5 || parts[0] !== KHATEEB_NOTE_PREFIX) return null;
  const seriesLength = Number(parts[2]);
  const sessionNumber = Number(parts[4]);
  const layer = parts[3];
  if (
    !parts[1] ||
    !Number.isFinite(seriesLength) ||
    !Number.isFinite(sessionNumber) ||
    (layer !== "fresh" && layer !== "research")
  ) return null;
  return {
    topicId: parts[1],
    seriesLength,
    layer,
    sessionNumber,
  };
}

export function parseStoredKhateebNote(raw: string | null): StoredKhateebNote {
  if (!raw) return { text: "", updatedAt: "" };
  try {
    const value = JSON.parse(raw) as Partial<StoredKhateebNote>;
    return {
      text: typeof value.text === "string" ? value.text : "",
      updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : "",
      topicTitleUr: typeof value.topicTitleUr === "string" ? value.topicTitleUr : undefined,
      topicTitleEn: typeof value.topicTitleEn === "string" ? value.topicTitleEn : undefined,
      sessionTitleUr: typeof value.sessionTitleUr === "string" ? value.sessionTitleUr : undefined,
      sessionTitleEn: typeof value.sessionTitleEn === "string" ? value.sessionTitleEn : undefined,
    };
  } catch {
    return { text: raw, updatedAt: "" };
  }
}

export function serializeKhateebNote(
  text: string,
  updatedAt = new Date().toISOString(),
  metadata: Pick<
    StoredKhateebNote,
    "topicTitleUr" | "topicTitleEn" | "sessionTitleUr" | "sessionTitleEn"
  > = {},
): string {
  return JSON.stringify({ text, updatedAt, ...metadata } satisfies StoredKhateebNote);
}
