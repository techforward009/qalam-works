"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import { useLanguage } from "../lib/language-context";
import { translations } from "../lib/translations";
import LanguageSwitch from "./LanguageSwitch";

function PenNibIcon({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true" className="text-[#B8935A] shrink-0">
      <path d="M12 19l7-7 3 3-7 7-3-3z" />
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
      <path d="M2 2l7.586 7.586" />
      <circle cx="11" cy="11" r="2" />
    </svg>
  );
}

// Header — visual balance, NOT forced mathematical centering: brand
// anchors its edge, language selector anchors the opposite edge, nav
// takes the natural remaining middle space with generous safe gaps
// (mr/ml-14 = 56px) so no group ever visually touches another.
export default function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const { language } = useLanguage();
  // Header is always English + LTR regardless of body language mode.
  const t = translations.en.nav;

  // Close "More Tools" dropdown when clicking outside
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const primaryLinks = [
    { label: t.home, href: "/" },
    { label: t.documentStudio, href: "/tools/document-studio" },
    { label: t.documentCleaner, href: "/tools/document-cleaner" },
    { label: t.qualityChecker, href: "/tools/quality-checker" },
    { label: t.unicodeStandardizer, href: "/tools/unicode-standardizer" },
  ];

  const moreLinks = [
    { label: t.invoiceStudio, href: "/tools/invoice-generator" },
    { label: t.whatsappRtlFormatter, href: "/tools/whatsapp-rtl-formatter" },
    { label: t.services, href: "/services" },
    { label: t.about, href: "/about" },
    { label: t.contact, href: "/contact" },
  ];

  const allMobileLinks = [...primaryLinks, ...moreLinks];

  const isActive = (href: string) => !href.startsWith("mailto:") && pathname === href;

  return (
    <header className="bg-[#1A3A2A] border-b border-white/10 sticky top-0 z-50">
      <div className="site-container h-[84px] flex items-center justify-between" dir="ltr">

        <Link href="/" className="flex items-center gap-3 shrink-0 mr-14" dir="ltr">
          <PenNibIcon />
          <span className="font-bold text-[24px] text-white tracking-tight leading-none whitespace-nowrap">Qalam Works</span>
        </Link>

        <nav className="hidden md:flex items-center gap-9 flex-1 justify-center min-w-0" dir="ltr">
          {primaryLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`relative text-[17px] font-medium transition-colors whitespace-nowrap py-2 ${
                isActive(link.href) ? "text-[#E8C989]" : "text-[#C7D6C7] hover:text-white"
              }`}
            >
              {link.label}
              {isActive(link.href) && (
                <span className="absolute left-0 right-0 -bottom-0.5 h-[2px] bg-[#B8935A] rounded-full" />
              )}
            </Link>
          ))}

          {/* More Tools dropdown */}
          <div ref={moreRef} className="relative">
            <button
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              className={`flex items-center gap-1 text-[17px] font-medium transition-colors whitespace-nowrap py-2 ${
                moreLinks.some((l) => isActive(l.href)) ? "text-[#E8C989]" : "text-[#C7D6C7] hover:text-white"
              }`}
            >
              {t.moreTools}
              <ChevronDown size={15} className={`transition-transform ${moreOpen ? "rotate-180" : ""}`} />
            </button>
            {moreOpen && (
              <div className={`absolute top-full mt-1 bg-[#1A3A2A] border border-white/10 rounded-xl shadow-xl py-2 min-w-[180px] z-50 left-0`}>
                {moreLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMoreOpen(false)}
                    className={`block px-4 py-2.5 text-[15px] transition-colors ${
                      isActive(link.href) ? "text-[#E8C989]" : "text-[#C7D6C7] hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        <div className="hidden md:flex items-center shrink-0 ml-14">
          <LanguageSwitch />
        </div>

        <div className="flex md:hidden items-center gap-3 shrink-0">
          <LanguageSwitch />
          <button type="button" onClick={() => setMobileOpen((o) => !o)} className="p-2 text-white" aria-label="Menu">
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="md:hidden border-t border-white/10 bg-[#153020]" dir="ltr">
          <div className="site-container py-2 flex flex-col">
            {allMobileLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`py-3.5 text-[17px] font-medium border-b border-white/5 last:border-b-0 ${
                  isActive(link.href) ? "text-[#E8C989]" : "text-[#C7D6C7]"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
