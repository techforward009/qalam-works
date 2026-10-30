/**
 * Qalam Page: Urdu Editor menu catalog.
 * Existing action IDs stay stable; unavailable InPage operations are explicit,
 * non-dispatchable rows rather than fake working actions.
 */

export type MenuId = "file" | "edit" | "view" | "insert" | "format" | "tools" | "window" | "help";

export type MenuActionId =
  | "file.save"
  | "file.close"
  | "file.exit"
  | "format.character"
  | "format.paragraph"
  | "edit.cut" | "edit.copy" | "edit.paste" | "edit.clear"
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
  | "view.facing"
  | "view.pages"
  | "view.pageless"
  | "view.zoom.50"
  | "view.zoom.75"
  | "view.zoom.100"
  | "view.zoom.125"
  | "view.zoom.150"
  | "view.zoom.200"
  | "view.zoom.300"
  | "view.zoom.fit-width"
  | "view.zoom.fit-page"
  | "view.ruler"
  | "view.rulerUnit.cm"
  | "view.rulerUnit.in"
  | "view.fullscreen"
  | "view.hand"
  | "view.stats"
  | "insert.link"
  | "insert.table"
  | "insert.image"
  | "insert.pageBreak"
  | "insert.sectionBreakNextPage"
  | "insert.sectionBreakContinuous"
  | "table.addRowBefore"
  | "table.addRowAfter"
  | "table.deleteRow"
  | "table.addColumnBefore"
  | "table.addColumnAfter"
  | "table.deleteColumn"
  | "table.toggleHeaderRow"
  | "table.delete"
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
  | "format.lh.12"
  | "format.lh.16"
  | "format.lh.20"
  | "format.lh.24"
  | "format.lh.28"
  | "format.lh.36"
  | "format.shade"
  | "format.image.left"
  | "format.image.center"
  | "format.image.right"
  | "format.image.wrap"
  | "format.image.break"
  | "format.image.alt"
  | "format.image.delete"
  | "window.page"
  | `window.document:${string}`
  | "window.outline"
  | "window.quality"
  | "window.settings"
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
  | { type: "unavailable"; id: string; labelEn: string; labelUr: string; shortcut?: string }
  | { type: "section"; labelEn: string; labelUr: string }
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

