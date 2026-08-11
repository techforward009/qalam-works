"use client";

import Link from "next/link";
import { useLanguage } from "../lib/language-context";
import { translations } from "../lib/translations";

const TOOL_ROUTES = [
  { key: "documentStudio", href: "/tools/document-studio" },
  { key: "documentCleaner", href: "/tools/document-cleaner", labelEn: "Document Cleaner", labelUr: "ڈاکومنٹ کلینر" },
  { key: "qualityChecker", href: "/tools/quality-checker" },
  { key: "unicodeStandardizer", href: "/tools/unicode-standardizer" },
];

export default function Footer() {
  const { language, dir } = useLanguage();
  const t = translations[language];
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#1A3A2A] border-t border-white/10 mt-16" dir={dir}>
      <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-3" dir="ltr">
            <span className="font-bold text-white">Qalam Works</span>
            <span className="font-nastaliq text-[#E8C989] text-xl leading-none">قلم ورکس</span>
          </div>
          <p className="text-[#8AAA8A] text-xs leading-relaxed">{t.footer.tagline}</p>
          <p className="text-[#8AAA8A] text-xs leading-relaxed mt-2">{t.footer.servicesNote}</p>
        </div>

        <div>
          <div className="text-[#B8935A] font-semibold text-xs uppercase tracking-wide mb-3">
            {t.footer.toolsHeading}
          </div>
          <ul className="space-y-2">
            {TOOL_ROUTES.map((tool) => (
              <li key={tool.href}>
                <Link href={tool.href} className="text-[#8AAA8A] hover:text-white text-xs transition-colors">
                  {tool.key === "documentCleaner"
                    ? language === "ur" ? tool.labelUr : tool.labelEn
                    : t.nav[tool.key as keyof typeof t.nav]}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="text-[#B8935A] font-semibold text-xs uppercase tracking-wide mb-3">
            {t.footer.contactHeading}
          </div>
          <a
            href="mailto:qalamworks.services@gmail.com?subject=Qalam%20Works%20Inquiry"
            dir="ltr"
            className="text-[#8AAA8A] hover:text-white text-xs transition-colors block mb-2"
          >
            qalamworks.services@gmail.com
          </a>
          <p className="text-[#8AAA8A] text-xs leading-relaxed">{t.footer.contactNote}</p>
        </div>
      </div>

      <div className="border-t border-white/5 py-4 text-center text-xs text-[#4A6A4A]" dir="ltr">
        © {year} Qalam Works. {t.footer.rights}
      </div>
    </footer>
  );
}
