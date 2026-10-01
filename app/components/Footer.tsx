"use client";

import Link from "next/link";
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
  { key: "quran", href: "/quran", labelEn: "Quran Editions", labelUr: "قرآن کریم" },
  { key: "arabicDiacritics", href: "/tools/arabic-diacritics", labelEn: "Arabic Diacritics", labelUr: "عربی اعراب" },
  { key: "invoiceStudio", href: "/tools/invoice-generator", labelEn: "Invoice Generator", labelUr: "انوائس جنریٹر" },
  { key: "dateConverter", href: "/tools/date-converter",    labelEn: "Date Converter",    labelUr: "تاریخ کنورٹر"    },
  { key: "crescentVisibility", href: "/tools/crescent-visibility", labelEn: "Crescent Visibility", labelUr: "رؤیتِ ہلال" },
  { key: "whatsappRtlFormatter", href: "/tools/whatsapp-rtl-formatter", labelEn: "WhatsApp RTL Formatter", labelUr: "واٹس ایپ آر ٹی ایل فارمیٹر" },
];

export default function Footer() {
  const t = translations.en;
  const year = new Date().getFullYear();

  return (
    <footer className="mt-0 border-t border-white/10 bg-[#11182A]" dir="ltr">
      <div className="site-container py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Brand */}
        <div className="sm:col-span-2 lg:col-span-1">
          <div className="mb-3 flex items-center gap-2.5" dir="ltr">
            <PenNibIcon />
            <span className="font-bold text-white">Qalam Works</span>
          </div>
          <p className="text-sm leading-relaxed text-white">{t.footer.tagline}</p>
          <p className="mt-2 text-sm leading-relaxed text-white">{t.footer.servicesNote}</p>
        </div>

        {/* Tools */}
        <div>
          <div className={`text-white font-semibold text-sm uppercase tracking-wide mb-3`}>
            {t.footer.toolsHeading}
          </div>
          <ul className="space-y-2">
            {TOOL_ROUTES.map((tool) => (
              <li key={tool.href}>
                <Link href={tool.href} className={`text-white hover:text-white text-sm transition-colors`}>
                  {tool.labelEn ?? t.nav[tool.key as keyof typeof t.nav]}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Company */}
        <div>
          <div className={`text-white font-semibold text-sm uppercase tracking-wide mb-3`}>
            {t.footer.companyHeading}
          </div>
          <ul className="space-y-2">
            <li><Link href="/about" className={`text-white hover:text-white text-sm transition-colors`}>{t.nav.about}</Link></li>
            <li><Link href="/services" className={`text-white hover:text-white text-sm transition-colors`}>{t.nav.services}</Link></li>
            <li><Link href="/contact" className={`text-white hover:text-white text-sm transition-colors`}>{t.nav.contact}</Link></li>
          </ul>
        </div>

        {/* Legal + Contact */}
        <div>
          <div className={`text-white font-semibold text-sm uppercase tracking-wide mb-3`}>
            {t.footer.legalHeading}
          </div>
          <ul className="space-y-2 mb-5">
            <li><Link href="/privacy" className="text-sm text-white transition-colors hover:text-white">Privacy</Link></li>
            <li><Link href="/terms" className="text-sm text-white transition-colors hover:text-white">Terms</Link></li>
          </ul>
          <div className={`text-white font-semibold text-sm uppercase tracking-wide mb-2`}>
            {t.footer.contactHeading}
          </div>
          {/* Contact block composition (2026-08-12) — the block as a whole
              must read naturally in RTL for Urdu (right-aligned, right-
              anchored), while the email address itself stays LTR-ordered
              characters. Only the email <a> gets dir="ltr"; the wrapping
              div follows the page's own dir so paragraph flow/alignment is
              correct instead of dragging the whole unit to the left. */}
          <div className="flex flex-col items-start">
            <a
              href="mailto:info@qalamworks.com?subject=Qalam%20Works%20Inquiry"
              dir="ltr"
              className="text-white hover:text-white text-sm transition-colors inline-block mb-2"
            >
              info@qalamworks.com
            </a>
            <p
              className="max-w-[220px] text-left text-xs leading-relaxed text-white"
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

