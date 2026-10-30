"use client";

import { studioOverlayRoot } from "../utils/inpageToolbar";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { StudioHomeButton } from "./StudioHomeButton";
import {
  applyMenuEscape,
  CLOSED_MENU_STATE,
  DOCUMENT_MENU_BAR,
  findSubmenuItems,
  menuLabel,
  nextOpenMenu,
  nextOpenSubmenu,
  placeFloatingSubmenu,
  setOpenSubmenu,
  SUBMENU_WIDTH_PX,
  MENU_WIDTHS,
  type MenuActionId,
  type MenuId,
  type MenuNode,
  type MenuOpenState,
} from "../utils/documentMenus";

function topMenuPosition(anchor: HTMLElement | null, isUr: boolean, menuId: MenuId): React.CSSProperties {
  if (!anchor || typeof window === "undefined") {
    return { position: "fixed", top: 0, left: 0, visibility: "hidden" };
  }
  const rect = anchor.getBoundingClientRect();
  const width = Math.min(MENU_WIDTHS[menuId], Math.max(1, window.innerWidth - 16));
  const pad = 8;
  const maxLeft = Math.max(pad, window.innerWidth - width - pad);
  const left = Math.min(Math.max(pad, isUr ? rect.right - width + 7 : rect.left - 7), maxLeft);
  const barBottom = anchor.closest("[data-studio-menubar]")?.getBoundingClientRect().bottom ?? rect.bottom;
  const top = Math.max(pad, Math.min(Math.max(rect.bottom, barBottom), window.innerHeight - 40));
  const maxHeight = Math.max(1, window.innerHeight - top - 8);
  return {
    position: "fixed",
    top,
    left,
    zIndex: 400,
    width,
    maxHeight,
    overflowX: "hidden",
    overflowY: "auto",
    ...menuFrame,
  };
}

const menuFrame = { borderStyle: "solid", borderWidth: 1, borderColor: "#fff #808080 #808080 #fff", boxShadow: "1px 1px 0 #c0c0c0, 2px 2px 0 #808080", background: "#f0f0f0" } as const;
const dropdownItemStyle = { position: "relative", height: 22, minHeight: 22, maxHeight: 22, padding: "0 20px 0 32px", gap: 12, border: 0, fontFamily: "Segoe UI, Tahoma, sans-serif", fontSize: 12, lineHeight: "22px", color: "#000", direction: "ltr" } as const;
const labelStyle = { flex: "1 1 auto", minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } as const;

