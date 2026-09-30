import Hero from "./components/Hero";
import BeforeAfterSection from "./components/BeforeAfterSection";
import HowItWorksSection from "./components/HowItWorksSection";
import WhoItsForSection from "./components/WhoItsForSection";
import FinalCtaSection from "./components/FinalCtaSection";
import DateStudioDiscoverySection from "./components/DateStudioDiscoverySection";

export default function Home() {
  return (
    <div className="bg-[#F7F5EF] font-sans text-[#11182A] dark:bg-[#0E1524] dark:text-[#F7F5EF]">
      <Hero />
      <BeforeAfterSection />
      <HowItWorksSection />
      <DateStudioDiscoverySection />
      <WhoItsForSection />
      <FinalCtaSection />
    </div>
  );
}