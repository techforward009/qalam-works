"use client";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";

/**
 * A lightweight, reusable movable title-bar for Qalam Page dialogs.
 * It changes the window position only; never edits the document or its focus.
 * Attach handleProps to the TITLE BAR, not to inputs or the full dialog.
 */
export function useMovableStudioDialog<T extends HTMLElement>() {
  const dialogRef = useRef<T>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const start = useRef<{
    pointerId: number; x: number; y: number; left: number; top: number;
    width: number; height: number; offsetX: number; offsetY: number;
  } | null>(null);
  const constrain = (left: number, top: number, width: number, height: number) => {
    const vp = window.visualViewport;
    const x = vp?.offsetLeft ?? 0, y = vp?.offsetTop ?? 0;
    const w = vp?.width ?? window.innerWidth, h = vp?.height ?? window.innerHeight;
    const boundary = 5;
    const minX = x + boundary, minY = y + boundary;
    const maxX = Math.max(minX, x + w - width - boundary);
    const maxY = Math.max(minY, y + h - height - boundary);
    return { left: Math.max(minX, Math.min(maxX, left)), top: Math.max(minY, Math.min(maxY, top)) };
  };
  useEffect(() => {
    const keepVisible = () => {
      const rect = dialogRef.current?.getBoundingClientRect();
      if (!rect) return;
      const pos = constrain(rect.left, rect.top, rect.width, rect.height);
      if (Math.abs(pos.left - rect.left) > 0.5 || Math.abs(pos.top - rect.top) > 0.5)
        setOffset(old => ({ x: old.x + pos.left - rect.left, y: old.y + pos.top - rect.top }));
    };
    window.addEventListener("resize", keepVisible);
    window.visualViewport?.addEventListener("resize", keepVisible);
    window.visualViewport?.addEventListener("scroll", keepVisible);
    return () => {
      window.removeEventListener("resize", keepVisible);
      window.visualViewport?.removeEventListener("resize", keepVisible);
      window.visualViewport?.removeEventListener("scroll", keepVisible);
    };
  }, []);
  const handleProps = {
    "data-studio-dialog-drag-handle": "true",
    "aria-label": "Drag dialog",
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.button !== 0 || (event.target as Element).closest("button,input,select,textarea,a")) return;
      const rect = dialogRef.current?.getBoundingClientRect();
      if (!rect) return;
      start.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY,
        left: rect.left, top: rect.top, width: rect.width, height: rect.height,
        offsetX: offset.x, offsetY: offset.y };
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      const drag = start.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const next = constrain(drag.left + event.clientX - drag.x, drag.top + event.clientY - drag.y, drag.width, drag.height);
      setOffset({ x: drag.offsetX + next.left - drag.left, y: drag.offsetY + next.top - drag.top });
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      if (start.current?.pointerId === event.pointerId) start.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    },
    onPointerCancel: (event: PointerEvent<HTMLElement>) => {
      if (start.current?.pointerId === event.pointerId) start.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    },
    style: { cursor: "move", touchAction: "none", userSelect: "none" } as CSSProperties,
  };
  return { dialogRef, handleProps, offset, style: { transform: `translate(${offset.x}px, ${offset.y}px)` } as CSSProperties };
}