const QALAM_MENU_ITEMS: MenuDefinition[] = [
  {
    id: "file",
    labelEn: "File",
    labelUr: "فائل",
    items: [
      { type: "action", id: "file.new", labelEn: "New document", labelUr: "نیا مسودہ" },
      { type: "action", id: "file.open", labelEn: "Open document…", labelUr: "دستاویز کھولیں…" },
      { type: "action", id: "file.upload", labelEn: "Import file", labelUr: "فائل درآمد" },
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
      { type: "action", id: "view.facing", labelEn: "Facing Pages", labelUr: "آمنے سامنے صفحات" },
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
          { type: "action", id: "view.zoom.200", labelEn: "200%", labelUr: "200%" },
          { type: "action", id: "view.zoom.300", labelEn: "300%", labelUr: "300%" },
          { type: "separator" },
          { type: "action", id: "view.zoom.fit-width", labelEn: "Fit width", labelUr: "چوڑائی کے مطابق" },
          { type: "action", id: "view.zoom.fit-page", labelEn: "Fit page", labelUr: "صفحہ کے مطابق" },
        ],
      },
      { type: "action", id: "view.hand", labelEn: "Hand", labelUr: "ہاتھ" },
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
      { type: "action", id: "view.stats", labelEn: "Statistics", labelUr: "اعداد و شمار" },
      { type: "separator" },
      { type: "action", id: "view.fullscreen", labelEn: "Full screen", labelUr: "پوری اسکرین" },
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
          { type: "action", id: "format.lh.default", labelEn: "Auto", labelUr: "خودکار" },
          { type: "action", id: "format.lh.12", labelEn: "12pt", labelUr: "12pt" },
          { type: "action", id: "format.lh.16", labelEn: "16pt", labelUr: "16pt" },
          { type: "action", id: "format.lh.20", labelEn: "20pt", labelUr: "20pt" },
          { type: "action", id: "format.lh.24", labelEn: "24pt", labelUr: "24pt" },
          { type: "action", id: "format.lh.28", labelEn: "28pt", labelUr: "28pt" },
          { type: "action", id: "format.lh.36", labelEn: "36pt", labelUr: "36pt" },
        ],
      },
      {
        type: "submenu",
        id: "format.image",
        labelEn: "Image",
        labelUr: "تصویر",
        items: [
          { type: "action", id: "format.image.left", labelEn: "Align left", labelUr: "بائیں" },
          { type: "action", id: "format.image.center", labelEn: "Align center", labelUr: "درمیان" },
          { type: "action", id: "format.image.right", labelEn: "Align right", labelUr: "دائیں" },
          { type: "separator" },
          { type: "action", id: "format.image.wrap", labelEn: "Wrap text", labelUr: "متن لپیٹیں" },
          { type: "action", id: "format.image.break", labelEn: "Break text", labelUr: "متن توڑیں" },
          { type: "action", id: "format.image.alt", labelEn: "Alt text", labelUr: "متبادل متن" },
          { type: "action", id: "format.image.delete", labelEn: "Delete image", labelUr: "تصویر حذف" },
        ],
      },
      { type: "action", id: "format.shade", labelEn: "Shade", labelUr: "شیڈ" },
    ],
  },
  {
    id: "insert",
    labelEn: "Insert",
    labelUr: "اندراج",
    items: [
      { type: "action", id: "insert.link", labelEn: "Link…", labelUr: "لنک…" },
      { type: "action", id: "insert.table", labelEn: "Table…", labelUr: "جدول…" },
      { type: "action", id: "insert.image", labelEn: "Image…", labelUr: "تصویر…" },
      { type: "separator" },
      { type: "action", id: "insert.pageBreak", labelEn: "Page break", labelUr: "صفحہ وقفہ" },
      {
        type: "submenu",
        id: "insert.sectionBreak",
        labelEn: "Section break",
        labelUr: "حصہ وقفہ",
        items: [
          { type: "action", id: "insert.sectionBreakNextPage", labelEn: "Next page", labelUr: "اگلا صفحہ" },
          { type: "action", id: "insert.sectionBreakContinuous", labelEn: "Continuous", labelUr: "مسلسل" },
        ],
      },
      {
        type: "submenu",
        id: "insert.tableActions",
        labelEn: "Table", labelUr: "جدول",
        items: [
          { type: "action", id: "table.addRowBefore", labelEn: "Add row before", labelUr: "اوپر قطار شامل کریں" },
          { type: "action", id: "table.addRowAfter", labelEn: "Add row after", labelUr: "نیچے قطار شامل کریں" },
          { type: "action", id: "table.deleteRow", labelEn: "Delete row", labelUr: "قطار حذف کریں" },
          { type: "separator" },
          { type: "action", id: "table.addColumnBefore", labelEn: "Add column before", labelUr: "پہلے ستون شامل کریں" },
          { type: "action", id: "table.addColumnAfter", labelEn: "Add column after", labelUr: "بعد ستون شامل کریں" },
          { type: "action", id: "table.deleteColumn", labelEn: "Delete column", labelUr: "ستون حذف کریں" },
          { type: "separator" },
          { type: "action", id: "table.toggleHeaderRow", labelEn: "Toggle header row", labelUr: "سرخی کی قطار بدلیں" },
          { type: "action", id: "table.delete", labelEn: "Delete table", labelUr: "جدول حذف کریں" },
        ],
      },
      { type: "action", id: "insert.example", labelEn: "Load example", labelUr: "مثال لوڈ کریں" },
    ],
  },
  {
    id: "tools",
    labelEn: "Utilities",
    labelUr: "آلات",
    items: [
      { type: "action", id: "tools.standardize", labelEn: "Standardize", labelUr: "معیاری بنائیں" },
      { type: "action", id: "tools.audit", labelEn: "Quality audit", labelUr: "کوالٹی آڈٹ" },
      { type: "action", id: "tools.stats", labelEn: "Word count", labelUr: "الفاظ کی تعداد" },
      { type: "action", id: "tools.dictation", labelEn: "Voice dictation", labelUr: "آواز سے لکھیں" },
      { type: "action", id: "tools.glossary", labelEn: "Glossary", labelUr: "اصطلاحات" },
      // Hidden until writing quality is good enough for the public site.
      // { type: "action", id: "tools.qalamAi", labelEn: "Qalam AI — Experimental", labelUr: "قلم اے آئی — تجرباتی" },
    ],
  },
  {
    id: "window",
    labelEn: "Window",
    labelUr: "ونڈو",
    items: [
      { type: "action", id: "window.outline", labelEn: "Outline", labelUr: "خاکہ" },
      { type: "action", id: "window.quality", labelEn: "Quality", labelUr: "معیار" },
      { type: "action", id: "window.settings", labelEn: "Settings", labelUr: "ترتیبات" },
    ],
  },
  {
    id: "help",
    labelEn: "Help",
    labelUr: "مدد",
    items: [
      { type: "action", id: "help.about", labelEn: "Qalam Page: Urdu Editor help", labelUr: "قلم پیج: اردو ایڈیٹر مدد" },
      { type: "action", id: "help.shortcuts", labelEn: "Keyboard shortcuts", labelUr: "کی بورڈ شارٹ کٹس" },
      { type: "action", id: "help.rtl", labelEn: "Urdu / RTL help", labelUr: "اردو / دائیں-بائیں مدد" },
      { type: "action", id: "help.voice", labelEn: "Voice dictation help", labelUr: "آواز سے لکھنے کی مدد" },
    ],
  },
];

