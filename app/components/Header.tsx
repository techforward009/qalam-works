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
 * Header architecture (2026-09-01 v3):
 *
 * ┌──────────────────────────────────────────────────────────────────┐
 * │ Utility bar 33px  light in dark mode  │ Services  About  Contact │
 * ├──────────────────────────────────────────────────────────────────┤
 * │ Logo  Home  Doc Studio  Doc Cleaner▼  WhatsApp RTL  Tools▼  Utilities▼  [lang] │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * Document Cleaner ▼  → Urdu Text Cleaner, Urdu Text Check, Urdu Unicode Fixer
 * Tools ▼             → Translation Studio, Roman Urdu→Urdu, Urdu→Roman, ─, All Tools
 * Utilities ▼         → Invoice Generator, Date Converter
 *
 * Each top-level dropdown is independent; only one open at a time.
 * Desktop dropdowns: flat list panel below the button.
 * Mobile: vertical accordion for each group.
 * Utility bar: dark in light mode, light sage in dark mode.
 * Header chrome always English/LTR.
 *
 * Sticky header total heights (utility bar + main header):
 *   mobile: 33 + 64 = 97px
 *   lg:     33 + 72 = 105px
 *   xl:     33 + 80 = 113px
 */

type MenuId = "cleaner" | "tools" | "utilities";

