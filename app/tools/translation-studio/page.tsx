import type { Metadata } from "next";
import TranslationStudioClient from "./TranslationStudioClient";

export const metadata: Metadata = {
  title: "Translation Studio — Qalam Works",
  description: "Professional workspace for human translators — Urdu, Arabic, Persian, English.",
};

export default function TranslationStudioPage() {
  return <TranslationStudioClient />;
}
