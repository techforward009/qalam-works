import Link from "next/link";

const TOOLS = [
  {
    name: "Document Studio",
    href: "/tools/document-studio",
    body: "Write, standardize, and export — all in one place, with live quality feedback as you type.",
  },
  {
    name: "Quality Audit",
    href: "/tools/quality-checker",
    body: "Catch every inconsistency before it reaches print, in a single pass.",
  },
  {
    name: "Unicode Standardizer",
    href: "/tools/unicode-standardizer",
    body: "Fix mixed character forms across a whole document in one click.",
  },
  {
    name: "Terminology Intelligence",
    href: "/tools/document-studio",
    body: "Keep every term consistent, document-wide — automatically.",
  },
];

export default function HowItWorksSection() {
  return (
    <section className="bg-white py-24 md:py-28">
      <div className="max-w-5xl mx-auto px-6 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-[#151B2E] mb-16" dir="ltr">
          One workspace for every stage of publishing.
        </h2>

        <div className="grid sm:grid-cols-2 gap-5 text-right" dir="rtl">
          {TOOLS.map((tool) => (
            <Link
              key={tool.name}
              href={tool.href}
              className="bg-[#FAF9F6] hover:bg-[#F1ECE0] p-6 rounded-2xl border border-[#151B2E]/[0.06] transition-colors block"
            >
              <h3 className="text-base font-bold text-[#151B2E] mb-1.5" dir="ltr">
                {tool.name}
              </h3>
              <p className="text-sm text-[#5B5748] leading-relaxed" dir="ltr">
                {tool.body}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
