/**
 * Qalam Works — Centralized Tool Catalog
 *
 * Single authoritative source for all user-facing tool metadata.
 * Used by: /tools guide page, and any future surfaces (sitemaps, cards, etc.)
 *
 * Rules:
 *   - No technical jargon (JDN, bidi isolates, Puppeteer, lexicon, etc.)
 *   - Claims must match actual tool implementation
 *   - Translation Studio: manual, not automatic
 *   - Quality Checker: rules-based, not spell/grammar/semantic
 */

import {
  BookOpen,
  PenLine,
  Type,
  Languages,
  Eraser,
  SearchCheck,
  MessageCircle,
  FilePenLine,
  CalendarDays,
  ArrowLeftRight,
} from "lucide-react";

export type ToolIcon =
  | typeof BookOpen
  | typeof PenLine
  | typeof Type
  | typeof Languages
  | typeof Eraser
  | typeof SearchCheck
  | typeof MessageCircle
  | typeof FilePenLine
  | typeof CalendarDays
  | typeof ArrowLeftRight;

export interface ToolEntry {
  id: string;
  route: string;
  Icon: ToolIcon;
  iconBg:    string; // Tailwind bg class
  iconColor: string; // Tailwind text class
  name:    { en: string; ur: string };
  short:   { en: string; ur: string };          // one-line card description
  whatItDoes:  { en: string; ur: string };
  input:       { en: string; ur: string };
  output:      { en: string; ur: string };
  doesNotDo:   { en: string; ur: string };
  bestFor:     { en: string; ur: string };
  importantNote?: { en: string; ur: string };
  example?:    string;                          // always LTR; shown as monospace pill
}

