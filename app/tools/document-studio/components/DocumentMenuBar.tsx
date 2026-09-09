"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  applyMenuEscape,
  CLOSED_MENU_STATE,
  DOCUMENT_MENU_BAR,
  menuLabel,
  nextOpenMenu,
  nextOpenSubmenu,
  setOpenSubmenu,
  type MenuActionId,
  type MenuId,
  type MenuNode,
  type MenuOpenState,
} from "../utils/documentMenus";

function dropdownPosition(anchor: HTMLElement | null, isUr: boolean): React.CSSProperties {
  if (!anchor || typeof window === "undefined") {
    return { position: "fixed", top: 0, left: 0, visibility: "hidden" };
  }
  const rect = anchor.getBoundingClientRect();
  const width = 232;
  const pad = 8;
  const maxLeft = Math.max(pad, window.innerWidth - width - pad);
  const left = Math.min(Math.max(pad, isUr ? rect.right - width : rect.left), maxLeft);
  const top = rect.bottom + 2;
  const maxHeight = Math.max(120, window.innerHeight - top - pad);
  return {
    position: "fixed",
    top,
    left,
    zIndex: 80,
    minWidth: width,
    maxHeight,
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
                className={`flex w-full items-center justify-between gap-4 px-3 py-1.5 text-[13px] ${
                  open ? "bg-[#EAF2EB] text-[#1A3A2A]" : "text-[#1A3A2A] hover:bg-[#EAF2EB]"
                } ${isUr ? "font-naskh" : ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleSubmenu(item.id);
                }}
              >
                <span>{menuLabel(item, isUr)}</span>
                <span aria-hidden="true" className="text-[11px] text-[#3D5A47]">
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
              {open && !inlineSubmenus && (
                <div
                  role="menu"
                  data-menu-flyout={item.id}
                  className="absolute top-0 z-40 min-w-[11.5rem] rounded-md border border-[#1A3A2A]/15 bg-white py-1 shadow-md"
                  style={{ insetInlineStart: "100%" }}
                >
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
            className={`flex w-full items-center justify-between gap-6 px-3 py-1.5 text-[13px] ${
              disabled ? "cursor-not-allowed text-gray-400" : "text-[#1A3A2A] hover:bg-[#EAF2EB]"
            } ${isUr ? "font-naskh" : ""}`}
            onClick={() => {
              if (disabled) return;
              onAction(item.id);
            }}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className={`w-3 shrink-0 text-[11px] font-semibold ${checked ? "text-[#1A3A2A]" : "text-transparent"}`} aria-hidden="true">
                ✓
              </span>
              <span className="truncate">{menuLabel(item, isUr)}</span>
            </span>
            {item.shortcut ? (
              <span className="shrink-0 text-[11px] tabular-nums text-gray-400" dir="ltr">
                {item.shortcut}
              </span>
            ) : null}
          </button>
        );
      })}
    </>
  );
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
  const rootRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<Partial<Record<MenuId, HTMLButtonElement | null>>>({});

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
    setMenuStyle(dropdownPosition(triggerRefs.current[id] ?? null, isUr));
  };

  useLayoutEffect(() => {
    updatePosition();
  }, [openState.menuId, isUr]);

  useEffect(() => {
    if (!openState.menuId) return;
    const onPointer = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || portalRef.current?.contains(target)) return;
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
  }, [openState.menuId, isUr]);

  const openMenu = DOCUMENT_MENU_BAR.find((menu) => menu.id === openState.menuId) ?? null;
  const dropdown =
    openMenu && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={portalRef}
            role="menu"
            data-menu-dropdown={openMenu.id}
            data-menu-portaled="true"
            className="rounded-md border border-[#1A3A2A]/15 bg-white py-1 shadow-md"
            style={menuStyle}
          >
            <MenuItems
              items={openMenu.items}
              isUr={isUr}
              disabledIds={disabledIds}
              checkedIds={checkedIds}
              openSubmenuId={openState.submenuId}
              inlineSubmenus={inlineSubmenus}
              onOpenSubmenu={(id) => setOpenState((prev) => setOpenSubmenu(prev, id))}
              onToggleSubmenu={(id) => setOpenState((prev) => nextOpenSubmenu(prev, id))}
              onAction={(id) => {
                onAction(id);
                setOpenState(CLOSED_MENU_STATE);
              }}
            />
          </div>,
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
              className={`h-7 rounded px-2.5 text-[13px] font-medium ${
                open ? "bg-[#EAF2EB] text-[#1A3A2A]" : "text-[#1A3A2A]/80 hover:bg-[#F3F7F2]"
              } ${isUr ? "font-naskh" : ""}`}
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
