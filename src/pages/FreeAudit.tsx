import { useRef, useState, type FormEvent } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import FormPrivacyNote from "@/components/FormPrivacyNote";
import LeadSourceSelect from "@/components/LeadSourceSelect";
import { FormField } from "@/components/form/FormField";
import FormError from "@/components/form/FormError";
import FormSuccess from "@/components/form/FormSuccess";
import { TrustSlot } from "@/components/FinalCta";
import PageHero from "@/components/PageHero";
import { AUDIT_FORM, AUDIT_HERO, AUDIT_INCLUDES } from "@/content/audit/audit";
import { chosenLeadSource } from "@/content/forms/lead-source";
import { trackLead } from "@/lib/analytics";
import { CONTACT_LIMITS, submitAudit, type AuditPayload } from "@/lib/contact-submit";

const container = "container mx-auto px-4 sm:px-6 lg:px-8";
const E = AUDIT_FORM.errors;

/**
 * STS-052 D1: the backend refuses a website longer than this (wt-be-next lib/validation.ts
 * WEBSITE_MAX), before and after URL normalisation. The form checks the same limit, so the visitor
 * gets an accurate message instead of a server 400.
 */
export const WEBSITE_MAX = 200;

/** True when the address (after https:// is added) is over the backend's length limit. */
export function websiteTooLong(raw: string): boolean {
  const v = raw.trim();
  if (!v) return false;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(v) ? v : `https://${v}`;
  if (withScheme.length > WEBSITE_MAX) return true;
  try {
    return new URL(withScheme).href.length > WEBSITE_MAX;
  } catch {
    return false;
  }
}

/**
 * Bare domains get https:// prepended; the result must parse as an http(s) URL with a dotted host,
 * no credentials, and fit the backend's WEBSITE_MAX.
 */
