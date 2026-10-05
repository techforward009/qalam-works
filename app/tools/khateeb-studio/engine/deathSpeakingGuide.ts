import { ahmedgrafQuranReference } from "../../arabic-diacritics/quran/ahmedgrafProvider";
import { quranTranslationFor, QURAN_TRANSLATION_SOURCES } from "./quranTranslationProvider";
import type { SermonDuration, SermonLocale } from "./sermonPrep";
import type { SpeakerEvidence } from "./speakerEvidence";
import { KHATEEB_CORPUS } from "./khateebCorpus";
import { speakerName } from "./khateebLocale";
import deliveryParagraphs from "./speakingGuides/deliveryParagraphs.json";

export type SpeakingGuideMode = "brief" | "detailed";
type Bilingual = { ur: string; en: string };
export type SpeakingGuideSection = {
  id: string;
  heading: Bilingual;
  point: Bilingual;
  verses: readonly { surah: number; ayah: number }[];
  explanation: { ur: readonly string[]; en: readonly string[] };
  example: Bilingual;
  question: Bilingual;
  action: Bilingual;
  transition: Bilingual;
  delivery: Bilingual;
};

const DEATH_SECTION_DRAFTS: readonly Omit<SpeakingGuideSection, "delivery">[] = [
  {
    id: "priorities",
    heading: { ur: "موت کی یاد اور زندگی کی ترجیحات", en: "Remembering death and reordering life" },
    point: { ur: "موت کی یاد زندگی چھوڑنے کی دعوت نہیں؛ زندگی کو صحیح مقصد کے ساتھ گزارنے کی دعوت ہے۔", en: "Remembering death invites us to live with purpose, rather than withdraw from life." },
    verses: [{ surah: 3, ayah: 185 }],
    explanation: {
      ur: [
        "بات کسی خوف ناک منظر سے شروع نہ کریں۔ سامعین سے زندگی کے ایک مانوس تجربے کی طرف آئیں: ہم جس کام کو اہم سمجھتے ہیں، اس کے لیے وقت نکالتے ہیں۔ سوال یہ ہے کہ ہمارے وقت کی تقسیم ہمارے دعووں کی تائید کرتی ہے یا نہیں؟",
        "پوری آیت پڑھ کر واضح کریں کہ اس میں موت کے ساتھ اجر، کامیابی اور دنیا کی حقیقت کا ذکر بھی ہے۔ صرف ابتدائی جملہ لے کر موضوع کو خوف تک محدود نہ کریں۔ آیت انسان کو اپنے انجام کی روشنی میں کامیابی کا پیمانہ سمجھنے کی دعوت دیتی ہے۔",
        "اس سے خطیبانہ ربط یوں بنائیں: روزگار، تعلیم اور گھر کی ذمہ داریاں اپنی جگہ اہم ہیں؛ سوال یہ ہے کہ کیا ان کے ساتھ عبادت، دیانت اور لوگوں کے حقوق کے لیے بھی جگہ ہے؟ زندگی کی محدود مدت ہمیں اپنی ذمہ داریاں بہتر طور پر ادا کرنے کی طرف لے جائے۔",
      ],
      en: [
        "Begin with a familiar experience rather than a frightening scene: we make time for what we consider important. Ask whether the way we spend our time supports what we say matters to us.",
        "Read the whole verse. Alongside death, it speaks of recompense, success, and worldly life. Do not reduce its message to the opening clause or to fear alone. It invites the listener to consider success in the light of their ultimate destination.",
        "Develop the editorial link: work, education, and family responsibilities matter. Do worship, honesty, and the rights of others also have room in our lives? Awareness of a limited lifetime should help us fulfil our responsibilities better.",
      ],
    },
    example: { ur: "ایک فرضی روزمرہ مثال: ایک شخص دفتر کے ہر ضروری کام کے لیے وقت نکالتا ہے، مگر والدین سے گفتگو اور ایک ناراض دوست سے معاملہ درست کرنے کو مسلسل کل پر چھوڑ دیتا ہے۔ اس کی مصروفیت حقیقی ہے؛ اب اسے اپنی ترجیحات میں ان ذمہ داریوں کی جگہ بھی بنانی ہے۔", en: "A hypothetical everyday example: someone makes time for every urgent work task but repeatedly postpones speaking with their parents or repairing a disagreement with a friend. Their workload is real; those responsibilities also need a place in their priorities." },
    question: { ur: "آپ کی زندگی میں کون سا اہم کام مصروفیت کی وجہ سے بار بار مؤخر ہورہا ہے؟", en: "Which important responsibility do you repeatedly postpone because you are busy?" },
    action: { ur: "آج ایک مؤخر ذمہ داری منتخب کرکے اس کے لیے وقت مقرر کریں؛ صرف نیت کے بجائے پہلا ممکن قدم بھی طے کریں۔", en: "Choose one postponed responsibility today, set a time for it, and identify the first practical step." },
    transition: { ur: "ترجیحات درست کرنے کا ایک اہم معیار یہ ہے کہ ہماری زندگی سے دوسرے لوگوں کو کیا مل رہا ہے؛ اب لوگوں کے حقوق کی طرف آئیں۔", en: "One measure of our priorities is what other people receive from us. Turn next to their rights." },
  },
  {
    id: "rights",
    heading: { ur: "لوگوں کے حقوق اور اپنا حساب", en: "The rights of others and self-examination" },
    point: { ur: "آخرت کی تیاری میں اپنے رویّے، امانتوں اور دوسروں کے ساتھ معاملات کا جائزہ بھی شامل کریں۔", en: "Preparation for the Hereafter includes examining our conduct, entrusted responsibilities, and dealings with others." },
    verses: [{ surah: 59, ayah: 18 }],
    explanation: {
      ur: [
        "آیت ہر شخص کو یہ دیکھنے کی دعوت دیتی ہے کہ اس نے آنے والے کل کے لیے کیا بھیجا ہے۔ اس میں لوگوں کے حقوق کی الگ تفصیلی فہرست نہیں؛ یہاں حقوق کا ذکر اسی خود احتسابی کے اصول کی عملی توضیح ہے۔ اسے آیت کے لفظی ترجمے سے الگ بیان کریں۔",
        "سامع کو صرف دوسروں کی غلطیاں یاد نہ دلائیں۔ بات اپنے معاملات سے شروع کریں: کیا میرے پاس کسی کی امانت ہے؟ کیا میرے رویّے سے کسی کی عزت مجروح ہوئی؟ کیا کوئی ذمہ داری میرے سپرد ہے جسے میں مسلسل ٹال رہا ہوں؟ ہر شخص اپنے حالات کے مطابق جواب تلاش کرے۔",
        "عبادت اور اچھے معاملات کو مقابل نہ بنائیں۔ خطیبانہ مقصد یہ ہے کہ آخرت کی یاد ہماری گفتگو، وعدوں اور ذمہ داریوں میں بھی نظر آئے۔ صرف کسی کے لیے دعا کرنا، قابلِ ادائیگی حق کی عملی ادائیگی کی جگہ نہ لے۔",
      ],
      en: [
        "The verse asks each soul to consider what it has sent ahead for tomorrow. It does not provide a separate detailed list of interpersonal rights; this section applies its principle of self-examination to our dealings. Keep that application distinct from the literal translation.",
        "Do not invite the audience merely to recall other people's faults. Start with our own dealings: am I holding something entrusted to me, have I harmed someone's dignity, or am I postponing a responsibility? Each listener should examine their own circumstances.",
        "Do not set worship against good dealings. The aim is to let remembrance of the Hereafter shape speech, promises, and responsibilities. Praying for someone should not replace the practical fulfilment of a right that can be fulfilled.",
      ],
    },
    example: { ur: "ایک فرضی مثال: کسی سے کتاب امانت لی، پھر بھول گئے۔ کتاب چھوٹی چیز ہے، مگر اسے واپس کرنا ایک واضح ذمہ داری ہے۔ اسی مانوس مثال سے بات شروع کریں اور پھر سامع کو اپنے بڑے معاملات کا جائزہ لینے دیں۔", en: "A hypothetical example: someone borrows a book and forgets to return it. The object is small, but returning it is a clear responsibility. Start with this familiar situation, then let listeners examine their larger dealings." },
    question: { ur: "کیا کوئی امانت یا ذمہ داری ایسی ہے جسے آپ آج درست کرنا شروع کرسکتے ہیں؟", en: "Is there an entrusted item or responsibility you can begin putting right today?" },
    action: { ur: "ایک ذمہ داری لکھیں، اس کی ادائیگی کا ممکن طریقہ طے کریں، اور پہلا قدم اٹھائیں۔", en: "Write down one responsibility, identify how you can fulfil it, and take the first step." },
    transition: { ur: "اپنے حساب میں کمی نظر آئے تو مایوسی نہیں، اصلاح کا آغاز مطلوب ہے؛ اسی سے توبہ میں تاخیر کا سوال پیدا ہوتا ہے۔", en: "Finding a shortcoming should lead to repair rather than despair. This brings us to postponing repentance." },
  },
  {
    id: "repentance",
    heading: { ur: "توبہ اور اصلاح کو مؤخر نہ کریں", en: "Do not postpone repentance and repair" },
    point: { ur: "اصلاح کی ضرورت سمجھ میں آجائے تو اس کے آغاز کو غیر معین مستقبل پر نہ چھوڑیں۔", en: "Once we recognize the need for change, we should not leave its beginning to an undefined future." },
    verses: [{ surah: 59, ayah: 18 }, { surah: 39, ayah: 53 }],
    explanation: {
      ur: [
        "پچھلے حصے سے بات آگے بڑھائیں: اپنے اندر کمی پہچاننا اہم ہے، لیکن پہچان کے بعد قدم اٹھانا بھی ضروری ہے۔ ہم کبھی بہتر فرصت، کبھی عمر کے اگلے مرحلے اور کبھی حالات بدلنے کا انتظار کرتے رہتے ہیں۔ خطیب اس عادت کو نرم لہجے میں سامنے لائے۔",
        "سورۂ حشر کی آیت عمل کا جائزہ لینے اور سورۂ زمر کی آیت رحمت سے مایوس نہ ہونے کی بنیاد فراہم کرتی ہے۔ ان سے یہ تدوینی ربط بنائیں کہ اصلاح کا راستہ امید کے ساتھ اختیار کیا جائے۔ یہ جملہ کہ ہمیں کل کی مہلت کا علم نہیں، ہماری وضاحت ہے؛ اسے قرآن کے اصل الفاظ بنا کر نہ پڑھیں۔",
        "توبہ کو محض ایک جذباتی لمحے تک محدود نہ کریں۔ سامع کو اپنی غلطی تسلیم کرنے، اسے چھوڑنے، دوبارہ بچنے کی تدبیر کرنے، اور جہاں کسی کا حق متاثر ہوا ہو وہاں تلافی کی طرف متوجہ کریں۔ یہاں مقصد عملی بیداری ہے؛ کسی مخصوص شخص کے معاملے کا فیصلہ کرنا نہیں۔",
      ],
      en: [
        "Continue from the previous section: recognizing a shortcoming matters, but taking action matters too. We may wait for more time, another stage of life, or different circumstances. Bring this habit before the audience gently.",
        "The verse from al-Hashr grounds examination of our deeds; the verse from al-Zumar grounds hope in mercy. The editorial connection is to begin repair with hope. The observation that we do not know how much time remains is an explanation, not a quotation of these verses.",
        "Do not reduce repentance to a moment of emotion. Invite listeners to acknowledge a wrong, leave it, plan how to avoid returning to it, and attend to repair where another person's right has been affected. The aim is practical awakening, rather than deciding an individual case.",
      ],
    },
    example: { ur: "ایک فرضی روزمرہ مثال: ایک شخص غصے میں گھر والوں سے سخت بات کرتا ہے اور ہر بار سوچتا ہے کہ کبھی اپنا مزاج درست کروں گا۔ آج وہ ایک قابلِ عمل فیصلہ کرتا ہے: غصے کے وقت فوراً جواب دینے کے بجائے توقف کرے گا، اور اپنی پچھلی سختی کی اصلاح بھی شروع کرے گا۔", en: "A hypothetical everyday example: someone speaks harshly to family members when angry and keeps promising to change someday. Today they choose one practical response: pause before answering in anger and begin repairing the effects of earlier harshness." },
    question: { ur: "آپ کس تبدیلی کو بار بار «بعد میں» پر چھوڑ رہے ہیں؟", en: "Which change do you repeatedly leave until later?" },
    action: { ur: "ایک غلط رویّہ منتخب کریں، آج اسے روکنے کی ایک تدبیر اختیار کریں اور رات کو اپنے عمل کا مختصر جائزہ لیں۔", en: "Choose one harmful habit, adopt one way to interrupt it today, and review your action briefly tonight." },
    transition: { ur: "اصلاح کا فیصلہ تب قائم رہتا ہے جب جواب دہی کا احساس اور رحمت کی امید ساتھ ہوں؛ آخری حصے میں اسی توازن کو واضح کریں۔", en: "A decision to change is strengthened by both accountability and hope in mercy. Clarify that balance in the final section." },
  },
  {
    id: "hope",
    heading: { ur: "جواب دہی کا احساس اور رحمت کی امید", en: "Accountability and hope in mercy" },
    point: { ur: "خوف انسان کو ذمہ دار بنائے، اور امید اسے اصلاح سے دست بردار نہ ہونے دے۔", en: "Fear should encourage responsibility, while hope should sustain the effort to change." },
    verses: [{ surah: 3, ayah: 185 }, { surah: 39, ayah: 53 }],
    explanation: {
      ur: [
        "پہلی آیت انجام اور کامیابی کی یاد دلاتی ہے، جبکہ دوسری اللہ کی رحمت سے مایوس ہونے سے روکتی ہے۔ دونوں کو سامنے رکھیں تاکہ موضوع نہ صرف خوف کی مجلس بنے، نہ ذمہ داری سے بے نیازی کی بات۔",
        "سامع کو یہ احساس دیں کہ گزشتہ غلطیوں کا اعتراف اس کی پوری شخصیت کو بے قدر نہیں بناتا۔ اصلاح کا اگلا قدم اہم ہے۔ ساتھ یہ بھی واضح رہے کہ امید کا مطلب اپنی غلطی جاری رکھنے کا جواز نہیں؛ امید کوشش کو زندہ رکھنے کا سہارا ہے۔",
        "اختتام پر پورے موضوع کو ایک مربوط دعوت میں جمع کریں: وقت کی قدر، لوگوں کے حقوق کا خیال، اصلاح کا آغاز، اور رحمت کی امید۔ سامع پر کئی بڑے وعدوں کا بوجھ ڈالنے کے بجائے اسے ایک واضح اور ممکن عمل کے ساتھ واپس بھیجیں۔",
      ],
      en: [
        "The first verse recalls our destination and the meaning of success; the second forbids despair of God's mercy. Keep both in view so the sermon becomes neither an exercise in fear alone nor an invitation to disregard responsibility.",
        "Help listeners see that acknowledging past wrongs does not make their whole person worthless. The next step of repair matters. Hope does not justify continuing a wrong; it sustains the effort to change.",
        "Close by drawing the subject together: value time, attend to others' rights, begin repair, and preserve hope in mercy. Rather than burdening listeners with many large promises, send them away with one clear, possible action.",
      ],
    },
    example: { ur: "ایک فرضی مثال: غلطی معلوم ہونے پر ایک شخص کہتا ہے کہ اب کچھ نہیں ہوسکتا؛ دوسرا غلطی مان کر اپنی استطاعت کے مطابق اصلاح شروع کرتا ہے۔ دونوں کے ماضی میں کمی ہے، مگر دوسرے نے امید کو عمل سے جوڑا ہے۔", en: "A hypothetical example: after recognizing a mistake, one person concludes that nothing can be done; another acknowledges it and begins whatever repair is possible. Both have shortcomings in their past, but the second connects hope with action." },
    question: { ur: "آج کی گفتگو کے بعد آپ کون سا ایک ممکن قدم اٹھائیں گے؟", en: "What one practical step will you take after this discussion?" },
    action: { ur: "اپنا ایک قدم اور اس کا وقت طے کریں؛ اگلے دن دیکھیں کہ اس پر عمل ہوا یا نہیں۔", en: "Choose one action and a time for it; check the following day whether you carried it out." },
    transition: { ur: "دعا کے ساتھ اختتام کریں: اللہ ہمیں اپنے وقت کی قدر، حقوق کی ادائیگی اور اصلاح کی توفیق عطا فرمائے۔ یہ تدوینی دعا ہے۔", en: "Close with an editorial prayer: may God enable us to value our time, fulfil our responsibilities, and put our conduct right." },
  },
];
export const DEATH_SPEAKING_GUIDE: readonly SpeakingGuideSection[] = DEATH_SECTION_DRAFTS.map((section, index) => ({ ...section, delivery: deliveryParagraphs["death-akhirah"][index] }));

