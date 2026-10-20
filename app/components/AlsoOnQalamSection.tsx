"use client";

import Link from "next/link";
import { useLanguage } from "../lib/language-context";

export default function AlsoOnQalamSection() {
  const { language, dir } = useLanguage();
  return <section className="border-y border-[#1A2036]/10 px-6 py-8 dark:border-white/10" dir={dir}>
    <div className="site-container flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
      <h2 className="text-lg font-semibold">{language === "ur" ? "قلم ورکس پر یہ بھی دستیاب ہے" : "Also on Qalam Works"}</h2>
      <Link href="/quran" className="text-sm font-semibold text-[#1F6C54] underline underline-offset-4 dark:text-[#7DDCB8]">{language === "ur" ? "قرآن ریڈر" : "Quran Reader"}</Link>
      <Link href="/tools/crescent-visibility" className="text-sm font-semibold text-[#1F6C54] underline underline-offset-4 dark:text-[#7DDCB8]">{language === "ur" ? "رؤیتِ ہلال" : "Crescent Visibility"}</Link>
    </div>
  </section>;
}
