import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { displayTafsirHeading, splitTafsirTypography, tafsirSourceHeading } from "../app/quran/reader/tafsirTypography";

const flatten = (text: string) => splitTafsirTypography(text).map((run) => run.text).join("");

describe("Tafsir source-preserving typography", () => {
  it("keeps all characters, punctuation, line breaks and meaningful spaces byte-for-byte", () => {
    const samples = [
      "پروگرام کودوام بخشنے کے لئے اسے ایسی ہستی سے منسوب کیا جائے۔",
      "اس کے نام سے شروع کریں:\nاقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ\n(ہود، آیت ۴۱)۔",
      "Mixed text: اِنَّ اللّٰهَ غَفُورٌ رَحِيمٌ (Hud, verse 41).",
      "  فاصلہ اور رموزِ اوقاف ،۔ محفوظ رہیں  \n",
    ];
    for (const sample of samples) expect(flatten(sample)).toBe(sample);
  });

  it("keeps complete standalone Arabic quotations, including U+06D2, in one Arabic run", () => {
    const text = "اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ\nوَقَالَ ارْكَبُواْ فِيهَا بِسْمِ اللّهِ مَجْرِےهَا وَمُرْسَاهَا إِنَّ رَبِّي لَغَفُورٌ رَّحِيمٌ (ہود، آیت ۴۱)۔";
    const runs = splitTafsirTypography(text);
    expect(runs.filter((run) => run.kind === "arabic").map((run) => run.text)).toEqual([
      "اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ",
      "وَقَالَ ارْكَبُواْ فِيهَا بِسْمِ اللّهِ مَجْرِےهَا وَمُرْسَاهَا إِنَّ رَبِّي لَغَفُورٌ رَّحِيمٌ",
    ]);
    expect(runs.some((run) => run.kind === "reference")).toBe(true);
    expect(runs.filter((run) => run.kind === "reference").map((run) => run.text)).toEqual([" (ہود، آیت ۴۱)۔"]);
    expect(flatten(text)).toBe(text);
  });

  it("recognizes verified unvowelled Arabic quotations in Urdu first-page topics without rewriting text", () => {
    const examples = [
      "کل امر ذی بال لم یذکر فیہ اسم اللہ فھو ابتر",
      "استرق الشیطان من الناس اعظم آیة من القرآن بسم اللہ الرحمن الرحیم ۔",
      "فان اللہ غفور رحیم (بقرہ، ۲۲۶)۔",
      "ھو اللہ الذی لا الہ الا ھو الملک القدوس السلام المومن المھیمن العزیز الجبار المتکبر۔",
      "واللہ الہ کل شیئی الرحمان بجمیع خلقہ الرحیم بالمومنین خاصة۔ (بحوالہ: المیزان بسند کافی، توحید صدوق اور معانی الاخبار۔)",
      "و رحمتی وسعت کل شئی",
      "ربنا وسعت کل شئی رحمة۔",
      "و نجنا برحمتک ۔",
      "فانجیناہ والذین معہ برحمة منا۔",
      "اللھم ربنا انزل علینا مائدة من السماء و ارزقنا و انت خیر الرازقین۔",
      "رب انزلنی منزلا مبارکا و انت خیرالمنزلین۔",
      "رب لا تذرنی فردا و انت خیر الوارثین۔",
      "یا من سبقت رحمتہ غضبہ۔",
    ];
    for (const text of examples) {
      const runs = splitTafsirTypography(text, "ur");
      expect(runs.some((r) => r.kind === "arabic"), text).toBe(true);
      expect(runs.map((r) => r.text).join(""), text).toBe(text);
    }
    for (const ordinaryUrdu of ["خدا کی رحمت عام اور رحمت خاص", "اس گفتگو سے معلوم ہوا کہ بسم اللہ سورت کا جزء ہے۔"]) {
      expect(splitTafsirTypography(ordinaryUrdu, "ur")).toEqual([{ kind: "urdu", text: ordinaryUrdu }]);
    }
  });

  it("uses Scheherazade for undiacritized Arabic quotations across all seven Al-Fatihah articles and next reviewed source entries", () => {
    const quotations = [
      "وما من دابة فی الارض الا علی اللہ رزقھا۔",
      "دعواھم فیھا سبحانک اللھم و تحیتھم فیھا سلام و آخر دعواہم ان الحمد للہ رب العالمین۔",
      "اتخذوا احبارھم و رھبانہم اربابا من دون اللہ۔ (توبہ، ۳۱)",
      "قل یا عبادی الذین اسرفوا علی انفسہم لا تقنطوا من رحمة اللہ ان اللہ یغفرالذنوب جمیعا۔",
      "ولئن سالتھم من خلق السموات و الارض لیقولن اللہ۔ (لقمان، ۲۵)",
      "و قال الذین کفروا ہل ندلکم علی رجل ینبئکم اذا مزقتم کل ممزق انکم لفی خلق جدید افتری علی اللہ کذبا ام بہ جنة۔ (سبا، ۸، ۷)",
      "و یزید اللہ الذین اھتدوا ھدی۔ (مریم، ۷۶)",
      "و الذین اھتدوا ازادھم ھدی و اتاھم تقواھم۔ (محمد، ۱۷)",
      "قل اننی ھدانی ربی الی صراط مستقیم۔ دینا قیما ملة ابراھیم حنیفا۔ و ماکان من المشرکین۔",
      "الم اعھد الیکم یبنی آدم ان لا تعبدوا الشیطان، انہ لکم عدو مبین، و ان اعبدونی ھذا صراط مستقیم۔",
      "ومن یعتصم باللہ فقد ھدی الی صراط مستقیم۔",
      "ان الدین عنداللہ الاسلام۔ (آل عمران، ۱۹)",
      "الصراط المستقیم صراط الانبیاء وھم الذین انعم اللہ علیھم۔",
      "واللہ نحن صراط المستقیم۔",
      "ومن یطع اللہ والرسول فاولئک مع الذین انعم اللہ علیھم من النبیین والصدیقین والشھداء والصالحین، وحسن اولئک رفیقا۔",
      "ولکن من شرح بالکفر صدرا فعلیھم غضب من اللہ۔",
      "و یعذب المنافقین و المنافقات والمشرکین والمشرکات الظانین باللہ ظن السوء علیھم دائرة السوء وغضب اللہ علیھم و لعنھم و اعدلھم جھنم۔",
      "وباء و بغضب من اللہ و ضربت علیھم المسکنة ذلک بانھم کانو یکفرون بایت اللہ و یقتلون الانبیاء بغیر حق ذلک بما عصوا وکان یعتدون۔",
      "یصدون عن سبیل اللہ۔ (اعراف، ۴۵)",
      "والذین یحاجون فی اللہ من بعد ما استجیب لہ حجتھم داحضة عند ربھم و علیھم غضب ولھم عذاب شدید۔",
      "قال ربنا الذی اعطی کل شئی خلقہ ثم ھدیٰ۔ (طہ، ۵۰)",
      "و جعلناھم ائمة یھدون بامرنا۔ (انبیاء ۷۳)",
      "ان معناہ و مما علمناھم یبثون۔",
      "و لا یتبع الھوی فیضلک عن سبیل اللہ ، ان الذین یضلون عن سبیل اللہ لھم عذاب شدید بما نسوا یوم الحساب۔",
      "ان اکرمکم عنداللہ اتقاکم۔ (حجرات، ۱۳)",
      "ان تقوی اللہ مفتاح سداد و ذخیرة معاد و عتق من کل ملکة ونجاة من کل ھلکة۔",
      "و اذ زاغت الابصار و بلغت القلوب الحناجر۔",
      "و ختم علی سمعہ و قلبہ و جعل علی بصرہ غشاوة۔ (جاثیہ، ۲۳)",
    ];
    for (const quote of quotations) {
      const runs = splitTafsirTypography(quote, "ur");
      expect(runs.some((run) => run.kind === "arabic"), quote).toBe(true);
      expect(runs.map((run) => run.text).join(""), quote).toBe(quote);
    }
  });

  it("isolates exact Arabic passages embedded in Urdu without changing the Urdu font", () => {
    const cases = [
      ["توحید افعال کا مطلب (لاموٴثر فی الوجود الّا اللہ، یعنی اللہ کے علاوہ کوئی موثر نہیں)۔", "لاموٴثر فی الوجود الّا اللہ"],
      ["اس نے کہا: رب زدنی علما۔ خدا میرے علم میں اضافہ فرما۔", "رب زدنی علما"],
      ["قرآن میں وکان بالمومنین رحیما (خدا مومنین کے لئے رحیم ہے) آیا ہے۔", "وکان بالمومنین رحیما"],
      ["قال فرعون و مارب العالمین۔ قال رب السموات والارض و ما بینھما۔ فرعون نے کہا عالمین کا رب کون ہے۔", "قال فرعون و مارب العالمین۔ قال رب السموات والارض و ما بینھما۔"],
      ["رب العالمین ھم الجماعات من کل مخلوق من الجمادات والحیوانات۔ رب العالمین سے مراد تمام مخلوقات ہیں۔", "رب العالمین ھم الجماعات من کل مخلوق من الجمادات والحیوانات۔"],
      ["نبی اکرم (صلى الله عليه وآله وسلم) نے ارشاد فرمایا۔", "صلى الله عليه وآله وسلم"],
    ] as const;
    for (const [text, arabicQuote] of cases) {
      const runs = splitTafsirTypography(text, "ur");
      expect(runs.filter((run) => run.kind === "arabic").map((run) => run.text), text).toContain(arabicQuote);
      expect(runs.some((run) => run.kind === "urdu"), text).toBe(true);
      expect(runs.map((run) => run.text).join(""), text).toBe(text);
    }
  });

  it("keeps printed Urdu Quran verse citations in Alvi rather than the Arabic quotation font", () => {
    const cases = [
      ["ولئن سالتھم من خلق السموات و الارض لیقولن اللہ۔ (لقمان، ۲۵)", "(لقمان، ۲۵)"],
      ["و قال الذین کفروا ہل ندلکم علی رجل ینبئکم اذا مزقتم کل ممزق انکم لفی خلق جدید افتری علی اللہ کذبا ام بہ جنة۔ (سبا، ۸، ۷)", "(سبا، ۸، ۷)"],
      ["قل یا عبادی الذین اسرفوا علی انفسہم لا تقنطوا من رحمة اللہ ان اللہ یغفرالذنوب جمیعا۔ (زمر، ۵۳)", "(زمر، ۵۳)"],
      ["و ختم علی سمعہ و قلبہ و جعل علی بصرہ غشاوة۔ (جاثیہ، ۲۳)", "(جاثیہ، ۲۳)"],
    ] as const;
    for (const [text, reference] of cases) {
      const runs = splitTafsirTypography(text, "ur");
      expect(runs.map((run) => run.text).join("")).toBe(text);
      expect(runs.find((run) => run.kind === "reference")?.text).toContain(reference);
      expect(runs.some((run) => run.kind === "arabic")).toBe(true);
      expect(runs.find((run) => run.kind === "arabic")?.text).not.toContain(reference);
    }
  });

  it("never switches an ordinary Urdu sentence to Arabic just for mentioning Allah, Rahman or Arabic words", () => {
    for (const urdu of [
      "ساری دنیا اللہ کی رحمت میں ڈوبی ہوئی ہے۔",
      "خدا وہ ہے جس نے ہر چیز کی خلقت کو بہترین صورت میں انجام دیا۔",
      "یہاں بسم اللہ کے معنی اور اس کی فضیلت پر گفتگو ہے۔",
      "اس سورہ میں صراط مستقیم کی ہدایت کا بیان ہے۔",
    ]) {
      expect(splitTafsirTypography(urdu, "ur")).toEqual([{ kind: "urdu", text: urdu }]);
    }
  });

  it("keeps reviewed Arabic-only source quotations in Scheherazade for entries 11–20", () => {
    const sourceLines = [
        "الریاء شجرة لا تثمر الا الشرک الخفی و اصلھا النفاق۔",
        "الذین یلمزون المطوعین من المومنین فی الصدقات والذین لا یجدون الا جھدھم فیسخرون منھم سخر اللہ منھم و لھم عذاب الیم۔ (توبہ ۷۹)",
        "الانداد ھو الشرک الخفی من دبیب النمل علی صفاة سوداء فی ظلمة اللیل وھو ان یقول واللہ حیاتک یافلان ِوحیاتی… ویقول لو لا کلیہ ھذا لاتانا اللصوص البارحة… وقول الرجل لصاحبہ ماشاء اللہ وشئت ھذا کلہ بہ شرک۔",
        "انکم وما تعبدون من دون اللہ حصب جھنم۔",
        "لا یاتون بمثلہ۔",
        "فاتقوا النار التی وقودھا الناس والحجارة ۔",
        "وانّ لہ لحلاوة، ان علیہ لطلاوة وان اعلاہ لمثمر وان اسفلہ لمغدق، وانہ یعلو ولایعلٰی علیہ۔",
        "ان الذین تدعون من دون اللہ لن یخلقوا ذبابا ولواجتمعو لہط و ان یسلبھم الذباب شیئا لا یستنقذوہ منہط ضعف الطالب والمطلوب۔",
        "فلما زاغوا ازاغ اللہ قلوبھم۔ (صف ۵۰)",
        "الم اعھد الیکم یا بنی آدم ان لا تعبدوا الشیطان ج انہ لکم عدو مبین و ان اعبدونی ھذا صراط مستقیم۔ (یسین ،۶۰، ۶۱)",
        "فھل عسیتم ان تولیتم ان تفسدوا فی الارض وتقطعوا ارحامکم اولئک الذین لعنھم اللہ۔",
        "الذی خلق الموت والحیٰوة لیبکوکم ایّکم احسن عملاَ۔",
        "وسخّر لکم ما فی السمٰوات وما فی الارض۔",
        "الم تر کیف ضرب اللہ مثلا کلمة طیبةکشجرة طیبة اصلھا ثابت وفرعھا فی السماء۔ (ابراہیم ۔۲۴)",
        "ثم استوی الی السماء وھی دخان۔ (فصلت۔ ۰اا)(حم سجدہ)",
        "ولو ان ما فی الارض من شجرة اقلام والبحر یمدّہ من بعدہ سبعة ابحر ما نفدت کلمٰت اللہ۔",
        "انا زینا السماء الدنیا بزینةن الکواکب۔ (الصفت ۔۶)",
        "الارضین والجبال والشعاب والاودیہ ثم نظر الی بساط تحتہ فقال وھذا البساط مما علمہ۔",
        "فاذا سویتہ ونفخت فیہ من روحی فقعوا لہ سجدین۔",
        "فسجدوا الا ابلیس ط کان من الجن۔",
        "انما یرید الشیطان ان یوقع بینکم العداوة والبغضآء۔ (مائدہ،۹۱)",
        "وکذٰلک جعلنا لکل نبی عدواَ شیٰطین الانس والجن۔ (انعام ،۱۱۲)",
        "لاتشرب الماء من ثلمة الاناء ولامن عروتہ فان الشیطان یعقد علی العروة والثلمة۔",
        "ولا یشرب من اذن الکوزولامن کسرہ فان کان فیہ فانہ مشرب الشیاطین۔"
    ];
    for (const text of sourceLines) {
      const runs = splitTafsirTypography(text, "ur");
      expect(runs.map((run) => run.text).join(""), text).toBe(text);
      expect(runs.some((run) => run.kind === "arabic"), text).toBe(true);
    }
  });

  it("uses the existing approved public Scheherazade New file only for Tafsir Arabic quotations", () => {
    const page = readFileSync("app/quran/QuranTafsirPage.tsx", "utf8");
    const catalog = readFileSync("app/tools/document-studio/utils/publicBlobFontCatalog.ts", "utf8");
    expect(catalog).toContain('ScheherazadeNew-Medium.woff2');
    expect(page).toContain('publicBlobFontUrl("ScheherazadeNew-Medium.woff2")');
    expect(page).toContain('fontFamily: \'"Qalam Tafsir Scheherazade", serif\'');
    expect(page).toContain('data-tafsir-font="scheherazade-new"');
    expect(page).toContain('fontSize: language === "ur" ? "20px" : "1.12em"');
    expect(page).toContain('<style>{TAFSIR_SCHEHERAZADE_CSS + TAFSIR_READING_SURFACE_CSS}</style>');
    expect(page).not.toContain('data-tafsir-font-warning');
    expect(page).not.toContain('Digital Khatt lacks a glyph');
    expect(page).toContain('fontFamily: \'"Mehr Nastaliq Web", "Noto Nastaliq Urdu", serif\'');
    expect(page).toContain('fontFamily: \'"Gulzar", serif\'');
  });

  it("styles all eleven reported unvowelled quotations in English Tafsir as complete Arabic-script runs", () => {
    const quotations = [
          "کل امر ذی بال لم یذکر فیہ اسم اللہ فھو ابتر",
          "استرق الشیطان من الناس اعظم آیة من القرآن بسم اللہ الرحمن الرحیم .",
          "ھو اللہ الذی لا الہ الا ھو الملک القدوس السلام المومن المھیمن العزیز الجبار المتکبر۔",
          "و رحمتی وسعت کل شئی",
          "ربنا وسعت کل شئی رحمة۔",
          "و نجنا برحمتک ۔",
          "فانجیناہ والذین معہ برحمة منا۔",
          "اللھم ربنا انزل علینا مائدة من السماء و ارزقنا و انت خیر الرازقین۔",
          "رب انزلنی منزلا مبارکا و انت خیرالمنزلین۔",
          "رب لا تذرنی فردا و انت خیر الوارثین۔",
          "یا من سبقت رحمتہ غضبہ۔"
    ];
    for (const quote of quotations) {
      const runs = splitTafsirTypography(quote, "en");
      const arabic = runs.filter((run) => run.kind === "arabic");
      expect(arabic, quote).toHaveLength(1);
      expect(arabic[0].text.startsWith(quote.trim().split(" ")[0]), quote).toBe(true);
      expect(runs.map((run) => run.text).join(""), quote).toBe(quote);
    }
  });

  it("recognizes Arabic words mid-sentence, while retaining English letters, numbers, punctuation, and line breaks", () => {
    const input = "The hadith says: کل امر ذی بال لم یذکر فیہ اسم اللہ فھو ابتر. Next: و رحمتی وسعت کل شئی (2:255).\\nThe name اللّٰهُ is Arabic.\\nNot Arabic: नमस्ते, Αβραχαμ, 2026!";
    const runs = splitTafsirTypography(input, "en");
    expect(runs.map((run) => run.text).join("")).toBe(input);
    expect(runs.filter((run) => run.kind === "arabic").map((run) => run.text)).toEqual([
      "کل امر ذی بال لم یذکر فیہ اسم اللہ فھو ابتر",
      "و رحمتی وسعت کل شئی",
      "اللّٰهُ",
    ]);
    expect(runs.filter((run) => run.kind !== "arabic").map((run) => run.text).join("")).toContain("Not Arabic: नमस्ते, Αβραχαμ, 2026!");
  });

  it("does not change conservative Urdu segmentation when Arabic detection is enabled for English", () => {
    const sample = "یہ عبارت اِنَّا لِلّٰهِ کو مثال کے طور پر پیش کرتی ہے۔";
    expect(splitTafsirTypography(sample, "ur")).toEqual(splitTafsirTypography(sample));
    expect(splitTafsirTypography(sample, "ur")).toEqual([{ kind: "urdu", text: sample }]);
    expect(splitTafsirTypography(sample, "en").some((run) => run.kind === "arabic")).toBe(true);
  });

  it("leaves ambiguous and mixed Urdu lines intact instead of switching individual words", () => {
    const mixed = "یہ عبارت اِنَّا لِلّٰهِ کو مثال کے طور پر پیش کرتی ہے۔";
    const unvowelled = "بسم اللہ کے نام سے ہر کام شروع کریں۔";
    for (const text of [mixed, unvowelled]) {
      const runs = splitTafsirTypography(text);
      expect(runs).toEqual([{ kind: "urdu", text }]);
      expect(flatten(text)).toBe(text);
    }
  });

  it("corrects only reviewed English display headings and retains the original title separately", () => {
    const source = "Tafsir Bismillah-your-Rahman al-Rahim";
    expect(displayTafsirHeading(source, "en")).toBe("Tafsir of Bismillah al-Rahman al-Rahim");
    expect(tafsirSourceHeading(source, "en")).toBe(source);
    expect(displayTafsirHeading(source, "ur")).toBe(source);
    expect(displayTafsirHeading("A new source heading", "en")).toBe("A new source heading");
    expect(displayTafsirHeading("He doesn't sleep, he doesn't sleep.", "en"))
      .toBe("Neither drowsiness nor sleep overtakes Him");
  });
});
