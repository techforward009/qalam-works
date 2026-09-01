"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Menu, X, ChevronDown, ChevronRight } from "lucide-react";
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
 * Header architecture (2026-09-01):
 * ┌─────────────────────────────────────────────────────────┐
 * │ Utility bar (h-[33px])  Services  About  Contact         │ ← always EN/LTR
 * ├─────────────────────────────────────────────────────────┤
 * │ Main header  Logo  Home  Doc Studio  Trans Studio  WA   Tools▼  [lang] │
 * └─────────────────────────────────────────────────────────┘
 *
 * Tools ▼ dropdown — grouped accordion (one group open at a time):
 *   Write & Convert ▸  Roman Urdu→Urdu, Urdu→Roman
 *   Clean & Check   ▸  Urdu Text Cleaner, Urdu Text Check, Urdu Unicode Fixer
 *   Utilities       ▸  Invoice Generator, Date Converter
 *   ───
 *   All Tools
 *
 * Mobile: primary links + Tools grouped accordion. Services/About/Contact
 * live in the utility bar only — not duplicated in mobile drawer.
 *
 * Header chrome stays English/LTR in both site languages (product rule).
 */
export default function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  useLanguage();
  const t = translations.en.nav;

  // ── Tool groups for the Tools dropdown and mobile accordion ─────────────────
  const toolGroups = [
    {
      id: "write",
      label: "Write & Convert",
      links: [
        { label: t.urduWriter,     href: "/tools/roman-urdu-writer" },
        { label: t.urduRomanWriter, href: "/tools/urdu-roman-writer" },
      ],
    },
    {
      id: "clean",
      label: "Clean & Check",
      links: [
        { label: t.documentCleaner,    href: "/tools/document-cleaner" },
        { label: t.qualityChecker,     href: "/tools/quality-checker" },
        { label: t.unicodeStandardizer, href: "/tools/unicode-standardizer" },
      ],
    },
    {
      id: "utilities",
      label: "Utilities",
      links: [
        { label: t.invoiceStudio, href: "/tools/invoice-generator" },
        { label: t.dateConverter,  href: "/tools/date-converter" },
      ],
    },
  ];

  // ── Primary nav links (desktop + mobile) ─────────────────────────────────
  const primaryLinks = [
    { label: t.home,              href: "/" },
    { label: t.documentStudio,    href: "/tools/document-studio" },
    { label: t.translationStudio, href: "/tools/translation-studio" },
    { label: "WhatsApp RTL",      href: "/tools/whatsapp-rtl-formatter" },
  ];

  // ── Outside-click + Escape ────────────────────────────────────────────────
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
        setOpenGroup(null);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setToolsOpen(false);
        setOpenGroup(null);
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

  // Close everything on route change
  useEffect(() => {
    setMobileOpen(false);
    setToolsOpen(false);
    setOpenGroup(null);
  }, [pathname]);

  const isActive = (href: string) =>
    !href.startsWith("mailto:") && pathname === href;

  const linkCls =
    "relative font-medium transition-colors whitespace-nowrap py-2 text-[14px] xl:text-[15px] 2xl:text-[16px] text-white hover:text-white";

  function toggleGroup(id: string) {
    setOpenGroup(prev => (prev === id ? null : id));
  }

  // ── Desktop: two-panel side flyout ──────────────────────────────────────────
  // Main panel lists group labels only; clicking a group opens a side flyout.
  // The flyout appears to the RIGHT — no accordion expansion inside the main panel.
  function DesktopToolsDropdown() {
    return (
      <div className="flex" role="menu">
        {/* ── Main panel: group labels ── */}
        <div className="bg-[#1A3A2A] border border-white/10 rounded-xl shadow-xl py-1.5 w-[185px] shrink-0">
          {toolGroups.map(group => (
            <button
              key={group.id}
              type="button"
              onClick={() => setOpenGroup(prev => prev === group.id ? null : group.id)}
              aria-expanded={openGroup === group.id}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-[13px] font-semibold transition-colors ${
                openGroup === group.id
                  ? "text-white bg-white/[0.09]"
                  : "text-white/80 hover:text-white hover:bg-white/5"
              }`}
            >
              <span>{group.label}</span>
              <ChevronRight
                size={13}
                className={`shrink-0 transition-transform ${openGroup === group.id ? "rotate-90 text-white" : ""}`}
              />
            </button>
          ))}
          <div className="my-1 border-t border-white/10" />
          <Link
            href="/tools"
            role="menuitem"
            onClick={() => { setToolsOpen(false); setOpenGroup(null); }}
            className="block px-4 py-2.5 text-[14px] font-semibold text-[#C9A46B] hover:text-[#E0BA85] hover:bg-white/5 transition-colors"
          >
            {t.allTools}
          </Link>
        </div>

        {/* ── Side flyout: current group links ── */}
        {openGroup && (
          <div className="ml-1 bg-[#1A3A2A] border border-white/10 rounded-xl shadow-xl py-1.5 w-[210px] shrink-0">
            {toolGroups.find(g => g.id === openGroup)?.links.map(link => (
              <Link
                key={link.href}
                href={link.href}
                role="menuitem"
                onClick={() => { setToolsOpen(false); setOpenGroup(null); }}
                className="block px-4 py-2.5 text-[14px] text-white/85 hover:text-white hover:bg-white/5 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Mobile: vertical accordion (unchanged behavior) ───────────────────────
  function MobileToolsAccordion() {
    return (
      <>
        {toolGroups.map(group => {
          const isOpen = openGroup === group.id;
          return (
            <div key={group.id}>
              <button
                type="button"
                onClick={() => setOpenGroup(prev => prev === group.id ? null : group.id)}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between px-4 py-3 text-[14px] font-semibold text-white/80 hover:text-white hover:bg-white/5 transition-colors"
              >
                <span>{group.label}</span>
                <ChevronRight
                  size={13}
                  className={`transition-transform shrink-0 ${isOpen ? "rotate-90" : ""}`}
                />
              </button>
              {isOpen && (
                <div className="bg-white/[0.04] pb-1">
                  {group.links.map(link => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => { setOpenGroup(null); setMobileOpen(false); }}
                      className="block pl-7 pr-4 py-2.5 text-[14px] text-white/85 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <div className="my-1 border-t border-white/10" />
        <Link
          href="/tools"
          onClick={() => { setOpenGroup(null); setMobileOpen(false); }}
          className="block px-4 py-3 text-[14px] font-semibold text-[#C9A46B] hover:text-[#E0BA85] hover:bg-white/5 transition-colors"
        >
          {t.allTools}
        </Link>
      </>
    );
  }

  return (
    // Sticky wrapper covers utility bar + main header + mobile drawer together
    <div className="sticky top-0 z-50">

      {/* ── Utility bar ── */}
      <div
        className="bg-[#122a1c] border-b border-white/[0.07] h-[33px] flex items-center"
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
                  ? "text-white/95 font-medium"
                  : "text-white/55 hover:text-white/85"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Main header ── */}
      <header className="bg-[#1A3A2A] border-b border-white/10">
        <div
          className="site-container h-16 lg:h-[72px] xl:h-[80px] flex items-center gap-3 lg:gap-4 min-w-0"
          dir="ltr"
        >
          {/* Brand */}
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
            className="hidden lg:flex items-center justify-center gap-2 xl:gap-4 2xl:gap-6 flex-1 min-w-0 overflow-visible"
            dir="ltr"
            aria-label="Primary"
          >
            {primaryLinks.map(link => (
              <Link key={link.href} href={link.href} className={linkCls}>
                {link.label}
                {isActive(link.href) && (
                  <span className="absolute left-0 right-0 -bottom-0.5 h-[2px] bg-[#B8935A] rounded-full" />
                )}
              </Link>
            ))}

            {/* Tools dropdown */}
            <div ref={toolsRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => { setToolsOpen(o => !o); if (toolsOpen) setOpenGroup(null); }}
                aria-expanded={toolsOpen}
                aria-haspopup="menu"
                className={linkCls + " flex items-center gap-0.5"}
              >
                Tools
                <ChevronDown
                  size={14}
                  className={`transition-transform shrink-0 ${toolsOpen ? "rotate-180" : ""}`}
                />
              </button>

              {toolsOpen && (
                <div
                  role="menu"
                  className="absolute top-full mt-1 z-50 left-0"
                >
                  <DesktopToolsDropdown />
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

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <nav
          id="mobile-nav"
          className="lg:hidden border-t border-white/10 bg-[#153020]"
          dir="ltr"
          aria-label="Mobile"
        >
          <div className="site-container py-2 flex flex-col max-h-[min(75vh,560px)] overflow-y-auto">

            {/* Primary links */}
            {primaryLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="py-3.5 text-[16px] font-medium border-b border-white/5 text-white"
              >
                {link.label}
              </Link>
            ))}

            {/* Tools section header */}
            <div className="pt-4 pb-1 px-0">
              <span className="text-[11px] font-bold uppercase tracking-widest text-white/35">
                Tools
              </span>
            </div>

            {/* Grouped tool accordion */}
            <div className="border border-white/10 rounded-xl overflow-hidden mb-2">
              <MobileToolsAccordion />
            </div>

          </div>
        </nav>
      )}
    </div>
  );
}
