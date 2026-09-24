import type { Metadata } from "next";
import ResearchStudioContent from "./ResearchStudioContent";

export const metadata: Metadata = {
  title: "Research Studio | Qalam Works",
  description: "Ask your uploaded documents and read the answer beside the original page and quotation.",
  alternates: { canonical: "/tools/research-studio" },
};

export default function ResearchStudioPage() {
  return <ResearchStudioContent />;
}
