"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useLanguage } from "../lib/language-context";
import { translations } from "../lib/translations";
import LanguageSwitch from "./LanguageSwitch";

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

export default function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { language, dir } = useLanguage();
  const t = translations[language].nav;

  const navLinks = [
    { label: t.home, href: "/" },
    { label: t.documentStudio, href: "/tools/document-studio" },
    { label: t.qualityChecker, href: "/tools/quality-checker" },
    { label: t.unicodeStandardizer, href: "/tools/unicode-standardizer" },
    { label: t.services, href: "mailto:qalamworks.services@gmail.com?subject=Qalam%20Works%20Service%20Inquiry" },
  ];

  const isActive = (href: string) => !href.startsWith("mailto:") && pathname === href;

  // Single-language brand lockup: nib is always visually first in the
  // reading direction — English -> icon then "Qalam Works"; Urdu -> icon
  // then قلم ورکس, laid out RTL so the icon sits at the visual start on
  // the right. Never both wordmarks shown together.
  return (
    <header className="bg-[#1A3A2A] border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between" dir={dir}>

        <Link href="/" className="flex items-center gap-2.5" dir={dir}>
          <PenNibIcon />
          {language === "ur" ? (
            <span className="font-naskh text-xl font-bold text-white leading-none">قلم ورکس</span>
          ) : (
            <span className="font-bold text-lg text-white tracking-tight">Qalam Works</span>
          )}
        </Link>

        <nav className="hidden md:flex items-center gap-6" dir={dir}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors ${language === "ur" ? "font-naskh" : ""} ${
                isActive(link.href) ? "text-[#E8C989]" : "text-[#B9C9B9] hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <LanguageSwitch />
        </nav>

        <div className="flex items-center gap-3 md:hidden">
          <LanguageSwitch />
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="p-2 text-white"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="md:hidden border-t border-white/10 bg-[#153020]" dir={dir}>
          <div className="max-w-6xl mx-auto px-4 py-2 flex flex-col">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`py-2.5 text-sm font-medium border-b border-white/5 last:border-b-0 ${language === "ur" ? "font-naskh" : ""} ${
                  isActive(link.href) ? "text-[#E8C989]" : "text-[#B9C9B9]"
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
