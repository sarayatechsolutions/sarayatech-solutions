import { CONTACT_PATH } from "@/config/business";
import { SERVICES_BASE_PATH } from "@/content/services/services";

/**
 * The 404 page (design audit B7, FD section 5: "Oops! Page not found" -> "We can't find that page").
 * Three ways on, all real routes; no search box (there is no site search to send it to).
 */
// OWNER REVIEW: the helper sentence.
export const NOT_FOUND = {
  eyebrow: "Error 404",
  heading: "We can't find that page",
  body: "The link may be out of date, or the address may have a typo. Try one of these instead.",
  links: {
    home: { label: "Go to the home page", href: "/" },
    services: { label: "See our services", href: SERVICES_BASE_PATH },
    contact: { label: "Contact us", href: CONTACT_PATH },
  },
} as const;