export default function Header() {
  const pathname = usePathname();
  const [mobileOpen,   setMobileOpen]  = useState(false);
  const [activeMenu,   setActiveMenu]  = useState<MenuId | null>(null);
  // Mobile accordion — which section is expanded
  const [mobileGroup,  setMobileGroup] = useState<MenuId | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  useLanguage();
  const t = translations.en.nav;

  // ── Menu definitions ────────────────────────────────────────────────────────
  const cleanerLinks = [
    { label: t.documentCleaner,     href: "/tools/document-cleaner" },
    { label: t.qualityChecker,      href: "/tools/quality-checker" },
    { label: t.unicodeStandardizer, href: "/tools/unicode-standardizer" },
  ];

  const toolsLinks = [
    { label: t.translationStudio,  href: "/tools/translation-studio" },
    { label: t.urduWriter,         href: "/tools/roman-urdu-writer" },
    { label: t.urduRomanWriter,    href: "/tools/urdu-roman-writer" },
  ];

  const utilitiesLinks = [
    { label: t.invoiceStudio, href: "/tools/invoice-generator" },
    { label: t.dateConverter,  href: "/tools/date-converter" },
  ];

  // ── Primary flat links (desktop + mobile) ───────────────────────────────────
  const primaryLinks = [
    { label: t.home,           href: "/" },
    { label: t.documentStudio, href: "/tools/document-studio" },
  ];

  // ── Outside-click + Escape ──────────────────────────────────────────────────
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setActiveMenu(null);
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
    setActiveMenu(null);
    setMobileGroup(null);
  }, [pathname]);

  const isActive = (href: string) =>
    !href.startsWith("mailto:") && pathname === href;

  // Slightly compact nav text for a lighter feel
  const linkCls =
    "relative font-medium transition-colors whitespace-nowrap py-2 " +
    "text-[13px] xl:text-[14px] text-white hover:text-white";

  const dropdownBtnCls =
    "flex items-center gap-0.5 font-medium transition-colors whitespace-nowrap py-2 " +
    "text-[13px] xl:text-[14px] text-white hover:text-white";

  function toggle(id: MenuId) {
    setActiveMenu(prev => (prev === id ? null : id));
  }

  // ── Shared dropdown panel styles ────────────────────────────────────────────
  const dropPanel =
    "absolute top-full mt-1 z-50 left-0 bg-[#1A3A2A] border border-white/10 " +
    "rounded-xl shadow-xl py-1.5 min-w-[195px]";

  const dropLink =
    "block px-4 py-2.5 text-[14px] text-white/85 hover:text-white " +
    "hover:bg-white/5 transition-colors whitespace-nowrap";

  function closeAll() { setActiveMenu(null); setMobileOpen(false); }

  // ── Mobile accordion section ─────────────────────────────────────────────────
  function MobileSection({
    id, label, links, allToolsLink,
  }: {
    id: MenuId;
    label: string;
    links: { label: string; href: string }[];
    allToolsLink?: boolean;
  }) {
    const isOpen = mobileGroup === id;
    return (
      <div>
        <button
          type="button"
          onClick={() => setMobileGroup(prev => prev === id ? null : id)}
          aria-expanded={isOpen}
          className="w-full flex items-center justify-between px-4 py-3 text-[14px] font-semibold text-white/80 hover:text-white hover:bg-white/5 transition-colors"
        >
          <span>{label}</span>
          <ChevronDown
            size={13}
            className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </button>
        {isOpen && (
          <div className="bg-white/[0.04] pb-1">
            {links.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeAll}
                className="block pl-7 pr-4 py-2.5 text-[14px] text-white/85 hover:text-white hover:bg-white/5 transition-colors"
              >
                {link.label}
              </Link>
            ))}
            {allToolsLink && (
              <>
                <div className="mx-4 my-1 border-t border-white/10" />
                <Link
                  href="/tools"
                  onClick={closeAll}
                  className="block pl-7 pr-4 py-2.5 text-[14px] font-semibold text-[#C9A46B] hover:text-[#E0BA85] hover:bg-white/5 transition-colors"
                >
                  {t.allTools}
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-50">

      {/* ── Utility bar ─────────────────────────────────────────────────────── */}
      {/* Light sage in dark mode — visually separates from the dark main header */}
      <div
        className="bg-[#E7EFE8] border-b border-[#1A3A2A]/10 h-[33px] flex items-center"
        dir="ltr"
      >
        <div className="site-container flex items-center justify-end gap-5">
          {[
            { label: "Services", href: "/services" },
            { label: "About",    href: "/about" },
            { label: "Contact",  href: "/contact" },
          ].map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className={`text-[12px] transition-colors whitespace-nowrap ${
                isActive(href)
                  ? "text-[#1A3A2A] font-medium"
                  : "text-[#1A3A2A]/55 hover:text-[#1A3A2A]"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Main header ─────────────────────────────────────────────────────── */}
      <header className="bg-[#1A3A2A] border-b border-white/10">
        <div
          className="site-container h-16 lg:h-[72px] xl:h-[80px] flex items-center gap-2 lg:gap-3 min-w-0"
          dir="ltr"
        >
          {/* Brand — never shrinks */}
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

          {/* Desktop nav — lg+ only */}
          <nav
            ref={navRef}
            className="hidden lg:flex items-center justify-center gap-1 xl:gap-2 2xl:gap-4 flex-1 min-w-0 overflow-visible"
            dir="ltr"
            aria-label="Primary"
          >
            {/* Flat primary links */}
            {primaryLinks.map(link => (
              <Link key={link.href} href={link.href} className={linkCls}>
                {link.label}
                {isActive(link.href) && (
                  <span className="absolute left-0 right-0 -bottom-0.5 h-[2px] bg-[#B8935A] rounded-full" />
                )}
              </Link>
            ))}

            {/* Document Cleaner ▼ */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => toggle("cleaner")}
                aria-expanded={activeMenu === "cleaner"}
                aria-haspopup="menu"
                className={dropdownBtnCls}
              >
                Document Cleaner
                <ChevronDown
                  size={13}
                  className={`transition-transform shrink-0 ${activeMenu === "cleaner" ? "rotate-180" : ""}`}
                />
              </button>
              {activeMenu === "cleaner" && (
                <div role="menu" className={dropPanel}>
                  {cleanerLinks.map(link => (
                    <Link key={link.href} href={link.href} role="menuitem"
                      onClick={closeAll} className={dropLink}>
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* WhatsApp RTL — flat */}
            <Link href="/tools/whatsapp-rtl-formatter" className={linkCls}>
              WhatsApp RTL
              {isActive("/tools/whatsapp-rtl-formatter") && (
                <span className="absolute left-0 right-0 -bottom-0.5 h-[2px] bg-[#B8935A] rounded-full" />
              )}
            </Link>

            {/* Writing & Translation ▼ */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => toggle("tools")}
                aria-expanded={activeMenu === "tools"}
                aria-haspopup="menu"
                className={dropdownBtnCls}
              >
                Writing & Translation
                <ChevronDown
                  size={13}
                  className={`transition-transform shrink-0 ${activeMenu === "tools" ? "rotate-180" : ""}`}
                />
              </button>
              {activeMenu === "tools" && (
                <div role="menu" className={dropPanel}>
                  {toolsLinks.map(link => (
                    <Link key={link.href} href={link.href} role="menuitem"
                      onClick={closeAll} className={dropLink}>
                      {link.label}
                    </Link>
                  ))}
                  <div className="my-1 border-t border-white/10" />
                  <Link
                    href="/tools"
                    role="menuitem"
                    onClick={closeAll}
                    className="block px-4 py-2.5 text-[14px] font-semibold text-[#C9A46B] hover:text-[#E0BA85] hover:bg-white/5 transition-colors"
                  >
                    {t.allTools}
                  </Link>
                </div>
              )}
            </div>

            {/* Utilities ▼ */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => toggle("utilities")}
                aria-expanded={activeMenu === "utilities"}
                aria-haspopup="menu"
                className={dropdownBtnCls}
              >
                Utilities
                <ChevronDown
                  size={13}
                  className={`transition-transform shrink-0 ${activeMenu === "utilities" ? "rotate-180" : ""}`}
                />
              </button>
              {activeMenu === "utilities" && (
                <div role="menu" className={dropPanel.replace("left-0", "right-0")}>
                  {utilitiesLinks.map(link => (
                    <Link key={link.href} href={link.href} role="menuitem"
                      onClick={closeAll} className={dropLink}>
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

          {/* Mobile: language + hamburger */}
          <div className="flex lg:hidden items-center gap-2 shrink-0 ml-auto">
            <LanguageSwitch />
            <button
              type="button"
              onClick={() => setMobileOpen(o => !o)}
              className="p-2.5 text-white rounded-md hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B8935A]"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile drawer ─────────────────────────────────────────────────── */}
      {mobileOpen && (
        <nav
          id="mobile-nav"
          className="lg:hidden border-t border-white/10 bg-[#153020]"
          dir="ltr"
          aria-label="Mobile"
        >
          <div className="site-container py-2 flex flex-col max-h-[min(75vh,580px)] overflow-y-auto">

            {/* Primary flat links */}
            {[...primaryLinks,
              { label: "WhatsApp RTL", href: "/tools/whatsapp-rtl-formatter" },
            ].map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeAll}
                className="py-3.5 text-[16px] font-medium border-b border-white/5 text-white"
              >
                {link.label}
              </Link>
            ))}

            {/* Tools label */}
            <div className="pt-4 pb-1">
              <span className="text-[11px] font-bold uppercase tracking-widest text-white/35">
                Tools
              </span>
            </div>

            {/* Mobile accordion sections */}
            <div className="border border-white/10 rounded-xl overflow-hidden mb-2">
              <MobileSection
                id="cleaner"
                label="Document Cleaner"
                links={cleanerLinks}
              />
              <div className="border-t border-white/10" />
              <MobileSection
                id="tools"
                label="Writing & Translation"
                links={toolsLinks}
                allToolsLink
              />
              <div className="border-t border-white/10" />
              <MobileSection
                id="utilities"
                label="Utilities"
                links={utilitiesLinks}
              />
            </div>

          </div>
        </nav>
      )}
    </div>
  );
}
