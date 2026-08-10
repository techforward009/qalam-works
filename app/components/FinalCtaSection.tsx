import Link from "next/link";

export default function FinalCtaSection() {
  return (
    <section className="bg-[#12172A] py-28 md:py-32">
      <div className="max-w-2xl mx-auto px-6 text-center">
        <h2 className="text-2xl md:text-4xl font-bold text-white mb-4 leading-tight" dir="ltr">
          Stop fixing the same errors by hand.
        </h2>
        <p className="text-[#B9B4A8] text-base md:text-lg mb-10" dir="ltr">
          Start publishing with the confidence your work deserves.
        </p>
        <Link
          href="/tools/document-studio"
          className="inline-block bg-[#B8935A] hover:bg-[#C9A46B] text-[#12172A] font-semibold px-8 py-4 rounded-lg shadow-lg shadow-[#B8935A]/20 transition-all text-sm"
        >
          Open Document Studio
        </Link>
      </div>
    </section>
  );
}
