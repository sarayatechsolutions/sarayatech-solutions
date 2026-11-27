import HeroSection from "@/components/home/HeroSection";
import ProblemSection from "@/components/home/ProblemSection";
import ServicePillars from "@/components/home/ServicePillars";
import HowItWorks from "@/components/home/HowItWorks";
import ProofTeaser from "@/components/home/ProofTeaser";
import PackagesTeaser from "@/components/home/PackagesTeaser";
import CTASection from "@/components/home/CTASection";

/**
 * Homepage (STS-031). Order follows REQ-021: headline, core services, proof, packages teaser,
 * then the booking call to action, with the source's problem and how-it-works sections in
 * between. ValueProposition and SolutionsShowcase are no longer rendered (enterprise copy and
 * generic imagery); their files are kept.
 */
const Index = () => {
  return (
    <>
      <HeroSection />
      <ProblemSection />
      <ServicePillars />
      <HowItWorks />
      <ProofTeaser />
      <PackagesTeaser />
      <CTASection />
    </>
  );
};

export default Index;
