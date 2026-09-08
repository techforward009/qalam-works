"use client";

import { useEffect, useRef, useState } from "react";
import {
  DOCUMENT_MENU_BAR,
  menuLabel,
  type MenuActionId,
} from "../utils/documentMenus";

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
  const [openId, setOpenId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openId) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpenId(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenId(null);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [openId]);

  return (
    <div
      ref={rootRef}
      className="flex items-center gap-0.5 overflow-x-auto px-2 py-1"
      role="menubar"
      aria-label={isUr ? "دستاویز مینو" : "Document menu"}
      data-studio-menubar="true"
    >
      {DOCUMENT_MENU_BAR.map((menu) => {
        const open = openId === menu.id;
        return (
          <div key={menu.id} className="relative shrink-0">
            <button
              type="button"
              role="menuitem"
              aria-haspopup="true"
              aria-expanded={open}
              className={`h-7 rounded px-2.5 text-[13px] font-medium ${
                open ? "bg-[#EAF2EB] text-[#1A3A2A]" : "text-[#1A3A2A]/80 hover:bg-[#F3F7F2]"
              } ${isUr ? "font-naskh" : ""}`}
              onClick={() => setOpenId(open ? null : menu.id)}
              onMouseEnter={() => {
                if (openId) setOpenId(menu.id);
              }}
            >
              {menuLabel(menu, isUr)}
            </button>
            {open && (
              <div
                role="menu"
                className="absolute top-full z-30 mt-0.5 min-w-[13.5rem] rounded-md border border-[#1A3A2A]/15 bg-white py-1 shadow-md"
                style={{ insetInlineStart: 0 }}
              >
                {menu.items.map((item, index) => {
                  if (item.type === "separator") {
                    return <div key={`${menu.id}-sep-${index}`} className="my-1 border-t border-[#1A3A2A]/10" />;
                  }
                  const disabled = disabledIds?.has(item.id) ?? false;
                  const checked = checkedIds?.has(item.id) ?? false;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="menuitem"
                      disabled={disabled}
                      data-menu-action={item.id}
                      className={`flex w-full items-center justify-between gap-4 px-3 py-1.5 text-left text-[13px] ${
                        disabled
                          ? "cursor-not-allowed text-gray-400"
                          : "text-[#1A3A2A] hover:bg-[#EAF2EB]"
                      } ${isUr ? "font-naskh text-right" : ""}`}
                      onClick={() => {
                        if (disabled) return;
                        onAction(item.id);
                        setOpenId(null);
                      }}
                    >
                      <span>
                        {checked ? "✓ " : ""}
                        {menuLabel(item, isUr)}
                      </span>
                      {item.shortcut ? (
                        <span className="text-[11px] text-gray-400" dir="ltr">
                          {item.shortcut}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
