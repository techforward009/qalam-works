"use client";

import { useLanguage } from "../../lib/language-context";
import WhatsAppRtlFormatter from "./components/WhatsAppRtlFormatter";

/**
 * Thin page wrapper that connects the portable WhatsApp RTL Formatter
 * component to Qalam Works' existing language context.
 * No redesign of the tool UI — only language wiring.
 */
export default function WhatsAppRtlFormatterContent() {
  const { language, dir } = useLanguage();

  return (
    <main className="py-10 md:py-14" dir={dir}>
      <div className="site-container">
        <WhatsAppRtlFormatter language={language} />
      </div>
    </main>
  );
}
