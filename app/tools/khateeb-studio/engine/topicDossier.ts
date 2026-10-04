import type { SermonLocale } from "./sermonPrep";
import { pureKhateebUrdu } from "./urduPurity";
import { PARENTS_BARSI_DOSSIER } from "./parentsBarsiDossier";

export type ScholarPerspective = {
  id: string;
  speakerId?: string;
  nameUr: string;
  nameEn: string;
  sourceTitleUr: string;
  sourceTitleEn: string;
  sourceUrl: string;
  coreUr: string;
  coreEn: string;
  explanationUr: readonly string[];
  explanationEn: readonly string[];
  styleUr: string;
  styleEn: string;
  useUr: string;
  useEn: string;
  readyUr?: readonly {
    heading: string;
    body: string;
  }[];
  readyEn?: readonly {
    heading: string;
    body: string;
  }[];
  sourceGroundedUr?: readonly {
    heading: string;
    explanation: string;
    exactRef: string;
    sourceUrl?: string;
  }[];
  sourceGroundedEn?: readonly {
    heading: string;
    explanation: string;
    exactRef: string;
    sourceUrl?: string;
  }[];
  editorialBridgeUr?: string;
  editorialBridgeEn?: string;
  originalSnippet?: string;
};

export type SermonDossier = {
  topicId: string;
  titleUr: string;
  titleEn: string;
  thesisUr: string;
  thesisEn: string;
  governingQuestionUr: string;
  governingQuestionEn: string;
  primaryTexts?: readonly {
    id: string;
    kind: "quran" | "hadith";
    refUr: string;
    refEn: string;
    arabic?: string;
    sourceArabic?: string;
    sourceArabicMarked?: string;
    quranLocation?: {
      surah: number;
      ayah: number;
    };
    sourceRefUr: string;
    sourceRefEn: string;
    explanationUr: string;
    explanationEn: string;
    sourceUrl?: string;
  }[];
  perspectives: readonly ScholarPerspective[];
  synthesisUr: readonly string[];
  synthesisEn: readonly string[];
  pulpitFlowUr: readonly { heading: string; body: string }[];
  pulpitFlowEn: readonly { heading: string; body: string }[];
  closingUr: string;
  closingEn: string;
};

const SABR: SermonDossier = {
  topicId: "sabr",
  titleUr: "صبر — منبر کے لیے تحقیقی dossier",
  titleEn: "Patience — research dossier for the pulpit",
  thesisUr:
    "صبر محض تکلیف سہنے کا نام نہیں۔ دینی متون اور معاصر خطابت میں اس کے کم از کم تین عملی رخ سامنے آتے ہیں: ردِّعمل پر قابو، نفس کی تربیت، اور ذمہ داری پر ثابت قدمی۔ اچھا منبر ان تینوں کو جوڑ کر دکھاتا ہے کہ صبر انسان کو passive نہیں بلکہ زیادہ بااختیار، زیادہ بااخلاق اور زیادہ درست فیصلہ کرنے والا بناتا ہے۔",
  thesisEn:
    "Patience is not merely enduring pain. In religious teaching and contemporary preaching it has at least three practical faces: control of reaction, training of the self, and steadfastness in responsibility. A strong sermon joins all three and shows that patience makes a person more—not less—capable of moral action.",
  governingQuestionUr:
    "جب انسان کے پاس فوراً ردِّعمل دینے کی طاقت بھی ہو، غصہ بھی ہو اور دلیل بھی—تب وہ کیسے پہچانے کہ اقدام کرنا ہے، خاموش رہنا ہے، یا اپنے نفس کو روک کر صحیح وقت کا انتظار کرنا ہے؟",
  governingQuestionEn:
    "When a person has the power, anger, and even an argument to react immediately, how do they know whether to act, remain silent, or restrain the self until the right moment?",
  primaryTexts: [
    {
      id: "sabr-muslim-three-traits",
      kind: "hadith",
      refUr: "امام صادقؑ — مسلمان کی تین بنیادی صفات",
      refEn: "Imam al-Sadiq — three essential qualities of a Muslim",
      sourceArabicMarked:
        "لا يُصبِحُ المُسلِمُ إلّا عَلى ثَلاثِ خِصالٍ: التَّفَقُّهِ في الدِّينِ، وحُسنِ التَّقديرِ في المَعيشَةِ، والصَّبرِ عَلى النّائِبَةِ.",
      sourceRefUr: "مشکاۃ الانوار، حدیث 1622۔",
      sourceRefEn: "Mishkat al-Anwar, hadith 1622.",
      explanationUr:
        "یہ روایت صبر کو زندگی کے الگ تھلگ گوشے کے بجائے دین فہمی اور درست معاشی تدبیر کے ساتھ ایک بنیادی مسلم صفت کے طور پر رکھتی ہے۔",
      explanationEn:
        "This narration places patience alongside religious understanding and sound management of life.",
      sourceUrl:
        "https://al-islam.org/mishkat-ul-anwar-fi-ghurar-il-akhbar-lamp-niche-best-traditions-abu-ali-al-fadl-ibn-al-hasan-ibn--12",
    },
    {
      id: "sabr-conceal-calamity",
      kind: "hadith",
      refUr: "امام صادقؑ — مصیبت کو وقار کے ساتھ برداشت کرنا",
      refEn: "Imam al-Sadiq — carrying calamity with restraint",
      sourceArabicMarked:
        "كِتمانُ المُصيبَةِ مِن كُنوزِ البِرِّ.",
      sourceRefUr: "مشکاۃ الانوار، حدیث 1623۔",
      sourceRefEn: "Mishkat al-Anwar, hadith 1623.",
      explanationUr:
        "مختصر روایت خطیب کو یہ زاویہ دیتی ہے کہ صبر بعض اوقات دکھ کے انکار کا نام نہیں بلکہ مصیبت کے باوجود وقار اور ضبط قائم رکھنے کا نام ہے۔",
      explanationEn:
        "The concise saying frames patience as preserving dignity and restraint amid hardship.",
      sourceUrl:
        "https://al-islam.org/mishkat-ul-anwar-fi-ghurar-il-akhbar-lamp-niche-best-traditions-abu-ali-al-fadl-ibn-al-hasan-ibn--12",
    },
    {
      id: "sabr-before-reckoning",
      kind: "hadith",
      refUr: "امام صادقؑ — صابرین کا قیامت میں امتیاز",
      refEn: "Imam al-Sadiq — the distinction of the patient on the Day of Resurrection",
      sourceArabicMarked:
        "إنَّ قَوماً يَأتونَ يَومَ القِيامَةِ ... فَيُقالُ لَهُم: بِمَ تَستَحِقّونَ الدُّخولَ إلَى الجَنَّةِ قَبلَ الحِسابِ؟ فَيَقولونَ: كُنّا مِنَ الصّابِرينَ في الدُّنيا.",
      sourceRefUr: "مشکاۃ الانوار، حدیث 1624۔",
      sourceRefEn: "Mishkat al-Anwar, hadith 1624.",
      explanationUr:
        "یہ روایت صبر کو آخرت کے نتیجے سے جوڑتی ہے اور خطیب کو مصیبت کے فوری احساس سے آگے اس کے دائمی اجر کی طرف لے جانے کا موقع دیتی ہے۔",
      explanationEn:
        "This narration connects patience in the world with distinction in the Hereafter.",
      sourceUrl:
        "https://al-islam.org/mishkat-ul-anwar-fi-ghurar-il-akhbar-lamp-niche-best-traditions-abu-ali-al-fadl-ibn-al-hasan-ibn--12",
    },
    {
      id: "sabr-head-of-faith",
      kind: "hadith",
      refUr: "امام صادقؑ — صبر اور ایمان کا رشتہ",
      refEn: "Imam al-Sadiq — patience and faith",
      sourceArabicMarked:
        "الصَّبرُ مِنَ الإيمانِ بِمَنزِلَةِ الرَّأسِ مِنَ الجَسَدِ، فَإذا ذَهَبَ الرَّأسُ ذَهَبَ الجَسَدُ، وكَذلِكَ إذا ذَهَبَ الصَّبرُ ذَهَبَ الإيمانُ.",
      sourceRefUr: "مشکاۃ الانوار، حدیث 1625۔",
      sourceRefEn: "Mishkat al-Anwar, hadith 1625.",
      explanationUr:
        "یہ صبر کی مرکزی حدیث بن سکتی ہے: صبر ایمان کی اضافی خوبی نہیں بلکہ ایمان کو زندہ رکھنے والی بنیادی قوت ہے۔",
      explanationEn:
        "This can serve as a central narration: patience is not an optional ornament but a sustaining condition of faith.",
      sourceUrl:
        "https://al-islam.org/mishkat-ul-anwar-fi-ghurar-il-akhbar-lamp-niche-best-traditions-abu-ali-al-fadl-ibn-al-hasan-ibn--12",
    },
    {
      id: "sabr-istirja-calamity",
      kind: "hadith",
      refUr: "امام باقرؑ — مصیبت، استرجاع اور صبر",
      refEn: "Imam al-Baqir — calamity, istirja, and patience",
      sourceArabicMarked:
        "ما مِن عَبدٍ يُصابُ بِمُصيبَةٍ فَيَستَرجِعُ عِندَ ذِكرِ المُصيبَةِ ويَصبِرُ ... إلّا غَفَرَ اللهُ لَهُ.",
      sourceRefUr: "مشکاۃ الانوار، حدیث 1627۔",
      sourceRefEn: "Mishkat al-Anwar, hadith 1627.",
      explanationUr:
        "یہ روایت مصیبت کے وقت قرآنی استرجاع اور صبر کو جوڑتی ہے؛ مجلس میں اسے جذبات کے انکار کے بجائے ایمان کے ساتھ غم کو سنبھالنے کے طور پر پیش کیا جا سکتا ہے۔",
      explanationEn:
        "This narration connects remembrance of loss, istirja, and patient endurance.",
      sourceUrl:
        "https://al-islam.org/mishkat-ul-anwar-fi-ghurar-il-akhbar-lamp-niche-best-traditions-abu-ali-al-fadl-ibn-al-hasan-ibn--12",
    },
  ],
  perspectives: [
    {
      id: "kashani-hardship-duty",
      speakerId: "hamed-kashani",
      nameUr: "حامد کاشانی",
      nameEn: "Hamed Kashani",
      sourceTitleUr: "سخت حالات میں کیا کرنا چاہیے؟",
      sourceTitleEn: "What should be done in difficult, quasi-war conditions?",
      sourceUrl: "https://www.hkashani.com/?p=26127",
      coreUr:
        "کاشانی صبر کو سب سے پہلے 'ردِّعمل مؤخر کرنے' اور 'اپنی حقیقی ذمہ داری پہچاننے' سے جوڑتے ہیں۔ ان کے ہاں مسئلہ یہ نہیں کہ انسان جذبات نہ رکھے؛ مسئلہ یہ ہے کہ جذبات کو شرعی و اخلاقی ذمہ داری کا نام دے کر فوراً action میں نہ بدل دے۔",
      coreEn:
        "Kashani first connects patience with delaying reaction long enough to identify one's actual duty. The problem is not having emotion; it is turning emotion immediately into action and calling it religious responsibility.",
      explanationUr: [
        "وہ سخت اجتماعی حالات کی مثال لیتے ہیں جہاں لوگ فوری اور شدید ردِّعمل چاہتے ہیں۔ ان کا پہلا سوال یہ ہے: کیا یہ واقعی 'احساسِ تکلیف' ہے یا صرف جذباتی جوش؟ اس فرق سے منبر پر صبر کا ایک اہم مفہوم نکلتا ہے: ہر strong feeling تکلیفِ شرعی نہیں ہوتی۔",
        "وہ بحران میں پہلا دینی عمل تضرع، عبادت اور اپنی کمزوری کے اعتراف کو قرار دیتے ہیں۔ یہ زاویہ صبر کو نفسیاتی suppression نہیں رہنے دیتا؛ صبر پہلے انسان کے ego کو توڑتا ہے، پھر فیصلہ صاف کرتا ہے۔",
        "اس material سے یہ نکتہ لیا جا سکتا ہے کہ صبر کبھی کبھی 'کچھ نہ کرنا' نہیں بلکہ غلط وقت پر غلط کام نہ کرنا ہے۔ انسان اپنے غصے کو روک کر اپنے حقیقی دائرۂ ذمہ داری کو پہچانتا ہے۔",
      ],
      explanationEn: [
        "He uses difficult public conditions in which people demand immediate strong reaction. His first question is whether this is a real sense of duty or emotional excitement. That yields a useful pulpit distinction: not every strong feeling is a religious obligation.",
        "He places supplication, worship, and admission of human weakness before action. Patience therefore becomes more than psychological suppression: it breaks ego first, then clarifies judgment.",
        "The useful sermonic point is that patience is sometimes not 'doing nothing' but refusing to do the wrong thing at the wrong time.",
      ],
      styleUr:
        "انداز: contemporary واقعے سے آغاز، سامع کے فوری جذبات کو challenge کرنا، پھر قرآن/عبادت کی طرف لے جانا، اور آخر میں ذمہ داری کی نئی تعریف۔",
      styleEn:
        "Style: begin with a contemporary situation, challenge the listener's immediate emotional certainty, move to worship/Qur'an, then redefine responsibility.",
      useUr:
        "منبر میں اسے 'صبر = reaction delay for moral clarity' کے باب میں استعمال کریں۔ خاص طور پر غصہ، سوشل میڈیا، اجتماعی بحران اور گھریلو جھگڑے کے contemporary examples کے ساتھ۔",
      useEn:
        "Use this under the idea 'patience = delaying reaction for moral clarity,' especially with anger, social media, public crises, and family conflict.",
      originalSnippet: "اول باید تضرّع کنیم.",
    },
    {
      id: "panahian-parenting",
      speakerId: "alireza-panahian",
      nameUr: "علیرضا پناہیان",
      nameEn: "Alireza Panahian",
      sourceTitleUr: "تربیتِ فرزند میں صبر کی جگہ",
      sourceTitleEn: "The place of patience in raising children",
      sourceUrl: "https://www.youtube.com/watch?v=6vI3qYhWLX0",
      coreUr:
        "پناہیان صبر کو تربیتِ اولاد کے بنیادی اخلاق میں رکھتے ہیں۔ ان کا زور نصیحت سے زیادہ 'دیکھے جانے والے ضبطِ نفس' پر ہے: بچہ والدین کے لیکچر سے کم اور اس بات سے زیادہ سیکھتا ہے کہ مشکل، غصے اور تھکن میں ماں باپ اپنے آپ کو کیسے سنبھالتے ہیں۔",
      coreEn:
        "Panahian places patience among the foundational virtues of parenting. His emphasis is less on instruction and more on visible self-restraint: children learn not only from lectures but from watching how parents handle pressure, anger, and fatigue.",
      explanationUr: [
        "اس سلسلے میں صبر صرف بچے کی شرارت برداشت کرنے کا نام نہیں؛ والدین کی شخصیت میں ایسی capacity پیدا کرنا ہے کہ مشکل میں ان کی زبان، لہجہ اور رویہ بکھر نہ جائے۔",
        "اس زاویے کا ایک اہم تربیتی اصول یہ ہے کہ بچے کو 'صبر کرو' کہنا کم مؤثر ہے اگر وہ بڑوں کو خود بے صبری، چیخ، تحقیر یا فوری غصے میں دیکھ رہا ہو۔ صبر یہاں transferable character بنتا ہے۔",
        "پناہیان کے family framing سے خطیب صبر کو abstract اخلاقی فضیلت سے نکال کر گھر کے dining table، homework، مالی دباؤ، زوجین کے اختلاف اور بچوں کی غلطیوں تک لا سکتا ہے۔",
      ],
      explanationEn: [
        "Here patience is not merely tolerating a child's misbehavior; it is building enough inner capacity that a parent's speech and conduct do not collapse under stress.",
        "A key formation principle follows: telling a child to be patient has little force if adults model impatience, shouting, humiliation, and instant anger. Patience becomes a transferable character trait.",
        "This family framing lets a preacher move patience out of abstraction and into meals, homework, financial stress, marital disagreement, and children's mistakes.",
      ],
      styleUr:
        "انداز: روزمرہ گھر سے مثال، تربیت کے عام مفروضے کو الٹ دینا، پھر بہت concrete behavioral advice دینا۔",
      styleEn:
        "Style: start from ordinary family life, overturn a common assumption about formation, then give concrete behavioral advice.",
      useUr:
        "منبر کے وسط میں 'آپ کا صبر آپ کے بچوں کی تربیت ہے' کے عنوان سے 5–7 منٹ کا practical segment بن سکتا ہے۔",
      useEn:
        "This can become a five-to-seven-minute practical segment: 'Your patience is part of your child's formation.'",
      originalSnippet: "مهمترین کار خوب مؤثر برای تربیت فرزندان، صبر است.",
    },
    {
      id: "shojaei-training-patience",
      speakerId: "shojaei",
      nameUr: "محمد شجاعی",
      nameEn: "Mohammad Shojaei",
      sourceTitleUr: "تمارینِ صبر",
      sourceTitleEn: "Exercises in patience",
      sourceUrl: "https://t.me/s/ostad_shojae?q=%23%D8%AA%D9%85%D8%A7%D8%B1%DB%8C%D9%86_%D8%B5%D8%A8%D8%B1",
      coreUr:
        "شجاعی صبر کو ایک trainable skill کے طور پر پیش کرتے ہیں۔ ان کے material میں patience کوئی vague نصیحت نہیں بلکہ باقاعدہ practice ہے: تحمل اختیار کرنا، خواہشِ نفس کے خلاف کھڑا ہونا، خاموشی کی مشق، اختلاف برداشت کرنا، اور خود شناسی و خلوت کے ذریعے inner energy پیدا کرنا۔",
      coreEn:
        "Shojaei presents patience as a trainable skill. In his material it is not vague advice but deliberate practice: adopting forbearance, resisting impulse, practicing silence, tolerating difference, and building inner energy through self-knowledge and solitude with God.",
      explanationUr: [
        "ان کا ایک بنیادی تربیتی نکتہ یہ ہے کہ اگر حلم فطری طور پر نہیں آتا تو انسان 'تحلم' کرے—یعنی اپنے ظاہر اور ردِّعمل کو دانستہ طور پر صبر کی شکل دے، یہاں تک کہ practice رفتہ رفتہ character بن جائے۔",
        "وہ خواہشات کے مقابل کھڑے ہونے کو patience training کا زیادہ گہرا مرحلہ کہتے ہیں۔ آدمی ہر خواہش پوری نہ کر کے نفس کو یہ سکھاتا ہے کہ اختیار کس کے ہاتھ میں ہے۔",
        "خاموشی بھی ان کے ہاں صبر کی exercise ہے: ہر بات کا فوراً جواب نہ دینا، ذہنی و زبانی تحریک کم کرنا، اور اختلاف کو دشمنی کے بجائے تربیت کا میدان سمجھنا۔",
        "یہ approach خطیب کو 'صبر کیسے پیدا کریں؟' کے سوال کا عملی جواب دیتی ہے: صبر وعظ سے کم، repeated micro-practices سے زیادہ بنتا ہے۔",
      ],
      explanationEn: [
        "A basic training point is tahallum: if forbearance does not come naturally, deliberately perform the outward discipline of forbearance until repeated practice begins shaping character.",
        "He treats resisting desires as a deeper patience exercise. By not satisfying every impulse, a person trains the self to learn who is actually in control.",
        "Silence is another exercise: not answering everything immediately, reducing verbal and mental reactivity, and treating disagreement as a training field rather than an enemy.",
        "This gives the preacher a practical answer to 'How is patience acquired?': less by exhortation alone, more by repeated micro-practices.",
      ],
      styleUr:
        "انداز: اخلاق کو 'exercise' میں بدلنا؛ چھوٹے، یاد رہنے والے steps؛ نفس اور شیطان کے ساتھ داخلی struggle کی زبان۔",
      styleEn:
        "Style: turn ethics into exercises; use short memorable steps; frame the struggle as internal training against impulse and temptation.",
      useUr:
        "منبر کے آخری حصے میں سامع کو تین homework دیں: جواب میں تاخیر، ایک خواہش intentionally چھوڑنا، اور روزانہ مختصر silence/خلوت۔",
      useEn:
        "End the sermon with three pieces of homework: delay one reaction, intentionally refuse one impulse, and practice a short period of silence/solitude each day.",
      originalSnippet: "اگر حلیم نیستی، خودتو به حلم بزن.",
    },
  ],
  synthesisUr: [
    "تینوں approaches کو جوڑیں تو صبر کی مکمل تصویر بنتی ہے: کاشانی decision-making کو درست کرتے ہیں، پناہیان relational modeling دکھاتے ہیں، اور شجاعی skill-building کا طریقہ دیتے ہیں۔",
    "اس طرح خطبہ محض 'صبر اچھا ہے' نہیں رہتا۔ سامع کو معلوم ہوتا ہے کہ صبر کب درکار ہے، گھر میں کیسا دکھائی دیتا ہے، اور اسے develop کیسے کیا جاتا ہے۔",
    "قرآن کی «اِنَّ اللّٰهَ مَعَ الصَّابِرِينَ» کو اس synthesis کے بعد پڑھیں: معیتِ الٰہی اس انسان کے ساتھ ہے جو مشکل میں اخلاقی agency کھوتا نہیں بلکہ اسے disciplined بناتا ہے۔",
  ],
  synthesisEn: [
    "Taken together, the three approaches form a fuller picture: Kashani sharpens decision-making, Panahian shows relational modeling, and Shojaei supplies skill-building.",
    "The sermon therefore moves beyond 'patience is good.' The listener learns when patience is needed, what it looks like at home, and how it is developed.",
    "Read 'Indeed God is with the patient' after this synthesis: divine companionship is with the person who does not lose moral agency under pressure but disciplines it.",
  ],
  pulpitFlowUr: [
    {
      heading: "1. صبر کو غلط نہ سمجھیں",
      body: "ابتدا ایک حقیقی سوال سے کریں: ہم میں سے اکثر صبر کو مجبور آدمی کی بے بسی سمجھتے ہیں۔ لیکن اگر صبر صرف کچھ نہ کرنا ہوتا تو قرآن اسے قوت، معیتِ الٰہی اور کامیابی کے ساتھ نہ جوڑتا۔ اصل مسئلہ یہ ہے کہ مشکل لمحے میں آپ کے اندر کون حکومت کرتا ہے—عقل و ایمان یا فوری impulse؟",
    },
    {
      heading: "2. پہلا میدان: فوراً ردِّعمل نہ دینا",
      body: "کاشانی کے زاویے سے دکھائیں کہ ہر strong emotion 'تکلیف' نہیں۔ غصہ آتے ہی message، فیصلہ، الزام یا confrontation شروع کر دینا اکثر قوت نہیں بلکہ اپنے نفس کے ہاتھوں controlled ہونا ہے۔ صبر کا پہلا قدم reaction اور action کے درمیان ایک اخلاقی وقفہ پیدا کرنا ہے۔",
    },
    {
      heading: "3. دوسرا میدان: گھر میں صبر دکھائی دینا چاہیے",
      body: "پناہیان کے family angle سے سامع کو گھر لے آئیں۔ بچہ یہ نہیں دیکھتا کہ والد نے صبر پر کتنی تقریر سنی؛ وہ دیکھتا ہے کہ بجلی جانے، پیسے کم ہونے، homework خراب ہونے یا شریکِ حیات کی غلطی پر گھر کے بڑوں کی زبان کیا کرتی ہے۔ صبر نسل در نسل lecture سے نہیں، model سے منتقل ہوتا ہے۔",
    },
    {
      heading: "4. تیسرا میدان: صبر کی باقاعدہ training",
      body: "شجاعی کے exercises سے practical حصہ بنائیں: ہر جواب فوراً نہ دیں؛ کبھی اپنی جائز خواہش کو بھی delay کریں؛ اختلاف میں سامنے والے کو مکمل سنیں؛ روزانہ چند منٹ زبان و ذہن کو خاموش کریں۔ نفس کو بار بار یہ تجربہ دیں کہ ہر خواہش command نہیں ہے۔",
    },
    {
      heading: "5. صبر کا حاصل: انسان زیادہ فعال ہوتا ہے",
      body: "نتیجہ یہ نکالیں کہ صبر انسان کو passive نہیں کرتا۔ بے صبری انسان کو stimulus کا غلام بناتی ہے؛ صبر اسے choose کرنے کی طاقت دیتا ہے۔ اب وہ غصے میں بھی عدل کر سکتا ہے، مصیبت میں بھی عبادت، اختلاف میں بھی اخلاق، اور انتظار میں بھی ذمہ داری۔",
    },
  ],
  pulpitFlowEn: [
    { heading: "1. Correct the definition", body: "Begin by challenging the idea that patience is helplessness. The key question is who governs the difficult moment: faith and reason, or immediate impulse?" },
    { heading: "2. First field: delay reaction", body: "Use Kashani's lens: not every strong feeling is a duty. Patience creates a moral interval between reaction and action." },
    { heading: "3. Second field: patience must be visible at home", body: "Use Panahian's family lens: children absorb how adults behave under stress more deeply than what adults preach about patience." },
    { heading: "4. Third field: train patience", body: "Use Shojaei's exercises: delay an answer, refuse an impulse, listen through disagreement, and practice silence. Not every desire is a command." },
    { heading: "5. Result: greater agency", body: "Patience is not passivity. Impatience makes a person a slave of stimulus; patience restores the power to choose moral action." },
  ],
  closingUr:
    "سامع کو ایک ہفتے کا challenge دیں: جب بھی غصہ یا بے چینی آئے، فوراً جواب دینے سے پہلے ایک مختصر توقف، ایک دعا یا ذکر، اور پھر یہ سوال—'میرا نفس کیا چاہتا ہے، اور میری ذمہ داری کیا ہے؟' اگر صرف یہ ایک عادت بن جائے تو صبر abstract فضیلت نہیں رہے گا؛ زندگی کی operating skill بن جائے گا۔",
  closingEn:
    "Give the audience a one-week challenge: whenever anger or anxiety rises, pause before answering, make a brief prayer or remembrance, then ask: 'What does my impulse want, and what is my responsibility?' That turns patience from an abstract virtue into an operating skill for life.",
};

