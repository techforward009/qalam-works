"use client";

import Link from "next/link";
import { Eraser, Type, FilePenLine, MessageCircle, SearchCheck, Languages, PenLine, CalendarDays, ChevronRight } from "lucide-react";
import { useLanguage } from "../lib/language-context";
import { translations } from "../lib/translations";
import { trackEvent, type ToolId } from "../lib/analytics";

const CARD_EXAMPLE: Record<string, string> = {
  "/tools/document-cleaner":    "يہ , متن !! → یہ، متن!",
  "/tools/unicode-standardizer": "ي / ك → ی / ک",
  "/tools/roman-urdu-writer":   "mera naam → میرا نام",
};

const HREF_TO_TOOL: Record<string, ToolId> = {
  "/tools/document-cleaner": "document_cleaner",
  "/tools/unicode-standardizer": "urdu_unicode_standardizer",
  "/tools/document-studio": "document_studio",
  "/tools/roman-urdu-writer": "urdu_writer",
  "/tools/translation-studio": "translation_studio",
  "/tools/whatsapp-rtl-formatter": "whatsapp_rtl_formatter",
  "/tools/quality-checker": "quality_audit",
  "/tools/date-converter":  "date_converter",
};

const CARD_ICONS: Record<string, typeof Eraser> = {
  "/tools/document-cleaner": Eraser,
  "/tools/unicode-standardizer": Type,
  "/tools/document-studio": FilePenLine,
  "/tools/roman-urdu-writer": PenLine,
  "/tools/translation-studio": Languages,
  "/tools/whatsapp-rtl-formatter": MessageCircle,
  "/tools/quality-checker": SearchCheck,
  "/tools/date-converter": CalendarDays,
};

export default function JobGuidanceSection() {
  const { language, dir } = useLanguage();
  const t = translations[language].jobGuidance;
  const naskh = language === "ur" ? "font-naskh" : "";
  const isUr = language === "ur";

  return (
    <section className="bg-[#F7F5EF] py-14 dark:bg-[#0E1524] md:py-16" dir={dir}>
      <div className="site-container mx-auto max-w-3xl">
        <h2
          className={`mb-6 text-center text-xl font-bold text-[#11182A] dark:text-[#F7F5EF] md:text-2xl ${
            isUr ? "font-nastaliq font-normal" : ""
          }`}
        >
          {t.headline}
        </h2>

        <ul className="space-y-3.5">
          {t.items.map((item) => {
            const Icon = CARD_ICONS[item.href] ?? Eraser;
            const example = CARD_EXAMPLE[item.href];

            return (
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
                  className={`qalam-home-intent-card group flex min-h-[72px] items-center gap-3.5 rounded-2xl border border-[#1A2036]/8 bg-white px-4 py-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#2FA37D]/40 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2FA37D] dark:border-white/10 dark:bg-[#1A2036] dark:hover:border-[#2FA37D]/40 sm:gap-4 sm:px-5 ${naskh}`}
                >
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#2FA37D]/12 text-[#1F6C54] dark:bg-[#2FA37D]/15 dark:text-[#7DDCB8] sm:h-12 sm:w-12"
                    aria-hidden="true"
                  >
                    <Icon className="h-5 w-5 sm:h-[22px] sm:w-[22px]" strokeWidth={2} />
                  </span>

                  <span className="min-w-0 flex-1 text-start">
                    <span className="qalam-intent-label block text-[13px] sm:text-[14px] font-medium text-[#6B6560] dark:text-[#a8b9ac] leading-snug">
                      {item.label}
                    </span>
                    <span className="qalam-intent-name mt-0.5 block text-[16px] sm:text-[17px] font-bold text-[#1A3A2A] dark:text-[#e8ede9] leading-snug">
                      {item.description}
                    </span>
                    <span className="qalam-intent-description mt-1 block text-[13px] sm:text-[14px] text-[#5B5748] dark:text-[#a8b9ac] leading-relaxed">
                      {item.body}
                    </span>
                    {example && (
                      <span className="qalam-intent-example mt-1.5 inline-flex items-center gap-2 font-mono text-[11px] bg-[#1A3A2A]/6 dark:bg-white/[0.06] text-[#1A3A2A] dark:text-[#eef4ee] px-2 py-0.5 rounded" dir={isUr ? "rtl" : "ltr"}>
                        <bdi dir="auto">{example.split("→")[0]?.trim()}</bdi>
                        <span aria-hidden="true" className="font-sans">{isUr ? "←" : "→"}</span>
                        <bdi dir="auto">{example.split("→")[1]?.trim()}</bdi>
                      </span>
                    )}
                  </span>

                  {/* Logical arrow: flips correctly in RTL without bidi issues */}
                  <span
                    className="shrink-0 text-[#2FA37D] transition-colors rtl:rotate-180"
                    aria-hidden="true"
                  >
                    <ChevronRight className="h-5 w-5" strokeWidth={2.25} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