export function normalizeWebsite(raw: string): string | null {
  const v = raw.trim();
  // A5-4: the backend refuses any whitespace, control character or DEL, so this does too.
  // eslint-disable-next-line no-control-regex
  if (!v || /[\s\u0000-\u001f\u007f]/.test(v) || websiteTooLong(v)) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withScheme);
    if ((u.protocol !== "http:" && u.protocol !== "https:") || !u.hostname.includes(".")) return null;
    if (/^\.|\.$/.test(u.hostname)) return null;
    if (u.username || u.password) return null;
    return withScheme;
  } catch {
    return null;
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Values = {
  name: string;
  company: string;
  email: string;
  website: string;
  phone: string;
  source: string;
  message: string;
  nickname: string;
};
type RequiredKey = "name" | "company" | "email" | "website";
type Errors = Partial<Record<RequiredKey, string>>;
const EMPTY: Values = { name: "", company: "", email: "", website: "", phone: "", source: "", message: "", nickname: "" };
const ORDER: RequiredKey[] = ["name", "company", "email", "website"];

function validate(v: Values): Errors {
  const e: Errors = {};
  if (!v.name.trim()) e.name = E.name;
  if (!v.company.trim()) e.company = E.company;
  if (!v.email.trim()) e.email = E.emailRequired;
  else if (!EMAIL_RE.test(v.email.trim())) e.email = E.emailInvalid;
  if (!v.website.trim()) e.website = E.websiteRequired;
  else if (websiteTooLong(v.website)) e.website = E.websiteTooLong;
  else if (!normalizeWebsite(v.website)) e.website = E.websiteInvalid;
  return e;
}

const FreeAudit = () => {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  // STS-084: the backend's lead reference, already checked by contact-submit; null when absent.
  const [reference, setReference] = useState<string | null>(null);
  const [failure, setFailure] = useState("");
  const inFlight = useRef(false);

  const set = (k: keyof Values) => (e: { target: { value: string } }) =>
    setValues((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (inFlight.current) return;
    setFailure("");
    setDone(false);
    setReference(null);
    const found = validate(values);
    setErrors(found);
    const first = ORDER.find((k) => found[k]);
    if (first) {
      document.getElementById(`audit-${first}`)?.focus();
      return;
    }
    inFlight.current = true;
    setLoading(true);
    const payload: AuditPayload = {
      leadType: "audit",
      name: values.name.trim(),
      email: values.email.trim(),
      company: values.company.trim(),
      website: normalizeWebsite(values.website) as string,
      ...(values.phone.trim() ? { phone: values.phone.trim() } : {}),
      ...(values.message.trim() ? { message: values.message.trim() } : {}),
      ...chosenLeadSource(values.source),
      nickname: values.nickname,
    };
    try {
      const result = await submitAudit(payload);
      if (result.ok === true) {
        // STS-050: success only; form id and the fixed lead-source value, never a field the visitor typed.
        // The reference is shown to the visitor only; it is never sent to analytics.
        trackLead("audit", payload.source);
        setReference(result.reference ?? null);
        setDone(true);
        setValues(EMPTY);
      } else {
        // The server's own message is shown on a 400; anything else gets the generic one.
        setFailure(result.kind === "validation" ? result.message : AUDIT_FORM.failure);
      }
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  };


  const f = AUDIT_FORM.fields;
  // The required fields share their wiring; FormField adds the ids, aria-invalid and aria-describedby.
  const common = (id: RequiredKey) => ({
    name: id,
    value: values[id],
    onChange: set(id),
    required: true,
    "aria-required": true as const,
  });
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="min-h-screen">
      <PageHero
        id="audit-heading"
        title={AUDIT_HERO.headline}
        intro={AUDIT_HERO.intro}
        sectionAttrs={{ "data-audit-section": "hero" }}
      />

      {/* Design audit B4: one rhythm. The includes list and the form are one step, so they share
          one band (`section`) instead of two paddings of their own. */}
      <div className={`section bg-background ${container}`}>
        <section data-audit-section="includes" aria-labelledby="audit-includes-heading" className="mb-10 lg:mb-12">
          <h2 id="audit-includes-heading" className="text-h3 text-foreground mb-4">
            {AUDIT_INCLUDES.heading}
          </h2>
          {/* Design audit B6: a checklist (icon + text), the same pattern as the service cards. */}
          <ul className="space-y-3 max-w-measure">
            {AUDIT_INCLUDES.items.map((i) => (
              <li key={i} className="flex items-start gap-3 text-foreground/80">
                <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <span>{i}</span>
              </li>
            ))}
          </ul>
        </section>

        <section
          data-audit-section="form"
          aria-labelledby={done ? "audit-success-heading" : "audit-form-heading"}
          className="max-w-3xl"
        >
          {/* FF-1: always mounted, so the success panel that replaces the form is announced; the
              panel's heading takes focus and the panel scrolls into view. */}
          <div role="status">
            {done && (
              <FormSuccess
                headingId="audit-success-heading"
                heading={AUDIT_FORM.success.heading}
                body={AUDIT_FORM.success.body}
                reference={reference}
                textAttrs={{ "data-audit-success": "" }}
              />
            )}
          </div>

          {!done && (
            <Card>
              <h2 id="audit-form-heading" className="text-h3 text-foreground mb-2">
                {AUDIT_FORM.heading}
              </h2>
              <p id="audit-required-note" className="text-small text-secondary mb-6">{AUDIT_FORM.requiredNote}</p>

              <form
                onSubmit={handleSubmit}
                noValidate
                className="space-y-6"
                aria-busy={loading}
                aria-labelledby="audit-form-heading"
                aria-describedby="audit-required-note"
              >
                {/* Honeypot: hidden from people and assistive tech; bots fill it. */}
                <div
                  data-audit-honeypot
                  aria-hidden="true"
                  style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}
                >
                  <label htmlFor="audit-nickname">Nickname</label>
                  <input
                    id="audit-nickname"
                    name="nickname"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={values.nickname}
                    onChange={set("nickname")}
                  />
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <FormField id="audit-name" label={f.name.label} required error={errors.name}>
                    {(a11y) => <Input {...a11y} {...common("name")} autoComplete={f.name.autoComplete} maxLength={CONTACT_LIMITS.name} />}
                  </FormField>
                  <FormField id="audit-company" label={f.company.label} required error={errors.company}>
                    {(a11y) => (
                      <Input {...a11y} {...common("company")} autoComplete={f.company.autoComplete} maxLength={CONTACT_LIMITS.company} />
                    )}
                  </FormField>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <FormField id="audit-email" label={f.email.label} required error={errors.email}>
                    {(a11y) => (
                      <Input {...a11y} {...common("email")} type="email" autoComplete={f.email.autoComplete} maxLength={CONTACT_LIMITS.email} />
                    )}
                  </FormField>
                  <FormField id="audit-website" label={f.website.label} required hint={f.website.hint} error={errors.website}>
                    {(a11y) => (
                      <Input
                        {...a11y}
                        {...common("website")}
                        type="text"
                        inputMode="url"
                        autoComplete="url"
                        placeholder={f.website.placeholder}
                        maxLength={WEBSITE_MAX}
                      />
                    )}
                  </FormField>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <FormField id="audit-phone" label={f.phone.label}>
                    {(a11y) => (
                      <Input
                        {...a11y}
                        name="phone"
                        type="tel"
                        autoComplete={f.phone.autoComplete}
                        maxLength={CONTACT_LIMITS.phone}
                        value={values.phone}
                        onChange={set("phone")}
                      />
                    )}
                  </FormField>
                  <LeadSourceSelect id="audit-source" value={values.source} onChange={set("source")} />
                </div>

                <FormField id="audit-message" label={f.message.label}>
                  {(a11y) => (
                    <Textarea
                      {...a11y}
                      name="message"
                      rows={4}
                      maxLength={CONTACT_LIMITS.message}
                      value={values.message}
                      onChange={set("message")}
                    />
                  )}
                </FormField>

                {/* FF-1: the failure sits next to the button, is announced and takes focus; what the
                    visitor typed is kept. */}
                <FormError message={failure} summary={hasErrors ? E.summary : undefined} attrs={{ "data-audit-failure": "" }} />

                <div className="space-y-4">
                  <Button
                    type="submit"
                    variant="primary"
                    size="xl"
                    className="w-full sm:w-auto"
                    loading={loading}
                    loadingLabel={AUDIT_FORM.sending}
                  >
                    {AUDIT_FORM.submit}
                  </Button>
                  {/* REQ-173: privacy link next to the submit button, worded to agree with /privacy. */}
                  <FormPrivacyNote />
                </div>
              </form>
            </Card>
          )}
        </section>
      </div>
      {/* STS-046: this page is the conversion step, so the closing block is the trust slot only. */}
      <TrustSlot id="free-audit" standalone />
    </div>
  );
};

export default FreeAudit;
