"use client";

import Link from "next/link";
import { BookOpen, PenLine, Languages, Eraser, SearchCheck, Type, MessageCircle, FilePenLine, CalendarDays } from "lucide-react";
import { useLanguage } from "../lib/language-context";
import { translations } from "../lib/translations";
import { trackEvent, type ToolId } from "../lib/analytics";

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
    <section id="how-it-works" className="bg-[#F7F5EF] py-16 dark:bg-[#11182A] md:py-20" dir={dir}>
      <div className="mx-auto max-w-[1100px] px-6 text-center">
        <h2 className={`mb-10 text-2xl font-bold text-[#11182A] dark:text-[#F7F5EF] md:mb-12 md:text-3xl ${language === "ur" ? "font-nastaliq font-normal" : ""}`}>
          {t.headline}
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {t.tools.map((tool, i) => {
            const meta = TOOL_META[i];
            const { Icon } = meta;
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
                className="group block rounded-2xl border border-[#1A2036]/8 bg-white p-6 text-start shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-[#1A2036] dark:hover:border-[#2FA37D]/30"
              >
                <span className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#2FA37D]/10 text-[#1F6C54] dark:bg-[#2FA37D]/15 dark:text-[#7DDCB8]">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
                </span>
                <h3 className={`mb-1.5 text-[17px] font-bold text-[#11182A] dark:text-[#F7F5EF] ${naskh}`}>{tool.name}</h3>
                <p className={`text-[14px] leading-relaxed text-[#5B5748] dark:text-[#b7c4bb] ${naskh}`}>{tool.body}</p>
                {meta.example && (
                  <span className="mt-3 inline-flex items-center gap-1 rounded bg-[#F3F7F2] px-2 py-0.5 font-mono text-[11px] text-[#1A2036]/70 dark:bg-white/5 dark:text-[#c9d5ce]" dir="ltr">
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
