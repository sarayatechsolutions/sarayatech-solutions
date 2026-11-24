import HeroSection from "@/components/home/HeroSection";
import ClientLogos from "@/components/home/ClientLogos";
import ValueProposition from "@/components/home/ValueProposition";
import SolutionsShowcase from "@/components/home/SolutionsShowcase";
import StatsSection from "@/components/home/StatsSection";
import CTASection from "@/components/home/CTASection";

const Index = () => {
  return (
    <>
      <HeroSection />
      <ClientLogos />
      <ValueProposition />
      <SolutionsShowcase />
      <StatsSection />
      <CTASection />
    </>
  );
};

export default Index;
