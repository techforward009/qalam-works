/**
 * Document Studio menu catalog.
 * Only real, already-implemented actions. Future features are omitted —
 * never shown as working items.
 */

export type MenuId = "file" | "edit" | "view" | "insert" | "format" | "tools" | "help";

export type MenuActionId =
  | "file.new"
  | "file.open"
  | "file.upload"
  | "file.downloadTxt"
  | "file.downloadDocx"
  | "file.downloadPdf"
  | "file.print"
  | "file.pageSetup"
  | "edit.undo"
  | "edit.redo"
  | "edit.selectAll"
  | "edit.find"
  | "view.outline"
  | "view.quality"
  | "view.glossary"
  | "view.settings"
  | "view.pages"
  | "view.pageless"
  | "view.zoom.50"
  | "view.zoom.75"
  | "view.zoom.100"
  | "view.zoom.125"
  | "view.zoom.150"
  | "view.zoom.fit-width"
  | "view.zoom.fit-page"
  | "view.ruler"
  | "view.rulerUnit.cm"
  | "view.rulerUnit.in"
  | "view.fullscreen"
  | "insert.link"
  | "insert.example"
  | "format.bold"
  | "format.italic"
  | "format.underline"
  | "format.style.normal"
  | "format.style.title"
  | "format.style.subtitle"
  | "format.style.heading-1"
  | "format.style.heading-2"
  | "format.style.heading-3"
  | "format.style.heading-4"
  | "format.style.quote"
  | "format.style.caption"
  | "format.alignLeft"
  | "format.alignCenter"
  | "format.alignRight"
  | "format.alignJustify"
  | "format.rtl"
  | "format.ltr"
  | "format.bullet"
  | "format.ordered"
  | "format.lh.default"
  | "format.lh.1"
  | "format.lh.1.15"
  | "format.lh.1.5"
  | "format.lh.1.8"
  | "format.lh.2"
  | "format.lh.2.2"
  | "tools.standardize"
  | "tools.audit"
  | "tools.stats"
  | "tools.dictation"
  | "tools.glossary"
  | "tools.qalamAi"
  | "help.about"
  | "help.shortcuts"
  | "help.rtl"
  | "help.voice";

export type MenuNode =
  | { type: "action"; id: MenuActionId; labelEn: string; labelUr: string; shortcut?: string }
  | { type: "separator" }
  | { type: "submenu"; id: string; labelEn: string; labelUr: string; items: MenuNode[] };

export type MenuDefinition = {
  id: MenuId;
  labelEn: string;
  labelUr: string;
  items: MenuNode[];
};

export type MenuOpenState = {
  menuId: MenuId | null;
  submenuId: string | null;
};

export const CLOSED_MENU_STATE: MenuOpenState = { menuId: null, submenuId: null };

export function nextOpenMenu(state: MenuOpenState, clicked: MenuId): MenuOpenState {
  if (state.menuId === clicked) return CLOSED_MENU_STATE;
  return { menuId: clicked, submenuId: null };
}

export function nextOpenSubmenu(state: MenuOpenState, clicked: string): MenuOpenState {
  if (!state.menuId) return state;
  if (state.submenuId === clicked) return { ...state, submenuId: null };
  return { ...state, submenuId: clicked };
}

export function setOpenSubmenu(state: MenuOpenState, submenuId: string): MenuOpenState {
  if (!state.menuId) return state;
  return { ...state, submenuId };
}

export function applyMenuEscape(state: MenuOpenState): MenuOpenState {
  if (state.submenuId) return { ...state, submenuId: null };
  return CLOSED_MENU_STATE;
}

