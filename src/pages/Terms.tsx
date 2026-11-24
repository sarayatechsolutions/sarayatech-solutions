import LegalDocument from "@/components/LegalDocument";
import { TERMS_OF_USE } from "@/content/legal/terms";

/** /terms (STS-037, REQ-046): draft, noindex and out of the sitemap until C23 is approved. */
const Terms = () => <LegalDocument doc={TERMS_OF_USE} name="terms" />;

export default Terms;
