import Link from "next/link";

const TOOL_LINKS = [
  { label: "Document Studio", href: "/tools/document-studio" },
  { label: "Document Cleaner", href: "/tools/document-cleaner" },
  { label: "Quality Checker", href: "/tools/quality-checker" },
  { label: "Unicode Standardizer", href: "/tools/unicode-standardizer" },
  { label: "Qalam Invoice Studio", href: "/tools/invoice-generator" },
];

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-[#1A3A2A] border-t border-white/10 mt-16">
      <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-3" dir="ltr">
            <span className="font-bold text-white">Qalam Works</span>
            <span className="font-nastaliq text-[#E8C989] text-xl leading-none">قلم ورکس</span>
          </div>
          <p className="text-[#8AAA8A] text-xs leading-relaxed" dir="rtl">
            اردو لکھائی اور اشاعت کا ڈیجیٹل معاون۔
            ترجمہ خدمات: اردو، عربی، فارسی، انگریزی۔
          </p>
        </div>
        <div dir="ltr">
          <div className="text-[#B8935A] font-semibold text-xs uppercase tracking-wide mb-3">Tools</div>
          <ul className="space-y-2">
            {TOOL_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-[#8AAA8A] hover:text-white text-xs transition-colors">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div dir="ltr">
          <div className="text-[#B8935A] font-semibold text-xs uppercase tracking-wide mb-3">Contact / رابطہ</div>
          <a href="mailto:qalamworks.services@gmail.com?subject=Qalam%20Works%20Inquiry"
            className="text-[#8AAA8A] hover:text-white text-xs transition-colors block mb-2">
            qalamworks.services@gmail.com
          </a>
          <p className="text-[#8AAA8A] text-xs leading-relaxed" dir="rtl">
            ترجمہ، تدوین، اور اشاعتی خدمات کے لیے رابطہ کریں۔
          </p>
        </div>
      </div>
      <div className="border-t border-white/5 py-4 text-center text-xs text-[#4A6A4A]" dir="ltr">
        © {year} Qalam Works. All rights reserved.
      </div>
    </footer>
  );
}
