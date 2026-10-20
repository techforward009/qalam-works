"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useLanguage } from "../../../lib/language-context";
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
  TOP_MENU_WIDTH_PX,
  type MenuActionId,
  type MenuId,
  type MenuNode,
  type MenuOpenState,
} from "../utils/documentMenus";

function topMenuPosition(anchor: HTMLElement | null, isUr: boolean): React.CSSProperties {
  if (!anchor || typeof window === "undefined") {
    return { position: "fixed", top: 0, left: 0, visibility: "hidden" };
  }
  const rect = anchor.getBoundingClientRect();
  const width = TOP_MENU_WIDTH_PX;
  const pad = 8;
  const maxLeft = Math.max(pad, window.innerWidth - width - pad);
  const left = Math.min(Math.max(pad, isUr ? rect.right - width : rect.left), maxLeft);
  const top = rect.bottom + 2;
  const maxHeight = Math.max(160, window.innerHeight - top - 12);
  return {
    position: "fixed",
    top,
    left,
    zIndex: 80,
    width,
    maxHeight,
    overflowX: "hidden",
    overflowY: "auto",
  };
}

const dropdownItemStyle = { position: "relative", height: 22, minHeight: 22, maxHeight: 22, padding: "0 12px 0 28px", fontFamily: "Segoe UI, Tahoma, sans-serif", fontSize: 12, lineHeight: "22px", color: "#000", direction: "ltr" } as const;

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
    if (item.type === "separator") {
      return <div key={`sep-${index}`} role="separator" className="my-1 border-t border-[#a0a0a0] shadow-[0_1px_0_#fff]" />;
    }
    if (item.type === "submenu") {
      const open = openSubmenuId === item.id;
      return <div key={item.id} className="relative" onPointerEnter={(event) => {
        if (event.pointerType === "mouse") onOpenSubmenu(item.id);
      }}>
        <button type="button" role="menuitem" aria-haspopup="true" aria-expanded={open}
          data-menu-submenu={item.id} style={dropdownItemStyle}
          className={`flex w-full items-center text-left ${open ? "bg-[#d6dff2]" : "hover:bg-[#d6dff2]"}`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            // Mouse hover may already have opened it before the click arrives.
            if (inlineSubmenus && item.id !== "file.download") onToggleSubmenu(item.id);
            else onOpenSubmenu(item.id);
          }}>
          <span className="min-w-0 whitespace-nowrap text-left">{menuLabel(item, isUr)}</span>
          <span aria-hidden="true" className="ms-auto shrink-0">{inlineSubmenus && open ? "▾" : isUr ? "◂" : "▸"}</span>
        </button>
        {open && inlineSubmenus ? <div role="menu" data-menu-flyout={item.id} className="border-y border-[#a0a0a0] bg-[#f0f0f0] py-0.5">
          <MenuItems items={item.items} isUr={isUr} disabledIds={disabledIds} checkedIds={checkedIds}
            openSubmenuId={null} inlineSubmenus={inlineSubmenus} onOpenSubmenu={onOpenSubmenu}
            onToggleSubmenu={onToggleSubmenu} onAction={onAction} />
        </div> : null}
      </div>;
    }
    const disabled = disabledIds?.has(item.id) ?? false;
    const checked = checkedIds?.has(item.id) ?? false;
    return <button key={item.id} type="button" role="menuitem" disabled={disabled}
      aria-disabled={disabled || undefined} aria-checked={checked || undefined}
      data-menu-action={item.id} style={dropdownItemStyle}
      className={`flex w-full items-center text-left ${disabled ? "cursor-not-allowed" : "hover:bg-[#d6dff2]"}`}
      onPointerEnter={(event) => { if (event.pointerType === "mouse" && openSubmenuId) onOpenSubmenu(""); }}
      onClick={() => { if (!disabled) onAction(item.id); }}>
      <span aria-hidden="true" className="absolute left-[8px] top-0">{checked ? "✓" : null}</span>
      <span className="min-w-0 whitespace-nowrap text-left">{menuLabel(item, isUr)}</span>
      {item.shortcut ? <span className="absolute right-[12px] top-0 tabular-nums" dir="ltr">{item.shortcut}</span> : null}
    </button>;
  })}</>;
}

