import { DUA_FIVE_DAY_SERIES } from "./duaFiveDaySeries";
import { SABR_THREE_DAY_SERIES } from "./sabrThreeDaySeries";
import type { SermonDossier } from "./topicDossier";
import type { MajlisSeriesLength, MajlisSeriesPlan, MajlisSeriesSession } from "./seriesPlanner";

function bridgeSessions(sessions: readonly MajlisSeriesSession[]): readonly MajlisSeriesSession[] {
  return sessions.map((session, index) => {
    const previous = sessions[index - 1];
    const next = sessions[index + 1];
    return {
      ...session,
      previousBridgeUr:
        session.previousBridgeUr ??
        (previous
          ? `گزشتہ مجلس میں ہم نے «${previous.titleUr}» تک بات پہنچائی تھی؛ آج اسی سوال کو ایک نئے زاویے سے آگے بڑھائیں۔`
          : undefined),
      previousBridgeEn:
        session.previousBridgeEn ??
        (previous
          ? `The previous session reached “${previous.titleEn}”; today the same inquiry advances from a new angle.`
          : undefined),
      nextBridgeUr:
        session.nextBridgeUr ??
        (next
          ? `اگلی مجلس میں یہی علمی سفر «${next.titleUr}» کے سوال تک پہنچے گا۔`
          : undefined),
      nextBridgeEn:
        session.nextBridgeEn ??
        (next
          ? `The next session carries the inquiry into “${next.titleEn}”.`
          : undefined),
    };
  });
}