// Reuse the current Qalam actions/submenus; internal IDs intentionally stay stable
// so toolbar commands, persisted settings and keyboard shortcuts are unchanged.
const original = (id: MenuId) => QALAM_MENU_ITEMS.find(menu => menu.id === id)!;
const submenu = (menu: MenuId, id: string) => original(menu).items.find(item => item.type === "submenu" && item.id === id)!;
const separator: MenuNode = { type: "separator" };
const qalamSection: MenuNode = { type: "section", labelEn: "Qalam Page", labelUr: "قلم پیج" };
const ready = (id: MenuActionId, labelEn: string, shortcut?: string): MenuNode => ({ type: "action", id, labelEn, labelUr: labelEn, shortcut });
const soon = (id: string, labelEn: string, shortcut?: string): MenuNode => ({ type: "unavailable", id, labelEn, labelUr: labelEn, shortcut });

export const DOCUMENT_MENU_BAR: MenuDefinition[] = [
  { ...original("file"), items: [
    ready("file.new", "New…", "Ctrl+N"), ready("file.open", "Open…", "Ctrl+O"), ready("file.close", "Close", "Ctrl+F4"), separator,
    ready("file.save", "Save…", "Ctrl+S"), soon("file.saveAs", "Save As…", "Ctrl+Alt+S"), ready("file.downloadPdf", "Save as PDF…"), separator,
    soon("file.place", "Place…"), ready("file.upload", "Import…"), ready("file.downloadTxt", "Export All Text…", "Ctrl+Alt+Y"), soon("file.exportPage", "Export Page…"), separator,
    ready("file.print", "Print…", "Ctrl+P"), separator, ready("file.exit", "Exit", "Alt+F4"), separator,
    soon("file.recent", "Recent Files"),
    separator, qalamSection,
    { type: "submenu", id: "file.download", labelEn: "Download", labelUr: "ڈاؤن لوڈ", items: [ready("file.downloadDocx", "DOCX")] },
  ] },
  { ...original("edit"), items: [
    ready("edit.undo", "Undo", "Ctrl+Z"), separator,
    ready("edit.cut", "Cut", "Ctrl+X"), ready("edit.copy", "Copy", "Ctrl+C"), soon("edit.pasteSpecial", "Paste Special…"), ready("edit.paste", "Paste", "Ctrl+V"),
    soon("edit.duplicate", "Duplicate…"), ready("edit.clear", "Clear", "Del"), ready("edit.selectAll", "Select All", "Ctrl+A"), separator,
    ready("edit.find", "Find and Replace…", "Ctrl+F"), separator,
    soon("edit.topMost", "Top Most"), soon("edit.sendBack", "Send To Back"), soon("edit.bringFront", "Bring To Front"), soon("edit.lockGuides", "Lock Guides"), soon("edit.lockObjects", "Lock/Unlock Objects", "Ctrl+U"), separator,
    soon("edit.story", "Story Editor", "F2"), soon("edit.deletePage", "Delete Page…", "Alt+Del"),
    { type: "submenu", id: "edit.preferences", labelEn: "Preferences", labelUr: "ترجیحات", items: [
      soon("preferences.application", "Application…", "Alt+F11"), ready("window.settings", "Document…"), soon("preferences.typographic", "Typographic…", "F11"), soon("preferences.story", "Story Editor…"), soon("preferences.spelling", "Spelling Preferences…"),
    ] }, soon("edit.prompting", "Start Prompting"), separator, qalamSection,
    ready("edit.redo", "Redo", "Ctrl+Shift+Z"),
  ] },
  { ...original("view"), items: [
    ready("view.zoom.fit-page", "Fit in Window"), ready("view.zoom.50", "50%", "F6"), ready("view.zoom.100", "Actual", "F7"), ready("view.zoom.200", "200%", "F8"), separator,
    ready("view.facing", "Facing Pages"), soon("view.ribbon", "Hide Ribbon"), soon("view.tools", "Hide Tools"), ready("view.ruler", "Show Rulers"), soon("view.guides", "Hide Guides"), soon("view.invisibles", "Show Invisibles"), soon("view.indexEntries", "Show Index Entries"), separator,
    soon("view.snap", "Snap To Guides", "F9"), separator, qalamSection,
    { type: "submenu", id: "view.zoom", labelEn: "More Zoom Levels", labelUr: "مزید زوم", items: [
      ready("view.zoom.75", "75%"), ready("view.zoom.125", "125%"), ready("view.zoom.150", "150%"), ready("view.zoom.300", "300%"), ready("view.zoom.fit-width", "Fit Width"),
    ] },
    ready("view.pages", "Single Page"), ready("view.pageless", "Pageless"), ready("view.hand", "Hand"), submenu("view", "view.rulerUnit"), separator,
    ready("view.outline", "Outline"), ready("view.quality", "Quality and Suggestions"), ready("view.glossary", "Glossary"), ready("view.settings", "Settings"), ready("view.stats", "Statistics"), ready("view.fullscreen", "Full Screen"),
  ] },
  { ...original("format"), items: [
    ready("format.character", "Character…", "Ctrl+H"), ready("format.paragraph", "Paragraph…", "Ctrl+G"), soon("text.hyphenation", "Hyphenation…"), soon("text.borders", "Borders…"), soon("text.tabs", "Tabs", "Ctrl+Alt+T"), soon("text.wrap", "Text Wrap"), separator,
    soon("text.sort", "Sort Text…"), soon("text.tableFormat", "Table Format…"), soon("text.tableLayout", "Table Layout…"), separator,
    soon("text.object", "Object…"), soon("text.runaround", "Runaround…"), soon("text.inset", "Inset…"), soon("text.master", "Master Page Objects…"), ready("file.pageSetup", "Document…"), soon("text.guides", "Guides…"), separator,
    soon("text.styles", "Style Sheets…", "Ctrl+T"), soon("text.colors", "Define Colors…"), separator, qalamSection,
    { type: "submenu", id: "format.image", labelEn: "Image Commands", labelUr: "تصویر کے اوزار", items: findSubmenuItems(original("format").items, "format.image")! },
    { type: "submenu", id: "insert.tableActions", labelEn: "Table Commands", labelUr: "جدول کے اوزار", items: findSubmenuItems(original("insert").items, "insert.tableActions")! },
    ...original("format").items.filter(item => item.type === "submenu" && item.id !== "format.image"),
    ready("format.shade", "Shade"), ready("insert.link", "Link…"),
  ] },
  { ...original("insert"), items: [
    soon("page.date", "Date & Time…"), separator, ready("insert.pageBreak", "Page…", "Alt+Ins"), soon("page.number", "Page Number…"), separator,
    ready("insert.image", "Picture…"), ready("insert.table", "Table…"), soon("page.splitTable", "Split Table"), separator,
    soon("page.index", "Index Entry…", "Ctrl+Alt+I"), soon("page.lock", "Object Lock…"), soon("page.footnote", "Footnote"), separator, qalamSection,
    submenu("insert", "insert.sectionBreak"),
  ] },
  { ...original("tools"), items: [
    soon("utilities.spelling", "Spelling…", "Ctrl+L"), ready("tools.stats", "Word Count"), separator,
    soon("utilities.group", "Group", "Ctrl+Alt+G"), soon("utilities.ungroup", "Ungroup", "Ctrl+Alt+U"), separator,
    soon("utilities.autoIndex", "Auto Index…"), soon("utilities.generateIndex", "Generate Index"), soon("utilities.contents", "Table of Contents", "Ctrl+Alt+O"), separator,
    soon("utilities.symbols", "Symbols", "Ctrl+."), separator, qalamSection,
    ...original("tools").items.filter(item => item.type === "action" && item.id !== "tools.stats"),
    ready("insert.example", "Load Example"),
  ] },
  { ...original("window"), items: [
    soon("window.cascade", "Cascade"), soon("window.tile", "Tile"), soon("window.closeAll", "Close All"), separator,
    soon("window.ribbon", "Ribbon", "F12"), ready("window.page", "Page", "Alt+F12"), soon("window.view", "View", "Ctrl+F12"), separator, qalamSection,
    ready("window.outline", "Outline"), ready("window.quality", "Quality"),
  ] },
  { ...original("help"), items: [
    soon("help.index", "Index…"), ready("help.shortcuts", "Short Cuts…"), soon("help.using", "Using Help…"), separator,
    ready("help.about", "About", "F1"), separator, qalamSection, ready("help.rtl", "Urdu / RTL Help"), ready("help.voice", "Voice Dictation Help"),
  ] },
];

