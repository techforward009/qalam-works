"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useLanguage } from "../lib/language-context";

export type Bilingual = { en: string; ur: string };

export type SearchIntentSection = {
  title: Bilingual;
  body: Bilingual;
};

export type SearchIntentFaq = {
  q: Bilingual;
  a: Bilingual;
};

export type SearchIntentRelated = {
  href: string;
  label: Bilingual;
};

export default function SearchIntentToolLayout({
  h1,
  intro,
  children,
  sections,
  faqs,
  related,
  note,
  centerHeader = false,
}: {
  h1: Bilingual;
  intro: Bilingual;
  children: ReactNode;
  sections: SearchIntentSection[];
  faqs: SearchIntentFaq[];
  related: SearchIntentRelated[];
  note?: Bilingual;
  centerHeader?: boolean;
}) {
  const { language, dir } = useLanguage();
  const isUr = language === "ur";
  const naskh = isUr ? "font-naskh" : "";
  const text = (copy: Bilingual) => (isUr ? copy.ur : copy.en);

  return (
    <main className="bg-[#F7F5EF] dark:bg-[#0e1c15]" dir={dir} lang={language}>
      <div className="site-container pt-8 sm:pt-10 pb-4">
        <header className={`max-w-3xl ${centerHeader ? "mx-auto text-center" : ""}`}>
          <h1
            className={`text-3xl sm:text-4xl font-bold text-[#1A3A2A] dark:text-[#e8ede9] leading-tight ${
              isUr ? "font-nastaliq font-normal" : ""
            }`}
          >
            {text(h1)}
          </h1>
          <p className={`mt-4 text-[15px] leading-relaxed text-[#3d3d3d] dark:text-[#c8d8cc] ${naskh}`}>
            {text(intro)}
          </p>
        </header>
      </div>

      <div className="mb-10">{children}</div>

      <div className={`site-container space-y-8 pb-14 text-[15px] leading-relaxed text-[#3d3d3d] dark:text-[#c8d8cc] ${naskh}`}>
        {note && (
          <p className="rounded-xl border border-[#B8935A]/40 bg-[#B8935A]/8 px-4 py-3 text-sm text-[#6F4E25] dark:text-[#E0C18D]">
            {text(note)}
          </p>
        )}

        {sections.map((section) => (
          <section key={section.title.en}>
            <h2 className={`text-xl font-bold text-[#1A3A2A] dark:text-[#e8ede9] mb-2 ${isUr ? "font-nastaliq font-normal" : ""}`}>
              {text(section.title)}
            </h2>
            <p>{text(section.body)}</p>
          </section>
        ))}

        <section>
          <h2 className={`text-xl font-bold text-[#1A3A2A] dark:text-[#e8ede9] mb-4 ${isUr ? "font-nastaliq font-normal" : ""}`}>
            {isUr ? "اکثر پوچھے گئے سوالات" : "Frequently Asked Questions"}
          </h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.q.en} className="rounded-xl border border-[#1A3A2A]/10 dark:border-[#2a3d30] bg-white dark:bg-[#162a1e] p-4">
                <p className={`font-semibold text-[#1A3A2A] dark:text-[#e8ede9] ${isUr ? "font-nastaliq font-normal" : ""}`}>
                  {text(faq.q)}
                </p>
                <p className="mt-1">{text(faq.a)}</p>
              </div>
            ))}
          </div>
        </section>

        <nav aria-label={isUr ? "متعلقہ ٹولز" : "Related tools"}>
          <h2 className={`text-xl font-bold text-[#1A3A2A] dark:text-[#e8ede9] mb-3 ${isUr ? "font-nastaliq font-normal" : ""}`}>
            {isUr ? "متعلقہ ٹولز" : "Related tools"}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {related.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`inline-flex rounded-lg border border-[#1A3A2A]/15 dark:border-[#35513d] bg-white dark:bg-[#162a1e] px-3 py-2 text-sm font-semibold text-[#1A3A2A] dark:text-[#e8ede9] hover:border-[#B8935A]/60 ${naskh}`}
                >
                  {isUr ? item.label.ur : item.label.en}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </main>
  );
}
