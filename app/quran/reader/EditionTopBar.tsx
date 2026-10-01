"use client";

import Link from "next/link";
import { useLanguage } from "../../lib/language-context";
import { getQuranEdition, type QuranEditionId } from "../editions";

export default function EditionTopBar({ editionId }: { editionId: QuranEditionId }) {
  const { language, dir } = useLanguage();
  const edition = getQuranEdition(editionId);

  return (
    <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#d9d2c2] pb-3" dir="ltr">
      <div dir={dir} lang={language}>
        <div className="text-sm font-semibold tracking-wide text-[#2f8f68]">
          {edition.name[language]}
        </div>
        <div className="mt-1 text-xs text-[#756f62]">
          {edition.description[language]}
        </div>
        <div className="mt-0.5 text-xs text-[#8a8478]">
          {edition.detail[language]} · {edition.rendering[language]}
        </div>
      </div>
      <Link
        href="/quran"
        className="text-sm text-[#2f8f68] hover:underline"
        dir={dir}
        lang={language}
      >
        {language === "ur" ? "قرآن کے تمام ایڈیشنز" : "All Quran Editions"}
      </Link>
    </header>
  );
}
