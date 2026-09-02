"use client";

import Link from "next/link";
import { BookOpen, PenLine, Languages, Eraser, SearchCheck, Type, MessageCircle, FilePenLine, CalendarDays } from "lucide-react";
import { useLanguage } from "../lib/language-context";
import { translations } from "../lib/translations";
import { trackEvent, type ToolId } from "../lib/analytics";
import { getHomepageToolAccent } from "../lib/homepage-tool-accents";

const TOOL_HREFS = [
  "/tools/document-studio",
  "/tools/roman-urdu-writer",
  "/tools/translation-studio",
  "/tools/document-cleaner",
  "/tools/quality-checker",
  "/tools/unicode-standardizer",
  "/tools/whatsapp-rtl-formatter",
  "/tools/invoice-generator",
  "/tools/date-converter",
] as const;

const TOOL_IDS: ToolId[] = [
  "document_studio",
  "urdu_writer",
  "translation_studio",
  "document_cleaner",
  "quality_audit",
  "urdu_unicode_standardizer",
  "whatsapp_rtl_formatter",
  "invoice_generator",
  "date_converter",
];

// Icon and example per tool (same order as TOOL_HREFS).
// Accent treatment is shared with JobGuidanceSection.
const TOOL_META = [
  { Icon: BookOpen, example: null },
  { Icon: PenLine, example: "mera naam → میرا نام" },
  { Icon: Languages, example: null },
  { Icon: Eraser, example: "يہ , → یہ،" },
  { Icon: SearchCheck, example: null },
  { Icon: Type, example: "ي → ی" },
  { Icon: MessageCircle, example: null },
  { Icon: FilePenLine, example: null },
  { Icon: CalendarDays, example: null },
];

export default function HowItWorksSection() {
  const { language, dir } = useLanguage();
  const t = translations[language].howItWorks;
  const naskh = language === "ur" ? "font-naskh" : "";

  return (
    <section className="bg-[#F3F7F2] dark:bg-[#0e1c15] py-14 md:py-16" dir={dir}>
      <div className="max-w-[1240px] mx-auto px-6 text-center">
        <h2 className={`text-2xl md:text-3xl font-bold text-[#151B2E] dark:text-[#e8ede9] mb-10 md:mb-12 ${language === "ur" ? "font-nastaliq font-normal" : ""}`}>
          {t.headline}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {t.tools.map((tool, i) => {
            const meta = TOOL_META[i];
            const { Icon } = meta;
            const accent = getHomepageToolAccent(TOOL_HREFS[i]);
            return (
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
                className="group bg-white dark:bg-[#162a1e] hover:bg-[#F1ECE0] dark:hover:bg-[#1e3527] hover:shadow-lg hover:border-[#1A3A2A]/[0.12] dark:hover:border-white/[0.14] p-6 rounded-2xl border border-[#151B2E]/[0.06] dark:border-white/[0.08] transition-all duration-200 motion-safe:hover:-translate-y-[3px] motion-safe:hover:scale-[1.01] block text-start"
              >
                {/* Icon badge */}
                <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${accent.iconBg} ${accent.iconColor} mb-3`}>
                  <Icon className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
                </span>

                <h3 className={`text-[17px] font-bold text-[#1A3A2A] dark:text-[#e8ede9] mb-1.5 ${naskh}`}>{tool.name}</h3>
                <p className={`text-[14px] text-[#5B5748] dark:text-[#a8b9ac] leading-relaxed ${naskh}`}>{tool.body}</p>

                {/* Tiny visual example: outer dir=ltr keeps source→result flow left-to-right;
                    each token uses bdi dir="auto" so Urdu/Arabic script shapes correctly */}
                {meta.example && (
                  <span className="mt-2.5 inline-flex items-center gap-1 font-mono text-[11px] bg-[#1A3A2A]/6 dark:bg-white/[0.06] text-[#1A3A2A]/65 dark:text-[#8faa93] px-2 py-0.5 rounded" dir="ltr">
                    <bdi dir="auto">{meta.example.split("→")[0]?.trim()}</bdi>
                    <span aria-hidden="true">→</span>
                    <bdi dir="auto">{meta.example.split("→")[1]?.trim()}</bdi>
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