const IMAMATE: SermonDossier = {
  topicId: "imamate",
  titleUr: "امامت — ہدایت، حجت اور زندہ دینی مرجعیت",
  titleEn: "Imamate — guidance, divine proof, and living religious authority",
  thesisUr:
    "امامت کو صرف یہ سوال بنا دینا کہ رسول اکرمؐ کے بعد سیاسی جانشین کون تھا، اس پورے عقیدے کو بہت محدود کر دیتا ہے۔ امامیہ علمی روایت میں امام ایک ایسی الٰہی حجت ہے جو دین کی معتبر تعبیر، علمی حفاظت، اخلاقی نمونہ، روحانی تربیت اور اجتماعی ہدایت کو ایک مرکز میں جمع کرتی ہے۔ اسی لیے معرفتِ امام کا مطلب صرف نام اور نسب جان لینا نہیں، بلکہ یہ سمجھنا ہے کہ دین کو کس علمی و اخلاقی معیار سے پڑھنا اور جینا ہے۔",
  thesisEn:
    "Reducing Imamate to the question of political succession after the Prophet severely narrows the doctrine. In Imami thought, the Imam is a divinely grounded authority who gathers reliable interpretation of religion, preservation of knowledge, moral exemplarity, spiritual formation, and communal guidance into one center. Knowing the Imam therefore means more than knowing a name or genealogy; it means knowing the authoritative intellectual and moral measure by which religion is understood and lived.",
  governingQuestionUr:
    "اگر وحی ختم ہو گئی، مگر انسان کی دینی تعبیر، اخلاقی تربیت، اجتماعی اختلاف اور صحیح رہنمائی کی ضرورت ختم نہیں ہوئی، تو نبوت کے بعد اس ہدایت کا معتبر معیار کیا ہوگا؟",
  governingQuestionEn:
    "If revelation has ended but the need for reliable interpretation, moral formation, communal judgment, and guidance has not ended, what becomes the authoritative measure of guidance after prophethood?",
  primaryTexts: [
    {
      id: "imamate-system-community",
      kind: "hadith",
      refUr: "امیرالمومنینؑ — امامت امت کا نظام",
      refEn: "Imam Ali — Imamate as the order of the community",
      sourceArabicMarked: "الإمامَةُ نِظامُ الاُمَّةِ.",
      sourceRefUr: "غرر الحکم، ح1095۔",
      sourceRefEn: "Ghurar al-Hikam, no. 1095.",
      explanationUr: "یہ مختصر روایت امامت کو صرف شخصی فضیلت نہیں بلکہ امت کے دینی و اجتماعی نظم کے طور پر سامنے لاتی ہے۔",
      explanationEn: "This concise saying presents Imamate as an ordering principle for the religious community.",
      sourceUrl: "https://al-islam.org/mizan-al-hikmah-scale-wisdom/leadership-imama",
    },
    {
      id: "imamate-five-pillars-wilayah",
      kind: "hadith",
      refUr: "امام باقرؑ — اسلام کی پانچ بنیادیں اور ولایت",
      refEn: "Imam al-Baqir — the five foundations and wilayah",
      sourceArabicMarked: "بُنِيَ الإسلامُ على خَمْسٍ: عَلى الصَّلاةِ، والزَّكاةِ، والصَّومِ، والحَجِّ، والوَلايةِ، ولَمْ يُنادَ بِشَيْءٍ كَما نُودِيَ بالوَلايةِ.",
      sourceRefUr: "الکافی، ج3، ص18، ح2۔",
      sourceRefEn: "al-Kafi, vol.3, p.18, hadith 2.",
      explanationUr: "یہ روایت ولایت کو عبادات سے الگ حاشیائی عنوان نہیں بلکہ اسلامی ساخت کے بنیادی اجزاء میں رکھتی ہے۔",
      explanationEn: "The narration places wilayah among the foundational structures of Islamic life.",
      sourceUrl: "https://al-islam.org/mizan-al-hikmah-scale-wisdom/leadership-imama",
    },
    {
      id: "imamate-ibrahim-rank",
      kind: "hadith",
      refUr: "امام صادقؑ — حضرت ابراہیمؑ اور منصبِ امامت",
      refEn: "Imam al-Sadiq — Abraham and the rank of Imamate",
      sourceArabicMarked: "إنَّ اللهَ تباركَ وتعالى اتَّخَذَ إبراهيمَ عَبداً قَبلَ أن يَتَّخِذَهُ نَبِيّاً ... واتَّخَذَهُ خَليلاً قَبلَ أن يَجعَلَهُ إماماً ... قالَ: إنّي جاعِلُكَ لِلنّاسِ إماماً.",
      sourceRefUr: "الکافی، ج1، ص175، ح2۔",
      sourceRefEn: "al-Kafi, vol.1, p.175, hadith 2.",
      explanationUr: "یہ روایت حضرت ابراہیمؑ کی مثال سے امامت کو ایک ممتاز الٰہی منصب کے طور پر کھولتی ہے اور آیت 2:124 کی منبری توضیح کے لیے مضبوط بنیاد دیتی ہے۔",
      explanationEn: "This narration uses Abraham's progression to explain Imamate as a distinct divinely granted office.",
      sourceUrl: "https://al-islam.org/mizan-al-hikmah-scale-wisdom/leadership-imama",
    },
    {
      id: "imamate-earth-never-empty",
      kind: "hadith",
      refUr: "امام صادقؑ — زمین امام سے خالی نہیں رہتی",
      refEn: "Imam al-Sadiq — the earth is not left without an Imam",
      sourceArabicMarked: "إنَّ الأرضَ لا تَخْلو إلّا وَفيها إمامٌ، كَيما إن زادَ المؤمنونَ شيئاً رَدَّهُم، وإن نَقَصوا شيئاً أتَمَّهُ لَهُم.",
      sourceRefUr: "امامت و حجت کے باب میں منقول؛ میزان الحکمہ، ذیلِ امامت۔",
      sourceRefEn: "Cited in Mizan al-Hikmah under the necessity of the Imam.",
      explanationUr: "یہ روایت امامت کو تاریخی واقعے کے بجائے ہدایت کے مسلسل نظام کے طور پر سمجھانے میں مدد دیتی ہے۔",
      explanationEn: "The narration frames Imamate as a continuing structure of guidance rather than a one-time historical event.",
      sourceUrl: "https://al-islam.org/mizan-al-hikmah-scale-wisdom/leadership-imama",
    },
    {
      id: "imamate-know-your-imam",
      kind: "hadith",
      refUr: "رسول اکرمؐ — معرفتِ امام کی اہمیت",
      refEn: "The Prophet — the importance of knowing one's Imam",
      sourceArabicMarked: "مَن ماتَ وهُوَ لا يَعرِفُ إمامَهُ ماتَ مِيتَةً جاهِلِيَّةً.",
      sourceRefUr: "بحار الانوار، ج23، ص76، ح1۔",
      sourceRefEn: "Bihar al-Anwar, vol.23, p.76, hadith 1.",
      explanationUr: "یہ روایت معرفتِ امام کو محض تاریخی معلومات سے بلند کرکے دینی شناخت اور ہدایت کے بنیادی سوال سے جوڑتی ہے۔",
      explanationEn: "This narration places recognition of the Imam at the heart of religious orientation.",
      sourceUrl: "https://al-islam.org/mizan-al-hikmah-scale-wisdom/leadership-imama",
    },
  ],
  perspectives: [
    {
      id: "kashani-imamate-method",
      speakerId: "hamed-kashani",
      nameUr: "حامد کاشانی",
      nameEn: "Hamed Kashani",
      sourceTitleUr: "درآمدی بر امامت پژوهی با محوریت منهج صاحب عبقات",
      sourceTitleEn: "Introduction to Imamate research through the method of Abaqat al-Anwar",
      sourceUrl: "https://www.hkashani.com/?p=22660",
      coreUr:
        "کاشانی کا سب سے مفید اضافہ یہ ہے کہ وہ 'امامت' کو ایک مبہم جذباتی عنوان نہیں رہنے دیتے بلکہ اس کے مطالعے کی مختلف سطحیں الگ کرتے ہیں: پہلے یہ واضح کریں کہ امامت کیا ہے اور امام کی صفات کیا ہیں؛ پھر یہ دیکھیں کہ یہ اوصاف کس شخصیت پر منطبق ہوتے ہیں؛ اور اس کے بعد تاریخی و حدیثی دلائل کی سند، دلالت اور مخالف علمی روایت کے ساتھ تقابلی جانچ کی جائے۔",
      coreEn:
        "Kashani's most useful contribution is methodological: he refuses to leave Imamate as a vague devotional slogan. He separates explanatory study of what Imamate is and what qualities an Imam has from comparative study of whom those qualities apply to, followed by rigorous examination of hadith evidence, meaning, transmission, and competing scholarly readings.",
      explanationUr: [
        "وہ امامتِ تبیینی اور امامتِ تطبیقی میں فرق کرتے ہیں۔ منبر کے لیے یہ فرق بہت اہم ہے: پہلے سامع کو یہ سمجھایا جائے کہ 'امام' کس منصب کا نام ہے؛ اس کے بعد شخصیات اور تاریخی نصوص پر گفتگو کی جائے۔ اگر ترتیب الٹ دی جائے تو مجلس فوراً شخصی مناظرے میں چلی جاتی ہے اور اصل عقیدہ واضح نہیں ہوتا۔",
        "ان کا عبقات الانوار پر زور ایک اور منبری سبق دیتا ہے: مضبوط استدلال صرف روایت نقل کرنے سے نہیں بنتا؛ روایت کی سند، مختلف طرق، الفاظ کے معنی، تاریخی استعمال، اور مخاطب کے علمی مبانی کو سمجھنا بھی ضروری ہے۔",
        "کاشانی کی approach خطیب کو یہ سکھاتی ہے کہ امامت پر گفتگو میں پہلے framework بنائیں، پھر evidence رکھیں۔ اس سے موضوع جذباتی دفاع کے بجائے علمی confidence کے ساتھ کھلتا ہے۔",
      ],
      explanationEn: [
        "He distinguishes explanatory Imamate—what the office is and what qualities define it—from applied/comparative Imamate—who fulfills those qualities. For preaching, this order matters: define the office before moving into personalities and historical proof.",
        "His emphasis on Abaqat al-Anwar teaches a second lesson: strong argument is not produced by quoting a report alone. Transmission routes, wording, semantic force, historical use, and the assumptions of the audience all matter.",
        "This approach teaches the preacher to build a framework first and then place evidence inside it, replacing defensive polemic with intellectual confidence.",
      ],
      styleUr:
        "انداز: پہلے مسئلے کی taxonomy، پھر methodological caution، پھر source criticism۔ جذباتی نعرے کے بجائے علمی نقشہ بنا کر سامع کو ساتھ لے جانا۔",
      styleEn:
        "Style: begin with taxonomy, add methodological caution, then move into source criticism. Build an intellectual map before argument.",
      useUr:
        "منبر کے آغاز میں یہی ترتیب اختیار کریں: 'آج ہم پہلے یہ نہیں پوچھیں گے کہ امام کون ہے؛ پہلے یہ پوچھیں گے کہ امامت ہے کیا؟' یہی ایک جملہ پورے موضوع کی سطح بلند کر دیتا ہے۔",
      useEn:
        "Open with: 'Before asking who the Imam is, we first need to ask what Imamate actually is.' That single move raises the level of the entire discussion.",
      originalSnippet: "یک حالت هم امامتِ تبیینی است.",
    },
    {
      id: "tabatabai-three-dimensions",
      nameUr: "علامہ سید محمد حسین طباطبائیؒ",
      nameEn: "Allamah Sayyid Muhammad Husayn Tabataba'i",
      sourceTitleUr: "اسلامی تعلیمات میں امامت",
      sourceTitleEn: "Imamah in Islamic Teachings in Brief",
      sourceUrl: "https://al-islam.org/islamic-teachings-brief-sayyid-muhammad-husayn-tabatabai/imamah",
      coreUr:
        "علامہ طباطبائی امامت کو صرف حکومت نہیں سمجھتے بلکہ دینی و اجتماعی امور کی ولایت اور حفاظت کے طور پر پیش کرتے ہیں۔ ان کے وسیع تر بیان میں امامت کے تین پہلو واضح ہوتے ہیں: اسلامی معاشرے کی قیادت، دین کے علوم و احکام کی معتبر حفاظت و توضیح، اور انسان کی روحانی ہدایت۔",
      coreEn:
        "Tabataba'i does not reduce Imamate to government. He presents it as guardianship of religious and social affairs; in his broader formulation, Imamate carries three dimensions: leadership of the Muslim community, preservation and authoritative exposition of religious knowledge and law, and spiritual guidance.",
      explanationUr: [
        "یہ framework منبر کے لیے نہایت قیمتی ہے کیونکہ اس سے 'امام' محض ایک تاریخی حکمران یا فقہی reference نہیں رہتا۔ امام کا منصب simultaneously society، knowledge اور spiritual formation تینوں سے متعلق ہو جاتا ہے۔",
        "علامہ کی reasoning نبوت کے مقصد سے شروع ہوتی ہے: اگر دین انسان کو کمال کی طرف ہدایت دینے آیا ہے تو پیغمبرؐ کی وفات کے بعد دین کی حفاظت، صحیح تعبیر اور انسان کی مسلسل رہنمائی کا مسئلہ باقی رہتا ہے۔ امامت اسی continuity کا ادارہ ہے، نئی نبوت نہیں۔",
        "اس زاویے سے حدیثِ ثقلین، قرآن و اہل بیتؑ کی باہمی نسبت، اور اہل بیتؑ کی علمی مرجعیت کو ایک coherent structure میں سمجھایا جا سکتا ہے: قرآن متن ہے، مگر متن کی معصوم نبوی توضیح اور زندہ نمونہ بھی امت کی ضرورت ہے۔",
      ],
      explanationEn: [
        "This framework is valuable for preaching because the Imam is no longer merely a historical ruler or a legal reference. The office touches society, knowledge, and spiritual formation at once.",
        "Tabataba'i's reasoning begins from the purpose of prophethood: if religion guides human beings toward perfection, the Prophet's death does not remove the need to preserve, interpret, and embody that guidance. Imamate continues that function without becoming new prophethood.",
        "This makes it easier to present the relationship of Qur'an and Ahl al-Bayt coherently: revelation remains the text, while authoritative Prophetic interpretation and embodied guidance remain necessary for the community.",
      ],
      styleUr:
        "انداز: فلسفی مگر سادہ structural reasoning۔ فردی تاریخی واقعات سے پہلے 'دین کو survive اور guide کرنے کے لیے کن functions کی ضرورت ہے؟' والا سوال۔",
      styleEn:
        "Style: structural reasoning before historical detail. Ask what functions religion still needs in order to preserve and guide.",
      useUr:
        "تین لفظ یاد رکھیں: **قیادت، علم، تربیت**۔ انہی تین headings پر 8–10 منٹ کی مضبوط علمی گفتگو بن سکتی ہے۔",
      useEn:
        "Remember three words: **leadership, knowledge, formation**. They can carry an eight-to-ten-minute scholarly segment.",
    },
    {
      id: "mutahhari-guidance-leadership",
      nameUr: "شہید مرتضیٰ مطہریؒ",
      nameEn: "Ayatullah Murtadha Mutahhari",
      sourceTitleUr: "امامت اور قیادت",
      sourceTitleEn: "Imamah and Leadership",
      sourceUrl: "https://al-islam.org/imamah-and-khilafah-murtadha-mutahhari/imamah-leadership",
      coreUr:
        "مطہری 'ہدایت' اور 'قیادت' کے فرق سے امامت کو بہت مؤثر انداز میں کھولتے ہیں۔ ہدایت راستہ دکھاتی ہے؛ قیادت انسان اور معاشرے کی موجود صلاحیتوں کو حرکت دیتی، منظم کرتی اور مقصد تک پہنچانے کے لیے mobilize کرتی ہے۔ اس طرح امام صرف teacher نہیں بلکہ transformative leader بنتا ہے۔",
      coreEn:
        "Mutahhari opens Imamate through the distinction between guidance and leadership. Guidance shows the road; leadership mobilizes and organizes the latent capacities of persons and society so they can actually move toward the goal. The Imam is therefore not only a teacher but a transformative leader.",
      explanationUr: [
        "یہ فرق منبر پر بہت طاقتور ہے: کسی کو راستہ معلوم ہونا اور کسی کا اس راستے پر چل پڑنا دو الگ چیزیں ہیں۔ کتاب direction دے سکتی ہے، مگر leadership انسان کے خوف، کمزوری، انتشار اور dormant potential سے deal کرتی ہے۔",
        "مطہری leadership کو انسان کی hidden capacities کو unfold کرنے سے جوڑتے ہیں۔ اس زاویے سے امام کی سیرت محض historical admiration نہیں رہتی؛ وہ یہ سوال بن جاتی ہے کہ امام علیؑ نے افراد اور معاشرے میں کون سی صلاحیتیں جگائیں؟ امام حسینؑ نے ضمیر کو کیسے mobilize کیا؟",
        "اسی framework سے یہ بھی سمجھایا جا سکتا ہے کہ امامت کا تعلق صرف اقتدار سے نہیں۔ ممکن ہے امام ظاہری حکومت میں نہ ہو، مگر علمی، اخلاقی اور روحانی leadership پھر بھی جاری رہے۔",
      ],
      explanationEn: [
        "This distinction is powerful on the pulpit: knowing the road and actually moving on it are different. A text can give direction, but leadership engages fear, weakness, fragmentation, and dormant human potential.",
        "Mutahhari links leadership to unfolding hidden capacities. The lives of the Imams can therefore be read not as historical admiration alone but as questions of transformation: what capacities did Imam Ali awaken, and how did Imam Husayn mobilize conscience?",
        "This also clarifies why Imamate is not exhausted by political office. An Imam may be denied government while intellectual, moral, and spiritual leadership continues.",
      ],
      styleUr:
        "انداز: abstract concept کو everyday distinction سے واضح کرنا، پھر اسے history اور human psychology پر apply کرنا۔",
      styleEn:
        "Style: clarify an abstract doctrine through an everyday distinction, then apply it to history and human psychology.",
      useUr:
        "سامع سے پوچھیں: 'آپ کو راستہ معلوم ہے، پھر بھی آپ چل کیوں نہیں رہے؟' وہاں سے teacher اور leader کا فرق کھولیں، پھر امام کو 'انسان کو حرکت دینے والی حجت' کے طور پر پیش کریں۔",
      useEn:
        "Ask: 'If you already know the road, why are you still not moving?' Then distinguish teacher from leader and present the Imam as guidance that mobilizes.",
    },
    {
      id: "amini-recognition",
      nameUr: "آیت اللہ ابراہیم امینیؒ",
      nameEn: "Ayatullah Ibrahim Amini",
      sourceTitleUr: "امامت اور ائمہؑ — معرفتِ امام کا مفہوم",
      sourceTitleEn: "Imamate and the Imams — what recognition of the Imam means",
      sourceUrl: "https://al-islam.org/imamate-and-imams-ibrahim-amini/authors-preface",
      coreUr:
        "آیت اللہ امینی ایک نہایت اہم practical correction کرتے ہیں: 'معرفتِ امام' صرف یہ نہیں کہ ہم بارہ ائمہؑ کے نام، القاب اور تاریخیں جانتے ہوں۔ حقیقی معرفت میں امام کے علم، عصمت، اخلاق، عبادت، طرزِ عمل اور دینی مرجعیت کو پہچاننا اور اسے اپنی زندگی کا معیار بنانا شامل ہے۔",
      coreEn:
        "Amini makes a crucial practical correction: recognition of the Imam is not merely knowing the names, titles, and dates of the Twelve Imams. Real recognition includes understanding the Imam's knowledge, infallibility, ethics, worship, conduct, and religious authority, then treating that pattern as a standard for life.",
      explanationUr: [
        "یہ زاویہ عقیدۂ امامت کو biography quiz بننے سے بچاتا ہے۔ اگر کوئی شخص امام صادقؑ کی تاریخِ ولادت جانتا ہے مگر علم، صدق، امانت، عبادت اور علمی دیانت میں ان کی روش سے بے تعلق ہے تو معرفت کا اہم حصہ ابھی پیدا نہیں ہوا۔",
        "امینی امام کو دینی علوم کا معتبر source، اخلاقی نمونہ اور امت کی رہنمائی کا مرکز قرار دیتے ہیں۔ اس سے 'امام کو ماننا' ایک lived relationship بن جاتا ہے: میں اپنی عبادت، خاندان، علم، معاملات اور اختلاف میں کس معیار کی پیروی کرتا ہوں؟",
        "یہ نوجوانوں کے لیے خاص طور پر مفید framing ہے، کیونکہ وہ abstract succession debate کے بجائے فوراً یہ پوچھ سکتے ہیں: 'امام میری life decisions میں کیا بدلتا ہے؟'",
      ],
      explanationEn: [
        "This prevents Imamate from becoming a biography quiz. Knowing dates without becoming connected to the Imam's knowledge, integrity, worship, and moral method leaves an essential part of recognition unrealized.",
        "Amini presents the Imam as a reliable source of religious knowledge, a moral exemplar, and a center of guidance. Belief in the Imam therefore becomes a lived relationship: what standard governs my worship, family, learning, transactions, and disagreements?",
        "This framing is especially effective with younger audiences because it moves immediately from succession theory to the question: what difference does the Imam make to my decisions?",
      ],
      styleUr:
        "انداز: doctrine کو character formation میں translate کرنا۔ پہلے تعریف، پھر qualities، پھر 'اس کا میری زندگی میں فائدہ کیا ہے؟' کا جواب۔",
      styleEn:
        "Style: translate doctrine into character formation—definition, qualities, then the practical question of why it matters.",
      useUr:
        "منبر کے آخر میں سامع سے صرف یہ نہ پوچھیں کہ 'آپ امام کو مانتے ہیں؟' بلکہ پوچھیں: 'آپ کی زندگی میں کون سی ایک چیز امام کی سیرت نے بدل دی؟'",
      useEn:
        "Near the end, do not ask only 'Do you believe in the Imam?' Ask: 'What is one thing in your life that the Imam's model has actually changed?'",
    },
    {
      id: "talib-johari-guidance-quran",
      speakerId: "talib-johari",
      nameUr: "علامہ طالب جوہریؒ",
      nameEn: "Allama Talib Johari",
      sourceTitleUr: "منصبِ ہدایت اور قرآن",
      sourceTitleEn: "Mansab-e-Hidayat aur Qur'an",
      sourceUrl: "https://maablib.org/mansb-e-hidayat-aur-quran-by-talib-johri/",
      coreUr:
        "طالب جوہریؒ امامت کی بحث کو قرآن کے مقابل کوئی الگ عقیدہ بنا کر پیش نہیں کرتے، بلکہ پہلے یہ اصول قائم کرتے ہیں کہ قرآن خود زندہ ہدایت ہے، رسولؐ کی اطاعت اسی قرآنی ہدایت کا تقاضا ہے، اور دینی زندگی میں معتبر رہنمائی کی ضرورت محض کتاب کے موجود ہونے سے ختم نہیں ہوتی۔ اس طرح منصبِ ہدایت کو قرآن ہی کے نظامِ ہدایت کے اندر سمجھنے کا راستہ کھلتا ہے۔",
      coreEn:
        "Talib Johari does not present Imamate as a doctrine competing with the Qur'an. He first establishes the Qur'an as living guidance, treats obedience to the Messenger as a Qur'anic requirement, and argues that the presence of a revealed text does not remove the human need for authoritative religious guidance.",
      explanationUr: [
        "کتاب کی مجالس بار بار سورۂ اسراء 17:9 کے اس اصول کی طرف لوٹتی ہیں کہ قرآن اس راہ کی ہدایت کرتا ہے جو سب سے زیادہ قائم اور سیدھی ہے۔ طالب جوہریؒ اسی سے سوال اٹھاتے ہیں کہ اس ہدایت کو اجتماعی اور عملی زندگی میں کیسے پہچانا جائے۔",
        "ان کے بیان میں قرآن اور رسولؐ کی اطاعت ایک دوسرے سے جدا نہیں۔ قرآن خود صاحبِ قرآن کی اطاعت کا حکم دیتا ہے؛ اس لیے معتبر دینی رہنمائی کو قرآن کے مقابل کھڑا کرنا ان کے منہج کے خلاف ہے۔",
        "بعد کی مجالس میں یہی بحث منصبِ ہدایت کے تسلسل تک پہنچتی ہے: اصل سوال شخصی عقیدت نہیں بلکہ یہ ہے کہ وحی نے انسان کو ہدایت سمجھنے، اپنانے اور محفوظ رکھنے کے لیے کس معتبر دینی نظم کی طرف رہنمائی کی ہے۔",
      ],
      explanationEn: [
        "The majalis repeatedly return to Qur'an 17:9 and ask how that guidance is recognized and lived in communal life.",
        "For Johari, Qur'an and obedience to the Messenger are not separable; the Qur'an itself commands obedience to the one who conveys and explains it.",
        "The later majalis move toward continuity of the office of guidance: the issue is the divinely authorized order through which revelation is understood and lived.",
      ],
      styleUr:
        "انداز: ایک مرکزی قرآنی آیت کو پورے عشرے کی بنیاد بنانا، روزمرہ اور موجودہ مثال سے سوال اٹھانا، سامع کے ممکنہ اعتراض کو خود زبان دینا، پھر آیات کے باہمی ربط سے نتیجہ نکالنا اور آخر میں اسی علمی نکتے کو اہلِ بیتؑ اور کربلا سے جوڑ دینا۔",
      styleEn:
        "Style: use one central Qur'anic verse across the series, raise questions through contemporary examples, voice likely objections, connect verses into an argument, then carry the same principle into Ahl al-Bayt and Karbala.",
      useUr:
        "امامت پر مجلس میں پہلے یہ ثابت کرنے کی جلدی نہ کریں کہ امام کون ہے۔ پہلے طالب جوہریؒ کے انداز میں یہ سوال قائم کریں کہ قرآن کی ہدایت عملی زندگی تک کیسے پہنچتی ہے، رسولؐ کی اطاعت کیوں لازم ہے، اور معتبر ہدایت کا تسلسل کس دینی ضرورت کا جواب ہے۔",
      useEn:
        "Before arguing who the Imam is, use Johari's sequence: ask how Qur'anic guidance reaches lived reality, why obedience to the Messenger is required, and what religious need continuing authoritative guidance answers.",
    },
  ],
  synthesisUr: [
    "کاشانی ہمیں **طریقۂ تحقیق** دیتے ہیں: پہلے امامت کی تعریف، پھر تطبیق اور دلیل۔ علامہ طباطبائی **منصب کی ساخت** دیتے ہیں: قیادت، علم اور روحانی تربیت۔ مطہری **function** واضح کرتے ہیں: امام صرف راستہ نہیں بتاتا، انسان اور معاشرے کو حرکت دیتا ہے۔ امینی **معرفت کو زندگی** میں لے آتے ہیں: امام کو جاننا یعنی اس کے علمی و اخلاقی معیار کو اختیار کرنا۔",
    "ان چار زاویوں کو ملا کر امامت نہ صرف historical succession رہتی ہے، نہ صرف political authority، نہ صرف devotional love۔ یہ ایک مکمل نظامِ ہدایت بن جاتی ہے: صحیح علم کہاں سے لیا جائے، کردار کس pattern پر بنے، اجتماعی direction کیسے محفوظ رہے، اور انسان potential سے action تک کیسے پہنچے۔",
    "منبر میں شخصیات کے فضائل ضرور آئیں، مگر framework کے بعد۔ پہلے سامع کو 'امامت کس ضرورت کا جواب ہے؟' سمجھا دیں، پھر امام علیؑ، امام صادقؑ یا امام عصرؑ کی مثالیں زیادہ meaningful محسوس ہوں گی۔",
  ],
  synthesisEn: [
    "Kashani supplies the **method**: define Imamate before applying evidence. Tabataba'i supplies the **structure**: leadership, knowledge, and spiritual formation. Mutahhari clarifies the **function**: the Imam not only shows the road but mobilizes persons and society. Amini translates **recognition into life**: knowing the Imam means adopting an intellectual and moral standard.",
    "Together these approaches prevent Imamate from collapsing into succession history, political authority alone, or devotional affection alone. It becomes a complete architecture of guidance: where reliable knowledge comes from, how character is formed, how communal direction is preserved, and how human potential is moved into action.",
    "Virtues and biographies belong in the sermon, but after the framework. First explain what human and religious need Imamate answers; then the lives of Imam Ali, Imam al-Sadiq, or the Imam of the Age become much more meaningful.",
  ],
  pulpitFlowUr: [
    {
      heading: "1. سوال جانشینی سے پہلے: امامت کس مسئلے کا جواب ہے؟",
      body:
        "ابتدا سیاست سے نہ کریں۔ سامع سے پوچھیں: رسول اکرمؐ کے بعد قرآن باقی ہے، مگر اختلافِ تفسیر بھی باقی ہے؛ احکام باقی ہیں، مگر نئے حالات بھی پیدا ہوتے ہیں؛ اخلاقی تعلیم موجود ہے، مگر انسان کو زندہ نمونہ بھی درکار ہے۔ اگر نبوت ختم ہوئی ہے تو کیا trustworthy guidance کی ضرورت بھی ختم ہوگئی؟ یہی وہ جگہ ہے جہاں امامت کو ایک theological necessity کے طور پر introduce کریں۔",
    },
    {
      heading: "2. امامت کو تین دائروں میں سمجھیں: قیادت، علم، تربیت",
      body:
        "علامہ طباطبائی کے framework سے کہیں: امام معاشرے کی direction سے متعلق ہے، دین کے معتبر علم و تعبیر سے متعلق ہے، اور انسان کی روحانی و اخلاقی تربیت سے متعلق ہے۔ یوں امام صرف ruler نہیں، صرف mufti نہیں، صرف saint نہیں؛ یہ dimensions ایک ہی منصب میں جمع ہوتے ہیں۔",
    },
    {
      heading: "3. راستہ دکھانا کافی نہیں — انسان کو حرکت بھی دینا ہوتی ہے",
      body:
        "مطہری کے فرق کو عام زندگی سے کھولیں: ہر smoker جانتا ہے smoking نقصان دہ ہے، ہر آدمی جانتا ہے غصہ خراب ہے، مگر knowledge alone انسان نہیں بدلتی۔ leadership وہ قوت ہے جو latent capacity کو mobilize کرتی ہے۔ اسی لیے امام کی سیرت محض information نہیں؛ وہ انسان کو stand لینے، sacrifice کرنے، عدل پر قائم رہنے اور نفس سے لڑنے کی قوت دیتی ہے۔",
    },
    {
      heading: "4. پھر سوال کریں: امام کون؟ — اب evidence meaningful ہوگا",
      body:
        "کاشانی کے methodological lesson کے مطابق اب نصوص اور شخصیات کی طرف آئیں۔ آیتِ ابراہیمؑ (2:124) سے امامت کے عہدِ الٰہی ہونے کا concept کھولیں؛ آیتِ ولایت (5:55) اور حدیثِ ثقلین یا غدیر کو اپنی chosen scholarly treatment کے ساتھ لائیں۔ لیکن ہر روایت کو صرف slogan نہ بنائیں؛ یہ بتائیں کہ وہ کس dimension—علم، ولایت، اطاعت یا leadership—کو establish کر رہی ہے۔",
    },
    {
      heading: "5. معرفتِ امام کو معلومات سے کردار تک لے جائیں",
      body:
        "آیت اللہ امینی کے زاویے سے مجلس کو اپنے اندر موڑیں۔ اگر میں امام علیؑ کے عدل، امام سجادؑ کی عبادت، امام صادقؑ کی علمی دیانت، اور امام کاظمؑ کے حلم کو جانتا ہوں مگر میرے کاروبار، گھر، عبادت اور اختلاف میں اس کا اثر نہیں، تو معرفت ابھی biography سے آگے نہیں بڑھی۔ امامت کا practical test یہ ہے کہ امام میری priorities اور conduct کو کہاں تبدیل کرتا ہے۔",
    },
    {
      heading: "6. امامِ عصرؑ: غیبت میں امامت غیر فعال نہیں ہوتی",
      body:
        "اختتام سے پہلے یہ misconception دور کریں کہ غیبت کا مطلب امامت کا practical suspension ہے۔ امامیہ تصور میں حجت، دینی continuity، دعا و انتظار، علمی transmission اور ذمہ دار دینداری جاری رہتی ہے۔ انتظار کا مطلب passive انتظار نہیں بلکہ اپنے آپ اور معاشرے کو اس معیار کے قابل بنانا ہے جس کی امام نمائندگی کرتے ہیں۔",
    },
  ],
  pulpitFlowEn: [
    {
      heading: "1. Before succession: what problem does Imamate answer?",
      body:
        "Do not begin with politics. Ask: after the Prophet, the Qur'an remains, but disagreement over interpretation remains too; law remains, but new circumstances arise; moral teaching remains, but people still need an embodied standard. The end of prophethood does not mean the end of the need for trustworthy guidance.",
    },
    {
      heading: "2. Understand Imamate in three spheres",
      body:
        "Using Tabataba'i's framework, present leadership, authoritative religious knowledge, and spiritual/moral formation. The Imam is not merely a ruler, jurist, or saint; these dimensions are gathered in one office.",
    },
    {
      heading: "3. Showing the road is not the same as moving people",
      body:
        "Use Mutahhari's distinction. People often know what is right and still fail to act. Leadership mobilizes latent capacities. The Imam's life therefore becomes transformative guidance, not historical information.",
    },
    {
      heading: "4. Only now ask: who is the Imam?",
      body:
        "Following Kashani's method, move from definition to evidence. Use Qur'an 2:124, 5:55, Thaqalayn, or Ghadir through a serious scholarly treatment, explaining what dimension of Imamate each proof establishes rather than using reports as slogans.",
    },
    {
      heading: "5. Move recognition from information to character",
      body:
        "Use Amini's practical turn: knowing the Imams' names and dates is not enough. Ask what Imam Ali's justice, Imam al-Sajjad's worship, Imam al-Sadiq's intellectual integrity, and Imam al-Kazim's restraint change in our own conduct.",
    },
    {
      heading: "6. Occultation does not make Imamate inactive",
      body:
        "Close by correcting the idea that occultation suspends the practical meaning of Imamate. Divine proof, religious continuity, responsible scholarship, prayer, expectation, and moral readiness remain active responsibilities.",
    },
  ],
  closingUr:
    "اختتام ایک commitment پر کریں: اس ہفتے صرف ایک امام کی زندگی سے ایک صفت منتخب کریں—عدل، علم، عبادت، حلم یا خدمت—اور سات دن اسے consciously practice کریں۔ پھر معرفتِ امام ناموں سے نکل کر character میں اترنے لگے گی۔",
  closingEn:
    "End with one commitment: choose one quality from the life of one Imam—justice, knowledge, worship, restraint, or service—and practice it consciously for seven days. That is how recognition begins to move from names into character.",
};

