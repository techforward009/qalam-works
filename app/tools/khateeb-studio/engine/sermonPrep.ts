import type { ShiaCalendarEvent } from "./shiaCalendar";
import { eventTitle } from "./khateebLocale";

export type SermonLocale = "ur" | "en";
export type SermonDuration = 20 | 30 | 45;

export type QuranAnchor = {
  ref: string;
  arabic: string;
  ur: string;
  en: string;
};

export type SourceLead = {
  labelUr: string;
  labelEn: string;
  detailUr: string;
  detailEn: string;
  url?: string;
};

export type SermonPrep = {
  id: string;
  titleUr: string;
  titleEn: string;
  themeUr: string;
  themeEn: string;
  openingUr: string;
  openingEn: string;
  quran: QuranAnchor[];
  sources: SourceLead[];
  anglesUr: string[];
  anglesEn: string[];
  cautionUr?: string;
  cautionEn?: string;
};

const ASKARI: SermonPrep = {
  id: "imam-hasan-askari",
  titleUr: "امام حسن عسکریؑ: امامت، علمی رہنمائی اور غیبت کے دور کی تیاری",
  titleEn: "Imam Hasan al-Askari: Imamate, guidance, and preparation for the age of occultation",
  themeUr: "سیاسی محدودیت کے باوجود امامؑ نے عقیدے، اخلاق، شیعہ علمی رابطے اور امامت کی تسلسل پذیر رہنمائی کو کیسے محفوظ رکھا؟",
  themeEn: "How did the Imam preserve doctrine, ethics, scholarly guidance, and the continuity of Imamate under severe political restriction?",
  openingUr: "اگر امام کو عوامی سیاسی اختیار نہ دیا جائے تو کیا اس کی ہدایت رک جاتی ہے، یا امامت ایک زیادہ گہرا علمی و اخلاقی نظام قائم کرتی ہے؟",
  openingEn: "If an Imam is denied public political authority, does guidance stop—or does Imamate operate through a deeper scholarly and ethical network?",
  quran: [
    {
      ref: "الشورى 42:23",
      arabic: "قُلْ لَا اَسْاَلُكُمْ عَلَيْهِ اَجْرًا اِلَّا الْمَوَدَّةَ فِي الْقُرْبَىٰ",
      ur: "مودّتِ قربىٰ کو محض جذباتی تعلق نہیں بلکہ معرفت، وفاداری اور عملی نسبت کے دروازے کے طور پر کھولیں۔",
      en: "Use mawaddah toward the Prophet's near family as an entry point into knowledge, loyalty, and lived commitment.",
    },
    {
      ref: "التوبة 9:119",
      arabic: "يَا اَيُّهَا الَّذِينَ آمَنُوا اتَّقُوا اللّٰهَ وَكُونُوا مَعَ الصَّادِقِينَ",
      ur: "صدق، تقویٰ اور صالح قیادت کے باہمی تعلق کو امامؑ کی اخلاقی تعلیمات سے جوڑیں۔",
      en: "Connect truthfulness and taqwa with the Imam's moral teaching and the need for trustworthy guidance.",
    },
    {
      ref: "الاحزاب 33:21",
      arabic: "لَقَدْ كَانَ لَكُمْ فِي رَسُولِ اللّٰهِ اُسْوَةٌ حَسَنَةٌ",
      ur: "اسوۂ نبوی سے اس اصول تک آئیں کہ اہل بیتؑ کی ہدایت کا مقصد کردار سازی اور عملی اقتدا ہے۔",
      en: "Move from the Prophetic model to the principle that guidance through Ahl al-Bayt is meant to shape conduct, not merely identity.",
    },
  ],
  sources: [
    {
      labelUr: "تحف العقول — کلماتِ امام حسن عسکریؑ",
      labelEn: "Tuhaf al-Uqul — Narrations of Imam al-Askari",
      detailUr: "اخلاق، عبادت، تقویٰ، معاشرت اور شیعہ شناخت سے متعلق منقول کلمات۔ اقتباس سے پہلے اصل عبارت دیکھیں۔",
      detailEn: "A compact body of reported maxims on worship, piety, social conduct, and Shi'i identity. Check the original wording before quoting.",
      url: "https://al-islam.org/tuhaf-al-uqul-ibn-shuba-al-harrani/narrations-imam-al-askari",
    },
    {
      labelUr: "اصول عقائد شیعہ — ابراہیم امینی، امام حسن عسکریؑ کا باب",
      labelEn: "Principles of the Shi'ite Creed — Ibrahim Amini, chapter on Imam Hasan al-Askari",
      detailUr: "سوانحی و اعتقادی پس منظر اور چند معروف تعلیمات کے لیے ثانوی علمی مطالعہ۔",
      detailEn: "A secondary scholarly overview for biographical, doctrinal, and teaching context.",
      url: "https://al-islam.org/principles-shiite-creed-ibrahim-amini/lesson-28-eleventh-imam-and-thirteenth-infallible-figure-imam",
    },
    {
      labelUr: "امام حسن عسکریؑ کے خطوط",
      labelEn: "Letters attributed to Imam Hasan al-Askari",
      detailUr: "خطوط کے ذریعے شیعہ رابطے، صبر، ظلم کے مقابل اعتماد علی اللہ اور اجتماعی رہنمائی کے زاویے۔",
      detailEn: "Useful for studying guidance through correspondence: patience, reliance on God, community instruction, and response to oppression.",
      url: "https://al-islam.org/the-life-of-imam-hasan-al-askari-baqir-shareef-al-qurashi/his-letters",
    },
  ],
  anglesUr: [
    "امامت کو صرف سیاسی اقتدار کے بجائے ہدایت، تعلیم اور اخلاقی قیادت کے نظام کے طور پر پیش کریں۔",
    "سامرہ کی محدود فضا کو پس منظر بنائیں، مگر مجلس کو محض سوانحی واقعات کی ترتیب نہ بننے دیں۔",
    "امامؑ کے مختصر اخلاقی کلمات سے آج کے معاشرتی رویّوں—غیبت، دو رخی، غصہ، حقوق العباد—کی طرف آئیں۔",
    "غیبتِ صغریٰ سے پہلے شیعہ نیٹ ورک اور نمائندگی کے تصور کو 'ذمہ دار دینداری' کے عنوان سے جوڑیں۔",
  ],
  anglesEn: [
    "Present Imamate as a system of guidance, learning, and moral authority—not only political rule.",
    "Use the restrictions of Samarra as context, but do not let the sermon become a chronology lesson.",
    "Move from the Imam's moral maxims to present-day conduct: backbiting, double standards, anger, and rights of others.",
    "Link the pre-occultation network of guidance to the idea of responsible religious life when direct access is limited.",
  ],
  cautionUr: "تاریخی جزئیات اور کسی خاص خط/روایت کی نسبت بیان کرتے وقت اصل ماخذ ضرور کھولیں؛ خطیب کے بیان کو خود بخود بنیادی حدیثی ماخذ نہ سمجھیں۔",
  cautionEn: "Verify historical details and the attribution of specific letters or reports in the cited source; do not treat a later sermon as a primary hadith source.",
};

