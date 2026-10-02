export type KhateebNoteScope = {
  topicId: string;
  seriesLength: number;
  layer: "fresh" | "research";
  sessionNumber: number;
};

export type StoredKhateebNote = {
  text: string;
  updatedAt: string;
};

const PREFIX = "qalam-khateeb-note-v1";

export function khateebNoteKey(scope: KhateebNoteScope): string {
  return [
    PREFIX,
    scope.topicId,
    scope.seriesLength,
    scope.layer,
    scope.sessionNumber,
  ].join(":");
}

export function parseStoredKhateebNote(raw: string | null): StoredKhateebNote {
  if (!raw) return { text: "", updatedAt: "" };
  try {
    const value = JSON.parse(raw) as Partial<StoredKhateebNote>;
    return {
      text: typeof value.text === "string" ? value.text : "",
      updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : "",
    };
  } catch {
    return { text: raw, updatedAt: "" };
  }
}

export function serializeKhateebNote(
  text: string,
  updatedAt = new Date().toISOString(),
): string {
  return JSON.stringify({ text, updatedAt } satisfies StoredKhateebNote);
}