const DUA: SermonDossier = {
  topicId: "dua",
  titleUr: "دعا — حاجت سے آگے، قرب، معرفت اور تربیت",
  titleEn: "Dua — beyond requests to nearness, knowledge, and formation",
  thesisUr:
    "دعا کو صرف حاجت مانگنے تک محدود کرنا اس کی روح کو چھوٹا کر دیتا ہے۔ قرآن، صحیفہ سجادیہ اور شیعہ علمی روایت میں دعا ایک ایسا مقام ہے جہاں انسان خدا کی قربت کو پہچانتا ہے، اپنی فقر و نیاز کو سمجھتا ہے، اپنی خواہش کو خیر کے تابع کرتا ہے، اپنے اخلاق کی اصلاح مانگتا ہے، اور پھر اسی دعا کے مطابق عمل کرنے کی ذمہ داری قبول کرتا ہے۔",
  thesisEn:
    "Reducing dua to asking for needs shrinks its meaning. In the Qur'an, Sahifa al-Sajjadiyya, and Shi'i scholarly tradition, supplication is where a person recognizes divine nearness, discovers his own neediness, submits desire to what is truly good, asks for moral reform, and accepts responsibility to live in accordance with the prayer.",
  governingQuestionUr:
    "اگر خدا ہماری ضرورت پہلے ہی جانتا ہے، تو دعا میں اصل تبدیلی خدا کے فیصلے میں آتی ہے یا خود دعا کرنے والے انسان میں؟ اور اگر مانگی ہوئی چیز نہ ملے تو کیا دعا ناکام ہوگئی؟",
  governingQuestionEn:
    "If God already knows our needs, is the central change in dua a change in God's knowledge—or in the person who prays? And if the requested object is not granted, has the prayer failed?",
  primaryTexts: [
    {
      id: "dua-weapon-believer",
      kind: "hadith",
      refUr: "رسول اکرمؐ — دعا مومن کا ہتھیار",
      refEn: "The Prophet — supplication is the believer's weapon",
      sourceArabicMarked:
        "الدُّعاءُ سِلاحُ المُؤمِنِ، وعَمودُ الدِّينِ، ونورُ السَّماواتِ والأرضِ.",
      sourceRefUr: "الکافی، ج2، ص468، ح1۔",
      sourceRefEn: "al-Kafi, vol.2, p.468, hadith 1.",
      explanationUr:
        "یہ روایت دعا کو محض حاجت کی فہرست نہیں رہنے دیتی؛ اسے مومن کی قوت، دین کے سہارے اور باطنی روشنی کے طور پر پیش کرتی ہے۔",
      explanationEn:
        "This narration presents supplication as strength, support for religion, and spiritual light.",
      sourceUrl: "https://al-islam.org/mizan-al-hikmah-scale-wisdom/supplication",
    },
    {
      id: "dua-best-worship",
      kind: "hadith",
      refUr: "رسول اکرمؐ — افضل عبادت دعا ہے",
      refEn: "The Prophet — the best worship is supplication",
      sourceArabicMarked:
        "أفضَلُ العِبادَةِ الدُّعاءُ، فإذا أذِنَ اللهُ لِلعَبدِ في الدُّعاءِ فَتَحَ لَهُ بابَ الرَّحمَةِ.",
      sourceRefUr: "تنبیہ الخواطر، ج2، ص237۔",
      sourceRefEn: "Tanbih al-Khawatir, vol.2, p.237.",
      explanationUr:
        "اس روایت سے دعا کو عبادت کے مرکز کے طور پر کھولا جا سکتا ہے: بندہ مانگتے ہوئے اپنی محتاجی، ربوبیتِ الٰہی اور رحمت کے دروازے کو پہچانتا ہے۔",
      explanationEn:
        "The narration frames supplication as a central act of worship and an opening to mercy.",
      sourceUrl: "https://al-islam.org/mizan-al-hikmah-scale-wisdom/supplication",
    },
    {
      id: "dua-beloved-action",
      kind: "hadith",
      refUr: "امیرالمومنینؑ — خدا کو محبوب عمل",
      refEn: "Imam Ali — an action beloved to God",
      sourceArabicMarked:
        "أحَبُّ الأعمالِ إلى اللهِ عزَّ وجلَّ في الأرضِ الدُّعاءُ.",
      sourceRefUr: "الکافی، ج2، ص467، ح8۔",
      sourceRefEn: "al-Kafi, vol.2, p.467, hadith 8.",
      explanationUr:
        "یہ مختصر حدیث مجلس میں دعا کی قدر کو بہت سادہ مگر مؤثر انداز میں قائم کرتی ہے: دعا محض بحران کی تدبیر نہیں بلکہ خود ایک محبوب عمل ہے۔",
      explanationEn:
        "This concise narration shows that supplication is not merely a crisis response but itself a beloved act.",
      sourceUrl: "https://al-islam.org/mizan-al-hikmah-scale-wisdom/supplication",
    },
    {
      id: "dua-shield-believer",
      kind: "hadith",
      refUr: "امیرالمومنینؑ — دعا مومن کی سپر",
      refEn: "Imam Ali — supplication is the believer's shield",
      sourceArabicMarked:
        "الدُّعاءُ تُرسُ المُؤمِنِ.",
      sourceRefUr: "الکافی، ج2، ص468، ح4۔",
      sourceRefEn: "al-Kafi, vol.2, p.468, hadith 4.",
      explanationUr:
        "ہتھیار کے ساتھ سپر کا استعارہ دعا کے دوسرے رخ کو واضح کرتا ہے: دعا صرف اقدام نہیں، دل اور ایمان کی حفاظت بھی ہے۔",
      explanationEn:
        "The image of a shield highlights supplication as protection of the believer's heart and faith.",
      sourceUrl: "https://al-islam.org/mizan-al-hikmah-scale-wisdom/supplication",
    },
    {
      id: "dua-station-through-asking",
      kind: "hadith",
      refUr: "امام صادقؑ — بعض مقامات دعا ہی سے حاصل ہوتے ہیں",
      refEn: "Imam al-Sadiq — some stations are reached only through asking",
      sourceArabicMarked:
        "يا مُيَسِّرُ، اُدعُ ولا تَقُلْ: إنَّ الأمرَ قَد فُرِغَ مِنهُ؛ إنَّ عِندَ اللهِ عزَّ وجلَّ مَنزِلَةً لا تُنالُ إلّا بِمَسألَةٍ.",
      sourceRefUr: "الکافی، ج2، ص466، ح3۔",
      sourceRefEn: "al-Kafi, vol.2, p.466, hadith 3.",
      explanationUr:
        "یہ روایت تقدیر کے نام پر دعا ترک کرنے کی نفی کرتی ہے اور بتاتی ہے کہ بندگی کے بعض مقامات خود سوال اور دعا کے ذریعے کھلتے ہیں۔",
      explanationEn:
        "This narration rejects abandoning supplication on the pretext that everything is already decreed.",
      sourceUrl: "https://al-islam.org/mizan-al-hikmah-scale-wisdom/supplication",
    },
  ],
  perspectives: [
    {
      id: "sahifa-makarim-formation",
      nameUr: "امام زین العابدینؑ — صحیفہ سجادیہ",
      nameEn: "Imam Zayn al-Abidin — Sahifa al-Sajjadiyya",
      sourceTitleUr: "دعائے مکارم الاخلاق — دعا بطور کردار سازی",
      sourceTitleEn: "Supplication for Noble Moral Traits — prayer as character formation",
      sourceUrl: "https://al-islam.org/sahifa-al-kamilah-al-sajjadiyya-imam-ali-zayn-al-abidin/20-his-supplication-noble-moral-traits-and",
      coreUr:
        "صحیفہ سجادیہ کا سب سے طاقتور سبق یہ ہے کہ دعا انسان کو محض 'کچھ دلوانے' کے لیے نہیں، 'کچھ بنوانے' کے لیے بھی ہے۔ دعائے مکارم الاخلاق میں امامؑ ایمان کی تکمیل، یقین کی قوت، نیت کی اصلاح، عمل کی بہتری، تکبر سے حفاظت، لوگوں کے ساتھ حسنِ سلوک، غصے پر قابو، عدل، سچائی اور نفس کی اصلاح مانگتے ہیں۔",
      coreEn:
        "One of the strongest lessons of the Sahifa is that prayer is not only for obtaining something but for becoming someone. In the Supplication for Noble Moral Traits, the Imam asks for perfected faith, sound certainty, purified intention, better action, freedom from pride, good treatment of others, restraint of anger, justice, truthfulness, and reform of the self.",
      explanationUr: [
        "یہاں دعا اور اخلاق الگ نہیں ہیں۔ امامؑ صرف یہ نہیں کہتے کہ 'خدایا مجھے اچھا بنا دے'؛ وہ character کو چھوٹے operational حصوں میں توڑتے ہیں: نیت درست ہو، عبادت عجب سے خراب نہ ہو، نیکی احسان جتانے سے ضائع نہ ہو، دشمنی محبت میں بدلے، غصہ روکا جائے، حق بولا جائے۔",
        "اس سے خطیب کو ایک اہم منبری اصول ملتا ہے: اچھی دعا vague نہیں ہوتی۔ انسان پہلے اپنی خرابی کا نام لیتا ہے، پھر اس کے مقابل ایک واضح اخلاقی صفت مانگتا ہے، اور پھر اس صفت کے مطابق چلنے کی ذمہ داری قبول کرتا ہے۔",
        "صحیفہ میں دعا self-diagnosis بھی ہے۔ آدمی جب یہ مانگتا ہے کہ 'لوگوں میں میری عزت بڑھے تو میرے اندر اسی قدر تواضع بڑھے' تو وہ دراصل اپنی ego-risk پہچان رہا ہوتا ہے۔ دعا یہاں spiritual mirror بن جاتی ہے۔",
      ],
      explanationEn: [
        "Prayer and ethics are inseparable here. The Imam does not merely ask to 'become good'; he breaks character into operational parts: sound intention, worship protected from self-admiration, generosity without humiliation, transformed hostility, restrained anger, and truthful speech.",
        "This gives the preacher a practical rule: strong prayer is not vague. Name the defect, ask for its opposing virtue, then accept responsibility to live accordingly.",
        "The Sahifa also turns prayer into self-diagnosis. Asking that outward honor be matched by inward humility is recognition of an ego-risk; dua becomes a spiritual mirror.",
      ],
      styleUr:
        "انداز: دعا کو moral checklist میں بدل دینا؛ abstract روحانیت کے بجائے شخصیت کے precise defects اور virtues کا نام لینا۔",
      styleEn:
        "Style: turn prayer into a moral checklist, naming precise defects and virtues instead of leaving spirituality abstract.",
      useUr:
        "منبر میں سامع سے کہیں: آج دعا میں صرف 'مشکل حل کر دے' نہ کہیں؛ ایک character defect کا نام لیں—غصہ، حسد، تکبر، زبان—اور اس کے مقابل ایک صفت مانگیں، پھر سات دن اس پر عمل کریں۔",
      useEn:
        "Ask the audience not to pray only 'solve my problem.' Name one character defect—anger, envy, pride, speech—ask for its opposite virtue, and practice it for seven days.",
      originalSnippet: "وَاسْتَصْلِحْ بِقُدْرَتِكَ مَا فَسَدَ مِنِّي",
    },
    {
      id: "tabatabai-nearness-real-dua",
      nameUr: "علامہ سید محمد حسین طباطبائیؒ",
      nameEn: "Allamah Sayyid Muhammad Husayn Tabataba'i",
      sourceTitleUr: "المیزان — سورۂ بقرہ 2:186 کی تفسیر",
      sourceTitleEn: "Al-Mizan — commentary on Qur'an 2:186",
      sourceUrl: "https://al-islam.org/al-mizan-exegesis-quran-volume-3-sayyid-muhammad-husayn-tabatabai/suratul-baqarah-verse-186",
      coreUr:
        "علامہ طباطبائی آیت «فَإِنِّي قَرِيبٌ» میں دعا کی بنیاد 'قرب' کو قرار دیتے ہیں۔ ان کے نزدیک حقیقی دعا صرف زبان کے الفاظ نہیں؛ دل کا واقعی خدا کی طرف متوجہ ہونا اور حاجت کو اسی کے سامنے رکھنا ضروری ہے۔ اگر زبان خدا کو پکار رہی ہو مگر دل مستقل اسباب یا دوسرے سہاروں کو مستقل مؤثر سمجھ رہا ہو تو دعا کی حقیقت کمزور ہو جاتی ہے۔",
      coreEn:
        "Tabataba'i places divine nearness at the center of Qur'an 2:186. Real dua is not merely verbal formula; the heart must actually turn toward God and place the need before Him. If the tongue addresses God while the heart treats other causes as independently effective, the reality of supplication is weakened.",
      explanationUr: [
        "وہ آیت کے linguistic structure پر توجہ دلاتے ہیں: خدا 'کہہ دو کہ میں قریب ہوں' نہیں فرماتا، بلکہ براہِ راست «فَإِنِّي قَرِيبٌ» کہتا ہے۔ منبر پر اس نکتے سے دعا کو distance-breaking encounter کے طور پر پیش کیا جا سکتا ہے۔",
        "علامہ یہ بھی واضح کرتے ہیں کہ ہر مانگی ہوئی چیز، اسی صورت میں ہمارا حقیقی مطلوب نہیں ہوتی۔ انسان کبھی ایسی چیز مانگتا ہے جس کے نتائج جان لے تو خود نہ مانگے۔ لہٰذا 'دعا قبول نہیں ہوئی' کا فیصلہ صرف ظاہری object نہ ملنے سے نہیں کیا جا سکتا۔",
        "ان کے ہاں دعا کی authenticity heart-dependence سے جڑی ہے۔ اسباب استعمال کریں، ڈاکٹر کے پاس جائیں، محنت کریں—مگر دل cause کو خدا کا شریک نہ بنائے۔ یہ توکل اور دعا کے تعلق کو mature بناتا ہے۔",
      ],
      explanationEn: [
        "He notices the linguistic immediacy of the verse: God does not tell the Prophet to 'say that I am near'; the response comes directly—'I am near.' This lets the preacher present dua as an encounter that collapses distance.",
        "He also explains that what we verbally request is not always our real good. A person may ask for something he would abandon if he knew its consequences, so apparent non-granting does not prove that prayer failed.",
        "For Tabataba'i, authentic dua is tied to dependence of the heart. Use means, doctors, work, and planning, but do not treat causes as independent rivals to God.",
      ],
      styleUr:
        "انداز: ایک آیت کے الفاظ سے theological depth نکالنا؛ پھر psychological reality اور توکل کے practical مسئلے تک جانا۔",
      styleEn:
        "Style: extract theological depth from the wording of one verse, then connect it to psychological reality and practical reliance.",
      useUr:
        "آیت 2:186 پڑھ کر صرف 'خدا قریب ہے' نہ کہیں۔ سامع سے پوچھیں: 'آپ دعا میں خدا سے بات کرتے ہیں، مگر دل میں اصل طاقت کس کو سمجھتے ہیں؟' یہاں سے دعا کی sincerity کھولیں۔",
      useEn:
        "After 2:186, do not stop at 'God is near.' Ask: 'When you pray, whom does your heart actually treat as the decisive power?' Then develop sincerity in supplication.",
      originalSnippet: "فَإِنِّي قَرِيبٌ",
    },
    {
      id: "javadi-khayr-not-demand",
      nameUr: "آیت اللہ عبداللہ جوادی آملی",
      nameEn: "Ayatullah Abdullah Javadi Amoli",
      sourceTitleUr: "آدابِ دعا اور شرحِ دعائے ابوحمزہ ثمالی",
      sourceTitleEn: "Etiquette of supplication and commentary on Dua Abu Hamza al-Thumali",
      sourceUrl: "https://shiastudies.com/fa/%D8%B4%D8%B1%D8%AD-%D8%AF%D8%B9%D8%A7%DB%8C-%D8%A7%D8%A8%D9%88%D8%AD%D9%85%D8%B2%D9%87-%D8%AB%D9%85%D8%A7%D9%84%DB%8C-%D8%A8%D9%87-%D8%B1%D9%88%D8%A7%DB%8C%D8%AA-%D8%A2%DB%8C%D8%A9-%D8%A7%D9%84%D9%84/",
      coreUr:
        "جوادی آملی دعا میں ایک بنیادی correction کرتے ہیں: بندہ خدا کو 'proposal' نہیں دیتا کہ بس یہی چیز اسی شکل میں مجھے دینی ہے؛ ادبِ دعا یہ ہے کہ انسان خیر مانگے۔ کسی مخصوص خواہش پر اصرار ہو سکتا ہے، مگر اس کے ساتھ یہ معرفت رہے کہ مصلحت اور انجام کا کامل علم خدا کے پاس ہے۔",
      coreEn:
        "Javadi Amoli makes a fundamental correction: the servant does not issue God a proposal that one specific outcome must be delivered in one specific form. The etiquette of dua is to ask for what is truly good, while recognizing that complete knowledge of consequences and benefit belongs to God.",
      explanationUr: [
        "یہ زاویہ 'میں نے اتنا رو کر مانگا پھر کیوں نہیں ملا؟' والے بحران کو علمی جواب دیتا ہے۔ اخلاص اور شدتِ طلب اپنی جگہ اہم ہیں، مگر اخلاص کسی harmful request کو automatically خیر نہیں بنا دیتا۔",
        "ان کے بیان میں اجابت binary نہیں: کبھی مطلوب چیز ملتی ہے، کبھی گناہ کی مغفرت یا درجہ کی بلندی کی صورت میں اثر ظاہر ہوتا ہے، اور کبھی حکیمانہ تاخیر خود بہتر نتیجہ ہوتی ہے۔ اس سے دعا disappointment-management نہیں بلکہ trust-formation بن جاتی ہے۔",
        "دعائے ابوحمزہ کی شرح میں وہ بتاتے ہیں کہ دعا صرف request نہیں؛ اس میں خود دعا کی حقیقت، مقدمات، شرائط، آداب اور قبولیت کے اسباب بھی سکھائے جاتے ہیں۔ یعنی مأثور دعا اپنے اندر theology of prayer بھی رکھتی ہے۔",
      ],
      explanationEn: [
        "This gives an intellectual answer to 'I cried sincerely, so why was I not given what I asked?' Sincerity matters, but sincerity does not automatically turn a harmful request into true good.",
        "Acceptance is not binary in his account: sometimes the requested object is granted, sometimes the effect appears as forgiveness or elevation, and sometimes wise delay itself serves the person better. Prayer therefore becomes formation in trust.",
        "In his commentary on Dua Abu Hamza, he stresses that the supplication itself teaches the meaning, preconditions, etiquette, and causes of answered prayer. A transmitted dua contains a theology of prayer within it.",
      ],
      styleUr:
        "انداز: عام مذہبی misconception اٹھانا، قرآن اور حکمت سے correct کرنا، پھر بندے کے خدا سے تعلق کو زیادہ mature بنانا۔",
      styleEn:
        "Style: identify a common religious misconception, correct it through Qur'anic wisdom, then mature the servant's relationship with God.",
      useUr:
        "یہ segment ان مجالس میں بہت مفید ہے جہاں لوگ unanswered prayer سے زخمی ہوں۔ جملہ بنائیں: 'دعا خدا کو میری مرضی پر لانے کا نام نہیں؛ مجھے خیر کے لیے خدا پر اعتماد سکھانے کا نام بھی ہے۔'",
      useEn:
        "This is especially useful where listeners carry pain from apparently unanswered prayers: 'Dua is not forcing God into my preferred outcome; it also trains me to trust God for the good.'",
      originalSnippet: "ما باید خیر را بخواهیم.",
    },
    {
      id: "panahian-attentive-dua",
      speakerId: "alireza-panahian",
      nameUr: "علیرضا پناہیان",
      nameEn: "Alireza Panahian",
      sourceTitleUr: "عقلانیت در قرائت دعا؛ احساسات در قرائت قرآن",
      sourceTitleEn: "Reasoned attention in reciting supplication",
      sourceUrl: "https://telegram.me/s/Panahian_ir?q=%23%D8%B1%D8%A7%D9%87%E2%80%8C%D9%87%D8%A7%DB%8C_%D8%B1%D8%B3%DB%8C%D8%AF%D9%86",
      coreUr:
        "پناہیان دعا پڑھنے میں 'توجہ' کو مرکزی شرط بناتے ہیں۔ ان کا کہنا ہے کہ مأثور دعا کو صرف emotional recitation نہ بنایا جائے؛ اس کے جملوں کو سمجھ کر، ان پر فکر کرکے، اور جس قدر دل حاضر ہو اسی قدر expectation of response کے ساتھ پڑھا جائے۔",
      coreEn:
        "Panahian places attention at the center of reciting supplication. A transmitted dua should not become emotional recitation alone; its phrases should be understood, reflected upon, and read with presence of heart corresponding to the seriousness of the request.",
      explanationUr: [
        "وہ دعا کے فقرات کو meaning-bearing text سمجھتے ہیں۔ اگر کسی difficult عبارت کی گہرائی پوری طرح نہ سمجھ آئے تو بھی جو حصے واضح ہیں انہیں بے توجہی سے نہ گزارا جائے۔ یہ approach صحیفہ اور دعائے کمیل کو 'پڑھنے' سے 'مطالعہ کرنے' کی طرف لے جاتی ہے۔",
        "حضورِ قلب کو وہ محض mystical state نہیں بناتے؛ understanding اس کی ایک راہ ہے۔ جب آدمی جانتا ہے کہ کیا کہہ رہا ہے تو emotion بھی زیادہ حقیقی بنتا ہے۔",
        "ان کا ایک اور practical نکتہ دعا برای دیگران ہے: روایات کے مطابق غائب مؤمن کے لیے دعا خود دعا کرنے والے کی تربیت، رزق اور دفعِ بلا سے بھی مربوط ہے۔ اس سے دعا self-centered wish list نہیں رہتی۔",
      ],
      explanationEn: [
        "He treats the phrases of transmitted prayers as meaning-bearing texts. Even when a difficult passage is not fully understood, the clear portions should not be passed over inattentively. This moves Sahifa and Dua Kumayl from mere recitation toward study.",
        "Presence of heart is not treated as a mysterious feeling only; understanding is one road to it. When a person knows what he is saying, emotion becomes more truthful.",
        "Another practical point is praying for others. Narrations on supplication for an absent believer shift dua away from a self-centered wish list and toward moral concern for others.",
      ],
      styleUr:
        "انداز: عبادت کی familiar practice میں hidden negligence پکڑنا، پھر چھوٹا practical correction دینا—رفتار کم کرو، معنی سمجھو، ایک فقرہ واقعی مانگو۔",
      styleEn:
        "Style: expose hidden inattentiveness inside a familiar practice, then offer a small correction—slow down, understand, and genuinely ask for one phrase.",
      useUr:
        "سامع کو challenge دیں کہ اگلی دعائے کمیل یا صحیفہ میں مقدار کم اور توجہ زیادہ کرے: دس صفحات بے توجہی سے نہیں، ایک فقرہ سمجھ کر اور سچ میں مانگ کر۔",
      useEn:
        "Challenge the listener to prefer quality over quantity in the next recitation: not ten pages inattentively, but one phrase understood and genuinely asked.",
      originalSnippet: "اولین شرط اجابت دعا، حضور قلب است.",
    },
  ],
  synthesisUr: [
    "صحیفہ ہمیں بتاتا ہے **کیا مانگنا ہے**: اپنی ذات کی اصلاح۔ علامہ طباطبائی بتاتے ہیں **کس حقیقت کے سامنے مانگنا ہے**: قریب خدا کے سامنے، دل کی حقیقی توجہ کے ساتھ۔ جوادی آملی بتاتے ہیں **قبولیت کو کیسے سمجھنا ہے**: خیر مانگو، خدا کو اپنی preferred شکل dictate نہ کرو۔ پناہیان بتاتے ہیں **دعا پڑھنی کیسے ہے**: معنی، حضور اور فکر کے ساتھ۔",
    "یوں دعا چار سطحوں پر کام کرتی ہے: تعلقِ خدا، شناختِ خود، اصلاحِ خواہش، اور اصلاحِ کردار۔ اگر ان میں سے کوئی بھی نہ ہو اور صرف حاجت کی فہرست رہ جائے تو دعا کا بہت بڑا تربیتی حصہ ضائع ہو جاتا ہے۔",
    "اس dossier کا مرکزی منبری pivot یہ ہو سکتا ہے: **دعا میں انسان صرف جواب نہیں مانگتا؛ وہ جواب کے قابل انسان بننے کی تربیت بھی لیتا ہے۔**",
  ],
  synthesisEn: [
    "The Sahifa teaches **what to ask for**: reform of the self. Tabataba'i explains **before whom we ask**: the near God, with real dependence of the heart. Javadi Amoli explains **how to understand acceptance**: ask for the good rather than dictating one preferred form. Panahian explains **how to recite**: with meaning, presence, and reflection.",
    "Dua therefore works on four levels: relationship with God, self-knowledge, reform of desire, and reform of character. If it becomes only a list of requests, much of its formative power is lost.",
    "The sermon's central pivot can be: **in dua, a person does not only ask for an answer; he is also trained into the kind of person who can receive and live that answer.**",
  ],
  pulpitFlowUr: [
    {
      heading: "1. دعا خدا کو خبر دینا نہیں",
      body:
        "ابتدا اسی سوال سے کریں: خدا میری حاجت جانتا ہے تو میں بتاتا کیوں ہوں؟ جواب یہ ہے کہ دعا information transfer نہیں؛ relationship activation ہے۔ قرآن 2:186 میں جواب براہِ راست آتا ہے: «فَإِنِّي قَرِيبٌ»۔ بندہ خدا کو نہیں جگاتا، اپنے دل کو خدا کی قربت کے لیے جگاتا ہے۔",
    },
    {
      heading: "2. اصل دعا زبان سے پہلے دل میں بنتی ہے",
      body:
        "علامہ طباطبائی کے زاویے سے فرق کریں: زبان کہہ رہی ہے 'یا اللہ'، مگر دل سمجھ رہا ہے اصل نجات فلاں شخص، فلاں connection یا فلاں سبب کے ہاتھ میں ہے۔ اسباب اختیار کرنا درست ہے، مگر استقلالِ تاثیر صرف خدا کے لیے ہے۔ حقیقی دعا دل کے dependence کو درست کرتی ہے۔",
    },
    {
      heading: "3. صحیفہ سکھاتی ہے: دعا میں اپنی شخصیت بھی مانگو",
      body:
        "اب دعائے مکارم الاخلاق کی طرف آئیں۔ امام سجادؑ رزق اور مشکل کے ساتھ نیت، یقین، humility، زبان، غصہ، عدل، سخاوت اور character کی اصلاح مانگتے ہیں۔ سامع کو دکھائیں کہ ائمہؑ کی دعا wish list نہیں بلکہ character curriculum ہے۔",
    },
    {
      heading: "4. اگر وہ چیز نہ ملی تو کیا دعا رد ہوگئی؟",
      body:
        "جوادی آملی کے زاویے سے اس دردناک سوال کو address کریں۔ اخلاص کے ساتھ مانگی ہوئی چیز بھی ہمیشہ اسی صورت میں خیر نہیں ہوتی۔ بندہ مانگے، اصرار کرے، روئے—مگر آخری جملہ trust کا ہو: خدایا، مجھے وہ خیر دے جس کا انجام تو جانتا ہے۔ قبولیت کبھی عطا، کبھی تاخیر، کبھی دفعِ ضرر، کبھی مغفرت اور کبھی درجے کی بلندی کی شکل میں آ سکتی ہے۔",
    },
    {
      heading: "5. مأثور دعا کو پڑھیں نہیں—سمجھ کر مانگیں",
      body:
        "پناہیان کے practical correction سے دعا کی مجلس کو بدلیں۔ رفتار کم کریں۔ ہر فقرے کے معنی پر رکیں۔ اگر دعائے کمیل میں کہتے ہیں «ظَلَمْتُ نَفْسِي» تو ایک لمحے کو واقعی پوچھیں: میں نے اپنے اوپر کیا ظلم کیا؟ اگر صحیفہ میں حلم مانگ رہے ہیں تو کل کے غصے کو سامنے لائیں۔ تب الفاظ زندگی سے جڑتے ہیں۔",
    },
    {
      heading: "6. دعا کے بعد action لازم ہے",
      body:
        "صحیفہ کا logic یہی ہے: جو صفت خدا سے مانگی، اس کے لیے اگلا قدم بھی اٹھاؤ۔ اگر رزق مانگا تو حلال کوشش؛ اگر مغفرت مانگی تو ترکِ گناہ؛ اگر اخلاق مانگا تو زبان اور غصے کی practice؛ اگر ہدایت مانگی تو حق سننے کی readiness۔ دعا action کا substitute نہیں، action کو خدا سے جوڑنے والی روح ہے۔",
    },
  ],
  pulpitFlowEn: [
    {
      heading: "1. Dua is not informing God",
      body:
        "Begin with the question: if God knows my need, why tell Him? Dua is not information transfer; it activates relationship. Qur'an 2:186 answers directly: 'I am near.' The servant is not waking God up; he is waking his own heart to divine nearness.",
    },
    {
      heading: "2. Real prayer forms in the heart before the tongue",
      body:
        "Use Tabataba'i's distinction: the tongue may say 'O God' while the heart treats a person, connection, or material cause as the real independent savior. Means are valid, but ultimate dependence belongs to God alone.",
    },
    {
      heading: "3. The Sahifa teaches us to ask for character",
      body:
        "Move to the Supplication for Noble Moral Traits. Imam al-Sajjad asks not only for relief but for corrected intention, certainty, humility, speech, restraint, justice, generosity, and character. The prayer is a curriculum of formation.",
    },
    {
      heading: "4. If the object was not granted, was the prayer rejected?",
      body:
        "Use Javadi Amoli's correction. A sincerely desired object is not automatically the true good. Ask intensely, but let trust have the final word: grant me the good whose outcome You know. Acceptance may appear as grant, delay, protection, forgiveness, or elevation.",
    },
    {
      heading: "5. Do not merely recite transmitted prayers—understand and ask",
      body:
        "Use Panahian's practical correction: slow down, understand the phrase, connect it to an actual failure or need, and ask it honestly. One meaningful line can form the heart more than pages of inattentive recitation.",
    },
    {
      heading: "6. Action follows prayer",
      body:
        "The Sahifa's logic joins asking with responsibility. Pray for provision and pursue lawful work; pray for forgiveness and abandon sin; pray for character and train speech and anger; pray for guidance and become willing to hear truth. Dua is not a substitute for action but the soul that connects action to God.",
    },
  ],
  closingUr:
    "اختتام میں سامع کو ایک سادہ مشق دیں: آج رات صرف ایک دعا منتخب کریں، ایک فقرہ چنیں، اس کا معنی سمجھیں، اسے اپنی زندگی کے ایک حقیقی مسئلے سے جوڑیں، پھر اسی فقرے کے مطابق کل ایک عملی قدم اٹھائیں۔ یہی مقام ہے جہاں دعا زبان سے نکل کر شخصیت میں داخل ہوتی ہے۔",
  closingEn:
    "End with one simple exercise: tonight choose one supplication, select one phrase, understand its meaning, connect it to one real issue in your life, and tomorrow take one action consistent with that phrase. That is where dua moves from the tongue into character.",
};

