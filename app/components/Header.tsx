"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
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
  const { language, dir } = useLanguage();
  const t = translations[language].nav;
  const naskh = language === "ur" ? "font-naskh" : "";

  const navLinks = [
    { label: t.home, href: "/" },
    { label: t.documentStudio, href: "/tools/document-studio" },
    { label: t.qualityChecker, href: "/tools/quality-checker" },
    { label: t.unicodeStandardizer, href: "/tools/unicode-standardizer" },
    { label: t.services, href: "mailto:qalamworks.services@gmail.com?subject=Qalam%20Works%20Service%20Inquiry" },
  ];

  const isActive = (href: string) => !href.startsWith("mailto:") && pathname === href;

  return (
    <header className="bg-[#1A3A2A] border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-[1280px] mx-auto px-8 h-[84px] flex items-center justify-between" dir={dir}>

        <Link href="/" className={`flex items-center gap-3 shrink-0 ${dir === "rtl" ? "ml-14" : "mr-14"}`} dir={dir}>
          <PenNibIcon />
          {language === "ur" ? (
            <span className="font-nastaliq text-[27px] font-normal text-white leading-[1.9] pb-1 whitespace-nowrap">قلم ورکس</span>
          ) : (
            <span className="font-bold text-[24px] text-white tracking-tight leading-none whitespace-nowrap">Qalam Works</span>
          )}
        </Link>

        <nav className="hidden md:flex items-center gap-9 flex-1 justify-center min-w-0" dir={dir}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`relative text-[17px] font-medium transition-colors whitespace-nowrap py-2 ${naskh} ${
                isActive(link.href) ? "text-[#E8C989]" : "text-[#C7D6C7] hover:text-white"
              }`}
            >
              {link.label}
              {isActive(link.href) && (
                <span className="absolute left-0 right-0 -bottom-0.5 h-[2px] bg-[#B8935A] rounded-full" />
              )}
            </Link>
          ))}
        </nav>

        <div className={`hidden md:flex items-center shrink-0 ${dir === "rtl" ? "mr-14" : "ml-14"}`}>
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
        <nav className="md:hidden border-t border-white/10 bg-[#153020]" dir={dir}>
          <div className="max-w-[1280px] mx-auto px-8 py-2 flex flex-col">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`py-3.5 text-[17px] font-medium border-b border-white/5 last:border-b-0 ${naskh} ${
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
