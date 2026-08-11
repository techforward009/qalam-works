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

// Header (precision pass): a real 3-zone CSS grid (1fr | auto | 1fr) so
// the center navigation is mathematically centered on the viewport,
// never shifted by brand-width or language-switch-width differences —
// ordinary flex justify-between cannot guarantee this when the two
// outer zones have different content widths.
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

  const brand = (
    <Link href="/" className="flex items-center gap-2.5" dir={dir}>
      <PenNibIcon />
      {language === "ur" ? (
        <span className="font-naskh text-[26px] font-bold text-white leading-none">قلم ورکس</span>
      ) : (
        <span className="font-bold text-[24px] text-white tracking-tight leading-none">Qalam Works</span>
      )}
    </Link>
  );

  return (
    <header className="bg-[#1A3A2A] border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-[1240px] mx-auto px-6 h-[80px] grid grid-cols-[1fr_auto_1fr] items-center" dir={dir}>
        <div className={dir === "rtl" ? "justify-self-end" : "justify-self-start"}>{brand}</div>

        <nav className="hidden md:flex items-center gap-8" dir={dir}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-[16px] font-medium transition-colors whitespace-nowrap ${naskh} ${
                isActive(link.href) ? "text-[#E8C989]" : "text-[#C7D6C7] hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className={`hidden md:flex items-center ${dir === "rtl" ? "justify-self-start" : "justify-self-end"}`}>
          <LanguageSwitch />
        </div>

        <div className={`flex md:hidden items-center gap-3 col-start-3 justify-self-end`}>
          <LanguageSwitch />
          <button type="button" onClick={() => setMobileOpen((o) => !o)} className="p-2 text-white" aria-label="Menu">
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="md:hidden border-t border-white/10 bg-[#153020]" dir={dir}>
          <div className="max-w-[1240px] mx-auto px-6 py-2 flex flex-col">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`py-3 text-[16px] font-medium border-b border-white/5 last:border-b-0 ${naskh} ${
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
