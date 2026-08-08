import Link from "next/link";

const FOOTER_LINKS = [
  { label: "Document Studio", href: "/tools/document-studio" },
  { label: "Document Cleaner", href: "/tools/document-cleaner" },
  { label: "Quality Checker", href: "/tools/quality-checker" },
  { label: "Unicode Standardizer", href: "/tools/unicode-standardizer" },
  { label: "Qalam Invoice Studio", href: "/tools/invoice-generator" },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-amber-200/80 mt-16">
      <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm" dir="ltr">
        <div>
          <div className="font-bold text-amber-900 mb-2">Qalam Works</div>
          <p className="text-gray-500 text-xs max-w-xs">
            Professional publishing tools for Urdu, Arabic &amp; Persian.
          </p>
        </div>

        <div>
          <div className="font-semibold text-gray-700 mb-2 text-xs uppercase tracking-wide">Tools</div>
          <ul className="space-y-1.5">
            {FOOTER_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-gray-500 hover:text-amber-700 text-xs">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="font-semibold text-gray-700 mb-2 text-xs uppercase tracking-wide">Contact</div>
          <a
            href="mailto:qalamworks.services@gmail.com?subject=Qalam%20Works%20Project%20Inquiry"
            className="text-gray-500 hover:text-amber-700 text-xs"
          >
            qalamworks.services@gmail.com
          </a>
        </div>
      </div>

      <div className="border-t border-amber-100 py-4 text-center text-xs text-gray-400" dir="ltr">
        © {year} Qalam Works. All rights reserved.
      </div>
    </footer>
  );
}