const TAWWABIN: SermonPrep = {
  id: "tawwabin",
  titleUr: "توابین: ندامت کب ذمہ داری میں بدلتی ہے؟",
  titleEn: "The Tawwabun: when does regret become responsibility?",
  themeUr: "کربلا کے بعد کی ندامت کو فردی احساسِ جرم کے بجائے توبہ، ذمہ داری، تاخیر کی قیمت اور اجتماعی فیصلہ سازی کے مسئلے کے طور پر پڑھیں۔",
  themeEn: "Read post-Karbala regret not merely as private guilt, but as a question of repentance, responsibility, delayed action, and collective decision-making.",
  openingUr: "کیا صرف یہ کہنا کافی ہے کہ 'ہم سے غلطی ہوئی'—یا سچی توبہ انسان سے قیمت، اصلاح اور ذمہ داری کا تقاضا بھی کرتی ہے؟",
  openingEn: "Is it enough to say 'we were wrong,' or does sincere repentance demand repair, responsibility, and a cost?",
  quran: [
    { ref: "التحريم 66:8", arabic: "يَا اَيُّهَا الَّذِينَ آمَنُوا تُوبُوا اِلَى اللّٰهِ تَوْبَةً نَصُوحًا", ur: "توبۂ نصوح کو محض احساس نہیں بلکہ سمت کی حقیقی تبدیلی کے طور پر پیش کریں۔", en: "Frame sincere repentance as a real change of direction, not a passing emotion." },
    { ref: "الزمر 39:53", arabic: "لَا تَقْنَطُوا مِنْ رَحْمَةِ اللّٰهِ", ur: "مایوسی اور توبہ میں فرق واضح کریں: رحمت کا دروازہ کھلا ہے، مگر توبہ ذمہ داری سے خالی نہیں۔", en: "Distinguish repentance from despair: mercy remains open, but repentance is not responsibility-free." },
    { ref: "الانفال 8:25", arabic: "وَاتَّقُوا فِتْنَةً لَا تُصِيبَنَّ الَّذِينَ ظَلَمُوا مِنْكُمْ خَاصَّةً", ur: "اجتماعی بے عملی کے اثرات فرد سے آگے پوری جماعت تک کیسے پہنچتے ہیں—اس زاویے کے لیے۔", en: "Use this to discuss how collective failure can spread consequences beyond the original wrongdoers." },
  ],
  sources: [
    { labelUr: "تاریخ الطبری — حوادث 65ھ", labelEn: "al-Tabari — events of 65 AH", detailUr: "قیام توابین کی تاریخی ترتیب، شخصیات اور عین الوردہ کے واقعات کی تاریخی جانچ کے لیے۔", detailEn: "For chronology, principal figures, and the events around Ayn al-Warda." },
    { labelUr: "انساب الاشراف — بلاذری", labelEn: "Ansab al-Ashraf — al-Baladhuri", detailUr: "کوفہ کی سیاسی و قبائلی فضا اور بعد از کربلا حرکتوں کے تقابلی مطالعے کے لیے۔", detailEn: "For comparative study of Kufa's political and tribal setting after Karbala." },
    { labelUr: "الاخبار الطوال — دینوری", labelEn: "al-Akhbar al-Tiwal — al-Dinawari", detailUr: "واقعات کی دوسری قدیم تاریخی روایت؛ تفصیلات کو طبری و بلاذری سے ملا کر جانچیں۔", detailEn: "An additional early historical narrative; cross-check details with Tabari and Baladhuri." },
  ],
  anglesUr: [
    "'وقت پر نصرت' اور 'بعد کی ندامت' میں فرق—یہی مرکزی سوال بن سکتا ہے۔",
    "توبہ کی تین سطحیں: اعتراف، اصلاح، اور آئندہ صحیح موقف اختیار کرنا۔",
    "اجتماعی فیصلوں میں خاموش اکثریت کی اخلاقی ذمہ داری۔",
    "کربلا کو محض ماضی نہ بنائیں: آج حق واضح ہونے کے بعد تاخیر، مصلحت اور خاموشی کہاں ہمارے فیصلے بدلتی ہے؟",
  ],
  anglesEn: [
    "Build the sermon around the tension between timely support and later regret.",
    "Use three levels of repentance: admission, repair, and a changed stance in future decisions.",
    "Discuss the moral responsibility of a silent majority in collective decisions.",
    "Bring Karbala into the present: where do delay, convenience, and silence still shape our choices after truth becomes clear?",
  ],
  cautionUr: "توابین کی نیت، سیاسی حکمتِ عملی اور نتائج کے بارے میں تاریخی تجزیہ اور دینی حکم کو الگ رکھیں؛ کسی ایک مؤرخ کی تعبیر کو حتمی مذہبی موقف نہ بنائیں۔",
  cautionEn: "Keep historical analysis of motive, strategy, and outcome separate from doctrinal judgment; no single historian's framing should be presented as definitive theology.",
};

