"use client";

import { useLanguage } from "../../lib/language-context";
import DocumentStudioEditor from "./components/DocumentStudioEditor";

export default function DocumentStudioContent() {
  const { language, dir } = useLanguage();

  return (
    <main className="py-6 md:py-8" dir={dir}>
      <div className="site-container mb-5 flex items-center justify-between flex-wrap gap-2">
        <h1 className={`text-2xl md:text-3xl font-bold text-[#1A3A2A] dark:text-white ${language === "ur" ? "font-nastaliq font-normal" : ""}`}>
          {language === "ur" ? "ڈاکومنٹ اسٹوڈیو" : "Document Studio"}
        </h1>
        <p className="text-sm text-gray-500 dark:text-white max-w-xl">
          {language === "ur"
            ? "مکمل workspace: مسودہ → معیاری بنائیں → کوالٹی چیک → ایکسپورٹ۔ صرف صفائی نہیں — پورا اشاعتی سفر۔"
            : "Full workspace: Draft → Standardize → Quality Check → Export. Not only a cleaner — a complete publishing path."}
        </p>
      </div>
      <DocumentStudioEditor />
    </main>
  );
}
