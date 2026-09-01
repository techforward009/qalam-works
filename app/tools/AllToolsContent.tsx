"use client";

import Link from "next/link";
import { useState } from "react";
import { useLanguage } from "../lib/language-context";
import { trackEvent } from "../lib/analytics";
import { TOOL_CATALOG, type ToolEntry } from "../lib/toolCatalog";
import { ChevronDown, ChevronUp, ExternalLink, AlertTriangle } from "lucide-react";

// ── Labels ────────────────────────────────────────────────────────────────────
const L = {
  en: {
    title:       "All Qalam Works Tools",
    intro:       "Choose a tool by the task you need to perform. Each tool handles one job well — pick the one that matches your workflow.",
    openTool:    "Open Tool",
    whatItDoes:  "What it does",
    input:       "You provide",
    output:      "You get",
    doesNotDo:   "Does not do",
    bestFor:     "Best for",
    showMore:    "Details",
    showLess:    "Less",
    noteLabel:   "Note",
  },
  ur: {
    title:       "قلم ورکس کے تمام ٹولز",
    intro:       "اپنے کام کے مطابق ٹول منتخب کریں۔ ہر ٹول ایک مخصوص کام بخوبی انجام دیتا ہے۔",
    openTool:    "ٹول کھولیں",
    whatItDoes:  "یہ کیا کرتا ہے؟",
    input:       "آپ کیا دیتے ہیں؟",
    output:      "آپ کو کیا ملتا ہے؟",
    doesNotDo:   "یہ کیا نہیں کرتا؟",
    bestFor:     "کس کے لیے موزوں ہے؟",
    showMore:    "تفصیل",
    showLess:    "کم",
    noteLabel:   "نوٹ",
  },
};

// ── Single tool card ──────────────────────────────────────────────────────────
function ToolCard({ tool, lang, dir, naskh }: {
  tool:   ToolEntry;
  lang:   "en" | "ur";
  dir:    "ltr" | "rtl";
  naskh:  string;
}) {
  const [open, setOpen] = useState(false);
  const t  = L[lang];
  const lc = lang === "ur" ? "ur" : "en";
  const { Icon } = tool;

  const Row = ({ label, value }: { label: string; value: string }) => (
    <div className="flex gap-2 text-sm">
      <span className={`shrink-0 font-semibold text-[#3a6a4a] dark:text-[#8faa93] min-w-[7rem] ${naskh}`}>{label}</span>
      <span className={`text-[#3d3d3d] dark:text-[#c8d8cc] leading-relaxed ${naskh}`}>{value}</span>
    </div>
  );

  return (
    <div className="bg-white dark:bg-[#162a1e] border border-[#1A3A2A]/10 dark:border-[#2a3d30] rounded-2xl shadow-sm overflow-hidden transition-shadow hover:shadow-md">
      {/* Card header — always visible */}
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          {/* Icon badge */}
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tool.iconBg} ${tool.iconColor}`} aria-hidden="true">
            <Icon className="h-5 w-5" strokeWidth={2} />
          </span>

          {/* Name + short description */}
          <div className="flex-1 min-w-0 text-start">
            <h2 className={`text-[17px] font-bold text-[#1A3A2A] dark:text-[#e8ede9] leading-snug mb-1 ${lang === "ur" ? "font-naskh" : ""}`}>
              {tool.name[lc]}
            </h2>
            <p className={`text-[14px] text-[#4a6a4a] dark:text-[#a8c8b0] leading-relaxed ${naskh}`}>
              {tool.short[lc]}
            </p>
            {/* Optional tiny example */}
            {tool.example && (
              <span className="mt-2 inline-flex items-center gap-1 font-mono text-[11px] bg-[#1A3A2A]/6 dark:bg-white/[0.06] text-[#1A3A2A]/65 dark:text-[#8faa93] px-2 py-0.5 rounded" dir="ltr">
                {tool.example.split("→").map((seg, i, arr) => (
                  <span key={i}>
                    <bdi dir="auto">{seg.trim()}</bdi>
                    {i < arr.length - 1 && <span className="mx-0.5">→</span>}
                  </span>
                ))}
              </span>
            )}
          </div>
        </div>

        {/* Action row */}
        <div className="mt-4 flex items-center gap-3">
          <Link
            href={tool.route}
            onClick={() => trackEvent("nav_click", { tool: "home", target_tool: tool.id as any, nav_source: "more_tools" })}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-[#1A3A2A] dark:bg-[#2a5a3a] text-white hover:bg-[#244E38] dark:hover:bg-[#3a7a4a] transition-colors ${naskh}`}
          >
            {t.openTool}
            <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
          </Link>
          <button
            onClick={() => setOpen(o => !o)}
            className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-[#3a6a4a] dark:text-[#a8c8b0] hover:bg-[#1A3A2A]/5 dark:hover:bg-white/5 transition-colors ${naskh}`}
            aria-expanded={open}
          >
            {open ? t.showLess : t.showMore}
            {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Expandable details */}
      {open && (
        <div className={`border-t border-[#1A3A2A]/8 dark:border-[#2a3d30] bg-[#F7F5EF] dark:bg-[#0e1c15] px-5 sm:px-6 py-5 space-y-3 text-start`}>
          <Row label={t.whatItDoes} value={tool.whatItDoes[lc]} />
          <Row label={t.input}      value={tool.input[lc]} />
          <Row label={t.output}     value={tool.output[lc]} />
          <Row label={t.doesNotDo}  value={tool.doesNotDo[lc]} />
          <Row label={t.bestFor}    value={tool.bestFor[lc]} />
          {tool.importantNote && (
            <div className={`flex items-start gap-2 mt-1 pt-3 border-t border-[#1A3A2A]/8 dark:border-[#2a3d30] `}>
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              <p className={`text-sm font-semibold text-amber-700 dark:text-amber-300 ${naskh}`}>
                {t.noteLabel}: {tool.importantNote[lc]}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AllToolsContent() {
  const { language, dir } = useLanguage();
  const lang  = language as "en" | "ur";
  const isUr  = lang === "ur";
  const t     = L[lang];
  const naskh = isUr ? "font-naskh" : "";

  return (
    <div className="min-h-screen bg-[#F7F5EF] dark:bg-[#0e1c15]" dir={dir}>
      <div className="max-w-[860px] mx-auto px-4 sm:px-6 py-12 sm:py-16">

        {/* Page heading */}
        <div className={`mb-10 ${isUr ? "text-start" : "text-center"}`}>
          <h1 className={`text-3xl sm:text-4xl font-bold text-[#1A3A2A] dark:text-[#e8ede9] mb-3 ${isUr ? "font-nastaliq font-normal" : ""}`}>
            {t.title}
          </h1>
          <p className={`text-[16px] text-[#4a6a4a] dark:text-[#a8c8b0] max-w-xl ${isUr ? "mr-0 ml-auto" : "mx-auto"} ${naskh}`}>
            {t.intro}
          </p>
        </div>

        {/* Tool cards */}
        <div className="space-y-4">
          {TOOL_CATALOG.map(tool => (
            <ToolCard
              key={tool.id}
              tool={tool}
              lang={lang}
              dir={dir as "ltr" | "rtl"}
              naskh={naskh}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