const FATIMA: SermonPrep = {
  id: "fatimiyya",
  titleUr: "حضرت فاطمہ زہراؑ: قربِ رسولؐ، حق اور اخلاقی ذمہ داری",
  titleEn: "Lady Fatimah al-Zahra: nearness to the Prophet, truth, and moral responsibility",
  themeUr: "فاطمیہ کو صرف تاریخی سوگ نہیں بلکہ اہل بیتؑ کی معرفت، حق کے دفاع، عبادت، ایثار اور امت کی اخلاقی ذمہ داری کے عنوان سے پیش کریں۔",
  themeEn: "Present Fatimiyya not only as historical mourning, but through knowledge of Ahl al-Bayt, defense of truth, worship, sacrifice, and communal moral responsibility.",
  openingUr: "رسول اللہؐ کے بعد امت کے اخلاقی امتحان کو ہم صرف تاریخ سمجھتے ہیں یا اپنے آج کے رویّوں کا آئینہ بھی؟",
  openingEn: "Do we read the community's moral test after the Prophet only as history, or also as a mirror for our own conduct today?",
  quran: [
    { ref: "الاحزاب 33:33", arabic: "اِنَّمَا يُرِيدُ اللّٰهُ لِيُذْهِبَ عَنْكُمُ الرِّجْسَ اَهْلَ الْبَيْتِ وَيُطَهِّرَكُمْ تَطْهِيرًا", ur: "اہل بیتؑ کے مقام اور طہارت کے قرآنی پس منظر کے طور پر۔", en: "Use as the Qur'anic frame for the status and purification of Ahl al-Bayt." },
    { ref: "الشورى 42:23", arabic: "اِلَّا الْمَوَدَّةَ فِي الْقُرْبَىٰ", ur: "مودّت کو جذبات سے آگے وفاداری، معرفت اور ذمہ داری سے جوڑیں۔", en: "Move from affection to informed loyalty and responsibility." },
    { ref: "الانسان 76:8-9", arabic: "وَيُطْعِمُونَ الطَّعَامَ عَلَىٰ حُبِّهِ مِسْكِينًا وَيَتِيمًا وَاَسِيرًا", ur: "ایثار اور خلوص کے اخلاقی باب کے طور پر؛ شان نزول بیان کرتے وقت منتخب تفسیر کا حوالہ ساتھ دیں۔", en: "Use for sacrifice and sincerity; when stating asbab al-nuzul, cite the selected tafsir explicitly." },
  ],
  sources: [
    { labelUr: "قرآن و منتخب امامیہ تفاسیر", labelEn: "Qur'an with selected Imami tafsir", detailUr: "آیاتِ تطہیر، مودّت، مباہلہ اور سورۂ انسان کی تفسیری نسبتیں اصل تفسیر سے نقل کریں۔", detailEn: "Check the tafsir directly for the Imami readings of purification, mawaddah, mubahala, and Surat al-Insan." },
    { labelUr: "نہج البلاغہ — خطب و کلماتِ امیرالمؤمنینؑ", labelEn: "Nahj al-Balagha — sermons and sayings of Imam Ali", detailUr: "رسولؐ سے نسبت، حق، صبر اور بعد از رسولؐ حالات کے اخلاقی تناظر کے لیے؛ اصل ماخذ میں عبارت کا مقام دیکھیں۔", detailEn: "For themes of closeness to the Prophet, rights, patience, and the post-Prophetic setting; verify the exact passage before quotation." },
    { labelUr: "قدیم تاریخی و حدیثی مصادر کی تقابلی جانچ", labelEn: "Cross-check early historical and hadith sources", detailUr: "فاطمیہ کی تاریخوں اور واقعات میں متعدد روایات ہیں؛ تاریخ اور استدلال کو ایک دوسرے میں خلط نہ کریں۔", detailEn: "Reports differ on dates and historical detail; keep chronology distinct from theological argument." },
  ],
  anglesUr: [
    "مقامِ زہراؑ کو صرف نسبتِ رسولؐ سے نہیں بلکہ عبادت، علم، ایثار اور حق گوئی کے جامع نمونے کے طور پر پیش کریں۔",
    "مودّتِ اہل بیتؑ کا عملی تقاضا: کردار، عدل، خاندان، عبادت اور کمزوروں کے حقوق۔",
    "فاطمیہ کے تاریخی اختلافات بیان کرتے ہوئے اصل موضوع کو فرقہ وارانہ اشتعال کے بجائے اخلاقی و اعتقادی درس پر قائم رکھیں۔",
    "سوگ سے عمل کی طرف: اگر ہم زہراؑ سے محبت کرتے ہیں تو گھر، معاشرہ اور عبادت میں کون سی تبدیلی نظر آنی چاہیے؟",
  ],
  anglesEn: [
    "Present Fatimah not only through lineage, but through worship, knowledge, sacrifice, and moral courage.",
    "Ask what mawaddah toward Ahl al-Bayt requires in conduct: justice, family life, worship, and care for the vulnerable.",
    "When mentioning contested historical detail, keep the sermon centered on ethical and doctrinal lessons rather than polemical escalation.",
    "Move from mourning to action: what should love of Fatimah change in home, society, and worship?",
  ],
  cautionUr: "تاریخِ شہادت اور بعض تاریخی جزئیات میں اختلافِ نقل موجود ہے؛ انہیں واضح نسبت کے بغیر قطعی تاریخی حقیقت کے طور پر نہ پیش کریں۔",
  cautionEn: "Dates and some historical details are reported differently; do not present a disputed report as uncontested history without attribution.",
};

