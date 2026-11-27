import LegalDocument from "@/components/LegalDocument";
import FinalCta from "@/components/FinalCta";
import { PRIVACY_POLICY } from "@/content/legal/privacy";

/** /privacy (STS-037, REQ-046): draft, noindex and out of the sitemap until C23 is approved. */
const Privacy = () => (
  <>
    <LegalDocument doc={PRIVACY_POLICY} name="privacy" />
    {/* STS-046: the sitewide closing block, outside the legal <article>. */}
    <FinalCta id="privacy" />
  </>
);

export default Privacy;
