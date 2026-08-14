"use client";

import Link from "next/link";
import { Eraser, Type, FilePenLine, MessageCircle, SearchCheck, ChevronRight } from "lucide-react";
import { useLanguage } from "../lib/language-context";
import { translations } from "../lib/translations";
import { trackEvent, type ToolId } from "../lib/analytics";

const HREF_TO_TOOL: Record<string, ToolId> = {
  "/tools/document-cleaner": "document_cleaner",
  "/tools/unicode-standardizer": "urdu_unicode_standardizer",
  "/tools/document-studio": "document_studio",
  "/tools/whatsapp-rtl-formatter": "whatsapp_rtl_formatter",
  "/tools/quality-checker": "quality_audit",
};

const CARD_META: Record<
  string,
  { Icon: typeof Eraser; accent: string; iconBg: string; iconColor: string; borderHover: string }
> = {
  "/tools/document-cleaner": {
    Icon: Eraser,
    accent: "border-[#1A3A2A]/15 hover:border-emerald-500/40",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-700",
    borderHover: "hover:shadow-md hover:shadow-emerald-900/5",
  },
  "/tools/unicode-standardizer": {
    Icon: Type,
    accent: "border-[#1A3A2A]/15 hover:border-sky-500/40",
    iconBg: "bg-sky-50",
    iconColor: "text-sky-700",
    borderHover: "hover:shadow-md hover:shadow-sky-900/5",
  },
  "/tools/document-studio": {
    Icon: FilePenLine,
    accent: "border-[#1A3A2A]/15 hover:border-[#B8935A]/50",
    iconBg: "bg-[#B8935A]/10",
    iconColor: "text-[#9A6A30]",
    borderHover: "hover:shadow-md hover:shadow-[#B8935A]/10",
  },
  "/tools/whatsapp-rtl-formatter": {
    Icon: MessageCircle,
    accent: "border-[#1A3A2A]/15 hover:border-teal-500/40",
    iconBg: "bg-teal-50",
    iconColor: "text-teal-700",
    borderHover: "hover:shadow-md hover:shadow-teal-900/5",
  },
  "/tools/quality-checker": {
    Icon: SearchCheck,
    accent: "border-[#1A3A2A]/15 hover:border-amber-500/40",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-700",
    borderHover: "hover:shadow-md hover:shadow-amber-900/5",
  },
};

export default function JobGuidanceSection() {
  const { language, dir } = useLanguage();
  const t = translations[language].jobGuidance;
  const naskh = language === "ur" ? "font-naskh" : "";
  const isUr = language === "ur";

  return (
    <section className="bg-white py-10 md:py-12" dir={dir}>
      <div className="site-container max-w-3xl mx-auto">
        <h2
          className={`text-xl md:text-2xl font-bold text-[#1A3A2A] text-center mb-5 ${
            isUr ? "font-nastaliq font-normal" : ""
          }`}
        >
          {t.headline}
        </h2>

        <ul className="space-y-3.5">
          {t.items.map((item) => {
            const meta = CARD_META[item.href] ?? CARD_META["/tools/document-cleaner"];
            const { Icon } = meta;

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
                  className={`group flex items-center gap-3.5 sm:gap-4 rounded-2xl border bg-[#F7F5EF] px-4 py-4 sm:px-5 sm:py-4.5 min-h-[72px] transition-all ${meta.accent} ${meta.borderHover} hover:bg-[#F1ECE0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8935A] focus-visible:ring-offset-2 ${naskh}`}
                >
                  <span
                    className={`flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl ${meta.iconBg} ${meta.iconColor}`}
                    aria-hidden="true"
                  >
                    <Icon className="h-5 w-5 sm:h-[22px] sm:w-[22px]" strokeWidth={2} />
                  </span>

                  <span className="min-w-0 flex-1 text-start">
                    <span className="block text-[13px] sm:text-[14px] font-medium text-[#6B6560] leading-snug">
                      {item.label}
                    </span>
                    <span className="mt-0.5 block text-[16px] sm:text-[17px] font-bold text-[#1A3A2A] leading-snug">
                      {item.description}
                    </span>
                    <span className="mt-1 block text-[13px] sm:text-[14px] text-[#5B5748] leading-relaxed">
                      {item.body}
                    </span>
                  </span>

                  {/* Logical arrow: flips correctly in RTL without bidi issues */}
                  <span
                    className="shrink-0 text-[#1A3A2A]/45 group-hover:text-[#1A3A2A] transition-colors rtl:rotate-180"
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
