"use client";

import { useEffect, useRef, useState } from "react";
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

function MenuItems({
  items,
  isUr,
  disabledIds,
  checkedIds,
  openSubmenuId,
  onOpenSubmenu,
  onToggleSubmenu,
  onAction,
}: {
  items: MenuNode[];
  isUr: boolean;
  disabledIds?: ReadonlySet<MenuActionId>;
  checkedIds?: ReadonlySet<MenuActionId>;
  openSubmenuId: string | null;
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
              onMouseEnter={() => onOpenSubmenu(item.id)}
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
                  {isUr ? "‹" : "›"}
                </span>
              </button>
              {open && (
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
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openState.menuId) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpenState(CLOSED_MENU_STATE);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpenState((prev) => applyMenuEscape(prev));
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [openState.menuId]);

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
              className={`h-7 rounded px-2.5 text-[13px] font-medium ${
                open ? "bg-[#EAF2EB] text-[#1A3A2A]" : "text-[#1A3A2A]/80 hover:bg-[#F3F7F2]"
              } ${isUr ? "font-naskh" : ""}`}
              onClick={() => setOpenState((prev) => nextOpenMenu(prev, menu.id))}
              onMouseEnter={() => {
                if (openState.menuId) setOpenState({ menuId: menu.id as MenuId, submenuId: null });
              }}
            >
              {menuLabel(menu, isUr)}
            </button>
            {open && (
              <div
                role="menu"
                data-menu-dropdown={menu.id}
                className="absolute top-full z-30 mt-0.5 min-w-[14.5rem] rounded-md border border-[#1A3A2A]/15 bg-white py-1 shadow-md"
                style={{ insetInlineStart: 0 }}
              >
                <MenuItems
                  items={menu.items}
                  isUr={isUr}
                  disabledIds={disabledIds}
                  checkedIds={checkedIds}
                  openSubmenuId={openState.submenuId}
                  onOpenSubmenu={(id) => setOpenState((prev) => setOpenSubmenu(prev, id))}
                  onToggleSubmenu={(id) => setOpenState((prev) => nextOpenSubmenu(prev, id))}
                  onAction={(id) => {
                    onAction(id);
                    setOpenState(CLOSED_MENU_STATE);
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
