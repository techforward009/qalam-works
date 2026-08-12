"use client";

import { useLanguage } from "../../lib/language-context";
import WhatsAppRtlFormatter from "./components/WhatsAppRtlFormatter";

/**
 * Thin page wrapper that connects the portable WhatsApp RTL Formatter
 * component to Qalam Works' existing language context.
 * Layout uses site-container; dir is applied only where text needs it
 * (inside the component), never on the page layout root.
 */
export default function WhatsAppRtlFormatterContent() {
  const { language } = useLanguage();

  return (
    <main className="py-10 md:py-14">
      <div className="site-container">
        <WhatsAppRtlFormatter language={language} />
      </div>
    </main>
  );
}