function StudioLanguageSwitch() {
  const { language, setLanguage } = useLanguage();
  return (
    <div
      role="group"
      aria-label="Document language"
      dir="ltr"
      data-studio-language-switch="true"
      className="me-1 inline-flex h-[18px] shrink-0 items-center rounded-none border border-[#808080] bg-[#f0f0f0]"
      style={{ height: 18, maxHeight: 18 }}
    >
      <button
        type="button"
        lang="en"
        aria-pressed={language === "en"}
        style={{ height: 16, minHeight: 16, maxHeight: 16 }}
        onClick={() => setLanguage("en")}
        className={`grid h-[16px] min-w-7 place-items-center rounded-none px-1 text-[11px] font-semibold leading-none ${language === "en" ? "bg-[#d9d9d9] text-black" : "text-black hover:bg-[#e5e5e5]"}`}
      >
        EN
      </button>
      <button
        type="button"
        lang="ur"
        dir="rtl"
        aria-pressed={language === "ur"}
        style={{ height: 16, minHeight: 16, maxHeight: 16 }}
        onClick={() => setLanguage("ur")}
        className={`grid h-[16px] min-w-9 place-items-center rounded-none px-1 text-[12px] font-semibold leading-none ${language === "ur" ? "bg-[#d9d9d9] text-black" : "text-black hover:bg-[#e5e5e5]"}`}
      >
        اردو
      </button>
    </div>
  );
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
  endSlot,
}: {
  isUr: boolean;
  onAction: (id: MenuActionId) => void;
  disabledIds?: ReadonlySet<MenuActionId>;
  checkedIds?: ReadonlySet<MenuActionId>;
  showHome?: boolean;
  endSlot?: React.ReactNode;
}) {
  const [openState, setOpenState] = useState<MenuOpenState>(CLOSED_MENU_STATE);
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
    const apply = () => setPinMenus(mq.matches && !isUr);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [isUr]);

  const updatePosition = () => {
    const id = openState.menuId;
    if (!id) return;
    setMenuStyle(topMenuPosition(triggerRefs.current[id] ?? null, isUr));
    if (inlineSubmenus || !openState.submenuId || !portalRef.current) return;
    const trigger = portalRef.current.querySelector<HTMLElement>(`[data-menu-submenu="${openState.submenuId}"]`);
    const parentBox = portalRef.current.getBoundingClientRect();
    if (!trigger) return;
    const placed = placeFloatingSubmenu({
      triggerRect: trigger.getBoundingClientRect(),
      parentRect: { left: parentBox.left, right: parentBox.right },
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      isUr,
    });
    setSubmenuStyle({
      position: "fixed",
      top: placed.top,
      left: placed.left,
      zIndex: 90,
      width: SUBMENU_WIDTH_PX,
      maxHeight: Math.max(120, window.innerHeight - placed.top - 12),
      overflowX: "hidden",
      overflowY: "auto",
    });
  };

  useLayoutEffect(() => {
    updatePosition();
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
        e.stopPropagation();
        setOpenState((prev) => applyMenuEscape(prev));
      }
    };
    const onReposition = () => updatePosition();
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [openState.menuId, openState.submenuId, isUr, inlineSubmenus]);

  const openMenu = DOCUMENT_MENU_BAR.find((menu) => menu.id === openState.menuId) ?? null;
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
    openMenu && typeof document !== "undefined"
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
                checkedIds={checkedIds}
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
                  checkedIds={checkedIds}
                  openSubmenuId={null}
                  inlineSubmenus={false}
                  onOpenSubmenu={() => undefined}
                  onToggleSubmenu={() => undefined}
                  onAction={closeAndAct}
                />
              </div>
            ) : null}
          </>,
          document.body,
        )
      : null;

  const menuLeft = [31, 63, 96, 136, 187, 231, 283, 342];

  return (
    <div data-studio-caption="true" style={{ background: "#f0f0f0", fontFamily: "Segoe UI, Tahoma, sans-serif", color: "#000" }}>
      <style>{`
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
      `}</style>
      <div
        data-studio-titlebar="true"
        className="flex items-center"
        style={{ height: 22, padding: "0 6px", fontSize: 12, lineHeight: "22px", borderBottom: "1px solid #d0d0d0" }}
      >
        {showHome ? (
          <Link
            href="/"
            data-studio-home="true"
            data-latin-control="true"
            aria-label="Qalam Works"
            className="me-1 inline-flex h-4 w-4 shrink-0 items-center justify-center text-[#000]"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M2 7 H12 M7 2 V12" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </Link>
        ) : null}
        <span className="shrink-0" data-latin-control="true">Qalam Page - </span>
        <div className="flex min-w-0 flex-1 items-center">{endSlot}</div>
        {showHome ? <StudioLanguageSwitch /> : null}
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
            focusMenuOnOpen.current = true;
            setOpenState({ menuId: current, submenuId: null });
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
                  padding: pinMenus ? 0 : "0 8px",
                  fontSize: 12,
                  fontWeight: 400,
                  color: "#000",
                  background: open ? "#d6dff2" : "transparent",
                }}
                onClick={() => setOpenState((prev) => nextOpenMenu(prev, menu.id))}
                onPointerEnter={(e) => {
                  if (e.pointerType !== "mouse") return;
                  if (openState.menuId) setOpenState({ menuId: menu.id, submenuId: null });
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
