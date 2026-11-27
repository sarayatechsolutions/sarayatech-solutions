import type { FooterConfig } from "./Footer";

/**
 * A fully populated business config for Header/Footer tests (STS-038). Every value is fictional
 * (555-01xx numbers, example.com hosts): it only proves the components render the slots once the
 * owner fills src/config/business.ts. Never copy these into the real config.
 */
export const POPULATED_CONFIG: FooterConfig = {
  name: "SarayaTech Solutions",
  serviceAreaText: "Serving Columbus, OH and central Ohio",
  phone: { display: "(555) 010-0199", tel: "+15550100199" },
  email: "hello@example.com",
  address: { lines: ["100 Example Street", "Columbus, OH 43000"] },
  hours: ["Mon-Fri 9am-5pm"],
  booking: { url: "https://booking.example.com/free-consultation", verified: true },
  social: { linkedin: "https://www.linkedin.com/company/example", facebook: "https://www.facebook.com/example" },
};
