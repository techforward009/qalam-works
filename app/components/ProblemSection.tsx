const PAIN_POINTS = [
  {
    title: "Mixed Unicode forms",
    example: "علي / علی",
    impact: "The same word looks different every time it's typed, breaking search and consistency.",
  },
  {
    title: "Invisible spacing issues",
    example: "لفظ،اگلا",
    impact: "A missing space after punctuation slips past every normal spell-checker, silently.",
  },
  {
    title: "Wrong punctuation",
    example: "یہ, وہ",
    impact: "English commas and marks creep into Arabic-script prose without anyone noticing.",
  },
  {
    title: "Terminology drift",
    example: "استعمار / نوآبادیاتی نظام",
    impact: "The same term gets translated two different ways across a single document.",
  },
];

export default function ProblemSection() {
  return (
    <section className="bg-[#FAF9F6] py-24 md:py-28">
      <div className="max-w-5xl mx-auto px-6 text-center" dir="rtl">
        <h2 className="text-2xl md:text-3xl font-bold text-[#151B2E] mb-3 max-w-2xl mx-auto leading-snug" dir="ltr">
          Word processors still treat Arabic script as an afterthought.
        </h2>
        <p className="text-[#5B5748] text-sm md:text-base max-w-xl mx-auto mb-16" dir="ltr">
          Every serious writer, researcher, and publisher working in Urdu, Arabic, or Persian has felt
          this frustration.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 text-right">
          {PAIN_POINTS.map((point) => (
            <div
              key={point.title}
              className="bg-white p-6 rounded-2xl border border-[#151B2E]/[0.07] text-center"
            >
              <h3 className="text-sm font-bold text-[#151B2E] mb-2" dir="ltr">
                {point.title}
              </h3>
              <p className="font-nastaliq text-lg text-[#8B3A3A] mb-3">{point.example}</p>
              <p className="text-xs text-[#5B5748] leading-relaxed" dir="ltr">
                {point.impact}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