export const TOOL_CATALOG: ToolEntry[] = [
  // ── 1. Document Studio ──────────────────────────────────────────────────────
  {
    id: "document_studio",
    route: "/tools/document-studio",
    Icon: BookOpen,
    iconBg: "bg-[#1A3A2A]/8 dark:bg-[#2a5a3a]/50",
    iconColor: "text-[#1A3A2A] dark:text-[#8faa93]",
    name:  { en: "Document Studio", ur: "ڈاکومنٹ اسٹوڈیو" },
    short: {
      en: "Write, standardize, review, and export Urdu documents — one complete workspace.",
      ur: "اردو دستاویزات لکھیں، معیاری کریں، جائزہ لیں اور ایکسپورٹ کریں — ایک مکمل ماحول۔",
    },
    whatItDoes: {
      en: "A four-step workflow: Draft (write and edit freely) → Standardize (apply Unicode, spacing, and punctuation fixes) → Quality Check (inspect issues without changing anything) → Export (DOCX or PDF). Each fix is a suggestion you accept or ignore — nothing changes automatically.",
      ur: "چار مرحلوں کا عمل: مسودہ لکھیں → معیاری بنائیں (یونیکوڈ، فاصلہ، رموزِ اوقاف) → جائزہ لیں (مسائل دیکھیں، متن نہیں بدلتا) → ایکسپورٹ کریں (DOCX یا PDF)۔ ہر اصلاح آپ کی منظوری سے ہوتی ہے۔",
    },
    input:  { en: "Paste text or upload a .txt or .docx file.", ur: "متن پیسٹ کریں یا .txt یا .docx فائل اپلوڈ کریں۔" },
    output: { en: "Cleaned, reviewed document — download as DOCX or PDF.", ur: "صاف اور جانچا ہوا دستاویز — DOCX یا PDF میں ڈاؤن لوڈ کریں۔" },
    doesNotDo: {
      en: "Does not translate, generate text, spell-check, or make grammar suggestions. No AI writing.",
      ur: "ترجمہ نہیں کرتا، متن نہیں لکھتا، املا یا گرامر کی جانچ نہیں کرتا۔",
    },
    bestFor: {
      en: "Anyone preparing a final Urdu document for publication, submission, or sharing.",
      ur: "جو کوئی اردو دستاویز اشاعت، جمع کروانے، یا اشتراک کے لیے تیار کر رہا ہو۔",
    },
  },

  // ── 2. Roman Urdu → Urdu ────────────────────────────────────────────────────
  {
    id: "urdu_writer",
    route: "/tools/roman-urdu-writer",
    Icon: PenLine,
    iconBg: "bg-amber-50 dark:bg-amber-950/30",
    iconColor: "text-amber-700 dark:text-amber-400",
    name:  { en: "Roman Urdu → Urdu", ur: "رومن اردو سے اردو" },
    short: {
      en: "Type in Roman Urdu and get Urdu script — uncertain words stay Roman so you stay in control.",
      ur: "رومن اردو لکھیں اور اردو رسم الخط حاصل کریں — مشکوک الفاظ رومن رہتے ہیں۔",
    },
    whatItDoes: {
      en: "Converts Roman Urdu typing into Urdu script using a large word list and phonetic rules. Words the engine is unsure about are left in Roman and marked for you to review. You can click any word to choose from alternative Urdu spellings.",
      ur: "رومن اردو کو الفاظ کی فہرست اور صوتی قواعد کے ذریعے اردو رسم الخط میں تبدیل کرتا ہے۔ مشکوک الفاظ رومن رہتے ہیں اور آپ ان کا جائزہ لے کر متبادل منتخب کر سکتے ہیں۔",
    },
    input:  { en: "Roman Urdu text typed in the editor.", ur: "ایڈیٹر میں رومن اردو متن۔" },
    output: { en: "Urdu script output with uncertain tokens flagged for review. Copy, export TXT, or continue in Document Studio.", ur: "اردو رسم الخط کا نتیجہ — مشکوک الفاظ نشان زد۔ نقل کریں، TXT ایکسپورٹ کریں، یا ڈاکومنٹ اسٹوڈیو میں جاری رکھیں۔" },
    doesNotDo: {
      en: "Not a translator. Does not produce semantic meaning, correct spelling of ambiguous words, or handle Urdu → Roman (use the separate Urdu → Roman tool for that).",
      ur: "ترجمہ نہیں کرتا۔ مبہم الفاظ کی خودکار درست اردو ہجّے نہیں دیتا۔ اردو سے رومن کے لیے الگ ٹول استعمال کریں۔",
    },
    bestFor: {
      en: "Writers, students, and professionals who think in Roman Urdu and want Urdu script output quickly.",
      ur: "وہ لکھاری، طلبا، اور پیشہ ور جو رومن اردو میں سوچتے ہیں اور جلدی اردو رسم الخط چاہتے ہیں۔",
    },
    example: "mera naam → میرا نام",
  },

  // ── 3. Urdu → Roman ─────────────────────────────────────────────────────────
  {
    id: "urdu_roman_writer",
    route: "/tools/urdu-roman-writer",
    Icon: ArrowLeftRight,
    iconBg: "bg-sky-50 dark:bg-sky-950/30",
    iconColor: "text-sky-700 dark:text-sky-400",
    name:  { en: "Urdu → Roman", ur: "اردو → رومن" },
    short: {
      en: "Transliterate Urdu script to Roman Urdu — character by character, no translation.",
      ur: "اردو رسم الخط کو رومن اردو میں نقل حرفی کریں — کوئی ترجمہ نہیں۔",
    },
    whatItDoes: {
      en: "Converts Urdu script to Roman Urdu using a phrase and word lookup followed by character-level transliteration. Multiple style options are available. English words and numbers are passed through unchanged.",
      ur: "اردو رسم الخط کو جملہ اور لفظ کی فہرست، پھر حرف بہ حرف نقل حرفی کے ذریعے رومن میں بدلتا ہے۔ انگریزی الفاظ اور اعداد بغیر تبدیلی کے رہتے ہیں۔",
    },
    input:  { en: "Urdu script text (paste or type).", ur: "اردو رسم الخط کا متن (پیسٹ یا ٹائپ)۔" },
    output: { en: "Roman Urdu text with style options. Copy to clipboard.", ur: "رومن اردو متن، مختلف انداز کے اختیارات کے ساتھ۔ کلپ بورڈ پر نقل کریں۔" },
    doesNotDo: {
      en: "Not a translator. Transliteration only — the Roman output represents how Urdu sounds, not its meaning in English. Does not handle Roman → Urdu (use the Roman Urdu → Urdu tool).",
      ur: "ترجمہ نہیں کرتا — رومن نتیجہ اردو کی آواز بتاتا ہے، انگریزی معنی نہیں۔ رومن سے اردو کے لیے الگ ٹول استعمال کریں۔",
    },
    bestFor: {
      en: "Sharing Urdu text with readers who prefer Roman script, or creating consistent Romanization.",
      ur: "رومن رسم الخط پسند کرنے والے قارئین کے ساتھ اردو متن شیئر کرنا، یا یکساں نقل حرفی بنانا۔",
    },
    example: "اردو → urdu",
  },

  // ── 4. Translation Studio ────────────────────────────────────────────────────
  {
    id: "translation_studio",
    route: "/tools/translation-studio",
    Icon: Languages,
    iconBg: "bg-violet-50 dark:bg-violet-950/30",
    iconColor: "text-violet-700 dark:text-violet-400",
    name:  { en: "Translation Studio", ur: "ترجمہ اسٹوڈیو" },
    short: {
      en: "A manual translation workspace — you write every translation yourself.",
      ur: "دستی ترجمے کا ماحول — ہر ترجمہ آپ خود لکھتے ہیں۔",
    },
    whatItDoes: {
      en: "Organizes your source document into segments — each non-empty line becomes one translation segment. You type the target translation yourself. The studio helps with: a user-defined glossary (flags missing approved terms), exact-match translation memory (suggests a previous translation when the same source line appears again), QA checks, review workflow, and export.",
      ur: "ماخذ دستاویز کو حصوں میں منظم کرتا ہے — ہر غیر خالی سطر ترجمے کا ایک الگ حصہ بنتی ہے۔ آپ ہدفی ترجمہ خود لکھتے ہیں۔ اسٹوڈیو مدد کرتا ہے: اصطلاحاتی فہرست (منظور شدہ اصطلاح نہ ملنے پر اطلاع)، یکساں ماخذ پر سابقہ ترجمے کی تجویز، جانچ، جائزہ، اور ایکسپورٹ۔",
    },
    input:  { en: "Paste or type source text, then translate each segment in the target field.", ur: "ماخذ متن پیسٹ یا ٹائپ کریں، پھر ہر حصے کا ترجمہ ہدف خانے میں لکھیں۔" },
    output: { en: "Your completed translation — copy, download as TXT or DOCX, or continue in Document Studio.", ur: "آپ کا مکمل ترجمہ — نقل کریں، TXT یا DOCX میں ڈاؤن لوڈ کریں، یا ڈاکومنٹ اسٹوڈیو میں جاری رکھیں۔" },
    doesNotDo: {
      en: "Does not translate automatically. No machine translation. No AI-generated text. Translation memory shows exact matches only — not suggestions for similar (fuzzy) segments. Glossary flags missing terms but does not auto-insert them.",
      ur: "خودکار ترجمہ نہیں کرتا۔ مشین ترجمہ یا AI نہیں۔ ترجمہ یادداشت صرف بالکل یکساں حصوں کی تجویز دیتی ہے۔ اصطلاحاتی فہرست صرف اطلاع دیتی ہے، خودکار شامل نہیں کرتی۔",
    },
    bestFor: {
      en: "Translators who want organized segment-by-segment control, terminology consistency, and professional export.",
      ur: "مترجمین جو منظم حصہ بہ حصہ کنٹرول، اصطلاحاتی یکسانیت، اور پیشہ ورانہ ایکسپورٹ چاہتے ہیں۔",
    },
    importantNote: {
      en: "Not an automatic translator. You write every translation yourself.",
      ur: "یہ خودکار ترجمہ نہیں کرتا۔ ہر ترجمہ آپ خود لکھتے ہیں۔",
    },
  },

  // ── 5. Urdu Text Cleaner ────────────────────────────────────────────────────
  {
    id: "document_cleaner",
    route: "/tools/document-cleaner",
    Icon: Eraser,
    iconBg: "bg-emerald-50 dark:bg-emerald-950/30",
    iconColor: "text-emerald-700 dark:text-emerald-400",
    name:  { en: "Urdu Text Cleaner", ur: "اردو ٹیکسٹ کلینر" },
    short: {
      en: "Fix common Unicode forms, spacing, and punctuation in Urdu text — words unchanged.",
      ur: "اردو متن میں یونیکوڈ حروف، فاصلے اور رموزِ اوقاف درست کریں — الفاظ نہیں بدلتے۔",
    },
    whatItDoes: {
      en: "Detects and corrects common Urdu text issues: mixed Unicode letter variants (ي→ی, ك→ک), extra spaces, incorrect spacing around punctuation, and ASCII punctuation mixed into Urdu text. Language-aware: safe for Urdu, English, Arabic, or mixed-language content.",
      ur: "اردو متن کے عام مسائل درست کرتا ہے: مخلوط یونیکوڈ حروف (ي→ی، ك→ک)، اضافی فاصلے، رموزِ اوقاف کے گرد غلط فاصلہ، اور اردو میں شامل ASCII رموز۔ اردو، انگریزی، عربی، اور مخلوط متن کے لیے محفوظ۔",
    },
    input:  { en: "Paste text or upload a .txt or .docx file.", ur: "متن پیسٹ کریں یا .txt یا .docx فائل اپلوڈ کریں۔" },
    output: { en: "Cleaned text with a summary of corrections applied. Copy or download.", ur: "صاف متن اور کی گئی اصلاحات کا خلاصہ۔ نقل کریں یا ڈاؤن لوڈ کریں۔" },
    doesNotDo: {
      en: "Does not change words, meaning, or sentence structure. Does not spell-check, grammar-check, or translate.",
      ur: "الفاظ، مفہوم، یا جملے کی ساخت نہیں بدلتا۔ املا، گرامر، یا ترجمہ نہیں کرتا۔",
    },
    bestFor: {
      en: "Anyone cleaning up Urdu text copied from PDFs, websites, Word documents, or other sources with mixed encoding.",
      ur: "جو کوئی PDFs، ویب سائٹس، Word فائلوں یا دیگر ذرائع سے کاپی کیے گئے اردو متن کو صاف کرنا چاہتا ہو۔",
    },
    example: "ي / ك → ی / ک",
  },

  // ── 6. Urdu Text Check ──────────────────────────────────────────────────────
  {
    id: "quality_audit",
    route: "/tools/quality-checker",
    Icon: SearchCheck,
    iconBg: "bg-amber-50 dark:bg-amber-950/30",
    iconColor: "text-amber-700 dark:text-amber-400",
    name:  { en: "Urdu Text Check", ur: "اردو متن کی جانچ" },
    short: {
      en: "Inspect Urdu text for spacing, punctuation, and script issues — nothing is changed.",
      ur: "اردو متن میں فاصلہ، رموزِ اوقاف اور رسم الخط کے مسائل جانچیں — کچھ تبدیل نہیں ہوتا۔",
    },
    whatItDoes: {
      en: "Runs a set of rules to find: extra spaces, punctuation placed incorrectly, repeated words, mixed Urdu/ASCII punctuation, and script-related observations. Reports counts of issues and observations. Text is never changed.",
      ur: "قواعد کے ذریعے جانچتا ہے: اضافی فاصلے، غلط رموزِ اوقاف، دہرائے الفاظ، مخلوط اردو/ASCII رموز، اور رسم الخط کے مشاہدات۔ مسائل اور مشاہدات کی تعداد رپورٹ کرتا ہے۔ متن کبھی تبدیل نہیں ہوتا۔",
    },
    input:  { en: "Paste or type text to inspect.", ur: "جانچ کے لیے متن پیسٹ یا ٹائپ کریں۔" },
    output: { en: "A report listing spacing, punctuation, and script findings. No edited text output.", ur: "فاصلہ، رموزِ اوقاف اور رسم الخط کے نتائج کی رپورٹ۔ ترمیم شدہ متن نہیں ملتا۔" },
    doesNotDo: {
      en: "Does not fix anything automatically. Does not check spelling, grammar, or meaning. Not a proofreader.",
      ur: "کچھ خودکار درست نہیں کرتا۔ املا، گرامر، یا معنی کی جانچ نہیں کرتا۔ مکمل پروف ریڈنگ نہیں ہے۔",
    },
    bestFor: {
      en: "Writers and editors who want a quick inspection of spacing and punctuation before they clean or publish.",
      ur: "لکھاری اور مدیر جو صاف کرنے یا اشاعت سے پہلے فاصلہ اور رموزِ اوقاف کا فوری جائزہ چاہتے ہیں۔",
    },
    importantNote: {
      en: "Checks formatting rules only. Spelling, grammar, and semantic accuracy are not checked.",
      ur: "صرف فارمیٹنگ قواعد جانچتا ہے۔ املا، گرامر اور معنوی درستی شامل نہیں۔",
    },
  },

  // ── 7. Urdu Unicode Fixer ───────────────────────────────────────────────────
  {
    id: "urdu_unicode_standardizer",
    route: "/tools/unicode-standardizer",
    Icon: Type,
    iconBg: "bg-rose-50 dark:bg-rose-950/30",
    iconColor: "text-rose-700 dark:text-rose-400",
    name:  { en: "Urdu Unicode Fixer", ur: "اردو یونیکوڈ فکسر" },
    short: {
      en: "Normalize mixed Urdu Unicode variants in plain text — fixes letter forms, spacing, and punctuation.",
      ur: "سادہ متن میں مخلوط اردو یونیکوڈ شکلیں معیاری بنائیں — حروف، فاصلہ اور رموزِ اوقاف درست کریں۔",
    },
    whatItDoes: {
      en: "Focuses specifically on Unicode normalization: replaces Arabic yeh (ي) with Urdu yeh (ی), Arabic kaf (ك) with Urdu kaf (ک), and similar letter-form variants. Also fixes spacing and punctuation. Plain text only.",
      ur: "خاص طور پر یونیکوڈ معیاری کاری پر توجہ دیتا ہے: عربی یے (ي) کو اردو یے (ی) سے، عربی کاف (ك) کو اردو کاف (ک) سے بدلتا ہے، اور اسی طرح کی دیگر شکلیں۔ فاصلہ اور رموزِ اوقاف بھی درست کرتا ہے۔ صرف سادہ متن۔",
    },
    input:  { en: "Paste plain Urdu text.", ur: "سادہ اردو متن پیسٹ کریں۔" },
    output: { en: "Normalized plain text with badges showing what was fixed. Copy or download.", ur: "معیاری سادہ متن — کیا درست ہوا اس کی اطلاع کے ساتھ۔ نقل کریں یا ڈاؤن لوڈ کریں۔" },
    doesNotDo: {
      en: "Does not accept file uploads. Does not change word meaning, grammar, or structure. Does not spell-check.",
      ur: "فائل اپلوڈ قبول نہیں کرتا۔ لفظ کا مفہوم، گرامر یا ساخت نہیں بدلتا۔ املا کی جانچ نہیں کرتا۔",
    },
    bestFor: {
      en: "Quick Unicode normalization of small Urdu text snippets, especially copied from mixed sources.",
      ur: "چھوٹے اردو متن کے ٹکڑوں کی فوری یونیکوڈ معیاری کاری، خاص طور پر مخلوط ذرائع سے نقل کردہ متن۔",
    },
    example: "ي → ی   ك → ک",
  },

  // ── 8. WhatsApp Urdu Formatter ──────────────────────────────────────────────
  {
    id: "whatsapp_rtl_formatter",
    route: "/tools/whatsapp-rtl-formatter",
    Icon: MessageCircle,
    iconBg: "bg-green-50 dark:bg-green-950/30",
    iconColor: "text-green-700 dark:text-green-400",
    name:  { en: "WhatsApp Urdu Formatter", ur: "واٹس ایپ اردو فارمیٹر" },
    short: {
      en: "Prepare mixed Urdu/English text for more stable direction in WhatsApp — copy and paste directly.",
      ur: "مخلوط اردو/انگریزی متن کو واٹس ایپ میں بہتر سمت کے لیے تیار کریں — سیدھا کاپی پیسٹ کریں۔",
    },
    whatItDoes: {
      en: "Adds invisible Unicode direction markers around mixed RTL/LTR content so that Urdu, English, numbers, and links flow more predictably when pasted into WhatsApp. Handles numbered lists, bullets, and mixed-script inline elements.",
      ur: "مخلوط RTL/LTR مواد کے گرد پوشیدہ یونیکوڈ سمت-نشان شامل کرتا ہے تاکہ اردو، انگریزی، اعداد اور لنک واٹس ایپ میں زیادہ مستحکم طریقے سے دکھیں۔ گنتی والی فہرستیں، نشانیاں اور مخلوط رسم الخط کے عناصر سنبھالتا ہے۔",
    },
    input:  { en: "Paste or type mixed Urdu/English text.", ur: "مخلوط اردو/انگریزی متن پیسٹ یا ٹائپ کریں۔" },
    output: { en: "Formatted text with direction markers, ready to copy into WhatsApp.", ur: "سمت-نشانوں کے ساتھ تیار متن — واٹس ایپ میں کاپی پیسٹ کریں۔" },
    doesNotDo: {
      en: "Does not translate or modify words. Does not guarantee identical rendering on every WhatsApp version or device.",
      ur: "الفاظ نہیں بدلتا یا ترجمہ نہیں کرتا۔ ہر واٹس ایپ ورژن یا ڈیوائس پر یکساں نظر آنے کی ضمانت نہیں۔",
    },
    bestFor: {
      en: "Anyone sending bilingual Urdu/English messages, lists, or announcements via WhatsApp.",
      ur: "جو کوئی واٹس ایپ پر دو زبانوں (اردو/انگریزی) میں پیغامات، فہرستیں، یا اعلانات بھیجتا ہو۔",
    },
  },

  // ── 9. Invoice Generator ────────────────────────────────────────────────────
  {
    id: "invoice_generator",
    route: "/tools/invoice-generator",
    Icon: FilePenLine,
    iconBg: "bg-[#1A3A2A]/8 dark:bg-[#2a5a3a]/50",
    iconColor: "text-[#1A3A2A] dark:text-[#8faa93]",
    name:  { en: "Invoice Generator", ur: "انوائس جنریٹر" },
    short: {
      en: "Build professional invoices with itemized costs and taxes, then download a clean PDF.",
      ur: "اشیاء، ٹیکس اور رعایت کے ساتھ پیشہ ورانہ انوائس بنائیں اور صاف PDF ڈاؤن لوڈ کریں۔",
    },
    whatItDoes: {
      en: "Lets you enter business details, client information, line items (description, quantity, unit price), per-item and invoice-level discounts and taxes. Calculates totals automatically. Live preview in four design templates. Supports logo and signature/stamp upload. Export as PDF.",
      ur: "کاروباری تفصیلات، کلائنٹ کی معلومات، اشیاء (تفصیل، تعداد، فی یونٹ قیمت)، رعایت اور ٹیکس درج کریں۔ کل رقم خودکار حساب ہوتی ہے۔ چار ڈیزائن ٹیمپلیٹ میں زندہ پیش منظر۔ لوگو اور دستخط/مہر اپلوڈ کریں۔ PDF میں ایکسپورٹ کریں۔",
    },
    input:  { en: "Fill in the invoice form: your details, client details, and line items.", ur: "انوائس فارم بھریں: آپ کی تفصیلات، کلائنٹ کی تفصیلات، اور اشیاء۔" },
    output: { en: "A professional PDF invoice, free of Qalam Works branding.", ur: "ایک پیشہ ورانہ PDF انوائس، قلم ورکس کے بغیر۔" },
    doesNotDo: {
      en: "Does not save invoices between sessions. Does not send emails, connect to accounting software, or store any financial data.",
      ur: "سیشن کے درمیان انوائس محفوظ نہیں کرتا۔ ای میل نہیں بھیجتا، اکاؤنٹنگ سافٹ ویئر سے نہیں جڑتا، کوئی مالیاتی ڈیٹا محفوظ نہیں کرتا۔",
    },
    bestFor: {
      en: "Freelancers, consultants, and small businesses who need a clean Urdu or bilingual invoice PDF quickly.",
      ur: "فری لانسر، مشیر اور چھوٹے کاروبار جنہیں جلدی صاف اردو یا دو زبانی انوائس PDF چاہیے۔",
    },
  },

  // ── 10. Date Converter ──────────────────────────────────────────────────────
  {
    id: "date_converter",
    route: "/tools/date-converter",
    Icon: CalendarDays,
    iconBg: "bg-indigo-50 dark:bg-indigo-950/30",
    iconColor: "text-indigo-700 dark:text-indigo-400",
    name:  { en: "Date Converter", ur: "تاریخ کنورٹر" },
    short: {
      en: "Convert dates between Gregorian, Hijri, and Solar Hijri calendars instantly.",
      ur: "عیسوی، ہجری قمری اور ہجری شمسی تاریخوں کو فوراً باہم تبدیل کریں۔",
    },
    whatItDoes: {
      en: "Converts any date between Gregorian, Hijri (Islamic lunar), and Solar Hijri (Persian) calendar systems. Shows the weekday. Generates a shareable link with the converted date.",
      ur: "عیسوی، ہجری قمری (اسلامی چاند) اور ہجری شمسی (فارسی) تقویموں کے درمیان تاریخ تبدیل کرتا ہے۔ ہفتے کا دن بھی دکھاتا ہے۔ تبدیل شدہ تاریخ کا قابلِ اشتراک لنک بناتا ہے۔",
    },
    input:  { en: "Select a source calendar and enter day, month, year.", ur: "ماخذ تقویم منتخب کریں اور دن، مہینہ، سال درج کریں۔" },
    output: { en: "The equivalent date in all three calendar systems, with weekday and shareable URL.", ur: "تینوں تقویموں میں مساوی تاریخ، ہفتے کے دن اور قابلِ اشتراک لنک کے ساتھ۔" },
    doesNotDo: {
      en: "Does not convert times, time zones, or Islamic event dates. Hijri dates use an arithmetic calculation — may differ by one day from moon-sighting-based calendars.",
      ur: "وقت، ٹائم زون، یا اسلامی ایونٹ کی تاریخیں نہیں بدلتا۔ ہجری تاریخیں حسابی طریقے پر ہیں — رویتِ ہلال پر مبنی تقویم سے ایک دن کا فرق ممکن ہے۔",
    },
    bestFor: {
      en: "Anyone working across Gregorian, Islamic, or Persian calendar contexts.",
      ur: "جو کوئی عیسوی، اسلامی یا فارسی تقویموں کے درمیان کام کرتا ہو۔",
    },
  },

  // ── 11. Calendar Maker ──────────────────────────────────────────────────────
  {
    id: "calendar_maker",
    route: "/tools/calendar-maker",
    Icon: CalendarDays,
    iconBg: "bg-teal-50 dark:bg-teal-950/30",
    iconColor: "text-teal-700 dark:text-teal-400",
    name:  { en: "Calendar Maker", ur: "تقویم ساز" },
    short: {
      en: "Build a printable annual Gregorian calendar with an optional calculated Hijri date overlay.",
      ur: "سالانہ قابلِ طباعت عیسوی تقویم بنائیں، چاہیں تو حسابی ہجری تاریخیں بھی شامل کریں۔",
    },
    whatItDoes: {
      en: "Creates a 12-month annual calendar with correct weekday placement, Sunday or Monday week start, English or Urdu labels, optional calculated Hijri dates, and A4 portrait or landscape PDF export.",
      ur: "درست ہفتہ وار ترتیب کے ساتھ 12 ماہ کی سالانہ تقویم بناتا ہے۔ اتوار یا پیر سے ہفتہ شروع کریں، اردو یا انگریزی منتخب کریں، حسابی ہجری تاریخیں شامل کریں، اور A4 عمودی یا افقی PDF حاصل کریں۔",
    },
    input:  { en: "Choose Gregorian year, calendar content, language, week start, and A4 page orientation.", ur: "عیسوی سال، تقویم کا مواد، زبان، ہفتے کا آغاز، اور A4 صفحے کی سمت منتخب کریں۔" },
    output: { en: "A live 12-month preview and downloadable annual PDF calendar.", ur: "12 ماہ کا زندہ پیش منظر اور ڈاؤن لوڈ کے قابل سالانہ PDF تقویم۔" },
    doesNotDo: {
      en: "Does not use astronomical Hijri calculation, prayer times, event databases, location services, or custom calendar artwork.",
      ur: "فلکیاتی ہجری حساب، نماز کے اوقات، تقریبات کا ڈیٹابیس، مقام کی خدمات، یا حسبِ خواہش کیلنڈر آرٹ ورک شامل نہیں کرتا۔",
    },
    bestFor: {
      en: "Anyone who needs a clean printable yearly calendar with optional Qalam Works calculated Hijri dates.",
      ur: "جو کوئی صاف قابلِ طباعت سالانہ تقویم چاہتا ہو، اختیاری قلم ورکس حسابی ہجری تاریخوں کے ساتھ۔",
    },
    importantNote: {
      en: "Hijri dates use the same deterministic tabular engine as Date Converter and may differ from local moon sighting.",
      ur: "ہجری تاریخیں تاریخ کنورٹر کے اسی حسابی قمری انجن سے بنتی ہیں اور مقامی رویتِ ہلال سے مختلف ہو سکتی ہیں۔",
    },
  },
];