export const DOCUMENT_MENU_BAR: MenuDefinition[] = [
  {
    id: "file",
    labelEn: "File",
    labelUr: "فائل",
    items: [
      { type: "action", id: "file.new", labelEn: "New document", labelUr: "نیا مسودہ" },
      { type: "action", id: "file.open", labelEn: "Open document…", labelUr: "دستاویز کھولیں…" },
      { type: "action", id: "file.upload", labelEn: "Upload file", labelUr: "فائل اپلوڈ" },
      { type: "separator" },
      {
        type: "submenu",
        id: "file.download",
        labelEn: "Download",
        labelUr: "ڈاؤن لوڈ",
        items: [
          { type: "action", id: "file.downloadTxt", labelEn: "TXT", labelUr: "TXT" },
          { type: "action", id: "file.downloadDocx", labelEn: "DOCX", labelUr: "DOCX" },
          { type: "action", id: "file.downloadPdf", labelEn: "PDF", labelUr: "PDF" },
        ],
      },
      { type: "separator" },
      { type: "action", id: "file.print", labelEn: "Print…", labelUr: "پرنٹ…", shortcut: "Ctrl+P" },
      { type: "action", id: "file.pageSetup", labelEn: "Page setup…", labelUr: "صفحہ کی ترتیب…" },
    ],
  },
  {
    id: "edit",
    labelEn: "Edit",
    labelUr: "ترمیم",
    items: [
      { type: "action", id: "edit.undo", labelEn: "Undo", labelUr: "کالعدم", shortcut: "Ctrl+Z" },
      { type: "action", id: "edit.redo", labelEn: "Redo", labelUr: "دہرائیں", shortcut: "Ctrl+Shift+Z" },
      { type: "separator" },
      { type: "action", id: "edit.selectAll", labelEn: "Select all", labelUr: "سب منتخب کریں", shortcut: "Ctrl+A" },
      { type: "separator" },
      { type: "action", id: "edit.find", labelEn: "Find and replace", labelUr: "تلاش اور تبدیلی", shortcut: "Ctrl+F" },
    ],
  },
  {
    id: "view",
    labelEn: "View",
    labelUr: "منظر",
    items: [
      { type: "action", id: "view.pages", labelEn: "Pages", labelUr: "صفحات" },
      { type: "action", id: "view.pageless", labelEn: "Pageless", labelUr: "بغیر صفحات" },
      {
        type: "submenu",
        id: "view.zoom",
        labelEn: "Zoom",
        labelUr: "زوم",
        items: [
          { type: "action", id: "view.zoom.50", labelEn: "50%", labelUr: "50%" },
          { type: "action", id: "view.zoom.75", labelEn: "75%", labelUr: "75%" },
          { type: "action", id: "view.zoom.100", labelEn: "100%", labelUr: "100%" },
          { type: "action", id: "view.zoom.125", labelEn: "125%", labelUr: "125%" },
          { type: "action", id: "view.zoom.150", labelEn: "150%", labelUr: "150%" },
          { type: "separator" },
          { type: "action", id: "view.zoom.fit-width", labelEn: "Fit width", labelUr: "چوڑائی کے مطابق" },
          { type: "action", id: "view.zoom.fit-page", labelEn: "Fit page", labelUr: "صفحہ کے مطابق" },
        ],
      },
      { type: "action", id: "view.ruler", labelEn: "Ruler", labelUr: "رولر" },
      {
        type: "submenu",
        id: "view.rulerUnit",
        labelEn: "Ruler units",
        labelUr: "رولر اکائیاں",
        items: [
          { type: "action", id: "view.rulerUnit.cm", labelEn: "Centimeters", labelUr: "سینٹی میٹر" },
          { type: "action", id: "view.rulerUnit.in", labelEn: "Inches", labelUr: "انچ" },
        ],
      },
      { type: "separator" },
      { type: "action", id: "view.outline", labelEn: "Outline", labelUr: "خاکہ" },
      { type: "action", id: "view.quality", labelEn: "Quality and suggestions", labelUr: "معیار اور تجاویز" },
      { type: "action", id: "view.glossary", labelEn: "Glossary", labelUr: "اصطلاحات" },
      { type: "action", id: "view.settings", labelEn: "Settings", labelUr: "ترتیبات" },
      { type: "separator" },
      { type: "action", id: "view.fullscreen", labelEn: "Full screen", labelUr: "پوری اسکرین" },
    ],
  },
  {
    id: "insert",
    labelEn: "Insert",
    labelUr: "اندراج",
    items: [
      { type: "action", id: "insert.link", labelEn: "Link…", labelUr: "لنک…" },
      { type: "action", id: "insert.example", labelEn: "Load example", labelUr: "مثال لوڈ کریں" },
    ],
  },
  {
    id: "format",
    labelEn: "Format",
    labelUr: "فارمیٹ",
    items: [
      {
        type: "submenu",
        id: "format.text",
        labelEn: "Text",
        labelUr: "متن",
        items: [
          { type: "action", id: "format.bold", labelEn: "Bold", labelUr: "موٹا", shortcut: "Ctrl+B" },
          { type: "action", id: "format.italic", labelEn: "Italic", labelUr: "ترچھا", shortcut: "Ctrl+I" },
          { type: "action", id: "format.underline", labelEn: "Underline", labelUr: "خط کشیدہ", shortcut: "Ctrl+U" },
        ],
      },
      {
        type: "submenu",
        id: "format.style",
        labelEn: "Paragraph style",
        labelUr: "پیراگراف انداز",
        items: [
          { type: "action", id: "format.style.normal", labelEn: "Normal", labelUr: "عام" },
          { type: "action", id: "format.style.title", labelEn: "Title", labelUr: "عنوان" },
          { type: "action", id: "format.style.subtitle", labelEn: "Subtitle", labelUr: "ذیلی عنوان" },
          { type: "action", id: "format.style.heading-1", labelEn: "Heading 1", labelUr: "سرخی 1" },
          { type: "action", id: "format.style.heading-2", labelEn: "Heading 2", labelUr: "سرخی 2" },
          { type: "action", id: "format.style.heading-3", labelEn: "Heading 3", labelUr: "سرخی 3" },
          { type: "action", id: "format.style.heading-4", labelEn: "Heading 4", labelUr: "سرخی 4" },
          { type: "action", id: "format.style.quote", labelEn: "Quote", labelUr: "اقتباس" },
          { type: "action", id: "format.style.caption", labelEn: "Caption", labelUr: "کیپشن" },
        ],
      },
      {
        type: "submenu",
        id: "format.align",
        labelEn: "Align and direction",
        labelUr: "سیدھ اور سمت",
        items: [
          { type: "action", id: "format.alignLeft", labelEn: "Align left", labelUr: "بائیں سیدھ" },
          { type: "action", id: "format.alignCenter", labelEn: "Align center", labelUr: "درمیان" },
          { type: "action", id: "format.alignRight", labelEn: "Align right", labelUr: "دائیں سیدھ" },
          { type: "action", id: "format.alignJustify", labelEn: "Justify", labelUr: "برابر" },
          { type: "separator" },
          { type: "action", id: "format.rtl", labelEn: "Right to left", labelUr: "دائیں سے بائیں" },
          { type: "action", id: "format.ltr", labelEn: "Left to right", labelUr: "بائیں سے دائیں" },
        ],
      },
      {
        type: "submenu",
        id: "format.lists",
        labelEn: "Lists",
        labelUr: "فہرستیں",
        items: [
          { type: "action", id: "format.bullet", labelEn: "Bulleted list", labelUr: "نقطہ دار فہرست" },
          { type: "action", id: "format.ordered", labelEn: "Numbered list", labelUr: "نمبر شدہ فہرست" },
        ],
      },
      {
        type: "submenu",
        id: "format.spacing",
        labelEn: "Line spacing",
        labelUr: "سطری فاصلہ",
        items: [
          { type: "action", id: "format.lh.default", labelEn: "Default", labelUr: "طے شدہ" },
          { type: "action", id: "format.lh.1", labelEn: "1.0", labelUr: "1.0" },
          { type: "action", id: "format.lh.1.15", labelEn: "1.15", labelUr: "1.15" },
          { type: "action", id: "format.lh.1.5", labelEn: "1.5", labelUr: "1.5" },
          { type: "action", id: "format.lh.1.8", labelEn: "1.8", labelUr: "1.8" },
          { type: "action", id: "format.lh.2", labelEn: "2.0", labelUr: "2.0" },
          { type: "action", id: "format.lh.2.2", labelEn: "2.2", labelUr: "2.2" },
        ],
      },
    ],
  },
  {
    id: "tools",
    labelEn: "Tools",
    labelUr: "آلات",
    items: [
      { type: "action", id: "tools.standardize", labelEn: "Standardize", labelUr: "معیاری بنائیں" },
      { type: "action", id: "tools.audit", labelEn: "Quality audit", labelUr: "کوالٹی آڈٹ" },
      { type: "action", id: "tools.stats", labelEn: "Word count", labelUr: "الفاظ کی تعداد" },
      { type: "action", id: "tools.dictation", labelEn: "Voice dictation", labelUr: "آواز سے لکھیں" },
      { type: "action", id: "tools.glossary", labelEn: "Glossary", labelUr: "اصطلاحات" },
      { type: "action", id: "tools.qalamAi", labelEn: "Qalam AI — Experimental", labelUr: "قلم اے آئی — تجرباتی" },
    ],
  },
  {
    id: "help",
    labelEn: "Help",
    labelUr: "مدد",
    items: [
      { type: "action", id: "help.about", labelEn: "Document Studio help", labelUr: "ڈاکومنٹ اسٹوڈیو مدد" },
      { type: "action", id: "help.shortcuts", labelEn: "Keyboard shortcuts", labelUr: "کی بورڈ شارٹ کٹس" },
      { type: "action", id: "help.rtl", labelEn: "Urdu / RTL help", labelUr: "اردو / دائیں-بائیں مدد" },
      { type: "action", id: "help.voice", labelEn: "Voice dictation help", labelUr: "آواز سے لکھنے کی مدد" },
    ],
  },
];

