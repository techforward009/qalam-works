import Link from "next/link";

// Footer redesign (2026-08-10) — matches header's navy/gold palette,
// positioning Qalam Works as primarily an Urdu tool with translation services.

const TOOL_LINKS = [
  { label: "Document Studio", href: "/tools/document-studio" },
  { label: "Quality Audit", href: "/tools/quality-checker" },
  { label: "Unicode Standardizer", href: "/tools/unicode-standardizer" },
  { label: "Document Cleaner", href: "/tools/document-cleaner" },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#12172A] border-t border-white/10 mt-16">
      <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">

        {/* Brand */}
        <div dir="rtl">
          <div className="flex items-center gap-2 mb-3" dir="ltr">
            <span className="font-bold text-white">Qalam Works</span>
            <span className="font-nastaliq text-[#E8C989] text-lg leading-none">قلم ورکس</span>
          </div>
          <p className="text-[#7C8299] text-xs leading-relaxed" dir="rtl">
            اردو لکھائی اور اشاعت کا ڈیجیٹل معاون۔
            ترجمہ خدمات: اردو، عربی، فارسی، انگریزی۔
          </p>
        </div>

        {/* Tools */}
        <div dir="ltr">
          <div className="text-[#B8935A] font-semibold text-xs uppercase tracking-wide mb-3">
            Tools / ٹولز
          </div>
          <ul className="space-y-2">
            {TOOL_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-[#7C8299] hover:text-[#E8C989] text-xs transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div dir="ltr">
          <div className="text-[#B8935A] font-semibold text-xs uppercase tracking-wide mb-3">
            Contact / رابطہ
          </div>
          <a
            href="mailto:qalamworks.services@gmail.com?subject=Qalam%20Works%20Inquiry"
            className="text-[#7C8299] hover:text-[#E8C989] text-xs transition-colors block mb-2"
          >
            qalamworks.services@gmail.com
          </a>
          <p className="text-[#7C8299] text-xs leading-relaxed" dir="rtl">
            ترجمہ، تدوین، اور اشاعتی خدمات کے لیے رابطہ کریں۔
          </p>
        </div>
      </div>

      <div className="border-t border-white/5 py-4 text-center text-xs text-[#4A5166]" dir="ltr">
        © {year} Qalam Works. All rights reserved.
      </div>
    </footer>
  );
}
