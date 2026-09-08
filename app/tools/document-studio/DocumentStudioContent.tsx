"use client";

import { useLanguage } from "../../lib/language-context";
import DocumentStudioEditor from "./components/DocumentStudioEditor";

export default function DocumentStudioContent() {
  const { language, dir } = useLanguage();

  return (
    <main className="py-3 md:py-4" dir={dir}>
      <h1 className="sr-only">
        {language === "ur" ? "ڈاکومنٹ اسٹوڈیو" : "Document Studio"}
      </h1>
      <DocumentStudioEditor />
    </main>
  );
}