const MASUMA: SermonPrep = {
  id: "fatima-masuma",
  titleUr: "حضرت فاطمہ معصومہؑ: علم، ہجرت اور ولایت سے وابستگی",
  titleEn: "Lady Fatimah Masuma: knowledge, migration, and attachment to wilayah",
  themeUr: "قم کی علمی روایت، اہل بیتؑ سے وابستگی اور دین کے لیے سفر و قربانی کو ایک مربوط موضوع بنائیں۔",
  themeEn: "Connect Qum's scholarly tradition with attachment to Ahl al-Bayt and the willingness to travel and sacrifice for faith.",
  openingUr: "کب ایک سفر محض جغرافیائی سفر نہیں رہتا بلکہ علم، وفاداری اور تاریخ کی سمت بدلنے والا عمل بن جاتا ہے؟",
  openingEn: "When does a journey become more than geography—turning into an act of knowledge, loyalty, and historical consequence?",
  quran: [
    { ref: "الزمر 39:9", arabic: "هَلْ يَسْتَوِي الَّذِينَ يَعْلَمُونَ وَالَّذِينَ لَا يَعْلَمُونَ", ur: "علم اور دینی بصیرت کی قدر کے لیے۔", en: "Use to frame the value of knowledge and religious understanding." },
    { ref: "المجادلة 58:11", arabic: "يَرْفَعِ اللّٰهُ الَّذِينَ آمَنُوا مِنْكُمْ وَالَّذِينَ اُوتُوا الْعِلْمَ دَرَجَاتٍ", ur: "علمی مراکز اور اہل علم کی قدر کو قرآنی اصول سے جوڑیں۔", en: "Connect the value of scholarly communities with the Qur'anic elevation of people of knowledge." },
    { ref: "التوبة 9:20", arabic: "الَّذِينَ آمَنُوا وَهَاجَرُوا وَجَاهَدُوا فِي سَبِيلِ اللّٰهِ", ur: "ہجرت کو مقصد، ایمان اور قربانی کے ساتھ جوڑنے کے لیے۔", en: "Frame migration as purposeful movement tied to faith and sacrifice." },
  ],
  sources: [
    { labelUr: "تاریخ قم", labelEn: "Tarikh-e Qum", detailUr: "قم، سادات اور حضرت معصومہؑ سے متعلق قدیم مقامی روایت کے لیے؛ دستیاب نسخے/ترجمے کی نسبت واضح رکھیں۔", detailEn: "A key early local source for Qum, Alids, and reports around Lady Masuma; identify the edition or translation used." },
    { labelUr: "امام رضاؑ کے عہد کے تاریخی مصادر", labelEn: "Historical sources for the age of Imam al-Rida", detailUr: "مامون کے دور، امام رضاؑ کی خراسان آمد اور اہل بیتؑ کے سفر کے سیاسی پس منظر کے لیے۔", detailEn: "For the political setting of al-Ma'mun's period, Imam al-Rida's move to Khurasan, and journeys by members of the Prophet's family." },
  ],
  anglesUr: [
    "حضرت معصومہؑ کے ذکر کو قم کی علمی مرکزیت کے ساتھ جوڑیں، مگر بعد کے تاریخی نتائج کو اصل واقعے کا حصہ بنا کر پیش نہ کریں۔",
    "دینی سفر اور قربانی: انسان اپنے آرام کے دائرے سے کب باہر نکلتا ہے؟",
    "خاندانِ اہل بیتؑ کی خواتین کو صرف مصیبت کے باب میں نہیں بلکہ علم، وفاداری اور دینی ذمہ داری اور کردار کے باب میں بھی پیش کریں۔",
  ],
  anglesEn: [
    "Connect Lady Masuma with Qum's later scholarly centrality without projecting later history back onto the original event.",
    "Use the journey as a question of religious sacrifice: when does faith require leaving comfort behind?",
    "Present women of Ahl al-Bayt not only through suffering, but through knowledge, loyalty, and religious agency.",
  ],
  cautionUr: "سوانحی جزئیات اور وفات کی تاریخ مختلف ماخذوں میں مختلف ہو سکتی ہے؛ خطبے میں ہر بات کے ساتھ اس کے اصل ماخذ کی نسبت برقرار رکھیں۔",
  cautionEn: "Biographical details and dates can vary across sources; retain source-specific attribution in the sermon.",
};