const ISMAH: SermonDossier = {
  topicId: "ismah",
  titleUr: "عصمت — اختیار، کمالِ کردار اور منصبِ الٰہی",
  titleEn: "Infallibility — freedom, perfected character, and divine office",
  thesisUr:
    "علامہ سید علی نقی نقویؒ کے فراہم کردہ عشرۂ مجالس میں عصمت کو جبر یا محض تاریخی بے گناہی کے طور پر نہیں، بلکہ ایک منظم کلامی argument کے طور پر کھولا گیا ہے: الٰہی انتخاب پہلے سے موجود اہلیت پر قائم ہے؛ عصمت صرف گناہ کے عدمِ وقوع کا نام نہیں؛ moral impossibility اختیار کی نفی نہیں؛ اور انسانی عصمت کی عظمت حقیقی بشریت، جذبات اور محرکات کے باوجود ضبطِ نفس میں ظاہر ہوتی ہے۔",
  thesisEn:
    "In the supplied Naqvi majalis series, infallibility is developed not as compulsion or merely an observed history of sinlessness, but as a structured theological argument: divine selection rests on prior qualification; infallibility is stronger than non-occurrence; moral impossibility does not negate freedom; and human infallibility is elevated precisely because self-mastery is maintained within real human drives.",
  governingQuestionUr:
    "معصوم کا گناہ نہ کرنا اگر جبر نہیں تو کس معنی میں یقینی ہے، اور یہی عصمت نبوت و امامت کی اہلیت سے کیسے مربوط ہوتی ہے؟",
  governingQuestionEn:
    "If the infallible person's sinlessness is not compulsion, in what sense is it certain, and how does that certainty relate to qualification for prophethood and Imamate?",
  primaryTexts: [
    {
      id: "ismah-safe-from-error",
      kind: "hadith",
      refUr: "امیرالمومنینؑ — عصمت اور خطا سے حفاظت",
      refEn: "Imam Ali — infallibility and protection from error",
      sourceArabicMarked: "مَن اُلهِمَ العِصمَةَ أمِنَ الزَّلَلَ.",
      sourceRefUr: "غرر الحکم، ح8469۔",
      sourceRefEn: "Ghurar al-Hikam, no. 8469.",
      explanationUr: "یہ مختصر عبارت عصمت کے بنیادی مفہوم کو خطا اور لغزش سے محفوظ رہنے کے طور پر سامنے لاتی ہے۔",
      explanationEn: "This concise saying introduces infallibility as protection from error and lapse.",
      sourceUrl: "https://al-islam.org/mizan-al-hikmah-scale-wisdom/infallibility",
    },
    {
      id: "ismah-imam-quran",
      kind: "hadith",
      refUr: "امام زین العابدینؑ — امام، عصمت اور قرآن",
      refEn: "Imam Zayn al-Abidin — the Imam, infallibility, and the Qur'an",
      sourceArabicMarked: "الإمامُ مِنّا لا يَكونُ إلّا مَعصوماً ... هُوَ المُعتَصِمُ بِحَبلِ اللهِ، وحَبلُ اللهِ هُوَ القُرآنُ ... والإمامُ يَهدي إلَى القُرآنِ، والقُرآنُ يَهدي إلَى الإمامِ.",
      sourceRefUr: "معانی الاخبار، ص132، ح1۔",
      sourceRefEn: "Ma'ani al-Akhbar, p.132, hadith 1.",
      explanationUr: "یہ روایت عصمت کو امامت اور قرآن کے باہمی تعلق سے جوڑتی ہے اور معصوم کی تعریف کو ایک مثبت ہدایتی معنی دیتی ہے۔",
      explanationEn: "The narration links infallibility, Imamate, and the Qur'an as mutually guiding realities.",
      sourceUrl: "https://al-islam.org/mizan-al-hikmah-scale-wisdom/infallibility",
    },
    {
      id: "ismah-sadiq-definition",
      kind: "hadith",
      refUr: "امام صادقؑ — معصوم کی تعریف",
      refEn: "Imam al-Sadiq — definition of the infallible",
      sourceArabicMarked: "المَعصومُ هُوَ المُمتَنِعُ بِاللهِ مِن جَميعِ مَحارِمِ اللهِ.",
      sourceRefUr: "معانی الاخبار، ص132، ح2۔",
      sourceRefEn: "Ma'ani al-Akhbar, p.132, hadith 2.",
      explanationUr: "یہ عبارت عصمت کو جبر کے بجائے خدا سے تمسک اور محارمِ الٰہی سے محفوظ رہنے کے معنی میں کھولتی ہے۔",
      explanationEn: "This saying frames infallibility through taking refuge in God from all prohibited acts.",
      sourceUrl: "https://al-islam.org/mizan-al-hikmah-scale-wisdom/infallibility",
    },
    {
      id: "ismah-imam-free-from-lapses",
      kind: "hadith",
      refUr: "امام صادقؑ — امام لغزشوں سے محفوظ",
      refEn: "Imam al-Sadiq — the Imam is protected from lapses",
      sourceArabicMarked: "مَعصوماً مِنَ الزَّلّاتِ، مَصوناً عَنِ الفَواحِشِ كُلِّها.",
      sourceRefUr: "الکافی، ج1، ص204، ح2۔",
      sourceRefEn: "al-Kafi, vol.1, p.204, hadith 2.",
      explanationUr: "یہ روایت منصبِ امام کی ایک بنیادی صفت کے طور پر عصمت کو نہایت واضح الفاظ میں بیان کرتی ہے۔",
      explanationEn: "The narration explicitly states infallibility as a defining quality of the Imam.",
      sourceUrl: "https://al-islam.org/mizan-al-hikmah-scale-wisdom/infallibility",
    },
    {
      id: "ismah-rida-proof",
      kind: "hadith",
      refUr: "امام رضاؑ — عصمت اور حجتِ الٰہی",
      refEn: "Imam al-Ridha — infallibility and divine proof",
      sourceArabicMarked: "فَهُوَ مَعصومٌ مُؤَيَّدٌ مُوَفَّقٌ مُسَدَّدٌ، قَد أمِنَ مِنَ الخَطايا والزَّلَلِ والعِثارِ، يَخُصُّهُ اللهُ بِذلكَ لِيَكونَ حُجَّتَهُ عَلى عِبادِهِ وشاهِدَهُ عَلى خَلقِهِ.",
      sourceRefUr: "الکافی، ج1، ص203، ح1۔",
      sourceRefEn: "al-Kafi, vol.1, p.203, hadith 1.",
      explanationUr: "یہ روایت عصمت کو امام کے منصبِ حجت سے براہِ راست جوڑتی ہے: الٰہی تائید اور لغزش سے حفاظت اس منصب کی ذمہ داری کے ساتھ آتی ہے۔",
      explanationEn: "This narration directly connects infallibility with the Imam's function as God's proof and witness over creation.",
      sourceUrl: "https://al-islam.org/mizan-al-hikmah-scale-wisdom/infallibility",
    },
  ],
  perspectives: [
    {
      id: "naqqan-ismah-istifa",
      speakerId: "ali-naqi-naqvi",
      nameUr: "آیت اللہ سید علی نقی نقویؒ (نقن)",
      nameEn: "Ayatullah Sayyid Ali Naqi Naqvi (Naqqan)",
      sourceTitleUr: "مجالس 1–2: اصطفاء، علمِ الٰہی اور منصب",
      sourceTitleEn: "Majalis 1–2: istifa, divine knowledge, and office",
      sourceUrl: "https://maablib.org/list_of__ulama_majalis/majalis-list-of-allama-syed-ali-naqi-naqqan-sahib/",
      coreUr:
        "پہلا قدم یہ ہے کہ منصب عصمت پیدا نہیں کرتا؛ الٰہی انتخاب اس ہستی کو چنتا ہے جو منصب کے معیار پر پہلے ہی پوری اترتی ہے۔ «اصطفیٰ» کو وہ 'صاف بنا دینا' نہیں بلکہ 'صاف کو چن لینا' سمجھاتے ہیں، اور 6:124 سے اس انتخاب کو علمِ الٰہی سے جوڑتے ہیں۔",
      coreEn:
        "The first move is that office does not manufacture infallibility. Divine selection chooses the person already qualified for it. Naqvi reads istifa as selecting the pure rather than creating purity, and Qur'an 6:124 links the appointment to divine knowledge.",
      explanationUr: [
        "لغت یہاں decoration نہیں بلکہ argument ہے: «اصطفاء» کے morphology سے وہ qualification-before-appointment کا اصول اخذ کرتے ہیں۔",
        "«اللّٰهُ أَعْلَمُ حَيْثُ يَجْعَلُ رِسَالَتَهُ» میں علم کا حوالہ یہ بتاتا ہے کہ منصب کسی حقیقی suitability کے مطابق رکھا جاتا ہے۔",
        "یہی framework نبوت، رسالت اور امامت تینوں کے لیے ایک shared principle بن جاتا ہے۔",
      ],
      explanationEn: [
        "Morphology becomes argument: istifa is used to establish qualification before appointment.",
        "Qur'an 6:124 makes divine knowledge, not arbitrary choice, central to the placement of messengership.",
        "The same framework is extended across prophethood, messengership, and Imamate.",
      ],
      styleUr:
        "انداز: ایک لفظ کی صرفی و لغوی تحلیل → روزمرہ مثال → کلامی نتیجہ → منصبِ الٰہی پر اطلاق۔",
      styleEn:
        "Style: morphology and lexical analysis → ordinary analogy → theological conclusion → application to divine office.",
      useUr:
        "منبر میں پہلے 'اصطفاء' سمجھائیں، پھر یہ جملہ دیں: منصب نے انہیں پاک نہیں کیا؛ پاکیزگی و اہلیت کی بنا پر منصب ان کے سپرد ہوا۔",
      useEn:
        "Explain istifa first, then state: the office did not create purity; the office was entrusted on the basis of qualification.",
      originalSnippet: "عصمت نتیجۂ رسالت نہیں ہے، بلکہ رسالت نتیجۂ عصمت ہے۔",
    },
    {
      id: "naqqan-ismah-freedom",
      speakerId: "ali-naqi-naqvi",
      nameUr: "آیت اللہ سید علی نقی نقویؒ (نقن)",
      nameEn: "Ayatullah Sayyid Ali Naqi Naqvi (Naqqan)",
      sourceTitleUr: "مجالس 3–4: عدمِ وقوع، عدمِ امکان اور اختیار",
      sourceTitleEn: "Majalis 3–4: non-occurrence, impossibility, and freedom",
      sourceUrl: "https://maablib.org/list_of__ulama_majalis/majalis-list-of-allama-syed-ali-naqi-naqqan-sahib/",
      coreUr:
        "دوسرا قدم definition کو سخت بنانا ہے: صرف یہ کہنا کہ 'گناہ ہوا نہیں' عصمت نہیں، کیونکہ مستقبل اور باطن کی ضمانت نہیں بنتی۔ لیکن 'گناہ ناممکن ہے' کہتے ہی جبر کا سوال اٹھتا ہے۔ علامہ عدلِ الٰہی کی مثال سے دکھاتے ہیں کہ moral impossibility قدرت یا اختیار کی نفی نہیں ہوتی۔",
      coreEn:
        "The second move sharpens the definition: saying only that sin has not occurred cannot ground certainty. But calling sin impossible raises the problem of compulsion. Naqvi uses divine justice to show that moral impossibility need not negate power or freedom.",
      explanationUr: [
        "عدمِ وقوع empirical observation ہے؛ عصمت stronger certainty کا دعویٰ ہے۔",
        "کسی کام کا نہ ہونا weakness کی وجہ سے بھی ہوسکتا ہے، اور perfection کی وجہ سے بھی۔",
        "خدا کا ظلم نہ کرنا قدرت کی کمی نہیں؛ اسی analogy سے معصوم کی بے گناہی کو اختیار کے ساتھ compatible دکھایا جاتا ہے۔",
      ],
      explanationEn: [
        "Non-occurrence is empirical; infallibility claims stronger certainty.",
        "An act may fail to occur because of weakness or because perfected character excludes it.",
        "God's not acting unjustly is not weakness; the analogy is used to preserve freedom within infallibility.",
      ],
      styleUr:
        "انداز: binary question کھڑا کرنا، دونوں طرف کی مشکل دکھانا، پھر اصولِ عدل سے conceptual resolution دینا۔",
      styleEn:
        "Style: construct a binary problem, expose the difficulty on both sides, then resolve it through the doctrine of divine justice.",
      useUr:
        "سامع سے سیدھا سوال کریں: 'گناہ نہیں ہوا' اور 'گناہ اس شان سے صادر نہیں ہوسکتا'—کیا دونوں ایک بات ہیں؟ یہاں سے اختیار کی بحث کھولیں۔",
      useEn:
        "Ask directly: are 'sin did not occur' and 'sin cannot issue from this perfected moral station' the same claim? Then open the freedom question.",
      originalSnippet: "نہ کرسکنا اور چیز ہے اور نہ ہوسکنا اور چیز ہے۔",
    },
    {
      id: "naqqan-ismah-humanity",
      speakerId: "ali-naqi-naqvi",
      nameUr: "آیت اللہ سید علی نقی نقویؒ (نقن)",
      nameEn: "Ayatullah Sayyid Ali Naqi Naqvi (Naqqan)",
      sourceTitleUr: "مجالس 5–8: ملائکہ، بشریت اور ضبطِ نفس",
      sourceTitleEn: "Majalis 5–8: angels, real humanity, and self-mastery",
      sourceUrl: "https://maablib.org/list_of__ulama_majalis/majalis-list-of-allama-syed-ali-naqi-naqqan-sahib/",
      coreUr:
        "تیسرا قدم عصمت کی فضیلت کو real human condition میں رکھنا ہے۔ ملائکہ کی ارادی اطاعت تسلیم کرنے کے بعد علامہ فرق یہ بتاتے ہیں کہ انسان بھوک، پیاس، خواہش، غضب اور دنیاوی دباؤ کے درمیان اطاعت کرتا ہے۔ یہی وجہ ہے کہ حقیقی بشریت عصمت کے خلاف نہیں، بلکہ اس کی اخلاقی عظمت کا میدان ہے۔",
      coreEn:
        "The third move places the excellence of infallibility inside real human life. Angelic voluntary obedience is affirmed, but humans obey amid hunger, desire, anger, and worldly pressures. Real humanity therefore becomes the arena of moral excellence rather than a threat to infallibility.",
      explanationUr: [
        "بے گناہی تبھی moral virtue بنتی ہے جب شعور و ارادہ موجود ہوں۔",
        "رسول یا امام کی عظمت بچانے کے لیے ان کی بشریت کو ظاہری قرار دینا اسوۂ عمل کی معنویت کم کر دیتا ہے۔",
        "اس پوری بحث کا اخلاقی خلاصہ 'ضبطِ نفس' ہے: محرکات موجود ہیں، مگر وہ فیصلے پر حکومت نہیں کرتے۔",
      ],
      explanationEn: [
        "Sinlessness becomes moral virtue only where awareness and volition are present.",
        "Reducing the Prophet's or Imam's humanity to appearance weakens meaningful exemplarity.",
        "The ethical summary is self-mastery: impulses exist, but they do not rule judgment.",
      ],
      styleUr:
        "انداز: comparison → objection → Qur'anic correction → practical ethical bridge۔",
      styleEn:
        "Style: comparison → objection → Qur'anic correction → practical ethical bridge.",
      useUr:
        "عصمت کو inaccessible metaphysics نہ بنائیں؛ آخر میں ضبطِ نفس کو عام سامع کے لیے قابلِ عمل اخلاقی lesson کے طور پر نکالیں۔",
      useEn:
        "Do not leave infallibility as inaccessible metaphysics; end by drawing self-mastery as an actionable ethical lesson.",
      originalSnippet: "حقیقت میں اس کی روح ہے ضبطِ نفس۔",
    },
    {
      id: "naqqan-ismah-ranks-imamate",
      speakerId: "ali-naqi-naqvi",
      nameUr: "آیت اللہ سید علی نقی نقویؒ (نقن)",
      nameEn: "Ayatullah Sayyid Ali Naqi Naqvi (Naqqan)",
      sourceTitleUr: "مجلس 9: نبوت، رسالت، امامت اور مراتب",
      sourceTitleEn: "Majlis 9: prophethood, messengership, Imamate, and ranks",
      sourceUrl: "https://maablib.org/list_of__ulama_majalis/majalis-list-of-allama-syed-ali-naqi-naqqan-sahib/",
      coreUr:
        "آخری مجلس عصمت کو hierarchy of guidance سے جوڑتی ہے۔ ایک ہی حقیقت کے درجات ہوسکتے ہیں، جیسے روشنی کے درجات؛ اسی طرح نبوت، رسالت اور امامت الگ منصب ہیں۔ حضرت ابراہیمؑ کے 2:124 والے واقعے سے امامت کو distinct divine office کے طور پر argue کیا جاتا ہے۔",
      coreEn:
        "The final majlis connects infallibility with a hierarchy of guidance. One shared reality can have degrees, like light; similarly prophethood, messengership, and Imamate are distinct offices. Abraham's appointment in Qur'an 2:124 is used to argue for Imamate as a distinct divine office.",
      explanationUr: [
        "مراتبِ عصمت کو مراتبِ منصب سے سمجھانے کے لیے روشنی کی مثال استعمال ہوتی ہے۔",
        "حضرت ابراہیمؑ کے پہلے سے نبی و رسول ہونے اور پھر امام بنائے جانے کی ترتیب distinction پیدا کرتی ہے۔",
        "«لا ينال عهدي الظالمين» اخلاقی qualification کو الٰہی عہد کے ساتھ جوڑتی ہے۔",
      ],
      explanationEn: [
        "Degrees of light are used to explain ranks within a shared reality.",
        "Abraham's prior prophethood and later appointment as Imam create a distinction of offices.",
        "'My covenant does not reach the wrongdoers' links moral qualification to divine covenant.",
      ],
      styleUr:
        "انداز: analogy → classification → Qur'anic case study → qualification → succession۔",
      styleEn:
        "Style: analogy → classification → Qur'anic case study → qualification → succession.",
      useUr:
        "اس حصے کو عصمت سے امامت کی طرف transition کے طور پر استعمال کریں؛ سامع کو دکھائیں کہ doctrine isolated نہیں بلکہ ایک بڑے نظامِ ہدایت کا حصہ ہے۔",
      useEn:
        "Use this as the transition from infallibility to Imamate, showing that the doctrine belongs to a larger architecture of guidance.",
      originalSnippet: "نبوت، رسالت، امامت۔",
    },
  ],
  synthesisUr: [
    "نقنؒ کی پوری series ایک مسلسل intellectual staircase بناتی ہے: **اصطفاء → qualification → عصمت کی تعریف → اختیار → ملائکہ سے تقابل → حقیقی بشریت → ضبطِ نفس → مراتبِ ہدایت → امامت**۔ یہی continuity اس material کی سب سے بڑی منبری طاقت ہے۔",
    "یہاں عصمت کوئی magic shield نہیں بلکہ ایک کلامی و اخلاقی تصور ہے: خدا کے علم میں معلوم perfected qualification، جو آزادی کے ساتھ compatible ہے اور real human life میں self-mastery کی صورت میں ظاہر ہوتی ہے۔",
    "خطیب کے لیے عملی سبق یہ ہے کہ عصمت کی مجلس کو صرف 'معصوم گناہ نہیں کرتے' پر ختم نہ کرے۔ سامع کو یہ سمجھائے کہ کیوں، کس معنی میں، اختیار کے ساتھ کیسے، اور اس عقیدے کا ordinary moral life کے لیے کیا ethical implication نکلتا ہے۔",
  ],
  synthesisEn: [
    "Naqqan's series forms a continuous intellectual staircase: **istifa → qualification → definition of infallibility → freedom → comparison with angels → real humanity → self-mastery → ranks of guidance → Imamate**.",
    "Infallibility is not presented as a magical shield but as a theological and ethical category: perfected qualification known to God, compatible with freedom, and manifested within real human life as self-mastery.",
    "The practical preaching lesson is not to stop at 'the infallible do not sin,' but to explain why, in what sense, how freedom remains, and what ethical implication the doctrine has for ordinary life.",
  ],
  pulpitFlowUr: [
    {
      heading: "1. عصمت کو لفظِ اصطفاء سے کھولیں",
      body:
        "آل عمران 3:33 سے آغاز کریں۔ 'اصطفاء' کو صرف 'چن لیا' کہہ کر نہ گزریں۔ سوال کریں: چننے سے صفت پیدا ہوتی ہے یا صاحبِ صفت منتخب ہوتا ہے؟ یہی سے بنیاد رکھیں کہ الٰہی منصب کسی arbitrary lottery کا نتیجہ نہیں بلکہ خدا کے علم میں معلوم حقیقی اہلیت پر قائم ہے۔",
    },
    {
      heading: "2. 'گناہ نہیں کیا' کافی تعریف کیوں نہیں؟",
      body:
        "سامع کو فرق سمجھائیں: کسی شخص سے ہمارے سامنے گناہ نہ ہونا observation ہے؛ عصمت certainty کا دعویٰ ہے۔ اگر definition صرف ماضی کے observation پر کھڑی ہو تو future اور hidden conduct کی ضمانت نہیں۔",
    },
    {
      heading: "3. پھر مشکل خود پیدا کریں: اگر گناہ ممکن نہیں تو اختیار کہاں؟",
      body:
        "یہاں answer جلدی نہ دیں۔ پہلے tension محسوس کرائیں۔ اگر 'نہیں کرسکتا' physical inability ہے تو فضیلت ختم۔ پھر عدلِ الٰہی کی analogy لائیں: خدا ظلم نہیں کرتا، مگر قدرت ناقص نہیں۔ perfection بعض افعال کو character-incompatible بنا دیتی ہے۔",
    },
    {
      heading: "4. ملائکہ سے comparison کر کے انسانی عصمت کا مقام واضح کریں",
      body:
        "فرشتوں کی اطاعت کو mechanical نہ کہیں؛ پھر فرق یہ رکھیں کہ human life میں hunger, anger, desire, pain اور social pressure موجود ہیں۔ انہی کے اندر obedience انسانی عصمت کو خاص moral grandeur دیتی ہے۔",
    },
    {
      heading: "5. حقیقی بشریت کو کم نہ کریں",
      body:
        "قرآن رسول کی بشریت پر اصرار کرتا ہے۔ اگر بھوک، پیاس، خوف، درد اور انسانی جذبات حقیقت نہ ہوں تو صبر، روزہ، ایثار اور وفاداری ہمارے لیے قابلِ اتباع کیسے ہوں گے؟ معصومینؑ کا کمال انسان نہ ہونے میں نہیں، انسان ہوتے ہوئے نفس کے مغلوب نہ ہونے میں ہے۔",
    },
    {
      heading: "6. عام سامع کے لیے اخلاقی bridge: ضبطِ نفس",
      body:
        "واضح کریں کہ سامع theological عصمت کا دعویٰ نہیں کرتا، مگر doctrine سے اخلاقی تربیت لیتا ہے: خواہش موجود ہو مگر فیصلہ اس کی غلامی میں نہ ہو؛ غصہ آئے مگر عدل نہ جائے؛ درد ہو مگر ذمہ داری نہ ٹوٹے۔ یہی 'ضبطِ نفس' ordinary life میں اس عقیدے کا تربیتی اثر ہے۔",
    },
    {
      heading: "7. عصمت سے امامت کی طرف جائیں",
      body:
        "آخر میں ابراہیمؑ اور 2:124 لائیں۔ نبوت، رسالت اور امامت کو distinct مگر متعلق divine offices کے طور پر کھولیں، اور «لا ينال عهدي الظالمين» سے دکھائیں کہ الٰہی عہد moral qualification سے جدا نہیں۔",
    },
  ],
  pulpitFlowEn: [
    { heading: "1. Open infallibility through istifa", body: "Begin with Qur'an 3:33 and ask whether selection creates the quality or selects the qualified person. Divine office is grounded in real qualification known to God." },
    { heading: "2. Why 'no sin was observed' is not enough", body: "Observed non-sinning is empirical; infallibility claims certainty stronger than an observer's limited history." },
    { heading: "3. Raise the freedom problem", body: "If sin is impossible, is the person compelled? Use divine justice to distinguish weakness-based inability from perfection-based moral impossibility." },
    { heading: "4. Compare angels and human infallibles", body: "Affirm angelic obedience, then note that human obedience occurs amid hunger, anger, desire, pain, and pressure." },
    { heading: "5. Preserve real humanity", body: "The Qur'an insists on prophetic humanity. Real hunger, pain, and emotion give fasting, patience, sacrifice, and restraint their exemplary force." },
    { heading: "6. Ethical bridge: self-mastery", body: "Ordinary believers do not claim theological infallibility, but they can learn self-government: desires exist without becoming rulers of judgment." },
    { heading: "7. Move from infallibility to Imamate", body: "Use Abraham and Qur'an 2:124 to distinguish divine offices and connect covenant with moral qualification." },
  ],
  closingUr:
    "اختتام میں عقیدہ اور اخلاق کو جوڑیں: معصوم کی پہچان صرف اس لیے نہیں کہ ہم ایک بلند مقام کا اعتراف کریں، بلکہ اس لیے بھی کہ ہمیں معلوم ہو انسان کی اصل عظمت نفس کے ہر جذبے کو ختم کرنے میں نہیں، بلکہ ان سب کے ہوتے ہوئے حق کو حاکم رکھنے میں ہے۔",
  closingEn:
    "Close by joining doctrine and ethics: recognizing the infallible is not only acknowledging a lofty station; it also teaches that human greatness lies not in having no impulses, but in keeping truth and moral judgment sovereign over them.",
};

