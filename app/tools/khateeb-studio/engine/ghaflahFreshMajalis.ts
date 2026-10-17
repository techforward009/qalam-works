import type { MajlisSeriesPlan, MajlisSeriesSession } from "./seriesPlanner";
import type { PreparedSessionMaterial } from "./preparedSeries";
import { GHAF_LAH_DEEPER } from "./ghaflahDepth";
import { GHAF_LAH_MASAIB } from "./ghaflahMasaib";
import { GHAF_LAH_SCHOLARLY_VOICES } from "./ghaflahScholarlyVoices";
import { GHAF_LAH_DURATION_EXTRA } from "./ghaflahDurationExtra";

type SourceLink = { labelUr: string; labelEn: string; url: string };
type Spec = {
  titleUr: string; titleEn: string; purposeUr: string;
  quran: readonly [number, number][]; hadith: string;
  sources: readonly SourceLink[];
  heads: readonly string[];
  paras: readonly (readonly [string, string])[];
  english: readonly (readonly [string, string, string])[];
  question: string; example: string; action: string;
};
const SPECS: readonly Spec[] = [
  {
    "titleUr": "جاگتی آنکھیں، سویا ہوا دل",
    "titleEn": "The sleeping heart behind open eyes",
    "purposeUr": "قرآن کی روشنی میں غفلت کی شناخت: انسان کے پاس دل، آنکھ اور کان ہوں مگر وہ ان نعمتوں سے حقیقت نہ پہچانے۔",
    "quran": [
      [
        7,
        179
      ],
      [
        21,
        1
      ]
    ],
    "hadith": "ghaflah-ghurar-1",
    "sources": [
      {
        "labelUr": "غرر الحکم — باب الغفلة، اندراج ۱",
        "labelEn": "Ghurar al-Hikam — Negligence, entry 1",
        "url": "https://al-islam.org/ghurar-al-hikam-wa-durar-al-kalim-exalted-aphorisms-and-pearls-speech/negligence"
      },
      {
        "labelUr": "حامد کاشانی — خطر غفلت، مجلس اول",
        "labelEn": "Hamed Kashani — Danger of Heedlessness, session 1",
        "url": "https://www.hkashani.com/?p=23340"
      }
    ],
    "heads": [
      "سوال جو دل پر دستک دے",
      "قرآن کا آئینہ",
      "امیرالمؤمنینؑ کا معیار",
      "مصروف آدمی کی غفلت",
      "دل کی بیداری کا پہلا وعدہ"
    ],
    "paras": [
      [
        "آپ نے کبھی سوچا کہ انسان سوتے ہوئے تو سب سے بے خبر ہوتا ہے، مگر کیا ایسا بھی ہوسکتا ہے کہ آدمی جاگ رہا ہو، دفتر جا رہا ہو، کاروبار کررہا ہو، مجالس میں شریک ہو، نمازی بھی ہو اور پھر بھی غفلت میں مبتلا ہو؟ یہ سوال دوسروں پر حکم لگانے کے لیے نہیں۔ یہ اپنے دل پر دستک دینے کے لیے ہے۔ ہم سب ہر روز بہت سی چیزوں کا حساب رکھتے ہیں: وقت، قیمت، پیغامات، آمدنی، خرچ اور ملاقاتیں؛ مگر کیا ہم نے کبھی یہ بھی حساب رکھا کہ آج خدا کے لیے کیا کیا، کس کا دل رکھا، کس کا حق ادا کیا اور کون سا کام محض عادت میں ہوتا رہا؟ جب آدمی ہر خبر سے باخبر مگر اپنی منزل سے بے خبر ہو تو سمجھ لیجیے کہ اصل سوال بیرونی معلومات کا نہیں، اندر کی بیداری کا ہے۔",
        "سامع کو ایک لمحے کے لیے اپنے گزشتہ دن کا جائزہ لینے دیں۔ یہاں جذباتی الزام کے بجائے خود احتسابی پیدا کرنا ہے۔"
      ],
      [
        "سورۂ اعراف کی آیت ۱۷۹ انسانی زندگی کا حیرت انگیز نقشہ کھینچتی ہے: دل ہیں مگر سمجھتے نہیں، آنکھیں ہیں مگر دیکھتے نہیں، کان ہیں مگر سنتے نہیں۔ اس آیت کا مطلب جسمانی کمزوری کی مذمت نہیں، بلکہ ملی ہوئی صلاحیتوں کو حق پہچاننے اور اس پر چلنے میں استعمال نہ کرنا ہے۔ یہی غفلت کی اصل تصویر ہے۔ پھر سورۂ انبیاء کی پہلی آیت یاد دلاتی ہے کہ لوگوں کے حساب کا وقت قریب آرہا ہے اور وہ غفلت اور اعراض میں ہیں۔ ذرا دیکھیے، حساب قریب ہونا ایک حقیقت ہے اور اس سے بے پروا رہنا دوسری حقیقت۔ ہمارے اختیار میں حساب کا وقت نہیں، مگر اپنے فیصلوں کو بدلنا ہمارے اختیار میں ہے۔",
        "دونوں قرآنی آیات کا اصل عربی متن اور منظور شدہ اردو ترجمہ نیچے مستقل ماخذ سے دکھایا جاتا ہے۔ ان کی تشریح کو اصل وحی کا لفظی ترجمہ نہ سمجھا جائے۔"
      ],
      [
        "امیرالمؤمنین علیؑ کی طرف منسوب غرر الحکم کے محفوظ قول کا مفہوم ہے کہ دل کی غفلت کے ساتھ آنکھوں کی بیداری فائدہ نہیں دیتی۔ یہاں لفظِ دل محض جذبات کا نام نہیں؛ اس میں بصیرت، نیت اور سمت بھی شامل ہیں۔ انسان جانتا ہو کہ ماں باپ کی خدمت ضروری ہے مگر ان سے بات کرنے کے لیے وقت نہ ہو، وہ نماز کے وقت کا پابند ہو مگر کسی پر ظلم کرتے ہوئے سوچتا نہ ہو، وہ حسینؑ کا ذکر بڑے شوق سے کرتا ہو مگر حق کے معاملے میں سچ بولنے سے گھبرائے، تو سوال پیدا ہوتا ہے کہ علم اور محبت نے کردار تک سفر کیوں نہیں کیا؟ منبر کا کام کسی شخص کو ذلیل کرنا نہیں بلکہ اسے وہ آئینہ دکھانا ہے جس میں وہ خود اپنی کمی پہچانے۔",
        "اس مرحلے پر عربی روایت اپنی اصل عبارت، نمبر اور ماخذ کے ساتھ دکھائی جائے گی؛ وضاحت قلم ورکس کی تدوین ہے۔"
      ],
      [
        "حامد کاشانی نے اپنے مکتوب خطاب «خطر غفلت» کی پہلی مجلس میں توجہ کو موضوع بنایا ہے: انسان کبھی کسی ایک چیز میں ایسا کھو جاتا ہے کہ دوسری اہم حقیقتیں نظروں سے اوجھل ہوجاتی ہیں۔ یہ نکتہ آج کی زندگی میں بہت کام آتا ہے۔ ایک شخص اپنے بچوں کے لیے ساری عمر کماتا ہے، مگر بچوں سے محبت بھری گفتگو کا وقت نہیں نکالتا۔ کوئی دین کی بات کرتا ہے مگر گھر میں اہلِ خانہ کے ساتھ نرمی کھو دیتا ہے۔ کسی کی نظر صرف لوگوں کی تعریف پر ہے، کسی کی صرف تنقید پر۔ ہر مثال میں مسئلہ محنت یا محبت کا نہیں؛ ایک چیز کو پوری نگاہ دے کر باقی حقوق سے غافل ہونے کا ہے۔ لہٰذا سوال یہ نہیں کہ زندگی چھوڑ دی جائے، بلکہ یہ ہے کہ زندگی کو کس اصل کے تحت ترتیب دیا جائے۔",
        "علمی نسبت: کاشانی کے اصل فارسی خطاب کا مفہوم؛ ان کے مخصوص جملے یا خطیبانہ انداز کی نقل نہیں۔"
      ],
      [
        "آج پہلی مجلس کا اختتام کسی مشکل وعدے پر نہ کریں۔ سامع سے کہیں: آج رات سونے سے پہلے صرف پانچ منٹ خود سے تین سوال کیجیے۔ میں نے آج کس نعمت کا شکر ادا کیا؟ میں نے کس انسان کا حق نظرانداز کیا؟ میرے دن کا سب سے قیمتی لمحہ کس کام میں صرف ہوا؟ ہر سوال کا جواب سچائی سے دیجیے، پھر ایک چھوٹا سا عمل طے کر لیجیے۔ یہی بیداری کا آغاز ہے۔ ہم دعا کرتے ہیں کہ خدا ہمیں وہ آنکھ دے جو صرف دنیا کی صورت نہ دیکھے بلکہ حقیقت بھی پہچانے؛ وہ دل دے جس میں محبتِ اہلِ بیتؑ کردار بن کر اترے؛ اور وہ توفیق دے کہ غفلت کا پردہ آخری لمحے سے پہلے اٹھ جائے۔ کل ہم اسی سوال سے آگے بڑھیں گے: جب انسان غفلت کو پہچان لیتا ہے تو پھر اسے اپنی عادتوں میں کیوں پالتا رہتا ہے؟",
        "عملی قدم: تین سوال لکھیے، ایک حق ادا کیجیے؛ آئندہ مجلس میں غفلت کی عادت بننے کا مسئلہ کھولیں۔"
      ]
    ],
    "english": [
      [
        "A question for the heart",
        "Could a person be busy, informed, devout in appearance and yet inattentive to the direction of life? We track appointments, purchases and messages. But when did we last examine the rights we neglected or the purpose that shaped our decisions? This is a question about ourselves, not an accusation against others.",
        "Invite a short examination of yesterday's choices."
      ],
      [
        "The Qur'anic mirror",
        "Qur'an 7:179 describes faculties of understanding, sight and hearing that are not used to recognise truth. Qur'an 21:1 adds the approach of accountability while people remain heedless. The point concerns our use of capacities, not physical disability. We cannot choose the hour of reckoning, but we can change our actions today.",
        "Show the actual Qur'anic wording and its separately sourced translation."
      ],
      [
        "Imam Ali's warning",
        "The cited saying in Ghurar al-Hikam warns that open eyes do little for a heedless heart. Moral sight matters more than busyness. Knowledge, prayer and love of the Ahl al-Bayt should affect honesty, family duties and courage to stand with truth.",
        "Keep the quotation distinct from Qalam's commentary."
      ],
      [
        "Attention can itself mislead",
        "Hamed Kashani's opening session of Danger of Heedlessness explores how fixation on one concern conceals other obligations. A parent may work relentlessly for children but fail to speak with them. The fault is not work; it is the unexamined loss of proportion.",
        "This is a paraphrased scholarly insight, not a copied sermon."
      ],
      [
        "Begin with one change",
        "Ask three questions tonight: What gift did I appreciate? Whose right did I overlook? Where did my best time go? Resolve one repair and return to the questions tomorrow. Wakefulness starts with accountable action.",
        "Return to the next session's question about habits."
      ]
    ],
    "question": "کیا میری روزانہ کی مصروفیت مجھے میری حقیقی منزل کے قریب لے جارہی ہے؟",
    "example": "ایک مصروف گھر میں والدین روز بچوں کے لیے محنت کرتے ہیں مگر بچوں سے بات کرنے کا وقت باقی نہیں رہتا۔",
    "action": "آج رات پانچ منٹ کا محاسبہ اور ایک نظرانداز حق کی ادائیگی۔"
  },
  {
    "titleUr": "وقت کی مہلت اور غفلت کا فریب",
    "titleEn": "The illusion of endless time",
    "purposeUr": "مہلت، مسلسل غفلت، دنیا کی دوڑ اور آخرت کی تیاری کے باہمی ربط کو کھولنا۔",
    "quran": [
      [
        59,
        19
      ],
      [
        102,
        1
      ]
    ],
    "hadith": "ghaflah-ghurar-4",
    "sources": [
      {
        "labelUr": "غرر الحکم — اندراج ۴",
        "labelEn": "Ghurar al-Hikam — entry 4",
        "url": "https://al-islam.org/ghurar-al-hikam-wa-durar-al-kalim-exalted-aphorisms-and-pearls-speech/negligence"
      },
      {
        "labelUr": "حامد کاشانی — خطر غفلت، مجلس پنجم",
        "labelEn": "Hamed Kashani — Danger of Heedlessness, session 5",
        "url": "https://www.hkashani.com/?p=23605"
      }
    ],
    "heads": [
      "ہمیں ہمیشہ کل کیوں یاد آتا ہے؟",
      "خود کو بھول جانے کا خطرہ",
      "مہلت ہمیشہ کا وعدہ نہیں",
      "زیادہ سے زیادہ کا سراب",
      "اپنے وقت کو واپس پانا"
    ],
    "paras": [
      [
        "گزشتہ مجلس میں ہم نے پوچھا تھا کہ جاگتی آنکھوں کے پیچھے سویا ہوا دل کیسے ہوتا ہے۔ آج سوال مزید مشکل ہے: اگر ہم جانتے ہیں کہ وقت محدود ہے تو پھر ہر ضروری نیکی کو کل پر کیوں ٹالتے ہیں؟ ہم کہتے ہیں کل والدہ کو فون کروں گا، کل نماز کی اصلاح کروں گا، کل وہ قرض واپس کردوں گا، کل کسی سے معافی مانگ لوں گا۔ لیکن کل ایک تاریخ نہیں، اکثر ہماری خواہش کا دوسرا نام ہوتا ہے۔ زندگی کے کام ضرور کیجیے مگر یہ سمجھنا خطرناک ہے کہ فرصت ہمیشہ ہماری تابع رہے گی۔ قرآن ہمیں بے عمل بنانا نہیں چاہتا؛ وہ ہمیں یہ شعور دینا چاہتا ہے کہ ہماری سب سے قیمتی دولت وہ وقت ہے جو ابھی ہمارے پاس ہے اور جسے ہم دوبارہ خرید نہیں سکتے۔",
        "سامع کے سامنے مؤخر کی ہوئی نیکیوں کی فہرست نہ تھوپیں؛ ایک مثال سے بات دل میں اتاریے۔"
      ],
      [
        "سورۂ حشر کی آیت ۱۹ کہتی ہے کہ ان لوگوں جیسے نہ ہوجاؤ جنہوں نے اللہ کو بھلا دیا تو خدا نے انہیں خود اپنے آپ سے غافل کردیا۔ یہ بڑی گہری بات ہے۔ انسان دنیا بھر میں اپنی پہچان بناتا ہے، مگر اصل پہچان کا سوال چھوڑ دیتا ہے: میں کس کا بندہ ہوں، میرے فیصلوں کا اخلاقی معیار کیا ہے، اور میری زندگی سے دوسروں کو کیا فائدہ پہنچ رہا ہے؟ خود فراموشی کا مطلب اپنا نام بھول جانا نہیں، اپنی منزل بھول جانا ہے۔ پھر سورۂ تکاثر کی پہلی آیت تنبیہ کرتی ہے کہ زیادہ سے زیادہ جمع کرنے کی دوڑ انسان کو غافل کرسکتی ہے۔ تجارت، ترقی اور تعلیم اپنی جگہ نعمتیں ہیں؛ مگر جو چیز مقصد ہونا چاہیے وہ ذریعہ بن جائے اور جو ذریعہ ہونا چاہیے وہ مقصد، تو ترتیب بگڑ جاتی ہے۔",
        "سورۂ حشر ۵۹:۱۹ اور تکاثر ۱۰۲:۱ کی قرآنی عبارت، ترجمہ اور حوالہ الگ درج کیے جائیں۔"
      ],
      [
        "غرر الحکم میں امیرالمؤمنینؑ سے منقول نصیحت ہے کہ غفلت اور مہلت کے دھوکے سے بچو؛ غفلت اعمال کو خراب کرتی ہے اور اجل امیدوں کو کاٹ دیتی ہے۔ اس قول کی سختی میں بھی خیرخواہی ہے۔ یہ انسان کو موت کے تصور سے مایوس نہیں کرتا، بلکہ زندگی کی قدر سکھاتا ہے۔ آپ کے پاس آج ایک سچ بولنے کا موقع ہے تو بولیے۔ کسی سے رابطہ توڑ رکھا ہے تو مناسب طریقے سے صلح کا قدم اٹھائیے۔ کسی کا مالی حق آپ پر ہے تو ادائیگی کی منصوبہ بندی کیجیے۔ ہمیں یہ یقین نہیں کہ دنیا کی ہر مشکل ایک روز میں حل ہوجائے گی، مگر ایک دن کی نیکی اور ایک دن کی توبہ ہمارے اختیار میں ضرور ہے۔",
        "یہاں خوف کے ساتھ رجاء بھی ہو؛ موت کی یاد کو زندگی کی ذمہ داری سے الگ نہ کیجیے۔"
      ],
      [
        "حامد کاشانی نے «خطر غفلت» کے پانچویں خطاب میں اس خطرے کو واضح کیا کہ انسان کسی ایک خواہش یا مصروفیت میں ایسا ڈوب سکتا ہے کہ باقی ذمہ داریوں سے اس کی توجہ ہٹ جاتی ہے۔ یہ ہمارے عہد میں بہت نمایاں ہے۔ موبائل کی ہر اطلاع فوری لگتی ہے، مگر بزرگ والدین کے ساتھ بیٹھنا مؤخر ہوجاتا ہے۔ دفتر کے اعداد اہم ہیں، مگر سچائی یا عدل کے سوال پر ہم خود کو فرصت نہیں دیتے۔ کبھی دین کے نام پر اتنے مناظرے کرلیتے ہیں کہ اپنے اخلاق کو سنوارنے کا وقت ہی نہیں بچتا۔ غفلت کی یہی عجیب صورت ہے کہ ایک بظاہر اچھا کام بھی بے اعتدالی کے باعث دوسرے حق کو ڈھانپ سکتا ہے۔ علاج دنیا سے بھاگنا نہیں بلکہ حقوق کی صحیح ترتیب قائم کرنا ہے۔",
        "مثالیں ہماری تدوین ہیں، کاشانی کے خطاب سے لفظی نقل نہیں۔"
      ],
      [
        "مجلس کے اختتام میں سامع سے کہیے: اس ہفتے ایک کام ایسا منتخب کیجیے جو بہت اہم ہے مگر ہمیشہ مؤخر رہتا ہے۔ اسے آج کے دن، ایک واضح وقت اور ایک چھوٹے عمل سے شروع کیجیے۔ کسی نیکی کے لیے پوری زندگی بدلنے کی شرط نہ رکھیے۔ وقت ملنا خدا کی نعمت ہے، اسے کل کے وعدوں کی نذر نہ کیجیے۔ گھر واپس جا کر ایک انسان کا حق ادا کیجیے، ایک غلط عادت کی طرف پہلا قدم روکیے، اور ایک ضروری عبادت کو پوری توجہ دیجیے۔ ہماری دعا ہے کہ پروردگار ہمیں ایسی مہلت عطا کرے جو غفلت نہ بڑھائے بلکہ توبہ اور خدمت کا ذریعہ بنے۔ اگلی مجلس میں ہم دیکھیں گے کہ نماز، دعا اور مجلس میں شریک ہونے کے باوجود دل کی توجہ کیوں بکھر جاتی ہے۔",
        "عملی قدم: مؤخر کی ہوئی ایک ذمہ داری کو تاریخ اور وقت کے ساتھ شروع کرنا۔"
      ]
    ],
    "english": [
      [
        "Why do we always say tomorrow?",
        "We postpone an apology, a debt, attentive prayer and the care of parents. Tomorrow becomes a comfortable substitute for action. Scripture does not ask us to abandon ordinary work but to recognise that today's time is not endlessly recoverable.",
        "Begin with one overdue duty, not an abstract threat."
      ],
      [
        "Forgetting the self",
        "Qur'an 59:19 links forgetting God to losing sight of the self. The point is moral direction rather than forgetting a name. Qur'an 102:1 warns about rivalry in accumulation. Work and education are blessings; the problem is confusing instruments with ultimate ends.",
        "Display both verses and their translation separately."
      ],
      [
        "Respite is not permanence",
        "Ghurar al-Hikam warns that negligence spoils deeds and death interrupts plans. Remembering life's limit should make us more responsible today, not merely afraid.",
        "Pair the warning with hope and repentance."
      ],
      [
        "When one concern eclipses another",
        "Kashani's fifth transcript examines being so absorbed in one pursuit that obligations elsewhere are neglected. Phones, money, disputes and even excessive polemics may consume the attention needed for someone's right.",
        "These examples are new editorial applications of a sourced theme."
      ],
      [
        "A calendar for repentance",
        "Choose one postponed duty and give it a clear time this week. Begin small. Send a message, settle a part of an owed payment or repair one neglected relationship.",
        "Make the resolution observable and realistic."
      ]
    ],
    "question": "وہ کون سا حق ہے جسے میں روز «کل» کے وعدے پر چھوڑ دیتا ہوں؟",
    "example": "کسی نے اپنے والد سے مہینوں بات نہیں کی، مگر اس کے فون پر غیر ضروری گفتگو کے کئی گھنٹے روز نکل آتے ہیں۔",
    "action": "مؤخر ذمہ داری کا ایک قابلِ عمل قدم آج طے اور شروع کریں۔"
  },
  {
    "titleUr": "عبادت میں حضورِ قلب اور غفلت",
    "titleEn": "Worship that awakens the heart",
    "purposeUr": "نماز اور مجلس کے ظاہری عمل کو قلبی توجہ اور اخلاقی تبدیلی سے جوڑنا۔",
    "quran": [
      [
        57,
        16
      ],
      [
        24,
        37
      ]
    ],
    "hadith": "ghaflah-ghurar-13",
    "sources": [
      {
        "labelUr": "غرر الحکم — اندراج ۱۳",
        "labelEn": "Ghurar al-Hikam — entry 13",
        "url": "https://al-islam.org/ghurar-al-hikam-wa-durar-al-kalim-exalted-aphorisms-and-pearls-speech/negligence"
      },
      {
        "labelUr": "آیت اللہ العظمیٰ حسین مظاہری — رذیلت سوم: غفلت",
        "labelEn": "Grand Ayatollah Mazaheri — The Third Vice: Heedlessness",
        "url": "https://www.neshasteasatid.com/node/7110"
      }
    ],
    "heads": [
      "نماز ہے، مگر میں کہاں ہوں؟",
      "اہلِ ایمان سے قرآن کا سوال",
      "غفلت کا مقابلہ بیداری سے",
      "مجلس کے بعد انسان کیوں نہیں بدلتا؟",
      "ایک نماز، ایک قدم"
    ],
    "paras": [
      [
        "انسان ظاہری طور پر ایک جگہ ہو اور دل و فکر کسی دوسری دنیا میں۔ آپ نے کبھی نماز مکمل کرنے کے بعد محسوس کیا کہ آج میں نے کیا پڑھا تھا؟ یہ تجربہ ہمیں مایوس کرنے کے لیے نہیں، سنبھلنے کے لیے کافی ہے۔ نماز کی شرعی صحت ایک الگ فقہی مسئلہ ہے اور حضورِ قلب ایک الگ روحانی ذمہ داری۔ کسی انسان کے باطن کا فیصلہ کرنا ہمارے اختیار میں نہیں۔ مگر اپنی نماز کے بارے میں سوال تو اٹھا سکتے ہیں۔ میں جس رب کے سامنے کھڑا ہوں، کیا میرے دل میں اس کی عظمت کا کچھ احساس پیدا ہوتا ہے؟ کیا میری عبادت مجھے نرم دل، سچا اور لوگوں کے حقوق کے معاملے میں محتاط بنا رہی ہے؟ یہی وہ سوال ہے جس سے عبادت محض روزانہ کی عادت سے زندہ تعلق بن سکتی ہے۔",
        "فقہی صحت پر غیر ضروری فیصلہ نہ دیں؛ مقصد حضورِ قلب اور اخلاقی اصلاح ہے۔"
      ],
      [
        "سورۂ حدید کی آیت ۱۶ کا خطاب بڑی محبت اور سنجیدگی سے اہلِ ایمان کی طرف ہے: کیا ابھی وہ وقت نہیں آیا کہ ان کے دل ذکرِ خدا کے سامنے خشوع اختیار کریں؟ اس آیت میں امید بھی ہے اور تنبیہ بھی۔ امید یہ کہ بیداری کا دروازہ بند نہیں ہوا۔ تنبیہ یہ کہ دینداری کا دعویٰ ہمیں خود احتسابی سے بے نیاز نہیں کرتا۔ دوسری طرف سورۂ نور کی آیت ۳۷ ان لوگوں کا مثبت نمونہ دیتی ہے جنہیں تجارت اور خریدوفروخت خدا کے ذکر سے غافل نہیں کرتی۔ گویا مومن کاروبار بھی کرسکتا ہے، گھر بھی سنبھال سکتا ہے، دنیا میں کردار بھی ادا کرسکتا ہے، مگر اس کے اندر ایک ایسا مرکز ہے جو اسے بار بار اصل مقصد کی طرف لوٹاتا ہے۔",
        "قرآن کے دونوں مقامات میں نفیِ دنیا نہیں؛ دنیا کو ذکر اور واجب حقوق کے تابع رکھنے کا سبق ہے۔"
      ],
      [
        "غرر الحکم میں امیرالمؤمنینؑ کی مختصر مگر جامع نصیحت ہے: «ضادُّوا الغَفْلَةَ بِاليَقْظَةِ»؛ غفلت کا مقابلہ بیداری سے کرو۔ بیداری کوئی ایک لمحے کا جوش نہیں جس کے بعد سب کچھ خود بخود ٹھیک ہوجائے۔ یہ ایک تربیت ہے۔ نماز سے پہلے چند لمحے رکنا، لفظوں کا مطلب جاننا، غیر ضروری کام کو تھوڑی دیر کے لیے ایک طرف رکھنا، کسی پر غصہ آئے تو فوری جواب دینے کے بجائے نیت کو پرکھنا، کسی سے ناانصافی ہو تو اسے درست کرنا؛ یہی چھوٹے عمل مل کر قلبی بیداری کا ماحول بناتے ہیں۔ دل کی پرورش مستقل توجہ چاہتی ہے، اسی لیے قرآن ہمیں بار بار یاد دہانی کراتا ہے۔",
        "یہ قول اصل عربی اور حوالہ کے ساتھ دکھایا جاتا ہے؛ اگلے چھوٹے اعمال اس کی تدوینی تطبیق ہیں۔"
      ],
      [
        "آیت اللہ العظمیٰ حسین مظاہری نے «رذیلت سوم: غفلت» میں نماز کی اہمیت، قرآن سے انس اور ذکر کی پابندی کو غفلت کے علاج میں شمار کیا ہے۔ ملا نراقیؒ کے اخلاقی بیان میں بھی بیداری کا بنیادی تقاضا یہ ہے کہ آدمی اپنی توجہ کو مقصدِ زندگی کے تابع کرے۔ یہ سوال ہمارے تمام دینی اجتماعات پر لاگو ہوتا ہے: کیا ہم مجلس سے صرف ایک کیفیت لے کر نکلتے ہیں یا کوئی نیا فیصلہ بھی؟ اگر گھر میں وہی تلخ لہجہ، کاروبار میں وہی بے احتیاطی اور دوسروں کے لیے وہی بے حسی باقی ہے تو ہمیں اپنی عبادت کی روح کی حفاظت پر مزید کام کرنا ہوگا۔ یہاں دوسروں پر طعن نہیں، اپنے اندر کے خلا کو پہچاننا مقصود ہے۔",
        "آیت اللہ مظاہری کے شائع شدہ فارسی درس اور نراقی کی اخلاقی بحث سے ماخذی نکتے الگ اور واضح رکھیں؛ روزمرہ مثالیں ہماری تدوین ہیں۔"
      ],
      [
        "آج سامع سے یہ وعدہ لیجیے کہ وہ اپنی روزانہ کی نمازوں میں سے ایک نماز کے لیے کچھ اضافی توجہ مخصوص کرے گا۔ نماز سے قبل موبائل الگ رکھے، جس آیت یا ذکر کو پڑھتا ہے اس کے معنی یاد کرے، اور نماز کے بعد خود سے پوچھے کہ میرے مزاج میں آج کیا بہتری آئی؟ کوئی صرف ایک نماز سے کامل نہیں ہوجاتا، مگر ایک نماز سے سفر شروع ہوسکتا ہے۔ اور اگر کسی مجلس میں دل نرم ہوا تو اس نرمی کو کسی انسان کے لیے فائدہ بنا دیجیے۔ کل ہم یہ سوال کھولیں گے کہ غفلت کا ایک خطرناک رخ ہمارے گھر، والدین، اولاد اور معاشرے کے حقوق میں کیوں نظر آتا ہے۔",
        "عملی قدم: ایک نماز معنی پر توجہ کے ساتھ؛ ایک نرم گفتگو یا ادا کیا ہوا حق۔"
      ]
    ],
    "english": [
      [
        "Where is my mind during prayer?",
        "A person may complete the bodily actions of prayer while attention wanders. Legal validity and spiritual attentiveness are different issues; neither authorises us to judge another person's heart. The right question is what prayer is doing to our own honesty and behaviour.",
        "Do not issue legal judgements about worship."
      ],
      [
        "A call addressed to believers",
        "Qur'an 57:16 asks believers to soften their hearts to remembrance; it opens a door to renewal. Qur'an 24:37 describes commerce without forgetfulness of God. Neither verse condemns lawful work.",
        "Keep the warning and hopeful model together."
      ],
      [
        "Counter with wakefulness",
        "Imam Ali's maxim says to oppose heedlessness through wakefulness. Preparation before one prayer, comprehension of words and restraint before angry speech are small practices of attention.",
        "Separate the original maxim from suggested exercises."
      ],
      [
        "When the majlis ends",
        "Grand Ayatollah Mazaheri's published ethics lesson recommends Qur'an, attentive prayer, and remembrance as means to counter heedlessness. Naraqi's classical ethical treatment likewise stresses conscious attention to the aims of life. Devotional emotion should be cultivated into changed conduct.",
        "The original Mazaheri lecture and an English summary of Naraqi's ethics are distinct source types; illustrations are editorial."
      ],
      [
        "Start with one prayer",
        "Choose one prayer to perform without avoidable distraction; reflect upon a phrase, and carry its moral lesson into one conversation. Small repetition creates habits.",
        "Offer an attainable practice rather than unrealistic perfection."
      ]
    ],
    "question": "میری نماز اور مجلس میرے اخلاق میں کون سا حقیقی فرق پیدا کررہی ہے؟",
    "example": "نماز کے بعد گھر لوٹنے والا انسان اگر اپنے بچے سے نرمی سے بات کرے تو عبادت کا اثر ایک حقیقی عمل میں نظر آتا ہے۔",
    "action": "ایک نماز توجہ سے، پھر گھر میں ایک محسوس اخلاقی بہتری۔"
  },
  {
    "titleUr": "اپنوں کے حقوق سے غفلت",
    "titleEn": "When rights disappear from view",
    "purposeUr": "غفلت کا اجتماعی رخ: والدین، خاندان، سچائی، جلدبازی اور دوسروں کے حقوق کی حفاظت۔",
    "quran": [
      [
        63,
        9
      ],
      [
        17,
        23
      ]
    ],
    "hadith": "ghaflah-ghurar-20",
    "sources": [
      {
        "labelUr": "غرر الحکم — اندراج ۲۰",
        "labelEn": "Ghurar al-Hikam — entry 20",
        "url": "https://al-islam.org/ghurar-al-hikam-wa-durar-al-kalim-exalted-aphorisms-and-pearls-speech/negligence"
      },
      {
        "labelUr": "حامد کاشانی — خطر غفلت، مجلس پنجم",
        "labelEn": "Hamed Kashani — Danger of Heedlessness, session 5",
        "url": "https://www.hkashani.com/?p=23605"
      },
      {
        "labelUr": "نہج البلاغہ — نامہ ۶۹، حارث ہمدانی کے نام",
        "labelEn": "Nahj al-Balagha, letter 69 to al-Harith al-Hamdani",
        "url": "https://al-islam.org/es/node/20897"
      }
    ],
    "heads": [
      "حق سامنے ہے مگر نظر کیوں نہیں آتا؟",
      "گھر اور مال کی آزمائش",
      "عمر ضائع ہونے کا مطلب",
      "دینی مصروفیت اور انسانی ذمہ داری",
      "حق واپس کرنے کا راستہ"
    ],
    "paras": [
      [
        "غفلت کا ذکر آتے ہی بعض لوگ سمجھتے ہیں کہ یہ صرف ذکر کم کرنے یا نماز میں خیال بھٹکنے کا نام ہے۔ لیکن ایک بہت تکلیف دہ غفلت وہ ہے جس میں ہمیں اپنے ساتھ رہنے والے انسانوں کا دکھ دکھائی نہیں دیتا۔ ہم دور کے واقعات پر گفتگو کرتے ہیں مگر پاس بیٹھے والدین کی خاموشی نہیں سنتے۔ ہم معاشرے کی اصلاح چاہتے ہیں مگر گھر کے ایک فرد کی جائز شکایت کو اہمیت نہیں دیتے۔ ہم کسی ناانصافی پر ناراض ہوتے ہیں مگر اپنے ماتحت یا ملازم کے حق میں احتیاط نہیں کرتے۔ یہ مثالیں دوسروں کی کمزوریاں گنوانے کے لیے نہیں؛ اس خطرے کو دیکھنے کے لیے ہیں کہ دینداری اگر حسنِ سلوک سے کٹ جائے تو ہم اپنی ہی زندگی کی ایک اہم عبادت سے بے خبر ہوسکتے ہیں۔",
        "اس مجلس میں الزام تراشی اور مسلکی تناؤ سے بچیں؛ مخاطب کے اپنے حقوق و فرائض کو بیدار کریں۔"
      ],
      [
        "سورۂ منافقون کی آیت ۹ مومنین کو متنبہ کرتی ہے کہ مال اور اولاد اللہ کی یاد سے غافل نہ کردیں۔ یہاں مال اور اولاد سے بے رغبتی مطلوب نہیں۔ قرآن انہیں ہماری ذمہ داریوں کے دائرے میں رکھتا ہے۔ اسی لیے سورۂ اسراء کی آیت ۲۳ والدین کے ساتھ احسان کا حکم دیتی ہے۔ ذرا اس ترتیب پر غور کریں: خدا کی بندگی اور انسانوں کے حقوق ایک دوسرے کے مخالف نہیں۔ اگر کوئی عبادت گزار اپنے گھر میں بدزبانی کرے تو اس کا حل عبادت چھوڑنا نہیں، عبادت سے ملنے والی اخلاقی روشنی کو گھر تک پہنچانا ہے۔ حقوق کے معاملے میں بھی احتیاط رکھیے: ہر اختلاف کو ظلم نہ کہیے، مگر جہاں حقیقی حق دب رہا ہو وہاں خاموش لاپروائی بھی درست نہیں۔",
        "ان آیات سے عملی اخلاق کا ربط واضح کریں؛ پیچیدہ خاندانی نزاعات کا فیصلہ مجلس میں نہ سنائیں۔"
      ],
      [
        "غرر الحکم میں امیرالمؤمنینؑ سے منقول قول یہ ہے کہ انسان کی غفلت کے لیے یہی کافی ہے کہ وہ اپنی عمر اس چیز میں ضائع کرے جو اسے نجات نہ دے۔ اسے صرف تفریح کی مذمت سمجھ لینا مناسب نہیں۔ آرام، کھیل، اہلِ خانہ کے ساتھ خوشی اور جائز مصروفیت بھی انسانی زندگی کا حصہ ہیں۔ اصل سوال یہ ہے کہ ہمارے اعمال کا اخلاقی رخ کیا ہے۔ کیا ہماری محنت کسی کا حق دباتی ہے یا اسے محفوظ کرتی ہے؟ کیا ہماری زبان لوگوں کے دل توڑتی ہے یا جوڑتی ہے؟ کیا ہماری معلومات ہمیں زیادہ عاجز بناتی ہیں یا دوسروں پر چڑھ دوڑنے والا انسان؟ اس طرح یہ قول سامع سے اس کی پوری زندگی کا جائزہ لینے کا مطالبہ کرتا ہے۔",
        "غیر ضروری سختی سے بچتے ہوئے وقت کے صحیح استعمال اور حقوق کا تعلق کھولیں۔"
      ],
      [
        "حامد کاشانی کے مکتوب سلسلے میں، بالخصوص پانچویں خطاب میں، ایک کام میں اس قدر غرق ہوجانے کا ذکر ہے کہ دوسرے ضروری حق پس منظر میں چلے جاتے ہیں۔ اس نکتے کو گھر کے ماحول میں لے آئیں۔ فرض کیجیے کسی شخص نے بچوں کے بہتر مستقبل کے لیے بہت محنت کی؛ یہ اچھی بات ہے۔ مگر اس نے بچوں کو اتنا کم وقت دیا کہ وہ اپنے والد سے بات کرنے میں جھجکنے لگے۔ اب اس کا حل کمائی کی مذمت نہیں؛ محبت، گفتگو، امانت اور تربیت کی نئی ترتیب ہے۔ اسی طرح بزرگ والدین سے ملاقات، کسی بیمار کی تیمارداری، کسی بے بس کی داد رسی اور کسی کا مالی حق واپس کرنا دل کو خدا سے قریب کرنے والے اعمال بن سکتے ہیں۔",
        "ماخذ سے ثابت خیال اور ہماری مثال کے درمیان فرق واضح رکھا جائے۔"
      ],
      [
        "آج سامع سے بڑے بڑے نعرے نہ لگوائیے۔ کہیے کہ اپنے گھر میں ایک ایسے حق کی نشاندہی کیجیے جو مسلسل نظرانداز ہورہا ہے۔ اگر کسی سے سخت لہجے میں بات کی تھی تو مناسب طریقے سے معافی مانگیے۔ والدین زندہ ہیں تو ان کی ضرورت دریافت کیجیے؛ دنیا سے جاچکے ہیں تو دعا اور نیکی کے ذریعے ان کی یاد قائم کیجیے۔ کوئی امانت یا قرض باقی ہے تو ذمہ دارانہ ادائیگی کی طرف قدم بڑھائیے۔ اگر تعلق میں نقصان یا خطرہ ہو تو زبردستی صلح کے بجائے محفوظ اور عادلانہ راستہ اختیار کیجیے۔ انسان کا دل اسی وقت بیدار ہوتا ہے جب اسے نہ صرف اپنا رب بلکہ بندوں کے حقوق بھی یاد رہیں۔ اگلی اور آخری مجلس میں ہم اس بیداری کو کربلا کی وفاداری سے جوڑیں گے۔",
        "عملی قدم: ایک نظرانداز حق کی فوری، محفوظ اور قابلِ پیمائش اصلاح۔"
      ]
    ],
    "english": [
      [
        "The closest people we fail to see",
        "Heedlessness also means missing the rights and pain of people living beside us. We may discuss distant controversies yet neglect the elderly parent, the child needing attention or a worker's rightful wage. The aim is self-examination, not blaming others.",
        "Begin with one right rather than broad accusations."
      ],
      [
        "Family, wealth and worship",
        "Qur'an 63:9 warns against possessions and children diverting us from remembrance; Qur'an 17:23 commands kindness to parents. There is no conflict between devotion and responsible care.",
        "Avoid turning a sermon into a verdict on complex family cases."
      ],
      [
        "What makes a life wasted?",
        "A saying in Ghurar al-Hikam warns against spending a lifetime on what cannot save us. This does not abolish rest, joy or lawful activity. It calls us to evaluate the moral direction of our choices.",
        "Differentiate legitimate recreation from neglect."
      ],
      [
        "Rights hidden by a single pursuit",
        "Kashani's fifth talk explores attention concentrated upon one activity while other duties fade. A parent may work for a child's future while leaving no time for the child's emotional needs. The issue is restoring moral proportion.",
        "Editorial illustration, not an anecdote from the original speech."
      ],
      [
        "Repair one right",
        "Choose one neglected duty: an apology, a conversation, fair repayment, a parent's need or an unreturned trust. Where a relationship is unsafe, act through appropriate protected means rather than coercive reconciliation.",
        "Ask for an actual responsible step."
      ]
    ],
    "question": "میرے قریبی لوگوں میں کون ہے جس کا جائز حق میری غفلت سے متاثر ہورہا ہے؟",
    "example": "گھر میں بزرگ والدہ بار بار بات کرنے کو کہتی ہیں، مگر پورا خاندان معمولی فون پیغامات میں مشغول ہے۔",
    "action": "ایک حق کی اصلاح، ایک نرم گفتگو، یا ایک امانت کی ذمہ دارانہ واپسی۔"
  },
  {
    "titleUr": "بیداری، توبہ اور کربلا کا پیغام",
    "titleEn": "Awakening, repentance and fidelity at Karbala",
    "purposeUr": "غفلت کی تشخیص سے عملی بیداری تک اور کربلا کی یاد کو حق شناسی اور وفاداری سے جوڑنا۔",
    "quran": [
      [
        50,
        22
      ],
      [
        7,
        201
      ]
    ],
    "hadith": "ghaflah-ghurar-17",
    "sources": [
      {
        "labelUr": "غرر الحکم — اندراج ۱۷",
        "labelEn": "Ghurar al-Hikam — entry 17",
        "url": "https://al-islam.org/ghurar-al-hikam-wa-durar-al-kalim-exalted-aphorisms-and-pearls-speech/negligence"
      },
      {
        "labelUr": "حامد کاشانی — خطر غفلت، مجلس دہم",
        "labelEn": "Hamed Kashani — Danger of Heedlessness, session 10",
        "url": "https://www.hkashani.com/?p=23978"
      },
      {
        "labelUr": "آیت اللہ میرباقری — ذکر و غفلت پر حوزوی رپورٹ، اصل خطاب کی جانچ باقی",
        "labelEn": "Ayatollah Mirbaqeri — seminary report on remembrance, full speech not reviewed",
        "url": "https://www.neshasteasatid.com/node/3540"
      }
    ],
    "heads": [
      "پورے سلسلے کا آخری سوال",
      "پردہ کب اٹھے گا؟",
      "جاگ اٹھو، ابھی وقت ہے",
      "بصیرت اور وفاداری کا امتحان",
      "عمل، دعا اور مصائب سے ربط"
    ],
    "paras": [
      [
        "ہم نے پانچ مجلسوں کا سفر اس سوال سے شروع کیا تھا کہ جاگتی آنکھوں کے باوجود دل کیوں سو جاتا ہے۔ پھر دیکھا کہ مہلت کا دھوکا انسان کو اہم فیصلے مؤخر کرنے پر آمادہ کرتا ہے، عبادت میں بے توجہی کیسے پیدا ہوتی ہے، اور اپنے قریبی انسانوں کے حقوق کس آسانی سے نظرانداز ہوجاتے ہیں۔ اب آخری مجلس کا سوال صرف یہ نہیں کہ غفلت کیا ہے؛ بلکہ یہ ہے کہ میں کب جاگوں گا؟ اس سوال کو سامع کے سامنے ایک الزام کی صورت میں نہیں بلکہ محبت بھری دعوت کے طور پر رکھیے۔ دینی مجلس کا اصل حسن تب ہے جب انسان صرف متاثر نہیں ہوتا بلکہ اپنی نیت، اپنی زبان اور اپنے فیصلوں کو بھی بدلنے کا ارادہ کرتا ہے۔ یہی سفر معلومات سے بصیرت اور بصیرت سے وفاداری تک جاتا ہے۔",
        "گزشتہ چار مجالس کی فہرست دہرانے کے بجائے ایک مسلسل سوال کے ساتھ اختتام کی بنیاد رکھیے۔"
      ],
      [
        "سورۂ ق کی آیت ۲۲ میں ایک پردہ ہٹنے اور نگاہ کے تیز ہوجانے کا ذکر ہے۔ اس آیت کو اصل سیاق میں سمجھنا ضروری ہے: یہ آخرت کے انکشاف کا منظر ہے۔ مجلس میں اس سے جو عملی سوال پیدا کیا جاسکتا ہے وہ یہ ہے کہ ہم کیوں اس مرحلے کا انتظار کریں جب ہمارے پاس عمل کی مہلت باقی نہ رہے؟ دوسری طرف سورۂ اعراف ۷:۲۰۱ اہلِ تقویٰ کی ایک خوبصورت صفت بیان کرتی ہے کہ شیطانی وسوسہ چھو جائے تو وہ یاد کرتے ہیں اور پھر انہیں بصیرت حاصل ہوجاتی ہے۔ یعنی مومن سے کبھی غلطی نہ ہونا انسانی تربیت کا واحد موضوع نہیں؛ غلطی کا احساس، یادِ خدا اور اصلاح کی طرف پلٹنا بھی بڑی نعمت ہے۔ یہ آیت ناامیدی نہیں، رجوع اور بیداری کا راستہ کھولتی ہے۔",
        "آیات کو اپنے اصل سیاق کے ساتھ پیش کریں؛ آخرت کی آیت کو دنیا کے بارے میں لفظی پیش گوئی نہ بنائیں۔"
      ],
      [
        "غرر الحکم میں امیرالمؤمنینؑ کی طرف منقول تنبیہ ہے: اے سننے والے! اپنی غفلت سے بیدار ہوجا، جلدبازی کم کر، کمر کس، ہوشیار رہ اور قبر کو یاد کر۔ اس پیغام کی ترتیب پر غور کیجیے۔ پہلے بیداری، پھر ضبط، پھر تیاری، پھر احتیاط اور پھر انجام کی یاد۔ اس کا مطلب یہ نہیں کہ ہم ساری زندگی خوف میں گزاریں؛ اس کا مطلب یہ ہے کہ ہمارے عمل کے پیچھے شعور ہو۔ کوئی گناہ ترک کرنا ہے تو ایک واضح ذریعہ اختیار کیجیے۔ کسی کی امانت واپس کرنی ہے تو ادائیگی کا راستہ بنائیے۔ نماز میں توجہ بڑھانی ہے تو ہر روز ایک چھوٹی مشق جاری رکھیے۔ بیداری کے لیے جذباتی آغاز مفید ہوسکتا ہے، مگر اس کی حفاظت مستقل عمل سے ہوتی ہے۔",
        "عربی قول اور اصل حوالہ محفوظ رکھیں؛ عملی مثالوں کو امامؑ کی لفظی عبارت کے طور پر نقل نہ کریں۔"
      ],
      [
        "حامد کاشانی کی دسویں مکتوب مجلس میں سورۂ اعراف کی یہی آیت، اہلِ تقویٰ کا تذکر اور پھر بصیرت کا مضمون نمایاں ہے۔ اس سے ہمارا نتیجہ یہ بنتا ہے کہ دینی شعور محض ہر بات پر فوری ردعمل نہیں؛ سوچنے، یاد کرنے اور صحیح وقت پر حق کے ساتھ کھڑے ہونے کی قوت بھی ہے۔ کربلا کے ذکر میں اس سبق کی غیر معمولی معنویت ہے: سیدالشہداءؑ کی یاد ہمیں صرف تاریخ سنانے نہیں بلاتی بلکہ یہ بھی پوچھتی ہے کہ حق، امانت، دیانت، وفاداری اور ظلم کے مقابلے میں ہماری اپنی سمت کیا ہے۔ تاہم منبر پر کسی تاریخی کردار کے بارے میں مخصوص جملہ، واقعہ یا منسوب مکالمہ بیان کرنا ہو تو اسے الگ معتبر مقتل سے ثابت کیجیے؛ مؤثر بات کہنے کے لیے غیر ثابت شدہ تفصیل کی ضرورت نہیں۔",
        "کربلا سے اخلاقی ربط قرآن اور مستند تاریخی بنیاد کے ساتھ قائم کریں؛ فرضی مکالمہ یا من گھڑت مصائب ممنوع رکھیں۔"
      ],
      [
        "آج آخری مجلس میں تین فیصلوں کی دعوت دیجیے۔ ایک یہ کہ روزانہ چند منٹ خاموشی سے اپنا محاسبہ کریں۔ دوسرا یہ کہ اپنی عبادت اور تعلقات میں ایک ایسا عمل طے کریں جسے گھر والے بھی محسوس کرسکیں۔ تیسرا یہ کہ جب حق ہمارے مفاد کے خلاف پڑے تو بھی انصاف اور سچائی کا ساتھ دینے کی کوشش کریں۔ اس کے بعد امام حسینؑ کی مصیبتوں کا بیان خطیب اپنے معتبر مقتل کے مطابق کرے، غم کو بے بنیاد قصوں سے آلودہ نہ کرے، اور دعا کے ساتھ مجلس مکمل کرے: خدایا ہمیں غافل دل نہ دے، یاد کرنے والا قلب عطا فرما، حق کو پہچاننے اور اس کے ساتھ وفا کرنے کی توفیق دے۔ اس طرح پانچ مجالس کا ثمر صرف چند خوبصورت جملے نہیں، زندگی کے فیصلوں میں ایک نئی روشنی ہوگی۔",
        "مصائب کی تاریخی تفصیلات اس مسودے میں عمداً نہیں گھڑی گئیں؛ اصل مقتل کے ساتھ خطیب خود شامل کرے۔"
      ]
    ],
    "english": [
      [
        "The final question",
        "This series moved from recognising heedlessness to examining wasted time, inattentive worship and neglected rights. Now the question is whether we will act differently. A moving sermon should leave a changed intention and a changed choice.",
        "Summarise the argument without merely relisting the preceding sessions."
      ],
      [
        "The unveiling and the return",
        "Qur'an 50:22 depicts an unveiling in the Hereafter; keep its context intact. Qur'an 7:201 describes the God-conscious responding to temptation through remembrance and renewed sight. Spiritual growth involves recognising and correcting departures.",
        "Preserve the distinction between the final unveiling and present moral reflection."
      ],
      [
        "Wake up while there is time",
        "The cited maxim from Imam Ali invites the listener to awaken, restrain haste, prepare and remember death. It is a call to purposeful action, not paralysis. Attach every recommendation to a feasible next step.",
        "The practical counsel is Qalam editorial application."
      ],
      [
        "Karbala and a faithful conscience",
        "Kashani's tenth lecture connects remembrance with renewed insight. The memory of Imam Husayn calls us to ask what truth, integrity and loyalty mean in our own choices. Specific episodes or dialogue in masaib must come from independently established maqtal sources.",
        "Do not fabricate historic details for emotional impact."
      ],
      [
        "A covenant expressed in actions",
        "Close with three commitments: daily examination, better conduct in worship and relationships, and moral courage when truth carries a cost. Let the preacher use independently checked historical reports for masaib.",
        "A meaningful conclusion is seen in conduct after the gathering."
      ]
    ],
    "question": "میں آج اپنی کس غفلت سے واقعی بیدار ہونے کا فیصلہ کررہا ہوں؟",
    "example": "کوئی شخص مجلس سے واپس جاکر اپنی دیرینہ غلطی کی تلافی کرے، نہ کہ صرف مجلس کی کیفیت پر گفتگو کرتا رہے۔",
    "action": "روزانہ محاسبہ، ایک اخلاقی اصلاح، اور حق کے ساتھ عملی وفاداری۔"
  }
];

