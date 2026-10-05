"use client";

import { useLanguage } from "../../lib/language-context";
import { ahmedgrafQuranReference } from "../arabic-diacritics/quran/ahmedgrafProvider";
import DeathSpeakingGuide from "./DeathSpeakingGuide";
import KhateebScriptText from "./KhateebScriptText";
import KhateebQuranTranslation from "./KhateebQuranTranslation";
import { quranLocationsFromReference } from "./engine/quranTranslationProvider";
import { topicGuideMinutes, topicGuideSections, topicGuideSourceLeads } from "./engine/topicSpeakingGuide";
import type { TopicPrep } from "./engine/topicPrep";
import type { SermonDuration } from "./engine/sermonPrep";
import type { SpeakingGuideMode } from "./engine/deathSpeakingGuide";

export default function TopicSpeakingGuide({ topic, duration, mode, onModeChange }: {
  topic: TopicPrep; duration: SermonDuration; mode: SpeakingGuideMode; onModeChange: (mode: SpeakingGuideMode) => void;
}) {
  const { language } = useLanguage();
  const locale = language === "ur" ? "ur" : "en";
  const ur = locale === "ur";
  if (topic.id === "death-akhirah") return <DeathSpeakingGuide duration={duration} mode={mode} onModeChange={onModeChange} />;
  const sections = topicGuideSections(topic);
  const minutes = topicGuideMinutes(topic, duration);
  if (!sections.length) return null;
  const locations = [...new Map(topic.quran.flatMap(anchor => quranLocationsFromReference(anchor.ref)).map(location => [`${location.surah}:${location.ayah}`, location])).values()];
  return (
    <section aria-label={ur ? "بیان کی رہنمائی" : "Speaking guide"} dir={ur ? "rtl" : "ltr"} className="mt-5 space-y-4">
      <div className="rounded-xl border border-[#B8935A]/25 bg-white p-4 dark:bg-[#162a1e]">
        <h4 className="font-bold">{ur ? "مواد کس صورت میں چاہیے؟" : "How would you like to read the material?"}</h4>
        <div role="group" aria-label={ur ? "مواد کی تفصیل" : "Material detail"} className="khateeb-no-print mt-3 flex flex-wrap gap-2">
          {(["brief", "detailed"] as const).map(value => <button key={value} type="button" aria-pressed={mode === value} onClick={() => onModeChange(value)} className={`rounded-full border px-4 py-2 text-sm ${mode === value ? "bg-[#1A3A2A] text-white" : "border-[#B8935A]/40"}`}>{value === "brief" ? (ur ? "مختصر نکات" : "Brief points") : (ur ? "تفصیلی وضاحت" : "Detailed explanation")}</button>)}
        </div>
        <p className="mt-3 text-sm leading-8">{ur ? "یہ ایک مجلس کے لیے قلم ورکس کی تدوینی رہنمائی ہے؛ مثالیں فرضی ہیں۔ وقت کی تقسیم مجوزہ ہے، اسے خطیب اپنے سامع اور بیان کے مطابق کھولے۔ اصل آیات اور تراجم الگ ہیں، مزید تحقیقی مواد اس رہنمائی کے بعد ہے۔" : "This is Qalam Works editorial guidance for one sermon; examples are hypothetical. Timing is suggested: expand the material for your listeners and delivery. Verses and translations are separate, with further research below."}</p>
      </div>
      <div className="rounded-xl bg-white p-4 dark:bg-[#162a1e]">
        <h4 className="font-bold">{ur ? "آغاز اور مرکزی سوال" : "Opening and governing question"} — {minutes[0]} {ur ? "منٹ" : "min"}</h4>
        <p className="mt-2 text-sm leading-8">{ur ? topic.openingUr : topic.openingEn}</p>
        <p className="mt-2 text-sm leading-8">{ur ? "سامعین کو غور کا موقع دیں؛ پھر مرکزی بات واضح کریں: " : "Give listeners time to reflect, then establish the central point: "}{ur ? topic.themeUr : topic.themeEn}</p>
      </div>
      <div className="rounded-xl border border-[#B8935A]/25 bg-white p-4 dark:bg-[#162a1e]">
        <h4 className="font-bold">{ur ? "اصل قرآنی بنیاد" : "Qur'anic source verses"}</h4>
        {locations.map(location => <div key={`${location.surah}:${location.ayah}`} className="mt-3 rounded-lg bg-[#F7F5EF] p-3 dark:bg-[#0e1c15]">
          <h5 className="text-xs font-bold">{location.surah}:{location.ayah}</h5>
          <div dir="rtl" className="mt-2 text-lg leading-9"><KhateebScriptText text={ahmedgrafQuranReference.getAyah(location.surah, location.ayah)?.text ?? ""} forceArabic /></div>
          <KhateebQuranTranslation location={location} />
        </div>)}
      </div>
      <nav aria-label={ur ? "زاویوں کی فہرست" : "Guide sections"} className="khateeb-no-print flex flex-wrap gap-2">
        {sections.map((section, index) => <a key={section.id} href={`#guide-${section.id}`} className="rounded-lg border border-[#B8935A]/30 px-3 py-2 text-sm">{index + 1}. {section.heading[locale]}</a>)}
      </nav>
      {sections.map((section, index) => <article id={`guide-${section.id}`} key={section.id} className="scroll-mt-28 rounded-xl border border-[#B8935A]/25 bg-white p-4 dark:bg-[#162a1e]">
        <h4 className="font-bold">{index + 1}. {section.heading[locale]} — {minutes[index + 1]} {ur ? "منٹ" : "min"}</h4>
        <p className="mt-2 text-sm font-semibold leading-8">{section.point[locale]}</p>
        {mode === "detailed" ? <>
          <div className="mt-4 rounded-lg border border-[#31513a]/25 bg-[#f5faf6] p-3 dark:bg-[#122319]">
            <h5 className="text-sm font-bold">{ur ? "براہِ راست قابلِ بیان عبارت — قلم ورکس کی تدوین" : "Ready-to-deliver paragraph — Qalam Works editorial material"}</h5>
            <p className="mt-2 text-sm leading-8">{section.delivery[locale]}</p>
          </div>
          <h5 className="mt-4 text-sm font-bold">{ur ? "خطیبانہ وضاحت — قلم ورکس کی تدوین" : "Speaking explanation — Qalam Works editorial material"}</h5>
          <p className="mt-2 whitespace-pre-line text-sm leading-8">{section.explanation[locale]}</p>
          <div className="mt-3 rounded-lg border border-[#B8935A]/25 p-3 text-sm leading-8"><strong>{ur ? "فرضی روزمرہ مثال: " : "Hypothetical everyday example: "}</strong>{section.example[locale]}</div>
        </> : null}
        <p className="mt-3 text-sm leading-8"><strong>{ur ? "سامعین سے سوال: " : "Audience question: "}</strong>{section.question[locale]}</p>
        <p className="mt-2 text-sm leading-8"><strong>{ur ? "عملی قدم: " : "Practical step: "}</strong>{section.action[locale]}</p>
        {mode === "detailed" ? <p className="mt-3 border-t border-[#B8935A]/25 pt-3 text-sm leading-8"><strong>{ur ? "اگلے حصے سے ربط: " : "Transition: "}</strong>{section.transition[locale]}</p> : null}
      </article>)}
      <div className="rounded-xl border border-[#B8935A]/25 bg-[#fbf7ee] p-4 dark:bg-[#241f14]">
        <h4 className="font-bold">{ur ? "اختتام اور دعوتِ عمل" : "Closing and action"} — {minutes[minutes.length - 1]} {ur ? "منٹ" : "min"}</h4>
        <p className="mt-2 text-sm leading-8">{ur ? "مرکزی سوال کی طرف واپس آئیں۔ سامع سے ایک ممکن عمل اور اس کا وقت منتخب کرنے کو کہیں، پھر عمل کی توفیق کی دعا کریں۔" : "Return to the opening question. Invite listeners to choose one possible action and a time for it, then pray for the strength to act."}</p>
      </div>
      <div className="rounded-xl border border-[#B8935A]/25 bg-white p-4 dark:bg-[#162a1e]">
        <h4 className="font-bold">{ur ? "مزید مطالعے کے ماخذ" : "Further-study leads"}</h4>
        <p className="mt-2 text-sm leading-8">{ur ? "یہ مطالعے کی سمت ہے؛ ان کتابوں سے کوئی عبارت بیان کرتے وقت مکمل اصل حوالہ دیکھیں۔" : "These are reading leads; consult the full original reference before using a passage from these books."}</p>
        {topicGuideSourceLeads(topic, locale).map(source => <div key={source.label} className="mt-3 border-t border-[#B8935A]/20 pt-3 text-sm leading-8"><strong>{source.label}</strong><p>{source.detail}</p></div>)}
      </div>
    </section>
  );
}
