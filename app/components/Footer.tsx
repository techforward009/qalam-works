"use client";

import Link from "next/link";
import { TOOL_GROUPS, toolsInGroup } from "../lib/toolCatalog";
import { translations } from "../lib/translations";
import { useLanguage } from "../lib/language-context";

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

export default function Footer() {
  const { language, dir } = useLanguage();
  const t = translations[language];
  const year = new Date().getFullYear();

  return (
    <footer className="mt-0 border-t border-white/10 bg-[#11182A]" dir={dir} data-site-footer={language}>
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

        {/* The same public groups and order as the header and All Tools. */}
        <div className="grid gap-6 sm:col-span-2 sm:grid-cols-2 lg:col-span-3 lg:grid-cols-3">
          {TOOL_GROUPS.map(group => (
            <div key={group.id}>
              <h2 className="mb-3 text-sm font-semibold text-white" data-footer-heading="true">{group.name[language]}</h2>
              <ul className="space-y-2">
                {toolsInGroup(group).map(tool => <li key={tool.id}><Link href={tool.route} className="text-sm text-white/90 hover:text-amber-200">{tool.name[language]}</Link></li>)}
                {group.id === "islamic" && <li><Link href="/tools/khateeb-studio" className="text-sm text-white/90 hover:text-amber-200">{language === "ur" ? "خطیب اسٹوڈیو" : "Khateeb Studio"}</Link></li>}
              </ul>
            </div>
          ))}
        </div>

        {/* Company */}
        <div>
          <div className={`text-white font-semibold text-sm uppercase tracking-wide mb-3`} data-footer-heading="true">
            {t.footer.companyHeading}
          </div>
          <ul className="space-y-2">
            <li><Link href="/about" className={`text-white hover:text-white text-sm transition-colors`}>{t.nav.about}</Link></li>
            <li><Link href="/services" className={`text-white hover:text-white text-sm transition-colors`}>{t.nav.services}</Link></li>
            <li><Link href="/contact" className={`text-white hover:text-white text-sm transition-colors`}>{t.nav.contact}</Link></li>
            <li><Link href="/feedback" className="text-sm font-semibold text-amber-200 transition-colors hover:text-amber-100">{language === "ur" ? "رائے دیں" : "Feedback"}</Link></li>
          </ul>
        </div>

        {/* Legal + Contact */}
        <div>
          <div className={`text-white font-semibold text-sm uppercase tracking-wide mb-3`} data-footer-heading="true">
            {t.footer.legalHeading}
          </div>
          <ul className="space-y-2 mb-5">
            <li><Link href="/privacy" className="text-sm text-white transition-colors hover:text-white">{language === "ur" ? "رازداری" : "Privacy"}</Link></li>
            <li><Link href="/terms" className="text-sm text-white transition-colors hover:text-white">{language === "ur" ? "شرائط" : "Terms"}</Link></li>
          </ul>
          <div className={`text-white font-semibold text-sm uppercase tracking-wide mb-2`} data-footer-heading="true">
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
              className="max-w-[220px] text-start text-xs leading-relaxed text-white"
            >
              {t.contactPage.responseNote}
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/5 px-4 py-4 text-center text-white">
        <p dir={dir} lang={language} className="font-nastaliq text-sm leading-8">
          {language === "ur" ? "فونٹ: " : "Font: "}<a href="https://mehrtype.com/product/mehr-nastaliq-web/" className="underline decoration-white/40 underline-offset-4 hover:text-amber-100">{language === "ur" ? "مہر نستعلیق ویب" : "Mehr Nastaliq Web"}</a>
          {" — "}
          <a href="https://mehrtype.com/free-fonts" className="underline decoration-white/40 underline-offset-4 hover:text-amber-100">{language === "ur" ? "مہر ٹائپ" : "Mehr Type"}</a>
          {language === "ur" ? "، " : ", "}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/" className="underline decoration-white/40 underline-offset-4 hover:text-amber-100">CC BY-SA 4.0</a>
        </p>
        <p className="mt-1 text-xs leading-6 text-white/90">
          Gulzar — <a href="https://scripts.sil.org/OFL" className="underline decoration-white/40 underline-offset-4 hover:text-amber-100">SIL Open Font License 1.1</a>
        </p>
        <p dir={dir} lang={language} className="mt-1 font-nastaliq text-sm leading-8">
          {language === "ur" ? "نفیس نستعلیق v1.02" : "Nafees Nastaleeq v1.02"} — <a href="https://cle.org.pk/software/localization/Fonts/nafeesNastaleeq.html" className="underline decoration-white/40 underline-offset-4 hover:text-amber-100">{language === "ur" ? "مرکز تحقیق برائے اردو زبان (CRULP)" : "Center for Research in Urdu Language Processing (CRULP)"}</a>
          {language === "ur" ? "، " : ", "}
          <a href="https://cle.org.pk/software/license/Nafees_Nastaleeq_License.html" className="underline decoration-white/40 underline-offset-4 hover:text-amber-100">{language === "ur" ? "لائسنس" : "License"}</a>
        </p>
      </div>
      <div className="border-t border-white/5 py-4 text-center text-sm text-white" dir="ltr" data-footer-copy="true">
        © {year} Qalam Works. {t.footer.rights}
      </div>
    </footer>
  );
}

