"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import { useLanguage } from "../lib/language-context";
import { translations } from "../lib/translations";
import LanguageSwitch from "./LanguageSwitch";

function PenNibIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="text-[#B8935A] shrink-0"
    >
      <path d="M12 19l7-7 3 3-7 7-3-3z" />
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
      <path d="M2 2l7.586 7.586" />
      <circle cx="11" cy="11" r="2" />
    </svg>
  );
}

/**
 * Header responsive strategy (2026-08-13 hotfix):
 * - Below lg (1024): hamburger + language switch (no colliding desktop row)
 * - lg–xl: compact full nav (tighter gaps, 14–15px labels)
 * - xl+: roomier gaps and type
 * Desktop nav never uses the old md (768) breakpoint — that left 5 long
 * nowrap labels + gap-9 + mr/ml-14 fighting a ~1280–1366 laptop row.
 * Header chrome stays English/LTR by product rule.
 */
export default function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const mobileNavRef = useRef<HTMLElement>(null);
  useLanguage(); // keep language context subscription for LanguageSwitch children
  const t = translations.en.nav;

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMoreOpen(false);
        setMobileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
    setMoreOpen(false);
  }, [pathname]);

  const primaryLinks = [
    { label: t.home, href: "/" },
    { label: t.documentStudio, href: "/tools/document-studio" },
    { label: t.translationStudio, href: "/tools/translation-studio" },
    { label: "WhatsApp RTL", href: "/tools/whatsapp-rtl-formatter" },
  ];

  const moreLinks = [
    { label: t.urduWriter, href: "/tools/roman-urdu-writer" },
    { label: "Urdu → Roman", href: "/tools/urdu-roman-writer" },
    { label: t.documentCleaner, href: "/tools/document-cleaner" },
    { label: t.qualityChecker, href: "/tools/quality-checker" },
    { label: t.unicodeStandardizer, href: "/tools/unicode-standardizer" },
    { label: t.invoiceStudio, href: "/tools/invoice-generator" },
    { label: t.services, href: "/services" },
    { label: t.about, href: "/about" },
    { label: t.contact, href: "/contact" },
  ];

  const allMobileLinks = [...primaryLinks, ...moreLinks];

  const isActive = (href: string) => !href.startsWith("mailto:") && pathname === href;

  const linkClass = (href: string) =>
    `relative font-medium transition-colors whitespace-nowrap py-2 text-[14px] xl:text-[15px] 2xl:text-[16px] ${
      isActive(href) ? "text-[#E8C989]" : "text-[#C7D6C7] hover:text-white"
    }`;

  return (
    <header className="bg-[#1A3A2A] border-b border-white/10 sticky top-0 z-50">
      <div className="site-container h-16 lg:h-[72px] xl:h-[80px] flex items-center gap-3 lg:gap-4 min-w-0" dir="ltr">
        {/* Brand — never shrinks into the nav; modest size so laptop rows fit */}
        <Link
          href="/"
          className="flex items-center gap-2 shrink-0 min-w-0 max-w-[42%] sm:max-w-none"
          dir="ltr"
        >
          <PenNibIcon size={22} />
          <span className="font-bold text-[17px] sm:text-[18px] lg:text-[19px] xl:text-[21px] text-white tracking-tight leading-none whitespace-nowrap">
            Qalam Works
          </span>
        </Link>

        {/* Desktop / laptop nav — lg+ only */}
        <nav
          className="hidden lg:flex items-center justify-center gap-2 xl:gap-4 2xl:gap-6 flex-1 min-w-0 overflow-visible"
          dir="ltr"
          aria-label="Primary"
        >
          {primaryLinks.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass(link.href)}>
              {link.label}
              {isActive(link.href) && (
                <span className="absolute left-0 right-0 -bottom-0.5 h-[2px] bg-[#B8935A] rounded-full" />
              )}
            </Link>
          ))}

          <div ref={moreRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              className={`flex items-center gap-0.5 font-medium transition-colors whitespace-nowrap py-2 text-[14px] xl:text-[15px] 2xl:text-[16px] ${
                moreLinks.some((l) => isActive(l.href))
                  ? "text-[#E8C989]"
                  : "text-[#C7D6C7] hover:text-white"
              }`}
            >
              {t.moreTools}
              <ChevronDown
                size={14}
                className={`transition-transform shrink-0 ${moreOpen ? "rotate-180" : ""}`}
              />
            </button>
            {moreOpen && (
              <div
                role="menu"
                className="absolute top-full mt-1 bg-[#1A3A2A] border border-white/10 rounded-xl shadow-xl py-2 min-w-[200px] max-w-[min(280px,calc(100vw-2rem))] z-50 left-0"
              >
                {moreLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    role="menuitem"
                    onClick={() => setMoreOpen(false)}
                    className={`block px-4 py-2.5 text-[15px] transition-colors ${
                      isActive(link.href)
                        ? "text-[#E8C989]"
                        : "text-[#C7D6C7] hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Desktop language switch */}
        <div className="hidden lg:flex items-center shrink-0">
          <LanguageSwitch />
        </div>

        {/* Tablet/mobile: language + hamburger */}
        <div className="flex lg:hidden items-center gap-2 shrink-0 ml-auto">
          <LanguageSwitch />
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="p-2.5 text-white rounded-md hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8935A]"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          id="mobile-nav"
          ref={mobileNavRef}
          className="lg:hidden border-t border-white/10 bg-[#153020]"
          dir="ltr"
          aria-label="Mobile"
        >
          <div className="site-container py-2 flex flex-col max-h-[min(70vh,520px)] overflow-y-auto">
            {allMobileLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`py-3.5 text-[16px] font-medium border-b border-white/5 last:border-b-0 ${
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