const EN_ACTIONS = [
  "A five-minute evening examination and one repaired right.",
  "Schedule and begin one duty that has repeatedly been postponed.",
  "Give one prayer focused attention and practise one act of gentleness.",
  "Return one neglected right or take a safe and practical step to restore it.",
  "Examine the self daily, improve one habit and stay faithful to truth.",
] as const;
const EN_QUESTIONS = [
  "Are my ordinary activities leading toward my real purpose?",
  "What necessary duty do I always postpone until tomorrow?",
  "What real effect does prayer and attending a majlis have on my conduct?",
  "Whose right close to me is affected by my neglect?",
  "Which heedless habit am I ready to change today?",
] as const;
const EN_EXAMPLES = [
  "Parents work for their children, but reserve no time for speaking with them.",
  "Someone postpones calling a parent while spending hours on needless messages.",
  "The gentler words a person chooses after prayer become an act of worship.",
  "An elderly mother repeatedly asks to speak while the family scrolls their phones.",
  "A listener repairs a longstanding wrong after returning from the gathering.",
] as const;

function buildSession(spec: Spec, index: number): MajlisSeriesSession {
  const blocks = spec.heads.map((heading, blockIndex) => ({
    heading: { ur: heading, en: spec.english[blockIndex][0] },
    delivery: {
      ur: [spec.paras[blockIndex][0], ...GHAF_LAH_DEEPER[index].filter(row => row.at===blockIndex).map(row => row.ur)].join("\n\n"),
      en: [spec.english[blockIndex][1], ...GHAF_LAH_DEEPER[index].filter(row => row.at===blockIndex).map(row => row.en)].join("\n\n"),
    },
    explanation: { ur: spec.paras[blockIndex][1], en: spec.english[blockIndex][2] },
  }));
  const preparation: PreparedSessionMaterial = {
    blocks,
    quran: spec.quran.map(([surah, ayah]) => ({surah, ayah})),
    hadithId: spec.hadith,
    masaib: GHAF_LAH_MASAIB[index],
    durationExtra: GHAF_LAH_DURATION_EXTRA[index],
    additionalHadithIds: index===2 ? ["ghaflah-baqir-salat"] : index===3 ? ["ghaflah-ali-taghaful"] : [],
    scholarlyExcerpts: GHAF_LAH_SCHOLARLY_VOICES
      .filter(item => item.sessionNumbers.includes(index+1))
      .map(item => ({
        scholar: {ur:item.scholarUr,en:item.scholarEn},
        original:item.quote,
        originalLanguage:item.language,
        translation:{ur:item.ur,en:item.en},
        sourceUrl:item.url,
        sourceKind:item.kind,
        sourceNote:{ur:item.noteUr,en:item.noteEn},
      })),
    scholarSources: [
      ...GHAF_LAH_SCHOLARLY_VOICES.filter(item=>item.sessionNumbers.includes(index+1)).map(item=>({label:{ur:item.scholarUr+" — "+item.workUr,en:item.scholarEn+" — "+item.workEn},url:item.url})),
      ...spec.sources.map(source => ({
      label: { ur: source.labelUr, en: source.labelEn },
      url: source.url,
      })),
      ...(index===2 || index===3 ? [{
        label: { ur: index===2 ? "میزان الحکمہ — نماز اور غفلت" : "میزان الحکمہ — اخلاقی تغافل", en: "Mizan al-Hikmah — Negligence" },
        url: "https://al-islam.org/mizan-al-hikmah-scale-wisdom/negligence"
      }] : []),
    ],
    question: {ur: spec.question, en: EN_QUESTIONS[index]},
    example: {ur: spec.example, en: EN_EXAMPLES[index]},
    action: {ur: spec.action, en: EN_ACTIONS[index]},
  };
  return {
    number: index + 1,
    titleUr: spec.titleUr,
    titleEn: spec.titleEn,
    purposeUr: spec.purposeUr,
    purposeEn: spec.english[0][1],
    materialUr: blocks.map(block => block.delivery.ur),
    materialEn: blocks.map(block => block.delivery.en),
    sourceUr: spec.sources.map(source=>source.labelUr).join("؛ "),
    sourceEn: spec.sources.map(source=>source.labelEn).join("; "),
    preparation,
    previousBridgeUr: index>0 ? `گزشتہ مجلس کی روشنی میں آج ایک نئے سوال کو کھولتے ہیں: ${spec.titleUr}۔` : undefined,
    previousBridgeEn: index>0 ? `Continuing the previous session, we ask: ${spec.titleEn}.` : undefined,
    nextBridgeUr: index<SPECS.length-1 ? `اگلی مجلس: ${SPECS[index+1].titleUr}۔` : undefined,
    nextBridgeEn: index<SPECS.length-1 ? `Next session: ${SPECS[index+1].titleEn}.` : undefined,
    avoidRepeatUr: "ہر آیت کو اصل سیاق میں پیش کریں، اقوال و تراجم کو تدوینی گفتگو سے الگ رکھیں، اور ماخذ عالم کا مخصوص انداز یا قصہ نقل نہ کریں۔",
    avoidRepeatEn: "Keep the primary sources separate from editorial explanation and do not reproduce a scholar's distinctive speech.",
    takeawayUr: spec.action,
    takeawayEn: EN_ACTIONS[index],
  };
}

