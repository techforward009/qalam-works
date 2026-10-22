"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";
import FeedbackInvitation from "./FeedbackInvitation";
import { ThemeToggle } from "./ThemeToggle";

/** Document Studio is a desktop window. Other pages keep the site chrome. */
export default function SiteFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const studio = pathname === "/tools/document-studio";

  if (studio) {
    return (
      <div data-studio-fullscreen="true" className="fixed inset-0 z-[60] flex min-h-0 flex-col bg-white">
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <div className="flex-grow">{children}</div>
      <ThemeToggle />
      <FeedbackInvitation />
      <Footer />
    </>
  );
}
