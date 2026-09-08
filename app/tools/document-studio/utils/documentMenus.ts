/**
 * Document Studio menu catalog.
 * Only real, already-implemented actions. Future features are omitted —
 * never shown as working items.
 */

export type MenuActionId =
  | "file.new"
  | "file.upload"
  | "file.copy"
  | "file.downloadTxt"
  | "file.downloadDocx"
  | "file.downloadPdf"
  | "file.clearText"
  | "file.clearDraft"
  | "edit.undo"
  | "edit.redo"
  | "edit.selectAll"
  | "edit.find"
  | "view.outline"
  | "view.quality"
  | "view.glossary"
  | "view.settings"
  | "insert.link"
  | "insert.example"
  | "format.bold"
  | "format.italic"
  | "format.underline"
  | "format.h1"
  | "format.h2"
  | "format.bullet"
  | "format.ordered"
  | "format.quote"
  | "format.alignLeft"
  | "format.alignCenter"
  | "format.alignRight"
  | "format.alignJustify"
  | "format.rtl"
  | "format.ltr"
  | "tools.standardize"
  | "tools.audit"
  | "tools.glossary"
  | "help.about"
  | "help.shortcuts";

export type MenuItem =
  | { type: "action"; id: MenuActionId; labelEn: string; labelUr: string; shortcut?: string }
  | { type: "separator" };

export type MenuDefinition = {
  id: "file" | "edit" | "view" | "insert" | "format" | "tools" | "help";
  labelEn: string;
  labelUr: string;
  items: MenuItem[];
};

export const DOCUMENT_MENU_BAR: MenuDefinition[] = [
  {
    id: "file",
    labelEn: "File",
    labelUr: "فائل",
    items: [
      { type: "action", id: "file.new", labelEn: "New document", labelUr: "نیا مسودہ" },
      { type: "action", id: "file.upload", labelEn: "Upload…", labelUr: "اپلوڈ…" },
      { type: "separator" },
      { type: "action", id: "file.copy", labelEn: "Copy text", labelUr: "متن نقل کریں" },
      { type: "action", id: "file.downloadTxt", labelEn: "Download TXT", labelUr: "TXT ڈاؤن لوڈ" },
      { type: "action", id: "file.downloadDocx", labelEn: "Download DOCX", labelUr: "DOCX ڈاؤن لوڈ" },
      { type: "action", id: "file.downloadPdf", labelEn: "Download PDF", labelUr: "PDF ڈاؤن لوڈ" },
      { type: "separator" },
      { type: "action", id: "file.clearText", labelEn: "Clear text", labelUr: "متن صاف کریں" },
      { type: "action", id: "file.clearDraft", labelEn: "Clear saved draft", labelUr: "محفوظ ڈرافٹ صاف کریں" },
    ],
  },
  {
    id: "edit",
    labelEn: "Edit",
    labelUr: "ترمیم",
    items: [
      { type: "action", id: "edit.undo", labelEn: "Undo", labelUr: "کالعدم", shortcut: "Ctrl+Z" },
      { type: "action", id: "edit.redo", labelEn: "Redo", labelUr: "دہرائیں", shortcut: "Ctrl+Y" },
      { type: "separator" },
      { type: "action", id: "edit.selectAll", labelEn: "Select all", labelUr: "سب منتخب کریں", shortcut: "Ctrl+A" },
      { type: "action", id: "edit.find", labelEn: "Find and replace", labelUr: "تلاش اور تبدیلی", shortcut: "Ctrl+F" },
    ],
  },
  {
    id: "view",
    labelEn: "View",
    labelUr: "منظر",
    items: [
      { type: "action", id: "view.outline", labelEn: "Outline", labelUr: "خاکہ" },
      { type: "action", id: "view.quality", labelEn: "Quality and suggestions", labelUr: "معیار اور تجاویز" },
      { type: "action", id: "view.glossary", labelEn: "Glossary", labelUr: "اصطلاحات" },
      { type: "action", id: "view.settings", labelEn: "Page and style settings", labelUr: "صفحہ اور انداز" },
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
      { type: "action", id: "format.bold", labelEn: "Bold", labelUr: "موٹا", shortcut: "Ctrl+B" },
      { type: "action", id: "format.italic", labelEn: "Italic", labelUr: "ترچھا", shortcut: "Ctrl+I" },
      { type: "action", id: "format.underline", labelEn: "Underline", labelUr: "خط کشیدہ", shortcut: "Ctrl+U" },
      { type: "separator" },
      { type: "action", id: "format.h1", labelEn: "Heading 1", labelUr: "عنوان 1" },
      { type: "action", id: "format.h2", labelEn: "Heading 2", labelUr: "عنوان 2" },
      { type: "action", id: "format.bullet", labelEn: "Bullet list", labelUr: "فہرست" },
      { type: "action", id: "format.ordered", labelEn: "Numbered list", labelUr: "نمبر شدہ فہرست" },
      { type: "action", id: "format.quote", labelEn: "Quote", labelUr: "اقتباس" },
      { type: "separator" },
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
    id: "tools",
    labelEn: "Tools",
    labelUr: "آلات",
    items: [
      { type: "action", id: "tools.standardize", labelEn: "Standardize document", labelUr: "معیاری بنائیں" },
      { type: "action", id: "tools.audit", labelEn: "Run quality audit", labelUr: "معیار جانچیں" },
      { type: "action", id: "tools.glossary", labelEn: "Glossary", labelUr: "اصطلاحات" },
    ],
  },
  {
    id: "help",
    labelEn: "Help",
    labelUr: "مدد",
    items: [
      { type: "action", id: "help.about", labelEn: "About Document Studio", labelUr: "ڈاکومنٹ اسٹوڈیو کے بارے میں" },
      { type: "action", id: "help.shortcuts", labelEn: "Keyboard shortcuts", labelUr: "کی بورڈ شارٹ کٹس" },
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
] as const;

export function menuLabel(item: { labelEn: string; labelUr: string }, isUr: boolean): string {
  return isUr ? item.labelUr : item.labelEn;
}

export function allMenuActionIds(): MenuActionId[] {
  const ids: MenuActionId[] = [];
  for (const menu of DOCUMENT_MENU_BAR) {
    for (const item of menu.items) {
      if (item.type === "action") ids.push(item.id);
    }
  }
  return ids;
}
