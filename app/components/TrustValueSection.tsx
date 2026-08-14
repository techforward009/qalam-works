"use client";

import { useLanguage } from "../lib/language-context";

const POINTS_EN = [
  "Language-aware processing for real documents",
  "Urdu, Arabic, English, and mixed-language support",
  "Publishing-focused workflow from draft to export",
  "Safe, local-first text handling in the browser",
];

const POINTS_UR = [
  "حقیقی دستاویزوں کے لیے زبان-آگاہ پروسیسنگ",
  "اردو، عربی، انگریزی اور مخلوط زبان کی معاونت",
  "مسودے سے ایکسپورٹ تک اشاعتی workflow",
  "براؤزر میں محفوظ، مقامی متن کی ہینڈلنگ",
];

export default function TrustValueSection() {
  const { language, dir } = useLanguage();
  const isUr = language === "ur";
  const points = isUr ? POINTS_UR : POINTS_EN;
  const naskh = isUr ? "font-naskh" : "";

  return (
    <section className="bg-white py-10 md:py-12 border-b border-[#1A3A2A]/6" dir={dir}>
      <div className="site-container max-w-4xl mx-auto">
        <h2
          className={`text-center text-lg md:text-xl font-bold text-[#1A3A2A] mb-6 ${
            isUr ? "font-nastaliq font-normal" : ""
          }`}
        >
          {isUr ? "کیوں Qalam Works" : "Why Qalam Works"}
        </h2>
        <ul className="grid sm:grid-cols-2 gap-3">
          {points.map((point) => (
            <li
              key={point}
              className={`rounded-xl border border-[#1A3A2A]/8 bg-[#F7F5EF] px-4 py-3 text-sm text-[#3A3830] leading-relaxed ${naskh}`}
            >
              <span className="text-[#B8935A] font-semibold me-1.5" aria-hidden>
                ✓
              </span>
              {point}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
