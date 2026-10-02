import type { SermonLocale } from "./sermonPrep";

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

const DOSSIERS: readonly SermonDossier[] = [SABR];

export function getTopicDossier(topicId: string): SermonDossier | null {
  return DOSSIERS.find((item) => item.topicId === topicId) ?? null;
}

export function buildDossierText(
  dossier: SermonDossier,
  locale: SermonLocale,
): string {
  const ur = locale === "ur";
  const lines: string[] = [
    ur ? dossier.titleUr : dossier.titleEn,
    "",
    `${ur ? "مرکزی thesis" : "Central thesis"}: ${ur ? dossier.thesisUr : dossier.thesisEn}`,
    `${ur ? "مرکزی سوال" : "Governing question"}: ${ur ? dossier.governingQuestionUr : dossier.governingQuestionEn}`,
    "",
    ur ? "اہلِ علم کے زاویے" : "Scholar perspectives",
  ];

  for (const item of dossier.perspectives) {
    lines.push(
      "",
      `— ${ur ? item.nameUr : item.nameEn} —`,
      ur ? item.coreUr : item.coreEn,
    );
    for (const point of ur ? item.explanationUr : item.explanationEn) {
      lines.push(`• ${point}`);
    }
    lines.push(`${ur ? "انداز" : "Style"}: ${ur ? item.styleUr : item.styleEn}`);
    lines.push(`${ur ? "منبر میں استعمال" : "Use on the pulpit"}: ${ur ? item.useUr : item.useEn}`);
  }

  lines.push("", ur ? "منبری synthesis" : "Sermonic synthesis");
  for (const point of ur ? dossier.synthesisUr : dossier.synthesisEn) lines.push(`• ${point}`);

  lines.push("", ur ? "قابلِ بیان ترتیب" : "Ready speaking flow");
  for (const item of ur ? dossier.pulpitFlowUr : dossier.pulpitFlowEn) {
    lines.push(`${item.heading}\n${item.body}`);
  }

  lines.push("", `${ur ? "اختتام" : "Closing"}: ${ur ? dossier.closingUr : dossier.closingEn}`);
  return lines.join("\n");
}
