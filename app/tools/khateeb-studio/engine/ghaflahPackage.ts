import type { TopicPrep } from "./topicPrep";
import type { SermonDossier } from "./topicDossier";
import type { SpeakerEvidence } from "./speakerEvidence";
import type { VerifiedHadithRecord } from "./verifiedHadithCorpus";
import type { MajlisSeriesLength, MajlisSeriesPlan } from "./seriesPlanner";

/** Source-backed Ghaflah theme. Incomplete scholars must never be presented as analysed. */
export const GHAF_LAH_TOPIC: TopicPrep = {
  "id": "ghaflah",
  "category": "spirituality",
  "titleUr": "غفلت: جاگتی آنکھیں، سویا ہوا دل",
  "titleEn": "Ghaflah: awake eyes, an inattentive heart",
  "themeUr": "غفلت صرف بھول جانے کا نام نہیں؛ یہ خدا، آخرت، اپنے نفس، دوسروں کے حقوق اور وقت کی حقیقت سے ایسی بے خبری ہے جو بظاہر مصروف اور مطمئن انسان کو بھی اندر سے بے سمت کردیتی ہے۔ قرآن سے مرض کی تشخیص کریں، نہج البلاغہ اور غرر الحکم سے بیداری کا مطالبہ سمجھائیں، پھر روزمرہ زندگی اور کربلا کے اخلاقی امتحان تک بحث لے جائیں۔",
  "themeEn": "Ghaflah is not merely forgetfulness: it is losing awareness of God, accountability, the self, others' rights and the use of time, even during intense activity. Move from Qur'anic diagnosis through source-grounded counsel to practical reform.",
  "openingUr": "کیا ممکن ہے کہ ہماری آنکھیں کھلی ہوں، زندگی مصروف ہو، عبادت جاری ہو، مگر دل اصل مقصد سے سویا ہوا ہو؟",
  "openingEn": "Can the eyes be open, the schedule crowded and worship visible while the heart remains asleep to its real purpose?",
  "quran": [
    {
      "ref": "الأعراف 7:179",
      "arabic": "أُولَٰئِكَ هُمُ الْغَافِلُونَ",
      "ur": "انسان کو آنکھ، کان اور دل ملے ہیں؛ سوال یہ ہے کہ وہ ان سے حقیقت کو پہچانتا بھی ہے یا نہیں۔",
      "en": "The issue is not lacking faculties but failing to use them to recognise truth."
    },
    {
      "ref": "الأنبياء 21:1",
      "arabic": "اقْتَرَبَ لِلنَّاسِ حِسَابُهُمْ وَهُمْ فِي غَفْلَةٍ مُّعْرِضُونَ",
      "ur": "حساب قریب آنے کے باوجود غفلت اور اعراض جاری رہنا اصل خطرہ ہے۔",
      "en": "Accountability approaches while people remain distracted and turn away."
    },
    {
      "ref": "الحديد 57:16",
      "arabic": "أَلَمْ يَأْنِ لِلَّذِينَ آمَنُوا أَن تَخْشَعَ قُلُوبُهُمْ",
      "ur": "اہلِ ایمان سے بھی دل کی بیداری اور خشوع کا مطالبہ ہے۔",
      "en": "Even believers are challenged to renew the humility of the heart."
    },
    {
      "ref": "الحشر 59:19",
      "arabic": "نَسُوا اللَّهَ فَأَنسَاهُمْ أَنفُسَهُمْ",
      "ur": "خدا کو بھولنا خود فراموشی کا سبب بنتا ہے۔",
      "en": "Forgetting God damages self-understanding."
    },
    {
      "ref": "المنافقون 63:9",
      "arabic": "لَا تُلْهِكُمْ أَمْوَالُكُمْ وَلَا أَوْلَادُكُمْ عَن ذِكْرِ اللَّهِ",
      "ur": "مال و اولاد نعمت ہیں؛ انہیں ذکرِ خدا سے غافل کردینے والا مقصد نہیں بننے دینا۔",
      "en": "Wealth and family need not be rejected; they must not eclipse remembrance."
    },
    {
      "ref": "ق 50:22",
      "arabic": "فَكَشَفْنَا عَنكَ غِطَاءَكَ",
      "ur": "قیامت کے انکشاف سے پہلے زندگی میں اپنی بصیرت کو جگانے کی دعوت۔",
      "en": "The removal of the veil prompts a question about waking before the final unveiling."
    },
    {
      "ref": "التكاثر 102:1",
      "arabic": "أَلْهَاكُمُ التَّكَاثُرُ",
      "ur": "محض زیادہ حاصل کرنے کی دوڑ اصل مقصد سے توجہ ہٹاسکتی ہے۔",
      "en": "Competitive accumulation may consume attention."
    },
    {
      "ref": "النور 24:37",
      "arabic": "لَا تُلْهِيهِمْ تِجَارَةٌ وَلَا بَيْعٌ عَن ذِكْرِ اللَّهِ",
      "ur": "تجارت کرتے ہوئے ذکرِ خدا اور واجبات کی حفاظت غفلت کے مقابلے میں مثبت نمونہ ہے۔",
      "en": "The positive model is activity without losing God-consciousness."
    }
  ],
  "sources": [
    {
      "labelUr": "نہج البلاغہ — خطبہ ۱۵۳",
      "labelEn": "Nahj al-Balagha, sermon 153",
      "detailUr": "غفلت کے پردوں، اپنے نفس سے فائدہ اٹھانے اور بیداری کے عملی تقاضے پر اصل عربی متن۔",
      "detailEn": "Primary Arabic passage on the veils of inattention and practical awakening.",
      "url": "https://al-islam.org/nahjul-balagha-part-1-sermons/sermon-153-he-has-been-allowed-time-allah"
    },
    {
      "labelUr": "غرر الحکم — باب الغفلة",
      "labelEn": "Ghurar al-Hikam — Negligence",
      "detailUr": "امیرالمؤمنینؑ کے مختصر اقوال، اصل عربی متن اور متعلقہ اندراج نمبر کے ساتھ۔",
      "detailEn": "Concise aphorisms with original Arabic and numbered entries.",
      "url": "https://al-islam.org/ghurar-al-hikam-wa-durar-al-kalim-exalted-aphorisms-and-pearls-speech/negligence"
    },
    {
      "labelUr": "سید جواد نقوی — سنن الٰہی، درس ۶",
      "labelEn": "Syed Jawad Naqvi, Divine Laws, lesson 6",
      "detailUr": "غفلت سے حاصل ہونے والے جھوٹے سکون اور یقین کے پائیدار اطمینان میں فرق۔",
      "detailEn": "Illusory calm versus steadfast confidence grounded in conviction.",
      "url": "https://www.syedjawadnaqvi.com/duroos/snn-ilhi/67ccb65da4f8fbdf012b8bf1"
    },
    {
      "labelUr": "سید جواد نقوی — آدابِ اسلامی، دروس ۲۸ و ۳۱",
      "labelEn": "Syed Jawad Naqvi, Islamic Manners, lessons 28 and 31",
      "detailUr": "دینی مجلس کے بعد دوبارہ غفلت میں جانا، نماز میں بے توجہی، اور عملی اصلاح کی ضرورت۔",
      "detailEn": "Post-sermon relapse and heedlessness in acts of worship.",
      "url": "https://www.syedjawadnaqvi.com/duroos/adabe-islami/67ccaf2aa4f8fbdf012b7ea4"
    },
    {
      "labelUr": "حامد کاشانی — خطر غفلت، دس مکمل مکتوب خطابات",
      "labelEn": "Hamed Kashani — Danger of Heedlessness, 10 public transcripts",
      "detailUr": "اصل فارسی سلسلہ، مجلس اول تا دہم؛ مطالعہ کی گئی مجالس کی تحقیقی توضیح اور باقی متن کی مرحلہ وار جانچ الگ نشان زد ہے۔",
      "detailEn": "Original Persian ten-part transcript series with explicit distinction between reviewed sessions and remaining source leads.",
      "url": "https://www.hkashani.com/?cat=5794"
    },
    {
      "labelUr": "استاد محمد شجاعی — انسان شناسی در آئینۂ صحیفہ سجادیہ",
      "labelEn": "Mohammad Shojaei — Anthropology through Sahifa Sajjadiyya, published session summary",
      "detailUr": "اصل ادارے کی ویب سائٹ پر مجلس کے اہم نکات موجود ہیں: انسان کا اپنی اصل شناخت سے غافل ہو جانا۔ مکمل تقریر کا لفظ بہ لفظ مطالعہ باقی ہے۔",
      "detailEn": "Official summary mentions neglecting one's higher identity; full transcript has not been ingested.",
      "url": "https://media.montazer.ir/47690-2/"
    },
    {
      "labelUr": "ناصر رفیعی — غفلت اور نہج البلاغہ، نامہ ۶۹",
      "labelEn": "Naser Rafiei — Heedlessness and Nahj al-Balagha, letter 69",
      "detailUr": "مکتوب خطاب: غفلت کے مقامات سے اجتناب، قلب و عقل کی توجہ، قرآن میں غفلت کی علامتیں۔",
      "detailEn": "Published transcript on places of heedlessness, attentive use of understanding and Qur'anic symptoms.",
      "url": "https://shiaquest.net/%D8%B3%D8%AE%D9%86%D8%B1%D8%A7%D9%86%DB%8C-%D9%85%DA%A9%D8%AA%D9%88%D8%A8-%D9%88%DB%8C%DA%98%D9%87-%D9%85%D8%A7%D9%87-%D8%B1%D9%85%D8%B6%D8%A7%D9%86/%D8%B3%D8%AE%D9%86%D8%B1%D8%A7%D9%86%DB%8C%D9%87%D8%A7/10666-69-6.html"
    },
    {
      "labelUr": "آیت اللہ سید محمدمہدی میرباقری — ذکر اور غفلت",
      "labelEn": "Ayatollah Muhammad Mahdi Mirbaqeri — Remembrance and heedlessness",
      "detailUr": "حوزۂ قم کی رپورٹ میں غفلت اور ذکر کے موضوع پر ان کی تقریر کا خلاصہ شائع ہوا ہے۔ مکمل اصل تقریر کی ماخذی جانچ باقی ہے؛ اس رپورٹ کو براہِ راست مکتوب تقریر نہ سمجھا جائے۔",
      "detailEn": "A seminary report summarizes a talk on remembrance and heedlessness; the full transcript has not been independently verified.",
      "url": "https://www.neshasteasatid.com/node/3540"
    }
  ],
  "anglesUr": [
    "غفلت کے معنی اور علامتیں",
    "مصروفیت، کامیابی اور قلبی نیند",
    "جھوٹا اطمینان بمقابلہ یقین",
    "غفلت اور قرآن سے اعراض",
    "نماز میں حضورِ قلب",
    "وقت کی بربادی اور دنیا کی دوڑ",
    "گھر اور حقوق العباد سے غفلت",
    "توبہ، ذکر، محاسبہ اور اصلاح",
    "مجلس کے اثر کو عادت بنانے کا طریقہ",
    "کربلا: بیداری، بصیرت اور وفاداری"
  ],
  "anglesEn": [
    "Meaning and symptoms",
    "Busy life and sleeping heart",
    "False comfort versus certainty",
    "Qur'an and ignored accountability",
    "Attention during prayer",
    "Wasted time and status competition",
    "Neglected rights at home",
    "Repentance and daily self-accounting",
    "Turning sermon emotion into changed habits",
    "Karbala and fidelity after recognition"
  ],
  "keywordsUr": [
    "غفلت",
    "غافل",
    "غافلون",
    "بیداری",
    "یقظہ",
    "نیندِ غفلت",
    "خود فراموشی",
    "حضور قلب",
    "یاد خدا",
    "محاسبہ",
    "اصلاح",
    "خطر غفلت",
    "غفلت کے اسباب"
  ],
  "keywordsEn": [
    "ghaflah",
    "ghaflat",
    "heedlessness",
    "negligence",
    "spiritual sleep",
    "wakefulness",
    "mindfulness",
    "self-accountability",
    "remembrance",
    "inattention",
    "distraction",
    "awakening",
    "danger of heedlessness"
  ]
};
export const GHAF_LAH_DOSSIER: SermonDossier = {
  "topicId": "ghaflah",
  "titleUr": "غفلت — جاگتی آنکھیں، سویا ہوا دل",
  "titleEn": "Ghaflah — awake eyes, sleeping heart",
  "thesisUr": "یہ مجلس سامع کو الزام دینے کے بجائے خود احتسابی کی طرف بلائے: غفلت کا اصل خطرہ صرف گناہ نہیں بلکہ اس بات سے بے خبر ہونا ہے کہ وقت، توجہ، عبادت اور تعلقات کس منزل کی طرف جارہے ہیں۔ قرآن مسئلہ دکھاتا ہے، امیرالمؤمنینؑ بیداری کی دعوت دیتے ہیں، اور ماخذ سے ثابت معاصر گفتگو روزمرہ کے لیے اس کا رخ متعین کرتی ہے۔",
  "thesisEn": "Rather than accusing listeners, the sermon awakens self-examination: heedlessness means losing sight of where time, attention, worship and relationships are leading. Qur'an diagnoses it, Imam Ali calls for wakefulness and sourced contemporary lessons make the remedy practical.",
  "governingQuestionUr": "اگر مجھے آج خبر مل جائے کہ زندگی کا صرف ایک دن باقی ہے تو کیا میری ترجیحات میں فرق آئے گا، اور اگر آئے گا تو میں آج ہی کیوں نہیں بدلتا؟",
  "governingQuestionEn": "If I knew I had one day left, what would change in my priorities—and why not change that today?",
  "primaryTexts": [
    {
      "id": "ghaflah-q1",
      "kind": "quran",
      "refUr": "الأعراف 7:179",
      "refEn": "Qur'an 7:179",
      "quranLocation": {
        "surah": 7,
        "ayah": 179
      },
      "sourceRefUr": "الأعراف 7:179",
      "sourceRefEn": "Qur'an 7:179",
      "explanationUr": "انسان کو آنکھ، کان اور دل ملے ہیں؛ سوال یہ ہے کہ وہ ان سے حقیقت کو پہچانتا بھی ہے یا نہیں۔",
      "explanationEn": "The issue is not lacking faculties but failing to use them to recognise truth."
    },
    {
      "id": "ghaflah-q2",
      "kind": "quran",
      "refUr": "الأنبياء 21:1",
      "refEn": "Qur'an 21:1",
      "quranLocation": {
        "surah": 21,
        "ayah": 1
      },
      "sourceRefUr": "الأنبياء 21:1",
      "sourceRefEn": "Qur'an 21:1",
      "explanationUr": "حساب قریب آنے کے باوجود غفلت اور اعراض جاری رہنا اصل خطرہ ہے۔",
      "explanationEn": "Accountability approaches while people remain distracted and turn away."
    },
    {
      "id": "ghaflah-q3",
      "kind": "quran",
      "refUr": "الحديد 57:16",
      "refEn": "Qur'an 57:16",
      "quranLocation": {
        "surah": 57,
        "ayah": 16
      },
      "sourceRefUr": "الحديد 57:16",
      "sourceRefEn": "Qur'an 57:16",
      "explanationUr": "اہلِ ایمان سے بھی دل کی بیداری اور خشوع کا مطالبہ ہے۔",
      "explanationEn": "Even believers are challenged to renew the humility of the heart."
    },
    {
      "id": "ghaflah-q4",
      "kind": "quran",
      "refUr": "الحشر 59:19",
      "refEn": "Qur'an 59:19",
      "quranLocation": {
        "surah": 59,
        "ayah": 19
      },
      "sourceRefUr": "الحشر 59:19",
      "sourceRefEn": "Qur'an 59:19",
      "explanationUr": "خدا کو بھولنا خود فراموشی کا سبب بنتا ہے۔",
      "explanationEn": "Forgetting God damages self-understanding."
    },
    {
      "id": "ghaflah-q5",
      "kind": "quran",
      "refUr": "المنافقون 63:9",
      "refEn": "Qur'an 63:9",
      "quranLocation": {
        "surah": 63,
        "ayah": 9
      },
      "sourceRefUr": "المنافقون 63:9",
      "sourceRefEn": "Qur'an 63:9",
      "explanationUr": "مال و اولاد نعمت ہیں؛ انہیں ذکرِ خدا سے غافل کردینے والا مقصد نہیں بننے دینا۔",
      "explanationEn": "Wealth and family need not be rejected; they must not eclipse remembrance."
    },
    {
      "id": "ghaflah-q6",
      "kind": "quran",
      "refUr": "ق 50:22",
      "refEn": "Qur'an 50:22",
      "quranLocation": {
        "surah": 50,
        "ayah": 22
      },
      "sourceRefUr": "ق 50:22",
      "sourceRefEn": "Qur'an 50:22",
      "explanationUr": "قیامت کے انکشاف سے پہلے زندگی میں اپنی بصیرت کو جگانے کی دعوت۔",
      "explanationEn": "The removal of the veil prompts a question about waking before the final unveiling."
    },
    {
      "id": "ghaflah-q7",
      "kind": "quran",
      "refUr": "التكاثر 102:1",
      "refEn": "Qur'an 102:1",
      "quranLocation": {
        "surah": 102,
        "ayah": 1
      },
      "sourceRefUr": "التكاثر 102:1",
      "sourceRefEn": "Qur'an 102:1",
      "explanationUr": "محض زیادہ حاصل کرنے کی دوڑ اصل مقصد سے توجہ ہٹاسکتی ہے۔",
      "explanationEn": "Competitive accumulation may consume attention."
    },
    {
      "id": "ghaflah-q8",
      "kind": "quran",
      "refUr": "النور 24:37",
      "refEn": "Qur'an 24:37",
      "quranLocation": {
        "surah": 24,
        "ayah": 37
      },
      "sourceRefUr": "النور 24:37",
      "sourceRefEn": "Qur'an 24:37",
      "explanationUr": "تجارت کرتے ہوئے ذکرِ خدا اور واجبات کی حفاظت غفلت کے مقابلے میں مثبت نمونہ ہے۔",
      "explanationEn": "The positive model is activity without losing God-consciousness."
    },
    {
      "id": "ghaflah-ghurar-1",
      "kind": "hadith",
      "refUr": "امیرالمؤمنینؑ — غرر الحکم، باب الغفلة، اندراج 1",
      "refEn": "Imam Ali — Ghurar al-Hikam, Negligence #1",
      "sourceArabicMarked": "إنْتِباهُ العُيُونِ لايَنْفَعُ مَعَ غَفْلَةِ القُلُوبِ.",
      "sourceRefUr": "غرر الحکم، باب الغفلة، اندراج 1",
      "sourceRefEn": "Ghurar al-Hikam, Negligence, entry 1",
      "explanationUr": "آنکھوں کا کھلا ہونا اور زندگی میں سرگرم رہنا، حقیقی باطنی بیداری کی ضمانت نہیں۔",
      "explanationEn": "Wakeful eyes cannot make up for inattentive hearts.",
      "sourceUrl": "https://al-islam.org/ghurar-al-hikam-wa-durar-al-kalim-exalted-aphorisms-and-pearls-speech/negligence"
    },
    {
      "id": "ghaflah-ghurar-4",
      "kind": "hadith",
      "refUr": "امیرالمؤمنینؑ — غرر الحکم، باب الغفلة، اندراج 4",
      "refEn": "Imam Ali — Ghurar al-Hikam, Negligence #4",
      "sourceArabicMarked": "إيّاكَ والغَفْلَةَ، والاِغْتِرارَ بِالمُهْلَةِ، فَإنَّ الغَفْلَةَ تُفْسِدُ الأعْمالَ، وَالآجالَ تَقْطَعُ الآمالَ.",
      "sourceRefUr": "غرر الحکم، باب الغفلة، اندراج 4",
      "sourceRefEn": "Ghurar al-Hikam, Negligence, entry 4",
      "explanationUr": "آج کی مہلت کو ہمیشہ رہنے والی فرصت سمجھنا غفلت کی بنیادی علامت ہے۔",
      "explanationEn": "Do not mistake delay for safety: inattention spoils deeds, and life's end interrupts hopes.",
      "sourceUrl": "https://al-islam.org/ghurar-al-hikam-wa-durar-al-kalim-exalted-aphorisms-and-pearls-speech/negligence"
    },
    {
      "id": "ghaflah-ghurar-11",
      "kind": "hadith",
      "refUr": "امیرالمؤمنینؑ — غرر الحکم، باب الغفلة، اندراج 11",
      "refEn": "Imam Ali — Ghurar al-Hikam, Negligence #11",
      "sourceArabicMarked": "دَوامُ الغَفْلَةِ يُعْمِى البَصيرَةَ.",
      "sourceRefUr": "غرر الحکم، باب الغفلة، اندراج 11",
      "sourceRefEn": "Ghurar al-Hikam, Negligence, entry 11",
      "explanationUr": "غفلت وقتی کمزوری سے عادت بن سکتی ہے؛ پھر آدمی اپنی حالت کو بیماری بھی نہیں سمجھتا۔",
      "explanationEn": "Habitual heedlessness blinds insight.",
      "sourceUrl": "https://al-islam.org/ghurar-al-hikam-wa-durar-al-kalim-exalted-aphorisms-and-pearls-speech/negligence"
    },
    {
      "id": "ghaflah-ghurar-13",
      "kind": "hadith",
      "refUr": "امیرالمؤمنینؑ — غرر الحکم، باب الغفلة، اندراج 13",
      "refEn": "Imam Ali — Ghurar al-Hikam, Negligence #13",
      "sourceArabicMarked": "ضادُّوا الغَفْلَةَ بِاليَقْظَةِ.",
      "sourceRefUr": "غرر الحکم، باب الغفلة، اندراج 13",
      "sourceRefEn": "Ghurar al-Hikam, Negligence, entry 13",
      "explanationUr": "علاج صرف خوف دلانا نہیں بلکہ توجہ، ذکر، سوچ اور عملی محاسبہ پیدا کرنا ہے۔",
      "explanationEn": "Counter heedlessness with wakefulness.",
      "sourceUrl": "https://al-islam.org/ghurar-al-hikam-wa-durar-al-kalim-exalted-aphorisms-and-pearls-speech/negligence"
    },
    {
      "id": "ghaflah-ghurar-20",
      "kind": "hadith",
      "refUr": "امیرالمؤمنینؑ — غرر الحکم، باب الغفلة، اندراج 20",
      "refEn": "Imam Ali — Ghurar al-Hikam, Negligence #20",
      "sourceArabicMarked": "كَفى بِالرَّجُلِ غَفْلَةً أنْ يُضَيِّعَ عُمْرَهُ فيما لايُنْجيهِ.",
      "sourceRefUr": "غرر الحکم، باب الغفلة، اندراج 20",
      "sourceRefEn": "Ghurar al-Hikam, Negligence, entry 20",
      "explanationUr": "معمولات، ترجیحات اور روزانہ خرچ ہونے والے وقت پر منبری سوال اٹھائیں۔",
      "explanationEn": "Wasting one's life on what cannot save it is itself a sign of heedlessness.",
      "sourceUrl": "https://al-islam.org/ghurar-al-hikam-wa-durar-al-kalim-exalted-aphorisms-and-pearls-speech/negligence"
    },
    {
      "id": "ghaflah-ghurar-17",
      "kind": "hadith",
      "refUr": "امیرالمؤمنینؑ — غرر الحکم، باب الغفلة، اندراج 17",
      "refEn": "Imam Ali — Ghurar al-Hikam, Negligence #17",
      "sourceArabicMarked": "فَأفِقْ أيُّهَا السّامِعُ مِنْ غَفْلَتِكَ، واخْتَصِرْ مِنْ عَجَلَتِكَ، وأشْدُدْ أزْرَكَ، وخُذْ حِذْرَكَ، واذْكُرْ قَبْرَكَ، فَإنَّ عَلَيْهِ مَمَرَّكَ.",
      "sourceRefUr": "غرر الحکم، باب الغفلة، اندراج 17",
      "sourceRefEn": "Ghurar al-Hikam, Negligence, entry 17",
      "explanationUr": "اختتام خوف اور امید کے توازن کے ساتھ: آج ایک قابلِ عمل تبدیلی طے کرو۔",
      "explanationEn": "Awaken, slow your haste, prepare yourself, remain alert and remember the grave toward which you travel.",
      "sourceUrl": "https://al-islam.org/ghurar-al-hikam-wa-durar-al-kalim-exalted-aphorisms-and-pearls-speech/negligence"
    },
    {
      "id": "ghaflah-baqir-salat",
      "kind": "hadith",
      "refUr": "امام محمد باقرؑ — وقت پر نماز",
      "refEn": "Imam al-Baqir — timely prayer",
      "sourceArabicMarked": "أيّما مُؤمِنٍ حافَظَ علَى الصَّلواتِ المَفروضَةِ فَصَلاّها لِوَقتِها فَلَيسَ هذا مِن الغافِلينَ.",
      "sourceRefUr": "میزان الحکمہ، باب الغفلة، اندراج ۱۰؛ اس میں الکافی، جلد ۳، صفحہ ۲۷۰، حدیث ۱۴ کا حوالہ درج ہے۔",
      "sourceRefEn": "Mizan al-Hikmah, Negligence, entry 10; cites al-Kafi, vol. 3, p. 270, no. 14.",
      "explanationUr": "یہ بیان نماز کے وقت اور فرض کی پابندی کو غفلت کے مقابلے میں ایک عملی معیار بناتا ہے۔ شرعی صحت اور حضورِ قلب کے تمام احکام اس مختصر عبارت سے اخذ نہ کیے جائیں۔",
      "explanationEn": "Prayer at its appointed time is a practical sign of care; distinguish it from separate questions of legal validity and inward devotion.",
      "sourceUrl": "https://al-islam.org/mizan-al-hikmah-scale-wisdom/negligence"
    },
    {
      "id": "ghaflah-ali-taghaful",
      "kind": "hadith",
      "refUr": "امیرالمؤمنین علیؑ — تغافل اور درگزر",
      "refEn": "Imam Ali — ethical overlooking",
      "sourceArabicMarked": "إنَّ العاقِلَ نِصفُهُ احتِمالٌ، ونِصفُهُ تَغافُلٌ.",
      "sourceRefUr": "میزان الحکمہ، باب الغفلة، اندراج ۱۷؛ غرر الحکم، حدیث ۲۳۷۸ کا حوالہ۔",
      "sourceRefEn": "Mizan al-Hikmah, Negligence, entry 17; cites Ghurar al-Hikam no. 2378.",
      "explanationUr": "«تغافل» کسی کی معمولی خطا سے دانستہ چشم پوشی ہے۔ اسے ظلم، استحصال، بدعنوانی یا کسی کے حق کو دبانے کی اجازت نہ سمجھا جائے۔",
      "explanationEn": "Ethical discretion about minor faults is different from neglecting injustice, harm or a violated right.",
      "sourceUrl": "https://al-islam.org/mizan-al-hikmah-scale-wisdom/negligence"
    }
  ],
  "perspectives": [
    {
      "id": "jawad-naqvi-ghaflah",
      "speakerId": "jawad-naqvi",
      "nameUr": "علامہ سید جواد نقوی",
      "nameEn": "Syed Jawad Naqvi",
      "sourceTitleUr": "سنن الٰہی اور آدابِ اسلامی — اصل مکتوب دروس",
      "sourceTitleEn": "Divine Laws and Islamic Manners — published lecture transcripts",
      "sourceUrl": "https://www.syedjawadnaqvi.com/duroos/snn-ilhi/67ccb65da4f8fbdf012b8bf1",
      "coreUr": "بے خبری سے پیدا ہونے والا اطمینان اور یقین سے حاصل ہونے والا اطمینان ایک نہیں؛ دینی کیفیت کی قدر اس کے بعد رہ جانے والی عملی اصلاح سے ناپیں۔",
      "coreEn": "Ignorance can create a deceptively reassuring calm; true spiritual growth is judged by lasting change after a devotional experience.",
      "explanationUr": [
        "سنن الٰہی، درس ۶ میں غفلت کے سرابی سکون کو پائیدار اطمینان سے الگ کیا گیا ہے۔",
        "آداب اسلامی، درس ۲۸ میں مجلس اور دعا سے متاثر ہونے کے باوجود دوبارہ پرانی عادات میں پلٹنے کا مسئلہ سامنے آتا ہے۔",
        "آداب اسلامی، درس ۳۱ میں نماز کی ظاہری ادائیگی کے ساتھ قلبی غفلت پر تنبیہ کی گئی ہے۔"
      ],
      "explanationEn": [
        "Lesson 6 separates deceptive calm from conviction-grounded tranquility.",
        "Lesson 28 asks why devotional motivation fades as soon as ordinary routines return.",
        "Lesson 31 criticises heedless and rushed performance of prayer."
      ],
      "styleUr": "اصل دروس کی الگ الگ نسبت قائم رکھی جائے، تین بیانات کو ایک مسلسل اقتباس نہ بنایا جائے۔",
      "styleEn": "Keep the three lecture sources distinct and do not present editorial synthesis as direct quotation.",
      "useUr": "غفلت کی تشخیص، عبادت میں حضور اور مجلس کے بعد اصلاح کو مسلسل تین مراحل بنائیں۔",
      "useEn": "Connect diagnosis, attentive worship, and sustained moral reform.",
      "sourceGroundedUr": [
        {
          "heading": "سرابی اطمینان",
          "explanation": "اس درس میں سید جواد نقوی دو قسم کے اطمینان میں فرق کرتے ہیں: ایک غفلت کا پیدا کردہ سرابی سکون اور دوسرا یقین سے حاصل ہونے والا پائیدار اطمینان۔ پہلی حالت میں انسان خطرے سے لاعلمی کے باعث مطمئن ہوتا ہے، نہ کہ خطرے کے ختم ہوجانے سے۔",
          "exactRef": "سنن الٰہی — درس ۶: غفلت سے پیدا شدہ اطمینان",
          "sourceUrl": "https://www.syedjawadnaqvi.com/duroos/snn-ilhi/67ccb65da4f8fbdf012b8bf1"
        },
        {
          "heading": "وقتی اثر سے مستقل اصلاح",
          "explanation": "درس میں یہ مسئلہ اٹھایا گیا ہے کہ دعا، مجلس یا دینی اجتماع انسان پر گہرا اثر ڈال سکتا ہے، مگر ماحول سے نکلنے کے بعد پرانی عادتیں واپس آجاتی ہیں۔ وقتی کیفیت اور مستقل تربیت کے درمیان فرق پر گفتگو کی گئی ہے۔",
          "exactRef": "آدابِ اسلامی — درس ۲۸: مجلس کے اثر کی حفاظت",
          "sourceUrl": "https://www.syedjawadnaqvi.com/duroos/adabe-islami/67ccaf2aa4f8fbdf012b7ea4"
        },
        {
          "heading": "نماز میں قلبی توجہ",
          "explanation": "درس میں اس بات پر تنبیہ کی گئی ہے کہ نماز صرف ادا کرلینا کافی نہیں؛ جلدبازی، بے توجہی اور لاپروائی عبادت کے ادب کو متاثر کرتی ہے۔",
          "exactRef": "آدابِ اسلامی — درس ۳۱: نماز میں غفلت",
          "sourceUrl": "https://www.syedjawadnaqvi.com/duroos/adabe-islami/67ccaf34a4f8fbdf012b7eb6"
        }
      ],
      "sourceGroundedEn": [
        {
          "heading": "سرابی اطمینان",
          "explanation": "Jawad Naqvi distinguishes illusory comfort produced by ignorance from stable tranquility grounded in certainty. The absence of alarm is not proof of safety.",
          "exactRef": "Divine Laws — lesson 6: false comfort born of heedlessness",
          "sourceUrl": "https://www.syedjawadnaqvi.com/duroos/snn-ilhi/67ccb65da4f8fbdf012b8bf1"
        },
        {
          "heading": "وقتی اثر سے مستقل اصلاح",
          "explanation": "This lesson addresses the gap between a moving devotional experience and sustained moral reform after returning to ordinary life.",
          "exactRef": "Islamic Manners — lesson 28: preserving an awakened state",
          "sourceUrl": "https://www.syedjawadnaqvi.com/duroos/adabe-islami/67ccaf2aa4f8fbdf012b7ea4"
        },
        {
          "heading": "نماز میں قلبی توجہ",
          "explanation": "The lesson treats rushed, inattentive prayer as a problem of the etiquette and meaning of worship, not merely of external performance.",
          "exactRef": "Islamic Manners — lesson 31: negligence in prayer",
          "sourceUrl": "https://www.syedjawadnaqvi.com/duroos/adabe-islami/67ccaf34a4f8fbdf012b7eb6"
        }
      ]
    },
    {
      "id": "jawad-naqvi-prevention-of-fitan",
      "speakerId": "jawad-naqvi",
      "nameUr": "علامہ سید جواد نقوی",
      "nameEn": "Syed Jawad Naqvi",
      "sourceTitleUr": "حکمتِ علیؑ — حصہ ۵",
      "sourceTitleEn": "Wisdom of Ali — part 5",
      "sourceUrl": "https://syedjawadnaqvi.com/magazines/magazine-details/article?id=67cca892a4f8fbdf012b75d3&title=hkmte-ali",
      "coreUr": "اجتماعی فتنوں میں غفلت اور جلد بازی باہم مل کر نقصان بڑھاتی ہیں۔",
      "coreEn": "Heedlessness and haste together can fuel collective conflict.",
      "explanationUr": [
        "دینی اور معاشرتی تنازعات میں بے خبری اور جلدبازی کے کردار کو الگ الگ سمجھائیں۔"
      ],
      "explanationEn": [
        "Separate the contributions of inattentiveness and hasty action to social conflict."
      ],
      "styleUr": "مخالف گروہوں پر الزام کے بجائے اپنے رویے کے محاسبے پر زور دیں۔",
      "styleEn": "Focus on personal discernment rather than polemics.",
      "useUr": "غفلت کے سماجی نتائج اور خبر کی تحقیق کے ضمن میں استعمال کریں۔",
      "useEn": "Apply to self-examination and responsible response to disputes.",
      "sourceGroundedUr": [
        {
          "heading": "غفلت اور جلد بازی",
          "explanation": "مصنف کے مکتوب مضمون میں غفلت اور جلد بازی کو فتنوں کے عوامل میں بیان کیا گیا ہے؛ اسے موجودہ تنازعات میں سنجیدہ تحقیق اور تحمل کی ضرورت سے جوڑیں۔",
          "exactRef": "سید جواد نقوی، حکمتِ علیؑ، حصہ ۵، «غفلت اور جلد بازی»",
          "sourceUrl": "https://syedjawadnaqvi.com/magazines/magazine-details/article?id=67cca892a4f8fbdf012b75d3&title=hkmte-ali"
        }
      ],
      "sourceGroundedEn": [
        {
          "heading": "غفلت اور جلد بازی",
          "explanation": "The published essay treats heedlessness and haste as contributors to social disorder; draw a cautious connection to verification and restraint.",
          "exactRef": "Syed Jawad Naqvi, Wisdom of Ali, part 5",
          "sourceUrl": "https://syedjawadnaqvi.com/magazines/magazine-details/article?id=67cca892a4f8fbdf012b75d3&title=hkmte-ali"
        }
      ]
    },
    {
      "id": "hamed-kashani-danger-ghaflah",
      "speakerId": "hamed-kashani",
      "nameUr": "حجت الاسلام حامد کاشانی",
      "nameEn": "Hamed Kashani",
      "sourceTitleUr": "خطر غفلت — مکتوب مجالس ۱، ۵ اور ۱۰",
      "sourceTitleEn": "Danger of Heedlessness — published talks 1, 5 and 10",
      "sourceUrl": "https://www.hkashani.com/?p=23340",
      "coreUr": "غفلت صرف کم فہمی نہیں، ایک اہم رخ پر ایسی توجہ ہے جو آدمی کو دوسری اہم ذمہ داریوں سے بے خبر کر دے؛ ذکر، یادِ موت اور تقویٰ اس کی اصلاح کے وسائل ہیں۔",
      "coreEn": "Heedlessness can result from narrow fixation on one concern that obscures others; remembrance, reflection on mortality and God-conscious discernment counter it.",
      "explanationUr": [
        "پہلی مجلس میں توجہ کی یک طرفگی اور غفلت کا تعلق واضح کیا گیا، نیز ذکر اور یادِ موت کا تربیتی کردار بتایا گیا۔",
        "پانچویں مجلس میں ایک ہی مسئلے میں غرق ہو کر باقی ذمہ داریوں سے بے خبری کو موضوع بنایا گیا۔",
        "دسویں مجلس میں تقویٰ اور تذکر کے ذریعے غفلت سے نکلنے کی ضرورت پر گفتگو موجود ہے؛ تفصیلی حدیثی استدلال صرف اصل حوالہ کے ساتھ آگے بڑھایا جائے۔"
      ],
      "explanationEn": [
        "The first transcript deals with misplaced attention and discusses remembrance of death as an aid to wakefulness.",
        "The fifth transcript treats fixation that obscures other duties as a form of heedlessness.",
        "The tenth returns to the relationship of vigilance, remembrance and God-consciousness."
      ],
      "styleUr": "اصل خطابات سے مفاہیم الگ نقل کیے گئے ہیں؛ اسے دس مکمل اردو ترجمہ شدہ خطابات نہ سمجھا جائے۔",
      "styleEn": "These are separate topic summaries of reviewed talks, not translations of all ten original lectures.",
      "useUr": "منبر پر ظاہری مصروفیت، ایک رخ پر بے تحاشا توجہ اور حقیقی دینی ترجیحات کا تقابل دکھائیں۔",
      "useEn": "Distinguish mere busyness or fixation from broad God-conscious attention.",
      "sourceGroundedUr": [
        {
          "heading": "توجہ اور غفلت",
          "explanation": "پہلی مجلس میں غفلت کو توجہ کی ایسی خرابی سے جوڑا گیا ہے جس میں انسان دوسرے اہم امور کو نظر انداز کرتا ہے؛ یادِ موت اور ذکر کو بیداری کے ذرائع کے طور پر پیش کیا گیا ہے۔",
          "exactRef": "خطر غفلت، مجلس اول، ۱۸ مہر ۱۴۰۲",
          "sourceUrl": "https://www.hkashani.com/?p=23340"
        },
        {
          "heading": "ایک رخ میں کھو جانا",
          "explanation": "پانچویں مجلس میں زندگی کے ایک شعبے میں ضرورت سے زیادہ مستغرق ہوکر باقی ذمہ داریوں سے بے خبری کا اخلاقی مسئلہ زیر بحث ہے۔",
          "exactRef": "خطر غفلت، مجلس پنجم، ۲۳ آبان ۱۴۰۲",
          "sourceUrl": "https://www.hkashani.com/?p=23605"
        },
        {
          "heading": "تقویٰ، ذکر اور بیداری",
          "explanation": "دسویں مجلس میں ذکر و تقویٰ کے ذریعے عملی بیداری پر زور دیا گیا ہے؛ قرآن کے نصوص کی مستقل اصل متن سے تصدیق ضروری رکھی گئی ہے۔",
          "exactRef": "خطر غفلت، مجلس دہم، ۱۰ بہمن ۱۴۰۲",
          "sourceUrl": "https://www.hkashani.com/?p=23978"
        }
      ],
      "sourceGroundedEn": [
        {
          "heading": "توجہ اور غفلت",
          "explanation": "The opening lecture presents a failure of attention that eclipses other important obligations, and discusses remembrance of mortality and God as aids to vigilance.",
          "exactRef": "Danger of Heedlessness, lecture 1, 18 Mehr 1402",
          "sourceUrl": "https://www.hkashani.com/?p=23340"
        },
        {
          "heading": "ایک رخ میں کھو جانا",
          "explanation": "Lecture five examines how preoccupation with one area of life can conceal other responsibilities.",
          "exactRef": "Danger of Heedlessness, lecture 5, 23 Aban 1402",
          "sourceUrl": "https://www.hkashani.com/?p=23605"
        },
        {
          "heading": "تقویٰ، ذکر اور بیداری",
          "explanation": "The tenth transcript relates God-consciousness and remembrance to moral attentiveness; source claims remain limited to the reviewed text.",
          "exactRef": "Danger of Heedlessness, lecture 10, 10 Bahman 1402",
          "sourceUrl": "https://www.hkashani.com/?p=23978"
        }
      ]
    },
    {
      "id": "naser-rafiei-letter69-ghaflah",
      "speakerId": "naser-rafiei",
      "nameUr": "حجت الاسلام ڈاکٹر ناصر رفیعی",
      "nameEn": "Naser Rafiei",
      "sourceTitleUr": "غفلت — نہج البلاغہ، نامہ ۶۹ پر مکتوب خطاب",
      "sourceTitleEn": "Heedlessness — published speech on Nahj al-Balagha, letter 69",
      "sourceUrl": "https://shiaquest.net/%D8%B3%D8%AE%D9%86%D8%B1%D8%A7%D9%86%DB%8C-%D9%85%DA%A9%D8%AA%D9%88%D8%A8-%D9%88%DB%8C%DA%98%D9%87-%D9%85%D8%A7%D9%87-%D8%B1%D9%85%D8%B6%D8%A7%D9%86/%D8%B3%D8%AE%D9%86%D8%B1%D8%A7%D9%86%DB%8C%D9%87%D8%A7/10666-69-6.html",
      "coreUr": "امیرالمؤمنینؑ کے نامہ ۶۹ میں غفلت کے ماحول سے اجتناب کی تنبیہ انسان کی سوچ، سماجی صحبت اور دینی عمل پر اثر ڈالتی ہے۔",
      "coreEn": "Imam Ali's counsel to avoid environments of heedlessness has practical implications for understanding, company and religious action.",
      "explanationUr": [
        "نامہ ۶۹ کے اصل جملے «وَاحْذَرْ مَنَازِلَ الْغَفْلَةِ» سے مجلس میں صحبت اور ماحول کا سوال کھولیں۔",
        "رفیعی کی مکتوب گفتگو قرآن ۷:۱۷۹ کی روشنی میں سمجھنے والے دل، دیکھنے والی آنکھ اور سننے والے کان کی بے عملی کو غفلت کی علامت بتاتی ہے۔",
        "غفلت کی نوعیت وسیع ہے: خدا، آخرت، دنیا کی ناپائیداری اور اپنی ذمہ داری سے بے خبری۔"
      ],
      "explanationEn": [
        "Letter 69 cautions against frequenting places of heedlessness.",
        "The transcript draws on Qur'an 7:179 to diagnose the misuse of faculties of understanding and perception.",
        "The speech discusses multiple kinds of heedlessness, including neglected accountability."
      ],
      "styleUr": "اصل فارسی گفتار کا محتاط خلاصہ پیش کریں؛ نقلِ حدیث یا تاریخی قصے اس خطاب کے حوالے سے غیر ضروری نہ بڑھائیں۔",
      "styleEn": "Use a cautious summary of the Persian transcript without importing anecdotes as verified historical facts.",
      "useUr": "غفلت کی علامات، مجلس و صحبت کے اثر، اور ماحول کی اصلاح کے ضمن میں قابلِ استعمال۔",
      "useEn": "Apply to social environment, spiritual symptoms and responsible companionship.",
      "sourceGroundedUr": [
        {
          "heading": "غفلت کے ماحول سے بچنا",
          "explanation": "نامہ ۶۹ کی وصیت کے تحت غفلت کے مقامات اور ایسی صحبتوں سے اجتناب کا مضمون کھولا گیا ہے جو اطاعتِ خدا میں مدد نہ کریں۔",
          "exactRef": "شرح نہج البلاغہ، نامہ ۶۹ — مکتوب خطاب ناصر رفیعی",
          "sourceUrl": "https://shiaquest.net/%D8%B3%D8%AE%D9%86%D8%B1%D8%A7%D9%86%DB%8C-%D9%85%DA%A9%D8%AA%D9%88%D8%A8-%D9%88%DB%8C%DA%98%D9%87-%D9%85%D8%A7%D9%87-%D8%B1%D9%85%D8%B6%D8%A7%D9%86/%D8%B3%D8%AE%D9%86%D8%B1%D8%A7%D9%86%DB%8C%D9%87%D8%A7/10666-69-6.html"
        },
        {
          "heading": "دل، آنکھ اور کان کی غفلت",
          "explanation": "قرآن ۷:۱۷۹ میں ادراک، بصارت اور سماعت کی نعمتیں ہونے کے باوجود درست استعمال نہ کرنے کو غفلت کی علامت بیان کیا گیا ہے۔",
          "exactRef": "ناصر رفیعی، غفلت — نامہ ۶۹؛ الاعراف ۷:۱۷۹",
          "sourceUrl": "https://shiaquest.net/%D8%B3%D8%AE%D9%86%D8%B1%D8%A7%D9%86%DB%8C-%D9%85%DA%A9%D8%AA%D9%88%D8%A8-%D9%88%DB%8C%DA%98%D9%87-%D9%85%D8%A7%D9%87-%D8%B1%D9%85%D8%B6%D8%A7%D9%86/%D8%B3%D8%AE%D9%86%D8%B1%D8%A7%D9%86%DB%8C%D9%87%D8%A7/10666-69-6.html"
        }
      ],
      "sourceGroundedEn": [
        {
          "heading": "غفلت کے ماحول سے بچنا",
          "explanation": "The transcript examines letter 69's caution against settings that fail to encourage obedience and moral attention.",
          "exactRef": "Naser Rafiei, published talk on letter 69 of Nahj al-Balagha",
          "sourceUrl": "https://shiaquest.net/%D8%B3%D8%AE%D9%86%D8%B1%D8%A7%D9%86%DB%8C-%D9%85%DA%A9%D8%AA%D9%88%D8%A8-%D9%88%DB%8C%DA%98%D9%87-%D9%85%D8%A7%D9%87-%D8%B1%D9%85%D8%B6%D8%A7%D9%86/%D8%B3%D8%AE%D9%86%D8%B1%D8%A7%D9%86%DB%8C%D9%87%D8%A7/10666-69-6.html"
        },
        {
          "heading": "دل، آنکھ اور کان کی غفلت",
          "explanation": "It discusses Qur'an 7:179: faculties of hearing, sight and understanding must be exercised rather than merely possessed.",
          "exactRef": "Naser Rafiei, Heedlessness and letter 69; Qur'an 7:179",
          "sourceUrl": "https://shiaquest.net/%D8%B3%D8%AE%D9%86%D8%B1%D8%A7%D9%86%DB%8C-%D9%85%DA%A9%D8%AA%D9%88%D8%A8-%D9%88%DB%8C%DA%98%D9%87-%D9%85%D8%A7%D9%87-%D8%B1%D9%85%D8%B6%D8%A7%D9%86/%D8%B3%D8%AE%D9%86%D8%B1%D8%A7%D9%86%DB%8C%D9%87%D8%A7/10666-69-6.html"
        }
      ]
    }
  ],
  "synthesisUr": [
    "غفلت کو محض کم عبادت نہیں سمجھیں؛ یہ سوچ اور ذمہ داری سے بے خبری بھی ہے۔",
    "دنیا کے جائز کام انسان کے دشمن نہیں؛ اصل سوال یہ ہے کہ وہ یادِ خدا اور حقوق سے کب غافل کرتے ہیں۔",
    "صرف مجلس میں اثر قبول کرنا کافی نہیں، عبادت میں توجہ اور گھر میں بہتر رویہ اگلے دن بھی رہنا چاہیے۔",
    "روزانہ ایک سوال، ایک اصلاح، اور ایک حق کی ادائیگی بیداری کو عادت بناتے ہیں۔"
  ],
  "synthesisEn": [
    "Ghaflah is wider than insufficient ritual; it is ignorance of one's responsibility.",
    "Lawful worldly life is not the enemy; eclipse of remembrance and rights is the danger.",
    "Temporary emotion matters only when sustained in attentive worship and better conduct.",
    "Daily reflection, one correction and fulfilment of one right build a habit of wakefulness."
  ],
  "pulpitFlowUr": [
    {
      "heading": "غفلت کیا ہے؟",
      "body": "غفلت اور جان بوجھ کر گناہ کرنے میں فرق واضح کریں۔ عقل، حواس اور موقع موجود ہوں مگر انسان اپنی اصل ذمہ داری سے بے خبر رہے تو غفلت پیدا ہوتی ہے۔ اس بحث کو حامد کاشانی کی پہلی مجلس کے توجہ اور غفلت کے زاویے سے روشن کریں۔"
    },
    {
      "heading": "دل کی نیند اور ظاہری مصروفیت",
      "body": "الأعراف ۷:۱۷۹ اور غرر الحکم کے پہلے قول سے بحث کھولیں؛ ظاہری کامیابی کو روحانی کامیابی کا ثبوت نہ بنائیں۔"
    },
    {
      "heading": "غلط اطمینان اور یقینی سکون",
      "body": "سید جواد نقوی کے سنن الٰہی درس ۶ سے سمجھائیں کہ خطرے کا احساس نہ ہونا، خطرے کے موجود نہ ہونے کی دلیل نہیں۔"
    },
    {
      "heading": "حساب کی قربت اور مہلت کا فریب",
      "body": "الأنبیاء ۲۱:۱ اور غرر الحکم کے چوتھے قول کو جوڑیں۔ سامع سے روزمرہ فیصلہ کرنے کا سوال پوچھیں۔"
    },
    {
      "heading": "قرآن اور عبادت کے باوجود غفلت",
      "body": "الحدید ۵۷:۱۶، حضورِ قلب اور آدابِ اسلامی درس ۳۱ سے عبادت کی اصلاح سمجھائیں۔ فقہی صحت کے الگ مسئلے میں نہ الجھیں۔"
    },
    {
      "heading": "خود فراموشی اور خواہشات",
      "body": "الحشر ۵۹:۱۹ کی روشنی میں وقت، نیّت اور اصل منزل سے لاپرواہی کے آثار بیان کریں۔"
    },
    {
      "heading": "مال، اولاد، شہرت اور فون",
      "body": "المنافقون ۶۳:۹ اور النور ۲۴:۳۷ کے درمیان توازن رکھیں: کاروبار اور گھر کی نفی نہیں، ترجیحات کی اصلاح مطلوب ہے۔"
    },
    {
      "heading": "اجتماعی غفلت اور حقوق",
      "body": "خاندان کے حقوق، سچائی، اصلاحِ معاشرہ اور جلد بازی پر مستند مکتوب گفتگو شامل کریں؛ سیاسی الزام تراشی سے بچیں۔ ناصر رفیعی کے نامہ ۶۹ والے مکتوب خطاب سے ماحول اور صحبت کے اثر کی بحث واضح کریں۔"
    },
    {
      "heading": "بیداری کا راستہ",
      "body": "غرر الحکم کے تیسرے، تیرہویں اور بیسویں اقتباس کے مفاہیم سے ذکر، محاسبہ، توبہ، نماز میں توجہ اور وقت کا حساب پیدا کریں۔"
    },
    {
      "heading": "کربلا: پہچان سے وفاداری تک",
      "body": "اصل موضوع کو کربلا سے اس قدر جوڑیں کہ پہچان کے باوجود حق کے ساتھ کھڑے ہونے کی ذمہ داری سامنے آئے۔ مصائب کے تاریخی جزئیات الگ معتبر مقتل سے منتخب ہوں، یہاں من گھڑت روایت نہ ہو۔"
    }
  ],
  "pulpitFlowEn": [
    {
      "heading": "What does heedlessness mean?",
      "body": "Distinguish an inattentive life from deliberate wrongdoing; describe awareness of purpose, accountability and others. Compare the diagnosis to Hamed Kashani's published opening lecture."
    },
    {
      "heading": "Awake eyes, sleeping heart",
      "body": "Build the discussion on 7:179 and Ghurar #1; outward activity alone does not prove inner alertness."
    },
    {
      "heading": "False comfort versus serenity",
      "body": "Use the identified lecture to contrast ignorance-born security with stable serenity."
    },
    {
      "heading": "Accountability and the illusion of endless time",
      "body": "Connect 21:1 with Ghurar #4 and ask which decision is delayed by imagined endless time."
    },
    {
      "heading": "Heedlessness despite worship",
      "body": "Use 57:16 and the sourced lesson on attentive prayer, without confusing spiritual attentiveness with legal validity."
    },
    {
      "heading": "Forgetting the self",
      "body": "Use 59:19 to examine loss of self-knowledge and purpose."
    },
    {
      "heading": "Distraction in modern routines",
      "body": "Balance 63:9 and 24:37: neither work nor family is condemned, but responsibilities cannot eclipse remembrance."
    },
    {
      "heading": "Collective neglect and rights",
      "body": "Discuss responsibilities to family and community; use the sourced reflection on carelessness and haste. Use Naser Rafiei's transcript on letter 69 to examine the influence of surroundings."
    },
    {
      "heading": "Pathways back to wakefulness",
      "body": "Develop remembrance, self-audit, repentance, attentive worship and intentional time from the cited sayings."
    },
    {
      "heading": "Karbala: recognition into fidelity",
      "body": "Connect awakened conscience with moral fidelity in Karbala; select historical masaib only from separately verified maqtal sources."
    }
  ],
  "closingUr": "سامع سے تین عملی وعدے لیں: روز پانچ منٹ روزانہ کا محاسبہ، ایک نماز پوری توجہ سے، اور ایک ضائع کیا ہوا حق ادا کرنا۔ مصائبِ امام حسینؑ میں صرف ثابت شدہ مقتل اور منتخب موقع کے ساتھ ربط رکھا جائے؛ غم کو بیداری، وفاداری اور اصلاحِ کردار میں بدلیے۔",
  "closingEn": "Invite three commitments: five minutes of daily examination, one deliberately attentive prayer, and repair of one neglected right. Any transition to Imam Husayn's suffering must use separately verified historical sources and turn grief toward moral fidelity."
};
export const GHAF_LAH_SPEAKER_EVIDENCE: readonly SpeakerEvidence[] = [
  {
    "id": "shojaei-ghaflah-identity-summary",
    "speakerId": "shojaei",
    "topicIds": [
      "ghaflah"
    ],
    "kind": "compiled-majalis",
    "status": "catalog-only",
    "titleUr": "استاد محمد شجاعی — صحیفہ سجادیہ سے انسان شناسی",
    "titleEn": "Mohammad Shojaei — Anthropology through Sahifa Sajjadiyya",
    "topicsUr": [
      "غفلت",
      "خود شناسی",
      "صحیفہ سجادیہ"
    ],
    "topicsEn": [
      "heedlessness",
      "self-knowledge",
      "Sahifa Sajjadiyya"
    ],
    "summaryUr": "سرکاری ویب سائٹ کے شائع شدہ خلاصے میں اپنی حقیقی شناخت سے غفلت کو موضوع بنایا گیا ہے۔ ابھی مکمل مکتوب خطاب کا جائزہ باقی ہے۔",
    "summaryEn": "An official summary discusses neglect of true identity, but the complete transcript has not been reviewed.",
    "takeawaysUr": [
      "اصل بیان کا مکمل متن پڑھنے کے بعد ہی مخصوص مفصل دعوے منسوب کیے جائیں۔"
    ],
    "takeawaysEn": [
      "Specific detailed claims require reviewing the full talk."
    ],
    "sourceLabelUr": "رسانۂ رسمی استاد شجاعی — بیان کے نکات",
    "sourceLabelEn": "Official Shojaei media — published speaking outline",
    "sourceUrl": "https://media.montazer.ir/47690-2/"
  },
  {
    "id": "jawad-ghaflat-false-calm",
    "speakerId": "jawad-naqvi",
    "topicIds": [
      "ghaflah"
    ],
    "kind": "transcript",
    "status": "ready",
    "titleUr": "سنن الٰہی — درس ۶: غفلت سے پیدا شدہ اطمینان",
    "titleEn": "Divine Laws — lesson 6: false comfort born of heedlessness",
    "topicsUr": [
      "غفلت",
      "روحانی بیداری",
      "اصلاح"
    ],
    "topicsEn": [
      "heedlessness",
      "wakefulness",
      "reform"
    ],
    "summaryUr": "اس درس میں سید جواد نقوی دو قسم کے اطمینان میں فرق کرتے ہیں: ایک غفلت کا پیدا کردہ سرابی سکون اور دوسرا یقین سے حاصل ہونے والا پائیدار اطمینان۔ پہلی حالت میں انسان خطرے سے لاعلمی کے باعث مطمئن ہوتا ہے، نہ کہ خطرے کے ختم ہوجانے سے۔",
    "summaryEn": "Jawad Naqvi distinguishes illusory comfort produced by ignorance from stable tranquility grounded in certainty. The absence of alarm is not proof of safety.",
    "materialUr": [
      "اس درس میں سید جواد نقوی دو قسم کے اطمینان میں فرق کرتے ہیں: ایک غفلت کا پیدا کردہ سرابی سکون اور دوسرا یقین سے حاصل ہونے والا پائیدار اطمینان۔ پہلی حالت میں انسان خطرے سے لاعلمی کے باعث مطمئن ہوتا ہے، نہ کہ خطرے کے ختم ہوجانے سے۔",
      "غفلت کا سکون حقیقت سے بے خبری ہو سکتا ہے؛ ایمان کا اطمینان حقیقت سے باخبر ہو کر قائم رہتا ہے۔"
    ],
    "materialEn": [
      "Jawad Naqvi distinguishes illusory comfort produced by ignorance from stable tranquility grounded in certainty. The absence of alarm is not proof of safety."
    ],
    "takeawaysUr": [
      "غفلت کا سکون حقیقت سے بے خبری ہو سکتا ہے؛ ایمان کا اطمینان حقیقت سے باخبر ہو کر قائم رہتا ہے۔"
    ],
    "takeawaysEn": [
      "Jawad Naqvi distinguishes illusory comfort produced by ignorance from stable tranquility grounded in certainty. The absence of alarm is not proof of safety."
    ],
    "sourceLabelUr": "سید جواد نقوی — سنن الٰہی — درس ۶: غفلت سے پیدا شدہ اطمینان",
    "sourceLabelEn": "Syed Jawad Naqvi — Divine Laws — lesson 6: false comfort born of heedlessness",
    "sourceUrl": "https://www.syedjawadnaqvi.com/duroos/snn-ilhi/67ccb65da4f8fbdf012b8bf1"
  },
  {
    "id": "jawad-ghaflat-ethical-continuity",
    "speakerId": "jawad-naqvi",
    "topicIds": [
      "ghaflah"
    ],
    "kind": "transcript",
    "status": "ready",
    "titleUr": "آدابِ اسلامی — درس ۲۸: مجلس کے اثر کی حفاظت",
    "titleEn": "Islamic Manners — lesson 28: preserving an awakened state",
    "topicsUr": [
      "غفلت",
      "روحانی بیداری",
      "اصلاح"
    ],
    "topicsEn": [
      "heedlessness",
      "wakefulness",
      "reform"
    ],
    "summaryUr": "درس میں یہ مسئلہ اٹھایا گیا ہے کہ دعا، مجلس یا دینی اجتماع انسان پر گہرا اثر ڈال سکتا ہے، مگر ماحول سے نکلنے کے بعد پرانی عادتیں واپس آجاتی ہیں۔ وقتی کیفیت اور مستقل تربیت کے درمیان فرق پر گفتگو کی گئی ہے۔",
    "summaryEn": "This lesson addresses the gap between a moving devotional experience and sustained moral reform after returning to ordinary life.",
    "materialUr": [
      "درس میں یہ مسئلہ اٹھایا گیا ہے کہ دعا، مجلس یا دینی اجتماع انسان پر گہرا اثر ڈال سکتا ہے، مگر ماحول سے نکلنے کے بعد پرانی عادتیں واپس آجاتی ہیں۔ وقتی کیفیت اور مستقل تربیت کے درمیان فرق پر گفتگو کی گئی ہے۔",
      "مجلس میں آنکھ بھرنا کافی نہیں؛ مجلس کے بعد رویہ بدلنا بیداری کی علامت ہے۔"
    ],
    "materialEn": [
      "This lesson addresses the gap between a moving devotional experience and sustained moral reform after returning to ordinary life."
    ],
    "takeawaysUr": [
      "مجلس میں آنکھ بھرنا کافی نہیں؛ مجلس کے بعد رویہ بدلنا بیداری کی علامت ہے۔"
    ],
    "takeawaysEn": [
      "This lesson addresses the gap between a moving devotional experience and sustained moral reform after returning to ordinary life."
    ],
    "sourceLabelUr": "سید جواد نقوی — آدابِ اسلامی — درس ۲۸: مجلس کے اثر کی حفاظت",
    "sourceLabelEn": "Syed Jawad Naqvi — Islamic Manners — lesson 28: preserving an awakened state",
    "sourceUrl": "https://www.syedjawadnaqvi.com/duroos/adabe-islami/67ccaf2aa4f8fbdf012b7ea4"
  },
  {
    "id": "jawad-ghaflat-adab-salat",
    "speakerId": "jawad-naqvi",
    "topicIds": [
      "ghaflah"
    ],
    "kind": "transcript",
    "status": "ready",
    "titleUr": "آدابِ اسلامی — درس ۳۱: نماز میں غفلت",
    "titleEn": "Islamic Manners — lesson 31: negligence in prayer",
    "topicsUr": [
      "غفلت",
      "روحانی بیداری",
      "اصلاح"
    ],
    "topicsEn": [
      "heedlessness",
      "wakefulness",
      "reform"
    ],
    "summaryUr": "درس میں اس بات پر تنبیہ کی گئی ہے کہ نماز صرف ادا کرلینا کافی نہیں؛ جلدبازی، بے توجہی اور لاپروائی عبادت کے ادب کو متاثر کرتی ہے۔",
    "summaryEn": "The lesson treats rushed, inattentive prayer as a problem of the etiquette and meaning of worship, not merely of external performance.",
    "materialUr": [
      "درس میں اس بات پر تنبیہ کی گئی ہے کہ نماز صرف ادا کرلینا کافی نہیں؛ جلدبازی، بے توجہی اور لاپروائی عبادت کے ادب کو متاثر کرتی ہے۔",
      "عبادت کا ظاہر برقرار ہو مگر دل غیر حاضر ہو تو اصلاح کی ضرورت باقی رہتی ہے۔"
    ],
    "materialEn": [
      "The lesson treats rushed, inattentive prayer as a problem of the etiquette and meaning of worship, not merely of external performance."
    ],
    "takeawaysUr": [
      "عبادت کا ظاہر برقرار ہو مگر دل غیر حاضر ہو تو اصلاح کی ضرورت باقی رہتی ہے۔"
    ],
    "takeawaysEn": [
      "The lesson treats rushed, inattentive prayer as a problem of the etiquette and meaning of worship, not merely of external performance."
    ],
    "sourceLabelUr": "سید جواد نقوی — آدابِ اسلامی — درس ۳۱: نماز میں غفلت",
    "sourceLabelEn": "Syed Jawad Naqvi — Islamic Manners — lesson 31: negligence in prayer",
    "sourceUrl": "https://www.syedjawadnaqvi.com/duroos/adabe-islami/67ccaf34a4f8fbdf012b7eb6"
  },
  {
    "id": "qaraati-ghaflah-1369-index",
    "speakerId": "qaraati",
    "topicIds": [
      "ghaflah"
    ],
    "kind": "compiled-majalis",
    "status": "catalog-only",
    "titleUr": "درس‌هایی از قرآن — حقیقتِ غفلت (۱۳۶۹)",
    "titleEn": "Lessons from the Qur'an — Reality of Heedlessness (1369) [index only]",
    "topicsUr": [
      "غفلت"
    ],
    "topicsEn": [
      "heedlessness"
    ],
    "summaryUr": "صرف ۱۳۶۹ کے پروگراموں کی فہرست میں «حقیقتِ غفلت» کے عنوان اور ۴۵:۰۸ دورانیے کا ریکارڈ ملا؛ مکمل تقریر یا مصدقہ متن دستیاب نہیں۔",
    "summaryEn": "An archive index lists a 45:08 lecture titled Reality of Heedlessness; its transcript has not been checked.",
    "takeawaysUr": [
      "متن دستیاب ہونے تک اس تقریر سے کوئی مخصوص قول منسوب نہ کیا جائے۔"
    ],
    "takeawaysEn": [
      "Do not attribute any substantive thesis before reviewing the recording or transcript."
    ],
    "sourceLabelUr": "محسن قرائتی — ۱۳۶۹ کے دروس کی فہرست",
    "sourceLabelEn": "Mohsen Qaraati — 1369 lecture index",
    "sourceUrl": "https://sirafiha.ir/53560/%D8%B3%D8%AE%D9%86%D8%B1%D8%A7%D9%86%DB%8C-%D9%88-%D9%86%D9%82%D8%AF-%D9%88-%D8%A8%D8%B1%D8%B1%D8%B3%DB%8C/%D8%AF%D8%A7%D9%86%D9%84%D9%88%D8%AF-%D8%AF%D8%B1%D8%B3-%D9%87%D8%A7%DB%8C%DB%8C-%D8%A7%D8%B2-%D9%82%D8%B1%D8%A2%D9%86-%D8%AD%D8%AC%D8%AA-%D8%A7%D9%84%D8%A7%D8%B3%D9%84%D8%A7%D9%85-%D9%85%D8%AD/"
  },
  {
    "id": "hamed-kashani-ghaflah-1",
    "speakerId": "hamed-kashani",
    "topicIds": [
      "ghaflah"
    ],
    "kind": "transcript",
    "status": "ready",
    "titleUr": "حامد کاشانی — خطر غفلت، مجلس 1",
    "titleEn": "Hamed Kashani — Danger of Heedlessness, session 1",
    "topicsUr": [
      "غفلت",
      "ذکر",
      "بیداری"
    ],
    "topicsEn": [
      "heedlessness",
      "remembrance",
      "wakefulness"
    ],
    "summaryUr": "توجہ اور غفلت کا مسئلہ؛ یادِ خدا اور موت کے ذریعے بیداری۔",
    "summaryEn": "Lecture 1 examines the problem of attention and discusses remembrance of God and death.",
    "materialUr": [
      "توجہ اور غفلت کا مسئلہ؛ یادِ خدا اور موت کے ذریعے بیداری۔"
    ],
    "materialEn": [
      "Lecture 1 examines the problem of attention and discusses remembrance of God and death."
    ],
    "takeawaysUr": [
      "توجہ اور غفلت کا مسئلہ؛ یادِ خدا اور موت کے ذریعے بیداری۔"
    ],
    "takeawaysEn": [
      "Lecture 1 examines the problem of attention and discusses remembrance of God and death."
    ],
    "sourceLabelUr": "حامد کاشانی — اصل مکتوب خطاب",
    "sourceLabelEn": "Hamed Kashani — published transcript",
    "sourceUrl": "https://www.hkashani.com/?p=23340"
  },
  {
    "id": "hamed-kashani-ghaflah-2",
    "speakerId": "hamed-kashani",
    "topicIds": [
      "ghaflah"
    ],
    "kind": "transcript",
    "status": "catalog-only",
    "titleUr": "حامد کاشانی — خطر غفلت، مجلس 2",
    "titleEn": "Hamed Kashani — Danger of Heedlessness, session 2",
    "topicsUr": [
      "غفلت",
      "ذکر",
      "بیداری"
    ],
    "topicsEn": [
      "heedlessness",
      "remembrance",
      "wakefulness"
    ],
    "summaryUr": "مکتوب خطاب کی شناخت اور اصل صفحہ موجود ہے؛ موضوعی نکات کا تفصیلی جائزہ ابھی باقی ہے۔",
    "summaryEn": "A transcript page is located; the full scholarly analysis of this session is pending.",
    "takeawaysUr": [
      "بغیر متن کے جائزے کے مخصوص علمی دعویٰ منسوب نہیں ہوگا۔"
    ],
    "takeawaysEn": [
      "No substantive claims should be attributed until the speech is reviewed."
    ],
    "sourceLabelUr": "حامد کاشانی — اصل تقریر کا صفحہ؛ تحقیق باقی",
    "sourceLabelEn": "Hamed Kashani — indexed transcript, analysis pending",
    "sourceUrl": "https://www.hkashani.com/?p=23351"
  },
  {
    "id": "hamed-kashani-ghaflah-3",
    "speakerId": "hamed-kashani",
    "topicIds": [
      "ghaflah"
    ],
    "kind": "transcript",
    "status": "catalog-only",
    "titleUr": "حامد کاشانی — خطر غفلت، مجلس 3",
    "titleEn": "Hamed Kashani — Danger of Heedlessness, session 3",
    "topicsUr": [
      "غفلت",
      "ذکر",
      "بیداری"
    ],
    "topicsEn": [
      "heedlessness",
      "remembrance",
      "wakefulness"
    ],
    "summaryUr": "مکتوب خطاب کی شناخت اور اصل صفحہ موجود ہے؛ موضوعی نکات کا تفصیلی جائزہ ابھی باقی ہے۔",
    "summaryEn": "A transcript page is located; the full scholarly analysis of this session is pending.",
    "takeawaysUr": [
      "بغیر متن کے جائزے کے مخصوص علمی دعویٰ منسوب نہیں ہوگا۔"
    ],
    "takeawaysEn": [
      "No substantive claims should be attributed until the speech is reviewed."
    ],
    "sourceLabelUr": "حامد کاشانی — اصل تقریر کا صفحہ؛ تحقیق باقی",
    "sourceLabelEn": "Hamed Kashani — indexed transcript, analysis pending",
    "sourceUrl": "https://www.hkashani.com/?p=23386"
  },
  {
    "id": "hamed-kashani-ghaflah-4",
    "speakerId": "hamed-kashani",
    "topicIds": [
      "ghaflah"
    ],
    "kind": "transcript",
    "status": "catalog-only",
    "titleUr": "حامد کاشانی — خطر غفلت، مجلس 4",
    "titleEn": "Hamed Kashani — Danger of Heedlessness, session 4",
    "topicsUr": [
      "غفلت",
      "ذکر",
      "بیداری"
    ],
    "topicsEn": [
      "heedlessness",
      "remembrance",
      "wakefulness"
    ],
    "summaryUr": "مکتوب خطاب کی شناخت اور اصل صفحہ موجود ہے؛ موضوعی نکات کا تفصیلی جائزہ ابھی باقی ہے۔",
    "summaryEn": "A transcript page is located; the full scholarly analysis of this session is pending.",
    "takeawaysUr": [
      "بغیر متن کے جائزے کے مخصوص علمی دعویٰ منسوب نہیں ہوگا۔"
    ],
    "takeawaysEn": [
      "No substantive claims should be attributed until the speech is reviewed."
    ],
    "sourceLabelUr": "حامد کاشانی — اصل تقریر کا صفحہ؛ تحقیق باقی",
    "sourceLabelEn": "Hamed Kashani — indexed transcript, analysis pending",
    "sourceUrl": "https://www.hkashani.com/?p=23429"
  },
  {
    "id": "hamed-kashani-ghaflah-5",
    "speakerId": "hamed-kashani",
    "topicIds": [
      "ghaflah"
    ],
    "kind": "transcript",
    "status": "ready",
    "titleUr": "حامد کاشانی — خطر غفلت، مجلس 5",
    "titleEn": "Hamed Kashani — Danger of Heedlessness, session 5",
    "topicsUr": [
      "غفلت",
      "ذکر",
      "بیداری"
    ],
    "topicsEn": [
      "heedlessness",
      "remembrance",
      "wakefulness"
    ],
    "summaryUr": "زندگی کے ایک پہلو میں اس طرح کھو جانا کہ دیگر ذمہ داریاں نگاہ سے اوجھل ہوجائیں۔",
    "summaryEn": "Lecture 5 discusses preoccupation with one concern while other duties are neglected.",
    "materialUr": [
      "زندگی کے ایک پہلو میں اس طرح کھو جانا کہ دیگر ذمہ داریاں نگاہ سے اوجھل ہوجائیں۔"
    ],
    "materialEn": [
      "Lecture 5 discusses preoccupation with one concern while other duties are neglected."
    ],
    "takeawaysUr": [
      "زندگی کے ایک پہلو میں اس طرح کھو جانا کہ دیگر ذمہ داریاں نگاہ سے اوجھل ہوجائیں۔"
    ],
    "takeawaysEn": [
      "Lecture 5 discusses preoccupation with one concern while other duties are neglected."
    ],
    "sourceLabelUr": "حامد کاشانی — اصل مکتوب خطاب",
    "sourceLabelEn": "Hamed Kashani — published transcript",
    "sourceUrl": "https://www.hkashani.com/?p=23605"
  },
  {
    "id": "hamed-kashani-ghaflah-6",
    "speakerId": "hamed-kashani",
    "topicIds": [
      "ghaflah"
    ],
    "kind": "transcript",
    "status": "catalog-only",
    "titleUr": "حامد کاشانی — خطر غفلت، مجلس 6",
    "titleEn": "Hamed Kashani — Danger of Heedlessness, session 6",
    "topicsUr": [
      "غفلت",
      "ذکر",
      "بیداری"
    ],
    "topicsEn": [
      "heedlessness",
      "remembrance",
      "wakefulness"
    ],
    "summaryUr": "مکتوب خطاب کی شناخت اور اصل صفحہ موجود ہے؛ موضوعی نکات کا تفصیلی جائزہ ابھی باقی ہے۔",
    "summaryEn": "A transcript page is located; the full scholarly analysis of this session is pending.",
    "takeawaysUr": [
      "بغیر متن کے جائزے کے مخصوص علمی دعویٰ منسوب نہیں ہوگا۔"
    ],
    "takeawaysEn": [
      "No substantive claims should be attributed until the speech is reviewed."
    ],
    "sourceLabelUr": "حامد کاشانی — اصل تقریر کا صفحہ؛ تحقیق باقی",
    "sourceLabelEn": "Hamed Kashani — indexed transcript, analysis pending",
    "sourceUrl": "https://www.hkashani.com/?p=23773"
  },
  {
    "id": "hamed-kashani-ghaflah-7",
    "speakerId": "hamed-kashani",
    "topicIds": [
      "ghaflah"
    ],
    "kind": "transcript",
    "status": "catalog-only",
    "titleUr": "حامد کاشانی — خطر غفلت، مجلس 7",
    "titleEn": "Hamed Kashani — Danger of Heedlessness, session 7",
    "topicsUr": [
      "غفلت",
      "ذکر",
      "بیداری"
    ],
    "topicsEn": [
      "heedlessness",
      "remembrance",
      "wakefulness"
    ],
    "summaryUr": "مکتوب خطاب کی شناخت اور اصل صفحہ موجود ہے؛ موضوعی نکات کا تفصیلی جائزہ ابھی باقی ہے۔",
    "summaryEn": "A transcript page is located; the full scholarly analysis of this session is pending.",
    "takeawaysUr": [
      "بغیر متن کے جائزے کے مخصوص علمی دعویٰ منسوب نہیں ہوگا۔"
    ],
    "takeawaysEn": [
      "No substantive claims should be attributed until the speech is reviewed."
    ],
    "sourceLabelUr": "حامد کاشانی — اصل تقریر کا صفحہ؛ تحقیق باقی",
    "sourceLabelEn": "Hamed Kashani — indexed transcript, analysis pending",
    "sourceUrl": "https://www.hkashani.com/?p=23856"
  },
  {
    "id": "hamed-kashani-ghaflah-8",
    "speakerId": "hamed-kashani",
    "topicIds": [
      "ghaflah"
    ],
    "kind": "transcript",
    "status": "catalog-only",
    "titleUr": "حامد کاشانی — خطر غفلت، مجلس 8",
    "titleEn": "Hamed Kashani — Danger of Heedlessness, session 8",
    "topicsUr": [
      "غفلت",
      "ذکر",
      "بیداری"
    ],
    "topicsEn": [
      "heedlessness",
      "remembrance",
      "wakefulness"
    ],
    "summaryUr": "مکتوب خطاب کی شناخت اور اصل صفحہ موجود ہے؛ موضوعی نکات کا تفصیلی جائزہ ابھی باقی ہے۔",
    "summaryEn": "A transcript page is located; the full scholarly analysis of this session is pending.",
    "takeawaysUr": [
      "بغیر متن کے جائزے کے مخصوص علمی دعویٰ منسوب نہیں ہوگا۔"
    ],
    "takeawaysEn": [
      "No substantive claims should be attributed until the speech is reviewed."
    ],
    "sourceLabelUr": "حامد کاشانی — اصل تقریر کا صفحہ؛ تحقیق باقی",
    "sourceLabelEn": "Hamed Kashani — indexed transcript, analysis pending",
    "sourceUrl": "https://www.hkashani.com/?p=23891"
  },
  {
    "id": "hamed-kashani-ghaflah-9",
    "speakerId": "hamed-kashani",
    "topicIds": [
      "ghaflah"
    ],
    "kind": "transcript",
    "status": "catalog-only",
    "titleUr": "حامد کاشانی — خطر غفلت، مجلس 9",
    "titleEn": "Hamed Kashani — Danger of Heedlessness, session 9",
    "topicsUr": [
      "غفلت",
      "ذکر",
      "بیداری"
    ],
    "topicsEn": [
      "heedlessness",
      "remembrance",
      "wakefulness"
    ],
    "summaryUr": "مکتوب خطاب کی شناخت اور اصل صفحہ موجود ہے؛ موضوعی نکات کا تفصیلی جائزہ ابھی باقی ہے۔",
    "summaryEn": "A transcript page is located; the full scholarly analysis of this session is pending.",
    "takeawaysUr": [
      "بغیر متن کے جائزے کے مخصوص علمی دعویٰ منسوب نہیں ہوگا۔"
    ],
    "takeawaysEn": [
      "No substantive claims should be attributed until the speech is reviewed."
    ],
    "sourceLabelUr": "حامد کاشانی — اصل تقریر کا صفحہ؛ تحقیق باقی",
    "sourceLabelEn": "Hamed Kashani — indexed transcript, analysis pending",
    "sourceUrl": "https://www.hkashani.com/?p=23916"
  },
  {
    "id": "hamed-kashani-ghaflah-10",
    "speakerId": "hamed-kashani",
    "topicIds": [
      "ghaflah"
    ],
    "kind": "transcript",
    "status": "ready",
    "titleUr": "حامد کاشانی — خطر غفلت، مجلس 10",
    "titleEn": "Hamed Kashani — Danger of Heedlessness, session 10",
    "topicsUr": [
      "غفلت",
      "ذکر",
      "بیداری"
    ],
    "topicsEn": [
      "heedlessness",
      "remembrance",
      "wakefulness"
    ],
    "summaryUr": "غفلت کے مقابل ذکر، تقویٰ اور بیداری کے اخلاقی نتائج۔",
    "summaryEn": "Lecture 10 discusses remembrance, vigilance and God-consciousness.",
    "materialUr": [
      "غفلت کے مقابل ذکر، تقویٰ اور بیداری کے اخلاقی نتائج۔"
    ],
    "materialEn": [
      "Lecture 10 discusses remembrance, vigilance and God-consciousness."
    ],
    "takeawaysUr": [
      "غفلت کے مقابل ذکر، تقویٰ اور بیداری کے اخلاقی نتائج۔"
    ],
    "takeawaysEn": [
      "Lecture 10 discusses remembrance, vigilance and God-consciousness."
    ],
    "sourceLabelUr": "حامد کاشانی — اصل مکتوب خطاب",
    "sourceLabelEn": "Hamed Kashani — published transcript",
    "sourceUrl": "https://www.hkashani.com/?p=23978"
  },
  {
    "id": "naser-rafiei-ghaflah-letter-69",
    "speakerId": "naser-rafiei",
    "topicIds": [
      "ghaflah"
    ],
    "kind": "transcript",
    "status": "ready",
    "titleUr": "ناصر رفیعی — غفلت، شرح نامہ ۶۹ نہج البلاغہ",
    "titleEn": "Naser Rafiei — Heedlessness, commentary on letter 69",
    "topicsUr": [
      "غفلت",
      "نہج البلاغہ",
      "انسانی ادراک"
    ],
    "topicsEn": [
      "heedlessness",
      "Nahj al-Balagha",
      "attention"
    ],
    "summaryUr": "مکتوب خطاب میں نہج البلاغہ کے نامہ ۶۹ سے غفلت کے ماحول اور سورۂ اعراف ۷:۱۷۹ سے دل، آنکھ اور کان کی بے عملی کو موضوع بنایا گیا ہے۔",
    "summaryEn": "A published sermon explains letter 69's warning against heedless environments and the neglected faculties highlighted in Qur'an 7:179.",
    "materialUr": [
      "امیرالمؤمنینؑ کی نصیحت کو صرف انفرادی نیت تک محدود نہ رکھیں؛ مجلس، ماحول، صحبت اور سماعت کے انتخاب کا سوال بھی اٹھائیں۔",
      "الاعراف ۷:۱۷۹ سے آگہی کی عملی ذمہ داری سمجھائیں، نہ کہ محض عقلی صلاحیت کا ہونا۔"
    ],
    "materialEn": [
      "Extend letter 69's warning to companionship and moral environment.",
      "Use Qur'an 7:179 to distinguish having faculties from exercising them responsibly."
    ],
    "takeawaysUr": [
      "غفلت کے ماحول اور صحبت سے بچنا دینی بیداری کا حصہ ہے۔"
    ],
    "takeawaysEn": [
      "Moral environment and companionship influence spiritual attentiveness."
    ],
    "sourceLabelUr": "ناصر رفیعی — غفلت / نامہ ۶۹، مکتوب خطاب",
    "sourceLabelEn": "Naser Rafiei — Heedlessness / letter 69, published transcript",
    "sourceUrl": "https://shiaquest.net/%D8%B3%D8%AE%D9%86%D8%B1%D8%A7%D9%86%DB%8C-%D9%85%DA%A9%D8%AA%D9%88%D8%A8-%D9%88%DB%8C%DA%98%D9%87-%D9%85%D8%A7%D9%87-%D8%B1%D9%85%D8%B6%D8%A7%D9%86/%D8%B3%D8%AE%D9%86%D8%B1%D8%A7%D9%86%DB%8C%D9%87%D8%A7/10666-69-6.html"
  },
  {
    "id": "mirbaqeri-ghaflah-remembrance-lead",
    "speakerId": "mirbaqeri",
    "topicIds": [
      "ghaflah"
    ],
    "kind": "compiled-majalis",
    "status": "catalog-only",
    "titleUr": "آیت اللہ میرباقری — ذکر سے دوری اور غفلت کا خطرہ",
    "titleEn": "Ayatollah Mirbaqeri — absence of remembrance and heedlessness",
    "topicsUr": [
      "غفلت",
      "ذکر",
      "سیرت"
    ],
    "topicsEn": [
      "heedlessness",
      "remembrance",
      "spiritual formation"
    ],
    "summaryUr": "مقامی حوزوی مرکز کی شائع شدہ رپورٹ میں ذکر اور غفلت کے فرق کے حوالے سے ان کا بیان نقل ہوا ہے؛ مکمل لفظی تقریر کا جائزہ ابھی باقی ہے۔",
    "summaryEn": "A seminary account reports his remarks on distraction and remembrance, but the full talk has not been reviewed.",
    "takeawaysUr": [
      "اصل مکتوب خطاب کے بغیر جزئیات یا مخصوص قول منسوب نہ کیا جائے۔"
    ],
    "takeawaysEn": [
      "Avoid unverified direct quotation until the complete text is reviewed."
    ],
    "sourceLabelUr": "حوزۂ قم کے اساتذہ کی رپورٹ — مکمل مکتوب خطاب نہیں",
    "sourceLabelEn": "Qom seminary teachers' report — not a complete transcript",
    "sourceUrl": "https://www.neshasteasatid.com/node/3540"
  }
];
export const GHAF_LAH_VERIFIED_HADITHS: readonly VerifiedHadithRecord[] = [
  {
    "id": "ghaflah-ghurar-1",
    "topicIds": [
      "ghaflah"
    ],
    "dossierPrimaryTextId": "ghaflah-ghurar-1",
    "attributedToUr": "امیرالمؤمنین علیؑ",
    "attributedToEn": "Imam Ali",
    "sourceTitleUr": "غرر الحکم و درر الکلم",
    "sourceTitleEn": "Ghurar al-Hikam wa Durar al-Kalim",
    "citedReferenceUr": "غرر الحکم، باب الغفلة، اندراج 1",
    "citedReferenceEn": "Ghurar al-Hikam, Negligence, item 1",
    "sourceUrl": "https://al-islam.org/ghurar-al-hikam-wa-durar-al-kalim-exalted-aphorisms-and-pearls-speech/negligence",
    "candidateArabic": "إنْتِباهُ العُيُونِ لايَنْفَعُ مَعَ غَفْلَةِ القُلُوبِ.",
    "status": "verified",
    "exactArabic": "إنْتِباهُ العُيُونِ لايَنْفَعُ مَعَ غَفْلَةِ القُلُوبِ.",
    "translationUr": "آنکھوں کا جاگنا، دلوں کی غفلت کے ساتھ فائدہ نہیں دیتا۔",
    "translationEn": "Wakeful eyes cannot make up for inattentive hearts.",
    "translationStatus": "editorial",
    "translationArabic": "إنْتِباهُ العُيُونِ لايَنْفَعُ مَعَ غَفْلَةِ القُلُوبِ.",
    "translationSourceLabelUr": "قلم ورکس — اصل عربی سے تدوینی ترجمہ",
    "translationSourceLabelEn": "Qalam Works — editorial translation of Arabic",
    "verifiedReferenceUr": "غرر الحکم و درر الکلم، باب الغفلة، نمبر 1",
    "verifiedReferenceEn": "Ghurar al-Hikam wa Durar al-Kalim, Negligence, entry 1",
    "verifiedSourceUrl": "https://al-islam.org/ghurar-al-hikam-wa-durar-al-kalim-exalted-aphorisms-and-pearls-speech/negligence",
    "verificationWitnessId": "al-islam-ghaflah-1",
    "witnesses": [
      {
        "id": "al-islam-ghaflah-1",
        "role": "verification-source",
        "sourceTitleUr": "غرر الحکم — عربی نقل، Al-Islam.org",
        "sourceTitleEn": "Ghurar al-Hikam — Arabic transcription at Al-Islam.org",
        "sourceUrl": "https://al-islam.org/ghurar-al-hikam-wa-durar-al-kalim-exalted-aphorisms-and-pearls-speech/negligence",
        "citation": {
          "bookUr": "غرر الحکم و درر الکلم",
          "bookEn": "Ghurar al-Hikam wa Durar al-Kalim",
          "chapterUr": "الغفلة",
          "chapterEn": "Negligence",
          "hadithNumber": "section entry 1"
        },
        "exactArabic": "إنْتِباهُ العُيُونِ لايَنْفَعُ مَعَ غَفْلَةِ القُلُوبِ.",
        "textVerified": true,
        "note": "Compared to numbered original-Arabic entry on the linked page; no independent manuscript collation or sanad grading asserted."
      }
    ]
  },
  {
    "id": "ghaflah-ghurar-4",
    "topicIds": [
      "ghaflah"
    ],
    "dossierPrimaryTextId": "ghaflah-ghurar-4",
    "attributedToUr": "امیرالمؤمنین علیؑ",
    "attributedToEn": "Imam Ali",
    "sourceTitleUr": "غرر الحکم و درر الکلم",
    "sourceTitleEn": "Ghurar al-Hikam wa Durar al-Kalim",
    "citedReferenceUr": "غرر الحکم، باب الغفلة، اندراج 4",
    "citedReferenceEn": "Ghurar al-Hikam, Negligence, item 4",
    "sourceUrl": "https://al-islam.org/ghurar-al-hikam-wa-durar-al-kalim-exalted-aphorisms-and-pearls-speech/negligence",
    "candidateArabic": "إيّاكَ والغَفْلَةَ، والاِغْتِرارَ بِالمُهْلَةِ، فَإنَّ الغَفْلَةَ تُفْسِدُ الأعْمالَ، وَالآجالَ تَقْطَعُ الآمالَ.",
    "status": "verified",
    "exactArabic": "إيّاكَ والغَفْلَةَ، والاِغْتِرارَ بِالمُهْلَةِ، فَإنَّ الغَفْلَةَ تُفْسِدُ الأعْمالَ، وَالآجالَ تَقْطَعُ الآمالَ.",
    "translationUr": "غفلت اور مہلت سے دھوکا کھانے سے بچو؛ غفلت اعمال کو خراب کرتی ہے اور مقررہ اجل امیدوں کو کاٹ دیتی ہے۔",
    "translationEn": "Do not mistake delay for safety: inattention spoils deeds, and life's end interrupts hopes.",
    "translationStatus": "editorial",
    "translationArabic": "إيّاكَ والغَفْلَةَ، والاِغْتِرارَ بِالمُهْلَةِ، فَإنَّ الغَفْلَةَ تُفْسِدُ الأعْمالَ، وَالآجالَ تَقْطَعُ الآمالَ.",
    "translationSourceLabelUr": "قلم ورکس — اصل عربی سے تدوینی ترجمہ",
    "translationSourceLabelEn": "Qalam Works — editorial translation of Arabic",
    "verifiedReferenceUr": "غرر الحکم و درر الکلم، باب الغفلة، نمبر 4",
    "verifiedReferenceEn": "Ghurar al-Hikam wa Durar al-Kalim, Negligence, entry 4",
    "verifiedSourceUrl": "https://al-islam.org/ghurar-al-hikam-wa-durar-al-kalim-exalted-aphorisms-and-pearls-speech/negligence",
    "verificationWitnessId": "al-islam-ghaflah-4",
    "witnesses": [
      {
        "id": "al-islam-ghaflah-4",
        "role": "verification-source",
        "sourceTitleUr": "غرر الحکم — عربی نقل، Al-Islam.org",
        "sourceTitleEn": "Ghurar al-Hikam — Arabic transcription at Al-Islam.org",
        "sourceUrl": "https://al-islam.org/ghurar-al-hikam-wa-durar-al-kalim-exalted-aphorisms-and-pearls-speech/negligence",
        "citation": {
          "bookUr": "غرر الحکم و درر الکلم",
          "bookEn": "Ghurar al-Hikam wa Durar al-Kalim",
          "chapterUr": "الغفلة",
          "chapterEn": "Negligence",
          "hadithNumber": "section entry 4"
        },
        "exactArabic": "إيّاكَ والغَفْلَةَ، والاِغْتِرارَ بِالمُهْلَةِ، فَإنَّ الغَفْلَةَ تُفْسِدُ الأعْمالَ، وَالآجالَ تَقْطَعُ الآمالَ.",
        "textVerified": true,
        "note": "Compared to numbered original-Arabic entry on the linked page; no independent manuscript collation or sanad grading asserted."
      }
    ]
  },
  {
    "id": "ghaflah-ghurar-11",
    "topicIds": [
      "ghaflah"
    ],
    "dossierPrimaryTextId": "ghaflah-ghurar-11",
    "attributedToUr": "امیرالمؤمنین علیؑ",
    "attributedToEn": "Imam Ali",
    "sourceTitleUr": "غرر الحکم و درر الکلم",
    "sourceTitleEn": "Ghurar al-Hikam wa Durar al-Kalim",
    "citedReferenceUr": "غرر الحکم، باب الغفلة، اندراج 11",
    "citedReferenceEn": "Ghurar al-Hikam, Negligence, item 11",
    "sourceUrl": "https://al-islam.org/ghurar-al-hikam-wa-durar-al-kalim-exalted-aphorisms-and-pearls-speech/negligence",
    "candidateArabic": "دَوامُ الغَفْلَةِ يُعْمِى البَصيرَةَ.",
    "status": "verified",
    "exactArabic": "دَوامُ الغَفْلَةِ يُعْمِى البَصيرَةَ.",
    "translationUr": "مسلسل غفلت بصیرت کو اندھا کردیتی ہے۔",
    "translationEn": "Habitual heedlessness blinds insight.",
    "translationStatus": "editorial",
    "translationArabic": "دَوامُ الغَفْلَةِ يُعْمِى البَصيرَةَ.",
    "translationSourceLabelUr": "قلم ورکس — اصل عربی سے تدوینی ترجمہ",
    "translationSourceLabelEn": "Qalam Works — editorial translation of Arabic",
    "verifiedReferenceUr": "غرر الحکم و درر الکلم، باب الغفلة، نمبر 11",
    "verifiedReferenceEn": "Ghurar al-Hikam wa Durar al-Kalim, Negligence, entry 11",
    "verifiedSourceUrl": "https://al-islam.org/ghurar-al-hikam-wa-durar-al-kalim-exalted-aphorisms-and-pearls-speech/negligence",
    "verificationWitnessId": "al-islam-ghaflah-11",
    "witnesses": [
      {
        "id": "al-islam-ghaflah-11",
        "role": "verification-source",
        "sourceTitleUr": "غرر الحکم — عربی نقل، Al-Islam.org",
        "sourceTitleEn": "Ghurar al-Hikam — Arabic transcription at Al-Islam.org",
        "sourceUrl": "https://al-islam.org/ghurar-al-hikam-wa-durar-al-kalim-exalted-aphorisms-and-pearls-speech/negligence",
        "citation": {
          "bookUr": "غرر الحکم و درر الکلم",
          "bookEn": "Ghurar al-Hikam wa Durar al-Kalim",
          "chapterUr": "الغفلة",
          "chapterEn": "Negligence",
          "hadithNumber": "section entry 11"
        },
        "exactArabic": "دَوامُ الغَفْلَةِ يُعْمِى البَصيرَةَ.",
        "textVerified": true,
        "note": "Compared to numbered original-Arabic entry on the linked page; no independent manuscript collation or sanad grading asserted."
      }
    ]
  },
  {
    "id": "ghaflah-ghurar-13",
    "topicIds": [
      "ghaflah"
    ],
    "dossierPrimaryTextId": "ghaflah-ghurar-13",
    "attributedToUr": "امیرالمؤمنین علیؑ",
    "attributedToEn": "Imam Ali",
    "sourceTitleUr": "غرر الحکم و درر الکلم",
    "sourceTitleEn": "Ghurar al-Hikam wa Durar al-Kalim",
    "citedReferenceUr": "غرر الحکم، باب الغفلة، اندراج 13",
    "citedReferenceEn": "Ghurar al-Hikam, Negligence, item 13",
    "sourceUrl": "https://al-islam.org/ghurar-al-hikam-wa-durar-al-kalim-exalted-aphorisms-and-pearls-speech/negligence",
    "candidateArabic": "ضادُّوا الغَفْلَةَ بِاليَقْظَةِ.",
    "status": "verified",
    "exactArabic": "ضادُّوا الغَفْلَةَ بِاليَقْظَةِ.",
    "translationUr": "غفلت کا مقابلہ بیداری سے کرو۔",
    "translationEn": "Counter heedlessness with wakefulness.",
    "translationStatus": "editorial",
    "translationArabic": "ضادُّوا الغَفْلَةَ بِاليَقْظَةِ.",
    "translationSourceLabelUr": "قلم ورکس — اصل عربی سے تدوینی ترجمہ",
    "translationSourceLabelEn": "Qalam Works — editorial translation of Arabic",
    "verifiedReferenceUr": "غرر الحکم و درر الکلم، باب الغفلة، نمبر 13",
    "verifiedReferenceEn": "Ghurar al-Hikam wa Durar al-Kalim, Negligence, entry 13",
    "verifiedSourceUrl": "https://al-islam.org/ghurar-al-hikam-wa-durar-al-kalim-exalted-aphorisms-and-pearls-speech/negligence",
    "verificationWitnessId": "al-islam-ghaflah-13",
    "witnesses": [
      {
        "id": "al-islam-ghaflah-13",
        "role": "verification-source",
        "sourceTitleUr": "غرر الحکم — عربی نقل، Al-Islam.org",
        "sourceTitleEn": "Ghurar al-Hikam — Arabic transcription at Al-Islam.org",
        "sourceUrl": "https://al-islam.org/ghurar-al-hikam-wa-durar-al-kalim-exalted-aphorisms-and-pearls-speech/negligence",
        "citation": {
          "bookUr": "غرر الحکم و درر الکلم",
          "bookEn": "Ghurar al-Hikam wa Durar al-Kalim",
          "chapterUr": "الغفلة",
          "chapterEn": "Negligence",
          "hadithNumber": "section entry 13"
        },
        "exactArabic": "ضادُّوا الغَفْلَةَ بِاليَقْظَةِ.",
        "textVerified": true,
        "note": "Compared to numbered original-Arabic entry on the linked page; no independent manuscript collation or sanad grading asserted."
      }
    ]
  },
  {
    "id": "ghaflah-ghurar-20",
    "topicIds": [
      "ghaflah"
    ],
    "dossierPrimaryTextId": "ghaflah-ghurar-20",
    "attributedToUr": "امیرالمؤمنین علیؑ",
    "attributedToEn": "Imam Ali",
    "sourceTitleUr": "غرر الحکم و درر الکلم",
    "sourceTitleEn": "Ghurar al-Hikam wa Durar al-Kalim",
    "citedReferenceUr": "غرر الحکم، باب الغفلة، اندراج 20",
    "citedReferenceEn": "Ghurar al-Hikam, Negligence, item 20",
    "sourceUrl": "https://al-islam.org/ghurar-al-hikam-wa-durar-al-kalim-exalted-aphorisms-and-pearls-speech/negligence",
    "candidateArabic": "كَفى بِالرَّجُلِ غَفْلَةً أنْ يُضَيِّعَ عُمْرَهُ فيما لايُنْجيهِ.",
    "status": "verified",
    "exactArabic": "كَفى بِالرَّجُلِ غَفْلَةً أنْ يُضَيِّعَ عُمْرَهُ فيما لايُنْجيهِ.",
    "translationUr": "کسی انسان کی غفلت کے لیے یہی کافی ہے کہ وہ عمر ایسے کام میں ضائع کرے جو اسے نجات نہ دے۔",
    "translationEn": "Wasting one's life on what cannot save it is itself a sign of heedlessness.",
    "translationStatus": "editorial",
    "translationArabic": "كَفى بِالرَّجُلِ غَفْلَةً أنْ يُضَيِّعَ عُمْرَهُ فيما لايُنْجيهِ.",
    "translationSourceLabelUr": "قلم ورکس — اصل عربی سے تدوینی ترجمہ",
    "translationSourceLabelEn": "Qalam Works — editorial translation of Arabic",
    "verifiedReferenceUr": "غرر الحکم و درر الکلم، باب الغفلة، نمبر 20",
    "verifiedReferenceEn": "Ghurar al-Hikam wa Durar al-Kalim, Negligence, entry 20",
    "verifiedSourceUrl": "https://al-islam.org/ghurar-al-hikam-wa-durar-al-kalim-exalted-aphorisms-and-pearls-speech/negligence",
    "verificationWitnessId": "al-islam-ghaflah-20",
    "witnesses": [
      {
        "id": "al-islam-ghaflah-20",
        "role": "verification-source",
        "sourceTitleUr": "غرر الحکم — عربی نقل، Al-Islam.org",
        "sourceTitleEn": "Ghurar al-Hikam — Arabic transcription at Al-Islam.org",
        "sourceUrl": "https://al-islam.org/ghurar-al-hikam-wa-durar-al-kalim-exalted-aphorisms-and-pearls-speech/negligence",
        "citation": {
          "bookUr": "غرر الحکم و درر الکلم",
          "bookEn": "Ghurar al-Hikam wa Durar al-Kalim",
          "chapterUr": "الغفلة",
          "chapterEn": "Negligence",
          "hadithNumber": "section entry 20"
        },
        "exactArabic": "كَفى بِالرَّجُلِ غَفْلَةً أنْ يُضَيِّعَ عُمْرَهُ فيما لايُنْجيهِ.",
        "textVerified": true,
        "note": "Compared to numbered original-Arabic entry on the linked page; no independent manuscript collation or sanad grading asserted."
      }
    ]
  },
  {
    "id": "ghaflah-ghurar-17",
    "topicIds": [
      "ghaflah"
    ],
    "dossierPrimaryTextId": "ghaflah-ghurar-17",
    "attributedToUr": "امیرالمؤمنین علیؑ",
    "attributedToEn": "Imam Ali",
    "sourceTitleUr": "غرر الحکم و درر الکلم",
    "sourceTitleEn": "Ghurar al-Hikam wa Durar al-Kalim",
    "citedReferenceUr": "غرر الحکم، باب الغفلة، اندراج 17",
    "citedReferenceEn": "Ghurar al-Hikam, Negligence, item 17",
    "sourceUrl": "https://al-islam.org/ghurar-al-hikam-wa-durar-al-kalim-exalted-aphorisms-and-pearls-speech/negligence",
    "candidateArabic": "فَأفِقْ أيُّهَا السّامِعُ مِنْ غَفْلَتِكَ، واخْتَصِرْ مِنْ عَجَلَتِكَ، وأشْدُدْ أزْرَكَ، وخُذْ حِذْرَكَ، واذْكُرْ قَبْرَكَ، فَإنَّ عَلَيْهِ مَمَرَّكَ.",
    "status": "verified",
    "exactArabic": "فَأفِقْ أيُّهَا السّامِعُ مِنْ غَفْلَتِكَ، واخْتَصِرْ مِنْ عَجَلَتِكَ، وأشْدُدْ أزْرَكَ، وخُذْ حِذْرَكَ، واذْكُرْ قَبْرَكَ، فَإنَّ عَلَيْهِ مَمَرَّكَ.",
    "translationUr": "اے سننے والے، غفلت سے بیدار ہوجا، جلدبازی کم کر، کمر کس، ہوشیار رہ اور اپنی قبر کو یاد کر جس سے گزرنا ہے۔",
    "translationEn": "Awaken, slow your haste, prepare yourself, remain alert and remember the grave toward which you travel.",
    "translationStatus": "editorial",
    "translationArabic": "فَأفِقْ أيُّهَا السّامِعُ مِنْ غَفْلَتِكَ، واخْتَصِرْ مِنْ عَجَلَتِكَ، وأشْدُدْ أزْرَكَ، وخُذْ حِذْرَكَ، واذْكُرْ قَبْرَكَ، فَإنَّ عَلَيْهِ مَمَرَّكَ.",
    "translationSourceLabelUr": "قلم ورکس — اصل عربی سے تدوینی ترجمہ",
    "translationSourceLabelEn": "Qalam Works — editorial translation of Arabic",
    "verifiedReferenceUr": "غرر الحکم و درر الکلم، باب الغفلة، نمبر 17",
    "verifiedReferenceEn": "Ghurar al-Hikam wa Durar al-Kalim, Negligence, entry 17",
    "verifiedSourceUrl": "https://al-islam.org/ghurar-al-hikam-wa-durar-al-kalim-exalted-aphorisms-and-pearls-speech/negligence",
    "verificationWitnessId": "al-islam-ghaflah-17",
    "witnesses": [
      {
        "id": "al-islam-ghaflah-17",
        "role": "verification-source",
        "sourceTitleUr": "غرر الحکم — عربی نقل، Al-Islam.org",
        "sourceTitleEn": "Ghurar al-Hikam — Arabic transcription at Al-Islam.org",
        "sourceUrl": "https://al-islam.org/ghurar-al-hikam-wa-durar-al-kalim-exalted-aphorisms-and-pearls-speech/negligence",
        "citation": {
          "bookUr": "غرر الحکم و درر الکلم",
          "bookEn": "Ghurar al-Hikam wa Durar al-Kalim",
          "chapterUr": "الغفلة",
          "chapterEn": "Negligence",
          "hadithNumber": "section entry 17"
        },
        "exactArabic": "فَأفِقْ أيُّهَا السّامِعُ مِنْ غَفْلَتِكَ، واخْتَصِرْ مِنْ عَجَلَتِكَ، وأشْدُدْ أزْرَكَ، وخُذْ حِذْرَكَ، واذْكُرْ قَبْرَكَ، فَإنَّ عَلَيْهِ مَمَرَّكَ.",
        "textVerified": true,
        "note": "Compared to numbered original-Arabic entry on the linked page; no independent manuscript collation or sanad grading asserted."
      }
    ]
  },
  {
    "id": "ghaflah-mizan-baqir-salat-10",
    "topicIds": [
      "ghaflah"
    ],
    "dossierPrimaryTextId": "ghaflah-baqir-salat",
    "attributedToUr": "امام محمد باقرؑ",
    "attributedToEn": "Imam al-Baqir",
    "sourceTitleUr": "میزان الحکمہ — باب الغفلة",
    "sourceTitleEn": "Mizan al-Hikmah — Negligence",
    "citedReferenceUr": "میزان الحکمہ، باب الغفلة، اندراج ۱۰؛ اس میں الکافی، جلد ۳، صفحہ ۲۷۰، حدیث ۱۴ کا حوالہ درج ہے۔",
    "citedReferenceEn": "Mizan al-Hikmah, Negligence, entry 10; cites al-Kafi, vol. 3, p. 270, no. 14.",
    "sourceUrl": "https://al-islam.org/mizan-al-hikmah-scale-wisdom/negligence",
    "candidateArabic": "أيّما مُؤمِنٍ حافَظَ علَى الصَّلواتِ المَفروضَةِ فَصَلاّها لِوَقتِها فَلَيسَ هذا مِن الغافِلينَ.",
    "status": "verified",
    "exactArabic": "أيّما مُؤمِنٍ حافَظَ علَى الصَّلواتِ المَفروضَةِ فَصَلاّها لِوَقتِها فَلَيسَ هذا مِن الغافِلينَ.",
    "translationUr": "جو مومن فرض نمازوں کی پابندی کرتا ہے اور انہیں وقت پر ادا کرتا ہے، وہ غافلین میں سے نہیں ہے۔",
    "translationEn": "A believer who guards the obligatory prayers and offers them at their prescribed times is not among the negligent.",
    "translationStatus": "editorial",
    "translationArabic": "أيّما مُؤمِنٍ حافَظَ علَى الصَّلواتِ المَفروضَةِ فَصَلاّها لِوَقتِها فَلَيسَ هذا مِن الغافِلينَ.",
    "translationSourceLabelUr": "قلم ورکس — میزان الحکمہ کے عربی متن سے تدوینی ترجمہ",
    "translationSourceLabelEn": "Qalam Works — editorial translation from Mizan al-Hikmah's Arabic",
    "verifiedReferenceUr": "میزان الحکمہ، باب الغفلة، اندراج ۱۰؛ اس میں الکافی، جلد ۳، صفحہ ۲۷۰، حدیث ۱۴ کا حوالہ درج ہے۔",
    "verifiedReferenceEn": "Mizan al-Hikmah, Negligence, entry 10; cites al-Kafi, vol. 3, p. 270, no. 14.",
    "verifiedSourceUrl": "https://al-islam.org/mizan-al-hikmah-scale-wisdom/negligence",
    "verificationWitnessId": "mizan-ghaflah-10",
    "witnesses": [
      {
        "id": "mizan-ghaflah-10",
        "role": "verification-source",
        "sourceTitleUr": "میزان الحکمہ — Al-Islam.org میں نقل شدہ عربی متن",
        "sourceTitleEn": "Mizan al-Hikmah Arabic at Al-Islam.org",
        "sourceUrl": "https://al-islam.org/mizan-al-hikmah-scale-wisdom/negligence",
        "citation": {
          "bookUr": "میزان الحکمہ",
          "bookEn": "Mizan al-Hikmah",
          "chapterUr": "الغفلة",
          "chapterEn": "Negligence",
          "hadithNumber": "10"
        },
        "exactArabic": "أيّما مُؤمِنٍ حافَظَ علَى الصَّلواتِ المَفروضَةِ فَصَلاّها لِوَقتِها فَلَيسَ هذا مِن الغافِلينَ.",
        "textVerified": true,
        "note": "Exact Arabic confirmed against Mizan al-Hikmah entry. Mizan's cited older work has not independently been collated."
      }
    ]
  },
  {
    "id": "ghaflah-mizan-ali-taghaful-17",
    "topicIds": [
      "ghaflah"
    ],
    "dossierPrimaryTextId": "ghaflah-ali-taghaful",
    "attributedToUr": "امیرالمؤمنین علیؑ",
    "attributedToEn": "Imam Ali",
    "sourceTitleUr": "میزان الحکمہ — باب الغفلة",
    "sourceTitleEn": "Mizan al-Hikmah — Negligence",
    "citedReferenceUr": "میزان الحکمہ، باب الغفلة، اندراج ۱۷؛ غرر الحکم، حدیث ۲۳۷۸ کا حوالہ۔",
    "citedReferenceEn": "Mizan al-Hikmah, Negligence, entry 17; cites Ghurar al-Hikam no. 2378.",
    "sourceUrl": "https://al-islam.org/mizan-al-hikmah-scale-wisdom/negligence",
    "candidateArabic": "إنَّ العاقِلَ نِصفُهُ احتِمالٌ، ونِصفُهُ تَغافُلٌ.",
    "status": "verified",
    "exactArabic": "إنَّ العاقِلَ نِصفُهُ احتِمالٌ، ونِصفُهُ تَغافُلٌ.",
    "translationUr": "عقل مند انسان کے رویّے میں ایک حصہ برداشت اور دوسرا دانستہ درگزر ہوتا ہے۔",
    "translationEn": "A person of reason combines patience with deliberately overlooking minor faults.",
    "translationStatus": "editorial",
    "translationArabic": "إنَّ العاقِلَ نِصفُهُ احتِمالٌ، ونِصفُهُ تَغافُلٌ.",
    "translationSourceLabelUr": "قلم ورکس — میزان الحکمہ کے عربی متن سے تدوینی ترجمہ",
    "translationSourceLabelEn": "Qalam Works — editorial translation from Mizan al-Hikmah's Arabic",
    "verifiedReferenceUr": "میزان الحکمہ، باب الغفلة، اندراج ۱۷؛ غرر الحکم، حدیث ۲۳۷۸ کا حوالہ۔",
    "verifiedReferenceEn": "Mizan al-Hikmah, Negligence, entry 17; cites Ghurar al-Hikam no. 2378.",
    "verifiedSourceUrl": "https://al-islam.org/mizan-al-hikmah-scale-wisdom/negligence",
    "verificationWitnessId": "mizan-ghaflah-17",
    "witnesses": [
      {
        "id": "mizan-ghaflah-17",
        "role": "verification-source",
        "sourceTitleUr": "میزان الحکمہ — Al-Islam.org میں نقل شدہ عربی متن",
        "sourceTitleEn": "Mizan al-Hikmah Arabic at Al-Islam.org",
        "sourceUrl": "https://al-islam.org/mizan-al-hikmah-scale-wisdom/negligence",
        "citation": {
          "bookUr": "میزان الحکمہ",
          "bookEn": "Mizan al-Hikmah",
          "chapterUr": "الغفلة",
          "chapterEn": "Negligence",
          "hadithNumber": "17"
        },
        "exactArabic": "إنَّ العاقِلَ نِصفُهُ احتِمالٌ، ونِصفُهُ تَغافُلٌ.",
        "textVerified": true,
        "note": "Exact Arabic confirmed against Mizan al-Hikmah entry. Mizan's cited older work has not independently been collated."
      }
    ]
  }
];
const SERIES: Record<MajlisSeriesLength, MajlisSeriesPlan> = {
  "1": {
    "length": 1,
    "titleUr": "غفلت — مکمل مجلس",
    "titleEn": "Ghaflah — 1-session research sequence",
    "aimUr": "ہر نشست میں ایک جدا قرآنی اور اخلاقی سوال، اصل حوالہ، منبری ربط اور قابلِ عمل نتیجہ ہوگا۔ ۲۰، ۳۰ یا ۴۵ منٹ کی مدت خطیب اپنی ضرورت کے مطابق الگ منتخب کرسکتا ہے؛ مواد صرف عنوانات نہیں بلکہ ترتیب شدہ نکات اور حوالہ جات پر مشتمل ہے۔",
    "aimEn": "Distinct Qur'anic and ethical questions with sourced speaking notes. The studio independently offers 20, 30, and 45-minute duration options.",
    "sessions": [
      {
        "number": 1,
        "titleUr": "غفلت سے بیداری تک — جامع مجلس",
        "titleEn": "From heedlessness to wakefulness — complete majlis",
        "purposeUr": "مرض کی شناخت، قرآن و روایت، موجودہ معاشرتی مسئلہ اور بیداری کا قابلِ عمل منصوبہ ایک مربوط مجلس میں پیش کریں۔",
        "purposeEn": "Unify diagnosis, scripture, sourced scholarly discussion and actionable reform.",
        "materialUr": [
          "غفلت کی تعریف: انسان ہر وقت مصروف ہو مگر انجام سے بے خبر ہو۔",
          "احساسات، عقل اور ارادے کے استعمال کا سوال اٹھائیں؛ دوسروں کے بجائے اپنے نفس سے آغاز کریں۔",
          "سامع کو دن بھر کی تین مصروفیات یاد کرائیں اور پوچھیں: ان میں کون سی اصل مقصد کے قریب لائی؟",
          "مہلت کو امان نہ سمجھیں؛ انسان اہم فیصلے کل پر ٹالتا ہے۔",
          "عمر کے ختم ہونے اور موقع کے ضائع ہونے میں فرق واضح کریں۔",
          "سامع سے ایک مؤخر توبہ یا ذمہ داری کا نام لکھوانے کی دعوت دیں۔",
          "خطرہ معلوم نہ ہونا، خطرے کا نہ ہونا نہیں؛ سراب اور پائیدار اطمینان کی تمثیل سمجھائیں۔",
          "دینی اعتماد اور بے خبری کے دو الگ نتائج بیان کریں۔",
          "مجلس کا سوال: میں کس معاملے میں بے فکری کو ایمان سمجھ رہا ہوں؟",
          "یادِ خدا کو محض زبانی تکرار نہیں بلکہ زندگی کے فیصلے درست رکھنے کا ذریعہ دکھائیں۔",
          "دن کا مختصر محاسبہ، نیت کی اصلاح اور خاموش مطالعہ تجویز کریں۔",
          "قیامت کے پردہ ہٹنے سے پہلے دل کی بینائی پر توجہ دلائیں۔",
          "نماز کی شرعی ادائیگی اور حضورِ قلب کو الگ سوالات کے طور پر کھولیں۔",
          "رفتار کم کرکے ایک نماز معنی سمجھ کر ادا کرنے کا ہدف دیں۔",
          "آیت کے خطاب کو خود اہلِ ایمان سے جوڑ کر اصلاح کی امید زندہ رکھیں۔",
          "شہرت، فون، کام، رقم اور نمبروں کی دوڑ کو مثالیں بنائیں؛ جائز معاش کو موردِ الزام نہ ٹھہرائیں۔",
          "ترجیحات کا ایک سادہ روزانہ جائزہ پیش کریں۔",
          "لوگوں کے حقوق تلف کیے بغیر عبادت اور مصروفیت کا توازن سمجھائیں۔",
          "غفلت اور جلدبازی سے رشتوں اور سماجی معاملات کو پہنچنے والے نقصان پر گفتگو کریں۔",
          "افواہ پر ردعمل دینے سے پہلے تحقیق اور اپنے رویے کی اصلاح سمجھائیں۔",
          "ایک گھرانے کے نظرانداز حق کو واپس ادا کرنے کی عملی مثال دیں۔",
          "دعا، مجلس اور دینی ماحول میں متاثر ہونے کی قدر کریں مگر اسے آخری نتیجہ نہ سمجھیں۔",
          "غفلت دوبارہ کیوں آتی ہے؟ پرانی صحبت، ماحول اور عادتی ردعمل پر گفتگو کریں۔",
          "سامع سے اگلے دن کا ایک قابلِ مشاہدہ عمل مقرر کرائیں۔",
          "ذکر، محاسبہ، صحیح صحبت، قرآن، حقوق العباد اور وقت کی حفاظت کے مربوط اعمال بیان کریں۔",
          "سات دن کا عملی منصوبہ دیں: روز پانچ منٹ محاسبہ، ایک حق، ایک دعا۔",
          "اصلاح کا پیمانہ جذبات نہیں بلکہ پہلے سے بہتر کردار ہو۔",
          "بیداری کا مطلب حق پہچاننے کے بعد درست موقف پر قائم رہنا ہے۔",
          "مصائبِ کربلا منتخب و مصدقہ مقتل سے الگ شامل کریں؛ غیر ثابت شدہ جزئیات بیان نہ کریں۔",
          "پہلی مجلس کا سوال واپس لائیں: اگر آنکھیں کھلی ہیں، تو دل کس حق کے لیے بیدار ہے؟"
        ],
        "materialEn": [
          "Ghaflah concerns failure to use the intellect, conscience and opportunities already given to a person.",
          "Begin with Qur'an 7:179: the critique is not sensory disability but neglected understanding.",
          "Use Imam Ali's first aphorism to contrast external wakefulness with a heart that has lost direction.",
          "Ask listeners to list three daily activities and test whether any brings them closer to their real purpose.",
          "Explain the warning of Qur'an 21:1: accountability can approach while attention is elsewhere.",
          "Pair it with Ghurar al-Hikam's warning against treating a delay in consequences as permanent safety.",
          "Invite the audience to identify a postponed duty, apology or act of repentance.",
          "Syed Jawad Naqvi's Divine Laws, lesson 6 distinguishes illusory reassurance from durable inner tranquility.",
          "An unaware person may feel safe simply because the danger has not been recognised.",
          "Use the mirage analogy carefully: a pleasant feeling is not always reliable evidence of spiritual health.",
          "Use Qur'an 59:19 to show the inward cost of forgetting God: a damaged understanding of one's own self.",
          "Ask what gives a day meaning, and distinguish intention from routine.",
          "Relate Qur'an 50:22 to the need to seek insight before the final unveiling.",
          "Qur'an 57:16 speaks to believers, inviting humble and attentive hearts.",
          "Draw on Syed Jawad Naqvi's Islamic Manners, lesson 31, which criticises hurried and careless prayer.",
          "Distinguish legal validity of the prayer from the separate call to spiritual attentiveness.",
          "Read Qur'an 102:1 as a warning that rivalry in increase can monopolise attention.",
          "Balance it with 63:9: neither lawful work nor raising children is condemned.",
          "Use examples of reputation, notifications, status and income to expose the real question of priorities.",
          "Ground the social dimension in Syed Jawad Naqvi's Wisdom of Ali, part 5, which links negligence and haste with discord.",
          "Explain why a rushed reaction to rumours harms the rights of others.",
          "End with the repair of one ignored relationship or duty rather than accusations against outsiders.",
          "The documented lecture Islamic Manners, lesson 28 describes devotion fading after a gathering ends.",
          "Respect the sincere impact of a majlis without confusing temporary emotion with sustained formation.",
          "Ask for a concrete action on the following morning and a habit that will keep it alive.",
          "Use Ghurar al-Hikam entries 11, 13 and 20 for the progression from habitual blindness toward wakefulness.",
          "Suggest daily remembrance, self-examination, a few minutes of Qur'an, attentive prayer and repairing another's right.",
          "Measure progress by changed choices over a week, not the intensity of emotion in one evening.",
          "Conclude by turning recognition of truth into the responsibility of remaining loyal to it.",
          "Link the moral theme to Karbala without inventing martyrdom episodes or unverified historical narration.",
          "Use separately checked maqtal sources for any detailed masaib, and return to the opening question of the sleeping heart."
        ],
        "sourceUr": "الأعراف ۷:۱۷۹؛ غرر الحکم، اندراج ۱؛ الأنبیاء ۲۱:۱؛ غرر الحکم، اندراج ۴؛ سید جواد نقوی، سنن الٰہی، درس ۶؛ الحشر ۵۹:۱۹؛ ق ۵۰:۲۲؛ الحدید ۵۷:۱۶؛ سید جواد نقوی، آدابِ اسلامی، درس ۳۱؛ التكاثر ۱۰۲:۱؛ المنافقون ۶۳:۹؛ سید جواد نقوی، حکمتِ علیؑ، حصہ ۵؛ سید جواد نقوی، آدابِ اسلامی، درس ۲۸؛ غرر الحکم، اندراج ۱۱، ۱۳، ۲۰؛ النور ۲۴:۳۷؛ نہج البلاغہ، خطبہ ۱۵۳",
        "sourceEn": "Qur'an 7:179; Ghurar al-Hikam, Negligence entry 1; Qur'an 21:1; Ghurar al-Hikam, Negligence entry 4; Syed Jawad Naqvi, Divine Laws, lesson 6; Qur'an 59:19 and 50:22; Qur'an 57:16; Syed Jawad Naqvi, Islamic Manners, lesson 31; Qur'an 102:1 and 63:9; Syed Jawad Naqvi, Wisdom of Ali, part 5; Syed Jawad Naqvi, Islamic Manners, lesson 28; Ghurar al-Hikam, Negligence entries 11, 13 and 20; Qur'an 24:37; Nahj al-Balagha, sermon 153",
        "quranUr": [
          "الأعراف ۷:۱۷۹؛ غرر الحکم، اندراج ۱",
          "الأنبیاء ۲۱:۱؛ غرر الحکم، اندراج ۴",
          "الحشر ۵۹:۱۹؛ ق ۵۰:۲۲",
          "الحدید ۵۷:۱۶؛ سید جواد نقوی، آدابِ اسلامی، درس ۳۱",
          "التكاثر ۱۰۲:۱؛ المنافقون ۶۳:۹",
          "النور ۲۴:۳۷؛ نہج البلاغہ، خطبہ ۱۵۳"
        ],
        "quranEn": [
          "Qur'an 7:179; Ghurar al-Hikam, Negligence entry 1",
          "Qur'an 21:1; Ghurar al-Hikam, Negligence entry 4",
          "Syed Jawad Naqvi, Divine Laws, lesson 6",
          "Qur'an 59:19 and 50:22",
          "Qur'an 57:16; Syed Jawad Naqvi, Islamic Manners, lesson 31",
          "Qur'an 102:1 and 63:9",
          "Syed Jawad Naqvi, Wisdom of Ali, part 5",
          "Syed Jawad Naqvi, Islamic Manners, lesson 28",
          "Ghurar al-Hikam, Negligence entries 11, 13 and 20",
          "Qur'an 24:37; Nahj al-Balagha, sermon 153"
        ],
        "avoidRepeatUr": "اس مجلس کا مرکزی سوال برقرار رکھیں؛ دوسری مجلسوں کی علمی تفصیل بے ضرورت نہ دہرائیں۔",
        "avoidRepeatEn": "Keep the session's distinct question in focus; avoid redundant repetition.",
        "takeawayUr": "آج کا سوال: «کربلا: جاگے ہوئے ضمیر کی گواہی» کے بارے میں میں کون سا ایک عملی قدم اٹھاؤں گا؟",
        "takeawayEn": "Today: take one concrete step related to Karbala and a conscience that stays awake."
      }
    ],
    "finalUr": "تمام مجالس کا عملی ثمر یہ ہو کہ سامع آج سے اپنے وقت، نماز، گھر اور حقوق میں ایک قابلِ پیمائش اصلاح کرے، اور کربلا کی یاد کو وفاداری اور بیداری میں بدلے۔",
    "finalEn": "Conclude with measurable reform in attention, worship, family rights and fidelity to the truth."
  },
  "3": {
    "length": 3,
    "titleUr": "سہ روزہ مجالس — غفلت سے بیداری",
    "titleEn": "Ghaflah — 3-session research sequence",
    "aimUr": "ہر نشست میں ایک جدا قرآنی اور اخلاقی سوال، اصل حوالہ، منبری ربط اور قابلِ عمل نتیجہ ہوگا۔ ۲۰، ۳۰ یا ۴۵ منٹ کی مدت خطیب اپنی ضرورت کے مطابق الگ منتخب کرسکتا ہے؛ مواد صرف عنوانات نہیں بلکہ ترتیب شدہ نکات اور حوالہ جات پر مشتمل ہے۔",
    "aimEn": "Distinct Qur'anic and ethical questions with sourced speaking notes. The studio independently offers 20, 30, and 45-minute duration options.",
    "sessions": [
      {
        "number": 1,
        "titleUr": "نیندِ غفلت کیا ہے؟، حساب قریب، دل غافل، سرابی سکون کی حقیقت",
        "titleEn": "What is spiritual sleep?; Accountability approaches; The illusion of security",
        "purposeUr": "اس مجلس میں نیندِ غفلت کیا ہے؟ سے سرابی سکون کی حقیقت تک الگ مگر مربوط زاویے پیدا کریں۔",
        "purposeEn": "Develop a coherent argument from What is spiritual sleep? toward The illusion of security.",
        "materialUr": [
          "غفلت کی تعریف: انسان ہر وقت مصروف ہو مگر انجام سے بے خبر ہو۔",
          "احساسات، عقل اور ارادے کے استعمال کا سوال اٹھائیں؛ دوسروں کے بجائے اپنے نفس سے آغاز کریں۔",
          "سامع کو دن بھر کی تین مصروفیات یاد کرائیں اور پوچھیں: ان میں کون سی اصل مقصد کے قریب لائی؟",
          "مہلت کو امان نہ سمجھیں؛ انسان اہم فیصلے کل پر ٹالتا ہے۔",
          "عمر کے ختم ہونے اور موقع کے ضائع ہونے میں فرق واضح کریں۔",
          "سامع سے ایک مؤخر توبہ یا ذمہ داری کا نام لکھوانے کی دعوت دیں۔",
          "خطرہ معلوم نہ ہونا، خطرے کا نہ ہونا نہیں؛ سراب اور پائیدار اطمینان کی تمثیل سمجھائیں۔",
          "دینی اعتماد اور بے خبری کے دو الگ نتائج بیان کریں۔",
          "مجلس کا سوال: میں کس معاملے میں بے فکری کو ایمان سمجھ رہا ہوں؟"
        ],
        "materialEn": [
          "Ghaflah concerns failure to use the intellect, conscience and opportunities already given to a person.",
          "Begin with Qur'an 7:179: the critique is not sensory disability but neglected understanding.",
          "Use Imam Ali's first aphorism to contrast external wakefulness with a heart that has lost direction.",
          "Ask listeners to list three daily activities and test whether any brings them closer to their real purpose.",
          "Explain the warning of Qur'an 21:1: accountability can approach while attention is elsewhere.",
          "Pair it with Ghurar al-Hikam's warning against treating a delay in consequences as permanent safety.",
          "Invite the audience to identify a postponed duty, apology or act of repentance.",
          "Syed Jawad Naqvi's Divine Laws, lesson 6 distinguishes illusory reassurance from durable inner tranquility.",
          "An unaware person may feel safe simply because the danger has not been recognised.",
          "Use the mirage analogy carefully: a pleasant feeling is not always reliable evidence of spiritual health."
        ],
        "sourceUr": "الأعراف ۷:۱۷۹؛ غرر الحکم، اندراج ۱؛ الأنبیاء ۲۱:۱؛ غرر الحکم، اندراج ۴؛ سید جواد نقوی، سنن الٰہی، درس ۶",
        "sourceEn": "Qur'an 7:179; Ghurar al-Hikam, Negligence entry 1; Qur'an 21:1; Ghurar al-Hikam, Negligence entry 4; Syed Jawad Naqvi, Divine Laws, lesson 6",
        "quranUr": [
          "الأعراف ۷:۱۷۹؛ غرر الحکم، اندراج ۱",
          "الأنبیاء ۲۱:۱؛ غرر الحکم، اندراج ۴"
        ],
        "quranEn": [
          "Qur'an 7:179; Ghurar al-Hikam, Negligence entry 1",
          "Qur'an 21:1; Ghurar al-Hikam, Negligence entry 4",
          "Syed Jawad Naqvi, Divine Laws, lesson 6"
        ],
        "avoidRepeatUr": "اس مجلس کا مرکزی سوال برقرار رکھیں؛ دوسری مجلسوں کی علمی تفصیل بے ضرورت نہ دہرائیں۔",
        "avoidRepeatEn": "Keep the session's distinct question in focus; avoid redundant repetition.",
        "takeawayUr": "آج کا سوال: «سرابی سکون کی حقیقت» کے بارے میں میں کون سا ایک عملی قدم اٹھاؤں گا؟",
        "takeawayEn": "Today: take one concrete step related to The illusion of security.",
        "nextBridgeUr": "اگلی مجلس میں یہ بحث مزید آگے بڑھے گی۔",
        "nextBridgeEn": "The following session develops the next distinct theme."
      },
      {
        "number": 2,
        "titleUr": "ذکرِ خدا اور خود فراموشی، عبادت کی صورت، دل کی غفلت، دنیا کی دوڑ میں کھویا انسان",
        "titleEn": "Forgetting God, forgetting self; Worship without attention; Lost in the race to accumulate",
        "purposeUr": "اس مجلس میں ذکرِ خدا اور خود فراموشی سے دنیا کی دوڑ میں کھویا انسان تک الگ مگر مربوط زاویے پیدا کریں۔",
        "purposeEn": "Develop a coherent argument from Forgetting God, forgetting self toward Lost in the race to accumulate.",
        "materialUr": [
          "یادِ خدا کو محض زبانی تکرار نہیں بلکہ زندگی کے فیصلے درست رکھنے کا ذریعہ دکھائیں۔",
          "دن کا مختصر محاسبہ، نیت کی اصلاح اور خاموش مطالعہ تجویز کریں۔",
          "قیامت کے پردہ ہٹنے سے پہلے دل کی بینائی پر توجہ دلائیں۔",
          "نماز کی شرعی ادائیگی اور حضورِ قلب کو الگ سوالات کے طور پر کھولیں۔",
          "رفتار کم کرکے ایک نماز معنی سمجھ کر ادا کرنے کا ہدف دیں۔",
          "آیت کے خطاب کو خود اہلِ ایمان سے جوڑ کر اصلاح کی امید زندہ رکھیں۔",
          "شہرت، فون، کام، رقم اور نمبروں کی دوڑ کو مثالیں بنائیں؛ جائز معاش کو موردِ الزام نہ ٹھہرائیں۔",
          "ترجیحات کا ایک سادہ روزانہ جائزہ پیش کریں۔",
          "لوگوں کے حقوق تلف کیے بغیر عبادت اور مصروفیت کا توازن سمجھائیں۔"
        ],
        "materialEn": [
          "Use Qur'an 59:19 to show the inward cost of forgetting God: a damaged understanding of one's own self.",
          "Ask what gives a day meaning, and distinguish intention from routine.",
          "Relate Qur'an 50:22 to the need to seek insight before the final unveiling.",
          "Qur'an 57:16 speaks to believers, inviting humble and attentive hearts.",
          "Draw on Syed Jawad Naqvi's Islamic Manners, lesson 31, which criticises hurried and careless prayer.",
          "Distinguish legal validity of the prayer from the separate call to spiritual attentiveness.",
          "Read Qur'an 102:1 as a warning that rivalry in increase can monopolise attention.",
          "Balance it with 63:9: neither lawful work nor raising children is condemned.",
          "Use examples of reputation, notifications, status and income to expose the real question of priorities."
        ],
        "sourceUr": "الحشر ۵۹:۱۹؛ ق ۵۰:۲۲؛ الحدید ۵۷:۱۶؛ سید جواد نقوی، آدابِ اسلامی، درس ۳۱؛ التكاثر ۱۰۲:۱؛ المنافقون ۶۳:۹",
        "sourceEn": "Qur'an 59:19 and 50:22; Qur'an 57:16; Syed Jawad Naqvi, Islamic Manners, lesson 31; Qur'an 102:1 and 63:9",
        "quranUr": [
          "الحشر ۵۹:۱۹؛ ق ۵۰:۲۲",
          "الحدید ۵۷:۱۶؛ سید جواد نقوی، آدابِ اسلامی، درس ۳۱",
          "التكاثر ۱۰۲:۱؛ المنافقون ۶۳:۹"
        ],
        "quranEn": [
          "Qur'an 59:19 and 50:22",
          "Qur'an 57:16; Syed Jawad Naqvi, Islamic Manners, lesson 31",
          "Qur'an 102:1 and 63:9"
        ],
        "avoidRepeatUr": "اس مجلس کا مرکزی سوال برقرار رکھیں؛ دوسری مجلسوں کی علمی تفصیل بے ضرورت نہ دہرائیں۔",
        "avoidRepeatEn": "Keep the session's distinct question in focus; avoid redundant repetition.",
        "takeawayUr": "آج کا سوال: «دنیا کی دوڑ میں کھویا انسان» کے بارے میں میں کون سا ایک عملی قدم اٹھاؤں گا؟",
        "takeawayEn": "Today: take one concrete step related to Lost in the race to accumulate.",
        "previousBridgeUr": "گزشتہ مجلس کی بیداری کو آج کے سوال تک آگے بڑھائیں۔",
        "previousBridgeEn": "Advance the preceding lesson into today's question.",
        "nextBridgeUr": "اگلی مجلس میں یہ بحث مزید آگے بڑھے گی۔",
        "nextBridgeEn": "The following session develops the next distinct theme."
      },
      {
        "number": 3,
        "titleUr": "گھر اور معاشرے کی غفلت، مجلس میں بیداری، گھر میں بھول، بیداری کا روزانہ نسخہ، کربلا: جاگے ہوئے ضمیر کی گواہی",
        "titleEn": "Heedlessness in relationships; The day after a moving majlis; A daily practice of wakefulness; Karbala and a conscience that stays awake",
        "purposeUr": "اس مجلس میں گھر اور معاشرے کی غفلت سے کربلا: جاگے ہوئے ضمیر کی گواہی تک الگ مگر مربوط زاویے پیدا کریں۔",
        "purposeEn": "Develop a coherent argument from Heedlessness in relationships toward Karbala and a conscience that stays awake.",
        "materialUr": [
          "غفلت اور جلدبازی سے رشتوں اور سماجی معاملات کو پہنچنے والے نقصان پر گفتگو کریں۔",
          "افواہ پر ردعمل دینے سے پہلے تحقیق اور اپنے رویے کی اصلاح سمجھائیں۔",
          "ایک گھرانے کے نظرانداز حق کو واپس ادا کرنے کی عملی مثال دیں۔",
          "دعا، مجلس اور دینی ماحول میں متاثر ہونے کی قدر کریں مگر اسے آخری نتیجہ نہ سمجھیں۔",
          "غفلت دوبارہ کیوں آتی ہے؟ پرانی صحبت، ماحول اور عادتی ردعمل پر گفتگو کریں۔",
          "سامع سے اگلے دن کا ایک قابلِ مشاہدہ عمل مقرر کرائیں۔",
          "ذکر، محاسبہ، صحیح صحبت، قرآن، حقوق العباد اور وقت کی حفاظت کے مربوط اعمال بیان کریں۔",
          "سات دن کا عملی منصوبہ دیں: روز پانچ منٹ محاسبہ، ایک حق، ایک دعا۔",
          "اصلاح کا پیمانہ جذبات نہیں بلکہ پہلے سے بہتر کردار ہو۔",
          "بیداری کا مطلب حق پہچاننے کے بعد درست موقف پر قائم رہنا ہے۔",
          "مصائبِ کربلا منتخب و مصدقہ مقتل سے الگ شامل کریں؛ غیر ثابت شدہ جزئیات بیان نہ کریں۔",
          "پہلی مجلس کا سوال واپس لائیں: اگر آنکھیں کھلی ہیں، تو دل کس حق کے لیے بیدار ہے؟"
        ],
        "materialEn": [
          "Ground the social dimension in Syed Jawad Naqvi's Wisdom of Ali, part 5, which links negligence and haste with discord.",
          "Explain why a rushed reaction to rumours harms the rights of others.",
          "End with the repair of one ignored relationship or duty rather than accusations against outsiders.",
          "The documented lecture Islamic Manners, lesson 28 describes devotion fading after a gathering ends.",
          "Respect the sincere impact of a majlis without confusing temporary emotion with sustained formation.",
          "Ask for a concrete action on the following morning and a habit that will keep it alive.",
          "Use Ghurar al-Hikam entries 11, 13 and 20 for the progression from habitual blindness toward wakefulness.",
          "Suggest daily remembrance, self-examination, a few minutes of Qur'an, attentive prayer and repairing another's right.",
          "Measure progress by changed choices over a week, not the intensity of emotion in one evening.",
          "Conclude by turning recognition of truth into the responsibility of remaining loyal to it.",
          "Link the moral theme to Karbala without inventing martyrdom episodes or unverified historical narration.",
          "Use separately checked maqtal sources for any detailed masaib, and return to the opening question of the sleeping heart."
        ],
        "sourceUr": "سید جواد نقوی، حکمتِ علیؑ، حصہ ۵؛ سید جواد نقوی، آدابِ اسلامی، درس ۲۸؛ غرر الحکم، اندراج ۱۱، ۱۳، ۲۰؛ النور ۲۴:۳۷؛ نہج البلاغہ، خطبہ ۱۵۳",
        "sourceEn": "Syed Jawad Naqvi, Wisdom of Ali, part 5; Syed Jawad Naqvi, Islamic Manners, lesson 28; Ghurar al-Hikam, Negligence entries 11, 13 and 20; Qur'an 24:37; Nahj al-Balagha, sermon 153",
        "quranUr": [
          "النور ۲۴:۳۷؛ نہج البلاغہ، خطبہ ۱۵۳"
        ],
        "quranEn": [
          "Syed Jawad Naqvi, Wisdom of Ali, part 5",
          "Syed Jawad Naqvi, Islamic Manners, lesson 28",
          "Ghurar al-Hikam, Negligence entries 11, 13 and 20",
          "Qur'an 24:37; Nahj al-Balagha, sermon 153"
        ],
        "avoidRepeatUr": "اس مجلس کا مرکزی سوال برقرار رکھیں؛ دوسری مجلسوں کی علمی تفصیل بے ضرورت نہ دہرائیں۔",
        "avoidRepeatEn": "Keep the session's distinct question in focus; avoid redundant repetition.",
        "takeawayUr": "آج کا سوال: «کربلا: جاگے ہوئے ضمیر کی گواہی» کے بارے میں میں کون سا ایک عملی قدم اٹھاؤں گا؟",
        "takeawayEn": "Today: take one concrete step related to Karbala and a conscience that stays awake.",
        "previousBridgeUr": "گزشتہ مجلس کی بیداری کو آج کے سوال تک آگے بڑھائیں۔",
        "previousBridgeEn": "Advance the preceding lesson into today's question."
      }
    ],
    "finalUr": "تمام مجالس کا عملی ثمر یہ ہو کہ سامع آج سے اپنے وقت، نماز، گھر اور حقوق میں ایک قابلِ پیمائش اصلاح کرے، اور کربلا کی یاد کو وفاداری اور بیداری میں بدلے۔",
    "finalEn": "Conclude with measurable reform in attention, worship, family rights and fidelity to the truth."
  },
  "5": {
    "length": 5,
    "titleUr": "خمسۂ مجالس — غفلت کی تشخیص اور علاج",
    "titleEn": "Ghaflah — 5-session research sequence",
    "aimUr": "ہر نشست میں ایک جدا قرآنی اور اخلاقی سوال، اصل حوالہ، منبری ربط اور قابلِ عمل نتیجہ ہوگا۔ ۲۰، ۳۰ یا ۴۵ منٹ کی مدت خطیب اپنی ضرورت کے مطابق الگ منتخب کرسکتا ہے؛ مواد صرف عنوانات نہیں بلکہ ترتیب شدہ نکات اور حوالہ جات پر مشتمل ہے۔",
    "aimEn": "Distinct Qur'anic and ethical questions with sourced speaking notes. The studio independently offers 20, 30, and 45-minute duration options.",
    "sessions": [
      {
        "number": 1,
        "titleUr": "نیندِ غفلت کیا ہے؟، حساب قریب، دل غافل",
        "titleEn": "What is spiritual sleep?; Accountability approaches",
        "purposeUr": "اس مجلس میں نیندِ غفلت کیا ہے؟ سے حساب قریب، دل غافل تک الگ مگر مربوط زاویے پیدا کریں۔",
        "purposeEn": "Develop a coherent argument from What is spiritual sleep? toward Accountability approaches.",
        "materialUr": [
          "غفلت کی تعریف: انسان ہر وقت مصروف ہو مگر انجام سے بے خبر ہو۔",
          "احساسات، عقل اور ارادے کے استعمال کا سوال اٹھائیں؛ دوسروں کے بجائے اپنے نفس سے آغاز کریں۔",
          "سامع کو دن بھر کی تین مصروفیات یاد کرائیں اور پوچھیں: ان میں کون سی اصل مقصد کے قریب لائی؟",
          "مہلت کو امان نہ سمجھیں؛ انسان اہم فیصلے کل پر ٹالتا ہے۔",
          "عمر کے ختم ہونے اور موقع کے ضائع ہونے میں فرق واضح کریں۔",
          "سامع سے ایک مؤخر توبہ یا ذمہ داری کا نام لکھوانے کی دعوت دیں۔"
        ],
        "materialEn": [
          "Ghaflah concerns failure to use the intellect, conscience and opportunities already given to a person.",
          "Begin with Qur'an 7:179: the critique is not sensory disability but neglected understanding.",
          "Use Imam Ali's first aphorism to contrast external wakefulness with a heart that has lost direction.",
          "Ask listeners to list three daily activities and test whether any brings them closer to their real purpose.",
          "Explain the warning of Qur'an 21:1: accountability can approach while attention is elsewhere.",
          "Pair it with Ghurar al-Hikam's warning against treating a delay in consequences as permanent safety.",
          "Invite the audience to identify a postponed duty, apology or act of repentance."
        ],
        "sourceUr": "الأعراف ۷:۱۷۹؛ غرر الحکم، اندراج ۱؛ الأنبیاء ۲۱:۱؛ غرر الحکم، اندراج ۴",
        "sourceEn": "Qur'an 7:179; Ghurar al-Hikam, Negligence entry 1; Qur'an 21:1; Ghurar al-Hikam, Negligence entry 4",
        "quranUr": [
          "الأعراف ۷:۱۷۹؛ غرر الحکم، اندراج ۱",
          "الأنبیاء ۲۱:۱؛ غرر الحکم، اندراج ۴"
        ],
        "quranEn": [
          "Qur'an 7:179; Ghurar al-Hikam, Negligence entry 1",
          "Qur'an 21:1; Ghurar al-Hikam, Negligence entry 4"
        ],
        "avoidRepeatUr": "اس مجلس کا مرکزی سوال برقرار رکھیں؛ دوسری مجلسوں کی علمی تفصیل بے ضرورت نہ دہرائیں۔",
        "avoidRepeatEn": "Keep the session's distinct question in focus; avoid redundant repetition.",
        "takeawayUr": "آج کا سوال: «حساب قریب، دل غافل» کے بارے میں میں کون سا ایک عملی قدم اٹھاؤں گا؟",
        "takeawayEn": "Today: take one concrete step related to Accountability approaches.",
        "nextBridgeUr": "اگلی مجلس میں یہ بحث مزید آگے بڑھے گی۔",
        "nextBridgeEn": "The following session develops the next distinct theme."
      },
      {
        "number": 2,
        "titleUr": "سرابی سکون کی حقیقت، ذکرِ خدا اور خود فراموشی",
        "titleEn": "The illusion of security; Forgetting God, forgetting self",
        "purposeUr": "اس مجلس میں سرابی سکون کی حقیقت سے ذکرِ خدا اور خود فراموشی تک الگ مگر مربوط زاویے پیدا کریں۔",
        "purposeEn": "Develop a coherent argument from The illusion of security toward Forgetting God, forgetting self.",
        "materialUr": [
          "خطرہ معلوم نہ ہونا، خطرے کا نہ ہونا نہیں؛ سراب اور پائیدار اطمینان کی تمثیل سمجھائیں۔",
          "دینی اعتماد اور بے خبری کے دو الگ نتائج بیان کریں۔",
          "مجلس کا سوال: میں کس معاملے میں بے فکری کو ایمان سمجھ رہا ہوں؟",
          "یادِ خدا کو محض زبانی تکرار نہیں بلکہ زندگی کے فیصلے درست رکھنے کا ذریعہ دکھائیں۔",
          "دن کا مختصر محاسبہ، نیت کی اصلاح اور خاموش مطالعہ تجویز کریں۔",
          "قیامت کے پردہ ہٹنے سے پہلے دل کی بینائی پر توجہ دلائیں۔"
        ],
        "materialEn": [
          "Syed Jawad Naqvi's Divine Laws, lesson 6 distinguishes illusory reassurance from durable inner tranquility.",
          "An unaware person may feel safe simply because the danger has not been recognised.",
          "Use the mirage analogy carefully: a pleasant feeling is not always reliable evidence of spiritual health.",
          "Use Qur'an 59:19 to show the inward cost of forgetting God: a damaged understanding of one's own self.",
          "Ask what gives a day meaning, and distinguish intention from routine.",
          "Relate Qur'an 50:22 to the need to seek insight before the final unveiling."
        ],
        "sourceUr": "سید جواد نقوی، سنن الٰہی، درس ۶؛ الحشر ۵۹:۱۹؛ ق ۵۰:۲۲",
        "sourceEn": "Syed Jawad Naqvi, Divine Laws, lesson 6; Qur'an 59:19 and 50:22",
        "quranUr": [
          "الحشر ۵۹:۱۹؛ ق ۵۰:۲۲"
        ],
        "quranEn": [
          "Syed Jawad Naqvi, Divine Laws, lesson 6",
          "Qur'an 59:19 and 50:22"
        ],
        "avoidRepeatUr": "اس مجلس کا مرکزی سوال برقرار رکھیں؛ دوسری مجلسوں کی علمی تفصیل بے ضرورت نہ دہرائیں۔",
        "avoidRepeatEn": "Keep the session's distinct question in focus; avoid redundant repetition.",
        "takeawayUr": "آج کا سوال: «ذکرِ خدا اور خود فراموشی» کے بارے میں میں کون سا ایک عملی قدم اٹھاؤں گا؟",
        "takeawayEn": "Today: take one concrete step related to Forgetting God, forgetting self.",
        "previousBridgeUr": "گزشتہ مجلس کی بیداری کو آج کے سوال تک آگے بڑھائیں۔",
        "previousBridgeEn": "Advance the preceding lesson into today's question.",
        "nextBridgeUr": "اگلی مجلس میں یہ بحث مزید آگے بڑھے گی۔",
        "nextBridgeEn": "The following session develops the next distinct theme."
      },
      {
        "number": 3,
        "titleUr": "عبادت کی صورت، دل کی غفلت، دنیا کی دوڑ میں کھویا انسان",
        "titleEn": "Worship without attention; Lost in the race to accumulate",
        "purposeUr": "اس مجلس میں عبادت کی صورت، دل کی غفلت سے دنیا کی دوڑ میں کھویا انسان تک الگ مگر مربوط زاویے پیدا کریں۔",
        "purposeEn": "Develop a coherent argument from Worship without attention toward Lost in the race to accumulate.",
        "materialUr": [
          "نماز کی شرعی ادائیگی اور حضورِ قلب کو الگ سوالات کے طور پر کھولیں۔",
          "رفتار کم کرکے ایک نماز معنی سمجھ کر ادا کرنے کا ہدف دیں۔",
          "آیت کے خطاب کو خود اہلِ ایمان سے جوڑ کر اصلاح کی امید زندہ رکھیں۔",
          "شہرت، فون، کام، رقم اور نمبروں کی دوڑ کو مثالیں بنائیں؛ جائز معاش کو موردِ الزام نہ ٹھہرائیں۔",
          "ترجیحات کا ایک سادہ روزانہ جائزہ پیش کریں۔",
          "لوگوں کے حقوق تلف کیے بغیر عبادت اور مصروفیت کا توازن سمجھائیں۔"
        ],
        "materialEn": [
          "Qur'an 57:16 speaks to believers, inviting humble and attentive hearts.",
          "Draw on Syed Jawad Naqvi's Islamic Manners, lesson 31, which criticises hurried and careless prayer.",
          "Distinguish legal validity of the prayer from the separate call to spiritual attentiveness.",
          "Read Qur'an 102:1 as a warning that rivalry in increase can monopolise attention.",
          "Balance it with 63:9: neither lawful work nor raising children is condemned.",
          "Use examples of reputation, notifications, status and income to expose the real question of priorities."
        ],
        "sourceUr": "الحدید ۵۷:۱۶؛ سید جواد نقوی، آدابِ اسلامی، درس ۳۱؛ التكاثر ۱۰۲:۱؛ المنافقون ۶۳:۹",
        "sourceEn": "Qur'an 57:16; Syed Jawad Naqvi, Islamic Manners, lesson 31; Qur'an 102:1 and 63:9",
        "quranUr": [
          "الحدید ۵۷:۱۶؛ سید جواد نقوی، آدابِ اسلامی، درس ۳۱",
          "التكاثر ۱۰۲:۱؛ المنافقون ۶۳:۹"
        ],
        "quranEn": [
          "Qur'an 57:16; Syed Jawad Naqvi, Islamic Manners, lesson 31",
          "Qur'an 102:1 and 63:9"
        ],
        "avoidRepeatUr": "اس مجلس کا مرکزی سوال برقرار رکھیں؛ دوسری مجلسوں کی علمی تفصیل بے ضرورت نہ دہرائیں۔",
        "avoidRepeatEn": "Keep the session's distinct question in focus; avoid redundant repetition.",
        "takeawayUr": "آج کا سوال: «دنیا کی دوڑ میں کھویا انسان» کے بارے میں میں کون سا ایک عملی قدم اٹھاؤں گا؟",
        "takeawayEn": "Today: take one concrete step related to Lost in the race to accumulate.",
        "previousBridgeUr": "گزشتہ مجلس کی بیداری کو آج کے سوال تک آگے بڑھائیں۔",
        "previousBridgeEn": "Advance the preceding lesson into today's question.",
        "nextBridgeUr": "اگلی مجلس میں یہ بحث مزید آگے بڑھے گی۔",
        "nextBridgeEn": "The following session develops the next distinct theme."
      },
      {
        "number": 4,
        "titleUr": "گھر اور معاشرے کی غفلت، مجلس میں بیداری، گھر میں بھول",
        "titleEn": "Heedlessness in relationships; The day after a moving majlis",
        "purposeUr": "اس مجلس میں گھر اور معاشرے کی غفلت سے مجلس میں بیداری، گھر میں بھول تک الگ مگر مربوط زاویے پیدا کریں۔",
        "purposeEn": "Develop a coherent argument from Heedlessness in relationships toward The day after a moving majlis.",
        "materialUr": [
          "غفلت اور جلدبازی سے رشتوں اور سماجی معاملات کو پہنچنے والے نقصان پر گفتگو کریں۔",
          "افواہ پر ردعمل دینے سے پہلے تحقیق اور اپنے رویے کی اصلاح سمجھائیں۔",
          "ایک گھرانے کے نظرانداز حق کو واپس ادا کرنے کی عملی مثال دیں۔",
          "دعا، مجلس اور دینی ماحول میں متاثر ہونے کی قدر کریں مگر اسے آخری نتیجہ نہ سمجھیں۔",
          "غفلت دوبارہ کیوں آتی ہے؟ پرانی صحبت، ماحول اور عادتی ردعمل پر گفتگو کریں۔",
          "سامع سے اگلے دن کا ایک قابلِ مشاہدہ عمل مقرر کرائیں۔"
        ],
        "materialEn": [
          "Ground the social dimension in Syed Jawad Naqvi's Wisdom of Ali, part 5, which links negligence and haste with discord.",
          "Explain why a rushed reaction to rumours harms the rights of others.",
          "End with the repair of one ignored relationship or duty rather than accusations against outsiders.",
          "The documented lecture Islamic Manners, lesson 28 describes devotion fading after a gathering ends.",
          "Respect the sincere impact of a majlis without confusing temporary emotion with sustained formation.",
          "Ask for a concrete action on the following morning and a habit that will keep it alive."
        ],
        "sourceUr": "سید جواد نقوی، حکمتِ علیؑ، حصہ ۵؛ سید جواد نقوی، آدابِ اسلامی، درس ۲۸",
        "sourceEn": "Syed Jawad Naqvi, Wisdom of Ali, part 5; Syed Jawad Naqvi, Islamic Manners, lesson 28",
        "quranUr": [],
        "quranEn": [
          "Syed Jawad Naqvi, Wisdom of Ali, part 5",
          "Syed Jawad Naqvi, Islamic Manners, lesson 28"
        ],
        "avoidRepeatUr": "اس مجلس کا مرکزی سوال برقرار رکھیں؛ دوسری مجلسوں کی علمی تفصیل بے ضرورت نہ دہرائیں۔",
        "avoidRepeatEn": "Keep the session's distinct question in focus; avoid redundant repetition.",
        "takeawayUr": "آج کا سوال: «مجلس میں بیداری، گھر میں بھول» کے بارے میں میں کون سا ایک عملی قدم اٹھاؤں گا؟",
        "takeawayEn": "Today: take one concrete step related to The day after a moving majlis.",
        "previousBridgeUr": "گزشتہ مجلس کی بیداری کو آج کے سوال تک آگے بڑھائیں۔",
        "previousBridgeEn": "Advance the preceding lesson into today's question.",
        "nextBridgeUr": "اگلی مجلس میں یہ بحث مزید آگے بڑھے گی۔",
        "nextBridgeEn": "The following session develops the next distinct theme."
      },
      {
        "number": 5,
        "titleUr": "بیداری کا روزانہ نسخہ، کربلا: جاگے ہوئے ضمیر کی گواہی",
        "titleEn": "A daily practice of wakefulness; Karbala and a conscience that stays awake",
        "purposeUr": "اس مجلس میں بیداری کا روزانہ نسخہ سے کربلا: جاگے ہوئے ضمیر کی گواہی تک الگ مگر مربوط زاویے پیدا کریں۔",
        "purposeEn": "Develop a coherent argument from A daily practice of wakefulness toward Karbala and a conscience that stays awake.",
        "materialUr": [
          "ذکر، محاسبہ، صحیح صحبت، قرآن، حقوق العباد اور وقت کی حفاظت کے مربوط اعمال بیان کریں۔",
          "سات دن کا عملی منصوبہ دیں: روز پانچ منٹ محاسبہ، ایک حق، ایک دعا۔",
          "اصلاح کا پیمانہ جذبات نہیں بلکہ پہلے سے بہتر کردار ہو۔",
          "بیداری کا مطلب حق پہچاننے کے بعد درست موقف پر قائم رہنا ہے۔",
          "مصائبِ کربلا منتخب و مصدقہ مقتل سے الگ شامل کریں؛ غیر ثابت شدہ جزئیات بیان نہ کریں۔",
          "پہلی مجلس کا سوال واپس لائیں: اگر آنکھیں کھلی ہیں، تو دل کس حق کے لیے بیدار ہے؟"
        ],
        "materialEn": [
          "Use Ghurar al-Hikam entries 11, 13 and 20 for the progression from habitual blindness toward wakefulness.",
          "Suggest daily remembrance, self-examination, a few minutes of Qur'an, attentive prayer and repairing another's right.",
          "Measure progress by changed choices over a week, not the intensity of emotion in one evening.",
          "Conclude by turning recognition of truth into the responsibility of remaining loyal to it.",
          "Link the moral theme to Karbala without inventing martyrdom episodes or unverified historical narration.",
          "Use separately checked maqtal sources for any detailed masaib, and return to the opening question of the sleeping heart."
        ],
        "sourceUr": "غرر الحکم، اندراج ۱۱، ۱۳، ۲۰؛ النور ۲۴:۳۷؛ نہج البلاغہ، خطبہ ۱۵۳",
        "sourceEn": "Ghurar al-Hikam, Negligence entries 11, 13 and 20; Qur'an 24:37; Nahj al-Balagha, sermon 153",
        "quranUr": [
          "النور ۲۴:۳۷؛ نہج البلاغہ، خطبہ ۱۵۳"
        ],
        "quranEn": [
          "Ghurar al-Hikam, Negligence entries 11, 13 and 20",
          "Qur'an 24:37; Nahj al-Balagha, sermon 153"
        ],
        "avoidRepeatUr": "اس مجلس کا مرکزی سوال برقرار رکھیں؛ دوسری مجلسوں کی علمی تفصیل بے ضرورت نہ دہرائیں۔",
        "avoidRepeatEn": "Keep the session's distinct question in focus; avoid redundant repetition.",
        "takeawayUr": "آج کا سوال: «کربلا: جاگے ہوئے ضمیر کی گواہی» کے بارے میں میں کون سا ایک عملی قدم اٹھاؤں گا؟",
        "takeawayEn": "Today: take one concrete step related to Karbala and a conscience that stays awake.",
        "previousBridgeUr": "گزشتہ مجلس کی بیداری کو آج کے سوال تک آگے بڑھائیں۔",
        "previousBridgeEn": "Advance the preceding lesson into today's question."
      }
    ],
    "finalUr": "تمام مجالس کا عملی ثمر یہ ہو کہ سامع آج سے اپنے وقت، نماز، گھر اور حقوق میں ایک قابلِ پیمائش اصلاح کرے، اور کربلا کی یاد کو وفاداری اور بیداری میں بدلے۔",
    "finalEn": "Conclude with measurable reform in attention, worship, family rights and fidelity to the truth."
  },
  "10": {
    "length": 10,
    "titleUr": "عشرۂ مجالس — غفلت سے بیداری تک",
    "titleEn": "Ghaflah — 10-session research sequence",
    "aimUr": "ہر نشست میں ایک جدا قرآنی اور اخلاقی سوال، اصل حوالہ، منبری ربط اور قابلِ عمل نتیجہ ہوگا۔ ۲۰، ۳۰ یا ۴۵ منٹ کی مدت خطیب اپنی ضرورت کے مطابق الگ منتخب کرسکتا ہے؛ مواد صرف عنوانات نہیں بلکہ ترتیب شدہ نکات اور حوالہ جات پر مشتمل ہے۔",
    "aimEn": "Distinct Qur'anic and ethical questions with sourced speaking notes. The studio independently offers 20, 30, and 45-minute duration options.",
    "sessions": [
      {
        "number": 1,
        "titleUr": "نیندِ غفلت کیا ہے؟",
        "titleEn": "What is spiritual sleep?",
        "purposeUr": "اس مجلس میں نیندِ غفلت کیا ہے؟ سے نیندِ غفلت کیا ہے؟ تک الگ مگر مربوط زاویے پیدا کریں۔",
        "purposeEn": "Develop a coherent argument from What is spiritual sleep? toward What is spiritual sleep?.",
        "materialUr": [
          "غفلت کی تعریف: انسان ہر وقت مصروف ہو مگر انجام سے بے خبر ہو۔",
          "احساسات، عقل اور ارادے کے استعمال کا سوال اٹھائیں؛ دوسروں کے بجائے اپنے نفس سے آغاز کریں۔",
          "سامع کو دن بھر کی تین مصروفیات یاد کرائیں اور پوچھیں: ان میں کون سی اصل مقصد کے قریب لائی؟"
        ],
        "materialEn": [
          "Ghaflah concerns failure to use the intellect, conscience and opportunities already given to a person.",
          "Begin with Qur'an 7:179: the critique is not sensory disability but neglected understanding.",
          "Use Imam Ali's first aphorism to contrast external wakefulness with a heart that has lost direction.",
          "Ask listeners to list three daily activities and test whether any brings them closer to their real purpose."
        ],
        "sourceUr": "الأعراف ۷:۱۷۹؛ غرر الحکم، اندراج ۱",
        "sourceEn": "Qur'an 7:179; Ghurar al-Hikam, Negligence entry 1",
        "quranUr": [
          "الأعراف ۷:۱۷۹؛ غرر الحکم، اندراج ۱"
        ],
        "quranEn": [
          "Qur'an 7:179; Ghurar al-Hikam, Negligence entry 1"
        ],
        "avoidRepeatUr": "اس مجلس کا مرکزی سوال برقرار رکھیں؛ دوسری مجلسوں کی علمی تفصیل بے ضرورت نہ دہرائیں۔",
        "avoidRepeatEn": "Keep the session's distinct question in focus; avoid redundant repetition.",
        "takeawayUr": "آج کا سوال: «نیندِ غفلت کیا ہے؟» کے بارے میں میں کون سا ایک عملی قدم اٹھاؤں گا؟",
        "takeawayEn": "Today: take one concrete step related to What is spiritual sleep?.",
        "nextBridgeUr": "اگلی مجلس میں یہ بحث مزید آگے بڑھے گی۔",
        "nextBridgeEn": "The following session develops the next distinct theme."
      },
      {
        "number": 2,
        "titleUr": "حساب قریب، دل غافل",
        "titleEn": "Accountability approaches",
        "purposeUr": "اس مجلس میں حساب قریب، دل غافل سے حساب قریب، دل غافل تک الگ مگر مربوط زاویے پیدا کریں۔",
        "purposeEn": "Develop a coherent argument from Accountability approaches toward Accountability approaches.",
        "materialUr": [
          "مہلت کو امان نہ سمجھیں؛ انسان اہم فیصلے کل پر ٹالتا ہے۔",
          "عمر کے ختم ہونے اور موقع کے ضائع ہونے میں فرق واضح کریں۔",
          "سامع سے ایک مؤخر توبہ یا ذمہ داری کا نام لکھوانے کی دعوت دیں۔"
        ],
        "materialEn": [
          "Explain the warning of Qur'an 21:1: accountability can approach while attention is elsewhere.",
          "Pair it with Ghurar al-Hikam's warning against treating a delay in consequences as permanent safety.",
          "Invite the audience to identify a postponed duty, apology or act of repentance."
        ],
        "sourceUr": "الأنبیاء ۲۱:۱؛ غرر الحکم، اندراج ۴",
        "sourceEn": "Qur'an 21:1; Ghurar al-Hikam, Negligence entry 4",
        "quranUr": [
          "الأنبیاء ۲۱:۱؛ غرر الحکم، اندراج ۴"
        ],
        "quranEn": [
          "Qur'an 21:1; Ghurar al-Hikam, Negligence entry 4"
        ],
        "avoidRepeatUr": "اس مجلس کا مرکزی سوال برقرار رکھیں؛ دوسری مجلسوں کی علمی تفصیل بے ضرورت نہ دہرائیں۔",
        "avoidRepeatEn": "Keep the session's distinct question in focus; avoid redundant repetition.",
        "takeawayUr": "آج کا سوال: «حساب قریب، دل غافل» کے بارے میں میں کون سا ایک عملی قدم اٹھاؤں گا؟",
        "takeawayEn": "Today: take one concrete step related to Accountability approaches.",
        "previousBridgeUr": "گزشتہ مجلس کی بیداری کو آج کے سوال تک آگے بڑھائیں۔",
        "previousBridgeEn": "Advance the preceding lesson into today's question.",
        "nextBridgeUr": "اگلی مجلس میں یہ بحث مزید آگے بڑھے گی۔",
        "nextBridgeEn": "The following session develops the next distinct theme."
      },
      {
        "number": 3,
        "titleUr": "سرابی سکون کی حقیقت",
        "titleEn": "The illusion of security",
        "purposeUr": "اس مجلس میں سرابی سکون کی حقیقت سے سرابی سکون کی حقیقت تک الگ مگر مربوط زاویے پیدا کریں۔",
        "purposeEn": "Develop a coherent argument from The illusion of security toward The illusion of security.",
        "materialUr": [
          "خطرہ معلوم نہ ہونا، خطرے کا نہ ہونا نہیں؛ سراب اور پائیدار اطمینان کی تمثیل سمجھائیں۔",
          "دینی اعتماد اور بے خبری کے دو الگ نتائج بیان کریں۔",
          "مجلس کا سوال: میں کس معاملے میں بے فکری کو ایمان سمجھ رہا ہوں؟"
        ],
        "materialEn": [
          "Syed Jawad Naqvi's Divine Laws, lesson 6 distinguishes illusory reassurance from durable inner tranquility.",
          "An unaware person may feel safe simply because the danger has not been recognised.",
          "Use the mirage analogy carefully: a pleasant feeling is not always reliable evidence of spiritual health."
        ],
        "sourceUr": "سید جواد نقوی، سنن الٰہی، درس ۶",
        "sourceEn": "Syed Jawad Naqvi, Divine Laws, lesson 6",
        "quranUr": [],
        "quranEn": [
          "Syed Jawad Naqvi, Divine Laws, lesson 6"
        ],
        "avoidRepeatUr": "اس مجلس کا مرکزی سوال برقرار رکھیں؛ دوسری مجلسوں کی علمی تفصیل بے ضرورت نہ دہرائیں۔",
        "avoidRepeatEn": "Keep the session's distinct question in focus; avoid redundant repetition.",
        "takeawayUr": "آج کا سوال: «سرابی سکون کی حقیقت» کے بارے میں میں کون سا ایک عملی قدم اٹھاؤں گا؟",
        "takeawayEn": "Today: take one concrete step related to The illusion of security.",
        "previousBridgeUr": "گزشتہ مجلس کی بیداری کو آج کے سوال تک آگے بڑھائیں۔",
        "previousBridgeEn": "Advance the preceding lesson into today's question.",
        "nextBridgeUr": "اگلی مجلس میں یہ بحث مزید آگے بڑھے گی۔",
        "nextBridgeEn": "The following session develops the next distinct theme."
      },
      {
        "number": 4,
        "titleUr": "ذکرِ خدا اور خود فراموشی",
        "titleEn": "Forgetting God, forgetting self",
        "purposeUr": "اس مجلس میں ذکرِ خدا اور خود فراموشی سے ذکرِ خدا اور خود فراموشی تک الگ مگر مربوط زاویے پیدا کریں۔",
        "purposeEn": "Develop a coherent argument from Forgetting God, forgetting self toward Forgetting God, forgetting self.",
        "materialUr": [
          "یادِ خدا کو محض زبانی تکرار نہیں بلکہ زندگی کے فیصلے درست رکھنے کا ذریعہ دکھائیں۔",
          "دن کا مختصر محاسبہ، نیت کی اصلاح اور خاموش مطالعہ تجویز کریں۔",
          "قیامت کے پردہ ہٹنے سے پہلے دل کی بینائی پر توجہ دلائیں۔"
        ],
        "materialEn": [
          "Use Qur'an 59:19 to show the inward cost of forgetting God: a damaged understanding of one's own self.",
          "Ask what gives a day meaning, and distinguish intention from routine.",
          "Relate Qur'an 50:22 to the need to seek insight before the final unveiling."
        ],
        "sourceUr": "الحشر ۵۹:۱۹؛ ق ۵۰:۲۲",
        "sourceEn": "Qur'an 59:19 and 50:22",
        "quranUr": [
          "الحشر ۵۹:۱۹؛ ق ۵۰:۲۲"
        ],
        "quranEn": [
          "Qur'an 59:19 and 50:22"
        ],
        "avoidRepeatUr": "اس مجلس کا مرکزی سوال برقرار رکھیں؛ دوسری مجلسوں کی علمی تفصیل بے ضرورت نہ دہرائیں۔",
        "avoidRepeatEn": "Keep the session's distinct question in focus; avoid redundant repetition.",
        "takeawayUr": "آج کا سوال: «ذکرِ خدا اور خود فراموشی» کے بارے میں میں کون سا ایک عملی قدم اٹھاؤں گا؟",
        "takeawayEn": "Today: take one concrete step related to Forgetting God, forgetting self.",
        "previousBridgeUr": "گزشتہ مجلس کی بیداری کو آج کے سوال تک آگے بڑھائیں۔",
        "previousBridgeEn": "Advance the preceding lesson into today's question.",
        "nextBridgeUr": "اگلی مجلس میں یہ بحث مزید آگے بڑھے گی۔",
        "nextBridgeEn": "The following session develops the next distinct theme."
      },
      {
        "number": 5,
        "titleUr": "عبادت کی صورت، دل کی غفلت",
        "titleEn": "Worship without attention",
        "purposeUr": "اس مجلس میں عبادت کی صورت، دل کی غفلت سے عبادت کی صورت، دل کی غفلت تک الگ مگر مربوط زاویے پیدا کریں۔",
        "purposeEn": "Develop a coherent argument from Worship without attention toward Worship without attention.",
        "materialUr": [
          "نماز کی شرعی ادائیگی اور حضورِ قلب کو الگ سوالات کے طور پر کھولیں۔",
          "رفتار کم کرکے ایک نماز معنی سمجھ کر ادا کرنے کا ہدف دیں۔",
          "آیت کے خطاب کو خود اہلِ ایمان سے جوڑ کر اصلاح کی امید زندہ رکھیں۔"
        ],
        "materialEn": [
          "Qur'an 57:16 speaks to believers, inviting humble and attentive hearts.",
          "Draw on Syed Jawad Naqvi's Islamic Manners, lesson 31, which criticises hurried and careless prayer.",
          "Distinguish legal validity of the prayer from the separate call to spiritual attentiveness."
        ],
        "sourceUr": "الحدید ۵۷:۱۶؛ سید جواد نقوی، آدابِ اسلامی، درس ۳۱",
        "sourceEn": "Qur'an 57:16; Syed Jawad Naqvi, Islamic Manners, lesson 31",
        "quranUr": [
          "الحدید ۵۷:۱۶؛ سید جواد نقوی، آدابِ اسلامی، درس ۳۱"
        ],
        "quranEn": [
          "Qur'an 57:16; Syed Jawad Naqvi, Islamic Manners, lesson 31"
        ],
        "avoidRepeatUr": "اس مجلس کا مرکزی سوال برقرار رکھیں؛ دوسری مجلسوں کی علمی تفصیل بے ضرورت نہ دہرائیں۔",
        "avoidRepeatEn": "Keep the session's distinct question in focus; avoid redundant repetition.",
        "takeawayUr": "آج کا سوال: «عبادت کی صورت، دل کی غفلت» کے بارے میں میں کون سا ایک عملی قدم اٹھاؤں گا؟",
        "takeawayEn": "Today: take one concrete step related to Worship without attention.",
        "previousBridgeUr": "گزشتہ مجلس کی بیداری کو آج کے سوال تک آگے بڑھائیں۔",
        "previousBridgeEn": "Advance the preceding lesson into today's question.",
        "nextBridgeUr": "اگلی مجلس میں یہ بحث مزید آگے بڑھے گی۔",
        "nextBridgeEn": "The following session develops the next distinct theme."
      },
      {
        "number": 6,
        "titleUr": "دنیا کی دوڑ میں کھویا انسان",
        "titleEn": "Lost in the race to accumulate",
        "purposeUr": "اس مجلس میں دنیا کی دوڑ میں کھویا انسان سے دنیا کی دوڑ میں کھویا انسان تک الگ مگر مربوط زاویے پیدا کریں۔",
        "purposeEn": "Develop a coherent argument from Lost in the race to accumulate toward Lost in the race to accumulate.",
        "materialUr": [
          "شہرت، فون، کام، رقم اور نمبروں کی دوڑ کو مثالیں بنائیں؛ جائز معاش کو موردِ الزام نہ ٹھہرائیں۔",
          "ترجیحات کا ایک سادہ روزانہ جائزہ پیش کریں۔",
          "لوگوں کے حقوق تلف کیے بغیر عبادت اور مصروفیت کا توازن سمجھائیں۔"
        ],
        "materialEn": [
          "Read Qur'an 102:1 as a warning that rivalry in increase can monopolise attention.",
          "Balance it with 63:9: neither lawful work nor raising children is condemned.",
          "Use examples of reputation, notifications, status and income to expose the real question of priorities."
        ],
        "sourceUr": "التكاثر ۱۰۲:۱؛ المنافقون ۶۳:۹",
        "sourceEn": "Qur'an 102:1 and 63:9",
        "quranUr": [
          "التكاثر ۱۰۲:۱؛ المنافقون ۶۳:۹"
        ],
        "quranEn": [
          "Qur'an 102:1 and 63:9"
        ],
        "avoidRepeatUr": "اس مجلس کا مرکزی سوال برقرار رکھیں؛ دوسری مجلسوں کی علمی تفصیل بے ضرورت نہ دہرائیں۔",
        "avoidRepeatEn": "Keep the session's distinct question in focus; avoid redundant repetition.",
        "takeawayUr": "آج کا سوال: «دنیا کی دوڑ میں کھویا انسان» کے بارے میں میں کون سا ایک عملی قدم اٹھاؤں گا؟",
        "takeawayEn": "Today: take one concrete step related to Lost in the race to accumulate.",
        "previousBridgeUr": "گزشتہ مجلس کی بیداری کو آج کے سوال تک آگے بڑھائیں۔",
        "previousBridgeEn": "Advance the preceding lesson into today's question.",
        "nextBridgeUr": "اگلی مجلس میں یہ بحث مزید آگے بڑھے گی۔",
        "nextBridgeEn": "The following session develops the next distinct theme."
      },
      {
        "number": 7,
        "titleUr": "گھر اور معاشرے کی غفلت",
        "titleEn": "Heedlessness in relationships",
        "purposeUr": "اس مجلس میں گھر اور معاشرے کی غفلت سے گھر اور معاشرے کی غفلت تک الگ مگر مربوط زاویے پیدا کریں۔",
        "purposeEn": "Develop a coherent argument from Heedlessness in relationships toward Heedlessness in relationships.",
        "materialUr": [
          "غفلت اور جلدبازی سے رشتوں اور سماجی معاملات کو پہنچنے والے نقصان پر گفتگو کریں۔",
          "افواہ پر ردعمل دینے سے پہلے تحقیق اور اپنے رویے کی اصلاح سمجھائیں۔",
          "ایک گھرانے کے نظرانداز حق کو واپس ادا کرنے کی عملی مثال دیں۔"
        ],
        "materialEn": [
          "Ground the social dimension in Syed Jawad Naqvi's Wisdom of Ali, part 5, which links negligence and haste with discord.",
          "Explain why a rushed reaction to rumours harms the rights of others.",
          "End with the repair of one ignored relationship or duty rather than accusations against outsiders."
        ],
        "sourceUr": "سید جواد نقوی، حکمتِ علیؑ، حصہ ۵",
        "sourceEn": "Syed Jawad Naqvi, Wisdom of Ali, part 5",
        "quranUr": [],
        "quranEn": [
          "Syed Jawad Naqvi, Wisdom of Ali, part 5"
        ],
        "avoidRepeatUr": "اس مجلس کا مرکزی سوال برقرار رکھیں؛ دوسری مجلسوں کی علمی تفصیل بے ضرورت نہ دہرائیں۔",
        "avoidRepeatEn": "Keep the session's distinct question in focus; avoid redundant repetition.",
        "takeawayUr": "آج کا سوال: «گھر اور معاشرے کی غفلت» کے بارے میں میں کون سا ایک عملی قدم اٹھاؤں گا؟",
        "takeawayEn": "Today: take one concrete step related to Heedlessness in relationships.",
        "previousBridgeUr": "گزشتہ مجلس کی بیداری کو آج کے سوال تک آگے بڑھائیں۔",
        "previousBridgeEn": "Advance the preceding lesson into today's question.",
        "nextBridgeUr": "اگلی مجلس میں یہ بحث مزید آگے بڑھے گی۔",
        "nextBridgeEn": "The following session develops the next distinct theme."
      },
      {
        "number": 8,
        "titleUr": "مجلس میں بیداری، گھر میں بھول",
        "titleEn": "The day after a moving majlis",
        "purposeUr": "اس مجلس میں مجلس میں بیداری، گھر میں بھول سے مجلس میں بیداری، گھر میں بھول تک الگ مگر مربوط زاویے پیدا کریں۔",
        "purposeEn": "Develop a coherent argument from The day after a moving majlis toward The day after a moving majlis.",
        "materialUr": [
          "دعا، مجلس اور دینی ماحول میں متاثر ہونے کی قدر کریں مگر اسے آخری نتیجہ نہ سمجھیں۔",
          "غفلت دوبارہ کیوں آتی ہے؟ پرانی صحبت، ماحول اور عادتی ردعمل پر گفتگو کریں۔",
          "سامع سے اگلے دن کا ایک قابلِ مشاہدہ عمل مقرر کرائیں۔"
        ],
        "materialEn": [
          "The documented lecture Islamic Manners, lesson 28 describes devotion fading after a gathering ends.",
          "Respect the sincere impact of a majlis without confusing temporary emotion with sustained formation.",
          "Ask for a concrete action on the following morning and a habit that will keep it alive."
        ],
        "sourceUr": "سید جواد نقوی، آدابِ اسلامی، درس ۲۸",
        "sourceEn": "Syed Jawad Naqvi, Islamic Manners, lesson 28",
        "quranUr": [],
        "quranEn": [
          "Syed Jawad Naqvi, Islamic Manners, lesson 28"
        ],
        "avoidRepeatUr": "اس مجلس کا مرکزی سوال برقرار رکھیں؛ دوسری مجلسوں کی علمی تفصیل بے ضرورت نہ دہرائیں۔",
        "avoidRepeatEn": "Keep the session's distinct question in focus; avoid redundant repetition.",
        "takeawayUr": "آج کا سوال: «مجلس میں بیداری، گھر میں بھول» کے بارے میں میں کون سا ایک عملی قدم اٹھاؤں گا؟",
        "takeawayEn": "Today: take one concrete step related to The day after a moving majlis.",
        "previousBridgeUr": "گزشتہ مجلس کی بیداری کو آج کے سوال تک آگے بڑھائیں۔",
        "previousBridgeEn": "Advance the preceding lesson into today's question.",
        "nextBridgeUr": "اگلی مجلس میں یہ بحث مزید آگے بڑھے گی۔",
        "nextBridgeEn": "The following session develops the next distinct theme."
      },
      {
        "number": 9,
        "titleUr": "بیداری کا روزانہ نسخہ",
        "titleEn": "A daily practice of wakefulness",
        "purposeUr": "اس مجلس میں بیداری کا روزانہ نسخہ سے بیداری کا روزانہ نسخہ تک الگ مگر مربوط زاویے پیدا کریں۔",
        "purposeEn": "Develop a coherent argument from A daily practice of wakefulness toward A daily practice of wakefulness.",
        "materialUr": [
          "ذکر، محاسبہ، صحیح صحبت، قرآن، حقوق العباد اور وقت کی حفاظت کے مربوط اعمال بیان کریں۔",
          "سات دن کا عملی منصوبہ دیں: روز پانچ منٹ محاسبہ، ایک حق، ایک دعا۔",
          "اصلاح کا پیمانہ جذبات نہیں بلکہ پہلے سے بہتر کردار ہو۔"
        ],
        "materialEn": [
          "Use Ghurar al-Hikam entries 11, 13 and 20 for the progression from habitual blindness toward wakefulness.",
          "Suggest daily remembrance, self-examination, a few minutes of Qur'an, attentive prayer and repairing another's right.",
          "Measure progress by changed choices over a week, not the intensity of emotion in one evening."
        ],
        "sourceUr": "غرر الحکم، اندراج ۱۱، ۱۳، ۲۰",
        "sourceEn": "Ghurar al-Hikam, Negligence entries 11, 13 and 20",
        "quranUr": [],
        "quranEn": [
          "Ghurar al-Hikam, Negligence entries 11, 13 and 20"
        ],
        "avoidRepeatUr": "اس مجلس کا مرکزی سوال برقرار رکھیں؛ دوسری مجلسوں کی علمی تفصیل بے ضرورت نہ دہرائیں۔",
        "avoidRepeatEn": "Keep the session's distinct question in focus; avoid redundant repetition.",
        "takeawayUr": "آج کا سوال: «بیداری کا روزانہ نسخہ» کے بارے میں میں کون سا ایک عملی قدم اٹھاؤں گا؟",
        "takeawayEn": "Today: take one concrete step related to A daily practice of wakefulness.",
        "previousBridgeUr": "گزشتہ مجلس کی بیداری کو آج کے سوال تک آگے بڑھائیں۔",
        "previousBridgeEn": "Advance the preceding lesson into today's question.",
        "nextBridgeUr": "اگلی مجلس میں یہ بحث مزید آگے بڑھے گی۔",
        "nextBridgeEn": "The following session develops the next distinct theme."
      },
      {
        "number": 10,
        "titleUr": "کربلا: جاگے ہوئے ضمیر کی گواہی",
        "titleEn": "Karbala and a conscience that stays awake",
        "purposeUr": "اس مجلس میں کربلا: جاگے ہوئے ضمیر کی گواہی سے کربلا: جاگے ہوئے ضمیر کی گواہی تک الگ مگر مربوط زاویے پیدا کریں۔",
        "purposeEn": "Develop a coherent argument from Karbala and a conscience that stays awake toward Karbala and a conscience that stays awake.",
        "materialUr": [
          "بیداری کا مطلب حق پہچاننے کے بعد درست موقف پر قائم رہنا ہے۔",
          "مصائبِ کربلا منتخب و مصدقہ مقتل سے الگ شامل کریں؛ غیر ثابت شدہ جزئیات بیان نہ کریں۔",
          "پہلی مجلس کا سوال واپس لائیں: اگر آنکھیں کھلی ہیں، تو دل کس حق کے لیے بیدار ہے؟"
        ],
        "materialEn": [
          "Conclude by turning recognition of truth into the responsibility of remaining loyal to it.",
          "Link the moral theme to Karbala without inventing martyrdom episodes or unverified historical narration.",
          "Use separately checked maqtal sources for any detailed masaib, and return to the opening question of the sleeping heart."
        ],
        "sourceUr": "النور ۲۴:۳۷؛ نہج البلاغہ، خطبہ ۱۵۳",
        "sourceEn": "Qur'an 24:37; Nahj al-Balagha, sermon 153",
        "quranUr": [
          "النور ۲۴:۳۷؛ نہج البلاغہ، خطبہ ۱۵۳"
        ],
        "quranEn": [
          "Qur'an 24:37; Nahj al-Balagha, sermon 153"
        ],
        "avoidRepeatUr": "اس مجلس کا مرکزی سوال برقرار رکھیں؛ دوسری مجلسوں کی علمی تفصیل بے ضرورت نہ دہرائیں۔",
        "avoidRepeatEn": "Keep the session's distinct question in focus; avoid redundant repetition.",
        "takeawayUr": "آج کا سوال: «کربلا: جاگے ہوئے ضمیر کی گواہی» کے بارے میں میں کون سا ایک عملی قدم اٹھاؤں گا؟",
        "takeawayEn": "Today: take one concrete step related to Karbala and a conscience that stays awake.",
        "previousBridgeUr": "گزشتہ مجلس کی بیداری کو آج کے سوال تک آگے بڑھائیں۔",
        "previousBridgeEn": "Advance the preceding lesson into today's question."
      }
    ],
    "finalUr": "تمام مجالس کا عملی ثمر یہ ہو کہ سامع آج سے اپنے وقت، نماز، گھر اور حقوق میں ایک قابلِ پیمائش اصلاح کرے، اور کربلا کی یاد کو وفاداری اور بیداری میں بدلے۔",
    "finalEn": "Conclude with measurable reform in attention, worship, family rights and fidelity to the truth."
  }
};
export function ghaflahMajlisSeries(length: MajlisSeriesLength): MajlisSeriesPlan {
  return SERIES[length];
}
