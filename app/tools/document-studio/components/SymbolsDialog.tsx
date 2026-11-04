import { readFormattingTarget, SYMBOL_INSERT } from "../utils/formattingSafety";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";

export interface SymbolItem {
  id: string;
  label: string;
  kind: "text" | "svg";
  text?: string;
  svg?: string;
  /** Urdu number shown inside a circled ("svg") item. */
  number?: string;
}

export interface SymbolsDialogProps {
  open: boolean;
  onInsert: (item: SymbolItem) => void;
  onClose: () => void;
}

const URDU_FONT_FAMILY = "Jameel Noori Nastaleeq, Noto Nastaliq Urdu, Noto Naskh Arabic, serif";

const SVG_FONT_FAMILY = "'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', 'Noto Naskh Arabic', serif";

function escapeSvgText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Original, self-contained circled number SVG (no external refs, no script). */
export function circledNumberSvg(n: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%"><circle cx="50" cy="50" r="44" fill="white" stroke="black" stroke-width="3"/><text x="50" y="50" font-size="46" font-family="${SVG_FONT_FAMILY}" text-anchor="middle" dominant-baseline="central" fill="black">${escapeSvgText(n)}</text></svg>`;
}

/** Text actually inserted into the document for an item. The document image node is a
 * block-level raster figure (PDF export only accepts png/jpeg/webp), so circled numbers
 * fall back to the Urdu number in parentheses as plain text. */
export function symbolInsertText(item: SymbolItem): string {
  if (item.kind === "text") return item.text ?? "";
  return item.number ? `(${item.number})` : "";
}

/** Insert at the editor's current selection without stealing focus from the dialog. */
export function insertSymbolIntoEditor(editor: Editor | null | undefined, item: SymbolItem): boolean {
  if (!editor || editor.isDestroyed) return false;
  const text = symbolInsertText(item);
  if (!text) return false;
  // A text box (textarea) that owns the formatting target gets the symbol at its own caret.
  const target = readFormattingTarget(editor.view.dom as HTMLElement);
  const box = target?.owner === "frame" ? target.input : null;
  if (box && box.isConnected && !box.readOnly) {
    const start = box.selectionStart ?? box.value.length;
    const end = box.selectionEnd ?? start;
    box.setRangeText(text, start, end, "end");
    box.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }
  const { state } = editor;
  const { from, to } = state.selection;
  const tr = state.tr.insertText(text, from, to).setMeta(SYMBOL_INSERT, true);
  editor.view.dispatch(tr.scrollIntoView());
  return true;
}

