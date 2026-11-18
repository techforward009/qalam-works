export type PictureContextToolMode = "hand" | "arrow";

export type HandPictureContextItemId = "zoom" | "importPicture" | "selectAll" | "paste";
export type ArrowPictureContextItemId = "zoom" | "selectAll" | "cut" | "copy" | "clear" | "object";
export type PictureContextItemId = HandPictureContextItemId | ArrowPictureContextItemId;

export type PictureContextItem = {
  id: PictureContextItemId;
  label: string;
  submenu?: boolean;
};

export const HAND_PICTURE_CONTEXT_ITEMS: ReadonlyArray<PictureContextItem> = [
  { id: "zoom", label: "Zoom", submenu: true },
  { id: "importPicture", label: "Import Picture…" },
  { id: "selectAll", label: "Select All" },
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

export function pictureContextItems(mode: PictureContextToolMode): ReadonlyArray<PictureContextItem> {
  return mode === "hand" ? HAND_PICTURE_CONTEXT_ITEMS : ARROW_PICTURE_CONTEXT_ITEMS;
}
