"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

// Header update (2026-08-10):
// - Forest Green (#1A3A2A) background — distinct from homepage navy
// - Original nav links preserved exactly
// - Services href → email (was /#services which reopened homepage)
// - Logo: pen-nib icon | English left | اردو Nastaliq right
// - Gold (#B8935A) accents for active state and CTA

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Document Studio", href: "/tools/document-studio" },
  { label: "Document Cleaner", href: "/tools/document-cleaner" },
  { label: "Quality Checker", href: "/tools/quality-checker" },
  { label: "Unicode Standardizer", href: "/tools/unicode-standardizer" },
  { label: "Services", href: "mailto:qalamworks.services@gmail.com?subject=Qalam%20Works%20Service%20Inquiry" },
];

function PenNibIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true" className="text-[#B8935A]">
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

  const isActive = (href: string) =>
    !href.startsWith("mailto:") && pathname === href;

  return (
    <header className="bg-[#1A3A2A] border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo: pen icon + English + اردو */}
        <Link href="/" className="flex items-center gap-2" dir="ltr">
          <PenNibIcon />
          <span className="font-bold text-white text-lg">Qalam Works</span>
          <span className="font-nastaliq text-[#E8C989] text-xl leading-none pr-1">قلم ورکس</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6" dir="ltr">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors ${
                isActive(link.href)
                  ? "text-[#E8C989]"
                  : "text-[#B9C9B9] hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          className="md:hidden p-2 text-white"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-white/10 bg-[#153020]" dir="ltr">
          <div className="max-w-6xl mx-auto px-4 py-2 flex flex-col">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`py-2.5 text-sm font-medium border-b border-white/5 last:border-b-0 ${
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
