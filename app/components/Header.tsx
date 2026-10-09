"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { translations } from "../lib/translations";
import LanguageSwitch from "./LanguageSwitch";
import { useLanguage } from "../lib/language-context";

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
      className="text-white shrink-0"
    >
      <path d="M12 19l7-7 3 3-7 7-3-3z" />
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
      <path d="M2 2l7.586 7.586" />
      <circle cx="11" cy="11" r="2" />
    </svg>
  );
}

/**
 * Primary header: logo, one Tools menu, two section links,
 * language switch, and Open Studio. Services, About, and Contact
 * stay in the footer.
 */
export default function Header() {
  const pathname = usePathname();
  const {language} = useLanguage();
  const ur = language === "ur";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const t = translations[language].nav;

  const toolLinks = [
    { label: t.documentStudio, href: "/tools/document-studio" },
    { label: t.documentCleaner, href: "/tools/document-cleaner" },
    { label: t.qualityChecker, href: "/tools/quality-checker" },
    { label: t.unicodeStandardizer, href: "/tools/unicode-standardizer" },
    { label: ur ? "عربی اعراب" : "Arabic Diacritics", href: "/tools/arabic-diacritics" },
    { label: ur ? "قرآن کریم" : "Quran Editions", href: "/quran" },
    { label: t.translationStudio, href: "/tools/translation-studio" },
    { label: t.urduWriter, href: "/tools/roman-urdu-writer" },
    { label: t.urduRomanWriter, href: "/tools/urdu-roman-writer" },
    { label: ur ? "واٹس ایپ فارمیٹر" : "WhatsApp RTL", href: "/tools/whatsapp-rtl-formatter" },
    { label: t.invoiceStudio, href: "/tools/invoice-generator" },
    { label: t.dateStudio, href: "/tools/date-converter" },
    { label: ur ? "رؤیت ہلال" : "Crescent Visibility", href: "/tools/crescent-visibility" },
  ];

  const sectionLinks = [
    { label: ur ? "طریقۂ کار" : "How It Works", href: "/#how-it-works" },
    { label: ur ? "کن کے لیے" : "Who Can Use It", href: "/#who-its-for" },
  ];

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setToolsOpen(false);
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

  useEffect(() => {
    setMobileOpen(false);
    setToolsOpen(false);
    setMobileToolsOpen(false);
  }, [pathname]);

  const linkCls =
    "relative px-2 py-2 text-[14px] font-medium text-white/88 hover:text-[#7DDCB8] whitespace-nowrap transition-colors";

  function closeAll() {
    setToolsOpen(false);
    setMobileOpen(false);
    setMobileToolsOpen(false);
  }

  return (
    <div className="sticky top-0 z-50">
      <header className="bg-[#11182A] shadow-[0_10px_30px_rgba(14,21,36,0.28)]">
        <div className="site-container flex h-20 items-center justify-between gap-4" dir="ltr">
          <Link href="/" className="flex min-w-0 items-center gap-3 shrink-0" dir="ltr">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1F6C54] text-white shadow-md">
              <PenNibIcon />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[18px] font-bold leading-none tracking-tight text-white">
                Qalam Works
              </span>
              <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.18em] text-white/55">
                Publishing Tools
              </span>
            </span>
          </Link>

          <div className="hidden items-center gap-8 lg:flex">
          <nav
            ref={navRef}
            className="flex items-center gap-8"
            dir="ltr"
            aria-label="Primary"
          >
            <div className="relative">
              <button
                type="button"
                onClick={() => setToolsOpen((open) => !open)}
                aria-expanded={toolsOpen}
                aria-haspopup="menu"
                className="flex items-center gap-1 px-2 py-2 text-[14px] font-medium text-white hover:text-[#7DDCB8]"
              >
                {ur?"اوزار":"Tools"}
                <ChevronDown size={14} className={`transition-transform ${toolsOpen ? "rotate-180" : ""}`} />
              </button>
              {toolsOpen && (
                <div
                  role="menu"
                  className="absolute left-0 top-full z-50 mt-2 max-h-[70vh] w-64 overflow-y-auto rounded-xl border border-white/10 bg-[#1A2036] py-1.5 shadow-2xl"
                >
                  {toolLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      role="menuitem"
                      onClick={closeAll}
                      className="block px-4 py-2.5 text-[14px] text-white/85 hover:bg-white/5 hover:text-white"
                    >
                      {link.label}
                    </Link>
                  ))}
                  <div className="my-1 border-t border-white/10" />
                  <Link
                    href="/tools"
                    role="menuitem"
                    onClick={closeAll}
                    className="block px-4 py-2.5 text-[14px] font-semibold text-[#C9A46B] hover:bg-white/5 hover:text-[#E0BA85]"
                  >
                    {t.allTools}
                  </Link>
                </div>
              )}
            </div>

            {sectionLinks.map((link) => (
              <Link key={link.href} href={link.href} className={linkCls}>
                {link.label}
              </Link>
            ))}
          </nav>

            <LanguageSwitch />
            <Link
              href="/tools/document-studio"
              className="inline-flex min-h-10 items-center rounded-lg bg-[#2FA37D] px-5 text-[14px] font-bold text-white shadow-md transition-colors hover:bg-[#248565]"
            >
              {ur?"دستاویز اسٹوڈیو کھولیں":"Open Document Studio"}
            </Link>
          </div>

          <div className="ml-auto flex items-center gap-2 lg:hidden">
            <LanguageSwitch />
            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              className="rounded-md p-2.5 text-white hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2FA37D]"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <nav
          id="mobile-nav"
          className="border-t border-white/10 bg-[#0E1524] lg:hidden"
          dir="ltr"
          aria-label="Mobile"
        >
          <div className="site-container flex max-h-[min(75vh,560px)] flex-col overflow-y-auto py-2">
            {sectionLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeAll}
                className="border-b border-white/5 py-3.5 text-[16px] font-medium text-white"
              >
                {link.label}
              </Link>
            ))}

            <button
              type="button"
              onClick={() => setMobileToolsOpen((open) => !open)}
              aria-expanded={mobileToolsOpen}
              className="flex w-full items-center justify-between border-b border-white/5 py-3.5 text-left text-[16px] font-medium text-white"
            >
              <span>{ur?"اوزار":"Tools"}</span>
              <ChevronDown size={16} className={`transition-transform ${mobileToolsOpen ? "rotate-180" : ""}`} />
            </button>
            {mobileToolsOpen && (
              <div className="bg-white/[0.03] pb-1">
                {toolLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeAll}
                    className="block py-2.5 pl-4 pr-2 text-[15px] text-white/85 hover:text-white"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  href="/tools"
                  onClick={closeAll}
                  className="block py-2.5 pl-4 text-[15px] font-semibold text-[#C9A46B]"
                >
                  {t.allTools}
                </Link>
              </div>
            )}

            <Link
              href="/tools/document-studio"
              onClick={closeAll}
              className="mx-1 my-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-[#2FA37D] px-4 text-[15px] font-semibold text-white"
            >
              Open Studio
            </Link>
          </div>
        </nav>
      )}
    </div>
  );
}