export const GHAF_LAH_FRESH_FIVE: MajlisSeriesPlan = {
  length: 5,
  titleUr: "خمسۂ مجالس — غفلت سے بیداری تک",
  titleEn: "Five connected majalis — From heedlessness to wakefulness",
  aimUr: "پانچ الگ مگر مربوط مجالس: دل کی غفلت کی پہچان، مہلت اور وقت، عبادت میں حضورِ قلب، بندوں کے حقوق، اور کربلا کی وفاداری سے جڑی عملی بیداری۔ ہر مجلس میں اصل قرآنی متن، منظور شدہ ترجمہ، ماخذ سے ثابت قول، علمی توضیح اور خطیب کے لیے قابلِ بیان تدوینی متن الگ رکھا گیا ہے۔",
  aimEn: "Five progressive sermons on recognition, time, attentive worship, human rights and fidelity. Original texts, approved Qur'an translation, sourced sayings and editorial delivery are kept distinct.",
  sessions: SPECS.map(buildSession),
  finalUr: "آخری مجلس میں غفلت کے اسباب کو دہرانے کے بجائے ایک عملی عہد پر ختم کریں: روزانہ محاسبہ، عبادت میں توجہ، حقوق کی ادائیگی اور سچائی سے وفاداری۔ مصائب صرف معتبر مقتل کی اصل عبارات کی بنیاد پر شامل کریں۔",
  finalEn: "Close with observable practice: self-examination, attentive prayer, rights fulfilled and fidelity to truth. Historical masaib require separately verified primary sources.",
};