const QURAN_HIDAYAT_FRESH_5: MajlisSeriesPlan = {
  length: 5,
  titleUr: "خمسۂ مجالس — قرآن میرے فیصلوں میں کہاں ہے؟",
  titleEn: "Five-session series — Where is the Qur'an in my decisions?",
  aimUr:
    "یہ خمسہ کسی ایک خطیب یا کتاب کی مجالس کو دوبارہ نہیں سناتا۔ علامہ طالب جوہریؒ کے تحقیقی مواد، قرآنی بنیادوں اور خطیب اسٹوڈیو کے موجود علمی ذخیرے سے نئے سوالات اور نئی منبری ترتیب بنائی گئی ہے، تاکہ سامع کو تلاوت سے فیصلہ، معلومات سے کردار، خواہش سے میزان، اطاعت سے ذمہ داری اور آخرکار وفاداری تک ایک نیا سفر ملے۔",
  aimEn:
    "This series does not reproduce one scholar's original sequence. It recomposes verified source material into a new pulpit journey from recitation to decision, information to character, desire to criterion, obedience to responsibility, and finally fidelity.",
  sessions: bridgeSessions([
    {
      number: 1,
      titleUr: "قرآن پڑھتا ہوں، مگر فیصلہ کس سے لیتا ہوں؟",
      titleEn: "I read the Qur'an—but what actually decides for me?",
      purposeUr:
        "مجلس کا آغاز قرآن کے فضائل سے نہیں بلکہ انسانی فیصلہ سازی سے کریں۔ سوال یہ ہو کہ جب خواہش، خاندان، جماعت، کاروبار یا غصہ ایک طرف ہو اور قرآنی میزان دوسری طرف، تو میرے عملی فیصلے کا حاکم کون بنتا ہے؟",
      purposeEn:
        "Begin not with a list of virtues but with decision-making: what actually governs the believer when desire, family, group loyalty, business, or anger pulls in another direction?",
      materialUr: [
        "سورۂ اسراء 17:9 سے قرآن کو زندگی کی سیدھی اور قائم راہ دکھانے والا میزان بنائیں۔",
        "علامہ طالب جوہریؒ کے اس اصول کو بنیاد بنائیں کہ قرآن زندہ ہدایت ہے، مگر ان کی مجلس کی ترتیب نقل نہ کریں؛ گفتگو آج کے فیصلوں سے شروع کریں۔",
        "دو روزمرہ مثالیں خطیب خود اپنے ماحول سے لے: ایک گھر یا خاندان کی، دوسری مالی یا معاشرتی فیصلے کی۔",
        "اختتام میں سامع سے ایک سوال چھوڑیں: میری آخری مشکل میں قرآن نے میرے فیصلے کو واقعی بدلا تھا یا نہیں؟",
      ],
      materialEn: [
        "Use Qur'an 17:9 as a living criterion.",
        "Ground the idea in Talib Johari without reproducing his sequence.",
        "Use two contemporary examples chosen by the preacher.",
      ],
      sourceUr: "قرآن 17:9؛ علامہ طالب جوہریؒ — «منصبِ ہدایت اور قرآن» سے اصولِ ہدایت",
      sourceEn: "Qur'an 17:9; Talib Johari — principle of living guidance",
      quranUr: ["الإسراء 17:9 — اِنَّ هٰذَا الْقُرْاٰنَ يَهْدِيْ لِلَّتِيْ هِيَ اَقْوَمُ"],
      quranEn: ["Qur'an 17:9"],
      avoidRepeatUr:
        "علامہ طالب جوہریؒ کی مجلس اول کی مثالیں، مکالمہ یا اصل ترتیب نہ دہرائیں؛ صرف ثابت شدہ علمی اصول لیں۔",
      avoidRepeatEn:
        "Do not reproduce Johari's original examples, dialogue, or sequence; retain only the verified principle.",
      takeawayUr:
        "قرآن سے تعلق کا امتحان یہ نہیں کہ میں کتنا پڑھتا ہوں؛ یہ ہے کہ مشکل فیصلے میں کس میزان کو مانتا ہوں۔",
      takeawayEn:
        "The test is not only how much I recite, but what criterion governs a difficult decision.",
    },
    {
      number: 2,
      titleUr: "معلومات بڑھتی ہیں، انسان کیوں نہیں بدلتا؟",
      titleEn: "Why does information increase while the person stays the same?",
      purposeUr:
        "علم اور ایمان کے مسئلے کو آج کی معلوماتی کثرت سے جوڑیں۔ دینی مواد بہت سننے اور پڑھنے کے باوجود اگر زبان، غصہ، امانت اور گھر کے تعلقات نہ بدلیں تو ہدایت ابھی معلومات سے کردار تک نہیں پہنچی۔",
      purposeEn:
        "Connect faith and knowledge with the modern abundance of information: if speech, anger, trustworthiness, and family conduct remain unchanged, guidance has not yet become character.",
      materialUr: [
        "طالب جوہریؒ کے ایمان و علم والے نکات کو کردار کی جانچ میں استعمال کریں، مگر مجلس دوم یا چہارم کی اصل ساخت نہ اپنائیں۔",
        "علم کے تین امتحان رکھیں: کیا اس نے میرا تکبر کم کیا؟ کیا زبان بہتر کی؟ کیا کسی حق کی ادائیگی آسان کی؟",
        "سامع کو دوسروں کے ایمان پر فیصلہ دینے کے بجائے اپنے اندر نشان تلاش کرنے کی دعوت دیں۔",
      ],
      materialEn: [
        "Use Johari's faith-and-knowledge insights as tests of character without copying the original majlis structure.",
        "Offer concrete tests: humility, speech, and fulfillment of rights.",
      ],
      sourceUr: "علامہ طالب جوہریؒ — ایمان، علم اور عمل سے متعلق مستند اخذ؛ قرآنی صفاتِ مومنین",
      sourceEn: "Talib Johari — verified material on faith, knowledge, and conduct; Qur'anic qualities of believers",
      quranUr: ["اہلِ ایمان کی صفات سے متعلق آیات کو اصل سیاق کے ساتھ منتخب کریں۔"],
      quranEn: ["Use Qur'anic descriptions of believers in context."],
      avoidRepeatUr:
        "مومن کی صفات کی لمبی فہرست نہ پڑھیں؛ تین قابلِ پیمائش تبدیلیوں پر پوری مجلس قائم کریں۔",
      avoidRepeatEn:
        "Do not recite a long list of virtues; build the session around three observable changes.",
      takeawayUr:
        "وہ علم جو مجھے بدلتا نہیں، ابھی میرے لیے ہدایت نہیں بنا۔",
      takeawayEn:
        "Knowledge that does not change me has not yet become guidance for me.",
    },
    {
      number: 3,
      titleUr: "میں کامیابی کس چیز کو کہتا ہوں؟",
      titleEn: "What do I call success?",
      purposeUr:
        "نفع و نقصان، انسانی فضیلت اور آخرت کے مواد کو ایک نئے مرکزی سوال میں جمع کریں: میری کامیابی کی تعریف کہاں سے آتی ہے؟ قرآن انسان کو صرف حلال و حرام نہیں بتاتا، وہ کامیابی اور قدر کے پیمانے بھی بدلتا ہے۔",
      purposeEn:
        "Recompose material on gain, human worth, and the hereafter around one fresh question: where does my definition of success come from?",
      materialUr: [
        "فوری فائدہ اور حقیقی فائدے کا فرق کاروبار، تعلیم یا خاندانی فیصلے کی نئی مثال سے کھولیں۔",
        "دولت، نسب اور سماجی حیثیت کو انسانی فضیلت کا خودکار معیار نہ ماننے کا قرآنی اصول سامنے رکھیں۔",
        "موت کو خوف پیدا کرنے کے بجائے فیصلہ درست کرنے والا آئینہ بنائیں: اگر وقت محدود ہے تو میری ترجیح کیا بدلے گی؟",
      ],
      materialEn: [
        "Use a new contemporary example to distinguish immediate and true benefit.",
        "Challenge social measures of worth.",
        "Use mortality as a decision filter rather than fear alone.",
      ],
      sourceUr: "علامہ طالب جوہریؒ — نفع و نقصان، انسانی فضیلت اور آخرت سے متعلق مجالس کا مشترک علمی حاصل",
      sourceEn: "Talib Johari — synthesized verified material on gain, human worth, and the hereafter",
      quranUr: ["دنیا، آخرت اور انسانی قدر سے متعلق اصل ماخذ میں زیرِ بحث آیات کو سیاق کے ساتھ لائیں۔"],
      quranEn: ["Use the source-grounded Qur'anic passages on worldly life, the hereafter, and human worth."],
      avoidRepeatUr:
        "مجالس پنجم، ششم اور ہفتم کو مختصر کرکے ایک ساتھ نہ پڑھ دیں؛ ان سے صرف مشترک قرآنی میزان لیں اور نئی مجلس بنائیں۔",
      avoidRepeatEn:
        "Do not compress Majalis 5–7 into one recap; extract their shared Qur'anic criterion and build a new sermon.",
      takeawayUr:
        "قرآن میری کامیابی کی تعریف بدل دے تو میری ترجیحات بھی بدلتی ہیں۔",
      takeawayEn:
        "When the Qur'an changes my definition of success, my priorities change with it.",
    },
    {
      number: 4,
      titleUr: "اطاعت: کیا میں صرف وہی مانتا ہوں جو مجھے پسند ہو؟",
      titleEn: "Obedience: do I accept only what already suits me?",
      purposeUr:
        "اطاعتِ رسولؐ کو ایک زندہ اخلاقی مسئلہ بنائیں: محبت آسان ہے، مگر اصل امتحان وہاں ہے جہاں معتبر دینی رہنمائی میری خواہش یا پہلے سے قائم رائے سے مختلف ہو۔",
      purposeEn:
        "Turn obedience to the Messenger into a living moral question: love is easy, but obedience is tested when authoritative guidance challenges preference or prior opinion.",
      materialUr: [
        "قرآن اور رسولؐ کو ایک ہی نظامِ ہدایت کے اندر رکھیں۔",
        "احترام اور اطاعت کا فرق ایک نئی معاصر مثال سے سمجھائیں، نہ کہ اصل مجلس کا مکالمہ دہرائیں۔",
        "منصبِ ہدایت کی طرف اتنا ہی بڑھیں جتنا اصولی سوال کے لیے ضروری ہے: خدا کی ہدایت انسان تک معتبر طور پر کیسے پہنچتی اور سمجھائی جاتی ہے؟",
      ],
      materialEn: [
        "Keep Qur'an and Messenger within one order of guidance.",
        "Use a fresh contemporary example to distinguish respect from obedience.",
        "Raise the question of authoritative guidance without reproducing the original source sequence.",
      ],
      sourceUr: "قرآن 4:59؛ علامہ طالب جوہریؒ — اطاعتِ رسولؐ اور منصبِ ہدایت سے متعلق علمی مواد",
      sourceEn: "Qur'an 4:59; Talib Johari — verified material on Prophetic obedience and authoritative guidance",
      quranUr: ["النساء 4:59 — اَطِيْعُوا اللّٰهَ وَاَطِيْعُوا الرَّسُوْلَ"],
      quranEn: ["Qur'an 4:59"],
      avoidRepeatUr:
        "مجلس ہشتم یا نہم کی ترتیب نقل نہ کریں؛ اطاعت کا سوال آج کے سامع کی اپنی ضد، پسند اور رائے سے شروع کریں۔",
      avoidRepeatEn:
        "Do not reproduce Majlis 8 or 9; begin with the contemporary listener's preference, resistance, and prior opinion.",
      takeawayUr:
        "اطاعت کی حقیقت وہاں کھلتی ہے جہاں حق میری پسند کے تابع نہیں رہتا۔",
      takeawayEn:
        "Obedience becomes real when truth is not made subordinate to preference.",
    },
    {
      number: 5,
      titleUr: "حق پہچان لیا؛ اب قیمت کون دے گا؟",
      titleEn: "Truth is recognized—who will pay its cost?",
      purposeUr:
        "کربلا کو طالب جوہریؒ کی شامِ غریباں کی نقل کے طور پر نہیں بلکہ پورے خمسے کے نئے سوالات کے انجام کے طور پر لائیں: صحیح میزان معلوم ہو، کردار کا تقاضا واضح ہو، کامیابی کی تعریف درست ہو اور اطاعت تسلیم ہو—تو قیمت کے وقت انسان کیا کرتا ہے؟",
      purposeEn:
        "Bring Karbala not as a reproduction of Johari's Sham-e-Ghariban but as the culmination of the new series: what happens when right guidance becomes costly?",
      materialUr: [
        "پہلی چار مجالس کے سوالات کو ایک ایک جملے میں یاد دلائیں، اصل مجالس کے خلاصے نہ پڑھیں۔",
        "کربلا کو یہ دکھانے کے لیے استعمال کریں کہ حق کی معرفت اور حق کے ساتھ وفاداری دو الگ مرحلے ہیں۔",
        "مصائب کا انتخاب خطیب موضوع کے مطابق کرے؛ اصل خطیب کے مخصوص مصائب یا انتقالی جملے نقل نہ کیے جائیں۔",
        "اختتام ذاتی عہد پر کریں: جب حق میرے مفاد سے ٹکرائے تو میں اپنا میزان نہیں بدلوں گا۔",
      ],
      materialEn: [
        "Recall the new series' questions without summarizing the original source majalis.",
        "Use Karbala to distinguish recognition of truth from fidelity to truth.",
        "Let the preacher choose masaib appropriate to the audience rather than copying a source preacher's transition.",
      ],
      sourceUr: "قرآن کے مرکزی اصول؛ علامہ طالب جوہریؒ سے اخذ شدہ ہدایت و وفاداری کی علمی بنیاد؛ واقعۂ کربلا",
      sourceEn: "Core Qur'anic principles; verified Johari-derived principles of guidance and fidelity; Karbala",
      quranUr: ["پہلی مجالس کی مرکزی آیات کا مختصر اعادہ؛ نئی دلیل نہ چھیڑیں۔"],
      quranEn: ["Briefly revisit the series' central verses; do not open a new proof."],
      avoidRepeatUr:
        "علامہ طالب جوہریؒ کی شامِ غریباں کا بہاؤ، مخصوص مثالیں یا الفاظ نقل نہ کریں؛ صرف علمی ربط محفوظ رکھیں۔",
      avoidRepeatEn:
        "Do not reproduce Johari's Sham-e-Ghariban flow, examples, or wording; preserve only the verified intellectual connection.",
      takeawayUr:
        "ہدایت کا آخری امتحان جان لینا نہیں، قیمت کے وقت وفادار رہنا ہے۔",
      takeawayEn:
        "The final test of guidance is not knowing, but remaining faithful when truth carries a cost.",
    },
  ]),
  finalUr:
    "یہ خمسہ ماخذ کی مجلسیں دوبارہ سنانے کے لیے نہیں بلکہ معتبر علمی سرمائے سے نئی مجلس پیدا کرنے کے لیے ہے۔ خطیب ہر مجلس میں اپنی مقامی مثال، اپنے مخاطبین کا حقیقی سوال اور اپنی زبان شامل کرے؛ ماخذ دلیل کی پشت پر رہے، آواز منبر پر خطیب کی اپنی ہو۔",
  finalEn:
    "This series is designed to create new sermons from verified scholarship, not to replay source sermons. The preacher should add local examples, real audience questions, and an authentic voice while keeping sources behind the argument.",
};