export const SYMBOL_GROUPS: { id: string; title: string; items: SymbolItem[] }[] = [
  {
    id: "honorifics",
    title: "Honorifics",
    items: [
      { id: "hon-1", label: "Sallallahu Alayhi Wa Alihi Wasallam", kind: "text", text: "صلی اللہ علیہ و آلہ وسلم" },
      { id: "hon-2", label: "Alayhis Salam", kind: "text", text: "علیہ السلام" },
      { id: "hon-3", label: "Alayhas Salam", kind: "text", text: "علیہا السلام" },
      { id: "hon-4", label: "Alayhimas Salam", kind: "text", text: "علیہما السلام" },
      { id: "hon-5", label: "Alayhimus Salam", kind: "text", text: "علیہم السلام" },
      { id: "hon-6", label: "Salamullahi Alayha", kind: "text", text: "سلام اللہ علیہا" },
      { id: "hon-7", label: "Rahmatullah Alayh", kind: "text", text: "رحمۃ اللہ علیہ" },
      { id: "hon-8", label: "Rahmatullah Alayha", kind: "text", text: "رحمۃ اللہ علیہا" },
      { id: "hon-9", label: "Radiyallahu Anhu", kind: "text", text: "رضی اللہ عنہ" },
      { id: "hon-10", label: "Radiyallahu Anha", kind: "text", text: "رضی اللہ عنہا" },
      { id: "hon-11", label: "Radiyallahu Anhuma", kind: "text", text: "رضی اللہ عنہما" },
      { id: "hon-12", label: "Radiyallahu Anhum", kind: "text", text: "رضی اللہ عنہم" },
      { id: "hon-13", label: "Radiyallahu Anhunna", kind: "text", text: "رضی اللہ عنہن" },
      { id: "hon-14", label: "Ridwanullahi Ta'ala Alayh", kind: "text", text: "رضوان اللہ تعالی علیہ" }
    ]
  },
  {
    id: "brackets-marks",
    title: "Brackets & marks",
    items: [
      { id: "bm-1", label: "Right Ornate Parenthesis", kind: "text", text: "﴿" },
      { id: "bm-2", label: "Left Ornate Parenthesis", kind: "text", text: "﴾" },
      { id: "bm-3", label: "Left Curly Bracket", kind: "text", text: "{" },
      { id: "bm-4", label: "Right Curly Bracket", kind: "text", text: "}" },
      { id: "bm-5", label: "Arabic Five Pointed Star", kind: "text", text: "٭" },
      { id: "bm-6", label: "Yes Tick", kind: "text", text: "✓" },
      { id: "bm-7", label: "No Tick", kind: "text", text: "✗" },
      { id: "bm-8", label: "Black Ball", kind: "text", text: "●" },
      { id: "bm-9", label: "Arabic Ligature Sallallahu Alayhi Wasallam", kind: "text", text: "ﷺ" },
      { id: "bm-10", label: "Arabic Ligature Bismillah Ar-Rahman Ar-Raheem", kind: "text", text: "﷽" }
    ]
  },
  {
    id: "urdu-numbers",
    title: "Urdu numbers",
    items: [
      { id: "un-1", label: "Urdu Number One", kind: "text", text: "۱" },
      { id: "un-2", label: "Urdu Number Two", kind: "text", text: "۲" },
      { id: "un-3", label: "Urdu Number Three", kind: "text", text: "۳" },
      { id: "un-4", label: "Urdu Number Four", kind: "text", text: "۴" },
      { id: "un-5", label: "Urdu Number Five", kind: "text", text: "۵" },
      { id: "un-6", label: "Urdu Number Six", kind: "text", text: "۶" },
      { id: "un-7", label: "Urdu Number Seven", kind: "text", text: "۷" },
      { id: "un-8", label: "Urdu Number Eight", kind: "text", text: "۸" },
      { id: "un-9", label: "Urdu Number Nine", kind: "text", text: "۹" },
      { id: "un-0", label: "Urdu Number Zero", kind: "text", text: "۰" }
    ]
  },
  {
    id: "circled-numbers",
    title: "Circled numbers",
    items: [
      { id: "cn-1", label: "Circled Urdu Number One", kind: "svg", number: "۱", svg: circledNumberSvg("۱") },
      { id: "cn-2", label: "Circled Urdu Number Two", kind: "svg", number: "۲", svg: circledNumberSvg("۲") },
      { id: "cn-3", label: "Circled Urdu Number Three", kind: "svg", number: "۳", svg: circledNumberSvg("۳") },
      { id: "cn-4", label: "Circled Urdu Number Four", kind: "svg", number: "۴", svg: circledNumberSvg("۴") },
      { id: "cn-5", label: "Circled Urdu Number Five", kind: "svg", number: "۵", svg: circledNumberSvg("۵") },
      { id: "cn-6", label: "Circled Urdu Number Six", kind: "svg", number: "۶", svg: circledNumberSvg("۶") },
      { id: "cn-7", label: "Circled Urdu Number Seven", kind: "svg", number: "۷", svg: circledNumberSvg("۷") },
      { id: "cn-8", label: "Circled Urdu Number Eight", kind: "svg", number: "۸", svg: circledNumberSvg("۸") },
      { id: "cn-9", label: "Circled Urdu Number Nine", kind: "svg", number: "۹", svg: circledNumberSvg("۹") },
      { id: "cn-10", label: "Circled Urdu Number Ten", kind: "svg", number: "۱۰", svg: circledNumberSvg("۱۰") }
    ]
  }
];