export function deathGuideMinutes(duration: SermonDuration): readonly number[] {
  return duration === 20 ? [2, 4, 4, 4, 4, 2] : duration === 30 ? [3, 6, 6, 6, 6, 3] : [5, 9, 10, 9, 7, 5];
}

export function buildDeathSpeakingGuideText(locale: SermonLocale, duration: SermonDuration, mode: SpeakingGuideMode, records: readonly SpeakerEvidence[] = []): string {
  const ur = locale === "ur";
  const minutes = deathGuideMinutes(duration);
  const lines = [ur ? "موت و آخرت — بیان کی رہنمائی" : "Death and the Hereafter — speaking guide", `${duration} ${ur ? "منٹ کا مجوزہ خاکہ" : "minute suggested outline"}`, ur ? "مختصر نکات اور تفصیلی وضاحت قلم ورکس کی تدوین ہیں؛ اصل آیات اور تراجم الگ درج ہیں۔" : "The speaking points and explanations are Qalam Works editorial material; verses and translations are identified separately.", `${ur ? "آغاز" : "Opening"}: ${minutes[0]} ${ur ? "منٹ" : "min"}`, ur ? "سامعین سے پوچھیں: اگر زندگی کی مدت معلوم نہیں تو ہم آج کس ذمہ داری کو ترجیح دیں گے؟" : "Ask: if we do not know how long we will live, which responsibility should we prioritize today?"];
  DEATH_SPEAKING_GUIDE.forEach((section, index) => {
    lines.push("", `${section.heading[locale]} — ${minutes[index + 1]} ${ur ? "منٹ" : "min"}`, section.point[locale]);
    for (const location of section.verses) {
      const arabic = ahmedgrafQuranReference.getAyah(location.surah, location.ayah)?.text;
      const translation = quranTranslationFor(location.surah, location.ayah, locale);
      lines.push(`${ur ? "قرآن" : "Qur'an"} ${location.surah}:${location.ayah}`);
      if (arabic) lines.push(arabic);
      if (translation) lines.push(`${ur ? "ترجمہ" : "Translation"}: ${translation}`, QURAN_TRANSLATION_SOURCES[locale][ur ? "sourceLabelUr" : "sourceLabelEn"]);
    }
    if (mode === "detailed") lines.push(ur ? "براہِ راست قابلِ بیان عبارت — قلم ورکس کی تدوین" : "Ready-to-deliver paragraph — Qalam Works editorial material", section.delivery[locale], ur ? "خطیبانہ وضاحت — قلم ورکس کی تدوین" : "Speaking explanation — Qalam Works editorial material", ...section.explanation[locale], `${ur ? "فرضی روزمرہ مثال" : "Hypothetical everyday example"}: ${section.example[locale]}`);
    lines.push(`${ur ? "سامعین سے سوال" : "Audience question"}: ${section.question[locale]}`, `${ur ? "عملی قدم" : "Practical step"}: ${section.action[locale]}`);
    if (mode === "detailed") lines.push(`${ur ? "اگلے حصے سے ربط" : "Transition"}: ${section.transition[locale]}`);
  });
  lines.push("", `${ur ? "اختتام" : "Closing"}: ${minutes[5]} ${ur ? "منٹ" : "min"}`, ur ? "چار باتیں جمع کریں: ترجیحات، لوگوں کے حقوق، اصلاح کا آغاز، اور رحمت کی امید۔ سامع کو ایک ممکن عملی قدم کے ساتھ رخصت کریں۔" : "Bring together priorities, others' rights, beginning repair, and hope in mercy. Leave listeners with one possible action.");
  const relevant = records.filter(record => record.status === "ready" && record.topicIds.includes("death-akhirah"));
  if (relevant.length) {
    lines.push("", ur ? "متعلقہ علمی مواد اور کتابی حوالے" : "Related study material and book references", ur ? "قلم ورکس کے تدوینی خلاصے — اصل کتاب کے لفظی اقتباسات نہیں" : "Qalam Works editorial summaries — not verbatim quotations from the books");
    for (const record of relevant) {
      const speaker = KHATEEB_CORPUS.find(item => item.id === record.speakerId);
      lines.push("", ur ? record.titleUr : record.titleEn);
      if (speaker) lines.push(speakerName(speaker, ur));
      lines.push(ur ? record.summaryUr : record.summaryEn);
      if (mode === "detailed") lines.push(...(ur ? record.materialUr ?? [] : record.materialEn ?? []));
      lines.push(`${ur ? "اصل ماخذ" : "Primary source"}: ${ur ? record.sourceLabelUr : record.sourceLabelEn}`);
      if (record.sourceUrl) lines.push(record.sourceUrl);
    }
  }
  return lines.join("\n");
}
