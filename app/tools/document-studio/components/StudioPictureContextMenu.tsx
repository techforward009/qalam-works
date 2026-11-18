"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { DocumentZoom } from "../utils/documentView";
import { studioOverlayRoot } from "../utils/inpageToolbar";
import { CONTEXT_ZOOMS, contextMenuPosition } from "../utils/textContextMenu";
import {
  pictureContextItems,
  type PictureContextItemId,
  type PictureContextToolMode,
} from "../utils/pictureContextMenu";

const itemStyle: React.CSSProperties = {
  height: 20,
  minHeight: 20,
  width: "100%",
  padding: "0 20px",
  textAlign: "left",
  fontFamily: "QalamUITahoma, Tahoma, MS Sans Serif, sans-serif",
  fontSize: 11,
  color: "#000",
  whiteSpace: "nowrap",
};

function enabledItems(menu: HTMLElement | null) {
  return menu ? [...menu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')] : [];
}

export type PictureContextRequest = {
  id: string;
  x: number;
  y: number;
  mode: PictureContextToolMode;
};

export function StudioPictureContextMenu({
  toolMode,
  disabledIds,
  onZoom,
  onAction,
}: {
  toolMode: PictureContextToolMode;
  disabledIds?: ReadonlySet<PictureContextItemId>;
  onZoom: (zoom: DocumentZoom) => void;
  onAction: (id: Exclude<PictureContextItemId, "zoom">, frameId: string, mode: PictureContextToolMode) => void;
}) {
  const [menu, setMenu] = useState<PictureContextRequest | null>(null);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const [subPosition, setSubPosition] = useState({ left: 0, top: 0 });
  const root = useRef<HTMLDivElement>(null);
  const submenu = useRef<HTMLDivElement>(null);
  const zoomTrigger = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  const close = (restoreFocus = false) => {
    setMenu(null);
    setZoomOpen(false);
    if (restoreFocus) returnFocus.current?.focus({ preventScroll: true });
  };

  useEffect(() => {
    const open = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string; x: number; y: number; tool?: string }>).detail;
      if (!detail?.id) return;
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const mode: PictureContextToolMode = detail.tool === "select" ? "arrow" : detail.tool === "text" ? "hand" : toolMode;
      setMenu({ id: detail.id, x: detail.x, y: detail.y, mode });
      setZoomOpen(false);
      delete (window as Window & { __studioPictureContextRequest?: unknown }).__studioPictureContextRequest;
    };
    window.addEventListener("studio-picture-context", open);
    const pending = (window as Window & { __studioPictureContextRequest?: { id: string; x: number; y: number; tool?: string } }).__studioPictureContextRequest;
    if (pending?.id) {
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const mode: PictureContextToolMode = pending.tool === "select" ? "arrow" : pending.tool === "text" ? "hand" : toolMode;
      setMenu({ id: pending.id, x: pending.x, y: pending.y, mode });
      setZoomOpen(false);
      delete (window as Window & { __studioPictureContextRequest?: unknown }).__studioPictureContextRequest;
    }
    return () => window.removeEventListener("studio-picture-context", open);
  }, [toolMode]);

  useEffect(() => {
    if (!menu) return;
    const outside = (event: Event) => {
      if (event.target instanceof Node && (root.current?.contains(event.target) || submenu.current?.contains(event.target))) return;
      close();
    };
    const dismiss = () => close();
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("scroll", outside, true);
    window.addEventListener("resize", dismiss);
    window.addEventListener("blur", dismiss);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("scroll", outside, true);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("blur", dismiss);
    };
  }, [menu]);

  useLayoutEffect(() => {
    if (!menu || !root.current) return;
    setPosition(
      contextMenuPosition(menu.x, menu.y, root.current.offsetWidth, root.current.offsetHeight, window.innerWidth, window.innerHeight),
    );
    enabledItems(root.current)[0]?.focus({ preventScroll: true });
  }, [menu]);

  useLayoutEffect(() => {
    if (!zoomOpen || !zoomTrigger.current || !submenu.current) return;
    const rect = zoomTrigger.current.getBoundingClientRect();
    const width = submenu.current.offsetWidth;
    const x = rect.right + width + 4 <= window.innerWidth ? rect.right : rect.left - width;
    setSubPosition(contextMenuPosition(x, rect.top, width, submenu.current.offsetHeight, window.innerWidth, window.innerHeight));
  }, [zoomOpen, position]);

  const onKeyDown = (event: React.KeyboardEvent, sub = false) => {
    const items = enabledItems(sub ? submenu.current : root.current);
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (["ArrowDown", "ArrowUp", "Home", "End", "Escape", "ArrowLeft", "ArrowRight", "Tab"].includes(event.key)) {
      event.preventDefault();
    }
    if (event.key === "ArrowDown") items[(index + 1) % items.length]?.focus({ preventScroll: true });
    else if (event.key === "ArrowUp") items[index <= 0 ? items.length - 1 : index - 1]?.focus({ preventScroll: true });
    else if (event.key === "Home") items[0]?.focus({ preventScroll: true });
    else if (event.key === "End") items.at(-1)?.focus({ preventScroll: true });
    else if (event.key === "Escape" || event.key === "ArrowLeft") {
      if (sub || zoomOpen) {
        setZoomOpen(false);
        zoomTrigger.current?.focus({ preventScroll: true });
      } else {
        close(true);
      }
    } else if (event.key === "ArrowRight" && !sub && document.activeElement === zoomTrigger.current) {
      setZoomOpen(true);
      requestAnimationFrame(() => enabledItems(submenu.current)[0]?.focus({ preventScroll: true }));
    } else if (event.key === "Tab") {
      close(true);
    }
  };

  if (!menu) return null;

  const items = pictureContextItems(menu.mode);

  return createPortal(
    <>
      <div
        ref={root}
        role="menu"
        aria-label={menu.mode === "hand" ? "Picture hand context menu" : "Picture object context menu"}
        data-studio-picture-menu={menu.mode}
        dir="ltr"
        className="fixed z-[120] border border-[#808080] bg-[#f0f0f0] py-1 shadow-md"
        style={{
          ...position,
          width: 180,
          maxWidth: "calc(100vw - 8px)",
          maxHeight: "calc(100vh - 8px)",
          overflowY: "auto",
        }}
        onKeyDown={(event) => onKeyDown(event)}
        onPointerDown={(event) => event.stopPropagation()}
        onContextMenu={(event) => event.preventDefault()}
      >
        {items.map((item) => {
          if (item.id === "zoom") {
            return (
              <button
                ref={zoomTrigger}
                key={item.id}
                type="button"
                role="menuitem"
                data-picture-menu="zoom"
                aria-haspopup="menu"
                aria-expanded={zoomOpen}
                style={itemStyle}
                className="flex items-center justify-between hover:bg-[#d6dff2] focus:bg-[#d6dff2]"
                onPointerEnter={() => setZoomOpen(true)}
                onClick={() => {
                  setZoomOpen(true);
                  requestAnimationFrame(() => enabledItems(submenu.current)[0]?.focus({ preventScroll: true }));
                }}
              >
                {item.label}
                <span aria-hidden>▸</span>
              </button>
            );
          }
          const disabled = Boolean(disabledIds?.has(item.id));
          return (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              data-picture-menu={item.id}
              disabled={disabled}
              aria-disabled={disabled || undefined}
              style={{ ...itemStyle, color: disabled ? "#808080" : "#000" }}
              className="block enabled:hover:bg-[#d6dff2] enabled:focus:bg-[#d6dff2]"
              onPointerEnter={() => setZoomOpen(false)}
              onClick={() => {
                const targetId = menu.id;
                const mode = menu.mode;
                close();
                onAction(item.id, targetId, mode);
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {zoomOpen ? (
        <div
          ref={submenu}
          role="menu"
          aria-label="Zoom"
          data-studio-picture-context-zoom
          dir="ltr"
          className="fixed z-[121] border border-[#808080] bg-[#f0f0f0] py-1 shadow-md"
          style={{
            ...subPosition,
            width: 150,
            maxWidth: "calc(100vw - 8px)",
            maxHeight: "calc(100vh - 8px)",
            overflowY: "auto",
          }}
          onKeyDown={(event) => onKeyDown(event, true)}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {CONTEXT_ZOOMS.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              style={itemStyle}
              className="block hover:bg-[#d6dff2] focus:bg-[#d6dff2]"
              onClick={() => {
                close(true);
                onZoom(item.value);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </>,
    studioOverlayRoot(),
  );
}
