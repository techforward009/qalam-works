"use client";

import Link from "next/link";
import { useLanguage } from "../lib/language-context";
import { translations } from "../lib/translations";

function PenNibIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true" className="text-[#B8935A] shrink-0">
      <path d="M12 19l7-7 3 3-7 7-3-3z" />
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
      <path d="M2 2l7.586 7.586" />
      <circle cx="11" cy="11" r="2" />
    </svg>
  );
}

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
  const naskh = language === "ur" ? "font-naskh" : "";

  return (
    <footer className="bg-[#1A3A2A] border-t border-white/10 mt-16" dir={dir}>
      <div className="max-w-[1240px] mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2.5 mb-3" dir={dir}>
            <PenNibIcon />
            {language === "ur" ? (
              <span className="font-naskh text-xl font-bold text-white leading-none">قلم ورکس</span>
            ) : (
              <span className="font-bold text-white">Qalam Works</span>
            )}
          </div>
          <p className={`text-[#8AAA8A] text-xs leading-relaxed ${naskh}`}>{t.footer.tagline}</p>
          <p className={`text-[#8AAA8A] text-xs leading-relaxed mt-2 ${naskh}`}>{t.footer.servicesNote}</p>
        </div>

        <div>
          <div className={`text-[#B8935A] font-semibold text-xs uppercase tracking-wide mb-3 ${naskh}`}>
            {t.footer.toolsHeading}
          </div>
          <ul className="space-y-2">
            {TOOL_ROUTES.map((tool) => (
              <li key={tool.href}>
                <Link href={tool.href} className={`text-[#8AAA8A] hover:text-white text-xs transition-colors ${naskh}`}>
                  {tool.key === "documentCleaner"
                    ? language === "ur" ? tool.labelUr : tool.labelEn
                    : t.nav[tool.key as keyof typeof t.nav]}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className={`text-[#B8935A] font-semibold text-xs uppercase tracking-wide mb-3 ${naskh}`}>
            {t.footer.contactHeading}
          </div>
          <a
            href="mailto:qalamworks.services@gmail.com?subject=Qalam%20Works%20Inquiry"
            dir="ltr"
            className="text-[#8AAA8A] hover:text-white text-xs transition-colors block mb-2"
          >
            qalamworks.services@gmail.com
          </a>
          <p className={`text-[#8AAA8A] text-xs leading-relaxed ${naskh}`}>{t.footer.contactNote}</p>
        </div>
      </div>

      <div className="border-t border-white/5 py-4 text-center text-xs text-[#4A6A4A]" dir="ltr">
        © {year} Qalam Works. {t.footer.rights}
      </div>
    </footer>
  );
}