const MUKHTAR: SermonPrep = {
  id: "mukhtar",
  titleUr: "قیام مختار: عدل، انتقام اور تاریخی پیچیدگی",
  titleEn: "The uprising of al-Mukhtar: justice, retribution, and historical complexity",
  themeUr: "قیام مختار کو صرف جذباتی انتقام کے قصے کے طور پر نہیں بلکہ عدل، سیاسی دعووں، تاریخی روایت اور نیت و نتیجے کے فرق کے ساتھ پڑھیں۔",
  themeEn: "Study al-Mukhtar's uprising not simply as a revenge story, but through justice, political claims, historical reporting, and the distinction between intention and outcome.",
  openingUr: "ظلم کے بعد عدل کی طلب کب عبادت بنتی ہے، اور کب انتقام انسان کو خود عدل کی حدوں سے باہر لے جا سکتا ہے؟",
  openingEn: "When does the pursuit of justice after oppression become a moral duty—and when can revenge itself exceed the limits of justice?",
  quran: [
    { ref: "النساء 4:135", arabic: "كُونُوا قَوَّامِينَ بِالْقِسْطِ شُهَدَاءَ لِلّٰهِ", ur: "عدل کو شخصیتوں سے اوپر اصول بنائیں۔", en: "Make justice a principle above personalities." },
    { ref: "المائدة 5:8", arabic: "اعْدِلُوا هُوَ اَقْرَبُ لِلتَّقْوَىٰ", ur: "شدید مخالفت میں بھی عدل کی حد باقی رہتی ہے۔", en: "Even intense hostility does not remove the obligation of justice." },
    { ref: "النحل 16:90", arabic: "اِنَّ اللّٰهَ يَاْمُرُ بِالْعَدْلِ وَالْاِحْسَانِ", ur: "عدل اور احسان کے جامع اخلاقی اصول سے اختتام بنایا جا سکتا ہے۔", en: "Use the combined command of justice and excellence as a closing ethical frame." },
  ],
  sources: [
    { labelUr: "تاریخ الطبری — حوادث 66-67ھ", labelEn: "al-Tabari — events of 66-67 AH", detailUr: "کوفہ، مختار، ابن زبیر اور اموی سیاسی کشمکش کی تاریخی ترتیب کے لیے۔", detailEn: "For chronology of Kufa, al-Mukhtar, Ibn al-Zubayr, and the Umayyad political struggle." },
    { labelUr: "انساب الاشراف — بلاذری", labelEn: "Ansab al-Ashraf — al-Baladhuri", detailUr: "شخصیات اور سیاسی گروہوں کے تقابلی تاریخی مواد کے لیے۔", detailEn: "For comparative historical material on actors and political groupings." },
  ],
  anglesUr: [
    "عدل اور انتقام میں فرق: خطبے کا اخلاقی مرکز یہی ہو سکتا ہے۔",
    "مختار کے بارے میں مدح و قدح کی روایات کو یکجا کرکے ماخذ کی علمی جانچ کا اصول سامنے رکھیں۔",
    "کوفہ کی مسلسل سیاسی تبدیلی کو کربلا کے بعد کے اجتماعی بحران سے جوڑیں۔",
  ],
  anglesEn: [
    "Use the distinction between justice and revenge as the sermon's moral center.",
    "Place praise and criticism reports about al-Mukhtar side by side and model source criticism rather than certainty by repetition.",
    "Connect Kufa's shifting politics with the post-Karbala crisis of communal responsibility.",
  ],
  cautionUr: "مختار کے بارے میں روایات اور تاریخی فیصلے متنوع ہیں؛ کسی ایک خطیب یا ایک تاریخی روایت کو مکتب کا قطعی موقف نہ بنائیں۔",
  cautionEn: "Reports and judgments about al-Mukhtar vary; do not turn one sermon or one historical account into a definitive doctrinal position.",
};

