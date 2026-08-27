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
  { key: "urduWriter", href: "/tools/roman-urdu-writer" },
  { key: "urduRomanWriter", href: "/tools/urdu-roman-writer", labelEn: "Urdu → Roman", labelUr: "اردو → رومن" },
  { key: "translationStudio", href: "/tools/translation-studio" },
  { key: "documentCleaner", href: "/tools/document-cleaner", labelEn: "Document Cleaner", labelUr: "ڈاکومنٹ کلینر" },
  { key: "qualityChecker", href: "/tools/quality-checker" },
  { key: "unicodeStandardizer", href: "/tools/unicode-standardizer" },
  { key: "invoiceStudio", href: "/tools/invoice-generator", labelEn: "Invoice Generator", labelUr: "انوائس جنریٹر" },
  { key: "whatsappRtlFormatter", href: "/tools/whatsapp-rtl-formatter", labelEn: "WhatsApp RTL Formatter", labelUr: "واٹس ایپ آر ٹی ایل فارمیٹر" },
];

export default function Footer() {
  const { language, dir } = useLanguage();
  const t = translations[language];
  const year = new Date().getFullYear();
  const naskh = language === "ur" ? "font-naskh" : "";

  return (
    <footer className="bg-[#1A3A2A] border-t border-white/10 mt-16" dir={dir}>
      <div className="site-container py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
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
          <p className={`text-white text-sm leading-relaxed ${naskh}`}>{t.footer.tagline}</p>
          <p className={`text-white text-sm leading-relaxed mt-2 ${naskh}`}>{t.footer.servicesNote}</p>
        </div>

        {/* Tools */}
        <div>
          <div className={`text-white font-semibold text-sm uppercase tracking-wide mb-3 ${naskh}`}>
            {t.footer.toolsHeading}
          </div>
          <ul className="space-y-2">
            {TOOL_ROUTES.map((tool) => (
              <li key={tool.href}>
                <Link href={tool.href} className={`text-white hover:text-white text-sm transition-colors ${naskh}`}>
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
          <div className={`text-white font-semibold text-sm uppercase tracking-wide mb-3 ${naskh}`}>
            {t.footer.companyHeading}
          </div>
          <ul className="space-y-2">
            <li><Link href="/about" className={`text-white hover:text-white text-sm transition-colors ${naskh}`}>{t.nav.about}</Link></li>
            <li><Link href="/services" className={`text-white hover:text-white text-sm transition-colors ${naskh}`}>{t.nav.services}</Link></li>
            <li><Link href="/contact" className={`text-white hover:text-white text-sm transition-colors ${naskh}`}>{t.nav.contact}</Link></li>
          </ul>
        </div>

        {/* Legal + Contact */}
        <div>
          <div className={`text-white font-semibold text-sm uppercase tracking-wide mb-3 ${naskh}`}>
            {t.footer.legalHeading}
          </div>
          <ul className="space-y-2 mb-5">
            <li><Link href="/privacy" className={`text-white hover:text-white text-sm transition-colors ${naskh}`}>{language === "ur" ? "رازداری" : "Privacy"}</Link></li>
            <li><Link href="/terms" className={`text-white hover:text-white text-sm transition-colors ${naskh}`}>{language === "ur" ? "شرائط" : "Terms"}</Link></li>
          </ul>
          <div className={`text-white font-semibold text-sm uppercase tracking-wide mb-2 ${naskh}`}>
            {t.footer.contactHeading}
          </div>
          {/* Contact block composition (2026-08-12) — the block as a whole
              must read naturally in RTL for Urdu (right-aligned, right-
              anchored), while the email address itself stays LTR-ordered
              characters. Only the email <a> gets dir="ltr"; the wrapping
              div follows the page's own dir so paragraph flow/alignment is
              correct instead of dragging the whole unit to the left. */}
          <div className={`flex flex-col ${language === "ur" ? "items-end" : "items-start"}`}>
            <a
              href="mailto:qalamworks.services@gmail.com?subject=Qalam%20Works%20Inquiry"
              dir="ltr"
              className="text-white hover:text-white text-sm transition-colors inline-block mb-2"
            >
              qalamworks.services@gmail.com
            </a>
            <p
              className={`text-white text-xs leading-relaxed max-w-[220px] ${language === "ur" ? "text-right" : "text-left"} ${naskh}`}
            >
              {t.contactPage.responseNote}
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/5 py-4 text-center text-sm text-white" dir="ltr">
        © {year} Qalam Works. {t.footer.rights}
      </div>
    </footer>
  );
}

