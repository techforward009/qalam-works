export type SpeakerEvidenceKind = "transcript" | "compiled-majalis";

export type SpeakerEvidence = {
  id: string;
  speakerId: string;
  /**
   * Explicit links to year-round topic ids from topicPrep.ts.
   * Never infer these links from generic speaker profile tags.
   */
  topicIds: readonly string[];
  kind: SpeakerEvidenceKind;
  titleUr: string;
  titleEn: string;
  dateLabel?: string;
  topicsUr: readonly string[];
  topicsEn: readonly string[];
  summaryUr: string;
  summaryEn: string;
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
  {
    id: "kashani-askari-1402",
    speakerId: "hamed-kashani",
    topicIds: ["imamate"],
    kind: "transcript",
    titleUr: "امام حسن عسکریؑ کے عہدِ حیات پر ایک نظر",
    titleEn: "A reflection on the lifetime of Imam Hasan al-Askari",
    dateLabel: "2 Mehr 1402 SH",
    topicsUr: ["امام حسن عسکریؑ", "امامت", "شیعہ علمی نیٹ ورک", "اخلاق", "تبلیغ"],
    topicsEn: ["Imam Hasan al-Askari", "Imamate", "Shi'i scholarly networks", "ethics", "religious outreach"],
    summaryUr:
      "حامد کاشانی اس خطاب میں امام حسن عسکریؑ کے دور کو مختصر مگر نہایت دشوار اور پُرثمر زمانہ قرار دیتے ہیں۔ ان کے بیان کا مرکزی زاویہ یہ ہے کہ سیاسی دباؤ کے باعث ائمہؑ نے صرف عمومی خطابت پر انحصار نہیں کیا بلکہ منتخب اہلِ علم اور تربیت یافتہ افراد کے ذریعے معارف، فقہ اور اجتماعی رابطے کو محفوظ رکھا۔ وہ اس تاریخی بحث کو آج کی دینداری سے جوڑتے ہوئے کہتے ہیں کہ دینی اداروں اور مجالس کی کامیابی کا معیار محض اجتماع نہیں بلکہ یہ ہے کہ ان کے نتیجے میں صداقت، امانت، قرآن سے تعلق، مسجد سے وابستگی اور خاندانی اخلاق بہتر ہوں۔",
    summaryEn:
      "Kashani presents Imam Hasan al-Askari's period as short, difficult, and highly productive. His central line is that political pressure pushed the Imams to preserve knowledge and community through trained scholars and trusted individuals, not public preaching alone. He then links that history to the present: the success of religious institutions should be judged by moral outcomes such as truthfulness, trustworthiness, attachment to the Qur'an and mosque, and healthier family conduct.",
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
    titleUr: "امام عسکریؑ کی بعض فکری و اجتماعی دغدغه‌ها — جلسہ اول",
    titleEn: "Some concerns of Imam al-Askari — session 1",
    dateLabel: "3 Aban 1399 SH",
    topicsUr: ["امام حسن عسکریؑ", "اہل بیتؑ کی مرجعیت", "تاریخ تشیع", "خفقان", "تبلیغ"],
    topicsEn: ["Imam Hasan al-Askari", "authority of Ahl al-Bayt", "Shi'i history", "repression", "religious communication"],
    summaryUr:
      "اس خطاب میں کاشانی مختلف ادوارِ ائمہؑ کو ایک مسلسل تاریخی عمل کے طور پر دیکھتے ہیں۔ وہ رسولؐ کے زمانے میں اہل بیتؑ کے مقام کی معرفی، بعد کے سیاسی دباؤ، اور پھر امام سجادؑ، امام باقرؑ اور امام صادقؑ کے زمانے میں اہل بیتؑ کی علمی و سماجی حیثیت کی تدریجی بازیابی کا خاکہ پیش کرتے ہیں۔ ان کے مطابق عمومی طور پر امام اور ائمہؑ کی تعداد و شناخت کو کھلے عام بیان کرنا ہمیشہ ممکن نہ تھا، کیونکہ ایسا کرنے سے خود امام اور شیعہ نیٹ ورک کی سلامتی متاثر ہو سکتی تھی۔",
    summaryEn:
      "Kashani reads the different eras of the Imams as one continuous historical process: public introduction of Ahl al-Bayt in the Prophet's lifetime, later political marginalization, and a gradual rebuilding of scholarly and social authority under Imams al-Sajjad, al-Baqir, and al-Sadiq. He argues that open public identification of the Imam and the full line of Imams was not always possible because of security pressure on the Imam and the Shi'i network.",
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

export function evidenceForSpeaker(speakerId: string): readonly SpeakerEvidence[] {
  return SPEAKER_EVIDENCE.filter((item) => item.speakerId === speakerId);
}
