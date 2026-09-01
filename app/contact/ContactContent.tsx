"use client";

import { useLanguage } from "../lib/language-context";
import { translations } from "../lib/translations";

export default function ContactContent() {
  const { language, dir } = useLanguage();
  const t = translations[language].contactPage;
  const naskh = language === "ur" ? "font-naskh" : "";

  return (
    <main className="bg-white dark:bg-transparent min-h-screen" dir={dir}>
      <div className="site-container py-16 md:py-24">
        <div className="max-w-[640px] mx-auto">
          <h1
            className={`text-3xl md:text-4xl font-bold text-[#1A3A2A] dark:text-[#e8ede9] mb-4 ${
              language === "ur" ? "font-nastaliq font-normal" : ""
            }`}
          >
            {t.heading}
          </h1>
          <p className={`text-[17px] leading-relaxed text-[#5B5748] dark:text-[#b7c5ba] mb-10 ${naskh}`}>{t.body}</p>

          <div className="bg-[#FAF7F0] dark:bg-[#162a1e] rounded-xl p-8 border border-[#151B2E]/[0.06] dark:border-white/[0.08]">
            <div className={`text-xs font-semibold uppercase tracking-wide text-[#B8935A] mb-2 ${naskh}`}>
              {t.emailLabel}
            </div>
            <a
              href="mailto:info@qalamworks.com?subject=Qalam%20Works%20Inquiry"
              dir="ltr"
              className="text-[#1A3A2A] dark:text-[#e8ede9] hover:text-[#B8935A] dark:hover:text-[#C9A46B] text-lg font-medium transition-colors block mb-4"
            >
              info@qalamworks.com
            </a>
            <p className={`text-[15px] text-[#5B5748] dark:text-[#b7c5ba] ${naskh}`}>{t.responseNote}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
