"use client";

import { studioOverlayRoot } from "../utils/inpageToolbar";
import type { Editor } from "@tiptap/core";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { StudioHomeButton } from "./StudioHomeButton";
import {
  applyMenuEscape,
  CLOSED_MENU_STATE,
  DOCUMENT_MENU_BAR,
  contextualInsertTableMenu,
  findSubmenuItems,
  menuLabel,
  nextOpenMenu,
  nextOpenSubmenu,
  placeFloatingSubmenu,
  setOpenSubmenu,
  SUBMENU_WIDTH_PX,
  MENU_WIDTHS,
  KEYBOARD_MENU_WIDTH_PX,
  type MenuActionId,
  type MenuDefinition,
  type MenuId,
  type MenuNode,
  type MenuOpenState,

} from "../utils/documentMenus";
import {
  INPAGE_MENU_FRAME_STYLE,
  INPAGE_MENU_HOVER_BG,
  INPAGE_MENU_HOVER_BORDER,
  INPAGE_MENU_ITEM_STYLE,
  INPAGE_MENU_OPEN_BG,
  INPAGE_MENU_OPEN_BORDER,
  INPAGE_MENU_SEPARATOR_CLASS,
  inpageMenuGutterBackground,
} from "../utils/inpageMenuStyle";
import { KEYBOARD_LAYOUT_LABELS, type KeyboardLayoutId } from "../utils/inpageKeyboard";

const KEYBOARD_MENU_LAYOUTS: KeyboardLayoutId[] = ["off", "inpageMonotype", "inpagePhonetic", "arabic", "persian", "custom"];

export type DocumentMenuKeyboard = {
  layoutId: KeyboardLayoutId;
  hasCustom: boolean;
  onSelectLayout: (id: KeyboardLayoutId) => void;
  onEditCustom: () => void;
};

/** InPage 2009 style "Keyboard" menu, placed immediately before "Window". */
function withKeyboardMenu(menus: MenuDefinition[]): MenuDefinition[] {
  const keyboardMenu: MenuDefinition = {
    id: "keyboard", labelEn: "Keyboard", labelUr: "Keyboard",
    items: [
      ...KEYBOARD_MENU_LAYOUTS.map((id): MenuNode => ({ type: "action", id: `keyboard.layout:${id}`, labelEn: KEYBOARD_LAYOUT_LABELS[id], labelUr: KEYBOARD_LAYOUT_LABELS[id] })),
      { type: "separator" } as MenuNode,
      { type: "action", id: "keyboard.editCustom", labelEn: "Edit Custom Keyboard…", labelUr: "Edit Custom Keyboard…" },
    ],
  };
  const at = menus.findIndex((menu) => menu.id === "window");
  return at < 0 ? [...menus, keyboardMenu] : [...menus.slice(0, at), keyboardMenu, ...menus.slice(at)];
}

function topMenuPosition(anchor: HTMLElement | null, isUr: boolean, menuId: MenuId, pinned: boolean): React.CSSProperties {
  if (!anchor || typeof window === "undefined") {
    return { position: "fixed", top: 0, left: 0, visibility: "hidden" };
  }
  const rect = anchor.getBoundingClientRect();
  const width = Math.min(menuId === "keyboard" ? KEYBOARD_MENU_WIDTH_PX : MENU_WIDTHS[menuId], Math.max(1, window.innerWidth - 16));
  const pad = 8;
  const maxLeft = Math.max(pad, window.innerWidth - width - pad);
  const edge = pinned
    ? (isUr ? rect.right - width + 7 : rect.left - 7)
    : (isUr ? rect.right - width : rect.left);
  const left = Math.min(Math.max(pad, edge), maxLeft);
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
    ...INPAGE_MENU_FRAME_STYLE,
    backgroundImage: inpageMenuGutterBackground(isUr),
  };
}

