"use client";

import Link from "next/link";
import { useLanguage } from "../lib/language-context";
import { translations } from "../lib/translations";
import { trackEvent, type ToolId } from "../lib/analytics";

const TOOL_HREFS = [
  "/tools/document-studio",
  "/tools/translation-studio",
  "/tools/document-cleaner",
  "/tools/quality-checker",
  "/tools/unicode-standardizer",
  "/tools/whatsapp-rtl-formatter",
  "/tools/invoice-generator",
] as const;

const TOOL_IDS: ToolId[] = [
  "document_studio",
  "translation_studio",
  "document_cleaner",
  "quality_audit",
  "urdu_unicode_standardizer",
  "whatsapp_rtl_formatter",
  "invoice_generator",
];

export default function HowItWorksSection() {
  const { language, dir } = useLanguage();
  const t = translations[language].howItWorks;
  const naskh = language === "ur" ? "font-naskh" : "";

  return (
    <section className="bg-[#F3F7F2] py-14 md:py-16" dir={dir}>
      <div className="max-w-[1240px] mx-auto px-6 text-center">
        <h2 className={`text-2xl md:text-3xl font-bold text-[#151B2E] mb-16 ${language === "ur" ? "font-nastaliq font-normal" : ""}`}>
          {t.headline}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {t.tools.map((tool, i) => (
            <Link
              key={tool.name}
              href={TOOL_HREFS[i]}
              onClick={() =>
                trackEvent("nav_click", {
                  tool: "home",
                  target_tool: TOOL_IDS[i],
                  nav_source: "homepage_card",
                })
              }
              className="bg-white hover:bg-[#F1ECE0] hover:shadow-md p-7 rounded-2xl border border-[#151B2E]/[0.06] transition-all block"
            >
              <h3 className={`text-[19px] font-bold text-[#1A3A2A] mb-2 ${naskh}`}>{tool.name}</h3>
              <p className={`text-[16px] text-[#5B5748] leading-relaxed ${naskh}`}>{tool.body}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
