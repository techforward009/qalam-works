"use client";

import Link from "next/link";
import { useLanguage } from "../lib/language-context";
import { translations } from "../lib/translations";

const TOOL_HREFS = ["/tools/document-studio", "/tools/quality-checker", "/tools/unicode-standardizer", "/tools/document-studio"];

export default function HowItWorksSection() {
  const { language, dir } = useLanguage();
  const t = translations[language].howItWorks;

  return (
    <section className="bg-white py-24 md:py-28" dir={dir}>
      <div className="max-w-5xl mx-auto px-6 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-[#151B2E] mb-16">{t.headline}</h2>

        <div className="grid sm:grid-cols-2 gap-5">
          {t.tools.map((tool, i) => (
            <Link
              key={tool.name}
              href={TOOL_HREFS[i]}
              className="bg-[#FAF9F6] hover:bg-[#F1ECE0] p-6 rounded-2xl border border-[#151B2E]/[0.06] transition-colors block text-right"
            >
              <h3 className="text-base font-bold text-[#151B2E] mb-1.5">{tool.name}</h3>
              <p className="text-sm text-[#5B5748] leading-relaxed">{tool.body}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
