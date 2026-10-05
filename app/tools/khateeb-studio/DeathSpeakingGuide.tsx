"use client";
import { useLanguage } from "../../lib/language-context";
import { ahmedgrafQuranReference } from "../arabic-diacritics/quran/ahmedgrafProvider";
import KhateebScriptText from "./KhateebScriptText";
import KhateebQuranTranslation from "./KhateebQuranTranslation";
import { DEATH_SPEAKING_GUIDE, deathGuideMinutes, type SpeakingGuideMode } from "./engine/deathSpeakingGuide";
import type { SermonDuration } from "./engine/sermonPrep";

export default function DeathSpeakingGuide({ duration, mode, onModeChange }: {
  duration: SermonDuration;
  mode: SpeakingGuideMode;
  onModeChange: (mode: SpeakingGuideMode) => void;
}) {
  const { language } = useLanguage();
  const locale = language === "ur" ? "ur" : "en";
  const ur = locale === "ur";
  const minutes = deathGuideMinutes(duration);
  return (
    <section aria-label={ur ? "بیان کی رہنمائی" : "Speaking guide"} dir={ur ? "rtl" : "ltr"} className="mt-5 space-y-4">
      <div className="rounded-xl border border-[#B8935A]/25 bg-white p-4 dark:bg-[#162a1e]">
        <h4 className="font-bold">{ur ? "مواد کس صورت میں چاہیے؟" : "How would you like to read the material?"}</h4>
        <div className="khateeb-no-print mt-3 flex flex-wrap gap-2" role="group" aria-label={ur ? "مواد کی تفصیل" : "Material detail"}>
          {(["brief", "detailed"] as const).map(value => (
            <button key={value} type="button" aria-pressed={mode === value} onClick={() => onModeChange(value)} className={`rounded-full border px-4 py-2 text-sm ${mode === value ? "bg-[#1A3A2A] text-white" : "border-[#B8935A]/40"}`}>
              {value === "brief" ? (ur ? "مختصر نکات" : "Brief points") : (ur ? "تفصیلی وضاحت" : "Detailed explanation")}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm leading-8">{ur ? "یہ ایک مجلس کے لیے بیان کی رہنمائی ہے۔ وضاحت، مثالیں اور ربط قلم ورکس کی تدوین ہیں؛ اصل آیات اور تراجم الگ دکھائے گئے ہیں۔" : "This is a speaking guide for one sermon. Explanations, examples, and transitions are Qalam Works editorial material; verses and translations are displayed separately."}</p>
      </div>
      <div className="rounded-xl bg-white p-4 dark:bg-[#162a1e]">
        <h4 className="font-bold">{ur ? "آغاز اور مرکزی سوال" : "Opening and governing question"} — {minutes[0]} {ur ? "منٹ" : "min"}</h4>
        <p className="mt-2 text-sm leading-8">{ur ? "اگر ہمیں اپنی مدتِ زندگی معلوم نہیں تو ہم آج کس ذمہ داری کو ترجیح دیں گے؟ سامعین کو اپنے حالات پر غور کا موقع دیں، پھر موت کی یاد کو بامقصد زندگی سے جوڑیں۔" : "If we do not know how long we will live, which responsibility should we prioritize today? Give listeners room to reflect, then connect remembering death with purposeful living."}</p>
      </div>
      {DEATH_SPEAKING_GUIDE.map((section, index) => (
        <article key={section.id} className="rounded-xl border border-[#B8935A]/25 bg-white p-4 dark:bg-[#162a1e]">
          <h4 className="font-bold">{section.heading[locale]} — {minutes[index + 1]} {ur ? "منٹ" : "min"}</h4>
          <p className="mt-2 text-sm font-semibold leading-8">{section.point[locale]}</p>
          {section.verses.map(location => (
            <div key={`${location.surah}:${location.ayah}`} className="mt-3 rounded-lg bg-[#F7F5EF] p-3 dark:bg-[#0e1c15]">
              <h5 className="text-xs font-bold">{ur ? "اصل قرآنی آیت" : "Qur'anic source verse"} — {location.surah}:{location.ayah}</h5>
              <div dir="rtl" className="mt-2 text-lg leading-9"><KhateebScriptText text={ahmedgrafQuranReference.getAyah(location.surah, location.ayah)?.text ?? ""} forceArabic /></div>
              <KhateebQuranTranslation location={location} />
            </div>
          ))}
          {mode === "detailed" ? (
            <>
              <h5 className="mt-4 text-sm font-bold">{ur ? "خطیبانہ وضاحت — قلم ورکس کی تدوین" : "Speaking explanation — Qalam Works editorial material"}</h5>
              {section.explanation[locale].map(paragraph => <p key={paragraph} className="mt-2 text-sm leading-8">{paragraph}</p>)}
              <div className="mt-3 rounded-lg border border-[#B8935A]/25 p-3 text-sm leading-8"><strong>{ur ? "فرضی روزمرہ مثال: " : "Hypothetical everyday example: "}</strong>{section.example[locale]}</div>
            </>
          ) : null}
          <p className="mt-3 text-sm leading-8"><strong>{ur ? "سامعین سے سوال: " : "Audience question: "}</strong>{section.question[locale]}</p>
          <p className="mt-2 text-sm leading-8"><strong>{ur ? "عملی قدم: " : "Practical step: "}</strong>{section.action[locale]}</p>
          {mode === "detailed" ? <p className="mt-3 border-t border-[#B8935A]/25 pt-3 text-sm leading-8"><strong>{ur ? "اگلے حصے سے ربط: " : "Transition: "}</strong>{section.transition[locale]}</p> : null}
        </article>
      ))}
      <div className="rounded-xl border border-[#B8935A]/25 bg-[#fbf7ee] p-4 dark:bg-[#241f14]">
        <h4 className="font-bold">{ur ? "اختتام اور دعوتِ عمل" : "Closing and action"} — {minutes[5]} {ur ? "منٹ" : "min"}</h4>
        <p className="mt-2 text-sm leading-8">{ur ? "ترجیحات، لوگوں کے حقوق، اصلاح کا آغاز، اور رحمت کی امید کو ایک بات میں جمع کریں: زندگی کی قدر کریں اور آج ایک ممکن قدم اٹھائیں۔ پھر اسی عمل کی توفیق کی دعا کریں۔" : "Bring together priorities, others' rights, beginning repair, and hope in mercy: value life and take one possible step today. Close with a prayer for the strength to act."}</p>
      </div>
    </section>
  );
}