function dropdownItemStyle(isUr: boolean): React.CSSProperties {
  return {
    ...INPAGE_MENU_ITEM_STYLE,
    direction: isUr ? "rtl" : "ltr",
    padding: isUr ? "0 32px 0 20px" : "0 20px 0 32px",
  };
}

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
  const itemStyle = dropdownItemStyle(isUr);
  return <>{items.map((item, index) => {
    if (item.type === "section") return <div key={`section-${index}`} role="presentation" data-menu-section style={{ height: 20, padding: isUr ? "0 32px 0 20px" : "0 20px 0 32px", fontFamily: "QalamUISegoe, Segoe UI, Tahoma, sans-serif", fontSize: 11, lineHeight: "20px", color: "#606060", direction: isUr ? "rtl" : "ltr", textAlign: isUr ? "right" : "left" }}>{menuLabel(item, isUr)}</div>;
    if (item.type === "separator") {
      return <div key={`sep-${index}`} role="separator" className={INPAGE_MENU_SEPARATOR_CLASS} />;
    }
    if (item.type === "unavailable") return <button key={item.id} type="button" role="menuitem" disabled aria-disabled="true" title="Coming soon" data-coming-soon="true" data-menu-row data-menu-unavailable={item.id} style={itemStyle} className="flex w-full items-center text-start cursor-default">
      <span data-menu-label style={labelStyle}>{menuLabel(item, isUr)}</span>
      {item.shortcut ? <span data-menu-shortcut className="shrink-0 tabular-nums" dir="ltr">{item.shortcut}</span> : null}
    </button>;
    if (item.type === "submenu") {
      const open = openSubmenuId === item.id;
      return <div key={item.id} className="relative" onPointerEnter={(event) => {
        if (event.pointerType === "mouse" && !inlineSubmenus) onOpenSubmenu(item.id);
      }}>
        <button type="button" role="menuitem" aria-haspopup="true" aria-expanded={open}
          data-menu-row data-menu-submenu={item.id} style={{ ...itemStyle, ...(isUr ? { paddingLeft: 26 } : { paddingRight: 26 }) }}
          className={`flex w-full items-center text-start ${open ? "bg-[#d6dff2]" : ""}`}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            // Narrow menus are tap accordions: do not pre-open them on hover.
            if (inlineSubmenus) onToggleSubmenu(item.id);
            else onOpenSubmenu(item.id);
            if (event.detail === 0) requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-menu-flyout="${item.id}"] [role='menuitem']:not([disabled])`)?.focus());
          }}>
          <span data-menu-label style={labelStyle}>{menuLabel(item, isUr)}</span>
          <span aria-hidden style={{ position: "absolute", ...(isUr ? { left: 11 } : { right: 11 }), top: 8, width: 0, height: 0, ...(inlineSubmenus && open ? { borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderTop: "5px solid #000" } : isUr ? { borderTop: "4px solid transparent", borderBottom: "4px solid transparent", borderRight: "5px solid #000" } : { borderTop: "4px solid transparent", borderBottom: "4px solid transparent", borderLeft: "5px solid #000" }) }} />
        </button>
        {open && inlineSubmenus ? <div role="menu" data-menu-flyout={item.id} className="border-y border-[#a0a0a0] py-0.5" style={{ backgroundColor: "#f0f0f0", backgroundImage: inpageMenuGutterBackground(isUr) }}>
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
      data-menu-row data-menu-action={item.id} style={itemStyle}
      className={`flex w-full items-center text-start ${disabled ? "cursor-default" : ""}`}
      onPointerEnter={(event) => { if (event.pointerType === "mouse" && !inlineSubmenus && openSubmenuId) onOpenSubmenu(""); }}
      onClick={() => { if (!disabled) onAction(item.id); }}>
      {checked && item.id !== "view.ruler" ? <span aria-hidden style={{ position: "absolute", ...(isUr ? { right: 6 } : { left: 6 }), top: 3, width: 16, height: 16, border: "1px solid #9cb9df", background: "#f8fbff", display: "grid", placeItems: "center" }}><svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6 L5 9 L10 2" fill="none" stroke="#1455a0" strokeWidth="1.5" /></svg></span> : null}
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
  editor,
  showHome = false,
  documentOpen = true,
  endSlot,
  hasUnsavedChanges = false,
  openDocuments = [],
  activeDocumentId,
  keyboard,
}: {
  isUr: boolean;
  onAction: (id: MenuActionId) => void;
  disabledIds?: ReadonlySet<MenuActionId>;
  checkedIds?: ReadonlySet<MenuActionId>;
  editor?: Editor | null;
  showHome?: boolean;
  documentOpen?: boolean;
  endSlot?: React.ReactNode;
  hasUnsavedChanges?: boolean;
  openDocuments?: { id: string; title: string }[];
  activeDocumentId?: string | null;
  keyboard?: DocumentMenuKeyboard;
}) {
  const menuBar = keyboard ? withKeyboardMenu(DOCUMENT_MENU_BAR) : DOCUMENT_MENU_BAR;
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
  const focusSubmenuOnOpen = useRef(false);
  const effectivePin = pinMenus && !isUr;

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (event.defaultPrevented || !target?.closest("[data-studio-shell]") || target.closest('[role="dialog"], [role="alertdialog"]')) return;
      const key = event.key.toLowerCase();
      let id: MenuActionId | undefined;
      if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && key === "y") {
        // A selected picture box takes Ctrl+Y for import. Otherwise dispatch
        // editor Redo explicitly — the same command as Edit > Redo on main.
        id = disabledIds?.has("file.importPicture") ? "edit.redo" : "file.importPicture";
      } else if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey) {
        id = ({ n: "file.new", o: "file.open", s: "file.save", h: "format.character", g: "format.paragraph" } as Record<string, MenuActionId>)[key];
      }
      if ((event.ctrlKey || event.metaKey) && event.altKey && !event.shiftKey && key === "y") id = "file.downloadTxt";
      if ((event.ctrlKey || event.metaKey) && event.altKey && !event.shiftKey && key === "f") id = "text.tableFormat";
      if (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey && key === "insert") id = "insert.pageBreak";
      if (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey && key === "f12") id = "window.page";
      if (!id) return;
      event.preventDefault();
      // Capture-phase stop keeps the editor keymap from also redoing.
      if (key === "y" && (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey) event.stopPropagation();
      closeAndAct(id);
    };
    window.addEventListener("keydown", shortcut, true);
    return () => window.removeEventListener("keydown", shortcut, true);
  }, [onAction, disabledIds]);

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
    setMenuStyle(topMenuPosition(triggerRefs.current[id] ?? null, isUr, id, effectivePin));
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
      ...INPAGE_MENU_FRAME_STYLE,
      backgroundImage: inpageMenuGutterBackground(isUr),
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
    if (openState.submenuId && focusSubmenuOnOpen.current) {
      focusSubmenuOnOpen.current = false;
      const flyout = inlineSubmenus
        ? portalRef.current?.querySelector<HTMLElement>(`[data-menu-flyout="${openState.submenuId}"]`)
        : submenuPortalRef.current;
      flyout?.querySelector<HTMLElement>("[role='menuitem']:not([disabled])")?.focus();
      return;
    }
    if (!openState.menuId || !focusMenuOnOpen.current) return;
    focusMenuOnOpen.current = false;
    portalRef.current?.querySelector<HTMLElement>("[role='menuitem']:not([disabled])")?.focus();
  }, [openState.menuId, openState.submenuId, isUr, inlineSubmenus, effectivePin]);

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

  // The menu-opening render must read live selection, not a parent
  // render cached before a mouse click, arrow move or undo.
  const insertTableMode = editor?.isActive("table") ? "table"
    : editor && !editor.state.selection.empty ? "selection" : "plain";
  const insertDisabledIds = new Set(disabledIds);
  if (documentOpen && editor) {
    if (insertTableMode === "table") {
      insertDisabledIds.delete("insert.splitTable");
      insertDisabledIds.delete("insert.tableToText");
      insertDisabledIds.add("insert.textToTable");
    } else {
      insertDisabledIds.add("insert.splitTable");
      insertDisabledIds.add("insert.tableToText");
      if (insertTableMode === "selection") insertDisabledIds.delete("insert.textToTable");
      else insertDisabledIds.add("insert.textToTable");
    }
  }
  const baseMenu = menuBar.find((menu) => menu.id === openState.menuId) ?? null;
  const openMenu = baseMenu?.id === "window" && openDocuments.length
    ? { ...baseMenu, items: [...baseMenu.items, { type: "separator" } as MenuNode,
        ...openDocuments.map((doc, index): MenuNode => ({ type: "action", id: `window.document:${doc.id}`, labelEn: `${index + 1}  ${doc.title}`, labelUr: `${index + 1}  ${doc.title}` }))] }
    : baseMenu?.id === "insert" ? contextualInsertTableMenu(baseMenu, insertTableMode) : baseMenu;
  const sessionCheckedIds = new Set(checkedIds);
  if (activeDocumentId) sessionCheckedIds.add(`window.document:${activeDocumentId}`);
  if (keyboard) sessionCheckedIds.add(`keyboard.layout:${keyboard.layoutId}`);
  const submenuItems =
    openMenu && openState.submenuId && !inlineSubmenus ? findSubmenuItems(openMenu.items, openState.submenuId) : null;

  const closeAndAct = (id: MenuActionId) => {
    setOpenState(CLOSED_MENU_STATE);
    if (keyboard && id === "keyboard.editCustom") { keyboard.onEditCustom(); return; }
    if (keyboard && id.startsWith("keyboard.layout:")) {
      const layout = id.slice("keyboard.layout:".length) as KeyboardLayoutId;
      // Without a saved custom layout, choosing Custom opens the editor instead.
      if (layout === "custom" && !keyboard.hasCustom) keyboard.onEditCustom();
      else keyboard.onSelectLayout(layout);
      return;
    }
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

  const switchTopMenu = (delta: 1 | -1) => {
    if (!openState.menuId) return;
    const ids = menuBar.map((menu) => menu.id);
    const index = ids.indexOf(openState.menuId);
    if (index < 0) return;
    const next = ids[(index + delta + ids.length) % ids.length];
    focusMenuOnOpen.current = true;
    setOpenState({ menuId: next, submenuId: null });
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
              dir={isUr ? "rtl" : "ltr"}
              className="py-0.5"
              style={menuStyle}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Home" || event.key === "End") {
                  event.preventDefault();
                  event.stopPropagation();
                  moveMenuFocus(portalRef.current, event.key);
                  return;
                }
                if (event.key === "Tab") {
                  setOpenState(CLOSED_MENU_STATE);
                  return;
                }
                const openForwardKey = isUr ? "ArrowLeft" : "ArrowRight";
                const closeBackwardKey = isUr ? "ArrowRight" : "ArrowLeft";
                if (event.key === openForwardKey) {
                  event.preventDefault();
                  event.stopPropagation();
                  const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
                  const submenuId = active?.getAttribute("data-menu-submenu");
                  if (submenuId) {
                    focusSubmenuOnOpen.current = true;
                    setOpenState((prev) => setOpenSubmenu(prev, submenuId));
                    return;
                  }
                  switchTopMenu(1);
                  return;
                }
                if (event.key === closeBackwardKey) {
                  event.preventDefault();
                  event.stopPropagation();
                  const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
                  if (inlineSubmenus && openState.submenuId && active?.closest("[data-menu-flyout]")) {
                    const parentSubmenuId = openState.submenuId;
                    setOpenState((prev) => ({ ...prev, submenuId: null }));
                    portalRef.current?.querySelector<HTMLElement>(`[data-menu-submenu="${parentSubmenuId}"]`)?.focus();
                    return;
                  }
                  switchTopMenu(-1);
                }
              }}
            >
              <MenuItems
                items={openMenu.items}
                isUr={isUr}
                disabledIds={openMenu.id === "insert" ? insertDisabledIds : disabledIds}
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
                dir={isUr ? "rtl" : "ltr"}
                className="py-0.5"
                style={submenuStyle}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Home" || event.key === "End") {
                    event.preventDefault();
                    event.stopPropagation();
                    moveMenuFocus(submenuPortalRef.current, event.key);
                    return;
                  }
                  if (event.key === "Tab") {
                    setOpenState(CLOSED_MENU_STATE);
                    return;
                  }
                  const openForwardKey = isUr ? "ArrowLeft" : "ArrowRight";
                  const closeBackwardKey = isUr ? "ArrowRight" : "ArrowLeft";
                  if (event.key === closeBackwardKey) {
                    event.preventDefault();
                    event.stopPropagation();
                    const parentSubmenuId = openState.submenuId;
                    setOpenState((prev) => ({ ...prev, submenuId: null }));
                    if (parentSubmenuId) {
                      portalRef.current?.querySelector<HTMLElement>(`[data-menu-submenu="${parentSubmenuId}"]`)?.focus();
                    }
                    return;
                  }
                  if (event.key === openForwardKey) {
                    event.preventDefault();
                    event.stopPropagation();
                    switchTopMenu(1);
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

  const menuLeft = keyboard ? [31, 63, 96, 136, 187, 231, 283, 346, 405] : [31, 63, 96, 136, 187, 231, 283, 342];

  return (
    <div data-studio-caption="true" style={{ background: "#f0f0f0", fontFamily: "QalamUISegoe, Segoe UI, Tahoma, sans-serif", color: "#000" }}>
      <style>{`
        [data-menu-portaled] [data-menu-row]:not(:disabled):hover,
        [data-menu-portaled] [data-menu-row]:not(:disabled):focus-visible,
        [data-menu-portaled] [data-menu-row][aria-expanded="true"] {
          background: ${INPAGE_MENU_HOVER_BG} !important;
          box-shadow: inset 0 0 0 1px ${INPAGE_MENU_HOVER_BORDER};
          outline: none;
        }
        [data-studio-menubar] [data-menu-root] {
          position: relative;
          isolation: isolate;
        }
        [data-studio-menubar] [data-menu-root]:focus-visible {
          outline: none;
        }
        [data-studio-menubar] [data-menu-root]::before {
          content: "";
          position: absolute;
          inset: 1px -5px;
          z-index: -1;
          pointer-events: none;
        }
        [data-studio-menubar][data-studio-menu-pinned="false"] [data-menu-root]::before {
          inset: 1px 0;
        }
        [data-studio-menubar] [data-menu-root]:not(:disabled):hover::before,
        [data-studio-menubar] [data-menu-root]:not(:disabled):focus-visible::before {
          background: linear-gradient(to bottom, #fefeff 0, ${INPAGE_MENU_HOVER_BG} 45%, #d9e7ff 100%);
          border: 1px solid ${INPAGE_MENU_HOVER_BORDER};
          box-shadow: inset 0 1px 0 #fff;
        }
        [data-studio-menubar] [data-menu-root][data-menu-state="open"]::before,
        [data-studio-menubar] [data-menu-root]:not(:disabled):active::before {
          background: linear-gradient(to bottom, #cfd9ef 0, ${INPAGE_MENU_OPEN_BG} 100%);
          border-style: solid;
          border-width: 1px;
          border-color: ${INPAGE_MENU_OPEN_BORDER} #fff #fff ${INPAGE_MENU_OPEN_BORDER};
          box-shadow: inset 1px 1px 1px rgba(48, 72, 112, 0.18);
        }
        [data-studio-language-switch] button {
          font-family: QalamUITahoma, Tahoma, Arial, sans-serif !important;
          font-size: 11px !important;
          line-height: 16px !important;
        }
        [data-menu-portaled="true"][data-studio-menu-language] [role="menuitem"],
        [data-menu-portaled="true"][data-studio-menu-language] [role="menuitem"] * {
          font-family: QalamUISegoe, "Segoe UI", Tahoma, sans-serif !important;
          font-size: 12px !important;
          line-height: 22px !important;
          color: #000 !important;
        }
        [data-menu-portaled="true"][data-studio-menu-language] [data-coming-soon="true"],
        [data-menu-portaled="true"][data-studio-menu-language] [data-coming-soon="true"] *,
        [data-menu-portaled="true"][data-studio-menu-language] [aria-disabled="true"],
        [data-menu-portaled="true"][data-studio-menu-language] [aria-disabled="true"] * {
          color: #808080 !important;
          text-shadow: 1px 1px 0 #fff;
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
        dir={isUr ? "rtl" : "ltr"}
        data-studio-menubar="true"
        data-studio-menu-dir={isUr ? "rtl" : "ltr"}
        data-studio-menu-pinned={effectivePin ? "true" : "false"}
        tabIndex={0}
        title={isUr ? "باقی مینو دیکھنے کے لیے دائیں بائیں سرکائیں" : "Swipe or scroll sideways for more menus"}
        data-open-menu={openState.menuId ?? ""}
        style={{
          height: effectivePin ? 19 : "auto",
          boxSizing: "border-box",
          flexWrap: effectivePin ? "nowrap" : "wrap",
          overflow: effectivePin ? "hidden" : "visible",
          whiteSpace: effectivePin ? "nowrap" : "normal",
          background: "linear-gradient(to bottom, #fefeff 0, #e5eaf5 7px, #d4dbed 7px, #e1e6f6 100%)",
          borderBottom: "1px solid #b6bccc",
          fontFamily: "QalamUISegoe, Segoe UI, Tahoma, sans-serif",
          fontSize: 12,
          color: "#000",
        }}
        onKeyDown={(event) => {
          const current = (event.target as HTMLElement).getAttribute("data-menu-root") as MenuId | null;
          if (!current) return;
          const ids = menuBar.map((menu) => menu.id);
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
        <span aria-hidden="true" data-studio-menu-doc-icon="true" style={{ position: effectivePin ? "absolute" : "relative", ...(effectivePin ? { left: 7, top: 1 } : { marginInlineStart: 4, marginInlineEnd: 2 }), width: 16, height: 16, display: "inline-block" }}>
          <svg width="16" height="16" viewBox="0 0 16 16">
            <rect x="3" y="1" width="9" height="13" fill="#fff" stroke="#000" />
            <path d="M5 5 H10 M5 8 H10 M5 11 H8" stroke="#000" />
          </svg>
        </span>
        {menuBar.map((menu, index) => {
          const open = openState.menuId === menu.id;
          return (
            <div key={menu.id} className={effectivePin ? "" : "relative shrink-0"} style={effectivePin ? { position: "absolute", left: menuLeft[index] ?? 0, top: 0 } : undefined}>
              <button
                type="button"
                role="menuitem"
                aria-haspopup="true"
                aria-expanded={open}
                data-menu-root={menu.id}
                data-menu-state={open ? "open" : "closed"}
                ref={(el) => {
                  triggerRefs.current[menu.id] = el;
                }}
                className="inline-flex items-center rounded-none px-0 leading-none"
                style={{
                  height: 19,
                  minHeight: 19,
                  maxHeight: 19,
                  padding: effectivePin ? 0 : "0 8px",
                  fontSize: 12,
                  fontWeight: 400,
                  color: "#000",
                  background: "transparent",
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