const PACKS: Array<{ matches: (event: ShiaCalendarEvent) => boolean; prep: SermonPrep }> = [
  { matches: (e) => e.title.includes("ولادت امام حسن عسکری"), prep: ASKARI },
  { matches: (e) => e.title.includes("توابین"), prep: TAWWABIN },
  { matches: (e) => e.title.includes("فاطمہ زہراؑ"), prep: FATIMA },
  { matches: (e) => e.title.includes("فاطمہ معصومہ"), prep: MASUMA },
  { matches: (e) => e.title.includes("قیامِ مختار") || e.title.includes("قیام مختار"), prep: MUKHTAR },
];

export function getSermonPrep(event: ShiaCalendarEvent | undefined): SermonPrep | null {
  if (!event) return null;
  return PACKS.find((item) => item.matches(event))?.prep ?? {
    id: `generic-${event.id}`,
    titleUr: `${event.title}: تحقیقی و خطیبانہ تیاری`,
    titleEn: `${eventTitle(event, true)}: research and sermon preparation`,
    themeUr: "اس مناسبت کے تاریخی پس منظر، دینی معنی اور آج کے عملی سبق کو تین الگ مرحلوں میں تیار کریں۔",
    themeEn: "Prepare the occasion in three layers: historical context, religious meaning, and a concrete lesson for the present.",
    openingUr: "اس واقعے یا شخصیت کا وہ کون سا سوال ہے جو آج کے سامع کی زندگی سے واقعی متعلق بنتا ہے؟",
    openingEn: "What question in this event or personality genuinely touches the life of today's listener?",
    quran: [],
    sources: [
      {
        labelUr: "تقویمی ماخذ",
        labelEn: "Calendar source",
        detailUr: "پہلے مناسبت کی تاریخ اور بنیادی شناخت موجود ماخذ سے جانچیں، پھر تاریخی و حدیثی مصادر کی طرف جائیں۔",
        detailEn: "First verify the date and basic identification from the stored calendar source, then move to historical and hadith sources.",
        url: event.sourceUrl,
      },
    ],
    anglesUr: [
      "واقعے کی تاریخی ترتیب اور اس کے دینی معنی کو الگ رکھیں۔",
      "ایک بنیادی سوال منتخب کریں؛ بہت سے غیر مربوط نکات جمع نہ کریں۔",
      "کم از کم ایک اصل/قدیم ماخذ اور ایک معتبر علمی شرح ضرور دیکھیں۔",
      "اختتام میں سامع کے لیے ایک واضح عملی نتیجہ دیں۔",
    ],
    anglesEn: [
      "Keep chronology separate from theological meaning.",
      "Choose one governing question instead of collecting unrelated points.",
      "Consult at least one early/primary source and one serious scholarly explanation.",
      "End with one clear, actionable takeaway for the audience.",
    ],
  };
}

