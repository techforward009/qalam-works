"use client";

import Link from "next/link";
import { useLanguage } from "../lib/language-context";
import { translations } from "../lib/translations";

function ServiceBlock({
  heading,
  items,
  naskh,
}: {
  heading: string;
  items: readonly string[];
  naskh: string;
}) {
  return (
    <div className="bg-[#FAF7F0] dark:bg-[#162a1e] rounded-xl p-6 border border-[#151B2E]/[0.06] dark:border-white/[0.08]">
      <h2 className={`text-lg font-bold text-[#1A3A2A] dark:text-[#e8ede9] mb-3 ${naskh}`}>{heading}</h2>
      <ul className={`space-y-2 ${naskh}`}>
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-[16px] text-[#3A3530] dark:text-[#cbd5ce]">
            <span className="mt-1 text-[#B8935A] shrink-0">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ServicesContent() {
  const { language, dir } = useLanguage();
  const t = translations[language].servicesPage;
  const naskh = language === "ur" ? "font-naskh" : "";

  return (
    <main className="bg-white dark:bg-transparent min-h-screen" dir={dir}>
      <div className="site-container py-16 md:py-24">
        <div className="max-w-[900px] mx-auto">
          <h1
            className={`text-3xl md:text-4xl font-bold text-[#1A3A2A] dark:text-[#e8ede9] mb-4 ${
              language === "ur" ? "font-nastaliq font-normal" : ""
            }`}
          >
            {t.heading}
          </h1>
          <p className={`text-[17px] leading-relaxed text-[#5B5748] dark:text-[#b7c5ba] mb-12 ${naskh}`}>{t.intro}</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5 mb-14">
          <ServiceBlock heading={t.translationHeading} items={t.translationItems} naskh={naskh} />
          <ServiceBlock heading={t.proofHeading} items={t.proofItems} naskh={naskh} />
          <ServiceBlock heading={t.normHeading} items={t.normItems} naskh={naskh} />
          <ServiceBlock heading={t.formatHeading} items={t.formatItems} naskh={naskh} />
        </div>

        <div className="max-w-[900px] mx-auto border-t border-gray-100 dark:border-white/10 pt-10">
          <h2
            className={`text-xl md:text-2xl font-bold text-[#1A3A2A] dark:text-[#e8ede9] mb-3 ${
              language === "ur" ? "font-nastaliq font-normal" : ""
            }`}
          >
            {t.ctaHeading}
          </h2>
          <p className={`text-[17px] text-[#3A3530] dark:text-[#cbd5ce] mb-6 leading-relaxed ${naskh}`}>{t.ctaBody}</p>
          <Link
            href="/contact"
            className={`inline-block bg-[#1A3A2A] hover:bg-[#244D38] text-white font-semibold px-6 py-3 rounded-lg transition-colors text-sm ${naskh}`}
          >
            {t.ctaLabel}
          </Link>
        </div>
      </div>
    </main>
  );
}
