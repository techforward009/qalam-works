"use client";

import dynamic from "next/dynamic";
import { useLanguage } from "../../lib/language-context";
import KnowledgeAssistant from "../../components/knowledge/KnowledgeAssistant";
import ResearchStudioGate from "./components/ResearchStudioGate";

const ResearchStudioWorkspace = dynamic(() => import("./components/ResearchStudioWorkspace"));

const INTRO = {
  en: "Ask your documents. See the answer with a page and an original quotation. If the material is not there, you will be told clearly.",
  ur: "اپنی دستاویزات سے سوال کریں۔ جواب کے ساتھ صفحہ اور اصل اقتباس دیکھیں۔ مواد نہ ملے تو واضح طور پر بتایا جائے گا۔",
};

export default function ResearchStudioContent() {
  const { language, dir } = useLanguage();
  const title = language === "ur" ? "ریسرچ اسٹوڈیو" : "Research Studio";
  return (
    <main className="py-10 md:py-14" dir={dir}>
      <section className="site-container mb-8">
        <h1 className={`text-3xl md:text-4xl font-bold text-[#1A3A2A] dark:text-white mb-3 ${language === "ur" ? "font-nastaliq font-normal" : ""}`}>
          {title}
        </h1>
      </section>
      <div className="site-container">
        <ResearchStudioGate language={language} dir={dir}>
          <p className={`mb-8 max-w-2xl text-gray-700 dark:text-white ${language === "ur" ? "font-naskh" : ""}`}>{INTRO[language]}</p>
          <div className="mb-8"><KnowledgeAssistant locale={language} /></div>
          <ResearchStudioWorkspace language={language} dir={dir} />
        </ResearchStudioGate>
      </div>
    </main>
  );
}