export function outlineMinutes(duration: SermonDuration): number[] {
  if (duration === 20) return [3, 5, 5, 5, 2];
  if (duration === 45) return [6, 10, 10, 12, 7];
  return [4, 7, 8, 8, 3];
}

export function durationBrief(duration: SermonDuration, locale: "ur" | "en"): string {
  if (locale === "ur") {
    if (duration === 20) {
      return "بیس منٹ: ایک مرکزی سوال، ایک قرآنی بنیاد، ایک علمی نکتہ اور ایک عملی نتیجہ۔ تفصیل اس مدت میں نہ کھولیں۔";
    }
    if (duration === 45) {
      return "پینتالیس منٹ: مکمل علمی وضاحت، متعدد زاویے، آج کی تطبیق اور جامع اختتام۔";
    }
    return "تیس منٹ: بنیاد، دو علمی نکات، ایک تطبیق اور مختصر اختتام۔";
  }
  if (duration === 20) {
    return "Twenty minutes: one question, one Qur'anic anchor, one scholarly point, and one practical result. Do not open the full detail.";
  }
  if (duration === 45) {
    return "Forty-five minutes: full explanation, several angles, present-day application, and a gathered close.";
  }
  return "Thirty minutes: the foundation, two scholarly points, one application, and a short close.";
}

