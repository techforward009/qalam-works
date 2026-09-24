"use client";

import { useLanguage } from "../../lib/language-context";
import ResearchStudioGate from "./components/ResearchStudioGate";

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
        <p className={`max-w-2xl text-gray-700 dark:text-white ${language === "ur" ? "font-naskh" : ""}`}>{INTRO[language]}</p>
      </section>
      <div className="site-container">
        <ResearchStudioGate language={language} dir={dir} />
      </div>
    </main>
  );
}
