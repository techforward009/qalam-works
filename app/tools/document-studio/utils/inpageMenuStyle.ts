import type { CSSProperties } from "react";

export const INPAGE_MENU_HOVER_BG = "#e6efff";
export const INPAGE_MENU_HOVER_BORDER = "#9dbff8";
export const INPAGE_MENU_OPEN_BG = "#d6dff2";
export const INPAGE_MENU_OPEN_BORDER = "#89a8db";

export const INPAGE_MENU_SEPARATOR_CLASS =
  "ms-[30px] me-[3px] my-1 border-t border-[#a0a0a0] shadow-[0_1px_0_#fff]";

export const INPAGE_MENU_FRAME_STYLE: CSSProperties = {
  borderStyle: "solid",
  borderWidth: 1,
  borderColor: "#fff #808080 #808080 #fff",
  boxShadow: "1px 1px 0 #c0c0c0, 2px 2px 0 #808080",
  backgroundColor: "#f0f0f0",
};

export function inpageMenuGutterBackground(isRtl: boolean): string {
  const dir = isRtl ? "to left" : "to right";
  return `linear-gradient(${dir}, #f0f0f0 0, #f0f0f0 27px, #d4d4d4 27px, #d4d4d4 28px, #fff 28px, #fff 29px, transparent 29px)`;
}

export const INPAGE_MENU_ITEM_STYLE: CSSProperties = {
  position: "relative",
  height: 22,
  minHeight: 22,
  maxHeight: 22,
  width: "100%",
  padding: "0 20px 0 32px",
  gap: 12,
  border: 0,
  fontFamily: "QalamUISegoe, Segoe UI, Tahoma, sans-serif",
  fontSize: 12,
  lineHeight: "22px",
  color: "#000",
  whiteSpace: "nowrap",
};