const QURAN_HIDAYAT: SermonDossier = {
  topicId: "quran-hidayat",
  titleUr: "قرآن اور ہدایت — کتاب سے زندگی تک",
  titleEn: "Qur'an and guidance — from revelation to lived direction",
  thesisUr:
    "علامہ طالب جوہریؒ کی کتاب «منصبِ ہدایت اور قرآن» میں قرآن کو صرف پڑھنے، حفظ کرنے یا ثواب حاصل کرنے کی کتاب نہیں سمجھا گیا، بلکہ ایسا زندہ میزان قرار دیا گیا ہے جو ایمان، فکر، اطاعت، کردار، دنیا و آخرت اور اجتماعی زندگی کو سمت دیتا ہے۔ اسی قرآنی ہدایت کے اندر رسول اکرمؐ کی اطاعت اور معتبر دینی رہنمائی کی ضرورت بھی سامنے آتی ہے۔",
  thesisEn:
    "In Talib Johari's Mansab-e-Hidayat aur Qur'an, the Qur'an is treated not merely as a text for recitation, memorization, or reward, but as a living criterion that directs faith, thought, obedience, character, worldly priorities, and communal life. Within that Qur'anic guidance, obedience to the Messenger and the need for authoritative religious guidance also emerge.",
  governingQuestionUr:
    "قرآن ہمارے گھروں میں موجود ہے، تلاوت بھی ہوتی ہے؛ پھر سوال یہ ہے کہ کیا قرآن ہمارے فیصلوں، وفاداریوں، اختلافات اور اخلاق کا واقعی معیار بھی ہے؟",
  governingQuestionEn:
    "The Qur'an is present in our homes and recited regularly; but is it actually the criterion for our decisions, loyalties, disagreements, and character?",
  primaryTexts: [
    {
      id: "quran-hidayat-isra-9",
      kind: "quran",
      refUr: "قرآن مجید — سورۂ اسراء 17:9",
      refEn: "Qur'an 17:9",
      quranLocation: { surah: 17, ayah: 9 },
      sourceRefUr: "سورۂ اسراء 17:9۔",
      sourceRefEn: "Qur'an 17:9.",
      explanationUr: "قرآن کو ایسی زندہ ہدایت کے طور پر قائم کرنے کی مرکزی آیت جو انسان کو زیادہ سیدھی اور قائم راہ کی طرف لے جاتی ہے۔",
      explanationEn: "The central verse establishing the Qur'an as living guidance toward the most upright path.",
    },
    {
      id: "quran-hidayat-nisa-59",
      kind: "quran",
      refUr: "قرآن مجید — سورۂ نساء 4:59",
      refEn: "Qur'an 4:59",
      quranLocation: { surah: 4, ayah: 59 },
      sourceRefUr: "سورۂ نساء 4:59۔",
      sourceRefEn: "Qur'an 4:59.",
      explanationUr: "ہدایت کے نظام میں اللہ اور رسولؐ کی اطاعت کے باہمی تعلق کو واضح کرنے کے لیے۔",
      explanationEn: "Use to show the relationship between divine guidance and obedience to the Messenger.",
    },
    {
      id: "quran-hidayat-hashr-7",
      kind: "quran",
      refUr: "قرآن مجید — سورۂ حشر 59:7",
      refEn: "Qur'an 59:7",
      quranLocation: { surah: 59, ayah: 7 },
      sourceRefUr: "سورۂ حشر 59:7۔",
      sourceRefEn: "Qur'an 59:7.",
      explanationUr: "قرآن اور رسولؐ کی عملی رہنمائی کو ایک دوسرے کے مقابل نہیں بلکہ ایک مربوط نظامِ ہدایت کے طور پر پیش کرنے کے لیے۔",
      explanationEn: "Use to present Qur'anic authority and Prophetic guidance as one connected order of guidance.",
    },
    {
      id: "quran-hidayat-covenant",
      kind: "hadith",
      refUr: "امام صادقؑ — قرآن خدا کا عہد ہے",
      refEn: "Imam al-Sadiq — the Qur'an is God's covenant",
      sourceArabic: "القرآن عهد الله إلى خلقه فقد ينبغي للمرء المسلم أن ينظر في عهده وأن يقرأ منه في كل يوم خمسين آية.",
      sourceRefUr: "الکافی، ج2، ص609، باب فی قراءتہ، ح1۔",
      sourceRefEn: "al-Kafi, vol.2, p.609, chapter on its recitation, hadith 1.",
      explanationUr: "یہ روایت قرآن کے ساتھ تعلق کو موسمی یا رسمی تلاوت کے بجائے روزانہ عہد کی تجدید بناتی ہے۔",
      explanationEn: "The narration frames engagement with the Qur'an as a daily renewal of God's covenant.",
      sourceUrl: "https://lib.eshia.ir/11005/2/609",
    },
    {
      id: "quran-hidayat-treasuries",
      kind: "hadith",
      refUr: "امام زین العابدینؑ — آیاتِ قرآن خزانے ہیں",
      refEn: "Imam Zayn al-Abidin — Qur'anic verses are treasuries",
      sourceArabic: "آيات القرآن خزائن فكلما فتحت خزانة ينبغي لك أن تنظر ما فيها.",
      sourceRefUr: "الکافی، ج2، ص609، باب فی قراءتہ، ح2۔",
      sourceRefEn: "al-Kafi, vol.2, p.609, chapter on its recitation, hadith 2.",
      explanationUr: "خطیب اس روایت سے تلاوت کو تدبر سے جوڑ سکتا ہے: ہر آیت محض پڑھی جانے والی سطر نہیں بلکہ کھولا جانے والا خزانہ ہے۔",
      explanationEn: "This narration connects recitation with reflection: every verse is a treasury to be opened and examined.",
      sourceUrl: "https://lib.eshia.ir/11005/2/609",
    },
    {
      id: "quran-hidayat-people",
      kind: "hadith",
      refUr: "رسول اکرمؐ — اہلِ قرآن کا بلند مقام",
      refEn: "The Prophet — the high station of the people of the Qur'an",
      sourceArabic: "إن أهل القرآن في أعلى درجة من الآدميين ما خلا النبيين والمرسلين فلا تستضعفوا أهل القرآن حقوقهم فإن لهم من الله العزيز الجبار لمكانا عليا.",
      sourceRefUr: "الکافی، ج2، ص603، باب فضل حامل القرآن، ح1۔",
      sourceRefEn: "al-Kafi, vol.2, p.603, chapter on the merit of the bearer of the Qur'an, hadith 1.",
      explanationUr: "یہ روایت قرآن سے حقیقی وابستگی کو انسان کے دینی مقام اور ذمہ داری دونوں سے جوڑتی ہے۔",
      explanationEn: "The narration connects genuine attachment to the Qur'an with religious rank and responsibility.",
      sourceUrl: "https://lib.eshia.ir/11005/2/603",
    },
    {
      id: "quran-hidayat-memorise-act",
      kind: "hadith",
      refUr: "امام صادقؑ — قرآن یاد کرنے کے ساتھ عمل",
      refEn: "Imam al-Sadiq — preserving the Qur'an and acting upon it",
      sourceArabic: "الحافظ للقرآن العامل به مع السفرة الكرام البررة.",
      sourceRefUr: "الکافی، ج2، ص603، باب فضل حامل القرآن، ح2۔",
      sourceRefEn: "al-Kafi, vol.2, p.603, chapter on the merit of the bearer of the Qur'an, hadith 2.",
      explanationUr: "اس روایت کا مرکزی لفظ «العامل به» ہے: قرآن کی عظمت صرف حفظ میں نہیں، اس کے مطابق زندگی بنانے میں ہے۔",
      explanationEn: "The key phrase is acting upon it: the Qur'an's formative power is not exhausted by memorization.",
      sourceUrl: "https://lib.eshia.ir/11005/2/603",
    },
    {
      id: "quran-hidayat-learn",
      kind: "hadith",
      refUr: "رسول اکرمؐ — قرآن سیکھو",
      refEn: "The Prophet — learn the Qur'an",
      sourceArabic: "تعلموا القرآن فإنه يأتي يوم القيامة صاحبه في صورة شاب جميل شاحب اللون.",
      sourceRefUr: "الکافی، ج2، ص603، باب فضل حامل القرآن، ح3۔",
      sourceRefEn: "al-Kafi, vol.2, p.603, chapter on the merit of the bearer of the Qur'an, hadith 3.",
      explanationUr: "یہ روایت قرآن کے ساتھ زندگی بھر کے تعلق کو آخرت تک جاری رہنے والی رفاقت کے طور پر پیش کرتی ہے۔",
      explanationEn: "The narration presents learning the Qur'an as a companionship whose effect continues into the Hereafter.",
      sourceUrl: "https://lib.eshia.ir/11005/2/603",
    },
    {
      id: "quran-hidayat-youth",
      kind: "hadith",
      refUr: "امام صادقؑ — نوجوان مومن اور قرآن",
      refEn: "Imam al-Sadiq — the believing youth and the Qur'an",
      sourceArabic: "من قرأ القرآن وهو شاب مؤمن اختلط القرآن بلحمه ودمه وجعله الله عز وجل مع السفرة الكرام البررة.",
      sourceRefUr: "الکافی، ج2، ص603، باب فضل حامل القرآن، ح4۔",
      sourceRefEn: "al-Kafi, vol.2, p.603, chapter on the merit of the bearer of the Qur'an, hadith 4.",
      explanationUr: "یہ روایت نوجوانی میں قرآن سے گہری وابستگی کو شخصیت کی تشکیل تک لے جاتی ہے: قرآن گویا گوشت اور خون میں رچ بس جاتا ہے۔",
      explanationEn: "The narration portrays early Qur'anic formation as something that becomes woven into the believer's very being.",
      sourceUrl: "https://lib.eshia.ir/11005/2/603",
    },
    {
      id: "quran-hidayat-humility",
      kind: "hadith",
      refUr: "رسول اکرمؐ — حاملِ قرآن میں تواضع اور حلم",
      refEn: "The Prophet — humility and forbearance in the bearer of the Qur'an",
      sourceArabic: "يا حامل القرآن تواضع به يرفعك الله ولا تعزز به فيذلك الله ... ولكنه يعفو ويصفح ويغفر ويحلم لتعظيم القرآن.",
      sourceRefUr: "الکافی، ج2، ص604، باب فضل حامل القرآن، ح5۔",
      sourceRefEn: "al-Kafi, vol.2, p.604, chapter on the merit of the bearer of the Qur'an, hadith 5.",
      explanationUr: "یہ روایت قرآن کو کردار کا معیار بناتی ہے: علمِ قرآن تکبر، غصہ اور سختی نہیں بلکہ تواضع، عفو اور حلم پیدا کرے۔",
      explanationEn: "The narration makes character the test of Qur'anic formation: humility, pardon, and forbearance rather than pride.",
      sourceUrl: "https://lib.eshia.ir/11005/2/604",
    },
    {
      id: "quran-hidayat-companionship",
      kind: "hadith",
      refUr: "امام زین العابدینؑ — قرآن کی معیت میں تنہائی نہیں",
      refEn: "Imam Zayn al-Abidin — no loneliness with the Qur'an",
      sourceArabic: "لو مات من بين المشرق والمغرب لما استوحشت بعد أن يكون القرآن معي.",
      sourceRefUr: "الکافی، ج2، ص602، ح13۔",
      sourceRefEn: "al-Kafi, vol.2, p.602, hadith 13.",
      explanationUr: "یہ روایت قرآن کو محض مطالعے کی کتاب نہیں بلکہ مؤمن کی باطنی رفاقت اور سہارا بناتی ہے۔",
      explanationEn: "The narration presents the Qur'an not merely as a text to study but as inward companionship and support.",
      sourceUrl: "https://lib.eshia.ir/11005/2/602",
    },
  ],
  perspectives: [
    {
      id: "talib-quran-living-guidance",
      speakerId: "talib-johari",
      nameUr: "علامہ طالب جوہریؒ",
      nameEn: "Allama Talib Johari",
      sourceTitleUr: "مجلس اول و سوم — قرآن بحیثیت زندہ ہدایت",
      sourceTitleEn: "Majalis 1 and 3 — the Qur'an as living guidance",
      sourceUrl: "https://maablib.org/mansb-e-hidayat-aur-quran-by-talib-johri/",
      coreUr:
        "طالب جوہریؒ سورۂ اسراء 17:9 کے «يَهْدِي لِلَّتِي هِيَ أَقْوَمُ» کو مرکزی بنیاد بناتے ہیں۔ ان کے بیان میں قرآن کی عظمت صرف اس کے مقدس ہونے میں نہیں بلکہ اس بات میں ہے کہ وہ انسان کو زیادہ درست، زیادہ قائم اور زیادہ محفوظ راہ دکھاتا ہے۔",
      coreEn:
        "Johari centers Qur'an 17:9. The Qur'an's greatness lies not only in sacredness but in its function of directing human beings toward the most upright and enduring path.",
      explanationUr: [
        "وہ سامع کو تلاوت سے عمل کی طرف لے جاتے ہیں: قرآن کا احترام اپنی جگہ، مگر ہدایت کا حقیقی اثر اس وقت ظاہر ہوتا ہے جب انسان کے فیصلے اور ترجیحات اس کے معیار سے بدلیں۔",
        "مختلف دینی دعووں اور اختلافات کے درمیان قرآن کو میزان بنانا ان کی گفتگو کا نمایاں رخ ہے۔ شخصیت، جماعت یا جذبات کے بجائے اصل سوال یہ ہو کہ قرآن کس سمت لے جا رہا ہے۔",
        "اس زاویے سے خطیب قرآن کی مجلس کو محض فضائلِ قرآن کی فہرست سے نکال کر زندگی کے عملی سوالات سے جوڑ سکتا ہے۔",
      ],
      explanationEn: [
        "He moves the listener from recitation toward action: respect for the Qur'an is incomplete if decisions and priorities remain unchanged.",
        "The Qur'an becomes the criterion amid competing religious claims and disagreements.",
        "This allows a preacher to move beyond listing virtues of the Qur'an toward practical questions of life.",
      ],
      styleUr:
        "انداز: ایک مرکزی آیت، پھر موجودہ زندگی کا سوال، اس کے بعد قرآن کو فیصلہ کن میزان کے طور پر سامنے لانا۔",
      styleEn:
        "Style: one central verse, then a contemporary human question, followed by the Qur'an as the decisive criterion.",
      useUr:
        "ابتدا ہی میں سامع سے پوچھیں: قرآن میرے گھر میں کہاں رکھا ہے یہ آسان سوال ہے؛ مشکل سوال یہ ہے کہ میرے فیصلوں میں قرآن کہاں رکھا ہے؟",
      useEn:
        "Open by asking not where the Qur'an is kept in the home, but where it stands in one's decisions.",
      originalSnippet: "اِنَّ هٰذَا الْقُرْاٰنَ يَهْدِيْ لِلَّتِيْ هِيَ اَقْوَمُ",
    },
    {
      id: "talib-faith-becomes-character",
      speakerId: "talib-johari",
      nameUr: "علامہ طالب جوہریؒ",
      nameEn: "Allama Talib Johari",
      sourceTitleUr: "مجالس دوم، چہارم اور ششم — ایمان، علم اور انسانی فضیلت",
      sourceTitleEn: "Majalis 2, 4, and 6 — faith, knowledge, and human excellence",
      sourceUrl: "https://maablib.org/mansb-e-hidayat-aur-quran-by-talib-johri/",
      coreUr:
        "ان مجالس میں ہدایت کو محض ذہنی معلومات نہیں رہنے دیا جاتا۔ علم کی قدر اس وقت ہے جب وہ انسان کے کردار کو سنوارے، اور ایمان کی صداقت اس وقت ظاہر ہوتی ہے جب وہ زبان، تعلقات، معاملات اور ترجیحات میں اپنا اثر دکھائے۔",
      coreEn:
        "These majalis refuse to reduce guidance to information. Knowledge has value when it forms character, and faith becomes credible when its effects appear in speech, relationships, conduct, and priorities.",
      explanationUr: [
        "طالب جوہریؒ مومن کی شناخت کو نام اور نسبت سے نکال کر عمل کے میدان میں لاتے ہیں۔",
        "وہ انسانی فضیلت کو دولت، نسب اور ظاہری مرتبے کے بجائے خدا کی میزان سے پرکھنے کی دعوت دیتے ہیں۔",
        "یہاں قرآن ایک فکری کتاب ہی نہیں رہتا؛ وہ انسان کی قدر، کامیابی اور ناکامی کی تعریف بھی بدلتا ہے۔",
      ],
      explanationEn: [
        "Johari moves the identity of the believer from labels into conduct.",
        "Human excellence is measured by God's criterion rather than wealth, lineage, or status.",
        "The Qur'an does not only shape ideas; it redefines human worth, success, and failure.",
      ],
      styleUr:
        "انداز: عام انسانی تصور کو سامنے رکھنا، پھر قرآنی معیار سے اس کی اصلاح کرنا اور آخر میں سامع کو خود احتسابی کی طرف لے جانا۔",
      styleEn:
        "Style: begin with a common human assumption, correct it through a Qur'anic criterion, then turn the argument toward self-examination.",
      useUr:
        "سامع سے کہیں: اگر میری مذہبی شناخت زبان سے نہ بتائی جائے تو کیا میرا کردار خود میرے ایمان کی گواہی دے گا؟",
      useEn:
        "Ask whether one's character would testify to faith even if one's religious identity were not verbally announced.",
    },
    {
      id: "talib-quran-obedience-rasul",
      speakerId: "talib-johari",
      nameUr: "علامہ طالب جوہریؒ",
      nameEn: "Allama Talib Johari",
      sourceTitleUr: "مجلس ہشتم — قرآن اور اطاعتِ رسولؐ",
      sourceTitleEn: "Majlis 8 — Qur'an and obedience to the Messenger",
      sourceUrl: "https://maablib.org/mansb-e-hidayat-aur-quran-by-talib-johri/",
      coreUr:
        "طالب جوہریؒ قرآن اور رسولؐ کو ایک دوسرے کے مقابل رکھنے کے بجائے ایک ہی نظامِ ہدایت کے دو مربوط پہلو قرار دیتے ہیں۔ قرآن خود رسولؐ کی اطاعت کا حکم دیتا ہے؛ اس لیے صاحبِ قرآن کی دینی رہنمائی کو قرآن سے باہر سمجھنا خود قرآنی منہج کے خلاف ہے۔",
      coreEn:
        "Johari refuses to set the Qur'an and the Messenger against each other. The Qur'an itself commands obedience to the Messenger, so Prophetic guidance belongs within the Qur'anic order of guidance.",
      explanationUr: [
        "وہ احترام اور اطاعت میں فرق پیدا کرتے ہیں۔ رسولؐ سے محبت و احترام ضروری ہے، مگر اطاعت اس سے آگے بڑھ کر اپنے فیصلے اور عمل کو ان کی دینی رہنمائی کے تابع کرنا ہے۔",
        "یہی مقام منصبِ ہدایت کی بحث کا دروازہ کھولتا ہے: اگر خدا کی ہدایت صرف متن دینے پر ختم نہیں ہوتی تو معتبر ہادی کی ضرورت کو بھی اسی قرآن کے اندر سے سمجھنا ہوگا۔",
        "اس ترتیب میں امامت قرآن کے مقابل کوئی اضافی دعویٰ نہیں رہتی؛ پہلے معتبر رہنمائی کا قرآنی اصول قائم ہوتا ہے، پھر اس کے استمرار کا سوال پیدا ہوتا ہے۔",
      ],
      explanationEn: [
        "He distinguishes respect from obedience: obedience submits judgment and action to Prophetic religious guidance.",
        "This opens the question of the office of guidance: if divine guidance is not exhausted by delivering a text, authoritative guidance must be understood from within the Qur'an itself.",
        "Imamate therefore enters after the Qur'anic principle of authoritative guidance has been established.",
      ],
      styleUr:
        "انداز: پہلے ایسا اصول قائم کرنا جس پر سامع پہلے سے متفق ہو، پھر اسی اصول کے منطقی تقاضے کو اگلے دینی مسئلے تک لے جانا۔",
      styleEn:
        "Style: establish an agreed principle first, then follow its implications into the next religious question.",
      useUr:
        "امامت کا نام آغاز ہی میں لے کر بحث کو دفاعی نہ بنائیں؛ پہلے قرآن سے اطاعتِ رسولؐ اور معتبر ہدایت کا اصول قائم کریں۔",
      useEn:
        "Do not begin defensively with the label of Imamate; first establish Qur'anic obedience to the Messenger and authoritative guidance.",
    },
    {
      id: "talib-guidance-continuity-karbala",
      speakerId: "talib-johari",
      nameUr: "علامہ طالب جوہریؒ",
      nameEn: "Allama Talib Johari",
      sourceTitleUr: "مجلس نہم اور شامِ غریباں — ہدایت کا تسلسل اور کربلا",
      sourceTitleEn: "Majlis 9 and Sham-e-Ghariban — continuity of guidance and Karbala",
      sourceUrl: "https://maablib.org/mansb-e-hidayat-aur-quran-by-talib-johri/",
      coreUr:
        "سلسلے کے آخری حصے میں طالب جوہریؒ قرآن، رسولؐ کی اطاعت، اہلِ بیتؑ اور کربلا کو الگ الگ خانوں میں نہیں رکھتے۔ ہدایت کا علمی اصول آخرکار وفاداری کے عملی امتحان میں داخل ہوتا ہے، اور کربلا اس سوال کا جواب بن جاتی ہے کہ صحیح ہدایت پہچان لینے کے بعد انسان اس کے لیے کتنی قیمت دینے کو تیار ہے۔",
      coreEn:
        "In the closing part of the series, Johari does not isolate Qur'an, obedience to the Messenger, Ahl al-Bayt, and Karbala. The intellectual principle of guidance enters the practical test of fidelity.",
      explanationUr: [
        "نویں مجلس میں منصبِ ہدایت کا سوال پورے سلسلے کی قرآنی بحث کو سمیٹتا ہے۔",
        "شامِ غریباں میں وہ علمی بحث کو اچانک چھوڑ کر مصائب کی طرف نہیں جاتے؛ کربلا کو اسی ہدایت اور اطاعت کے اصول کی زندہ قیمت کے طور پر سامنے لاتے ہیں۔",
        "یہ منبر کے لیے بڑا سبق ہے: مصائب علمی مجلس کا غیر متعلق ضمیمہ نہیں، بلکہ اسی مرکزی دینی نکتے کا انسانی اور عاطفی ظہور بن سکتے ہیں۔",
      ],
      explanationEn: [
        "Majlis 9 gathers the Qur'anic argument into the question of the continuing office of guidance.",
        "In Sham-e-Ghariban, Karbala becomes the lived cost of the same principle of obedience and guidance rather than an unrelated emotional appendix.",
        "For preaching, masaib can become the human and devotional manifestation of the sermon's central religious principle.",
      ],
      styleUr:
        "انداز: علمی مقدمہ → دینی ذمہ داری → تاریخی مظہر → مصائب؛ یوں علم اور عاطفہ ایک ہی مرکزی نکتے کے دو رخ بن جاتے ہیں۔",
      styleEn:
        "Style: intellectual premise → religious responsibility → historical manifestation → masaib.",
      useUr:
        "اگر مجلس کا مرکزی موضوع ہدایت ہے تو مصائب میں بھی اسی سوال کو زندہ رکھیں: حق پہچاننے کے بعد اس کے ساتھ وفاداری کی قیمت کیا ہے؟",
      useEn:
        "If guidance is the central theme, keep the same question alive in masaib: what is the cost of fidelity after truth has been recognized?",
    },
    {
      id: "talib-pulpit-method",
      speakerId: "talib-johari",
      nameUr: "علامہ طالب جوہریؒ",
      nameEn: "Allama Talib Johari",
      sourceTitleUr: "پورے مجموعے سے اخذ کردہ منبری طریقۂ کار",
      sourceTitleEn: "Pulpit method derived from the complete collection",
      sourceUrl: "https://maablib.org/mansb-e-hidayat-aur-quran-by-talib-johri/",
      coreUr:
        "اس مجموعے میں طالب جوہریؒ کی نمایاں قوت یہ ہے کہ وہ مشکل علمی مسئلے کو سوال، مکالمے اور عام مثال کے ذریعے سامع کے قریب لاتے ہیں؛ پھر قرآنی آیات کے باہمی ربط سے نتیجہ بناتے ہیں۔ ان کا منبر سیدھی لکیر میں صرف معلومات نہیں سناتا بلکہ سامع کو سوچنے کے عمل میں شریک کرتا ہے۔",
      coreEn:
        "Across the collection, Johari repeatedly brings difficult ideas close to the listener through questions, dialogue, and ordinary examples, then builds conclusions by connecting Qur'anic passages.",
      explanationUr: [
        "وہ کئی جگہ سوال خود قائم کرتے ہیں، ممکنہ جواب بھی زبان پر لاتے ہیں، پھر اس کی کمزوری دکھا کر اگلا مرحلہ کھولتے ہیں۔",
        "روزمرہ گفتگو، استاد و شاگرد، گھر، معاشرہ اور انسانی تجربے کی مثالیں علمی بحث کو خشک ہونے سے بچاتی ہیں۔",
        "پچھلی بات کو یاد دلا کر اگلی آیت یا اگلے مسئلے تک جانا پورے سلسلے میں تسلسل پیدا کرتا ہے۔",
        "اختتام میں علمی بحث کو کردار یا مصائب تک پہنچانا ان کے منبر کو صرف ذہنی مشق نہیں رہنے دیتا۔",
      ],
      explanationEn: [
        "He often voices the question himself, offers a possible answer, then exposes its weakness before moving forward.",
        "Ordinary conversation and human situations prevent the scholarly argument from becoming dry.",
        "Recalling earlier points before adding a new verse creates continuity across the series.",
        "Moving the argument into character or masaib prevents the sermon from remaining purely intellectual.",
      ],
      styleUr:
        "انداز: سوال قائم کریں، سامع کے ممکنہ جواب کو سامنے لائیں، عام مثال سے مفہوم روشن کریں، پھر قرآن سے فیصلہ کن سمت دیں۔",
      styleEn:
        "Style: construct the question, voice the listener's likely response, clarify with an ordinary example, then let the Qur'an give the decisive direction.",
      useUr:
        "طالب جوہریؒ کے الفاظ یا لہجے کی نقل نہ کریں؛ ان کی یہ علمی ترکیب اپنائیں کہ سامع کو نتیجہ سنانے کے بجائے استدلال کے سفر میں اپنے ساتھ لے کر چلیں۔",
      useEn:
        "Do not imitate Johari's wording or mannerisms; adopt the intellectual technique of taking the listener through the reasoning rather than merely announcing the conclusion.",
    },
  ],
  synthesisUr: [
    "اس پورے موضوع کی پہلی بنیاد یہ ہے کہ قرآن **زندہ ہدایت** ہے؛ دوسری یہ کہ ہدایت انسان کے کردار اور فیصلے میں ظاہر ہونی چاہیے؛ تیسری یہ کہ قرآن خود رسولؐ کی اطاعت کا حکم دیتا ہے؛ اور چوتھی یہ کہ معتبر دینی رہنمائی کا سوال قرآن کے مقابل نہیں بلکہ قرآن ہی کے اندر سے پیدا ہوتا ہے۔",
    "طالب جوہریؒ کے منبر کا فائدہ یہ ہے کہ وہ سامع کو ایک دم آخری نتیجے پر نہیں لے جاتے۔ پہلے مشترک قرآنی بنیاد بناتے ہیں، پھر سوال پیدا کرتے ہیں، پھر اطاعت اور ہدایت کے تقاضے کھولتے ہیں۔ اس ترتیب سے امامت کی بحث بھی دفاعی مناظرہ بننے کے بجائے نظامِ ہدایت کی فطری اگلی منزل بن سکتی ہے۔",
    "کربلا اس بحث کا عاطفی ضمیمہ نہیں بلکہ عملی امتحان ہے: ہدایت پہچان لینے کے بعد کیا انسان اپنے مفاد، خوف اور دباؤ کے باوجود اس کے ساتھ کھڑا رہتا ہے؟",
  ],
  synthesisEn: [
    "The sequence is: Qur'an as living guidance; guidance becoming visible in character and decision; the Qur'an itself commanding obedience to the Messenger; and the question of authoritative guidance arising from within the Qur'anic order rather than against it.",
    "Johari does not rush the listener to the final conclusion. He builds shared Qur'anic ground, raises the question, then unfolds the implications of obedience and guidance.",
    "Karbala becomes the practical test of whether recognized guidance is followed despite cost, fear, and pressure.",
  ],
  pulpitFlowUr: [
    {
      heading: "1. قرآن گھر میں موجود ہے؛ کیا زندگی میں بھی موجود ہے؟",
      body:
        "سورۂ اسراء 17:9 سے آغاز کریں۔ سامع سے پوچھیں: ہم قرآن کو کہاں رکھتے ہیں، یہ معلوم ہے؛ مگر جب خاندان، کاروبار، اختلاف یا غصے میں فیصلہ کرنا ہو تو کیا قرآن واقعی میزان بنتا ہے؟ ہدایت کا مطلب یہی ہے کہ کتاب زندگی کی سمت بدل دے۔",
    },
    {
      heading: "2. ہدایت اور معلومات میں فرق",
      body:
        "دینی معلومات بہت ہونا خود ہدایت کی ضمانت نہیں۔ طالب جوہریؒ کی مجالس سے یہ نکتہ نکالیں کہ ایمان اور علم کی صداقت کردار میں ظاہر ہونی چاہیے۔ اگر معلومات بڑھیں مگر زبان، معاملات اور ترجیحات نہ بدلیں تو قرآن سے تعلق ابھی عملی ہدایت تک نہیں پہنچا۔",
    },
    {
      heading: "3. قرآن خود رسولؐ کی طرف لے جاتا ہے",
      body:
        "اب اطاعت کی آیات لائیں۔ سوال یہ نہ ہو کہ قرآن کافی ہے یا رسولؐ؛ سوال یہ ہو کہ خود قرآن رسولؐ کے بارے میں کیا حکم دیتا ہے۔ جب قرآن اطاعتِ رسولؐ کو دینی اطاعت کا حصہ بناتا ہے تو قرآن اور صاحبِ قرآن کو مقابل رکھنا درست نہیں رہتا۔",
    },
    {
      heading: "4. احترام سے آگے: اطاعت کیا ہے؟",
      body:
        "رسولؐ سے محبت اور احترام ضروری ہیں، مگر اطاعت کا مطلب یہ ہے کہ اپنے فیصلے کو معتبر دینی ہدایت کے تابع کیا جائے۔ یہاں سامع سے پوچھیں: میں جس بات سے محبت کا دعویٰ کرتا ہوں، کیا اختلاف کی صورت میں اس کی رہنمائی کو اپنے نفس پر مقدم بھی کرتا ہوں؟",
    },
    {
      heading: "5. یہی مقام منصبِ ہدایت کا سوال پیدا کرتا ہے",
      body:
        "اب کہیں کہ اصل بحث یہ نہیں کہ قرآن کے علاوہ کوئی دوسری کتاب چاہیے؛ اصل سوال یہ ہے کہ قرآن نے خود ہدایت سمجھانے، نافذ کرنے اور محفوظ رکھنے کے لیے معتبر رہنمائی کا کیا اصول دیا ہے۔ یہاں سے امامت کی طرف علمی راستہ قدرتی طور پر کھلتا ہے۔",
    },
    {
      heading: "6. طالب جوہریؒ کی منبری ترکیب اپنائیں",
      body:
        "نتیجہ فوراً نہ سنائیں۔ پہلے سوال، پھر ممکنہ اعتراض، پھر عام مثال، پھر آیت۔ سامع کو اپنی بات کا محض مخاطب نہیں بلکہ استدلال کے سفر کا شریک بنائیں۔ مشکل بات اسی وقت آسان ہوتی ہے جب سامع دیکھ سکے کہ نتیجہ کہاں سے نکلا۔",
    },
    {
      heading: "7. کربلا: ہدایت پہچاننے کے بعد وفاداری",
      body:
        "اختتام میں علمی گفتگو کو کربلا سے یوں جوڑیں کہ ربط ٹوٹے نہیں۔ ہدایت پہچان لینا پہلا مرحلہ ہے؛ اس کے ساتھ کھڑا رہنا دوسرا۔ کربلا بتاتی ہے کہ حق کا علم جب جان، مال، خاندان اور خوف کے امتحان میں آئے تو وفاداری کی حقیقت سامنے آتی ہے۔",
    },
  ],
  pulpitFlowEn: [
    { heading: "1. The Qur'an is in the home—but is it in life?", body: "Begin with Qur'an 17:9 and ask whether the Qur'an actually becomes the criterion in family, business, disagreement, and anger." },
    { heading: "2. Guidance is more than information", body: "Religious information does not guarantee guidance. Faith and knowledge must become visible in character, speech, dealings, and priorities." },
    { heading: "3. The Qur'an itself leads to the Messenger", body: "Use verses of obedience. The question is not Qur'an versus Messenger, but what the Qur'an itself commands regarding obedience to the Messenger." },
    { heading: "4. Beyond respect: what is obedience?", body: "Love and respect matter, but obedience means submitting one's judgment and action to authoritative religious guidance." },
    { heading: "5. The question of the office of guidance now arises", body: "The issue is not another book beside the Qur'an; it is what order of authoritative guidance the Qur'an itself establishes." },
    { heading: "6. Use Johari's pulpit method", body: "Do not announce the result immediately. Build the question, voice the objection, use an ordinary example, then return to the verse." },
    { heading: "7. Karbala: fidelity after recognizing guidance", body: "Karbala becomes the test of whether recognized truth is followed despite fear, cost, and pressure." },
  ],
  closingUr:
    "سامع کو ایک عملی عہد دیں: اس ہفتے کسی ایک اہم فیصلے سے پہلے صرف یہ سوال کرے—میں جو چاہتا ہوں وہ ایک طرف، قرآن مجھے کس سمت لے جا رہا ہے؟ پھر معتبر دینی رہنمائی سے اپنے فہم کی تصدیق کرے۔ قرآن اسی وقت ہدایت بنتا ہے جب وہ ہمارے فیصلے پر حکومت کرے۔",
  closingEn:
    "Give the listener one practical commitment: before one important decision this week, ask not only what I want, but where the Qur'an directs me, then test that understanding through authoritative religious guidance.",
};

