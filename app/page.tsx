import Hero from "./components/Hero";
import ProblemSection from "./components/ProblemSection";
import BeforeAfterSection from "./components/BeforeAfterSection";
import HowItWorksSection from "./components/HowItWorksSection";
import JobGuidanceSection from "./components/JobGuidanceSection";
import WhoItsForSection from "./components/WhoItsForSection";
import FinalCtaSection from "./components/FinalCtaSection";
import DateStudioDiscoverySection from "./components/DateStudioDiscoverySection";

export default function Home() {
  return (
    <div className="qalam-home bg-[#F7F5EF] font-sans text-[#11182A] dark:bg-[#0E1524] dark:text-[#F7F5EF]">
      <Hero />
      <JobGuidanceSection />
      <DateStudioDiscoverySection />
      <ProblemSection />
      <BeforeAfterSection />
      <HowItWorksSection />
      <WhoItsForSection />
      <FinalCtaSection />
    </div>
  );
}