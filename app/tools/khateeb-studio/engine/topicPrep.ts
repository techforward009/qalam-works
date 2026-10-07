import type { SermonPrep, SermonLocale } from "./sermonPrep";
import { pureKhateebUrdu } from "./urduPurity";

export type TopicCategory =
  | "belief"
  | "ethics"
  | "spirituality"
  | "family"
  | "society"
  | "akhirah";

export type TopicPrep = SermonPrep & {
  category: TopicCategory;
  keywordsUr: readonly string[];
  keywordsEn: readonly string[];
};

const TOPICS: readonly TopicPrep[] = [
  {
    id: "parents-barsi",
    category: "family",
    titleUr: "والدین، برسی اور وفات کے بعد بھی جاری رہنے والا حق",
    titleEn: "Parents, remembrance, and duties that continue after death",
    themeUr:
      "والدین کے حق کو صرف اطاعت یا جذباتی یاد تک محدود نہ رکھیں؛ قرآن، رسالۃ الحقوق اور معتبر شیعہ علمی مواد کی روشنی میں اسے وجود، پرورش، شکر، بڑھاپا، تربیت، دعا اور وفات کے بعد جاری نیکی کے ایک مربوط رشتے کے طور پر پیش کریں۔",
    themeEn:
      "Present parental rights as a continuous relationship of origin, nurture, gratitude, care, formation, prayer, and goodness after death.",
    openingUr:
      "اگر والدین دنیا سے چلے جائیں تو کیا ان کا حق ختم ہو جاتا ہے، یا اولاد کی ذمہ داری ایک نئی صورت میں شروع ہوتی ہے؟",
    openingEn:
      "When parents die, does their right end, or does the child's responsibility continue in another form?",
    quran: [
      {
        ref: "الإسراء 17:23–24",
        arabic: "وَقَضٰى رَبُّكَ اَلَّا تَعْبُدُوْا اِلَّا اِيَّاهُ وَبِالْوَالِدَيْنِ اِحْسَانًا",
        ur: "توحید کے فوراً بعد والدین کے ساتھ احسان، بڑھاپے میں نرم لہجہ، رحمت اور دعا کو مجلس کی بنیادی قرآنی ساخت بنائیں۔",
        en: "Use the sequence from worship of God to kindness, gentleness, mercy, and prayer for parents.",
      },
      {
        ref: "لقمان 31:14",
        arabic: "اَنِ اشْكُرْ لِيْ وَلِوَالِدَيْكَ",
        ur: "شکرِ خدا اور شکرِ والدین کے باہمی تعلق کو واضح کریں۔",
        en: "Connect gratitude to God with gratitude to parents.",
      },
      {
        ref: "الأحقاف 46:15",
        arabic: "رَبِّ اَوْزِعْنِيْ اَنْ اَشْكُرَ نِعْمَتَكَ الَّتِيْ اَنْعَمْتَ عَلَيَّ وَعَلٰى وَالِدَيَّ",
        ur: "بالغ انسان کی دعا میں اپنے ساتھ والدین کی نعمت کو یاد کرنے کا زاویہ لائیں۔",
        en: "Use the mature believer's prayer that remembers blessings upon both self and parents.",
      },
    ],
    sources: [
      {
        labelUr: "امام زین العابدینؑ — رسالۃ الحقوق",
        labelEn: "Imam Ali Zayn al-Abidin — Treatise on Rights",
        detailUr:
          "حقِ مادر اور حقِ پدر: حمل، پرورش، حفاظت، قربانی، اصل و نسبت اور شکر کے بنیادی نکات۔",
        detailEn:
          "Rights of mother and father: pregnancy, nurture, protection, sacrifice, origin, and gratitude.",
      },
      {
        labelUr: "آیت اللہ ابراہیم امینیؒ — اصولِ تربیتِ اولاد",
        labelEn: "Ayatullah Ibrahim Amini — Principles of Upbringing Children",
        detailUr:
          "والدین کے مقام کے ساتھ ان کی تربیتی ذمہ داری اور اولاد کے کردار میں ان کی نیکی کے تسلسل کا زاویہ۔",
        detailEn:
          "Parental responsibility and the continuation of parental formation in the child's character.",
      },
      {
        labelUr: "آیت اللہ محمد محمدی ری شہریؒ — قرآن و سنت میں بچے",
        labelEn: "Ayatullah Muhammad Muhammadi Reyshahri — Children in the Qur'an and Sunnah",
        detailUr:
          "والدین کے ساتھ حسنِ سلوک، شکر، خدمت، دعا اور وفات کے بعد بھی جاری نیکی سے متعلق مرتب روایات۔",
        detailEn:
          "Hadith material on kindness, gratitude, service, prayer, and continuing goodness after parents' death.",
      },
    ],
    anglesUr: [
      "توحید کے بعد والدین کے ساتھ احسان",
      "ماں اور باپ کے الگ الگ حقوق",
      "بڑھاپے میں لہجہ اور عملی خدمت",
      "والدین کی تربیت اولاد میں کیسے زندہ رہتی ہے",
      "وفات کے بعد دعا، استغفار اور صدقہ",
      "برسی کو سالانہ محاسبہ بنانا",
      "والدین کی ایک اچھی صفت کو اپنی زندگی میں جاری رکھنا",
    ],
    anglesEn: [
      "Kindness to parents after tawhid",
      "Distinct rights of mother and father",
      "Speech and service in old age",
      "Parental formation that survives in children",
      "Prayer, forgiveness, and charity after death",
      "Turning remembrance into an annual moral audit",
      "Continuing one parental virtue in one's own life",
    ],
    cautionUr:
      "برسی کو صرف جذباتی یاد یا روایات کی فہرست نہ بنائیں۔ اصل آیات اور معتبر متن سے اصول قائم کریں، پھر سامع کو واضح عملی نتیجے تک لے جائیں۔ وفات کے بعد ثواب پہنچانے سے متعلق وہی اعمال بیان کریں جن کا معتبر دینی ماخذ موجود ہو۔",
    cautionEn:
      "Do not reduce the memorial sermon to emotion or a list of narrations. Establish principles from verified sources and move to concrete action.",
    keywordsUr: [
      "والدین",
      "ماں",
      "باپ",
      "مادر",
      "پدر",
      "حق والدین",
      "بر والدین",
      "برسی",
      "وفات",
      "مرحوم والدین",
      "ایصال ثواب",
      "دعا",
      "استغفار",
      "صدقہ",
      "صلہ رحم",
      "تربیت اولاد",
    ],
    keywordsEn: [
      "parents",
      "mother",
      "father",
      "parental rights",
      "memorial",
      "death anniversary",
      "deceased parents",
      "prayer for parents",
      "charity",
      "kinship",
      "upbringing",
    ],
  },
  {
    id: "quran-hidayat",
    category: "belief",
    titleUr: "قرآن اور ہدایت: کتاب سے زندگی تک",
    titleEn: "Qur'an and guidance: from revelation to lived direction",
    themeUr:
      "قرآن کو صرف تلاوت اور ثواب کی کتاب نہیں بلکہ فکر، فیصلہ، اطاعت، کردار اور اجتماعی زندگی کے لیے زندہ ہدایت کے طور پر پیش کریں؛ پھر یہ واضح کریں کہ قرآن خود رسولؐ کی اطاعت اور معتبر دینی رہنمائی کی طرف رہنمائی کرتا ہے۔",
    themeEn:
      "Present the Qur'an not only as a text of recitation but as living guidance for thought, decision, obedience, character, and communal life; then show that the Qur'an itself directs believers toward obedience to the Messenger and authoritative religious guidance.",
    openingUr:
      "اگر قرآن ہدایت کی کامل کتاب ہے تو سوال یہ ہے: اس ہدایت کو زندگی کے اختلافات، فیصلوں اور عملی مسائل پر نافذ کون سا دینی اصول کرتا ہے؟",
    openingEn:
      "If the Qur'an is complete guidance, what religious principle carries that guidance into concrete disagreements, decisions, and lived problems?",
    quran: [
      {
        ref: "الإسراء 17:9",
        arabic: "اِنَّ هٰذَا الْقُرْاٰنَ يَهْدِيْ لِلَّتِيْ هِيَ اَقْوَمُ",
        ur: "قرآن کو زندہ، قائم اور عملی ہدایت کے طور پر مجلس کی بنیاد بنائیں۔",
        en: "Use the verse to establish the Qur'an as living and upright guidance.",
      },
      {
        ref: "النساء 4:59",
        arabic: "اَطِيْعُوا اللّٰهَ وَاَطِيْعُوا الرَّسُوْلَ",
        ur: "اللہ کی اطاعت اور رسولؐ کی اطاعت کے باہمی تعلق کو واضح کریں۔",
        en: "Clarify the relationship between obedience to God and obedience to the Messenger.",
      },
      {
        ref: "الحشر 59:7",
        arabic: "وَمَا اٰتٰىكُمُ الرَّسُوْلُ فَخُذُوْهُ",
        ur: "دینی زندگی میں رسولؐ کی عملی رہنمائی کی حجیت کے لیے۔",
        en: "Use for the authority of Prophetic guidance in lived religion.",
      },
    ],
    sources: [
      {
        labelUr: "علامہ طالب جوہریؒ — منصبِ ہدایت اور قرآن",
        labelEn: "Allama Talib Johari — Mansab-e-Hidayat aur Qur'an",
        detailUr:
          "اصل اردو کتاب کی نو مجالس اور مجلسِ شامِ غریباں: قرآن، ایمان، اطاعتِ رسولؐ، انسانی فضیلت، آخرت اور منصبِ ہدایت کا تسلسل۔",
        detailEn:
          "Original Urdu book: nine majalis plus Sham-e-Ghariban on Qur'an, faith, obedience to the Messenger, human excellence, the hereafter, and continuity of guidance.",
      },
      {
        labelUr: "اصل قرآنی آیات",
        labelEn: "Primary Qur'anic anchors",
        detailUr:
          "خصوصاً سورۂ اسراء 17:9 کو مرکزی آیت بنائیں، پھر اطاعتِ رسولؐ سے متعلق آیات کو اسی نظامِ ہدایت کے اندر جوڑیں۔",
        detailEn:
          "Use Qur'an 17:9 as the central anchor, then connect verses on obedience to the Messenger within the same architecture of guidance.",
      },
    ],
    anglesUr: [
      "ہدایت اور محض معلومات میں فرق",
      "قرآن اور عملی زندگی",
      "قرآن اور اطاعتِ رسولؐ",
      "ایمان کا کردار میں ظہور",
      "ہدایت اور انسانی فیصلے",
      "معتبر دینی رہنمائی کی ضرورت",
      "کربلا: ہدایت سے وفاداری کا عملی امتحان",
    ],
    anglesEn: [
      "guidance versus information",
      "Qur'an and lived life",
      "Qur'an and obedience to the Messenger",
      "faith manifested in character",
      "guidance and human decisions",
      "the need for authoritative religious guidance",
      "Karbala as the lived test of fidelity to guidance",
    ],
    cautionUr:
      "قرآن کی حجیت اور معتبر دینی رہنمائی کو ایک دوسرے کے مقابل نہ رکھیں۔ طالب جوہریؒ کی اصل ترتیب یہی ہے کہ رسولؐ کی اطاعت اور منصبِ ہدایت کو قرآن کے اندر سے سمجھا جائے۔",
    cautionEn:
      "Do not set Qur'anic authority against authoritative religious guidance. Johari's sequence is to understand obedience to the Messenger and the office of guidance from within the Qur'anic framework itself.",
    keywordsUr: ["قرآن", "ہدایت", "اطاعت رسول", "منصب ہدایت", "ایمان", "اہل بیت", "کربلا"],
    keywordsEn: ["Qur'an", "guidance", "obedience", "religious authority", "faith", "Ahl al-Bayt", "Karbala"],
  },
  {
    id: "ismah",
    category: "belief",
    titleUr: "عصمت: اختیار کے ساتھ پاکیزگی اور الٰہی منصب کی اہلیت",
    titleEn: "Infallibility: moral freedom, purity, and qualification for divine office",
    themeUr: "عصمت کو جبر یا محض 'گناہ دیکھا نہیں گیا' کے معنی میں نہیں، بلکہ شعور و اختیار کے ساتھ ایسی بلند اخلاقی و روحانی اہلیت کے طور پر سمجھیں جو منصبِ الٰہی کے شایان ہو۔",
    themeEn: "Present infallibility neither as compulsion nor as mere absence of observed sin, but as a state of moral and spiritual qualification compatible with awareness and freedom.",
    openingUr: "اگر معصوم گناہ نہیں کرتا تو کیا وہ گناہ کر ہی نہیں سکتا؟ اور اگر اختیار باقی ہے تو عصمت کی قطعی ضمانت کہاں سے آتی ہے؟",
    openingEn: "If the infallible does not sin, does that mean sin is mechanically impossible—and if freedom remains, where does certainty come from?",
    quran: [
      { ref: "آل عمران 3:33", arabic: "اِنَّ اللّٰهَ اصْطَفٰى اٰدَمَ وَنُوْحًا وَّاٰلَ اِبْرٰهِيْمَ وَاٰلَ عِمْرٰنَ عَلَى الْعٰلَمِيْنَ", ur: "اصطفاء کو الٰہی انتخاب اور اہلیت کے باب میں کھولیں۔", en: "Use istifa to discuss divine selection and qualification." },
      { ref: "الأنعام 6:124", arabic: "اَللّٰهُ اَعْلَمُ حَيْثُ يَجْعَلُ رِسَالَتَهٗ", ur: "منصب کو علمِ الٰہی اور حقیقی اہلیت سے جوڑیں۔", en: "Connect divine office with God's knowledge of true qualification." },
      { ref: "البقرة 2:124", arabic: "اِنِّي جَاعِلُكَ لِلنَّاسِ اِمَامًا", ur: "امامت اور اخلاقی اہلیت کے تعلق کے لیے۔", en: "Use for the relationship between Imamate and moral qualification." },
    ],
    sources: [
      { labelUr: "علامہ سید علی نقی نقویؒ — عشرۂ مجالس: عصمت", labelEn: "Sayyid Ali Naqi Naqvi — majalis series on infallibility", detailUr: "صارف فراہم کردہ مکمل اردو تحریری متن: اصطفاء، عصمت و اختیار، ملائکہ و انسانی عصمت، بشریت، ضبطِ نفس اور مراتبِ امامت۔", detailEn: "User-provided full Urdu transcript covering istifa, freedom, angelic vs human infallibility, humanity, self-mastery, and Imamate." },
      { labelUr: "قرآن: 3:33، 6:124، 2:124", labelEn: "Qur'an: 3:33, 6:124, 2:124", detailUr: "اسی سلسلے میں استعمال ہونے والی بنیادی قرآنی آیات۔", detailEn: "Primary Qur'anic anchors used across the series." },
    ],
    anglesUr: ["اصطفاء اور عصمت", "عدم وقوع بمقابلہ عدم امکان", "عصمت اور اختیار", "ملائکہ اور انسانی عصمت", "بشریت اور اسوہ", "ضبط نفس", "نبوت، رسالت اور امامت"],
    anglesEn: ["istifa and infallibility", "non-occurrence vs impossibility", "infallibility and freedom", "angelic vs human infallibility", "humanity and exemplarity", "self-mastery", "prophethood, messengership, and Imamate"],
    cautionUr: "عصمت کے دقیق کلامی مباحث میں اصطلاحات واضح رکھیں؛ 'ناممکن' کو جسمانی بے بسی یا جبر کے معنی میں نہ پیش کریں۔",
    cautionEn: "Keep terminology precise; do not present moral impossibility as physical incapacity or compulsion.",
    keywordsUr: ["عصمت", "معصوم", "اصطفاء", "اختیار", "ملائکہ", "بشریت", "ضبط نفس"],
    keywordsEn: ["infallibility", "ismah", "istifa", "free will", "angels", "humanity", "self-mastery"],
  },
  {
    id: "sabr",
    category: "ethics",
    titleUr: "صبر: برداشت سے آگے، درست موقف پر ثابت قدمی",
    titleEn: "Patience: beyond endurance to principled steadfastness",
    themeUr: "صبر کو خاموش برداشت نہیں بلکہ حق، عبادت، اخلاق اور ذمہ داری پر ثابت قدم رہنے کی قوت کے طور پر پیش کریں۔",
    themeEn: "Present patience not as passive endurance but as the strength to remain steady in truth, worship, ethics, and responsibility.",
    openingUr: "مشکل وقت میں انسان کو صرف برداشت کرنا ہے، یا اپنے اخلاق اور فیصلوں کو بھی بچانا ہے؟",
    openingEn: "In hardship, is the task merely to endure—or to preserve character and right action?",
    quran: [
      { ref: "البقرة 2:153", arabic: "اِنَّ اللّٰهَ مَعَ الصَّابِرِينَ", ur: "صبر کو معیتِ الٰہی اور عملی استقامت سے جوڑیں۔", en: "Connect patience with divine nearness and practical steadfastness." },
      { ref: "آل عمران 3:200", arabic: "اصْبِرُوا وَصَابِرُوا وَرَابِطُوا", ur: "فردی صبر سے اجتماعی استقامت اور ذمہ داری کی طرف بڑھیں۔", en: "Move from personal patience to communal resilience and responsibility." },
    ],
    sources: [
      { labelUr: "نہج البلاغہ — صبر سے متعلق کلمات", labelEn: "Nahj al-Balagha — sayings on patience", detailUr: "صبر، یقین اور عمل کے باہمی تعلق کے لیے اصل عبارت کی جانچ کرکے استعمال کریں۔", detailEn: "Use verified passages to connect patience, certainty, and action." },
      { labelUr: "الکافی — کتاب الایمان والکفر", labelEn: "al-Kafi — Kitab al-Iman wa al-Kufr", detailUr: "صبر، ابتلاء اور ایمان کے ابواب سے روایات منتخب کریں۔", detailEn: "Select narrations from the chapters on patience, trial, and faith." },
    ],
    anglesUr: ["صبر اور بے عملی میں فرق", "مصیبت میں زبان اور فیصلوں کی حفاظت", "صبر اور امید", "صبر کا اجتماعی پہلو"],
    anglesEn: ["Patience versus passivity", "Protecting speech and decisions under pressure", "Patience and hope", "The social dimension of steadfastness"],
    cautionUr: "ہر مصیبت کو کسی مخصوص گناہ کی سزا قرار نہ دیں؛ نصوص میں ابتلاء کے متعدد اسباب اور حکمتیں بیان ہوئی ہیں۔",
    cautionEn: "Do not reduce every hardship to punishment for a specific sin; the sources describe multiple meanings and purposes of trial.",
    keywordsUr: ["صبر", "مصیبت", "ابتلاء", "استقامت", "مشکل", "برداشت"],
    keywordsEn: ["patience", "sabr", "trial", "hardship", "steadfastness"],
  },
  {
    id: "tawhid",
    category: "belief",
    titleUr: "توحید: عقیدہ جو زندگی کے فیصلے بدل دیتا ہے",
    titleEn: "Tawhid: the belief that reshapes life's decisions",
    themeUr: "توحید کو صرف نظری تعریف کے بجائے اعتماد، عبادت، خوف، امید اور اخلاقی آزادی کے عملی مرکز کے طور پر کھولیں۔",
    themeEn: "Develop tawhid as the practical center of trust, worship, fear, hope, and moral freedom—not only a definition.",
    openingUr: "اگر ہم واقعی ایک خدا کو مانتے ہیں تو ہمارے خوف، امید، فیصلے اور وابستگیاں کیسے بدلنی چاہییں؟",
    openingEn: "If we truly believe in one God, how should our fears, hopes, loyalties, and decisions change?",
    quran: [
      { ref: "الاخلاص 112:1", arabic: "قُلْ هُوَ اللّٰهُ اَحَدٌ", ur: "وحدانیت سے آغاز کر کے بندگی اور وابستگی کی یکسوئی تک جائیں۔", en: "Move from divine oneness to unity of worship and loyalty." },
      { ref: "الزمر 39:36", arabic: "اَلَيْسَ اللّٰهُ بِكَافٍ عَبْدَهٗ", ur: "اعتماد علی اللہ اور خوف سے آزادی کے زاویے کے لیے۔", en: "Use for reliance on God and freedom from disabling fear." },
    ],
    sources: [
      { labelUr: "نہج البلاغہ — خطبۂ اول", labelEn: "Nahj al-Balagha — Sermon 1", detailUr: "توحید، معرفت اور تنزیہ کے بنیادی تصورات کے لیے۔", detailEn: "For foundational concepts of divine unity, knowledge, and transcendence." },
      { labelUr: "کتاب التوحید — شیخ صدوق", labelEn: "Kitab al-Tawhid — Shaykh al-Saduq", detailUr: "صفات، تنزیہ اور توحید کے حدیثی ابواب کے لیے۔", detailEn: "For hadith-based discussions of divine attributes and transcendence." },
    ],
    anglesUr: ["توحید اور خوف", "توحید اور رزق", "توحید اور ریا", "توحید اور اخلاقی آزادی"],
    anglesEn: ["Tawhid and fear", "Tawhid and provision", "Tawhid and showing off", "Tawhid and moral freedom"],
    keywordsUr: ["توحید", "خدا", "اللہ", "معرفت", "صفات", "شرک"],
    keywordsEn: ["tawhid", "God", "divine unity", "attributes", "shirk"],
  },
  {
    id: "imamate",
    category: "belief",
    titleUr: "امامت: ہدایت، حجت اور امت کی فکری سمت",
    titleEn: "Imamate: guidance, divine proof, and the community's intellectual direction",
    themeUr: "امامت کو صرف تاریخی جانشینی کے مسئلے تک محدود نہ رکھیں؛ اسے ہدایت، دینی مرجعیت، اخلاقی نمونہ اور حجت کے نظام کے طور پر سمجھائیں۔",
    themeEn: "Do not reduce Imamate to succession alone; present it as guidance, religious authority, moral exemplarity, and divine proof.",
    openingUr: "رسولؐ کے بعد دین کی درست تعبیر اور عملی ہدایت کا قابلِ اعتماد معیار کیا ہے؟",
    openingEn: "After the Prophet, what is the trustworthy standard for interpreting and living the religion?",
    quran: [
      { ref: "البقرة 2:124", arabic: "اِنِّي جَاعِلُكَ لِلنَّاسِ اِمَامًا", ur: "امامت کو الٰہی عہد اور ہدایت کے منصب کے طور پر کھولیں۔", en: "Frame Imamate as a divinely granted covenant of guidance." },
      { ref: "المائدة 5:55", arabic: "اِنَّمَا وَلِيُّكُمُ اللّٰهُ وَرَسُولُهٗ وَالَّذِينَ آمَنُوا", ur: "ولایت کے مفہوم اور دینی وابستگی کے باب میں منتخب امامیہ تفسیر سے استفادہ کریں۔", en: "Use selected Imami tafsir when discussing wilayah and religious allegiance." },
    ],
    sources: [
      { labelUr: "الکافی — کتاب الحجة", labelEn: "al-Kafi — Kitab al-Hujjah", detailUr: "حجت، معرفت امام اور امامت کے حدیثی ابواب۔", detailEn: "Hadith chapters on divine proof, recognition of the Imam, and Imamate." },
      { labelUr: "نہج البلاغہ", labelEn: "Nahj al-Balagha", detailUr: "قیادت، حق، علم اور ذمہ داری سے متعلق منتخب کلمات کو اصل مقام کے ساتھ استعمال کریں۔", detailEn: "Use verified passages on leadership, truth, knowledge, and responsibility." },
    ],
    anglesUr: ["امامت اور دینی علم", "امامت اور اخلاقی نمونہ", "امامت اور امت کی وحدت", "معرفت امام کا عملی تقاضا"],
    anglesEn: ["Imamate and religious knowledge", "Imamate and moral exemplarity", "Imamate and communal unity", "Practical demands of knowing the Imam"],
    keywordsUr: ["امامت", "امام", "ولایت", "حجت", "قیادت", "اہل بیت"],
    keywordsEn: ["imamate", "imam", "wilayah", "hujjah", "leadership", "Ahl al-Bayt"],
  },
  {
    id: "dua",
    category: "spirituality",
    titleUr: "دعا: مانگنے سے آگے، بندگی اور معرفت",
    titleEn: "Dua: beyond asking to servitude and knowledge of God",
    themeUr: "دعا کو صرف حاجت کی فہرست نہیں بلکہ خدا سے تعلق، خود شناسی، توبہ، امید اور تربیت کا مدرسہ بنائیں۔",
    themeEn: "Present dua not as a wish list but as a school of relationship with God, self-knowledge, repentance, hope, and formation.",
    openingUr: "اگر خدا ہماری حاجت جانتا ہے تو دعا کیوں؟",
    openingEn: "If God already knows our needs, why do we pray?",
    quran: [
      { ref: "غافر 40:60", arabic: "اُدْعُونِي اَسْتَجِبْ لَكُمْ", ur: "دعا کو عبادت اور بندگی کے ساتھ جوڑیں۔", en: "Connect supplication with worship and servitude." },
      { ref: "البقرة 2:186", arabic: "فَاِنِّي قَرِيبٌ", ur: "قربِ الٰہی اور دعا کے باطنی پہلو کے لیے۔", en: "Use for divine nearness and the inward dimension of prayer." },
    ],
    sources: [
      { labelUr: "صحیفہ سجادیہ", labelEn: "Sahifa al-Sajjadiyya", detailUr: "دعا کی زبان، اخلاق، معاشرہ اور خودسازی کے لیے بنیادی متن۔", detailEn: "A foundational source for the language of prayer, ethics, society, and self-formation." },
      { labelUr: "الکافی — کتاب الدعاء", labelEn: "al-Kafi — Kitab al-Dua", detailUr: "آداب دعا، امید، اصرار اور قبولیت کے ابواب۔", detailEn: "For narrations on etiquette, hope, persistence, and acceptance of supplication." },
    ],
    anglesUr: ["دعا انسان کو کیسے بدلتی ہے", "قبولیت کے مختلف معنی", "دعا اور عمل", "دعا میں امید اور توبہ"],
    anglesEn: ["How prayer changes the person", "Different meanings of response", "Prayer and action", "Hope and repentance in dua"],
    keywordsUr: ["دعا", "مناجات", "قبولیت", "حاجت", "صحیفہ", "توبہ"],
    keywordsEn: ["dua", "supplication", "prayer", "acceptance", "Sahifa", "repentance"],
  },
  {
    id: "youth",
    category: "society",
    titleUr: "نوجوان: شناخت، مقصد اور دینی ذمہ داری",
    titleEn: "Youth: identity, purpose, and religious responsibility",
    themeUr: "نوجوانوں سے صرف خطرات کی زبان میں نہیں بلکہ مقصد، صلاحیت، سوال، علم اور ذمہ داری کی زبان میں گفتگو کریں۔",
    themeEn: "Speak to young people not only in the language of danger, but of purpose, ability, questions, knowledge, and responsibility.",
    openingUr: "نوجوان کو دین سے جوڑنے کے لیے پہلے اسے کیا دینا ہوگا: حکم، جواب، یا مقصد؟",
    openingEn: "To connect a young person with faith, what comes first: commands, answers, or purpose?",
    quran: [
      { ref: "الكهف 18:13", arabic: "اِنَّهُمْ فِتْيَةٌ آمَنُوا بِرَبِّهِمْ وَزِدْنَاهُمْ هُدًى", ur: "نوجوانی، ایمان اور جراتِ موقف کے لیے۔", en: "Use for youth, faith, and courage of conviction." },
      { ref: "لقمان 31:13", arabic: "يَا بُنَيَّ لَا تُشْرِكْ بِاللّٰهِ", ur: "تربیت میں محبت، مکالمہ اور عقیدے کی بنیاد کے لیے۔", en: "Use for affectionate dialogue and belief-centered formation." },
    ],
    sources: [
      { labelUr: "قرآن میں نوجوان شخصیات", labelEn: "Young figures in the Qur'an", detailUr: "اصحاب کہف، حضرت یوسفؑ، حضرت ابراہیمؑ اور لقمان کی نصیحتوں کو موضوعاتی طور پر دیکھیں۔", detailEn: "Study the Companions of the Cave, Joseph, Abraham, and Luqman's counsel thematically." },
      { labelUr: "اہل بیتؑ کی تربیتی روایات", labelEn: "Ahl al-Bayt narrations on formation", detailUr: "تعلیم، رفاقت، عادت اور عمر کے مراحل سے متعلق روایات کو اصل ماخذ سے جانچیں۔", detailEn: "Verify narrations on education, companionship, habit, and stages of growth in their original sources." },
    ],
    anglesUr: ["شناخت کا بحران", "سوال کرنے کی جگہ", "دوستی اور ماحول", "نوجوان کو ذمہ داری دینا"],
    anglesEn: ["Identity pressure", "Making room for questions", "Friendship and environment", "Giving youth responsibility"],
    keywordsUr: ["نوجوان", "جوان", "تربیت", "شناخت", "تعلیم", "دوستی"],
    keywordsEn: ["youth", "young", "identity", "education", "friends", "formation"],
  },
  {
    id: "family",
    category: "family",
    titleUr: "خاندان: رحمت، ذمہ داری اور گھر کی دینی فضا",
    titleEn: "Family: mercy, responsibility, and the spiritual atmosphere of home",
    themeUr: "خاندان کو محض حقوق کی فہرست نہیں بلکہ رحمت، گفتگو، تربیت، عدل اور مشترک عبادت کا نظام بنائیں۔",
    themeEn: "Present family not merely as a list of rights, but as a system of mercy, conversation, formation, justice, and shared worship.",
    openingUr: "گھر دینی کیسے بنتا ہے: زیادہ نصیحت سے یا بہتر کردار سے؟",
    openingEn: "What makes a home religious: more instruction, or better character?",
    quran: [
      { ref: "الروم 30:21", arabic: "وَجَعَلَ بَيْنَكُمْ مَوَدَّةً وَرَحْمَةً", ur: "ازدواجی زندگی میں مودت و رحمت کو مرکزی اصول بنائیں۔", en: "Make affection and mercy the central principle of married life." },
      { ref: "التحريم 66:6", arabic: "قُوا اَنْفُسَكُمْ وَاَهْلِيكُمْ نَارًا", ur: "تربیت کو خوف کے بجائے ذمہ داری، نمونہ اور ماحول سے جوڑیں۔", en: "Frame family formation through responsibility, example, and environment rather than fear alone." },
    ],
    sources: [
      { labelUr: "الکافی — ابواب معاشرت و نکاح", labelEn: "al-Kafi — chapters on family and social conduct", detailUr: "زوجین، اولاد، حسن خلق اور گھر کے حقوق سے متعلق روایات۔", detailEn: "Narrations on spouses, children, good character, and household rights." },
      { labelUr: "مکارم الاخلاق", labelEn: "Makarim al-Akhlaq", detailUr: "گھریلو اخلاق اور معاشرت کے منتخب ابواب کو اصل عبارت کے ساتھ استعمال کریں۔", detailEn: "Use verified passages on household and social ethics." },
    ],
    anglesUr: ["گھر میں احترام", "والدین اور اولاد کا مکالمہ", "عبادت کا ماحول", "اختلاف میں اخلاق"],
    anglesEn: ["Respect at home", "Parent-child conversation", "A worshipful atmosphere", "Ethics during disagreement"],
    keywordsUr: ["خاندان", "گھر", "ازدواج", "شوہر", "بیوی", "اولاد", "والدین"],
    keywordsEn: ["family", "home", "marriage", "spouse", "children", "parents"],
  },
  {
    id: "ghibah",
    category: "ethics",
    titleUr: "غیبت: زبان کا گناہ اور معاشرے کا زخم",
    titleEn: "Backbiting: a sin of the tongue and a wound in society",
    themeUr: "غیبت کو صرف فردی گناہ نہیں بلکہ اعتماد، عزت اور سماجی رشتوں کو توڑنے والی عادت کے طور پر پیش کریں۔",
    themeEn: "Present backbiting not only as a private sin, but as a habit that destroys trust, dignity, and social bonds.",
    openingUr: "ہم کسی کی غیر موجودگی میں وہ بات کیوں کہتے ہیں جو اس کے سامنے کہنے سے جھجکتے ہیں؟",
    openingEn: "Why do we say in someone's absence what we hesitate to say in their presence?",
    quran: [
      { ref: "الحجرات 49:12", arabic: "وَلَا يَغْتَبْ بَعْضُكُمْ بَعْضًا", ur: "آیت کی تمثیل سے عزتِ انسان اور زبان کی ذمہ داری کھولیں۔", en: "Use the verse's imagery to discuss human dignity and responsibility of speech." },
      { ref: "ق 50:18", arabic: "مَا يَلْفِظُ مِنْ قَوْلٍ اِلَّا لَدَيْهِ رَقِيبٌ عَتِيدٌ", ur: "لفظ کی جواب دہی اور ڈیجیٹل گفتگو تک موضوع کو وسعت دیں۔", en: "Extend accountability for speech to digital communication." },
    ],
    sources: [
      { labelUr: "الکافی — ابواب الغیبة", labelEn: "al-Kafi — chapters on backbiting", detailUr: "غیبت، عیب پوشی اور مومن کی حرمت سے متعلق روایات۔", detailEn: "Narrations on backbiting, concealing faults, and the dignity of believers." },
      { labelUr: "جامع السعادات / معراج السعادة", labelEn: "Jami al-Sa'adat / Mi'raj al-Sa'adah", detailUr: "اخلاقی بیماری، اسباب اور علاج کی منظم بحث کے لیے۔", detailEn: "For structured ethical analysis of causes and remedies." },
    ],
    anglesUr: ["غیبت اور خبر رسانی میں فرق", "سوشل میڈیا کی غیبت", "عیب پوشی", "توبہ اور تلافی"],
    anglesEn: ["Backbiting versus legitimate reporting", "Backbiting on social media", "Concealing faults", "Repentance and repair"],
    keywordsUr: ["غیبت", "زبان", "عیب", "بدگوئی", "سوشل میڈیا"],
    keywordsEn: ["backbiting", "ghibah", "speech", "faults", "social media"],
  },
  {
    id: "death-akhirah",
    category: "akhirah",
    titleUr: "موت اور آخرت: خوف نہیں، بیداری اور تیاری",
    titleEn: "Death and the Hereafter: not panic, but awakening and preparation",
    themeUr: "موت کو مایوسی نہیں بلکہ ترجیحات کی اصلاح، جواب دہی، امید اور عمل کی یاد دہانی بنائیں۔",
    themeEn: "Present death not as despair, but as a reminder to reorder priorities, accept accountability, preserve hope, and act.",
    openingUr: "اگر ہمیں اپنی مدتِ زندگی معلوم نہیں تو ہماری ترجیحات آج کیسے بدلنی چاہییں؟",
    openingEn: "If we do not know the length of our lives, how should that change our priorities today?",
    quran: [
      { ref: "آل عمران 3:185", arabic: "كُلُّ نَفْسٍ ذَائِقَةُ الْمَوْتِ", ur: "موت کی قطعیت اور دنیا کی عارضی حیثیت کے لیے۔", en: "Use for the certainty of death and the temporary nature of worldly life." },
      { ref: "الحشر 59:18", arabic: "وَلْتَنْظُرْ نَفْسٌ مَا قَدَّمَتْ لِغَدٍ", ur: "آخرت کی تیاری کو روزمرہ عمل سے جوڑیں۔", en: "Connect preparation for the Hereafter to daily action." },
    ],
    sources: [
      { labelUr: "نہج البلاغہ — زہد و آخرت کے خطبات", labelEn: "Nahj al-Balagha — sermons on detachment and the Hereafter", detailUr: "دنیا، موت اور جواب دہی کے متعلق اصل عبارات منتخب کریں۔", detailEn: "Select verified passages on worldly life, death, and accountability." },
      { labelUr: "الکافی — کتاب الجنائز و الایمان", labelEn: "al-Kafi — chapters on death and faith", detailUr: "موت، احتضار اور آخرت کی یاد سے متعلق روایات کو موضوعاتی طور پر منتخب کریں۔", detailEn: "Select narrations thematically on death, dying, and remembrance of the Hereafter." },
    ],
    anglesUr: ["موت اور ترجیحات", "حقوق العباد", "توبہ میں تاخیر", "خوف اور امید کا توازن"],
    anglesEn: ["Death and priorities", "Rights of others", "Delaying repentance", "Balancing fear and hope"],
    keywordsUr: ["موت", "آخرت", "قیامت", "قبر", "حساب", "معاد"],
    keywordsEn: ["death", "afterlife", "akhirah", "judgment", "grave", "resurrection"],
  },
  {
    id: "justice",
    category: "society",
    titleUr: "عدل: اپنے خلاف بھی حق کا ساتھ",
    titleEn: "Justice: standing with truth even against oneself",
    themeUr: "عدل کو صرف حکمرانوں سے مطالبہ نہیں بلکہ گھر، تجارت، اختلاف، گواہی اور روزمرہ فیصلوں کی ذاتی ذمہ داری بنائیں۔",
    themeEn: "Present justice not only as a demand from rulers, but as a personal duty in family, trade, disagreement, testimony, and daily decisions.",
    openingUr: "ہم عدل کب چاہتے ہیں: جب فائدہ ہمارے حق میں ہو، یا جب حق ہمارے خلاف بھی جائے؟",
    openingEn: "Do we want justice only when it benefits us—or also when truth goes against us?",
    quran: [
      { ref: "النساء 4:135", arabic: "كُونُوا قَوَّامِينَ بِالْقِسْطِ شُهَدَاءَ لِلّٰهِ وَلَوْ عَلَىٰ اَنْفُسِكُمْ", ur: "عدل کی ذاتی قیمت اور خود احتسابی کے لیے۔", en: "Use for the personal cost of justice and self-accountability." },
      { ref: "المائدة 5:8", arabic: "اعْدِلُوا هُوَ اَقْرَبُ لِلتَّقْوَىٰ", ur: "دشمنی کے باوجود عدل اور تقویٰ کا تعلق۔", en: "Connect justice even toward opponents with taqwa." },
    ],
    sources: [
      { labelUr: "نہج البلاغہ — عہدنامہ مالک اشتر", labelEn: "Nahj al-Balagha — Letter to Malik al-Ashtar", detailUr: "عدل، رعایا، کمزور طبقات اور حکمرانی کے اخلاق کے لیے بنیادی متن۔", detailEn: "A foundational text for justice, public responsibility, vulnerable groups, and governance ethics." },
      { labelUr: "قرآن کی آیاتِ عدل", labelEn: "Qur'anic verses on justice", detailUr: "گواہی، دشمنی، تجارت اور حقوق کے سیاق میں آیات کو جمع کریں۔", detailEn: "Collect verses on testimony, hostility, trade, and rights." },
    ],
    anglesUr: ["اپنے خلاف عدل", "گھر میں عدل", "اختلاف میں عدل", "اختیار کے ساتھ عدل"],
    anglesEn: ["Justice against self-interest", "Justice at home", "Justice in disagreement", "Justice with authority"],
    keywordsUr: ["عدل", "انصاف", "حق", "ظلم", "گواہی"],
    keywordsEn: ["justice", "fairness", "truth", "oppression", "testimony"],
  },
  {
    id: "rizq",
    category: "spirituality",
    titleUr: "رزق: توکل، محنت اور حلال کمائی",
    titleEn: "Provision: trust, effort, and lawful earning",
    themeUr: "رزق کے موضوع کو توکل اور کوشش، قناعت اور ذمہ داری، دعا اور حلال اسباب کے متوازن تعلق کے ساتھ پیش کریں۔",
    themeEn: "Present provision through the balanced relationship of trust and effort, contentment and responsibility, prayer and lawful means.",
    openingUr: "توکل کا مطلب ہاتھ پر ہاتھ رکھنا ہے یا صحیح کوشش کے بعد دل کو خدا کے سپرد کرنا؟",
    openingEn: "Does trust in God mean inactivity, or entrusting the heart to God after responsible effort?",
    quran: [
      { ref: "الطلاق 65:2-3", arabic: "وَمَنْ يَتَوَكَّلْ عَلَى اللّٰهِ فَهُوَ حَسْبُهٗ", ur: "تقویٰ، توکل اور رزق کے تعلق کو سیاق کے ساتھ بیان کریں۔", en: "Discuss taqwa, trust, and provision within the verse's context." },
      { ref: "النجم 53:39", arabic: "وَاَنْ لَيْسَ لِلْاِنْسَانِ اِلَّا مَا سَعَىٰ", ur: "کوشش اور ذمہ داری کے اصول کے لیے۔", en: "Use for the principle of effort and responsibility." },
    ],
    sources: [
      { labelUr: "الکافی — ابواب المعیشة", labelEn: "al-Kafi — chapters on livelihood", detailUr: "حلال کمائی، تجارت، توکل اور معاشی اخلاق کی روایات۔", detailEn: "Narrations on lawful earning, trade, trust, and economic ethics." },
      { labelUr: "نہج البلاغہ — قناعت و دنیا سے متعلق کلمات", labelEn: "Nahj al-Balagha — sayings on contentment and worldly life", detailUr: "قناعت کو سستی نہیں بلکہ حرص سے آزادی کے طور پر واضح کریں۔", detailEn: "Clarify contentment as freedom from greed, not laziness." },
    ],
    anglesUr: ["توکل اور تدبیر", "حلال کمائی", "قناعت اور حرص", "رزق اور عزت نفس"],
    anglesEn: ["Trust and planning", "Lawful earning", "Contentment and greed", "Provision and dignity"],
    keywordsUr: ["رزق", "روزی", "توکل", "حلال", "کاروبار", "قناعت"],
    keywordsEn: ["rizq", "provision", "trust", "halal earning", "work", "contentment"],
  },
];

export const TOPIC_PREPS = TOPICS;

export function searchTopicPreps(query: string, locale: SermonLocale): readonly TopicPrep[] {
  const q = query.trim().toLowerCase();
  if (!q) return TOPICS;
  return TOPICS.filter((topic) => {
    const haystack = locale === "ur"
      ? [topic.titleUr, topic.themeUr, ...topic.keywordsUr].join(" ")
      : [topic.titleEn, topic.themeEn, ...topic.keywordsEn].join(" ");
    return haystack.toLowerCase().includes(q);
  });
}

export function topicTitle(topic: TopicPrep, locale: SermonLocale): string {
  return locale === "ur" ? pureKhateebUrdu(topic.titleUr) : topic.titleEn;
}
