import { NAQQAN_ASHRA_EVIDENCE } from "./naqqanEvidence";
import { TALIB_JOHARI_MANSAB_HIDAYAT_EVIDENCE } from "./talibJohariEvidence";
import { TALIB_JOHARI_INSANIYAT_EVIDENCE } from "./talibJohariInsaniyatEvidence";
import { pureKhateebUrdu } from "./urduPurity";

export type SpeakerEvidenceKind = "transcript" | "compiled-majalis";
export type SpeakerEvidenceStatus = "ready" | "catalog-only";

export type SpeakerEvidence = {
  id: string;
  speakerId: string;
  /**
   * Explicit links to year-round topic ids from topicPrep.ts.
   * Never infer these links from generic speaker profile tags.
   */
  topicIds: readonly string[];
  kind: SpeakerEvidenceKind;
  status: SpeakerEvidenceStatus;
  titleUr: string;
  titleEn: string;
  dateLabel?: string;
  topicsUr: readonly string[];
  topicsEn: readonly string[];
  summaryUr: string;
  summaryEn: string;
  /**
   * Ready-to-use paraphrased study material shown inside Khateeb Studio.
   * This is not a quotation unless a future field explicitly says so.
   */
  materialUr?: readonly string[];
  materialEn?: readonly string[];
  takeawaysUr: readonly string[];
  takeawaysEn: readonly string[];
  sourceLabelUr: string;
  sourceLabelEn: string;
  sourceUrl: string;
};

/**
 * Source-backed speaker material only.
 *
 * `transcript` = a public page contains the speech text/transcript.
 * `compiled-majalis` = a verified published/archived collection record; do not
 * pretend we have extracted claims from the full book until its text is ingested.
 */
