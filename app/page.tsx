import Hero from "./components/Hero";
import ProblemSection from "./components/ProblemSection";
import BeforeAfterSection from "./components/BeforeAfterSection";
import HowItWorksSection from "./components/HowItWorksSection";
import WhoItsForSection from "./components/WhoItsForSection";
import FinalCtaSection from "./components/FinalCtaSection";

// Homepage Redesign v2 (2026-08-10) — rebuilt to the client's approved
// wireframe: exactly 7 sections (Nav is in layout.tsx's <Header/>),
// strict background rhythm Dark → Light → Soft-tinted → Light → Light →
// Dark, no embedded live-tool widgets in the main narrative (the
// existing interactive tool components — InteractiveDemo,
// PublicationQualityChecker, DocumentUpload — remain fully live on
// their own dedicated pages, e.g. via "How it Works" links; the
// marketing homepage itself stays a pure conversion narrative per the
// approved spec, which explicitly caps the page at these 7 sections).
export default function Home() {
  return (
    <div className="text-[#151B2E] font-sans">
      <Hero />
      <ProblemSection />
      <BeforeAfterSection />
      <HowItWorksSection />
      <WhoItsForSection />
      <FinalCtaSection />
    </div>
  );
}