export const OMITTED_FUTURE_ACTIONS = [
  "share",
  "cloud",
  "comment",
  "suggesting",
  "table",
  "image",
  "page-break",
  "strikethrough",
  "text-color",
  "highlight",
  "checklist",
  "spellcheck",
  "grammar",
] as const;

export function menuLabel(item: { labelEn: string; labelUr: string }, isUr: boolean): string {
  return isUr ? item.labelUr : item.labelEn;
}

export function collectMenuActionIds(nodes: MenuNode[]): MenuActionId[] {
  const ids: MenuActionId[] = [];
  for (const node of nodes) {
    if (node.type === "action") ids.push(node.id);
    if (node.type === "submenu") ids.push(...collectMenuActionIds(node.items));
  }
  return ids;
}

export function allMenuActionIds(): MenuActionId[] {
  return DOCUMENT_MENU_BAR.flatMap((menu) => collectMenuActionIds(menu.items));
}

export function menuCatalogText(): string {
  return JSON.stringify(DOCUMENT_MENU_BAR).toLowerCase();
}

export const TOP_MENU_WIDTH_PX = 248;
export const SUBMENU_WIDTH_PX = 184;

export function findSubmenuItems(nodes: MenuNode[], submenuId: string): MenuNode[] | null {
  for (const node of nodes) {
    if (node.type === "submenu" && node.id === submenuId) return node.items;
    if (node.type === "submenu") {
      const nested = findSubmenuItems(node.items, submenuId);
      if (nested) return nested;
    }
  }
  return null;
}

export function placeFloatingSubmenu(opts: {
  triggerRect: { top: number; left: number; right: number; bottom: number };
  parentRect: { left: number; right: number };
  viewportWidth: number;
  viewportHeight: number;
  submenuWidth?: number;
  isUr: boolean;
}): { top: number; left: number } {
  const pad = 8;
  const width = opts.submenuWidth ?? SUBMENU_WIDTH_PX;
  const spaceRight = opts.viewportWidth - opts.parentRect.right - pad;
  const spaceLeft = opts.parentRect.left - pad;
  let left: number;
  if (opts.isUr) {
    if (spaceLeft >= width) left = opts.parentRect.left - width;
    else if (spaceRight >= width) left = opts.parentRect.right;
    else left = pad;
  } else if (spaceRight >= width) {
    left = opts.parentRect.right;
  } else if (spaceLeft >= width) {
    left = opts.parentRect.left - width;
  } else {
    left = Math.max(pad, opts.viewportWidth - width - pad);
  }
  const maxTop = Math.max(pad, opts.viewportHeight - pad - 48);
  return { top: Math.min(Math.max(pad, opts.triggerRect.top), maxTop), left };
}
