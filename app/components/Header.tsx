"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Document Studio", href: "/tools/document-studio" },
  { label: "Document Cleaner", href: "/tools/document-cleaner" },
  { label: "Quality Checker", href: "/tools/quality-checker" },
  { label: "Unicode Standardizer", href: "/tools/unicode-standardizer" },
  { label: "Services", href: "/#services" },
];

export default function Header() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // "/#services" is an anchor on the homepage, not its own route — never
  // treat it as the "active" page the way an exact pathname match would.
  const isActive = (href: string) => href !== "/#services" && pathname === href;

  return (
    <header className="bg-white border-b border-amber-200/80 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg text-amber-900" dir="ltr">
          Qalam Works
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6" dir="ltr">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors ${
                isActive(link.href) ? "text-amber-700 font-bold" : "text-gray-600 hover:text-amber-700"
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
          className="md:hidden p-2 text-amber-900"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile dropdown panel */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-amber-200/80 bg-white" dir="ltr">
          <div className="max-w-6xl mx-auto px-4 py-2 flex flex-col">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`py-2.5 text-sm font-medium border-b border-amber-100 last:border-b-0 ${
                  isActive(link.href) ? "text-amber-700 font-bold" : "text-gray-600"
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