const DOSSIERS: readonly SermonDossier[] = [
  SABR,
  IMAMATE,
  DUA,
  ISMAH,
  QURAN_HIDAYAT,
  PARENTS_BARSI_DOSSIER,
];

export function getTopicDossier(topicId: string): SermonDossier | null {
  const dossier = DOSSIERS.find((item) => item.topicId === topicId);
  if (!dossier) return null;
  return {
    ...dossier,
    titleUr: pureKhateebUrdu(dossier.titleUr),
    thesisUr: pureKhateebUrdu(dossier.thesisUr),
    governingQuestionUr: pureKhateebUrdu(dossier.governingQuestionUr),
    primaryTexts: dossier.primaryTexts?.map((item) => ({
      ...item,
      refUr: pureKhateebUrdu(item.refUr),
      sourceRefUr: pureKhateebUrdu(item.sourceRefUr),
      explanationUr: pureKhateebUrdu(item.explanationUr),
    })),
    perspectives: dossier.perspectives.map((item) => ({
      ...item,
      nameUr: pureKhateebUrdu(item.nameUr),
      sourceTitleUr: pureKhateebUrdu(item.sourceTitleUr),
      coreUr: pureKhateebUrdu(item.coreUr),
      explanationUr: item.explanationUr.map(pureKhateebUrdu),
      styleUr: pureKhateebUrdu(item.styleUr),
      useUr: pureKhateebUrdu(item.useUr),
      readyUr: item.readyUr?.map((section) => ({
        heading: pureKhateebUrdu(section.heading),
        body: pureKhateebUrdu(section.body),
      })),
      sourceGroundedUr: item.sourceGroundedUr?.map((section) => ({
        ...section,
        heading: pureKhateebUrdu(section.heading),
        explanation: pureKhateebUrdu(section.explanation),
        exactRef: pureKhateebUrdu(section.exactRef),
      })),
      editorialBridgeUr: item.editorialBridgeUr
        ? pureKhateebUrdu(item.editorialBridgeUr)
        : undefined,
    })),
    synthesisUr: dossier.synthesisUr.map(pureKhateebUrdu),
    pulpitFlowUr: dossier.pulpitFlowUr.map((item) => ({
      heading: pureKhateebUrdu(item.heading),
      body: pureKhateebUrdu(item.body),
    })),
    closingUr: pureKhateebUrdu(dossier.closingUr),
  };
}

