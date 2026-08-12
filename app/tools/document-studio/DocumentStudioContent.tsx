"use client";

import { useLanguage } from "../../lib/language-context";
import DocumentStudioEditor from "./components/DocumentStudioEditor";

export default function DocumentStudioContent() {
  const { language, dir } = useLanguage();

  return (
    <main className="py-6 md:py-8" dir={dir}>
      <div className="max-w-[1200px] mx-auto px-4 mb-5 flex items-center justify-between flex-wrap gap-2">
        <h1 className={`text-2xl md:text-3xl font-bold text-[#1A3A2A] ${language === "ur" ? "font-nastaliq font-normal" : ""}`}>
          {language === "ur" ? "ڈاکومنٹ اسٹوڈیو" : "Document Studio"}
        </h1>
        <p className="text-sm text-gray-500">
          {language === "ur"
            ? "اردو کے لیے بنایا گیا لکھائی کا ماحول — معیار کی جانچ، یونیکوڈ معیاری کاری، اور DOCX/PDF ایکسپورٹ۔"
            : "A writing workspace built for Urdu — quality checks, Unicode standardization, DOCX/PDF export."}
        </p>
      </div>
      <DocumentStudioEditor />
    </main>
  );
}
