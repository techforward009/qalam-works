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
          example: "علي / علی",
          impact: "The same word looks different every time it's typed, breaking search and consistency.",
        },
        {
          title: "Invisible spacing issues",
          example: "لفظ،اگلا",
          impact: "A missing space after punctuation slips past every normal spell-checker, silently.",
        },
        {
          title: "Wrong punctuation",
          example: "یہ, وہ",
          impact: "English commas and marks creep into Urdu prose without anyone noticing.",
        },
        {
          title: "Terminology drift",
          example: "استعمار / نوآبادیاتی نظام",
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
          example: "علي / علی",
          impact: "ایک ہی لفظ ہر بار مختلف نظر آتا ہے، جس سے تلاش اور یکسانیت متاثر ہوتی ہے۔",
        },
        {
          title: "پوشیدہ خالی جگہ کے مسائل",
          example: "لفظ،اگلا",
          impact: "رمزِ اوقاف کے بعد غائب خالی جگہ ہر عام spell-checker سے بچ نکلتی ہے۔",
        },
        {
          title: "غلط رموزِ اوقاف",
          example: "یہ, وہ",
          impact: "انگریزی کوما اور نشانات بغیر کسی کے متوجہ ہوئے اردو نثر میں شامل ہو جاتے ہیں۔",
        },
        {
          title: "اصطلاحی بے ترتیبی",
          example: "استعمار / نوآبادیاتی نظام",
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
  },
} as const;

export type Translations = typeof translations.en;
