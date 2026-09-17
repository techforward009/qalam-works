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
}: {
  h1: Bilingual;
  intro: Bilingual;
  children: ReactNode;
  sections: SearchIntentSection[];
  faqs: SearchIntentFaq[];
  related: SearchIntentRelated[];
  note?: Bilingual;
}) {
  const { language, dir } = useLanguage();
  const isUr = language === "ur";
  const naskh = isUr ? "font-naskh" : "";

  return (
    <main className="bg-[#F7F5EF] dark:bg-[#0e1c15]" dir={dir} lang={language}>
      <div className="site-container pt-8 sm:pt-10 pb-4">
        <header className="max-w-3xl">
          <h1
            className={`text-3xl sm:text-4xl font-bold text-[#1A3A2A] dark:text-[#e8ede9] leading-tight ${
              isUr ? "font-nastaliq font-normal" : ""
            }`}
          >
            {isUr ? h1.ur : h1.en}
          </h1>
          <p
            className={`mt-2 text-xl text-[#4a6a4a] dark:text-[#a8c8b0] ${isUr ? "" : "font-nastaliq"}`}
            lang={isUr ? "en" : "ur"}
            dir={isUr ? "ltr" : "rtl"}
          >
            {isUr ? h1.en : h1.ur}
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-[#3d3d3d] dark:text-[#c8d8cc]" lang="en" dir="ltr">
            {intro.en}
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-[#3d3d3d] dark:text-[#c8d8cc] font-naskh" lang="ur" dir="rtl">
            {intro.ur}
          </p>
        </header>
      </div>

      <div className="mb-10">{children}</div>

      <div className={`site-container space-y-8 pb-14 text-[15px] leading-relaxed text-[#3d3d3d] dark:text-[#c8d8cc] ${naskh}`}>
        {note && (
          <p className="rounded-xl border border-[#B8935A]/40 bg-[#B8935A]/8 px-4 py-3 text-sm text-[#6F4E25] dark:text-[#E0C18D]">
            <span lang="en" dir="ltr" className="block">
              {note.en}
            </span>
            <span lang="ur" dir="rtl" className="mt-2 block font-naskh">
              {note.ur}
            </span>
          </p>
        )}

        {sections.map((section) => (
          <section key={section.title.en}>
            <h2 className={`text-xl font-bold text-[#1A3A2A] dark:text-[#e8ede9] mb-2 ${isUr ? "font-nastaliq font-normal" : ""}`}>
              {isUr ? section.title.ur : section.title.en}
            </h2>
            <p lang="en" dir="ltr">
              {section.body.en}
            </p>
            <p className="mt-2 font-naskh" lang="ur" dir="rtl">
              {section.body.ur}
            </p>
          </section>
        ))}

        <section>
          <h2 className={`text-xl font-bold text-[#1A3A2A] dark:text-[#e8ede9] mb-4 ${isUr ? "font-nastaliq font-normal" : ""}`}>
            {isUr ? "اکثر پوچھے گئے سوالات" : "Frequently Asked Questions"}
          </h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <div key={faq.q.en} className="rounded-xl border border-[#1A3A2A]/10 dark:border-[#2a3d30] bg-white dark:bg-[#162a1e] p-4">
                <p className="font-semibold text-[#1A3A2A] dark:text-[#e8ede9]">{faq.q.en}</p>
                <p className="mt-1">{faq.a.en}</p>
                <p className="mt-3 font-semibold text-[#1A3A2A] dark:text-[#e8ede9] font-nastaliq" lang="ur" dir="rtl">
                  {faq.q.ur}
                </p>
                <p className="mt-1 font-naskh" lang="ur" dir="rtl">
                  {faq.a.ur}
                </p>
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
