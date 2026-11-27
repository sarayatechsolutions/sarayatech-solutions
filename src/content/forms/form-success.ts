import { WORK_PATH } from "@/content/work/work";

/**
 * The next step offered by a form's success panel (design audit B6, section 3.6). US-English site
 * copy. // OWNER REVIEW: wording.
 */
export const FORM_SUCCESS_LINKS = {
  work: { label: "See our work", href: WORK_PATH },
  home: { label: "Back to home", href: "/" },
} as const;