export function pointsForDuration<T>(items: readonly T[], duration: SermonDuration): readonly T[] {
  if (duration === 45 || items.length <= 1) return items;
  if (duration === 30) return items.slice(0, Math.min(items.length, Math.max(2, Math.ceil(items.length / 2))));
  return items.slice(0, 1);
}

export function buildPreparationText(
  prep: SermonPrep,
  locale: SermonLocale,
  duration: SermonDuration,
  speaker?: { name: string; focus: readonly string[] },
): string {
  const ur = locale === "ur";
  const mins = outlineMinutes(duration);
  const lines: string[] = [
    ur ? prep.titleUr : prep.titleEn,
    "",
    `${ur ? "مرکزی موضوع" : "Central theme"}: ${ur ? prep.themeUr : prep.themeEn}`,
    `${ur ? "سوالِ آغاز" : "Opening question"}: ${ur ? prep.openingUr : prep.openingEn}`,
  ];
  if (prep.quran.length) {
    lines.push("", ur ? "قرآنی بنیاد" : "Qur'anic anchors");
    for (const q of prep.quran) lines.push(`• ${q.ref} — ${q.arabic}\n  ${ur ? q.ur : q.en}`);
  }
  lines.push("", ur ? "قابلِ بیان زاویے" : "Speaking angles");
  for (const angle of ur ? prep.anglesUr : prep.anglesEn) lines.push(`• ${angle}`);
  lines.push("", `${ur ? "خطبہ خاکہ" : "Sermon outline"} — ${duration} ${ur ? "منٹ" : "minutes"}`);
  const labels = ur
    ? ["تمہید اور سوال", "قرآنی بنیاد", "اصل علمی/تاریخی مواد", "آج کی تطبیق", "نتیجہ اور دعوتِ عمل"]
    : ["Opening and question", "Qur'anic frame", "Core scholarly/historical material", "Present-day application", "Conclusion and call to action"];
  labels.forEach((label, i) => lines.push(`• ${label}: ${mins[i]} ${ur ? "منٹ" : "min"}`));
  if (speaker) {
    lines.push("", `${ur ? "منتخب خطیب کا مطالعہ" : "Selected speaker study"}: ${speaker.name}`);
    lines.push(`${ur ? "دیکھنے کے زاویے" : "Watch for"}: ${speaker.focus.join(ur ? "، " : ", ")}`);
  }
  if (prep.cautionUr || prep.cautionEn) lines.push("", `${ur ? "تحقیقی احتیاط" : "Research caution"}: ${ur ? prep.cautionUr : prep.cautionEn}`);
  return lines.join("\n");
}