export function buildDossierText(
  dossier: SermonDossier,
  locale: SermonLocale,
): string {
  const ur = locale === "ur";
  const lines: string[] = [
    ur ? dossier.titleUr : dossier.titleEn,
    "",
    `${ur ? "مرکزی مقدمہ" : "Central thesis"}: ${ur ? dossier.thesisUr : dossier.thesisEn}`,
    `${ur ? "مرکزی سوال" : "Governing question"}: ${ur ? dossier.governingQuestionUr : dossier.governingQuestionEn}`,
  ];

  if (dossier.primaryTexts?.length) {
    lines.push("", ur ? "اصل آیات و روایات" : "Primary verses and narrations");
    for (const item of dossier.primaryTexts) {
      lines.push(
        "",
        ur ? item.refUr : item.refEn,
        item.kind === "quran" && item.quranLocation
          ? `قرآنی متن: ${item.quranLocation.surah}:${item.quranLocation.ayah} — داخلی Indo-Pak Ahmedgraf ذخیرے سے`
          : (item.sourceArabic ?? item.arabic ?? ""),
        `${ur ? "دقیق حوالہ" : "Exact reference"}: ${ur ? item.sourceRefUr : item.sourceRefEn}`,
        ur ? item.explanationUr : item.explanationEn,
      );
    }
  }

  lines.push(
    "",
    ur ? "اہلِ علم کے زاویے" : "Scholar perspectives",
  );

  for (const item of dossier.perspectives) {
    lines.push(
      "",
      `— ${ur ? item.nameUr : item.nameEn} —`,
      ur ? item.coreUr : item.coreEn,
    );
    for (const point of ur ? item.explanationUr : item.explanationEn) {
      lines.push(`• ${point}`);
    }
    const ready = ur ? item.readyUr : item.readyEn;
    if (ready?.length) {
      lines.push("", ur ? "تفصیلی قابلِ بیان مواد" : "Detailed speaking material");
      for (const section of ready) {
        lines.push(`${section.heading}\n${section.body}`);
      }
    }
    const grounded = ur ? item.sourceGroundedUr : item.sourceGroundedEn;
    if (grounded?.length) {
      lines.push("", ur ? "اصل ماخذ سے اخذ شدہ تفصیل" : "Source-grounded detail");
      for (const section of grounded) {
        lines.push(
          `${section.heading}\n${section.explanation}`,
          `${ur ? "دقیق حوالہ" : "Exact reference"}: ${section.exactRef}`,
        );
      }
    }
    const bridge = ur ? item.editorialBridgeUr : item.editorialBridgeEn;
    if (bridge) {
      lines.push(
        "",
        `${ur ? "منبری ربط — تدوینی" : "Editorial pulpit bridge"}: ${bridge}`,
      );
    }
    lines.push(`${ur ? "انداز" : "Style"}: ${ur ? item.styleUr : item.styleEn}`);
    lines.push(`${ur ? "منبر میں استعمال" : "Use on the pulpit"}: ${ur ? item.useUr : item.useEn}`);
    if (item.originalSnippet) lines.push(item.originalSnippet);
  }

  lines.push("", ur ? "منبری جامع نتیجہ" : "Sermonic synthesis");
  for (const point of ur ? dossier.synthesisUr : dossier.synthesisEn) lines.push(`• ${point}`);

  lines.push("", ur ? "قابلِ بیان ترتیب" : "Ready speaking flow");
  for (const item of ur ? dossier.pulpitFlowUr : dossier.pulpitFlowEn) {
    lines.push(`${item.heading}\n${item.body}`);
  }

  lines.push("", `${ur ? "اختتام" : "Closing"}: ${ur ? dossier.closingUr : dossier.closingEn}`);
  const text = lines.join("\n");
  return ur ? pureKhateebUrdu(text) : text;
}
