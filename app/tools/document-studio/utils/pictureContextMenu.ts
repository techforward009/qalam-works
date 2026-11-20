export type PictureContextToolMode = "hand" | "arrow" | "arrow-empty";

export type HandPictureContextItemId =
  | "zoom"
  | "importPicture"
  | "selectAll"
  | "cut"
  | "copy"
  | "clear"
  | "paste";

export type ArrowPictureContextItemId =
  | "zoom"
  | "selectAll"
  | "cut"
  | "copy"
  | "clear"
  | "object";

export type ArrowEmptyContextItemId = "zoom" | "selectAll" | "paste";

export type PictureContextItemId =
  | HandPictureContextItemId
  | ArrowPictureContextItemId
  | ArrowEmptyContextItemId;

export type PictureContextItem = {
  id: PictureContextItemId;
  label: string;
  submenu?: boolean;
};

export const HAND_PICTURE_CONTEXT_ITEMS: ReadonlyArray<PictureContextItem> = [
  { id: "zoom", label: "Zoom", submenu: true },
  { id: "importPicture", label: "Import Picture…" },
  { id: "selectAll", label: "Select All" },
  { id: "cut", label: "Cut" },
  { id: "copy", label: "Copy" },
  { id: "clear", label: "Clear" },
  { id: "paste", label: "Paste" },
];

export const ARROW_PICTURE_CONTEXT_ITEMS: ReadonlyArray<PictureContextItem> = [
  { id: "zoom", label: "Zoom", submenu: true },
  { id: "selectAll", label: "Select All" },
  { id: "cut", label: "Cut" },
  { id: "copy", label: "Copy" },
  { id: "clear", label: "Clear" },
  { id: "object", label: "Object…" },
];

export const ARROW_EMPTY_CONTEXT_ITEMS: ReadonlyArray<PictureContextItem> = [
  { id: "zoom", label: "Zoom", submenu: true },
  { id: "selectAll", label: "Select All" },
  { id: "paste", label: "Paste" },
];

export function pictureContextItems(mode: PictureContextToolMode): ReadonlyArray<PictureContextItem> {
  if (mode === "hand") return HAND_PICTURE_CONTEXT_ITEMS;
  if (mode === "arrow-empty") return ARROW_EMPTY_CONTEXT_ITEMS;
  return ARROW_PICTURE_CONTEXT_ITEMS;
}