const IMAMATE_FRESH_10: MajlisSeriesPlan = {
  length: 10,
  titleUr: "عشرۂ مجالس — امام کو ماننا آج کیا بدلتا ہے؟",
  titleEn: "Ten-session series — What does belief in the Imam change today?",
  aimUr:
    "یہ عشرہ کسی ایک عالم، کتاب یا موجود عشرے کی ترتیب نقل نہیں کرتا۔ طالب جوہریؒ، نقنؒ، علامہ طباطبائیؒ، شہید مطہریؒ، آیت اللہ ابراہیم امینیؒ اور حامد کاشانی کے مصدقہ علمی نکات کو نئے سوالات میں ازسرِنو مرتب کیا گیا ہے۔ ہر مجلس ایک موجود انسانی مسئلے سے شروع ہوتی ہے اور امامت کے عقیدے کو اس مسئلے کے علمی و اخلاقی جواب تک لے جاتی ہے۔",
  aimEn:
    "This series does not reproduce any one scholar's sequence. Verified insights from Talib Johari, Naqqan, Tabataba'i, Mutahhari, Amini, and Kashani are recomposed around fresh human questions.",
  sessions: bridgeSessions([
    {
      number: 1,
      titleUr: "دین موجود ہے، اختلاف پھر بھی کیوں ہے؟",
      titleEn: "Religion remains—why does disagreement remain?",
      purposeUr:
        "عشرے کا آغاز سیاسی جانشینی سے نہیں، دینی فہم کے انسانی مسئلے سے کریں: ایک ہی کتاب، ایک ہی رسولؐ اور ایک ہی قبلہ ہونے کے باوجود صحیح تعبیر، اخلاقی نمونہ اور معتبر رہنمائی کا سوال کیوں پیدا ہوتا ہے؟",
      purposeEn:
        "Begin with the human problem of authoritative religious understanding rather than political succession.",
      materialUr: [
        "علامہ طباطبائیؒ سے قیادت، علم اور تربیت کے تین دائروں کا صرف علمی حاصل لیں۔",
        "حامد کاشانی سے پہلے منصب کی تعریف اور بعد میں شخصی تطبیق والا اصول لیں۔",
        "سامع کی زندگی سے ایک اختلافی مثال خطیب خود منتخب کرے جس میں صرف متن موجود ہونا اختلاف ختم نہیں کرتا۔",
      ],
      materialEn: ["Use the structural insights of Tabataba'i and methodological sequencing of Kashani without reproducing their presentations."],
      sourceUr: "علامہ طباطبائیؒ؛ حامد کاشانی — امامت کی تعریف اور دینی رہنمائی کے مصدقہ علمی نکات",
      sourceEn: "Tabataba'i; Hamed Kashani — verified material on the function and method of Imamate",
      quranUr: ["البقرہ 2:124 کو ابھی سوال کے افق میں رکھیں؛ تفصیلی استدلال بعد میں آئے۔"],
      quranEn: ["Keep Qur'an 2:124 in view; reserve detailed treatment for later."],
      avoidRepeatUr: "موجود امامت عشرے کی پہلی مجلس یا کسی عالم کی اصل تمہید نقل نہ کریں؛ آج کا آغاز معاصر اختلاف کے مسئلے سے ہو۔",
      avoidRepeatEn: "Do not reproduce the existing curated opening or a scholar's original introduction.",
      takeawayUr: "دین کی موجودگی صحیح فہم اور معتبر رہنمائی کے سوال کو ختم نہیں کرتی۔",
      takeawayEn: "The presence of religion does not remove the question of authoritative understanding.",
    },
    {
      number: 2,
      titleUr: "ہدایت صرف کتاب ہے یا ایک زندہ نسبت بھی؟",
      titleEn: "Is guidance only a text, or also a living relationship?",
      purposeUr:
        "طالب جوہریؒ کے قرآنی زاویے سے متن اور معتبر ہادی کے تعلق کو نئے سوال میں کھولیں: قرآن خود رسولؐ کی اطاعت کا حکم دیتا ہے تو کتاب اور ہادی کو حریف بنانا کہاں تک درست ہے؟",
      purposeEn:
        "Use Talib Johari's Qur'anic principle to explore text and authoritative guide as related rather than rival.",
      materialUr: [
        "قرآن 17:9 اور 4:59 کو بنیاد بنائیں۔",
        "احترام، محبت اور اطاعت کے فرق کو آج کے سامع کی عملی زندگی سے نئی مثال میں واضح کریں۔",
        "بحث کو فوراً تاریخی نزاع میں نہ لے جائیں؛ پہلے اصول مضبوط کریں۔",
      ],
      materialEn: ["Use Qur'an 17:9 and 4:59; distinguish respect, love, and obedience through a fresh example."],
      sourceUr: "قرآن 17:9، 4:59؛ علامہ طالب جوہریؒ — قرآن و اطاعت کا مصدقہ علمی اصول",
      sourceEn: "Qur'an 17:9, 4:59; Talib Johari — verified principle of Qur'an and obedience",
      quranUr: ["الإسراء 17:9", "النساء 4:59"],
      quranEn: ["Qur'an 17:9", "Qur'an 4:59"],
      avoidRepeatUr: "طالب جوہریؒ کی مجالس کی اصل ترتیب، مکالمے یا مخصوص مثالیں نہ دہرائیں۔",
      avoidRepeatEn: "Do not reproduce Johari's original sequence, dialogue, or examples.",
      takeawayUr: "قرآن معتبر اطاعت کو اپنے خلاف نہیں بلکہ اپنی ہدایت کے اندر رکھتا ہے۔",
      takeawayEn: "The Qur'an places authoritative obedience within its guidance, not against it.",
    },
    {
      number: 3,
      titleUr: "کیا عہدہ انسان کو اہل بناتا ہے؟",
      titleEn: "Does office make a person qualified?",
      purposeUr:
        "نقنؒ کے اصطفاء والے استدلال کو نئی انسانی مثال کے ساتھ کھولیں: بڑے منصب کے لیے پہلے اہلیت درکار ہوتی ہے یا منصب ملنے کے بعد اہلیت پیدا ہوتی ہے؟ وہاں سے الٰہی انتخاب تک جائیں۔",
      purposeEn:
        "Reframe Naqqan's istifa argument through a fresh human question about qualification before office.",
      materialUr: [
        "اصطفاء کی لغوی بنیاد محفوظ رکھیں، مگر اصل مجلس کی مثالیں نقل نہ کریں۔",
        "6:124 سے علمِ الٰہی اور منصب کے تعلق کو واضح کریں۔",
        "سامع کے لیے جدید مثال خطیب خود بنائے، مگر اسے دلیل کا قائم مقام نہ بنائے۔",
      ],
      materialEn: ["Retain the verified linguistic principle while using a fresh illustration."],
      sourceUr: "آیت اللہ سید علی نقی نقویؒ (نقن) — اصطفاء و اہلیت؛ قرآن 6:124",
      sourceEn: "Naqqan — divine selection and qualification; Qur'an 6:124",
      quranUr: ["الأنعام 6:124 — اَللّٰهُ اَعْلَمُ حَيْثُ يَجْعَلُ رِسَالَتَهٗ"],
      quranEn: ["Qur'an 6:124"],
      avoidRepeatUr: "نقنؒ کا مخصوص مکالماتی بہاؤ یا اصل تشبیہات نہ دہرائیں؛ صرف ثابت شدہ کلامی اصول لیں۔",
      avoidRepeatEn: "Do not reproduce Naqqan's distinctive dialogue or illustrations.",
      takeawayUr: "الٰہی منصب اتفاقی اعزاز نہیں؛ علمِ الٰہی میں معلوم اہلیت سے وابستہ ہے۔",
      takeawayEn: "Divine office is tied to qualification known by God.",
    },
    {
      number: 4,
      titleUr: "اختیار ہو تو عصمت کیسے؟",
      titleEn: "If freedom remains, how can infallibility be certain?",
      purposeUr:
        "سامع کے اصل اشکال کو مرکز بنائیں: اگر معصوم آزاد ہے تو گناہ ممکن کیوں نہیں، اور اگر ممکن نہیں تو فضیلت کہاں رہی؟ نقنؒ کے علمی حل سے جواب دیں مگر ان کی مجلس دوبارہ نہ پڑھیں۔",
      purposeEn:
        "Center the listener's real objection and answer it through Naqqan's verified framework without replaying his majlis.",
      materialUr: [
        "عدمِ وقوع اور قطعی اخلاقی اہلیت کا فرق واضح کریں۔",
        "قدرت کی کمی اور کردار کے کمال میں فرق رکھیں۔",
        "اختتام ضبطِ نفس کے عام انسانی سبق پر کریں، مگر عصمت اور عام تقویٰ کو ایک درجہ نہ بنائیں۔",
      ],
      materialEn: ["Distinguish non-occurrence, incapacity, and perfected moral character."],
      sourceUr: "آیت اللہ سید علی نقی نقویؒ (نقن) — عصمت و اختیار سے متعلق مجالس",
      sourceEn: "Naqqan — verified material on infallibility and freedom",
      quranUr: ["رسولؐ کی حقیقی بشریت سے متعلق آیات کو سیاق کے ساتھ استعمال کریں۔"],
      quranEn: ["Use Qur'anic passages on the Prophet's real humanity in context."],
      avoidRepeatUr: "نقنؒ کی مجالس 3 تا 8 کا خلاصہ مت پڑھیں؛ ایک اشکال، ایک حل اور ایک اخلاقی اثر تک محدود رہیں۔",
      avoidRepeatEn: "Do not summarize Majalis 3–8; focus on one objection, one resolution, and one ethical implication.",
      takeawayUr: "کمالِ کردار اختیار کو ختم نہیں کرتا؛ اختیار کو حق کے تابع کر دیتا ہے۔",
      takeawayEn: "Perfected character does not erase freedom; it orders freedom toward truth.",
    },
    {
      number: 5,
      titleUr: "امام صرف حاکم ہے تو علم کا مسئلہ کون حل کرے گا؟",
      titleEn: "If the Imam is only a ruler, who answers the problem of religious knowledge?",
      purposeUr:
        "امامت کو اقتدار سے آگے لے جائیں۔ دین کی تعبیر، علمی حفاظت اور روحانی تربیت کے سوال کو علامہ طباطبائیؒ کے علمی خاکے سے جوڑیں، اور سامع کو دکھائیں کہ منصبِ امامت کے مختلف پہلو کیوں ضروری ہیں۔",
      purposeEn:
        "Move beyond political rule into authoritative interpretation, preservation of knowledge, and spiritual formation.",
      materialUr: [
        "قیادت، علم اور تربیت کو تین الگ خانوں کی فہرست نہ بنائیں؛ ایک عملی مسئلے میں تینوں کی ضرورت دکھائیں۔",
        "کسی جدید فکری یا خاندانی مسئلے کی مثال خطیب خود دے کہ صرف قانون جان لینا تربیت کی جگہ نہیں لے سکتا۔",
        "معتبر علم کے سوال کو شخصیت پرستی سے الگ رکھیں۔",
      ],
      materialEn: ["Show the need for leadership, knowledge, and formation through one contemporary problem."],
      sourceUr: "علامہ سید محمد حسین طباطبائیؒ — امامت کے علمی، اجتماعی اور روحانی پہلو",
      sourceEn: "Allamah Tabataba'i — intellectual, communal, and spiritual dimensions of Imamate",
      quranUr: ["البقرہ 2:124 کو منصب کے قرآنی پس منظر کے طور پر جوڑیں۔"],
      quranEn: ["Connect Qur'an 2:124 as the background of divine office."],
      avoidRepeatUr: "علامہ طباطبائیؒ کی اصل کتابی ترتیب یا تین نکات کی لفظی نقل نہ بنائیں؛ انہیں ایک نئے عملی مسئلے میں یکجا کریں۔",
      avoidRepeatEn: "Do not reproduce Tabataba'i's presentation verbatim; integrate the dimensions into a fresh practical problem.",
      takeawayUr: "امامت صرف اقتدار نہیں؛ دین کو صحیح سمجھنے، جینے اور منتقل کرنے کے نظام سے متعلق ہے۔",
      takeawayEn: "Imamate concerns the reliable understanding, embodiment, and transmission of religion, not power alone.",
    },
    {
      number: 6,
      titleUr: "راستہ معلوم ہے، پھر انسان چلتا کیوں نہیں؟",
      titleEn: "If the road is known, why do people still fail to walk it?",
      purposeUr:
        "شہید مطہریؒ کے ہدایت و قیادت کے فرق کو آج کی اخلاقی کمزوری سے جوڑیں: صحیح بات جاننا اور اس کے مطابق حرکت کرنا دو مختلف مراحل ہیں۔",
      purposeEn:
        "Use Mutahhari's distinction between guidance and leadership to address the gap between knowing and acting.",
      materialUr: [
        "سامع کی زندگی سے ایک ایسی مثال لیں جہاں سب کو صحیح بات معلوم ہے مگر عمل نہیں ہوتا۔",
        "امام کی قیادت کو انسانی صلاحیت بیدار کرنے اور حق پر کھڑا کرنے سے جوڑیں۔",
        "سیاسی حکومت کو اس بحث کا واحد معنی نہ بنائیں۔",
      ],
      materialEn: ["Use a fresh lived example of knowing the right thing but failing to act."],
      sourceUr: "شہید مرتضیٰ مطہریؒ — ہدایت اور قیادت کا مصدقہ فرق",
      sourceEn: "Ayatullah Murtadha Mutahhari — verified distinction between guidance and leadership",
      quranUr: ["ہدایت، تزکیہ اور عمل سے متعلق مناسب آیات سیاق کے ساتھ منتخب کریں۔"],
      quranEn: ["Use contextual Qur'anic passages on guidance, purification, and action."],
      avoidRepeatUr: "مطہریؒ کی اصل مثالیں یا ان کی تحریر کی ترتیب نہ دہرائیں؛ فرق کو آج کے سامع کے مسئلے میں نئی صورت دیں۔",
      avoidRepeatEn: "Do not reproduce Mutahhari's original illustrations or sequence.",
      takeawayUr: "امام کا کام صرف صحیح راستہ بتانا نہیں؛ انسان کو اس راستے پر قائم کرنے والا معیار بننا بھی ہے۔",
      takeawayEn: "The Imam is not only about direction, but about forming people capable of fidelity to that direction.",
    },
    {
      number: 7,
      titleUr: "امام سے محبت میری عادتوں تک کیوں نہیں پہنچتی؟",
      titleEn: "Why does love for the Imam fail to reach my habits?",
      purposeUr:
        "آیت اللہ ابراہیم امینیؒ کے معرفتِ امام والے زاویے کو جذباتی محبت اور عملی پیروی کے فاصلے سے جوڑیں۔ سوال یہ ہو کہ میری عبادت، معاملات، گھر اور اختلاف میں امام کا معیار کہاں نظر آتا ہے؟",
      purposeEn:
        "Use Amini's recognition framework to examine the gap between devotional love and lived imitation.",
      materialUr: [
        "نام، القاب اور تاریخ جاننے کی قدر تسلیم کریں، مگر معرفت کو وہاں ختم نہ کریں۔",
        "ایک امام کی ایک صفت منتخب کرکے روزمرہ عادت سے جوڑیں۔",
        "سامع کو عمومی عہد کے بجائے سات دن کی ایک قابلِ عمل مشق دیں۔",
      ],
      materialEn: ["Move from names and dates into one lived quality and one seven-day practice."],
      sourceUr: "آیت اللہ ابراہیم امینیؒ — معرفتِ امام اور عملی پیروی",
      sourceEn: "Ayatullah Ibrahim Amini — recognition of the Imam and lived following",
      quranUr: ["اسوہ، اطاعت اور صالح عمل سے متعلق مناسب قرآنی اصول استعمال کریں۔"],
      quranEn: ["Use suitable Qur'anic principles of exemplarity, obedience, and righteous action."],
      avoidRepeatUr: "فضائل کی لمبی فہرست نہ بنائیں؛ ایک صفت، ایک عادت اور ایک عملی عہد پر مجلس مرکوز رکھیں۔",
      avoidRepeatEn: "Avoid a long virtue list; focus on one quality, one habit, and one commitment.",
      takeawayUr: "معرفتِ امام اس وقت میری بنتی ہے جب امام کا معیار میری کسی عادت کو بدل دے۔",
      takeawayEn: "Recognition becomes mine when the Imam's standard changes one of my habits.",
    },
    {
      number: 8,
      titleUr: "دینی دلیل کو نعرہ بننے سے کیسے بچائیں؟",
      titleEn: "How do we keep religious proof from becoming a slogan?",
      purposeUr:
        "حامد کاشانی کے تحقیقی منہج کو خطیب کی ذمہ داری کے سوال سے جوڑیں: روایت نقل کرنا کافی نہیں؛ سند، دلالت، سیاق اور مخاطب کو سمجھے بغیر دلیل کمزور یا اشتعال انگیز بن سکتی ہے۔",
      purposeEn:
        "Use Kashani's research method to focus on the preacher's responsibility toward evidence, context, and audience.",
      materialUr: [
        "امامت کی دلیل کو نعرے کے بجائے علمی امانت کے ساتھ پیش کرنے کا اصول سمجھائیں۔",
        "ایک ہی مجلس میں بہت سی روایات جمع کرنے کے بجائے ایک دلیل کو صحیح سیاق کے ساتھ کھولنے کی ترغیب دیں۔",
        "مخالف نقطۂ نظر کو کمزور شکل میں پیش کرکے فتح حاصل کرنے کے بجائے اصل علمی اختلاف سمجھنے کی اہمیت بتائیں۔",
      ],
      materialEn: ["Emphasize source discipline, semantic context, and fair representation of disagreement."],
      sourceUr: "حامد کاشانی — امامت پژوهی کے منہج سے اخذ شدہ تحقیقی اصول",
      sourceEn: "Hamed Kashani — verified methodological principles for Imamate research",
      quranUr: ["علم، خبر کی تحقیق اور دیانت سے متعلق مناسب قرآنی اصول استعمال کریں۔"],
      quranEn: ["Use relevant Qur'anic principles of knowledge, verification, and integrity."],
      avoidRepeatUr: "کاشانی کے درس یا تحریر کی ترتیب نہ نقل کریں؛ اسے خطیب کی علمی امانت کے نئے سوال پر منطبق کریں۔",
      avoidRepeatEn: "Do not reproduce Kashani's lesson structure; apply the method to the preacher's responsibility.",
      takeawayUr: "مضبوط عقیدہ کمزور دلیل کا محتاج نہیں؛ علمی امانت خود منبر کی قوت ہے۔",
      takeawayEn: "A strong doctrine does not need weak evidence; scholarly integrity strengthens the pulpit.",
    },
    {
      number: 9,
      titleUr: "غیبت میں امام کا تعلق روزمرہ زندگی سے کہاں بنتا ہے؟",
      titleEn: "Where does the Imam matter in daily life during occultation?",
      purposeUr:
        "گزشتہ علمی نکات کو غیبت کے زمانے کی ذمہ داری میں جمع کریں۔ انتظار کو بے عملی کے بجائے صحیح علم، اخلاقی تیاری، عدل اور ذمہ دار دینداری کے طور پر کھولیں۔",
      purposeEn:
        "Gather the previous themes into responsibility during occultation: knowledge, moral readiness, justice, and responsible religious life.",
      materialUr: [
        "انتظار کو صرف مستقبل کی خبر نہ بنائیں؛ حال کی تیاری بنائیں۔",
        "گزشتہ مجالس سے علم، کردار، اطاعت اور قیادت کے اصول یہاں جمع کریں۔",
        "سامع سے پوچھیں: اگر میں ظہور کی دعا کرتا ہوں تو اپنی زندگی میں کون سا ظلم، بددیانتی یا بے ذمہ داری اسی دعا کے خلاف کھڑی ہے؟",
      ],
      materialEn: ["Turn expectation from future-oriented sentiment into present moral preparation."],
      sourceUr: "امامت کی موجود تحقیقی دستاویز کا جامع حاصل؛ انتظار و ذمہ داری کی امامیہ علمی تعبیر",
      sourceEn: "Synthesis of the verified Imamate dossier; Imami framing of expectation and responsibility",
      quranUr: ["عدل، صالح عمل اور ذمہ داری سے متعلق مناسب آیات منتخب کریں۔"],
      quranEn: ["Use suitable Qur'anic passages on justice, righteous action, and responsibility."],
      avoidRepeatUr: "غیبت کی پوری تاریخ یا علاماتِ ظہور نہ چھیڑیں؛ آج کا سوال صرف موجود ذمہ داری ہے۔",
      avoidRepeatEn: "Do not open the full history of occultation or signs of reappearance; keep the session on present responsibility.",
      takeawayUr: "انتظار مستقبل کی خبر سے پہلے حال کے کردار کا امتحان ہے۔",
      takeawayEn: "Expectation is a test of present character before it is a statement about the future.",
    },
    {
      number: 10,
      titleUr: "اگر امام میرا معیار ہے تو کل صبح کیا بدلے گا؟",
      titleEn: "If the Imam is my standard, what changes tomorrow morning?",
      purposeUr:
        "آخری مجلس پورے عشرے کو نظری خلاصے میں نہیں بلکہ عملی فیصلوں میں سمیٹے۔ گھر، عبادت، علم، تجارت، اختلاف اور معاشرت میں امام کے معیار سے ایک ایک تبدیلی منتخب کی جائے۔",
      purposeEn:
        "End not with an abstract recap but with concrete decisions in family, worship, knowledge, business, disagreement, and social conduct.",
      materialUr: [
        "پہلی نو مجالس کے عنوان نہ گنوائیں؛ ان کے نتائج سے چھ عملی میدان نکالیں۔",
        "سامع کو ایک ہی قابلِ عمل عہد منتخب کرنے دیں، دس وعدے نہ دلوائیں۔",
        "مصائب یا دعا کا اختتام اسی عہد سے مربوط ہو، کسی ماخذ خطیب کے مخصوص انتقال کی نقل نہ ہو۔",
      ],
      materialEn: ["Convert the series into a small set of practical domains and one chosen commitment."],
      sourceUr: "پورے کثیر المآخذ عشرے کا نیا منبری جامع نتیجہ",
      sourceEn: "Fresh sermonic synthesis of the multi-source series",
      quranUr: ["عشرے کی بنیادی آیات کا مختصر اعادہ کریں؛ نئی دلیل نہ کھولیں۔"],
      quranEn: ["Briefly revisit the central Qur'anic anchors; do not open a new proof."],
      avoidRepeatUr: "دسویں مجلس کو خلاصوں کی فہرست نہ بنائیں؛ ایک عملی تبدیلی تک پورا عشرہ پہنچائیں۔",
      avoidRepeatEn: "Do not make the final session a list of summaries; bring the series to one lived change.",
      takeawayUr: "امامت کا سب سے زندہ ثبوت یہ ہے کہ امام کا معیار میرے اگلے فیصلے میں نظر آئے۔",
      takeawayEn: "The most living sign of belief in Imamate is that the Imam's standard appears in the next decision.",
    },
  ]),
  finalUr:
    "یہ عشرہ کسی عالم کی مجالس کا بدل نہیں اور نہ ان کی نقل ہے۔ اہلِ علم کے مصدقہ نکات اس کی علمی پشت ہیں، مگر سوالات، ترتیب، عملی مثالیں اور منبری سفر نئی تشکیل ہیں۔ خطیب کو آخری مرحلے میں اپنے ماحول، اپنے سامع اور اپنے اسلوب کے مطابق مثالیں شامل کرنی چاہییں۔",
  finalEn:
    "This is not a substitute for or reproduction of any scholar's majalis. Verified scholarship stands behind it, while the questions, sequence, practical framing, and sermonic journey are newly composed.",
};

