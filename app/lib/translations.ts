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
      documentCleaner: "Document Cleaner",
      qualityChecker: "Quality Audit",
      unicodeStandardizer: "Unicode Standardizer",
      invoiceStudio: "Invoice Studio",
      whatsappRtlFormatter: "WhatsApp RTL Formatter",
      moreTools: "More Tools",
      services: "Services",
      about: "About",
      contact: "Contact",
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
        {
          name: "WhatsApp RTL Formatter",
          body: "Fix mixed Urdu, English, numbers and lists for cleaner WhatsApp copy-paste.",
        },
        {
          name: "Invoice Generator",
          body: "Create clean, professional invoices and export them as PDF.",
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
      companyHeading: "Company",
      legalHeading: "Legal",
      contactHeading: "Contact",
      contactNote: "For translation, editing, and publishing services, get in touch.",
      rights: "All rights reserved.",
    },
    services: {
      heading: "Translation & Publishing Services",
      body: "Need more than a tool? We provide professional translation, editing, proofreading, and publication-preparation services in Urdu, English, Arabic, and Persian.",
      cta: "Discuss Your Project",
    },
    about: {
      heading: "About Qalam Works",
      tagline: "A professional digital workspace for Urdu writing, editing, and publication preparation.",
      body1: "Qalam Works is built to serve writers, translators, researchers, publishers, and academic institutions who work seriously with Urdu documents. Our tools focus on accuracy, Unicode consistency, clean typography, and publication-quality output.",
      body2: "Every tool processes your text locally in the browser — your documents are never stored on our servers. We believe professional Urdu publishing deserves software built specifically for it, not adapted from tools designed primarily for English.",
      servicesHeading: "Language Services",
      servicesBody: "In addition to our self-service tools, Qalam Works offers professional language services including translation (Urdu, English, Arabic, Persian), Urdu proofreading and editing, and document formatting for publication.",
      ctaLabel: "Contact us",
    },
    servicesPage: {
      heading: "Professional Services",
      intro: "Our tools are self-service — but some projects need professional hands. Qalam Works offers the following services for clients who need expert assistance.",
      translationHeading: "Translation",
      translationItems: [
        "Urdu ↔ English translation",
        "Arabic ↔ Urdu / English translation",
        "Persian ↔ Urdu / English translation",
        "Context-aware and publication-oriented translation",
      ],
      proofHeading: "Proofreading & Editing",
      proofItems: [
        "Urdu proofreading and linguistic editing",
        "Punctuation and spacing review",
        "Terminology consistency review",
        "Publication preparation",
      ],
      normHeading: "Text & Unicode Normalization",
      normItems: [
        "Urdu text cleanup and Unicode normalization",
        "Punctuation and spacing normalization",
        "Mixed-character and encoding cleanup",
      ],
      formatHeading: "Document Formatting",
      formatItems: [
        "RTL-friendly document formatting",
        "Publication-ready DOCX preparation",
        "Editorial cleanup and consistency checks",
      ],
      ctaHeading: "Request a Service",
      ctaBody: "Send us a message describing your project and we will get back to you.",
      ctaLabel: "Get in touch",
    },
    contactPage: {
      heading: "Contact",
      body: "For translation, editing, proofreading, or publishing services — or for any question about our tools — send us an email.",
      emailLabel: "Email",
      responseNote: "We aim to respond within one to two business days.",
    },
    privacyPage: {
      heading: "Privacy Policy",
      lastUpdated: "Last updated: August 2026",
      sections: [
        { title: "Overview", body: "Qalam Works is committed to respecting your privacy. This page describes how our tools and website handle your data." },
        { title: "Document and Text Processing", body: "Our tools — Document Studio, Document Cleaner, Quality Audit, and Unicode Standardizer — process your text and files entirely in your browser. Your documents and text are not sent to our servers and are not stored anywhere." },
        { title: "Local Storage", body: "Document Studio saves your draft text in your browser's localStorage for convenience between sessions. This data never leaves your device. You can clear it at any time by clearing your browser data." },
        { title: "Contact", body: "If you contact us by email, your message and email address will be used only to respond to your inquiry." },
        { title: "Cookies and Analytics", body: "We do not use tracking cookies or third-party analytics. Standard web server logs may record request metadata (such as IP address and page visited) as part of normal hosting infrastructure." },
        { title: "Updates", body: "This policy may be updated as the product develops. Material changes will be noted on this page." },
      ],
    },
    termsPage: {
      heading: "Terms of Use",
      lastUpdated: "Last updated: August 2026",
      sections: [
        { title: "Use of the Service", body: "Qalam Works provides self-service tools for Urdu text processing and professional language services. You may use this service for lawful purposes only." },
        { title: "No Warranties", body: "The tools are provided as-is. We make no warranties, express or implied, about accuracy, fitness for a particular purpose, or uninterrupted availability." },
        { title: "Your Content", body: "You retain full ownership of any text or documents you process using our tools. We do not claim any rights over content processed locally in your browser." },
        { title: "Limitation of Liability", body: "Qalam Works is not liable for any damages arising from use of or inability to use the service." },
        { title: "Changes", body: "These terms may be updated as the service develops. Continued use of the service after changes are posted constitutes acceptance of the revised terms." },
      ],
    },
    cleanerTool: {
      title: "Document Cleaner",
      description: "Upload a .txt or .docx file to automatically extract, normalize, and audit your Urdu text — then download the cleaned result.",
      reportTab: "Unified Qalam Report",
      previewTab: "Extracted Text Preview",
      downloadTxt: "Download TXT File",
      downloadDocx: "Download DOCX File",
      faqHeading: "Frequently Asked Questions",
      faqs: [
        { question: "What does this tool do?", answer: "It extracts text from your .txt or .docx file, automatically normalizes Unicode, and gives a full quality report — then you can download the corrected file." },
        { question: "Is my file stored anywhere?", answer: "No. Your file is used only for processing and is never stored." },
        { question: "What's the maximum file size?", answer: "Currently .txt and .docx files up to 5MB are supported." },
      ],
      dropzone: {
        prompt: "Drop your document here or click to browse",
        hint: "(.txt, .docx — up to 5 MB)",
        processing: "Processing…",
        errorUnsupported: "Only .txt and .docx files are supported.",
        errorTooLarge: "File size must be less than 5 MB.",
        errorGeneric: "Processing error. Please try again.",
      },
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
        { label: "Arabic yeh (ي) → Urdu yeh (ی)", before: "علي", after: "علی" },
        { label: "Arabic kaf (ك) → Urdu kaf (ک)", before: "كتاب", after: "کتاب" },
        { label: "English comma → Urdu comma", before: "یہ, وہ", after: "یہ، وہ" },
      ],
    },
    invoiceTool: {
      title: "Invoice Generator",
      description: "Create a professional invoice and save it as a PDF — free, no sign-up required.",
      faqHeading: "Frequently Asked Questions",
      faqs: [
        { question: "What does this tool do?", answer: "It lets you build a clean, professional invoice right in your browser, then print it or save it as a PDF." },
        { question: "Is my data saved anywhere?", answer: "No, this currently works only within your current browser session — your data isn't saved once you close the page." },
      ],
    },
  },
  ur: {
    nav: {
      home: "ہوم",
      documentStudio: "ڈاکومنٹ اسٹوڈیو",
      documentCleaner: "ڈاکومنٹ کلینر",
      qualityChecker: "کوالٹی آڈٹ",
      unicodeStandardizer: "یونیکوڈ اسٹینڈرڈائزر",
      invoiceStudio: "انوائس اسٹوڈیو",
      whatsappRtlFormatter: "واٹس ایپ آر ٹی ایل فارمیٹر",
      moreTools: "مزید ٹولز",
      services: "خدمات",
      about: "ہمارے بارے میں",
      contact: "رابطہ",
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
      mockupIssue1: "مخلوط یونیکوڈ شکل",
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
          title: "مخلوط یونیکوڈ شکلیں",
          example: "علي → علی",
          impact: "ایک ہی لفظ ہر بار مختلف نظر آتا ہے، جس سے تلاش اور یکسانیت متاثر ہوتی ہے۔",
        },
        {
          title: "پوشیدہ خالی جگہ کے مسائل",
          example: "لفظ،اگلا → لفظ، اگلا",
          impact: "رمزِ اوقاف کے بعد غائب خالی جگہ ہر عام تصحیحی نظام سے بچ نکلتی ہے۔",
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
      headline: "اردو اشاعت کے ہر مرحلے کے لیے ایک ہی ماحول۔",
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
        {
          name: "واٹس ایپ آر ٹی ایل فارمیٹر",
          body: "اردو، انگریزی، نمبروں اور فہرستوں والے متن کو واٹس ایپ کے لیے درست سمت میں تیار کریں۔",
        },
        {
          name: "انوائس جنریٹر",
          body: "صاف ستھری اور پیشہ ورانہ انوائس تیار کریں اور پی ڈی ایف میں محفوظ کریں۔",
        },
      ],
    },
    whoItsFor: {
      headline: "ان لوگوں کے لیے جو معیار پر سمجھوتہ نہیں کرتے۔",
      audiences: [
        { role: "محققین", body: "صاف حوالہ جات، جائزے کے لیے تیار۔" },
        { role: "مترجمین", body: "ہر مسودے میں یکساں اصطلاحات۔" },
        { role: "ناشرین", body: "کم پروف ریڈنگ، تیز اشاعت۔" },
        { role: "تعلیمی ادارے", body: "بڑے پیمانے پر معیاری آؤٹ پٹ۔" },
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
      companyHeading: "کمپنی",
      legalHeading: "قانونی",
      contactHeading: "رابطہ",
      contactNote: "ترجمہ، تدوین، اور اشاعتی خدمات کے لیے رابطہ کریں۔",
      rights: "جملہ حقوق محفوظ ہیں۔",
    },
    services: {
      heading: "ترجمہ و اشاعتی خدمات",
      body: "کیا آپ کو ٹول سے زیادہ کی ضرورت ہے؟ ہم اردو، انگریزی، عربی، اور فارسی میں پیشہ ورانہ ترجمہ، تدوین، پروف ریڈنگ، اور اشاعت کی تیاری کی خدمات فراہم کرتے ہیں۔",
      cta: "اپنے پروجیکٹ پر بات کریں",
    },
    about: {
      heading: "قلم ورکس کے بارے میں",
      tagline: "اردو لکھائی، تدوین، اور اشاعتی تیاری کے لیے ایک پیشہ ورانہ ڈیجیٹل ماحول۔",
      body1: "قلم ورکس ان لکھاریوں، مترجمین، محققین، ناشرین، اور تعلیمی اداروں کے لیے بنایا گیا ہے جو اردو دستاویزات کے ساتھ سنجیدگی سے کام کرتے ہیں۔ ہمارے ٹولز درستگی، یونیکوڈ یکسانیت، صاف ٹائپوگرافی، اور اشاعت کے معیار کے آؤٹ پٹ پر توجہ دیتے ہیں۔",
      body2: "ہر ٹول آپ کا متن براؤزر میں مقامی طور پر پروسیس کرتا ہے — آپ کی دستاویزات کبھی ہمارے سرورز پر محفوظ نہیں ہوتیں۔",
      servicesHeading: "لسانی خدمات",
      servicesBody: "خود کار ٹولز کے علاوہ، قلم ورکس پیشہ ورانہ لسانی خدمات بھی فراہم کرتا ہے، جن میں ترجمہ (اردو، انگریزی، عربی، فارسی)، اردو پروف ریڈنگ، اور اشاعت کے لیے دستاویز فارمیٹنگ شامل ہیں۔",
      ctaLabel: "رابطہ کریں",
    },
    servicesPage: {
      heading: "پیشہ ورانہ خدمات",
      intro: "ہمارے ٹولز خود کار ہیں — لیکن بعض منصوبوں کے لیے ماہر ہاتھوں کی ضرورت ہوتی ہے۔ قلم ورکس درج ذیل خدمات فراہم کرتا ہے۔",
      translationHeading: "ترجمہ",
      translationItems: [
        "اردو ↔ انگریزی ترجمہ",
        "عربی ↔ اردو / انگریزی ترجمہ",
        "فارسی ↔ اردو / انگریزی ترجمہ",
        "سیاق و سباق کے مطابق اور اشاعتی ترجمہ",
      ],
      proofHeading: "تصحیح و تدوین",
      proofItems: [
        "اردو پروف ریڈنگ اور لسانی تدوین",
        "رموزِ اوقاف اور اسپیسنگ کا جائزہ",
        "اصطلاحی یکسانیت کا جائزہ",
        "اشاعتی تیاری",
      ],
      normHeading: "متن و Unicode معیاری کاری",
      normItems: [
        "اردو متن کی صفائی اور Unicode معیاری کاری",
        "رموزِ اوقاف اور اسپیسنگ کی معیاری کاری",
        "مخلوط حروف اور encoding کی صفائی",
      ],
      formatHeading: "دستاویز فارمیٹنگ",
      formatItems: [
        "RTL دوستانہ دستاویز فارمیٹنگ",
        "اشاعت کے لیے DOCX تیاری",
        "ادارتی صفائی اور یکسانیت کی جانچ",
      ],
      ctaHeading: "خدمت کی درخواست",
      ctaBody: "اپنے منصوبے کی تفصیل بھیجیں اور ہم جلد رابطہ کریں گے۔",
      ctaLabel: "رابطہ کریں",
    },
    contactPage: {
      heading: "رابطہ",
      body: "ترجمہ، تدوین، پروف ریڈنگ، یا اشاعتی خدمات کے لیے — یا ہمارے کسی ٹول کے بارے میں سوال کے لیے — ہمیں ای میل بھیجیں۔",
      emailLabel: "ای میل",
      responseNote: "ہم ایک سے دو کاروباری دنوں میں جواب دینے کی کوشش کرتے ہیں۔",
    },
    privacyPage: {
      heading: "رازداری کی پالیسی",
      lastUpdated: "آخری تازہ کاری: اگست ۲۰۲۶",
      sections: [
        { title: "جائزہ", body: "قلم ورکس آپ کی رازداری کا احترام کرتا ہے۔ یہ صفحہ بتاتا ہے کہ ہمارے ٹولز اور ویب سائٹ آپ کا ڈیٹا کیسے ہینڈل کرتے ہیں۔" },
        { title: "دستاویز اور متن کی پروسیسنگ", body: "ہمارے ٹولز — ڈاکومنٹ اسٹوڈیو، ڈاکومنٹ کلینر، کوالٹی آڈٹ، اور یونیکوڈ اسٹینڈرڈائزر — آپ کا متن اور فائلیں مکمل طور پر آپ کے براؤزر میں پروسیس کرتے ہیں۔ آپ کی دستاویزات ہمارے سرورز پر نہیں بھیجی جاتیں اور نہ کہیں محفوظ ہوتی ہیں۔" },
        { title: "لوکل اسٹوریج", body: "ڈاکومنٹ اسٹوڈیو آپ کا مسودہ آپ کے براؤزر کے لوکل اسٹوریج میں محفوظ کرتا ہے۔ یہ ڈیٹا کبھی آپ کے آلے سے باہر نہیں جاتا۔" },
        { title: "رابطہ", body: "اگر آپ ای میل کے ذریعے رابطہ کریں تو آپ کا پیغام اور ای میل پتہ صرف جواب دینے کے لیے استعمال کیا جائے گا۔" },
        { title: "کوکیز اور اینالیٹکس", body: "ہم ٹریکنگ کوکیز یا تھرڈ پارٹی اینالیٹکس استعمال نہیں کرتے۔" },
        { title: "تازہ کاری", body: "یہ پالیسی پروڈکٹ کی ترقی کے ساتھ تبدیل ہو سکتی ہے۔ اہم تبدیلیاں اس صفحے پر نوٹ کی جائیں گی۔" },
      ],
    },
    termsPage: {
      heading: "استعمال کی شرائط",
      lastUpdated: "آخری تازہ کاری: اگست ۲۰۲۶",
      sections: [
        { title: "سروس کا استعمال", body: "قلم ورکس اردو متن کی پروسیسنگ کے ٹولز اور پیشہ ورانہ لسانی خدمات فراہم کرتا ہے۔ آپ یہ سروس صرف قانونی مقاصد کے لیے استعمال کر سکتے ہیں۔" },
        { title: "کوئی ضمانت نہیں", body: "ٹولز جیسے ہیں ویسے فراہم کیے جاتے ہیں۔ ہم درستگی، کسی خاص مقصد کے لیے موزونیت، یا مسلسل دستیابی کی کوئی ضمانت نہیں دیتے۔" },
        { title: "آپ کا مواد", body: "آپ اپنے کسی بھی متن یا دستاویز کی مکمل ملکیت برقرار رکھتے ہیں جو آپ ہمارے ٹولز سے پروسیس کرتے ہیں۔" },
        { title: "ذمہ داری کی حد", body: "قلم ورکس سروس کے استعمال یا عدم استعمال سے پیدا ہونے والے کسی نقصان کا ذمہ دار نہیں ہے۔" },
        { title: "تبدیلیاں", body: "یہ شرائط سروس کی ترقی کے ساتھ تبدیل ہو سکتی ہیں۔ تبدیلیوں کے بعد سروس کا مسلسل استعمال نظرثانی شدہ شرائط کی قبولیت ہے۔" },
      ],
    },
    cleanerTool: {
      title: "ڈاکومنٹ کلینر",
      description: ".txt یا .docx فائل اپلوڈ کریں تاکہ آپ کا اردو متن خودکار طور پر نکالا، معیاری بنایا، اور جانچا جا سکے — پھر درست شدہ فائل ڈاؤن لوڈ کریں۔",
      reportTab: "قلم رپورٹ",
      previewTab: "متن کا جائزہ",
      downloadTxt: "TXT فائل ڈاؤن لوڈ کریں",
      downloadDocx: "DOCX فائل ڈاؤن لوڈ کریں",
      faqHeading: "اکثر پوچھے گئے سوالات",
      faqs: [
        { question: "یہ ٹول کیا کرتا ہے؟", answer: "یہ آپ کی .txt یا .docx فائل سے متن نکال کر خودکار طور پر Unicode معیاری کاری کرتا ہے اور مکمل کوالٹی رپورٹ دیتا ہے — پھر آپ درست شدہ فائل ڈاؤن لوڈ کر سکتے ہیں۔" },
        { question: "کیا میری فائل کہیں محفوظ ہوتی ہے؟", answer: "نہیں۔ فائل صرف پروسیسنگ کے لیے استعمال ہوتی ہے، کبھی محفوظ نہیں کی جاتی۔" },
        { question: "زیادہ سے زیادہ فائل سائز کیا ہے؟", answer: "فی الحال .txt اور .docx فائلیں 5MB تک سپورٹ کرتی ہیں۔" },
      ],
      dropzone: {
        prompt: "اپنی دستاویز یہاں ڈراپ کریں یا فائل منتخب کریں",
        hint: "(.txt، .docx — زیادہ سے زیادہ 5MB)",
        processing: "پراسیسنگ جاری ہے…",
        errorUnsupported: "صرف .txt اور .docx فائلیں سپورٹ کرتی ہیں۔",
        errorTooLarge: "فائل کا سائز 5 MB سے کم ہونا چاہیے۔",
        errorGeneric: "پراسیسنگ میں خرابی ہوئی۔ دوبارہ کوشش کریں۔",
      },
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
        { label: "عربی یے (ي) ← اردو یے (ی)", before: "علي", after: "علی" },
        { label: "عربی کاف (ك) ← اردو کاف (ک)", before: "كتاب", after: "کتاب" },
        { label: "انگریزی کوما ← اردو کوما", before: "یہ, وہ", after: "یہ، وہ" },
      ],
    },
    invoiceTool: {
      title: "انوائس جنریٹر",
      description: "پیشہ ورانہ انوائس بنائیں اور پی ڈی ایف کے طور پر محفوظ کریں — مفت، بغیر سائن اپ کے",
      faqHeading: "اکثر پوچھے گئے سوالات",
      faqs: [
        { question: "یہ ٹول کیا کرتا ہے؟", answer: "یہ آپ کو براؤزر میں ہی ایک صاف، پروفیشنل انوائس بنانے دیتا ہے اور آپ اسے پرنٹ/Save as PDF کر سکتے ہیں۔" },
        { question: "کیا میرا ڈیٹا محفوظ ہوتا ہے؟", answer: "نہیں، فی الحال یہ صرف آپ کے موجودہ سیشن میں کام کرتا ہے — صفحہ بند کرنے پر ڈیٹا محفوظ نہیں رہتا۔" },
      ],
    },
  },
} as const;

export type Translations = typeof translations.en;
