"use client";

import Link from "next/link";
import { useLanguage } from "../lib/language-context";
import { translations } from "../lib/translations";
import { trackEvent, type ToolId } from "../lib/analytics";

const HREF_TO_TOOL: Record<string, ToolId> = {
  "/tools/document-cleaner": "document_cleaner",
  "/tools/unicode-standardizer": "urdu_unicode_standardizer",
  "/tools/document-studio": "document_studio",
};

export default function JobGuidanceSection() {
  const { language, dir } = useLanguage();
  const t = translations[language].jobGuidance;
  const naskh = language === "ur" ? "font-naskh" : "";

  return (
    <section className="bg-white py-12 md:py-16" dir={dir}>
      <div className="site-container max-w-3xl mx-auto">
        <h2
          className={`text-xl md:text-2xl font-bold text-[#1A3A2A] text-center mb-8 ${
            language === "ur" ? "font-nastaliq font-normal" : ""
          }`}
        >
          {t.headline}
        </h2>
        <ul className="space-y-3">
          {t.items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() =>
                  trackEvent("nav_click", {
                    tool: "home",
                    target_tool: HREF_TO_TOOL[item.href] ?? "unknown",
                    nav_source: "homepage_card",
                  })
                }
                className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4 rounded-xl border border-[#1A3A2A]/10 bg-[#F7F5EF] hover:bg-[#F1ECE0] px-4 py-3.5 transition-colors ${naskh}`}
              >
                <span className="text-[15px] font-medium text-[#4A4840]">{item.label}</span>
                <span className="text-[15px] font-semibold text-[#1A3A2A]">{item.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