function genericFreshPlan(dossier: SermonDossier, length: MajlisSeriesLength): MajlisSeriesPlan | null {
  if (length === 1) return null;
  const flows = dossier.pulpitFlowUr;
  if (flows.length < length) return null;
  const step = flows.length / length;
  const sessions: MajlisSeriesSession[] = [];
  for (let i = 0; i < length; i += 1) {
    const index = Math.min(flows.length - 1, Math.floor(i * step));
    const ur = flows[index];
    const en = dossier.pulpitFlowEn[index];
    sessions.push({
      number: i + 1,
      titleUr: ur.heading.replace(/^\d+\.\s*/, ""),
      titleEn: en?.heading.replace(/^\d+\.\s*/, "") ?? ur.heading,
      purposeUr: ur.body,
      purposeEn: en?.body ?? ur.body,
      materialUr: [ur.body],
      materialEn: [en?.body ?? ur.body],
      sourceUr: "متعدد مصدقہ علمی ماخذوں سے تیار کردہ موضوعاتی تحقیق",
      sourceEn: "Topic research synthesized from multiple verified sources",
      avoidRepeatUr:
        "کسی ایک ماخذ کی مجلس، مثالوں یا مخصوص عبارت کی نقل نہ کریں؛ اس علمی نکتے کو اپنے مخاطبین اور نئی مثال کے ساتھ ازسرِنو بیان کریں۔",
      avoidRepeatEn:
        "Do not reproduce one source sermon, its examples, or distinctive wording; reframe the verified point for the present audience.",
      takeawayUr: "اس مجلس کے آخر میں سامع کے لیے ایک واضح فکری یا عملی نتیجہ چھوڑیں۔",
      takeawayEn: "End with one clear intellectual or practical takeaway.",
    });
  }
  return {
    length,
    titleUr: `${length === 3 ? "سہ روزہ" : length === 5 ? "خمسۂ" : "عشرۂ"} مجالس — نئی منبری تشکیل`,
    titleEn: `${length}-session fresh pulpit composition`,
    aimUr:
      "یہ ترتیب تحقیقی مواد کو جوں کا توں دہرانے کے بجائے نئی منبری ساخت میں پیش کرتی ہے۔ ہر مجلس کا سوال، ربط اور عملی رخ الگ رکھا گیا ہے تاکہ خطیب ماخذ سے فائدہ لے مگر کسی ایک عالم کی مجلس کی نقل نہ بنے۔",
    aimEn:
      "This plan recomposes research into a new pulpit structure rather than replaying a source sermon.",
    sessions: bridgeSessions(sessions),
    finalUr:
      "آخری مجلس میں موضوع کے پورے سفر کو ایک عملی یا اخلاقی عہد میں سمیٹیں، اور خطیب اپنی مقامی مثال اور اپنے مخاطبین کی حقیقی ضرورت شامل کرے۔",
    finalEn:
      "Close the series with one lived commitment, adding the preacher's own local example and audience-specific application.",
  };
}

export function buildFreshMajlisSeries(
  dossier: SermonDossier,
  length: MajlisSeriesLength,
): MajlisSeriesPlan | null {
  if (dossier.topicId === "dua" && length === 5) return DUA_FIVE_DAY_SERIES;
  if (dossier.topicId === "sabr" && length === 3) return SABR_THREE_DAY_SERIES;
  if (dossier.topicId === "quran-hidayat" && length === 5) return QURAN_HIDAYAT_FRESH_5;
  if (dossier.topicId === "imamate" && length === 10) return IMAMATE_FRESH_10;
  return genericFreshPlan(dossier, length);
}
