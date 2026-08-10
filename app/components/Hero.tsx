import Link from "next/link";

// Homepage Redesign v2 (2026-08-10) — premium hero, per approved wireframe.
// The mockup is now a STATIC, calm "product window" (not the earlier
// animated before/after toggle, which the client flagged as feeling
// "technical and cold"). The actual before/after emotional moment now
// lives in its own dedicated section further down the page — the Hero's
// job is just to make the product feel real and premium at first glance.
export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#12172A] text-[#F5F2EA]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 -top-24 select-none font-nastaliq text-[26rem] leading-none text-[#B8935A]/[0.05]"
      >
        ق
      </div>

      <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-28 md:pt-32 md:pb-36">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          {/* Left: narrative */}
          <div className="text-center md:text-right" dir="rtl">
            <div
              className="inline-flex items-center gap-2 rounded-full border border-[#B8935A]/30 bg-[#B8935A]/10 px-4 py-1.5 text-xs font-medium tracking-wide text-[#E8C989] mb-7"
              dir="ltr"
            >
              BUILT FOR ARABIC SCRIPT
            </div>

            <h1 className="text-4xl md:text-[3.25rem] font-bold leading-[1.15] text-white mb-5" dir="ltr">
              Arabic script is not
              <br />a second-class citizen.
            </h1>

            <p className="text-[#B9B4A8] text-base md:text-lg leading-relaxed max-w-lg mx-auto md:mx-0 mb-10" dir="ltr">
              Qalam Works finds the inconsistencies, spacing errors, and terminology drift that Word
              and Google Docs were never designed to catch — in Urdu, Arabic, and Persian.
            </p>

            <div className="flex flex-col sm:flex-row justify-center md:justify-end gap-3 mb-8">
              <Link
                href="/tools/document-studio"
                className="bg-[#B8935A] hover:bg-[#C9A46B] text-[#12172A] font-semibold px-7 py-3.5 rounded-lg shadow-lg shadow-[#B8935A]/20 transition-all text-sm text-center"
              >
                Open Document Studio
              </Link>
              <Link
                href="#before-after"
                className="border border-white/15 hover:border-white/35 hover:bg-white/5 text-white font-semibold px-7 py-3.5 rounded-lg transition-all text-sm text-center"
              >
                See real before &amp; after
              </Link>
            </div>

            <p className="text-xs text-[#7C8299] tracking-wide" dir="ltr">
              Researchers · Translators · Publishers · Academia
            </p>
          </div>

          {/* Right: realistic, static product window */}
          <div dir="ltr">
            <div className="rounded-xl border border-white/10 bg-[#1A2036] shadow-2xl shadow-black/40 overflow-hidden">
              {/* Window chrome */}
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-white/10 bg-white/[0.02]">
                <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                <span className="w-2.5 h-2.5 rounded-full bg-white/15" />
                <span className="ml-3 text-[11px] text-[#7C8299] tracking-wide">Document Studio</span>
              </div>

              {/* Document body with real Urdu text + inline issue highlights */}
              <div className="p-6" dir="rtl">
                <p className="font-nastaliq text-2xl leading-loose text-[#EDEAE1]">
                  <span className="relative">
                    علي
                    <span className="absolute left-0 right-0 -bottom-0.5 h-[2px] bg-red-400/70 rounded-full" />
                  </span>{" "}
                  نے کتاب پڑھی
                  <span className="relative">
                    ،
                    <span className="absolute left-0 right-0 -bottom-0.5 h-[2px] bg-red-400/70 rounded-full" />
                  </span>{" "}
                  اور یہ دستاویز بھی۔
                </p>
              </div>

              {/* Issue panel */}
              <div className="border-t border-white/10 bg-[#151A2C] px-5 py-4 space-y-2.5">
                <div className="flex items-start gap-2.5 text-xs" dir="ltr">
                  <span className="mt-0.5 text-amber-400">●</span>
                  <span className="text-[#C7C2B4]">
                    Mixed Unicode form — <span className="font-nastaliq">"علي"</span> should be{" "}
                    <span className="font-nastaliq">"علی"</span>
                  </span>
                </div>
                <div className="flex items-start gap-2.5 text-xs" dir="ltr">
                  <span className="mt-0.5 text-amber-400">●</span>
                  <span className="text-[#C7C2B4]">Missing space after punctuation</span>
                </div>
                <div className="pt-2 flex items-center justify-between border-t border-white/5" dir="ltr">
                  <span className="text-[11px] text-[#7C8299]">2 issues found</span>
                  <span className="text-[11px] font-semibold text-emerald-400">Ready to fix</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
