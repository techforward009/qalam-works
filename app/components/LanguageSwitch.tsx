"use client";

import { useLanguage } from "../lib/language-context";

/** Global language switch — اردو | English. Rendered in the Header, visible on every page. */
export default function LanguageSwitch() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-0.5 rounded-full border border-white/15 p-0.5 text-[13px] xl:text-[14px] shrink-0" dir="ltr">
      <button
        type="button"
        onClick={() => setLanguage("ur")}
        aria-pressed={language === "ur"}
        className={`px-2.5 py-1.5 xl:px-3 rounded-full font-medium transition-colors whitespace-nowrap ${
          language === "ur" ? "bg-[#B8935A] text-[#12172A]" : "text-[#B9C9B9] hover:text-white"
        }`}
      >
        اردو
      </button>
      <button
        type="button"
        onClick={() => setLanguage("en")}
        aria-pressed={language === "en"}
        className={`px-2.5 py-1.5 xl:px-3 rounded-full font-medium transition-colors whitespace-nowrap ${
          language === "en" ? "bg-[#B8935A] text-[#12172A]" : "text-[#B9C9B9] hover:text-white"
        }`}
      >
        English
      </button>
    </div>
  );
}