export const SPEAKER_EVIDENCE: readonly SpeakerEvidence[] = [
  ...NAQQAN_ASHRA_EVIDENCE,
  ...TALIB_JOHARI_MANSAB_HIDAYAT_EVIDENCE,
  ...TALIB_JOHARI_INSANIYAT_EVIDENCE,
  {
    id: "kashani-askari-1402",
    speakerId: "hamed-kashani",
    topicIds: ["imamate"],
    kind: "transcript",
    status: "ready",
    titleUr: "امام حسن عسکریؑ کے عہدِ حیات پر ایک نظر",
    titleEn: "A reflection on the lifetime of Imam Hasan al-Askari",
    dateLabel: "2 Mehr 1402 SH",
    topicsUr: ["امام حسن عسکریؑ", "امامت", "شیعہ علمی نیٹ ورک", "اخلاق", "تبلیغ"],
    topicsEn: ["Imam Hasan al-Askari", "Imamate", "Shi'i scholarly networks", "ethics", "religious outreach"],
    summaryUr:
      "حامد کاشانی اس خطاب میں امام حسن عسکریؑ کے دور کو مختصر مگر نہایت دشوار اور پُرثمر زمانہ قرار دیتے ہیں۔ ان کے بیان کا مرکزی زاویہ یہ ہے کہ سیاسی دباؤ کے باعث ائمہؑ نے صرف عمومی خطابت پر انحصار نہیں کیا بلکہ منتخب اہلِ علم اور تربیت یافتہ افراد کے ذریعے معارف، فقہ اور اجتماعی رابطے کو محفوظ رکھا۔ وہ اس تاریخی بحث کو آج کی دینداری سے جوڑتے ہوئے کہتے ہیں کہ دینی اداروں اور مجالس کی کامیابی کا معیار محض اجتماع نہیں بلکہ یہ ہے کہ ان کے نتیجے میں صداقت، امانت، قرآن سے تعلق، مسجد سے وابستگی اور خاندانی اخلاق بہتر ہوں۔",
    summaryEn:
      "Kashani presents Imam Hasan al-Askari's period as short, difficult, and highly productive. His central line is that political pressure pushed the Imams to preserve knowledge and community through trained scholars and trusted individuals, not public preaching alone. He then links that history to the present: the success of religious institutions should be judged by moral outcomes such as truthfulness, trustworthiness, attachment to the Qur'an and mosque, and healthier family conduct.",
    materialUr: [
      "کاشانی امام حسن عسکریؑ کے عہد کو محض سیاسی محاصرے کی تاریخ کے طور پر نہیں پڑھتے۔ ان کے نزدیک اس دور کی اصل اہمیت یہ ہے کہ شدید نگرانی کے باوجود علمی و دینی رہنمائی کا سلسلہ رکا نہیں۔ امامؑ کی حکمتِ عملی میں ایسے افراد کی تربیت اور تقویت نمایاں تھی جو مختلف علاقوں میں معارفِ اہل بیتؑ، فقہی رہنمائی اور شیعہ اجتماعی رابطے کو آگے پہنچا سکیں۔",
      "وہ اس نکتے کو خاص طور پر نمایاں کرتے ہیں کہ ہر دور میں دینی قیادت کا مؤثر ہونا بڑے عوامی اجتماع یا کھلی سیاسی طاقت سے وابستہ نہیں ہوتا۔ بعض اوقات محدود حالات میں مضبوط انسان سازی، قابلِ اعتماد واسطوں اور علمی نیٹ ورک کی تشکیل زیادہ بنیادی کام بن جاتی ہے۔ یہی زاویہ غیبت سے پہلے کے شیعہ معاشرے کی تیاری کو سمجھنے میں بھی مدد دیتا ہے۔",
      "خطاب کا عملی رخ یہ ہے کہ مجلس، مسجد یا دینی ادارے کی کامیابی کو صرف تعداد سے نہ ناپا جائے۔ اگر دینی سرگرمی کے بعد آدمی زیادہ سچا، زیادہ امانت دار، قرآن سے زیادہ مربوط، مسجد سے زیادہ وابستہ اور گھر والوں کے ساتھ بہتر اخلاق والا نہیں بنتا تو محض اجتماع خود کامیابی کی کافی علامت نہیں۔",
      "منبر پر اس مواد کو یوں استعمال کیا جا سکتا ہے: پہلے امامؑ کے سیاسی محدود ماحول کا مختصر پس منظر، پھر علمی نیٹ ورک اور تربیتِ افراد کا اصول، اور آخر میں آج کے دینی اداروں اور مجالس کے لیے measurable اخلاقی نتیجے کا سوال۔",
    ],
    materialEn: [
      "Kashani does not read Imam al-Askari's age merely as a history of political confinement. His central point is that intense surveillance did not stop religious guidance. A major strategy was the formation and strengthening of trusted individuals who could carry the teachings of Ahl al-Bayt, legal guidance, and community links across different regions.",
      "He stresses that effective religious leadership is not always tied to public power or large gatherings. In constrained periods, forming reliable people and a resilient scholarly network can become the more fundamental task. This also helps explain how the Shi'i community was being prepared for the period of occultation.",
      "His practical application is sharp: a majlis, mosque, or religious institution should not be measured by attendance alone. If participants do not become more truthful, trustworthy, connected to the Qur'an and mosque, and better in family conduct, numbers by themselves do not demonstrate success.",
      "For a sermon, this can be structured as: brief political context, the Imam's investment in people and networks, then a present-day question about the measurable moral outcome of religious institutions.",
    ],
    takeawaysUr: [
      "ائمہؑ نے سخت سیاسی محدودیت میں افرادِ خاص اور اہلِ علم کی تربیت پر سرمایہ کاری کی۔",
      "شیعہ علمی نیٹ ورک محض انتظامی ضرورت نہیں بلکہ معارف کے تحفظ کا ذریعہ تھا۔",
      "مجلس اور دینی ادارے کی کامیابی کا عملی معیار اخلاقی تبدیلی ہے۔",
      "صدق، امانت، قرآن اور گھر کے تعلقات کو دینداری کے visible output کے طور پر پیش کیا گیا ہے۔",
    ],
    takeawaysEn: [
      "Under political restriction, the Imams invested in trained scholars and trusted individuals.",
      "The Shi'i scholarly network functioned as a mechanism for preserving teachings.",
      "A religious gathering should be judged by whether it produces moral change.",
      "Truthfulness, trustworthiness, Qur'anic attachment, and family conduct are presented as visible outputs of religious formation.",
    ],
    sourceLabelUr: "حامد کاشانی — مکمل مکتوب خطاب",
    sourceLabelEn: "Hamed Kashani — full public transcript",
    sourceUrl: "https://www.hkashani.com/?p=23271",
  },
  {
    id: "kashani-askari-concerns-1399",
    speakerId: "hamed-kashani",
    topicIds: ["imamate"],
    kind: "transcript",
    status: "ready",
    titleUr: "امام عسکریؑ کی بعض فکری و اجتماعی دغدغه‌ها — جلسہ اول",
    titleEn: "Some concerns of Imam al-Askari — session 1",
    dateLabel: "3 Aban 1399 SH",
    topicsUr: ["امام حسن عسکریؑ", "اہل بیتؑ کی مرجعیت", "تاریخ تشیع", "خفقان", "تبلیغ"],
    topicsEn: ["Imam Hasan al-Askari", "authority of Ahl al-Bayt", "Shi'i history", "repression", "religious communication"],
    summaryUr:
      "اس خطاب میں کاشانی مختلف ادوارِ ائمہؑ کو ایک مسلسل تاریخی عمل کے طور پر دیکھتے ہیں۔ وہ رسولؐ کے زمانے میں اہل بیتؑ کے مقام کی معرفی، بعد کے سیاسی دباؤ، اور پھر امام سجادؑ، امام باقرؑ اور امام صادقؑ کے زمانے میں اہل بیتؑ کی علمی و سماجی حیثیت کی تدریجی بازیابی کا خاکہ پیش کرتے ہیں۔ ان کے مطابق عمومی طور پر امام اور ائمہؑ کی تعداد و شناخت کو کھلے عام بیان کرنا ہمیشہ ممکن نہ تھا، کیونکہ ایسا کرنے سے خود امام اور شیعہ نیٹ ورک کی سلامتی متاثر ہو سکتی تھی۔",
    summaryEn:
      "Kashani reads the different eras of the Imams as one continuous historical process: public introduction of Ahl al-Bayt in the Prophet's lifetime, later political marginalization, and a gradual rebuilding of scholarly and social authority under Imams al-Sajjad, al-Baqir, and al-Sadiq. He argues that open public identification of the Imam and the full line of Imams was not always possible because of security pressure on the Imam and the Shi'i network.",
    materialUr: [
      "اس مجلس میں کاشانی ائمہؑ کی تاریخ کو الگ الگ سوانحی خانوں میں تقسیم کرنے کے بجائے ایک مسلسل تحریک کے طور پر پڑھتے ہیں۔ رسول اکرمؐ کے زمانے میں اہل بیتؑ کے مقام کی معرفی، بعد کے سیاسی حالات میں ان کی مرجعیت کو محدود کرنے کی کوشش، اور پھر امام سجادؑ سے امام صادقؑ تک علمی و سماجی حیثیت کی تدریجی بازیابی کو ایک مربوط تاریخی process کے طور پر پیش کیا گیا ہے۔",
      "ان کے بیان کا اہم نکتہ یہ ہے کہ ہر زمانے میں امام کی شناخت اور آئندہ ائمہؑ کی تفصیلات عوامی سطح پر یکساں طور پر بیان کرنا ممکن نہیں تھا۔ سیاسی نگرانی اور جانی خطرات کے باعث بعض معلومات محدود حلقوں اور قابلِ اعتماد افراد کے ذریعے منتقل ہوتی تھیں۔ اس زاویے سے خاموشی یا محدود ابلاغ کو علمی کمزوری نہیں بلکہ کبھی کبھی حفاظتی حکمتِ عملی کے طور پر سمجھا جا سکتا ہے۔",
      "یہ مواد امام حسن عسکریؑ کے عہد پر گفتگو کرتے وقت بہت مفید ہے، کیونکہ اس سے سامع کو سمجھایا جا سکتا ہے کہ سامرہ کا زمانہ اچانک پیدا ہونے والا بحران نہیں تھا؛ اس سے پہلے کئی نسلوں میں ایک ایسا علمی و ارتباطی ڈھانچہ تیار ہو چکا تھا جو شدید پابندی کے باوجود دینی continuity برقرار رکھ سکے۔",
      "منبری ترتیب میں پہلے 'تاریخ کو process کے طور پر پڑھنا' مرکزی مقدمہ بن سکتا ہے، پھر مختلف ادوار میں ابلاغ کے مختلف طریقے، اور آخر میں آج کے حالات میں حکمت، حفاظت اور دینی ذمہ داری کے درمیان توازن کا سوال۔",
    ],
    materialEn: [
      "Kashani treats the history of the Imams as one continuous movement rather than isolated biographies. The public introduction of Ahl al-Bayt in the Prophet's lifetime, later political efforts to marginalize their authority, and the gradual rebuilding of scholarly and social authority from Imam al-Sajjad through Imam al-Sadiq are presented as one connected historical process.",
      "A key point is that the identity of the Imam and details of the full line of Imams could not always be announced openly in the same way. Surveillance and danger meant that some knowledge had to move through restricted circles and trusted people. Limited communication, in this reading, can be a protective strategy rather than a sign of intellectual weakness.",
      "This is especially useful for discussing Imam al-Askari: the Samarra period was not an isolated emergency. It rested on generations of scholarly and communicative infrastructure capable of preserving religious continuity under pressure.",
      "A sermon can therefore begin with 'reading history as a process,' move to changing methods of communication across political eras, and end with the present-day balance between wisdom, protection, and religious responsibility.",
    ],
    takeawaysUr: [
      "اہل بیتؑ کی دینی مرجعیت مختلف تاریخی ادوار میں مختلف طریقوں سے محفوظ کی گئی۔",
      "خفقان کی وجہ سے بعض اوقات عمومی تبلیغ کے بجائے محدود اور محفوظ علمی transmission اختیار کیا گیا۔",
      "امام حسن عسکریؑ کے زمانے کو سمجھنے کے لیے پہلے کے ائمہؑ کے institutional groundwork کو دیکھنا ضروری ہے۔",
      "تاریخ کو isolated incidents کے بجائے ایک مسلسل process کے طور پر پڑھنے کا منبری زاویہ ملتا ہے۔",
    ],
    takeawaysEn: [
      "The religious authority of Ahl al-Bayt was preserved differently in different political eras.",
      "Repression sometimes required controlled scholarly transmission rather than open public communication.",
      "The age of Imam al-Askari is better understood against the institutional groundwork of earlier Imams.",
      "The sermon models reading history as a continuous process rather than disconnected incidents.",
    ],
    sourceLabelUr: "حامد کاشانی — مکمل مکتوب خطاب",
    sourceLabelEn: "Hamed Kashani — full public transcript",
    sourceUrl: "https://www.hkashani.com/?p=14031",
  },
  {
    id: "turabi-tawhid-shirk",
    speakerId: "rashid-turabi",
    topicIds: ["tawhid"],
    kind: "compiled-majalis",
    status: "catalog-only",
    titleUr: "مجالس ترابی، جلد اول: توحید اور شرک",
    titleEn: "Majalis-e-Turabi, vol. 1: Tawhid and Shirk",
    topicsUr: ["توحید", "شرک", "عقائد", "مجالس"],
    topicsEn: ["Tawhid", "shirk", "doctrine", "majalis"],
    summaryUr:
      "مآب لائبریری میں علامہ رشید ترابیؒ کے خطابات کا یہ باقاعدہ محفوظ مجموعہ 'توحید اور شرک' کے عنوان سے موجود ہے۔ اس مرحلے پر Qalam اسے حقیقی source record کے طور پر دکھاتا ہے؛ مکمل متن ingest کیے بغیر اس کی طرف کوئی مخصوص دعویٰ یا قول منسوب نہیں کرتا۔",
    summaryEn:
      "MAAB Library preserves this published collection of Allama Rashid Turabi's majalis under the title 'Tawhid and Shirk'. Qalam treats it here as a real source record and does not attribute specific claims to Turabi until the full text has been ingested.",
    takeawaysUr: [
      "توحید و شرک پر رشید ترابیؒ کے اصل مرتب شدہ منبری corpus کا مستند سراغ۔",
      "مکمل متن ingest ہونے کے بعد مجلس بہ مجلس thesis، دلائل اور اقتباسات index کیے جا سکتے ہیں۔",
    ],
    takeawaysEn: [
      "A verified route to Turabi's compiled pulpit corpus on Tawhid and shirk.",
      "Once the full text is ingested, Qalam can index each majlis by thesis, argument, and excerpt.",
    ],
    sourceLabelUr: "مآب لائبریری — محفوظ مجموعۂ مجالس",
    sourceLabelEn: "MAAB Library — archived majalis collection",
    sourceUrl: "https://maablib.org/category/majaaalis-books/",
  },
  {
    id: "turabi-kufran-hayat",
    speakerId: "rashid-turabi",
    topicIds: [],
    kind: "compiled-majalis",
    status: "catalog-only",
    titleUr: "مجالس ترابی، جلد دوم: کفرانِ نعمت اور حیاتِ طیبہ",
    titleEn: "Majalis-e-Turabi, vol. 2: Ingratitude and the Good Life",
    topicsUr: ["کفران نعمت", "حیات طیبہ", "اخلاق", "مجالس"],
    topicsEn: ["ingratitude", "hayat tayyiba", "ethics", "majalis"],
    summaryUr:
      "یہ علامہ رشید ترابیؒ کے مرتب شدہ مجالس کا دوسرا محفوظ مجموعہ ہے جس کا موضوعی عنوان 'کفرانِ نعمت اور حیاتِ طیبہ' ہے۔ ابھی Qalam صرف verified bibliographic/source information دکھاتا ہے؛ متن کی حقیقی indexing اگلے ingest مرحلے میں ہوگی۔",
    summaryEn:
      "This is a preserved second volume of Rashid Turabi's compiled majalis, titled around ingratitude and hayat tayyiba. At this stage Qalam shows verified source information only; detailed content indexing belongs to the next ingestion phase.",
    takeawaysUr: [
      "اخلاقی و قرآنی موضوعات پر رشید ترابیؒ کے اصل منبری corpus کا قابلِ تصدیق ماخذ۔",
      "کوئی fabricated خلاصہ نہیں؛ detailed claims مکمل متن ingest ہونے کے بعد ہی۔",
    ],
    takeawaysEn: [
      "A verifiable source for Turabi's pulpit corpus on Qur'anic and ethical themes.",
      "No fabricated content summary; detailed claims wait for full-text ingestion.",
    ],
    sourceLabelUr: "مآب لائبریری — محفوظ مجموعۂ مجالس",
    sourceLabelEn: "MAAB Library — archived majalis collection",
    sourceUrl: "https://maablib.org/majalas-e-turabi-jild02-kufran-e-nimat-aur-hayat-tyyaba-turabi-mrtba-doctor-syed-zameer-akhtar-naqvi/",
  },
  {
    id: "turabi-dua-itmam",
    speakerId: "rashid-turabi",
    topicIds: ["dua"],
    kind: "compiled-majalis",
    status: "catalog-only",
    titleUr: "مجالس ترابی، جلد سوم: دعا اور اتمامِ نعمت",
    titleEn: "Majalis-e-Turabi, vol. 3: Dua and Completion of Blessing",
    topicsUr: ["دعا", "نعمت", "عبادت", "مجالس"],
    topicsEn: ["dua", "blessing", "worship", "majalis"],
    summaryUr:
      "مآب کے محفوظات میں رشید ترابیؒ کے مجالس کا ایک مستقل مجموعہ 'دعا اور اتمامِ نعمت' کے عنوان سے موجود ہے۔ Qalam اسے موضوعی source lead کے طور پر پیش کرتا ہے، نہ کہ ابھی سے استخراج شدہ قول کے طور پر۔",
    summaryEn:
      "MAAB preserves a dedicated collection of Turabi's majalis titled 'Dua and Completion of Blessing'. Qalam exposes it as a topic-level source lead, not as an extracted quotation or claim.",
    takeawaysUr: [
      "دعا کے موضوع پر رشید ترابیؒ کے حقیقی محفوظ corpus تک براہِ راست رسائی۔",
      "بعد کے مرحلے میں صفحات/مجالس کی indexing کے ساتھ حقیقی خلاصے اور مختصر اقتباسات شامل کیے جا سکیں گے۔",
    ],
    takeawaysEn: [
      "Direct access to a real preserved Turabi corpus on dua.",
      "Later full-text indexing can add page-level summaries and short verified excerpts.",
    ],
    sourceLabelUr: "مآب لائبریری — محفوظ مجموعۂ مجالس",
    sourceLabelEn: "MAAB Library — archived majalis collection",
    sourceUrl: "https://maablib.org/category/majaaalis-books/",
  },
];

export function normalizeSpeakerEvidenceUrdu(item: SpeakerEvidence): SpeakerEvidence {
  return {
    ...item,
    titleUr: pureKhateebUrdu(item.titleUr),
    topicsUr: item.topicsUr.map(pureKhateebUrdu),
    summaryUr: pureKhateebUrdu(item.summaryUr),
    materialUr: item.materialUr?.map(pureKhateebUrdu),
    takeawaysUr: item.takeawaysUr.map(pureKhateebUrdu),
    sourceLabelUr: pureKhateebUrdu(item.sourceLabelUr),
  };
}

export function evidenceForSpeaker(speakerId: string): readonly SpeakerEvidence[] {
  return SPEAKER_EVIDENCE.filter(
    (item) => item.speakerId === speakerId && item.status === "ready",
  ).map(normalizeSpeakerEvidenceUrdu);
}

/** Internal catalog records: known sources whose actual contents are not yet ingested. */
export function catalogEvidenceForSpeaker(speakerId: string): readonly SpeakerEvidence[] {
  return SPEAKER_EVIDENCE.filter(
    (item) => item.speakerId === speakerId && item.status === "catalog-only",
  );
}
