const AUDIENCES = [
  { role: "Researchers", body: "Clean citations, ready for review." },
  { role: "Translators", body: "Consistent terms across every draft." },
  { role: "Publishers", body: "Fewer proofreading rounds, faster print." },
  { role: "Academic Institutions", body: "Standardized output at scale." },
];

export default function WhoItsForSection() {
  return (
    <section className="bg-[#FAF9F6] py-24 md:py-28">
      <div className="max-w-5xl mx-auto px-6 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-[#151B2E] mb-16" dir="ltr">
          Built for people who refuse to compromise on quality.
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {AUDIENCES.map((a) => (
            <div key={a.role}>
              <h3 className="text-sm font-bold text-[#151B2E] mb-1" dir="ltr">
                {a.role}
              </h3>
              <p className="text-sm text-[#5B5748]" dir="ltr">
                {a.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