export const SymbolsDialog: React.FC<SymbolsDialogProps> = ({ open, onInsert, onClose }) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string>(SYMBOL_GROUPS[0].id);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number>(0);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ pointerX: number; pointerY: number; posX: number; posY: number }>({
    pointerX: 0,
    pointerY: 0,
    posX: 0,
    posY: 0
  });

  const dialogRef = useRef<HTMLDivElement>(null);
  const activeTileRef = useRef<HTMLButtonElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const activeGroup = SYMBOL_GROUPS.find((g) => g.id === selectedGroupId) || SYMBOL_GROUPS[0];
  const items = activeGroup.items;
  const currentItem = items[selectedItemIndex] || items[0];

  useEffect(() => {
    if (open) {
      setSelectedGroupId(SYMBOL_GROUPS[0].id);
      setSelectedItemIndex(0);
      if (typeof window !== "undefined") {
        const dialogWidth = 720;
        const dialogHeight = Math.min(window.innerHeight * 0.8, 600);
        const initialX = Math.max(10, Math.round((window.innerWidth - dialogWidth) / 2));
        const initialY = Math.max(10, Math.round((window.innerHeight - dialogHeight) / 2));
        setPosition({ x: initialX, y: initialY });
      }
    }
  }, [open]);

  useEffect(() => {
    if (open && activeTileRef.current) {
      activeTileRef.current.focus();
    }
  }, [open, selectedGroupId, selectedItemIndex]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) {
      return;
    }
    isDraggingRef.current = true;
    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      posX: position?.x || 0,
      posY: position?.y || 0
    };
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - dragStartRef.current.pointerX;
    const deltaY = e.clientY - dragStartRef.current.pointerY;
    let newX = dragStartRef.current.posX + deltaX;
    let newY = dragStartRef.current.posY + deltaY;

    if (typeof window !== "undefined") {
      const dialogWidth = dialogRef.current ? dialogRef.current.offsetWidth : 720;
      const minX = -dialogWidth + 40;
      const maxX = window.innerWidth - 40;
      const minY = 0;
      const maxY = Math.max(0, window.innerHeight - 30);
      newX = Math.max(minX, Math.min(newX, maxX));
      newY = Math.max(minY, Math.min(newY, maxY));
    }

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const getGridColumns = useCallback((): number => {
    if (!gridContainerRef.current) return 4;
    const containerWidth = gridContainerRef.current.clientWidth - 16;
    const tileWidth = 72;
    const cols = Math.floor(containerWidth / tileWidth);
    return Math.max(1, cols);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();

    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key === "Enter") {
      const target = e.target as HTMLElement;
      // Let focused Insert/Close/group buttons handle Enter natively (avoid double actions).
      if (target.tagName === "BUTTON" && !target.hasAttribute("data-symbol-id")) return;
      e.preventDefault();
      if (currentItem) {
        onInsert(currentItem);
      }
      return;
    }

    const cols = getGridColumns();
    const count = items.length;

    if (e.key === "ArrowRight") {
      e.preventDefault();
      setSelectedItemIndex((prev) => (prev + 1 < count ? prev + 1 : prev));
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setSelectedItemIndex((prev) => (prev - 1 >= 0 ? prev - 1 : prev));
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedItemIndex((prev) => (prev + cols < count ? prev + cols : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedItemIndex((prev) => (prev - cols >= 0 ? prev - cols : prev));
    }
  };

  if (!open) return null;
  if (typeof document === "undefined") return null;

  const dialogElement = (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.25)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-label="Symbols"
        data-studio-symbols-dialog
        dir="ltr"
        data-testid="studio-symbols-dialog"
        onKeyDown={handleKeyDown}
        onKeyUp={(e) => e.stopPropagation()}
        onBeforeInput={(e) => e.stopPropagation()}
        tabIndex={-1}
        style={{
          direction: "ltr",
          position: "fixed",
          left: position ? `${position.x}px` : "auto",
          top: position ? `${position.y}px` : "auto",
          width: "720px",
          maxWidth: "96vw",
          maxHeight: "80vh",
          backgroundColor: "#f0f0f0",
          border: "1px solid #707070",
          boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
          display: "flex",
          flexDirection: "column",
          fontFamily: "Tahoma, Segoe UI, sans-serif",
          fontSize: "13px",
          color: "#000000",
          outline: "none",
          userSelect: "none"
        }}
      >
        {/* Title Bar */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            height: "30px",
            background: "linear-gradient(to bottom, #0055ea 0%, #0045c4 100%)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 6px 0 10px",
            cursor: "move",
            fontWeight: "bold",
            fontSize: "12px",
            borderBottom: "1px solid #003296"
          }}
        >
          <span style={{ pointerEvents: "none" }}>Symbols</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close"
            style={{
              width: "22px",
              height: "20px",
              backgroundColor: "#c75050",
              border: "1px solid #993333",
              color: "#ffffff",
              fontSize: "11px",
              fontWeight: "bold",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0
            }}
          >
            ✕
          </button>
        </div>

        {/* Dialog Main Body */}
        <div
          style={{
            display: "flex",
            flex: 1,
            padding: "10px",
            gap: "10px",
            overflow: "hidden"
          }}
        >
          {/* Left: Group List */}
          <div
            style={{
              width: "170px",
              backgroundColor: "#ffffff",
              border: "1px solid #7f9db9",
              display: "flex",
              flexDirection: "column",
              overflowY: "auto"
            }}
          >
            {SYMBOL_GROUPS.map((group) => {
              const isActive = group.id === selectedGroupId;
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedGroupId(group.id);
                    setSelectedItemIndex(0);
                  }}
                  style={{
                    padding: "7px 10px",
                    textAlign: "left",
                    backgroundColor: isActive ? "#3399ff" : "transparent",
                    color: isActive ? "#ffffff" : "#000000",
                    border: "none",
                    outline: "none",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: isActive ? "bold" : "normal"
                  }}
                >
                  {group.title}
                </button>
              );
            })}
          </div>

          {/* Right: Grid of tiles & Selected preview */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              minWidth: 0
            }}
          >
            {/* Grid Container */}
            <div
              ref={gridContainerRef}
              style={{
                flex: 1,
                minHeight: "260px",
                maxHeight: "360px",
                backgroundColor: "#ffffff",
                border: "1px solid #7f9db9",
                overflowY: "auto",
                padding: "8px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(68px, 1fr))",
                gridAutoRows: "minmax(68px, auto)",
                gap: "6px"
              }}
            >
              {items.map((item, index) => {
                const isSelected = index === selectedItemIndex;
                const isHonorific = activeGroup.id === "honorifics";

                return (
                  <button
                    key={item.id}
                    ref={isSelected ? activeTileRef : null}
                    type="button"
                    tabIndex={isSelected ? 0 : -1}
                    aria-pressed={isSelected}
                    aria-label={item.label}
                    data-symbol-id={item.id}
                    title={item.label}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedItemIndex(index);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setSelectedItemIndex(index);
                      onInsert(item);
                    }}
                    style={{
                      minWidth: "64px",
                      minHeight: "64px",
                      backgroundColor: isSelected ? "#cce8ff" : "#ffffff",
                      border: isSelected ? "2px solid #0055ea" : "1px solid #d4d0c8",
                      outline: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "4px",
                      position: "relative",
                      overflow: "hidden"
                    }}
                  >
                    <div
                      dir="rtl"
                      style={{
                        direction: "rtl",
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        textAlign: "center",
                        fontFamily: URDU_FONT_FAMILY,
                        fontSize: isHonorific ? "16px" : "30px",
                        lineHeight: isHonorific ? "1.2" : "1",
                        wordBreak: isHonorific ? "break-word" : "normal",
                        color: "#000000"
                      }}
                    >
                      {item.kind === "text" ? (
                        item.text
                      ) : (
                        <div
                          style={{ width: "48px", height: "48px", display: "flex", alignItems: "center", justifyContent: "center" }}
                          dangerouslySetInnerHTML={{ __html: item.svg || "" }}
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Preview Box */}
            <div
              style={{
                height: "76px",
                backgroundColor: "#ffffff",
                border: "1px solid #7f9db9",
                display: "flex",
                alignItems: "center",
                padding: "6px 12px",
                gap: "14px"
              }}
            >
              <div
                dir="rtl"
                style={{
                  direction: "rtl",
                  width: "60px",
                  height: "60px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: URDU_FONT_FAMILY,
                  fontSize: currentItem?.kind === "text" && currentItem?.text && currentItem.text.length > 5 ? "20px" : "48px",
                  lineHeight: "1.1",
                  textAlign: "center",
                  color: "#000000",
                  flexShrink: 0
                }}
              >
                {currentItem ? (
                  currentItem.kind === "text" ? (
                    currentItem.text
                  ) : (
                    <div
                      style={{ width: "54px", height: "54px", display: "flex", alignItems: "center", justifyContent: "center" }}
                      dangerouslySetInnerHTML={{ __html: currentItem.svg || "" }}
                    />
                  )
                ) : null}
              </div>

              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", overflow: "hidden" }}>
                <span style={{ fontWeight: "bold", fontSize: "13px", color: "#222" }}>
                  {currentItem?.label || ""}
                </span>
                <span style={{ fontSize: "11px", color: "#666" }}>
                  Category: {activeGroup.title}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Dialog Footer Actions */}
        <div
          style={{
            padding: "8px 10px 10px 10px",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: "8px",
            backgroundColor: "#f0f0f0",
            borderTop: "1px solid #d4d0c8"
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (currentItem) {
                onInsert(currentItem);
              }
            }}
            style={{
              minWidth: "75px",
              height: "24px",
              padding: "0 12px",
              backgroundColor: "#e1e1e1",
              border: "1px solid #707070",
              boxShadow: "inset 1px 1px 0 #fff",
              cursor: "pointer",
              fontSize: "12px",
              fontFamily: "inherit"
            }}
          >
            Insert
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            style={{
              minWidth: "75px",
              height: "24px",
              padding: "0 12px",
              backgroundColor: "#e1e1e1",
              border: "1px solid #707070",
              boxShadow: "inset 1px 1px 0 #fff",
              cursor: "pointer",
              fontSize: "12px",
              fontFamily: "inherit"
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialogElement, document.body);
};
