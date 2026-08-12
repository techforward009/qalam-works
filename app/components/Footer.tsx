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
  { key: "invoiceStudio", href: "/tools/invoice-generator", labelEn: "Invoice Studio", labelUr: "انوائس اسٹوڈیو" },
];

export default function Footer() {
  const { language, dir } = useLanguage();
  const t = translations[language];
  const year = new Date().getFullYear();
  const naskh = language === "ur" ? "font-naskh" : "";

  return (
    <footer className="bg-[#1A3A2A] border-t border-white/10 mt-16" dir={dir}>
      <div className="max-w-[1240px] mx-auto px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Brand */}
        <div className="sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2.5 mb-3" dir={dir}>
            <PenNibIcon />
            {language === "ur" ? (
              <span className="font-nastaliq text-xl font-normal text-white leading-none">قلم ورکس</span>
            ) : (
              <span className="font-bold text-white">Qalam Works</span>
            )}
          </div>
          <p className={`text-[#8AAA8A] text-sm leading-relaxed ${naskh}`}>{t.footer.tagline}</p>
          <p className={`text-[#8AAA8A] text-sm leading-relaxed mt-2 ${naskh}`}>{t.footer.servicesNote}</p>
        </div>

        {/* Tools */}
        <div>
          <div className={`text-[#B8935A] font-semibold text-sm uppercase tracking-wide mb-3 ${naskh}`}>
            {t.footer.toolsHeading}
          </div>
          <ul className="space-y-2">
            {TOOL_ROUTES.map((tool) => (
              <li key={tool.href}>
                <Link href={tool.href} className={`text-[#8AAA8A] hover:text-white text-sm transition-colors ${naskh}`}>
                  {tool.labelEn
                    ? language === "ur" ? tool.labelUr : tool.labelEn
                    : t.nav[tool.key as keyof typeof t.nav]}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Company */}
        <div>
          <div className={`text-[#B8935A] font-semibold text-sm uppercase tracking-wide mb-3 ${naskh}`}>
            {t.footer.companyHeading}
          </div>
          <ul className="space-y-2">
            <li><Link href="/about" className={`text-[#8AAA8A] hover:text-white text-sm transition-colors ${naskh}`}>{t.nav.about}</Link></li>
            <li><Link href="/services" className={`text-[#8AAA8A] hover:text-white text-sm transition-colors ${naskh}`}>{t.nav.services}</Link></li>
            <li><Link href="/contact" className={`text-[#8AAA8A] hover:text-white text-sm transition-colors ${naskh}`}>{t.nav.contact}</Link></li>
          </ul>
        </div>

        {/* Legal + Contact */}
        <div>
          <div className={`text-[#B8935A] font-semibold text-sm uppercase tracking-wide mb-3 ${naskh}`}>
            {t.footer.legalHeading}
          </div>
          <ul className="space-y-2 mb-5">
            <li><Link href="/privacy" className={`text-[#8AAA8A] hover:text-white text-sm transition-colors ${naskh}`}>{language === "ur" ? "رازداری" : "Privacy"}</Link></li>
            <li><Link href="/terms" className={`text-[#8AAA8A] hover:text-white text-sm transition-colors ${naskh}`}>{language === "ur" ? "شرائط" : "Terms"}</Link></li>
          </ul>
          <div className={`text-[#B8935A] font-semibold text-sm uppercase tracking-wide mb-2 ${naskh}`}>
            {t.footer.contactHeading}
          </div>
          <a
            href="mailto:qalamworks.services@gmail.com?subject=Qalam%20Works%20Inquiry"
            dir="ltr"
            className="text-[#8AAA8A] hover:text-white text-sm transition-colors block mb-1"
          >
            qalamworks.services@gmail.com
          </a>
        </div>
      </div>

      <div className="border-t border-white/5 py-4 text-center text-sm text-[#4A6A4A]" dir="ltr">
        © {year} Qalam Works. {t.footer.rights}
      </div>
    </footer>
  );
}

