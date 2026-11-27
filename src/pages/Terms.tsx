import LegalDocument from "@/components/LegalDocument";
import FinalCta from "@/components/FinalCta";
import { TERMS_OF_USE } from "@/content/legal/terms";

/** /terms (STS-037, REQ-046): draft, noindex and out of the sitemap until C23 is approved. */
const Terms = () => (
  <>
    <LegalDocument doc={TERMS_OF_USE} name="terms" />
    {/* STS-046: the sitewide closing block, outside the legal <article>. */}
    <FinalCta id="terms" />
  </>
);

export default Terms;
