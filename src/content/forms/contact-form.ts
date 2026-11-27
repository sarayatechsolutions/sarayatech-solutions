/**
 * /contact form copy (design audit B6). The field labels, limits and wire shape are unchanged;
 * this adds the inline errors (the form is now `noValidate`, so it says what is wrong in its own
 * words instead of the browser's bubble) and the success panel that replaces the old dialog.
 *
 * The checks mirror the backend's (wt-be-next lib/validation.ts): name, email and message are
 * required; the email must look like an address. US-English site copy. // OWNER REVIEW: wording.
 */
export const CONTACT_FORM = {
  errors: {
    name: "Enter your name.",
    emailRequired: "Enter your email address.",
    emailInvalid: "Enter a valid email address, like name@example.com.",
    message: "Enter a message.",
    summary: "Please fix the highlighted fields and try again.",
  },
  success: {
    heading: "Thanks, we have your message.",
    body: "We've received your message.",
  },
} as const;
