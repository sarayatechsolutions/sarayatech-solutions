import FinalCta from "@/components/FinalCta";

/**
 * Home final call to action (STS-031, REQ-063), now the sitewide closing block (STS-046, GAP-05):
 * "Get My Free Audit" -> /free-audit, a consultation via bookingHref(), and the trust slot.
 */
const CTASection = () => <FinalCta id="home" sectionAttrs={{ "data-home-section": "final-cta" }} />;

export default CTASection;
