"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { easternDigits } from "./metadata";
import { ayahReferenceCopy, nextMenuIndex, popoverOrigin } from "./ayahOptions";

export function AyahMarkerButton({
  ayah,
  marker,
  onOpen,
}: {
  ayah: number;
  marker: string | null;
  onOpen: (anchor: HTMLElement) => void;
}) {
  const inline = marker !== null;
  return (
    <button
      type="button"
      data-ayah-marker="true"
      aria-label={`Ayah ${ayah} options`}
      aria-haspopup="menu"
      className={inline
        ? "inline cursor-pointer border-0 bg-transparent p-0 align-baseline font-[inherit] text-[inherit] leading-[inherit]"
        : "mx-1 inline-flex cursor-pointer items-center justify-center rounded-full border bg-transparent px-1.5 align-middle"}
      style={inline ? undefined : {
        borderColor: "#9a884f",
        fontFamily: '"Amiri","Noto Naskh Arabic",serif',
        fontSize: "0.84em",
        minWidth: "1.8em",
        minHeight: "1.8em",
        lineHeight: 1.2,
        color: "#3c472c",
      }}
      onClick={(event) => {
        event.preventDefault();
        onOpen(event.currentTarget);
      }}
    >
      <span aria-hidden="true">{inline ? marker : `۝${easternDigits(ayah)}`}</span>
    </button>
  );
}

type AyahMenuState = {
  surah: number;
  ayah: number;
  text: string;
  top: number;
  left: number;
};

export function useAyahOptionsMenu() {
  const [menu, setMenu] = useState<AyahMenuState | null>(null);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLElement | null>(null);
  const copiedTimer = useRef(0);
  const suppressScrollClose = useRef(false);

  const close = useCallback(() => {
    const anchor = anchorRef.current;
    window.clearTimeout(copiedTimer.current);
    setMenu(null);
    window.setTimeout(() => anchor?.focus({ preventScroll: true }), 0);
  }, []);

  const focusMenuItem = (item: HTMLElement | null | undefined) => {
    suppressScrollClose.current = true;
    item?.focus({ preventScroll: true });
    window.setTimeout(() => {
      suppressScrollClose.current = false;
    }, 150);
  };

  const openMenu = (anchor: HTMLElement, surahNumber: number, ayahNumber: number, text: string) => {
    anchorRef.current = anchor;
    const rect = anchor.getBoundingClientRect();
    const origin = popoverOrigin(rect, { width: window.innerWidth, height: window.innerHeight }, { width: 210, height: 76 });
    setCopied(false);
    setMenu({ surah: surahNumber, ayah: ayahNumber, text, ...origin });
  };

  const writeCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => close(), 900);
    } catch {
      setCopied(false);
    }
  };

  useEffect(() => () => window.clearTimeout(copiedTimer.current), []);

  useEffect(() => {
    if (!menu) return;
    focusMenuItem(menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]'));
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close();
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      const items = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])];
      if (!items.length) return;
      event.preventDefault();
      event.stopPropagation();
      const current = items.findIndex((item) => item === document.activeElement);
      focusMenuItem(items[nextMenuIndex(current, items.length, event.key)]);
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && menuRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest("[data-ayah-marker]")) return;
      close();
    };
    const onScroll = (event: Event) => {
      if (suppressScrollClose.current) return;
      const target = event.target;
      if (target instanceof Node && menuRef.current?.contains(target)) return;
      close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("scroll", onScroll, true);
    };
  }, [menu, close]);

  const ayahOptionsMenu = menu && typeof document !== "undefined" ? createPortal(
    <div
      ref={menuRef}
      role="menu"
      data-ayah-options="true"
      className="fixed z-[80] min-w-[188px] border border-[#c6a35a] bg-[#fffdf8] p-1 text-left shadow-[0_6px_16px_rgba(0,0,0,.12)]"
      style={{ top: menu.top, left: menu.left }}
      dir="ltr"
    >
      {copied ? (
        <p role="status" className="px-2 py-1 text-xs text-[#3c472c]">Copied</p>
      ) : (
        <>
          <button type="button" role="menuitem" tabIndex={-1} className="block w-full px-2 py-1 text-left text-xs text-[#241f16] hover:bg-[#f3efe2] focus:bg-[#f3efe2] focus:outline-none" onClick={() => void writeCopy(menu.text)}>Copy ayah</button>
          <button type="button" role="menuitem" tabIndex={-1} className="block w-full px-2 py-1 text-left text-xs text-[#241f16] hover:bg-[#f3efe2] focus:bg-[#f3efe2] focus:outline-none" onClick={() => void writeCopy(ayahReferenceCopy(menu.text, menu.surah, menu.ayah))}>Copy with reference (S:A)</button>
        </>
      )}
    </div>,
    document.body,
  ) : null;

  return { openMenu, ayahOptionsMenu };
}
