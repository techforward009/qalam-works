"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// Redesign (2026-08-10) — Hero signature element: a real, looping
// before/after transformation showing mixed-Unicode Urdu becoming clean,
// standardized Nastaliq — the single most characteristic thing in this
// product's world, used as the hero's visual thesis instead of a generic
// stat block or stock illustration.
const BEFORE_SAMPLE = "علي نے كتاب پڑھی  ، اور یہ Document بھی۔۔";
const AFTER_SAMPLE = "علی نے کتاب پڑھی، اور یہ دستاویز بھی۔";

export default function Hero() {
  const [showAfter, setShowAfter] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setShowAfter(true);
      return;
    }
    const interval = setInterval(() => setShowAfter((prev) => !prev), 2600);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative overflow-hidden bg-[#151B2E] text-[#F5F2EA]">
      {/* Ambient signature texture — a faint, oversized Nastaliq glyph
          watermark, evoking illuminated manuscript backgrounds without
          competing with foreground content. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-16 select-none font-nastaliq text-[22rem] leading-none text-[#B8935A]/[0.06]"
      >
        ق
      </div>

      <div className="relative max-w-6xl mx-auto px-6 pt-20 pb-24 md:pt-28 md:pb-32">
        <div className="grid md:grid-cols-2 gap-14 items-center">
          {/* Left: value proposition */}
          <div className="text-center md:text-right" dir="rtl">
            <div
              className="inline-flex items-center gap-2 rounded-full border border-[#B8935A]/40 bg-[#B8935A]/10 px-4 py-1.5 text-xs font-medium text-[#E8C989] mb-6"
              dir="ltr"
            >
              For Researchers • Translators • Publishers
            </div>

            <h1 className="text-4xl md:text-5xl font-bold leading-tight text-white mb-3" dir="ltr">
              Publishing intelligence,
              <br />
              <span className="text-[#E8C989]">built for Arabic script.</span>
            </h1>

            <p className="font-nastaliq text-xl md:text-2xl text-[#D8D2C4] mb-6 leading-loose">
              اردو، عربی اور فارسی کے لیے پیشہ ورانہ اشاعتی ذہانت
            </p>

            <p className="text-[#B9B4A8] text-sm md:text-base leading-relaxed max-w-md mx-auto md:mx-0 md:mr-0 mb-9" dir="ltr">
              Qalam Works reads your Urdu, Arabic, and Persian text the way a professional editor would —
              catching inconsistent script forms, typography errors, and terminology drift before they
              reach print.
            </p>

            <div className="flex flex-col sm:flex-row justify-center md:justify-end gap-3">
              <Link
                href="/tools/document-studio"
                className="bg-[#B8935A] hover:bg-[#C9A46B] text-[#151B2E] font-semibold px-6 py-3 rounded-lg shadow-lg shadow-[#B8935A]/20 transition-all text-sm text-center"
              >
                Open Document Studio
              </Link>
              <Link
                href="#demo"
                className="border border-white/20 hover:border-white/40 text-white font-semibold px-6 py-3 rounded-lg transition-all text-sm text-center"
              >
                See it fix real text
              </Link>
            </div>
          </div>

          {/* Right: the signature before/after transformation card */}
          <div className="relative" dir="rtl">
            <div className="rounded-2xl border border-white/10 bg-[#1D2440] shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10" dir="ltr">
                <span className="text-[11px] font-medium text-[#8A93B5] tracking-wide">DOCUMENT STUDIO</span>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full transition-colors duration-500 ${
                    showAfter ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"
                  }`}
                >
                  {showAfter ? "✓ Standardized" : "3 issues found"}
                </span>
              </div>
              <div className="p-6 min-h-[140px] flex items-center">
                <p
                  key={showAfter ? "after" : "before"}
                  className="font-nastaliq text-2xl md:text-3xl leading-loose text-white transition-opacity duration-700"
                >
                  {showAfter ? AFTER_SAMPLE : BEFORE_SAMPLE}
                </p>
              </div>
              <div className="px-6 pb-5 flex gap-2 justify-end" dir="ltr">
                {["Unicode form", "spacing", "punctuation"].map((label) => (
                  <span
                    key={label}
                    className={`text-[10px] px-2 py-1 rounded-md border transition-colors duration-500 ${
                      showAfter
                        ? "border-emerald-500/30 text-emerald-300/80 bg-emerald-500/5"
                        : "border-[#B8935A]/40 text-[#E8C989] bg-[#B8935A]/10"
                    }`}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
