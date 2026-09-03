import type { Metadata } from "next";
import LocalDictationClient from "./LocalDictationClient";

export const metadata: Metadata = {
  title: "Local Whisper Dictation Labs | Qalam Works",
  description: "Internal browser-local Whisper feasibility spike. Not a production tool.",
  robots: { index: false, follow: false },
};

export default function LocalDictationLabsPage() {
  return <LocalDictationClient />;
}
