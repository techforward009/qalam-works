"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

function MenuItems({
  items,
  isUr,
  disabledIds,
  checkedIds,
  openSubmenuId,
  inlineSubmenus,
  onOpenSubmenu,
  onToggleSubmenu,
  onAction,
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
  return (
    <>
      {items.map((item, index) => {
        if (item.type === "separator") {
          return <div key={`sep-${index}`} role="separator" className="my-1 border-t border-[#1A3A2A]/10" />;
        }
        if (item.type === "submenu") {
          const open = openSubmenuId === item.id;
          return (
            <div
              key={item.id}
              className="relative"
              onPointerEnter={(e) => {
                if (e.pointerType === "mouse") onOpenSubmenu(item.id);
              }}
            >
              <button
                type="button"
                role="menuitem"
                aria-haspopup="true"
                aria-expanded={open}
                data-menu-submenu={item.id}
                className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-start text-[13px] ${
                  open ? "bg-[#EAF2EB] text-[#1A3A2A]" : "text-[#1A3A2A] hover:bg-[#EAF2EB]"
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleSubmenu(item.id);
                }}
              >
                <span className="min-w-0 whitespace-normal text-start leading-[1.85]">{menuLabel(item, isUr)}</span>
                <span aria-hidden="true" className="shrink-0 text-[11px] text-[#3D5A47]">
                  {inlineSubmenus ? (open ? "▾" : "▸") : isUr ? "‹" : "›"}
                </span>
              </button>
              {open && inlineSubmenus && (
                <div role="menu" data-menu-flyout={item.id} className="border-y border-[#1A3A2A]/10 bg-[#FAF8F3] py-1">
                  <MenuItems
                    items={item.items}
                    isUr={isUr}
                    disabledIds={disabledIds}
                    checkedIds={checkedIds}
                    openSubmenuId={null}
                    inlineSubmenus={inlineSubmenus}
                    onOpenSubmenu={onOpenSubmenu}
                    onToggleSubmenu={onToggleSubmenu}
                    onAction={onAction}
                  />
                </div>
              )}
            </div>
          );
        }
        const disabled = disabledIds?.has(item.id) ?? false;
        const checked = checkedIds?.has(item.id) ?? false;
        return (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            disabled={disabled}
            aria-disabled={disabled || undefined}
            aria-checked={checked || undefined}
            data-menu-action={item.id}
            className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-start text-[13px] ${
              disabled ? "cursor-not-allowed text-gray-400" : "text-[#1A3A2A] hover:bg-[#EAF2EB]"
            }`}
            onPointerEnter={(e) => {
              if (e.pointerType === "mouse" && openSubmenuId) onOpenSubmenu("");
            }}
            onClick={() => {
              if (disabled) return;
              onAction(item.id);
            }}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className={`w-3 shrink-0 text-[11px] font-semibold ${checked ? "text-[#1A3A2A]" : "text-transparent"}`} aria-hidden="true">
                ✓
              </span>
              <span className="whitespace-normal text-start leading-[1.85]">{menuLabel(item, isUr)}</span>
            </span>
            {item.shortcut ? (
              <span className="ms-auto shrink-0 text-[11px] tabular-nums text-gray-400" dir="ltr">
                {item.shortcut}
              </span>
            ) : null}
          </button>
        );
      })}
    </>
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
}: {
  isUr: boolean;
  onAction: (id: MenuActionId) => void;
  disabledIds?: ReadonlySet<MenuActionId>;
  checkedIds?: ReadonlySet<MenuActionId>;
}) {
  const [openState, setOpenState] = useState<MenuOpenState>(CLOSED_MENU_STATE);
  const [inlineSubmenus, setInlineSubmenus] = useState(false);
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
              className="rounded-md border border-[#1A3A2A]/15 bg-white py-1 shadow-md"
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
                className="rounded-md border border-[#1A3A2A]/15 bg-white py-1 shadow-md"
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

  return (
    <div
      ref={rootRef}
      className="flex items-center gap-0.5 overflow-x-auto px-2 py-1"
      role="menubar"
      aria-label={isUr ? "دستاویز مینو" : "Document menu"}
      data-studio-menubar="true"
      data-open-menu={openState.menuId ?? ""}
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
      {DOCUMENT_MENU_BAR.map((menu) => {
        const open = openState.menuId === menu.id;
        return (
          <div key={menu.id} className="relative shrink-0">
            <button
              type="button"
              role="menuitem"
              aria-haspopup="true"
              aria-expanded={open}
              data-menu-root={menu.id}
              ref={(el) => {
                triggerRefs.current[menu.id] = el;
              }}
              className={`min-h-9 rounded px-2.5 py-1 text-[13px] font-medium leading-[1.7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#B8935A] ${
                open ? "bg-[#EAF2EB] text-[#1A3A2A]" : "text-[#1A3A2A]/80 hover:bg-[#F3F7F2]"
              }`}
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
  );
}
