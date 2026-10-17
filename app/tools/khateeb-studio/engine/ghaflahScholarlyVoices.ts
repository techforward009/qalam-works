/**
 * Source-grounded selected scholarly excerpts on Ghaflah.
 * Original language and transcript/translation provenance are explicit.
 * Inclusion does not imply full review of any speaker's collected works.
 */
export type GhaflahScholarlyVoice = {
 id: string;
 speakerId: string | null;
 scholarUr: string;
 scholarEn: string;
 workUr: string;
 workEn: string;
 quote: string;
 language: "fa" | "en";
 kind: "published-persian-lecture" | "published-english-translation" | "published-signed-letter" | "official-published-outline";
 ur: string; en: string;
 whyUr: string; whyEn: string;
 url: string;
 noteUr: string; noteEn: string;
 sessionNumbers: readonly number[];
};
export const GHAF_LAH_SCHOLARLY_VOICES: readonly GhaflahScholarlyVoice[] = [
  {
    "id": "mazaheri",
    "speakerId": null,
    "scholarUr": "آیت اللہ العظمیٰ حسین مظاہری",
    "scholarEn": "Grand Ayatollah Hossein Mazaheri",
    "workUr": "شرح فضیلت‌ها و رذیلت‌های اخلاقی — رذیلت سوم: غفلت",
    "workEn": "Explanation of Virtues and Vices — Third Vice: Heedlessness",
    "quote": "غفلت از عمر كه سرمایه و ذخیره و مایۀ شرافت آدمی است",
    "language": "fa",
    "kind": "published-persian-lecture",
    "ur": "عمر انسان کا سرمایہ، اس کی پونجی اور عزت کا ذریعہ ہے؛ اس سے غافل ہو جانا اخلاقی نقصان ہے۔",
    "en": "A person's lifespan is a precious capital, and overlooking its purpose is a moral loss.",
    "whyUr": "عمر، موت، شکر اور قرآن سے غفلت کی الگ جہات؛ وقت اور خود احتسابی والی مجالس کا بنیادی ماخذ۔",
    "whyEn": "Covers neglect of life, mortality, gratitude and Qur'an; foundational for sermons on priorities and self-examination.",
    "url": "https://www.neshasteasatid.com/node/7110",
    "noteUr": "شائع شدہ اصل فارسی اخلاقی گفتار کا مختصر جملہ؛ تمام درس کا ترجمہ نہیں۔",
    "noteEn": "Short quotation from a published Persian ethical discourse; not a full transcript translation.",
    "sessionNumbers": [
      1,
      2,
      3
    ]
  },
  {
    "id": "misbah",
    "speakerId": null,
    "scholarUr": "آیت اللہ محمد تقی مصباح یزدیؒ",
    "scholarEn": "Ayatollah Mohammad Taqi Mesbah Yazdi",
    "workUr": "ہفتہ وار درسِ اخلاق، قم — غفلت اور خود شناسی",
    "workEn": "Weekly ethics lesson in Qom — Heedlessness and self-knowledge",
    "quote": "بحثمان در مورد واژه غفلت بود که ریشه تمام انحرافات و اشتباهات و سقوط های انسان است.",
    "language": "fa",
    "kind": "published-persian-lecture",
    "ur": "ہماری بحث غفلت پر ہے، جو انسان کی گمراہیوں، غلطیوں اور اخلاقی زوال کی جڑ ہے۔",
    "en": "Heedlessness lies at the root of human deviation, error, and moral downfall.",
    "whyUr": "غفلت، خود فراموشی اور خواہشاتِ نفس کا قرآنی و عقلی استدلال؛ تعارفی اور توبہ والی مجالس کے لیے۔",
    "whyEn": "A connected scriptural argument about inattention, self-forgetting and desire, suited to opening and repentance.",
    "url": "https://neshasteasatid.com/node/732",
    "noteUr": "اصل فارسی تقریر کی شائع شدہ نقل؛ مختصر اقتباس کا مفہومی اردو ترجمہ۔",
    "noteEn": "Published Persian lecture excerpt with an editorial Urdu/English rendering.",
    "sessionNumbers": [
      1,
      2,
      5
    ]
  },
  {
    "id": "naraqi",
    "speakerId": null,
    "scholarUr": "ملا محمد مہدی نراقیؒ",
    "scholarEn": "Muhammad Mahdi al-Naraqi",
    "workUr": "جامع السعادات — باب الغفلة",
    "workEn": "Jami' al-Sa'adat — Neglect (Ghaflah)",
    "quote": "Ghaflah means indifference and lack of attention; its opposite is attention and resoluteness.",
    "language": "en",
    "kind": "published-english-translation",
    "ur": "غفلت بے پروائی اور بے توجہی ہے، اور اس کے مقابل شعوری توجہ اور مضبوط ارادہ ہے۔",
    "en": "Heedlessness is indifference; its contrary is deliberate, resolute attention.",
    "whyUr": "غفلت اور حسنِ تغافل میں فرق؛ ایک اہم کلاسیکی اخلاقی بحث، خصوصاً خاندانی حقوق کے لیے۔",
    "whyEn": "A classical ethical distinction between harmful neglect and virtuous discretion about trivial faults.",
    "url": "https://al-islam.org/jami-al-saadat-collector-felicities-muhammad-mahdi-naraqi/joint-diseases-powers-intellect-anger-and",
    "noteUr": "یہ اصل عربی کتاب کا لفظی اقتباس نہیں بلکہ شائع شدہ انگریزی خلاصے کی عبارت ہے؛ اصل عربی سے مستقل تقابل باقی ہے۔",
    "noteEn": "Quotation from a published English summary, not the original Arabic; independent Arabic collation pending.",
    "sessionNumbers": [
      1,
      3,
      4
    ]
  },
  {
    "id": "dastghaib",
    "speakerId": null,
    "scholarUr": "آیت اللہ سید عبدالحسین دستغیب شیرازیؒ",
    "scholarEn": "Ayatollah Sayyid Abd al-Husayn Dastghaib",
    "workUr": "گناہانِ کبیرہ، جلد اول — عذابِ الٰہی سے بے خوفی",
    "workEn": "Greater Sins, vol. 1 — Disregarding Divine Punishment",
    "quote": "This heedlessness and disregard is a Greater Sin",
    "language": "en",
    "kind": "published-english-translation",
    "ur": "عذابِ الٰہی کے بارے میں ایسی بے پروائی اور بے خوفی کو مصنف نے کبیرہ گناہ کے ضمن میں بیان کیا ہے۔",
    "en": "The author treats complacent disregard of divine accountability as a grave sin.",
    "whyUr": "مہلت کے فریب اور بے جا اطمینان کا خطرہ؛ اس حکم کو ہر قسم کی معمولی بھول پر لاگو نہ کریں۔",
    "whyEn": "The danger of false security about accountability; do not generalize a specific doctrinal warning to every momentary lapse.",
    "url": "https://al-islam.org/greater-sins-volume-1-sayyid-abdul-husayn-dastghaib-shirazi/fourth-greater-sin-al-amno-min-makrillah",
    "noteUr": "شائع شدہ انگریزی ترجمے کی محدود عبارت، نہ کہ مصنف کے اصل فارسی الفاظ۔",
    "noteEn": "Brief quotation from an English translation; not verified verbatim Persian.",
    "sessionNumbers": [
      2,
      5
    ]
  },
  {
    "id": "qaraati",
    "speakerId": "qaraati",
    "scholarUr": "حجت الاسلام محسن قرائتی",
    "scholarEn": "Hujjat al-Islam Mohsen Qaraati",
    "workUr": "ایرانی بچیوں کے نام شائع شدہ خط — غفلت اور انسانی قدر",
    "workEn": "Published letter to Iranian girls — heedlessness and human dignity",
    "quote": "غفلت بزرگترین خطر برای انسان است.",
    "language": "fa",
    "kind": "published-signed-letter",
    "ur": "غفلت انسان کے لیے سب سے بڑا خطرہ ہے۔",
    "en": "Heedlessness is the greatest danger to a person.",
    "whyUr": "خدا اور قیامت، عمر اور صلاحیت، معاشرے اور محروم افراد کے حقوق سے غفلت کا ذکر؛ خط کا سیاق محفوظ رکھیں۔",
    "whyEn": "The signed letter links heedlessness to God, the afterlife, human gifts and concern for the deprived; preserve the letter's context.",
    "url": "https://hadana.ir/%D9%86%D8%A7%D9%85%D9%87-%D8%A7%D8%B3%D8%AA%D8%A7%D8%AF-%D9%82%D8%B1%D8%A7%D8%A6%D8%AA%DB%8C-%D8%A8%D9%87-%D8%AF%D8%AE%D8%AA%D8%B1%D8%A7%D9%86-%D8%A7%DB%8C%D8%B1%D8%A7%D9%86%DB%8C-%D8%AE%D8%A7%D9%86%D9%85-%D9%87%D8%A7-%D8%A7%DB%8C%D9%86-%D9%86%D8%A7%D9%85%D9%87-%D8%B1%D8%A7-%D8%A8%D8%AE%D9%88%D8%A7%D9%86%D9%86%D8%AF/",
    "noteUr": "محسن قرائتی کے دستخط سے شائع خط کے اصل فارسی الفاظ؛ اس کا مخاطب اور سیاق واضح ہے۔",
    "noteEn": "An excerpt from a signed published Persian letter; context and original audience must remain explicit.",
    "sessionNumbers": [
      3,
      4
    ]
  },
  {
    "id": "shojaei",
    "speakerId": "shojaei",
    "scholarUr": "استاد محمد شجاعی",
    "scholarEn": "Mohammad Shojaei",
    "workUr": "صحیفۂ سجادیہ کے آئینے میں انسان شناسی — شائع شدہ نکات",
    "workEn": "Anthropology in Sahifa Sajjadiyya — published lecture outline",
    "quote": "این موجب غفلت ما از بعد اصلی وجودمان می‌شود.",
    "language": "fa",
    "kind": "official-published-outline",
    "ur": "نچلی خواہشات میں گرفتار ہونا انسان کو اپنی اصل انسانی حقیقت سے غافل کر دیتا ہے۔",
    "en": "Lower preoccupations can distract us from the deepest dimension of our being.",
    "whyUr": "اصل انسان شناسی سے غفلت کا زاویہ؛ یہ سرکاری شائع شدہ خلاصہ ہے، مکمل تقریر کی نقل نہیں۔",
    "whyEn": "An officially published outline on losing sight of one's higher identity; not a full transcript.",
    "url": "https://media.montazer.ir/47690-2/",
    "noteUr": "یہ الفاظ ان کے ادارے کے شائع کردہ نکات سے ہیں؛ انہیں براہِ راست بولی گئی عبارت کا یقینی ثبوت نہ سمجھیں۔",
    "noteEn": "Text from the official published outline; not certified verbatim spoken words.",
    "sessionNumbers": [
      1,
      5
    ]
  }
];