function MenuItems({
  items, isUr, disabledIds, checkedIds, openSubmenuId, inlineSubmenus,
  onOpenSubmenu, onToggleSubmenu, onAction,
}: {
  items: MenuNode[];
  isUr: boolean;
  disabledIds?: ReadonlySet<MenuActionId>;
  checkedIds?: ReadonlySet<MenuActionId>;
  openSubmenuId: string | null;
  inlineSubmenus: boolean;
  onOpenSubmenu: (id: string) => void;
  onToggleSubmenu: (id: string) => void;
  onAction: (id: MenuActionId) => void;
}) {
  return <>{items.map((item, index) => {
    if (item.type === "section") return <div key={`section-${index}`} role="presentation" data-menu-section style={{ height: 20, padding: "0 20px 0 32px", fontFamily: "Segoe UI, Tahoma, sans-serif", fontSize: 11, lineHeight: "20px", color: "#606060" }}>{menuLabel(item, isUr)}</div>;
    if (item.type === "separator") {
      return <div key={`sep-${index}`} role="separator" className="mx-[3px] my-1 border-t border-[#a0a0a0] shadow-[0_1px_0_#fff]" />;
    }
    if (item.type === "unavailable") return <button key={item.id} type="button" role="menuitem" disabled aria-disabled="true" title="Coming soon" data-coming-soon="true" data-menu-row data-menu-unavailable={item.id} style={dropdownItemStyle} className="flex w-full items-center text-left cursor-default">
      <span data-menu-label style={labelStyle}>{menuLabel(item, isUr)}</span>
      {item.shortcut ? <span data-menu-shortcut className="shrink-0 tabular-nums" dir="ltr">{item.shortcut}</span> : null}
    </button>;
    if (item.type === "submenu") {
      const open = openSubmenuId === item.id;
      return <div key={item.id} className="relative" onPointerEnter={(event) => {
        if (event.pointerType === "mouse" && !inlineSubmenus) onOpenSubmenu(item.id);
      }}>
        <button type="button" role="menuitem" aria-haspopup="true" aria-expanded={open}
          data-menu-row data-menu-submenu={item.id} style={{ ...dropdownItemStyle, paddingRight: 26 }}
          className={`flex w-full items-center text-left ${open ? "bg-[#d6dff2]" : "hover:bg-[#d6dff2]"}`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            // Narrow menus are tap accordions: do not pre-open them on hover.
            if (inlineSubmenus) onToggleSubmenu(item.id);
            else onOpenSubmenu(item.id);
            if (event.detail === 0) requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-menu-flyout="${item.id}"] [role='menuitem']:not([disabled])`)?.focus());
          }}>
          <span data-menu-label style={labelStyle}>{menuLabel(item, isUr)}</span>
          <span aria-hidden style={{ position: "absolute", right: 11, top: 8, width: 0, height: 0, ...(inlineSubmenus && open ? { borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderTop: "5px solid #000" } : isUr ? { borderTop: "4px solid transparent", borderBottom: "4px solid transparent", borderRight: "5px solid #000" } : { borderTop: "4px solid transparent", borderBottom: "4px solid transparent", borderLeft: "5px solid #000" }) }} />
        </button>
        {open && inlineSubmenus ? <div role="menu" data-menu-flyout={item.id} className="border-y border-[#a0a0a0] bg-[#f0f0f0] py-0.5">
          <MenuItems items={item.items} isUr={isUr} disabledIds={disabledIds} checkedIds={checkedIds}
            openSubmenuId={null} inlineSubmenus={inlineSubmenus} onOpenSubmenu={onOpenSubmenu}
            onToggleSubmenu={onToggleSubmenu} onAction={onAction} />
        </div> : null}
      </div>;
    }
    const comingSoon = item.id === "tools.dictation";
    const disabled = comingSoon || (disabledIds?.has(item.id) ?? false);
    const checked = checkedIds?.has(item.id) ?? false;
    return <button key={item.id} type="button" role="menuitem" disabled={disabled}
      title={comingSoon ? (isUr ? "جلد آ رہا ہے" : "Coming soon") : undefined}
      data-coming-soon={comingSoon ? "true" : undefined}
      aria-disabled={disabled || undefined} aria-checked={checked || undefined}
      data-menu-row data-menu-action={item.id} style={dropdownItemStyle}
      className={`flex w-full items-center text-left ${disabled ? "cursor-default" : "hover:bg-[#d6dff2] focus:bg-[#d6dff2]"}`}
      onPointerEnter={(event) => { if (event.pointerType === "mouse" && !inlineSubmenus && openSubmenuId) onOpenSubmenu(""); }}
      onClick={() => { if (!disabled) onAction(item.id); }}>
      {checked && item.id !== "view.ruler" ? <span aria-hidden style={{ position: "absolute", left: 6, top: 3, width: 16, height: 16, border: "1px solid #9cb9df", background: "#f8fbff", display: "grid", placeItems: "center" }}><svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6 L5 9 L10 2" fill="none" stroke="#1455a0" strokeWidth="1.5" /></svg></span> : null}
      <span data-menu-label style={labelStyle}>{item.id === "view.ruler" && checked ? "Hide Rulers" : menuLabel(item, isUr)}</span>
      {item.shortcut ? <span data-menu-shortcut className="shrink-0 tabular-nums" dir="ltr">{item.shortcut}</span> : null}
    </button>;
  })}</>;
}

function moveMenuFocus(container: HTMLElement | null, key: string) {
  if (!container) return;
  const items = [...container.querySelectorAll<HTMLElement>("[role='menuitem']:not([disabled])")];
  if (items.length === 0) return;
  const index = items.indexOf(document.activeElement as HTMLElement);
  if (key === "Home") items[0]?.focus();
  else if (key === "End") items[items.length - 1]?.focus();
  else if (key === "ArrowDown") items[index < 0 ? 0 : (index + 1) % items.length]?.focus();
  else if (key === "ArrowUp") items[index <= 0 ? items.length - 1 : index - 1]?.focus();
}

export default function DocumentMenuBar({
  isUr,
  onAction,
  disabledIds,
  checkedIds,
  showHome = false,
  documentOpen = true,
  endSlot,
  hasUnsavedChanges = false,
  openDocuments = [],
  activeDocumentId,
}: {
  isUr: boolean;
  onAction: (id: MenuActionId) => void;
  disabledIds?: ReadonlySet<MenuActionId>;
  checkedIds?: ReadonlySet<MenuActionId>;
  showHome?: boolean;
  documentOpen?: boolean;
  endSlot?: React.ReactNode;
  hasUnsavedChanges?: boolean;
  openDocuments?: { id: string; title: string }[];
  activeDocumentId?: string | null;
}) {
  const [openState, setOpenState] = useState<MenuOpenState>(CLOSED_MENU_STATE);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [inlineSubmenus, setInlineSubmenus] = useState(false);
  const [pinMenus, setPinMenus] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const [submenuStyle, setSubmenuStyle] = useState<React.CSSProperties>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const submenuPortalRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<Partial<Record<MenuId, HTMLButtonElement | null>>>({});
  const focusMenuOnOpen = useRef(false);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (event.defaultPrevented || !target?.closest("[data-studio-shell]") || target.closest('[role="dialog"], [role="alertdialog"]')) return;
      const key = event.key.toLowerCase();
      let id: MenuActionId | undefined;
      if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey) id = ({ n: "file.new", o: "file.open", s: "file.save", h: "format.character", g: "format.paragraph" } as Record<string, MenuActionId>)[key];
      if ((event.ctrlKey || event.metaKey) && event.altKey && !event.shiftKey && key === "y") id = "file.downloadTxt";
      if (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey && key === "insert") id = "insert.pageBreak";
      if (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey && key === "f12") id = "window.page";
      if (!id) return;
      event.preventDefault(); closeAndAct(id);
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [onAction]);

  useEffect(() => {
    const sync = () => setPortalRoot(studioOverlayRoot());
    sync();
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(max-width: 639px)");
    const apply = () => setInlineSubmenus(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(min-width: 721px)");
    const apply = () => setPinMenus(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [isUr]);

  const updatePosition = () => {
    const id = openState.menuId;
    if (!id) return;
    setMenuStyle(topMenuPosition(triggerRefs.current[id] ?? null, isUr, id));
    if (inlineSubmenus || !openState.submenuId || !portalRef.current) return;
    const trigger = portalRef.current.querySelector<HTMLElement>(`[data-menu-submenu="${openState.submenuId}"]`);
    const parentBox = portalRef.current.getBoundingClientRect();
    if (!trigger) return;
    const submenuWidth = Math.min(openState.submenuId === "edit.preferences" ? 265 : SUBMENU_WIDTH_PX, Math.max(1, window.innerWidth - 16));
    const placed = placeFloatingSubmenu({
      triggerRect: trigger.getBoundingClientRect(),
      parentRect: { left: parentBox.left, right: parentBox.right },
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      submenuWidth,
      isUr,
    });
    setSubmenuStyle({
      position: "fixed",
      top: placed.top,
      left: placed.left,
      zIndex: 410,
      width: submenuWidth,
      maxHeight: Math.max(1, window.innerHeight - placed.top - 8),
      overflowX: "hidden",
      overflowY: "auto",
      ...menuFrame,
    });
  };

  useLayoutEffect(() => {
    updatePosition();
    if (inlineSubmenus && openState.submenuId && portalRef.current) {
      const flyout = portalRef.current.querySelector<HTMLElement>(`[data-menu-flyout="${openState.submenuId}"]`);
      if (flyout) {
        const inner = flyout.getBoundingClientRect(), outer = portalRef.current.getBoundingClientRect();
        if (inner.bottom > outer.bottom - 2) portalRef.current.scrollTop += inner.bottom - outer.bottom + 2;
        else if (inner.top < outer.top + 2) portalRef.current.scrollTop -= outer.top + 2 - inner.top;
      }
    }
    if (!openState.menuId || !focusMenuOnOpen.current) return;
    focusMenuOnOpen.current = false;
    portalRef.current?.querySelector<HTMLElement>("[role='menuitem']:not([disabled])")?.focus();
  }, [openState.menuId, openState.submenuId, isUr, inlineSubmenus]);

  useEffect(() => {
    if (!openState.menuId) return;
    const onPointer = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || portalRef.current?.contains(target) || submenuPortalRef.current?.contains(target)) {
        return;
      }
      setOpenState(CLOSED_MENU_STATE);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        if (openState.submenuId) portalRef.current?.querySelector<HTMLElement>(`[data-menu-submenu="${openState.submenuId}"]`)?.focus();
        if (!openState.submenuId && openState.menuId) triggerRefs.current[openState.menuId]?.focus();
        setOpenState((prev) => applyMenuEscape(prev));
      }
    };
    const onReposition = () => updatePosition();
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [openState.menuId, openState.submenuId, isUr, inlineSubmenus]);

  const baseMenu = DOCUMENT_MENU_BAR.find((menu) => menu.id === openState.menuId) ?? null;
  const openMenu = baseMenu?.id === "window" && openDocuments.length
    ? { ...baseMenu, items: [...baseMenu.items, { type: "separator" } as MenuNode,
        ...openDocuments.map((doc, index): MenuNode => ({ type: "action", id: `window.document:${doc.id}`, labelEn: `${index + 1}  ${doc.title}`, labelUr: `${index + 1}  ${doc.title}` }))] }
    : baseMenu;
  const sessionCheckedIds = new Set(checkedIds);
  if (activeDocumentId) sessionCheckedIds.add(`window.document:${activeDocumentId}`);
  const submenuItems =
    openMenu && openState.submenuId && !inlineSubmenus ? findSubmenuItems(openMenu.items, openState.submenuId) : null;

  const closeAndAct = (id: MenuActionId) => {
    setOpenState(CLOSED_MENU_STATE);
    const run = () => onAction(id);
    // Page/section breaks are atomic; inserting them while the submenu button
    // still holds DOM focus lets the unmount steal the caret onto the marker
    // and swallow the first typed characters. Close first, then insert.
    if (
      id === "insert.pageBreak"
      || id === "insert.sectionBreakNextPage"
      || id === "insert.sectionBreakContinuous"
    ) {
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(run);
      else queueMicrotask(run);
      return;
    }
    run();
  };

  const dropdown =
    openMenu && portalRoot
      ? createPortal(
          <>
            <div
              ref={portalRef}
              role="menu"
              data-menu-dropdown={openMenu.id}
              data-menu-portaled="true"
              data-studio-menu-language={isUr ? "ur" : "en"}
              className="border border-[#808080] bg-[#f0f0f0] py-0.5 shadow-md"
              style={menuStyle}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Home" || event.key === "End") {
                  event.preventDefault();
                  event.stopPropagation();
                  moveMenuFocus(portalRef.current, event.key);
                }
              }}
            >
              <MenuItems
                items={openMenu.items}
                isUr={isUr}
                disabledIds={disabledIds}
                checkedIds={sessionCheckedIds}
                openSubmenuId={openState.submenuId}
                inlineSubmenus={inlineSubmenus}
                onOpenSubmenu={(id) =>
                  setOpenState((prev) => (id ? setOpenSubmenu(prev, id) : { ...prev, submenuId: null }))
                }
                onToggleSubmenu={(id) => setOpenState((prev) => nextOpenSubmenu(prev, id))}
                onAction={closeAndAct}
              />
            </div>
            {submenuItems && openState.submenuId ? (
              <div
                ref={submenuPortalRef}
                role="menu"
                data-menu-flyout={openState.submenuId}
                data-menu-portaled="true"
              data-studio-menu-language={isUr ? "ur" : "en"}
                className="border border-[#808080] bg-[#f0f0f0] py-0.5 shadow-md"
                style={submenuStyle}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Home" || event.key === "End") {
                    event.preventDefault();
                    event.stopPropagation();
                    moveMenuFocus(submenuPortalRef.current, event.key);
                  }
                }}
              >
                <MenuItems
                  items={submenuItems}
                  isUr={isUr}
                  disabledIds={disabledIds}
                  checkedIds={sessionCheckedIds}
                  openSubmenuId={null}
                  inlineSubmenus={false}
                  onOpenSubmenu={() => undefined}
                  onToggleSubmenu={() => undefined}
                  onAction={closeAndAct}
                />
              </div>
            ) : null}
          </>,
          portalRoot,
        )
      : null;

  const menuLeft = [31, 63, 96, 136, 187, 231, 283, 342];

  return (
    <div data-studio-caption="true" style={{ background: "#f0f0f0", fontFamily: "Segoe UI, Tahoma, sans-serif", color: "#000" }}>
      <style>{`
        [data-menu-portaled] [data-menu-row]:not(:disabled):hover,
        [data-menu-portaled] [data-menu-row]:not(:disabled):focus-visible,
        [data-menu-portaled] [data-menu-row][aria-expanded="true"] {
          background: #e6efff !important;
          box-shadow: inset 0 0 0 1px #9dbff8;
          outline: none;
        }
        [data-studio-language-switch] button {
          font-family: Tahoma, Arial, sans-serif !important;
          font-size: 11px !important;
          line-height: 16px !important;
        }
        [data-menu-portaled="true"][data-studio-menu-language] [role="menuitem"],
        [data-menu-portaled="true"][data-studio-menu-language] [role="menuitem"] * {
          font-family: "Segoe UI", Tahoma, sans-serif !important;
          font-size: 12px !important;
          line-height: 22px !important;
          color: #000 !important;
        }
        [data-menu-portaled="true"][data-studio-menu-language] [data-coming-soon="true"],
        [data-menu-portaled="true"][data-studio-menu-language] [data-coming-soon="true"] *,
        [data-menu-portaled="true"][data-studio-menu-language] [aria-disabled="true"],
        [data-menu-portaled="true"][data-studio-menu-language] [aria-disabled="true"] * {
          color: #808080 !important;
        }
      `}</style>
      <div
        data-studio-titlebar="true"
        className="flex items-center"
        style={{ height: 22, padding: "0 6px", fontSize: 12, lineHeight: "22px", borderBottom: "1px solid #d0d0d0" }}
      >
        {showHome ? <StudioHomeButton dirty={hasUnsavedChanges} /> : null}
        <span className="shrink-0 whitespace-pre" data-latin-control="true">Qalam Page{documentOpen ? " - " : ""}</span>
        <div className="flex min-w-0 flex-1 items-center">{endSlot}</div>
      </div>
      <div
        ref={rootRef}
        className="relative flex w-full max-w-full min-w-0 items-center gap-0 overflow-x-auto overscroll-x-contain whitespace-nowrap [scrollbar-width:thin] touch-pan-x"
        role="menubar"
        aria-label={isUr ? "دستاویز مینو" : "Document menu"}
        data-studio-menubar="true"
        data-studio-menu-pinned={pinMenus ? "true" : "false"}
        tabIndex={0}
        title={isUr ? "باقی مینو دیکھنے کے لیے دائیں بائیں سرکائیں" : "Swipe or scroll sideways for more menus"}
        data-open-menu={openState.menuId ?? ""}
        style={{
          height: pinMenus ? 19 : "auto",
          boxSizing: "border-box",
          flexWrap: pinMenus ? "nowrap" : "wrap",
          overflow: pinMenus ? "hidden" : "visible",
          whiteSpace: pinMenus ? "nowrap" : "normal",
          background: "linear-gradient(to bottom, #fefeff 0, #e5eaf5 7px, #d4dbed 7px, #e1e6f6 100%)",
          borderBottom: "1px solid #b6bccc",
          fontFamily: "Segoe UI, Tahoma, sans-serif",
          fontSize: 12,
          color: "#000",
        }}
        onKeyDown={(event) => {
          const current = (event.target as HTMLElement).getAttribute("data-menu-root") as MenuId | null;
          if (!current) return;
          const ids = DOCUMENT_MENU_BAR.map((menu) => menu.id);
          const index = ids.indexOf(current);
          if (index < 0) return;
          const forward = isUr ? "ArrowLeft" : "ArrowRight";
          const backward = isUr ? "ArrowRight" : "ArrowLeft";
          if (event.key === forward || event.key === backward) {
            event.preventDefault();
            const delta = event.key === forward ? 1 : -1;
            const next = ids[(index + delta + ids.length) % ids.length];
            triggerRefs.current[next]?.focus();
            if (openState.menuId) setOpenState({ menuId: next, submenuId: null });
          } else if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (openState.menuId === current && portalRef.current) {
              // The same menu is already open: unchanged state keys do not
              // rerun the layout effect that normally transfers keyboard focus.
              portalRef.current.querySelector<HTMLElement>("[role='menuitem']:not([disabled])")?.focus();
            } else {
              focusMenuOnOpen.current = true;
              setOpenState({ menuId: current, submenuId: null });
            }
          } else if (event.key === "Home") {
            event.preventDefault();
            triggerRefs.current[ids[0]]?.focus();
          } else if (event.key === "End") {
            event.preventDefault();
            triggerRefs.current[ids[ids.length - 1]]?.focus();
          }
        }}
      >
        <span aria-hidden="true" data-studio-menu-doc-icon="true" style={{ position: pinMenus ? "absolute" : "relative", left: pinMenus ? 7 : 4, top: pinMenus ? 1 : undefined, width: 16, height: 16, display: "inline-block" }}>
          <svg width="16" height="16" viewBox="0 0 16 16">
            <rect x="3" y="1" width="9" height="13" fill="#fff" stroke="#000" />
            <path d="M5 5 H10 M5 8 H10 M5 11 H8" stroke="#000" />
          </svg>
        </span>
        {DOCUMENT_MENU_BAR.map((menu, index) => {
          const open = openState.menuId === menu.id;
          return (
            <div key={menu.id} className={pinMenus ? "" : "relative shrink-0"} style={pinMenus ? { position: "absolute", left: menuLeft[index] ?? 0, top: 0 } : undefined}>
              <button
                type="button"
                role="menuitem"
                aria-haspopup="true"
                aria-expanded={open}
                data-menu-root={menu.id}
                ref={(el) => {
                  triggerRefs.current[menu.id] = el;
                }}
                className="inline-flex items-center rounded-none px-0 leading-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#000]"
                style={{
                  height: 19,
                  minHeight: 19,
                  maxHeight: 19,
                  padding: pinMenus ? 0 : "0 8px",
                  fontSize: 12,
                  fontWeight: 400,
                  color: "#000",
                  background: open ? "#d6dff2" : "transparent",
                }}
                onClick={() => setOpenState((prev) => nextOpenMenu(prev, menu.id))}
                onPointerEnter={(e) => {
                  if (e.pointerType !== "mouse") return;
                  if (openState.menuId) {
                    triggerRefs.current[menu.id]?.focus({ preventScroll: true });
                    setOpenState({ menuId: menu.id, submenuId: null });
                  }
                }}
              >
                {menuLabel(menu, isUr)}
              </button>
            </div>
          );
        })}
        {dropdown}
      </div>
    </div>
  );
}
