import Link from "next/link";
import Hero from "./components/Hero";
import InteractiveDemo from "./components/InteractiveDemo";
import PublicationQualityChecker from "./components/PublicationQualityChecker";
import DocumentUpload from "./components/DocumentUpload";

// Homepage Redesign (2026-08-10). Design direction: Ink Navy (#151B2E /
// #1D2440) + manuscript gold (#B8935A) — chosen specifically for this
// product's world (illuminated-manuscript ink-and-gold-leaf palette)
// rather than the generic warm-cream + amber/terracotta look the
// previous version shared with countless other AI-assisted sites.
// Signature element lives in Hero.tsx (live before/after transformation).
// Sections alternate paper (#FAF9F6) and white to keep clear visual
// separation without introducing a third color. All existing tool
// components (InteractiveDemo, PublicationQualityChecker, DocumentUpload)
// are reused unmodified — only their surrounding presentation changed.
export default function Home() {
  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#151B2E] font-sans">
      <Hero />

      {/* Why Qalam Works — three pillars, reframed around what actually
          differentiates the product from Word/Google Docs, stated in
          plain, specific terms rather than marketing adjectives. */}
      <section id="why-us" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-14" dir="rtl">
          <p className="text-xs font-semibold tracking-wide text-[#B8935A] mb-2" dir="ltr">
            WHY QALAM WORKS
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-[#151B2E] mb-2">
            Word processors weren&apos;t built for this script.
          </h2>
          <p className="font-nastaliq text-lg text-[#5B5748]">قلم ورکس اسی کے لیے بنایا گیا</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              title: "Script-native rules",
              titleUrdu: "خصوصی رسم الخط انجن",
              body: "Detects mixed Arabic/Urdu character forms, missing diacritics, and RTL layout issues generic spell-checkers never see.",
            },
            {
              title: "Minutes, not hours",
              titleUrdu: "گھنٹوں کا کام منٹوں میں",
              body: "One pass catches what would normally take a proofreader hours of manual character-by-character review.",
            },
            {
              title: "Print-ready output",
              titleUrdu: "اشاعت کے لیے تیار",
              body: "Export to Word with correct typography, spacing, and structure — ready for academic journals and publishing houses.",
            },
          ].map((pillar) => (
            <div
              key={pillar.title}
              className="bg-white p-6 rounded-2xl border border-[#151B2E]/[0.06] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <h3 className="text-base font-bold text-[#151B2E] mb-1" dir="ltr">
                {pillar.title}
              </h3>
              <p className="font-nastaliq text-sm text-[#8B3A3A] mb-3">{pillar.titleUrdu}</p>
              <p className="text-sm text-[#5B5748] leading-relaxed" dir="ltr">
                {pillar.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Live demo — moved up in the page order (was previously buried
          near the bottom) since "see it work" is a stronger conversion
          driver than more prose about the product. */}
      <div id="demo" className="bg-white border-y border-[#151B2E]/[0.06]">
        <InteractiveDemo />
      </div>

      {/* Document Studio — the flagship tool, now the primary CTA
          section rather than a small card easy to scroll past. */}
      <section className="max-w-5xl mx-auto px-6 py-20 text-center">
        <div className="bg-[#151B2E] text-white rounded-3xl p-10 md:p-14 relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-10 -bottom-10 select-none font-nastaliq text-[14rem] leading-none text-[#B8935A]/[0.08]"
          >
            ک
          </div>
          <div className="relative">
            <div
              className="inline-block bg-[#B8935A]/15 text-[#E8C989] text-xs font-medium px-3 py-1 rounded-full mb-4"
              dir="ltr"
            >
              Flagship workspace
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-1" dir="ltr">
              Document Studio
            </h2>
            <p className="font-nastaliq text-lg text-[#D8D2C4] mb-5">ڈاکومنٹ اسٹوڈیو</p>
            <p className="text-sm md:text-base text-[#B9B4A8] max-w-xl mx-auto mb-8 leading-relaxed" dir="ltr">
              A full writing workspace: rich-text editing, one-click standardization, a built-in quality
              audit, terminology consistency, and publication-ready Word export — all in one place.
            </p>
            <Link
              href="/tools/document-studio"
              className="inline-block bg-[#B8935A] hover:bg-[#C9A46B] text-[#151B2E] font-semibold px-7 py-3 rounded-lg shadow-lg transition-all text-sm"
            >
              Open Document Studio
            </Link>
          </div>
        </div>
      </section>

      {/* Who it's for — condensed from 4 large cards to a single dense
          row; the audience is one sentence each, not a mini value-prop
          per card (that repeated the "Why" section above). */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { role: "Researchers", roleUrdu: "محققین", body: "Clean academic text, precise references." },
            { role: "Translators", roleUrdu: "مترجمین", body: "Standardize multilingual text consistently." },
            { role: "Publishers", roleUrdu: "ناشرین", body: "Cut proofreading time, fix layout flaws." },
            { role: "Digital Scribes", roleUrdu: "ڈیجیٹل کاتبین", body: "Turn raw text dumps into clean documents." },
          ].map((a) => (
            <div key={a.role} className="bg-white p-4 rounded-xl border border-[#151B2E]/[0.06]">
              <h4 className="text-sm font-bold text-[#151B2E]" dir="ltr">
                {a.role}
              </h4>
              <p className="font-nastaliq text-sm text-[#8B3A3A] mb-1">{a.roleUrdu}</p>
              <p className="text-xs text-[#5B5748] leading-relaxed" dir="ltr">
                {a.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Core engines — quality checker + upload pipeline, unchanged
          internally, framed under one clear "more tools" heading rather
          than appearing as disconnected page fragments. */}
      <div className="bg-white border-y border-[#151B2E]/[0.06]">
        <div className="max-w-6xl mx-auto px-6 pt-14 pb-2 text-center" dir="rtl">
          <p className="text-xs font-semibold tracking-wide text-[#B8935A] mb-2" dir="ltr">
            MORE TOOLS
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-[#151B2E]">Every stage of publishing, covered</h2>
        </div>
        <PublicationQualityChecker />
        <DocumentUpload />
      </div>

      {/* Services — professional-services path, kept compact per
          existing v1 scope decision (no pricing table, single CTA). */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="text-xl md:text-2xl font-bold text-[#151B2E] mb-1" dir="ltr">
          Translation &amp; Publishing Services
        </h2>
        <p className="font-nastaliq text-lg text-[#8B3A3A] mb-4">ترجمہ و اشاعتی خدمات</p>
        <p className="text-sm text-[#5B5748] max-w-xl mx-auto mb-8 leading-relaxed" dir="ltr">
          Need more than a tool? We provide professional translation, editing, proofreading, and
          publication-preparation services for Urdu, Arabic, Persian, and English content.
        </p>
        <Link
          href="mailto:qalamworks.services@gmail.com?subject=Qalam%20Works%20Project%20Inquiry"
          className="inline-block bg-[#151B2E] hover:bg-[#1D2440] text-white font-semibold px-6 py-3 rounded-lg shadow-md transition-all text-sm"
        >
          Discuss Your Project
        </Link>
      </section>
    </div>
  );
}