export const OMITTED_FUTURE_ACTIONS = [
  "share",
  "cloud",
  "comment",
  "suggesting",
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

// Raster-reference widths; File is content-sized without fabricated MRU paths.
export const MENU_WIDTHS: Record<MenuId, number> = { file: 250, edit: 244, view: 202, format: 263, insert: 225, tools: 243, window: 197, help: 168 };
export const TOP_MENU_WIDTH_PX = 250;
export const SUBMENU_WIDTH_PX = 220;

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
  const width = Math.min(opts.submenuWidth ?? SUBMENU_WIDTH_PX, Math.max(1, opts.viewportWidth - 16));
  const overlap = 6;
  const spaceRight = opts.viewportWidth - opts.parentRect.right - pad;
  const spaceLeft = opts.parentRect.left - pad;
  let left: number;
  if (opts.isUr) {
    if (spaceLeft >= width) left = opts.parentRect.left - width + overlap;
    else if (spaceRight >= width) left = opts.parentRect.right - overlap;
    else left = pad;
  } else if (spaceRight >= width) {
    left = opts.parentRect.right - overlap;
  } else if (spaceLeft >= width) {
    left = opts.parentRect.left - width + overlap;
  } else {
    left = Math.max(pad, opts.viewportWidth - width - pad);
  }
  const maxTop = Math.max(pad, opts.viewportHeight - pad - 48);
  return { top: Math.min(Math.max(pad, opts.triggerRect.top), maxTop), left };
}
