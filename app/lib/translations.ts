// Centralized site copy (2026-08-10). One dictionary, keyed by
// language, consumed via useLanguage()'s `language` value — e.g.
// `translations[language].hero.headline`. Keeping every string here
// (rather than scattering `language === "ur" ? ... : ...` ternaries
// through components) is the "clean shared solution" the brief asked
// for: adding a new page's copy means adding one new key here, not
// hunting through components for inline literals.
//
// POSITIONING CORRECTION (2026-08-10): copy below intentionally frames
// the PRODUCT (Document Studio, Quality Audit, Unicode Standardizer) as
// Urdu-first — no "Arabic script" or "Urdu/Arabic/Persian publishing
// intelligence" claims. Arabic and Persian appear ONLY under Services
// (professional translation), never as product-capability claims.

export const translations = {
  en: {
    nav: {
      home: "Home",
      documentStudio: "Document Studio",
      qualityChecker: "Quality Audit",
      unicodeStandardizer: "Unicode Standardizer",
      services: "Services",
      openStudio: "Open Studio",
    },
    hero: {
      eyebrow: "Built for Urdu",
      headline: "Urdu writing deserves better tools.",
      subheadline:
        "Write, refine, and prepare professional Urdu documents — without fighting software built primarily for English.",
      ctaPrimary: "Open Document Studio",
      ctaSecondary: "See real before & after",
      trustLine: "Researchers · Translators · Publishers · Academia",
      mockupLabel: "Document Studio",
      mockupIssue1: "Mixed Unicode form",
      mockupIssue1Detail: "should be",
      mockupIssue2: "Missing space after punctuation",
      mockupCount: "2 issues found",
      mockupStatus: "Ready to fix",
    },
    problem: {
      headline: "Word processors still treat Urdu as an afterthought.",
      supporting: "Every serious Urdu writer, editor, and publisher has felt this frustration.",
      points: [
        {
          title: "Mixed Unicode forms",
          example: "علي → علی",
          impact: "The same word looks different every time it's typed, breaking search and consistency.",
        },
        {
          title: "Invisible spacing issues",
          example: "لفظ،اگلا → لفظ، اگلا",
          impact: "A missing space after punctuation slips past every normal spell-checker, silently.",
        },
        {
          title: "Wrong punctuation",
          example: "یہ, وہ → یہ، وہ",
          impact: "English commas and marks creep into Urdu prose without anyone noticing.",
        },
        {
          title: "Terminology drift",
          example: "استعمار → نوآبادیاتی نظام",
          impact: "The same term gets translated two different ways across a single document.",
        },
      ],
    },
    beforeAfter: {
      headline: "See the difference in seconds.",
      before: "BEFORE",
      after: "AFTER",
      note: "Fixed automatically by Qalam Works.",
    },
    howItWorks: {
      headline: "One workspace for every stage of Urdu publishing.",
      tools: [
        {
          name: "Document Studio",
          body: "Write, standardize, and export — all in one place, with live quality feedback as you type.",
        },
        {
          name: "Quality Audit",
          body: "Catch every inconsistency before it reaches print, in a single pass.",
        },
        {
          name: "Unicode Standardizer",
          body: "Fix mixed character forms across a whole document in one click.",
        },
        {
          name: "Terminology Intelligence",
          body: "Keep every term consistent, document-wide — automatically.",
        },
      ],
    },
    whoItsFor: {
      headline: "Built for people who refuse to compromise on quality.",
      audiences: [
        { role: "Researchers", body: "Clean citations, ready for review." },
        { role: "Translators", body: "Consistent terms across every draft." },
        { role: "Publishers", body: "Fewer proofreading rounds, faster print." },
        { role: "Academic Institutions", body: "Standardized output at scale." },
      ],
    },
    finalCta: {
      headline: "Stop fixing the same errors by hand.",
      subline: "Start publishing with the confidence your work deserves.",
      cta: "Open Document Studio",
    },
    footer: {
      tagline: "A professional writing and publishing environment built for Urdu.",
      servicesNote: "Translation services also available in Urdu, English, Arabic, and Persian.",
      toolsHeading: "Tools",
      contactHeading: "Contact",
      contactNote: "For translation, editing, and publishing services, get in touch.",
      rights: "All rights reserved.",
    },
    services: {
      heading: "Translation & Publishing Services",
      body: "Need more than a tool? We provide professional translation, editing, proofreading, and publication-preparation services in Urdu, English, Arabic, and Persian.",
      cta: "Discuss Your Project",
    },
    cleanerTool: {
      title: "Document Cleaner",
      description: "Upload a .txt or .docx file to automatically extract, normalize, and audit your Urdu text — then download the cleaned result.",
      faqHeading: "Frequently Asked Questions",
      faqs: [
        { question: "What does this tool do?", answer: "It extracts text from your .txt or .docx file, automatically normalizes Unicode, and gives a full quality report — then you can download the corrected file." },
        { question: "Is my file stored anywhere?", answer: "No. Your file is used only for processing and is never stored." },
        { question: "What's the maximum file size?", answer: "Currently .txt and .docx files up to 5MB are supported." },
      ],
    },
    qualityTool: {
      title: "Publication Quality Checker",
      description: "Paste your Urdu text — or upload a .txt/.docx file — to audit it for spacing, punctuation, and text-quality issues before publication.",
      faqHeading: "Frequently Asked Questions",
      faqs: [
        { question: "What does this tool do?", answer: "It audits your text before publication — catching extra spacing, punctuation errors, repeated words, and unnecessary script mixing. It only flags issues, it never changes your text automatically." },
        { question: "Does it fix the text automatically?", answer: "No, this is an audit only. You can run the Unicode Standardizer separately to see a before/after comparison." },
        { question: "Is my text stored anywhere?", answer: "No. Processing happens entirely in your browser — your text is never sent to a server." },
      ],
    },
    unicodeTool: {
      title: "Urdu Unicode Standardizer",
      description: "Paste any Urdu text below to instantly normalize mixed character variants, fix spacing, and correct punctuation — free, processed entirely in your browser.",
      examplesHeading: "Examples",
      faqHeading: "Frequently Asked Questions",
      faqs: [
        { question: "What does this tool do?", answer: "It normalizes mixed Unicode variants in your Urdu text (like ي instead of ی, ك instead of ک), removes extra spaces, and corrects punctuation to match Urdu conventions." },
        { question: "Is my text stored anywhere?", answer: "No. Processing happens entirely in your browser — your text is never sent to a server." },
        { question: "What file formats does it support?", answer: "Currently plain text only. For DOCX and PDF files, use our Document Cleaner tool." },
      ],
      examples: [
        { label: "Mixed character forms", before: "علي عليه السلام", after: "علی علیہ السلام" },
        { label: "English-style punctuation", before: "العلم نور , والجهل ظلام", after: "العلم نور، والجهل ظلام" },
      ],
    },
  },
  ur: {
    nav: {
      home: "ہوم",
      documentStudio: "ڈاکومنٹ اسٹوڈیو",
      qualityChecker: "کوالٹی آڈٹ",
      unicodeStandardizer: "یونیکوڈ اسٹینڈرڈائزر",
      services: "خدمات",
      openStudio: "اسٹوڈیو کھولیں",
    },
    hero: {
      eyebrow: "اردو کے لیے بنایا گیا",
      headline: "اردو تحریر بہتر اوزار کی مستحق ہے۔",
      subheadline:
        "لکھنے سے لے کر متن کی اصلاح اور اشاعت تک — اردو کے لیے بنایا گیا ایک جدید، پیشہ ورانہ ماحول۔",
      ctaPrimary: "ڈاکومنٹ اسٹوڈیو کھولیں",
      ctaSecondary: "حقیقی پہلے اور بعد دیکھیں",
      trustLine: "محققین · مترجمین · ناشرین · تعلیمی ادارے",
      mockupLabel: "ڈاکومنٹ اسٹوڈیو",
      mockupIssue1: "مخلوط Unicode شکل",
      mockupIssue1Detail: "ہونا چاہیے",
      mockupIssue2: "رمزِ اوقاف کے بعد خالی جگہ غائب",
      mockupCount: "2 مسائل ملے",
      mockupStatus: "درست کرنے کے لیے تیار",
    },
    problem: {
      headline: "ورڈ پروسیسرز اب بھی اردو کو ثانوی درجہ دیتے ہیں۔",
      supporting: "ہر سنجیدہ اردو لکھاری، مدیر، اور ناشر نے یہ مشکل محسوس کی ہے۔",
      points: [
        {
          title: "مخلوط Unicode شکلیں",
          example: "علي → علی",
          impact: "ایک ہی لفظ ہر بار مختلف نظر آتا ہے، جس سے تلاش اور یکسانیت متاثر ہوتی ہے۔",
        },
        {
          title: "پوشیدہ خالی جگہ کے مسائل",
          example: "لفظ،اگلا → لفظ، اگلا",
          impact: "رمزِ اوقاف کے بعد غائب خالی جگہ ہر عام spell-checker سے بچ نکلتی ہے۔",
        },
        {
          title: "غلط رموزِ اوقاف",
          example: "یہ, وہ → یہ، وہ",
          impact: "انگریزی کوما اور نشانات بغیر کسی کے متوجہ ہوئے اردو نثر میں شامل ہو جاتے ہیں۔",
        },
        {
          title: "اصطلاحی بے ترتیبی",
          example: "استعمار → نوآبادیاتی نظام",
          impact: "ایک ہی اصطلاح ایک ہی دستاویز میں دو مختلف طریقوں سے لکھی جاتی ہے۔",
        },
      ],
    },
    beforeAfter: {
      headline: "چند ثانیوں میں فرق دیکھیں۔",
      before: "پہلے",
      after: "بعد",
      note: "قلم ورکس کے ذریعے خودکار طور پر درست کیا گیا۔",
    },
    howItWorks: {
      headline: "اردو اشاعت کے ہر مرحلے کے لیے ایک ہی workspace۔",
      tools: [
        {
          name: "ڈاکومنٹ اسٹوڈیو",
          body: "لکھیں، معیاری بنائیں، اور export کریں — ایک ہی جگہ پر، لکھتے ہوئے فوری معیار کی رائے کے ساتھ۔",
        },
        {
          name: "کوالٹی آڈٹ",
          body: "اشاعت سے پہلے، ایک ہی مرحلے میں ہر خرابی پکڑیں۔",
        },
        {
          name: "یونیکوڈ اسٹینڈرڈائزر",
          body: "پوری دستاویز میں مخلوط حروف کی شکلیں ایک کلک میں درست کریں۔",
        },
        {
          name: "اصطلاحی ذہانت",
          body: "ہر اصطلاح پوری دستاویز میں خودکار طور پر یکساں رکھیں۔",
        },
      ],
    },
    whoItsFor: {
      headline: "ان لوگوں کے لیے جو معیار پر سمجھوتہ نہیں کرتے۔",
      audiences: [
        { role: "محققین", body: "صاف حوالہ جات، جائزے کے لیے تیار۔" },
        { role: "مترجمین", body: "ہر مسودے میں یکساں اصطلاحات۔" },
        { role: "ناشرین", body: "کم proofreading، تیز اشاعت۔" },
        { role: "تعلیمی ادارے", body: "بڑے پیمانے پر معیاری output۔" },
      ],
    },
    finalCta: {
      headline: "ایک جیسی غلطیاں ہاتھ سے ٹھیک کرنا بند کریں۔",
      subline: "اپنے کام کے شایانِ شان اعتماد کے ساتھ شائع کرنا شروع کریں۔",
      cta: "ڈاکومنٹ اسٹوڈیو کھولیں",
    },
    footer: {
      tagline: "اردو کے لیے بنایا گیا ایک پیشہ ورانہ لکھائی اور اشاعتی ماحول۔",
      servicesNote: "ترجمہ خدمات اردو، انگریزی، عربی، اور فارسی میں بھی دستیاب ہیں۔",
      toolsHeading: "ٹولز",
      contactHeading: "رابطہ",
      contactNote: "ترجمہ، تدوین، اور اشاعتی خدمات کے لیے رابطہ کریں۔",
      rights: "جملہ حقوق محفوظ ہیں۔",
    },
    services: {
      heading: "ترجمہ و اشاعتی خدمات",
      body: "کیا آپ کو ٹول سے زیادہ کی ضرورت ہے؟ ہم اردو، انگریزی، عربی، اور فارسی میں پیشہ ورانہ ترجمہ، تدوین، proofreading، اور اشاعت کی تیاری کی خدمات فراہم کرتے ہیں۔",
      cta: "اپنے پروجیکٹ پر بات کریں",
    },
    cleanerTool: {
      title: "ڈاکومنٹ کلینر",
      description: ".txt یا .docx فائل اپلوڈ کریں تاکہ آپ کا اردو متن خودکار طور پر نکالا، معیاری بنایا، اور جانچا جا سکے — پھر درست شدہ فائل ڈاؤن لوڈ کریں۔",
      faqHeading: "اکثر پوچھے گئے سوالات",
      faqs: [
        { question: "یہ ٹول کیا کرتا ہے؟", answer: "یہ آپ کی .txt یا .docx فائل سے متن نکال کر خودکار طور پر Unicode معیاری کاری کرتا ہے اور مکمل کوالٹی رپورٹ دیتا ہے — پھر آپ درست شدہ فائل ڈاؤن لوڈ کر سکتے ہیں۔" },
        { question: "کیا میری فائل کہیں محفوظ ہوتی ہے؟", answer: "نہیں۔ فائل صرف پروسیسنگ کے لیے استعمال ہوتی ہے، کبھی محفوظ نہیں کی جاتی۔" },
        { question: "زیادہ سے زیادہ فائل سائز کیا ہے؟", answer: "فی الحال .txt اور .docx فائلیں 5MB تک سپورٹ کرتی ہیں۔" },
      ],
    },
    qualityTool: {
      title: "پبلیکیشن کوالٹی چیکر",
      description: "اپنا اردو متن پیسٹ کریں — یا .txt/.docx فائل اپلوڈ کریں — تاکہ اشاعت سے پہلے خالی جگہ، رموزِ اوقاف، اور متن کے معیار کے مسائل کا جائزہ لیا جا سکے۔",
      faqHeading: "اکثر پوچھے گئے سوالات",
      faqs: [
        { question: "یہ ٹول کیا کرتا ہے؟", answer: "یہ آپ کے متن کو اشاعت سے پہلے جانچتا ہے — اضافی خالی جگہیں، رموزِ اوقاف کی خرابیاں، دہرائے گئے الفاظ، اور غیر ضروری رسم الخط کا اختلاط پکڑتا ہے۔ یہ صرف نشاندہی کرتا ہے، خود کوئی تبدیلی نہیں کرتا۔" },
        { question: "کیا یہ خود متن درست کر دیتا ہے؟", answer: "نہیں، یہ صرف جائزہ لیتا ہے۔ آپ الگ سے یونیکوڈ اسٹینڈرڈائزر چلا کر پہلے اور بعد کا تقابل دیکھ سکتے ہیں۔" },
        { question: "کیا میرا متن کہیں محفوظ ہوتا ہے؟", answer: "نہیں۔ یہ عمل مکمل طور پر آپ کے براؤزر میں ہوتا ہے — متن کبھی کسی سرور پر نہیں بھیجا جاتا۔" },
      ],
    },
    unicodeTool: {
      title: "یونیکوڈ اسٹینڈرڈائزر",
      description: "نیچے کوئی بھی اردو متن پیسٹ کریں تاکہ فوری طور پر مخلوط حروف کی شکلیں معیاری بنیں، خالی جگہ درست ہو، اور رموزِ اوقاف ٹھیک ہوں — مفت، اور مکمل طور پر آپ کے براؤزر میں پروسیس ہوتا ہے۔",
      examplesHeading: "مثالیں",
      faqHeading: "اکثر پوچھے گئے سوالات",
      faqs: [
        { question: "یہ ٹول کیا کرتا ہے؟", answer: "یہ آپ کے اردو متن میں مختلف Unicode شکلوں (جیسے ي بجائے ی، ك بجائے ک) کو معیاری بناتا ہے، اضافی خالی جگہیں ہٹاتا ہے، اور رموزِ اوقاف کو اردو کے مطابق درست کرتا ہے۔" },
        { question: "کیا میرا متن کہیں محفوظ ہوتا ہے؟", answer: "نہیں۔ یہ عمل مکمل طور پر آپ کے براؤزر میں ہوتا ہے — متن کبھی کسی سرور پر نہیں بھیجا جاتا۔" },
        { question: "کن فائل فارمیٹس کے ساتھ کام کرتا ہے؟", answer: "فی الحال صرف plain text۔ DOCX اور PDF فائلوں کے لیے ہمارا ڈاکومنٹ کلینر ٹول استعمال کریں۔" },
      ],
      examples: [
        { label: "مخلوط حروف کی شکلیں", before: "علي عليه السلام", after: "علی علیہ السلام" },
        { label: "انگریزی طرز کے رموزِ اوقاف", before: "العلم نور , والجهل ظلام", after: "العلم نور، والجهل ظلام" },
      ],
    },
  },
} as const;

export type Translations = typeof translations.en;
