"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

// Header redesign (2026-08-10):
// - Navy (#12172A) + Gold (#B8935A) matches homepage dark sections
// - قلم ورکس in Nastaliq on the right (RTL-natural position), English left
// - Inline SVG pen-nib icon in the logo — no new dependency
// - Services link now points to /tools/document-studio (was /#services
//   which just reopened the homepage with no clear landing point)
// - Nav simplified: only 3 links + CTA button (was 6 links, too many)

const NAV_LINKS = [
  { label: "Document Studio", href: "/tools/document-studio" },
  { label: "Quality Audit", href: "/tools/quality-checker" },
  { label: "خدمات / Services", href: "mailto:qalamworks.services@gmail.com?subject=Qalam%20Works%20Service%20Inquiry" },
];

function PenNibIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="text-[#B8935A]"
    >
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
    <header className="bg-[#12172A] border-b border-white/10 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 md:h-18 flex items-center justify-between">

        {/* Logo — pen-nib icon + bilingual wordmark */}
        <Link href="/" className="flex items-center gap-2.5" dir="ltr">
          <PenNibIcon />
          <span className="font-bold text-lg text-white tracking-tight">Qalam Works</span>
          <span className="font-nastaliq text-lg text-[#E8C989] leading-none">قلم ورکس</span>
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
                  : "text-[#B9B4A8] hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/tools/document-studio"
            className="bg-[#B8935A] hover:bg-[#C9A46B] text-[#12172A] font-semibold px-4 py-2 rounded-lg text-sm transition-all"
          >
            Open Studio
          </Link>
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
        <nav className="md:hidden border-t border-white/10 bg-[#1A2036]" dir="ltr">
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`py-2.5 text-sm font-medium border-b border-white/5 last:border-b-0 ${
                  isActive(link.href) ? "text-[#E8C989]" : "text-[#B9B4A8]"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/tools/document-studio"
              onClick={() => setMobileOpen(false)}
              className="mt-2 bg-[#B8935A] text-[#12172A] font-semibold px-4 py-2.5 rounded-lg text-sm text-center"
            >
              Open Studio
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
