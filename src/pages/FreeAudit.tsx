import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import FormPrivacyNote from "@/components/FormPrivacyNote";
import LeadSourceSelect from "@/components/LeadSourceSelect";
import LeadReferenceNote from "@/components/LeadReferenceNote";
import { TrustSlot } from "@/components/FinalCta";
import { AUDIT_FORM, AUDIT_HERO, AUDIT_INCLUDES } from "@/content/audit/audit";
import { chosenLeadSource } from "@/content/forms/lead-source";
import { trackLead } from "@/lib/analytics";
import { CONTACT_LIMITS, submitAudit, type AuditPayload } from "@/lib/contact-submit";

const container = "container mx-auto px-4 sm:px-6 lg:px-8";
const labelCls = "block text-sm font-medium mb-2";
const errCls = "mt-2 text-sm text-destructive";
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
  const common = (id: RequiredKey) => ({
    id: `audit-${id}`,
    name: id,
    value: values[id],
    onChange: set(id),
    required: true,
    "aria-required": true as const,
    "aria-invalid": errors[id] ? (true as const) : undefined,
    "aria-describedby": errors[id] ? `audit-${id}-error` : undefined,
    // STS-041: the invalid state is also drawn (border), never only announced; the message stays the cue.
    className: "aria-[invalid=true]:border-destructive",
  });
  const fieldError = (id: RequiredKey) =>
    errors[id] ? (
      <p id={`audit-${id}-error`} data-field-error className={errCls}>
        {errors[id]}
      </p>
    ) : null;
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="min-h-screen">
      <section data-audit-section="hero" className="pt-32 pb-16 gradient-primary text-primary-foreground">
        <div className={container}>
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight">{AUDIT_HERO.headline}</h1>
            <p className="text-xl md:text-2xl text-primary-foreground/90 leading-relaxed">{AUDIT_HERO.intro}</p>
          </div>
        </div>
      </section>

      <section data-audit-section="includes" aria-labelledby="audit-includes-heading" className="py-12 bg-background">
        <div className={`${container} max-w-3xl`}>
          <h2 id="audit-includes-heading" className="text-2xl font-bold mb-4">
            {AUDIT_INCLUDES.heading}
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-foreground/80">
            {AUDIT_INCLUDES.items.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </div>
      </section>

      <section data-audit-section="form" aria-labelledby="audit-form-heading" className="pb-24 bg-background">
        <div className={`${container} max-w-3xl`}>
          <div className="bg-card rounded-2xl p-6 sm:p-8 shadow-elegant border border-border">
            <h2 id="audit-form-heading" className="text-2xl font-bold mb-2">
              {AUDIT_FORM.heading}
            </h2>
            <p id="audit-required-note" className="text-sm text-secondary mb-6">{AUDIT_FORM.requiredNote}</p>

            <div role="status">
              {done && (
                <div data-audit-success className="rounded-xl border border-border bg-muted p-4 mb-6">
                  <p className="font-semibold">{AUDIT_FORM.success.heading}</p>
                  <p>{AUDIT_FORM.success.body}</p>
                  {reference && <LeadReferenceNote reference={reference} className="mt-2" />}
                </div>
              )}
            </div>
            <div role="alert">
              {failure && (
                <p data-audit-failure className="rounded-xl border border-destructive p-4 mb-6 text-destructive">
                  {failure}
                </p>
              )}
              {!failure && hasErrors && <p className="sr-only">{E.summary}</p>}
            </div>

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

              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="audit-name" className={labelCls}>
                    {f.name.label} <span aria-hidden="true">*</span>
                  </label>
                  <Input {...common("name")} autoComplete={f.name.autoComplete} maxLength={CONTACT_LIMITS.name} />
                  {fieldError("name")}
                </div>
                <div>
                  <label htmlFor="audit-company" className={labelCls}>
                    {f.company.label} <span aria-hidden="true">*</span>
                  </label>
                  <Input {...common("company")} autoComplete={f.company.autoComplete} maxLength={CONTACT_LIMITS.company} />
                  {fieldError("company")}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="audit-email" className={labelCls}>
                    {f.email.label} <span aria-hidden="true">*</span>
                  </label>
                  <Input {...common("email")} type="email" autoComplete={f.email.autoComplete} maxLength={CONTACT_LIMITS.email} />
                  {fieldError("email")}
                </div>
                <div>
                  <label htmlFor="audit-website" className={labelCls}>
                    {f.website.label} <span aria-hidden="true">*</span>
                  </label>
                  <Input
                    {...common("website")}
                    aria-describedby={[errors.website ? "audit-website-error" : null, "audit-website-hint"].filter(Boolean).join(" ")}
                    type="text"
                    inputMode="url"
                    autoComplete="url"
                    placeholder={f.website.placeholder}
                    maxLength={WEBSITE_MAX}
                  />
                  <p id="audit-website-hint" className="mt-2 text-sm text-secondary">
                    {f.website.hint}
                  </p>
                  {fieldError("website")}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="audit-phone" className={labelCls}>
                    {f.phone.label}
                  </label>
                  <Input
                    id="audit-phone"
                    name="phone"
                    type="tel"
                    autoComplete={f.phone.autoComplete}
                    maxLength={CONTACT_LIMITS.phone}
                    value={values.phone}
                    onChange={set("phone")}
                  />
                </div>
                <LeadSourceSelect id="audit-source" value={values.source} onChange={set("source")} labelClassName={labelCls} />
              </div>

              <div>
                <label htmlFor="audit-message" className={labelCls}>
                  {f.message.label}
                </label>
                <Textarea
                  id="audit-message"
                  name="message"
                  rows={4}
                  maxLength={CONTACT_LIMITS.message}
                  value={values.message}
                  onChange={set("message")}
                />
              </div>

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
            </form>
          </div>
        </div>
      </section>
      {/* STS-046: this page is the conversion step, so the closing block is the trust slot only. */}
      <TrustSlot id="free-audit" standalone />
    </div>
  );
};

export default FreeAudit;
