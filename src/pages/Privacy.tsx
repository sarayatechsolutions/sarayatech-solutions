import LegalDocument from "@/components/LegalDocument";
import { PRIVACY_POLICY } from "@/content/legal/privacy";

/** /privacy (STS-037, REQ-046): draft, noindex and out of the sitemap until C23 is approved. */
const Privacy = () => <LegalDocument doc={PRIVACY_POLICY} name="privacy" />;

export default Privacy;
