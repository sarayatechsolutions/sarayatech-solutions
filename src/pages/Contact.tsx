import { useEffect, useRef, useState } from "react";
import { CalendarDays, Clock, Mail, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import FormPrivacyNote from "@/components/FormPrivacyNote";
import LeadSourceSelect from "@/components/LeadSourceSelect";
import { TrustSlot } from "@/components/FinalCta";
import PageHero from "@/components/PageHero";
import { FormField, NativeSelect } from "@/components/form/FormField";
import FormError from "@/components/form/FormError";
import FormSuccess from "@/components/form/FormSuccess";
import {
  CONTACT_LIMITS,
  submitContact,
  type ContactPayload,
} from "@/lib/contact-submit";
import { chosenLeadSource } from "@/content/forms/lead-source";
import { contactContext } from "@/content/forms/contact-context";
import { CONTACT_FORM } from "@/content/forms/contact-form";
import { trackLead } from "@/lib/analytics";
import { SERVICE_INTERESTS, SERVICE_INTEREST_UNSURE } from "@/content/forms/service-interest";
import {
  BUSINESS,
  bookingHref,
  emailHref,
  hasAddress,
  hasHours,
  hasVerifiedBooking,
  phoneHref,
} from "@/config/business";
import { consultationCtaLabel } from "@/content/cta";

/**
 * The business facts this page reads. Production always uses BUSINESS; tests pass a populated
 * copy so the "owner filled the config" rendering is proven without mutating the shared constant.
 */
export type ContactConfig = NonNullable<Parameters<typeof phoneHref>[0]> & {
  name: string;
  serviceAreaText: string;
};

const DEFAULT_CONFIG = BUSINESS as unknown as ContactConfig;

/**
 * Reply-time copy. C16 / I-12 (06-OWNER-INPUTS.md) are OPEN, so no response time is promised.
 * Replace with the confirmed wording once the owner commits to one.
 */
const REPLY_COPY = "We'll reply as soon as we can.";

const EMPTY_FORM: ContactPayload = {
  name: "",
  email: "",
  phone: "",
  company: "",
  service: SERVICE_INTEREST_UNSURE, // Set default value to avoid uncontrolled warning
  message: "",
  nickname: "",
};

/** The same shape check as /free-audit; the backend's stricter one still has the last word. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RequiredKey = "name" | "email" | "message";
type Errors = Partial<Record<RequiredKey, string>>;
const ORDER: RequiredKey[] = ["name", "email", "message"];
const E = CONTACT_FORM.errors;

/**
 * Design audit B6: the form is `noValidate`, so the browser's bubbles are replaced by inline errors
 * in the site's words. The rules are the ones the browser applied before (name, email and message
 * required; an email address) and the backend applies (blank after trimming is missing). The
 * payload itself is not changed: it is still exactly what the visitor typed.
 */
function validate(v: ContactPayload): Errors {
  const e: Errors = {};
  if (!v.name.trim()) e.name = E.name;
  if (!v.email.trim()) e.email = E.emailRequired;
  else if (!EMAIL_RE.test(v.email.trim())) e.email = E.emailInvalid;
  if (!v.message.trim()) e.message = E.message;
  return e;
}

const container = "container mx-auto px-4 sm:px-6 lg:px-8";
const infoText = "text-small text-secondary";

type ContactProps = { config?: ContactConfig };

const Contact = ({ config = DEFAULT_CONFIG }: ContactProps) => {
  // Every fact goes through a business.ts helper: a slot renders only when its value is confirmed.
  const phone = phoneHref(config);
  const email = emailHref(config);
  const address = hasAddress(config) ? config.address : null;
  const hours = hasHours(config) ? config.hours : null;
  const booking = hasVerifiedBooking(config) ? bookingHref(config) : null;
  // A map is pinned to the street address, so it needs a confirmed address too (C4).
  const mapSrc = address?.mapEmbedUrl || null;
  const [formData, setFormData] = useState<ContactPayload>(EMPTY_FORM);
  // STS-054: the optional lead source; "" means not chosen, and then no `source` is sent.
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [errorMessage, setErrorMessage] = useState("");
  // Design audit B6 / FF-1: a sent form is replaced by the success panel.
  const [done, setDone] = useState(false);
  // STS-084: the backend's lead reference, already checked by contact-submit; null when absent.
  const [reference, setReference] = useState<string | null>(null);
  // A ref, not state: it blocks a second submit even before React re-renders.
  const inFlight = useRef(false);

  // FF-10: a CTA from a service page or a pricing card says what was asked for. Read after the
  // first render (the prerendered HTML has no query string, so hydration matches) and only
  // through the allow-list in contact-context.ts; an unknown value changes nothing.
  useEffect(() => {
    const ctx = contactContext(window.location.search);
    if (!ctx.service && !ctx.message) return;
    setFormData((p) => ({
      ...p,
      ...(ctx.service ? { service: ctx.service } : {}),
      ...(ctx.message && !p.message ? { message: ctx.message } : {}),
    }));
  }, []);

  const set = (k: keyof ContactPayload) => (e: { target: { value: string } }) =>
    setFormData((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlight.current) return;
    setErrorMessage("");
    const found = validate(formData);
    setErrors(found);
    const first = ORDER.find((k) => found[k]);
    if (first) {
      // The field has a header-aware scroll margin, so it lands below the fixed header.
      document.getElementById(`contact-${first}`)?.focus();
      return;
    }
    inFlight.current = true;
    setLoading(true);

    try {
      const result = await submitContact({ ...formData, ...chosenLeadSource(source) });
      if ("message" in result) {
        setErrorMessage(result.message);
      } else {
        // STS-050: success only; form id and the fixed lead-source value, never a field the visitor typed.
        // The reference is shown to the visitor only; it is never sent to analytics.
        trackLead("contact", source);
        setReference(result.reference ?? null);
        setDone(true);
        setFormData(EMPTY_FORM);
        setSource("");
      }
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  };

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="min-h-screen">
      <div>
        {/* Design audit B4: the shared hero, start-aligned, no entrance animation. */}
        <PageHero
          id="contact-heading"
          title="Let's talk about your business"
          intro={<>Tell us what you're working on and what you need help with. {REPLY_COPY}</>}
        />

        {/* Contact Form & Info */}
        <section className="section bg-background">
          <div className={container}>
            <div className="grid gap-10 lg:grid-cols-3 lg:gap-12">
              {/* Contact Information: every block below renders only from confirmed config. */}
              <div className="space-y-8">
                <div>
                  <h2 className="text-h3 text-foreground mb-4">Get in Touch</h2>
                  <p className="text-secondary leading-relaxed max-w-measure">
                    {booking
                      ? "Send us a message using the form, or book a free consultation at a time that suits you."
                      : "Send us a message using the form and tell us a little about your business."}
                  </p>
                </div>

                {/* C15: shown only once the owner confirms the booking link; otherwise the form is the primary action. */}
                {booking && (
                  <Card padding="compact">
                    <div className="flex items-start gap-4">
                      <IconTile icon={CalendarDays} />
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground mb-1">Prefer to talk?</h3>
                        <p className={`${infoText} mb-4`}>Pick a time for a free consultation.</p>
                      </div>
                    </div>
                    <Button asChild variant="primary" size="lg" className="w-full">
                      <a href={booking} target="_blank" rel="noopener noreferrer">
                        {consultationCtaLabel(config)}
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    </Button>
                  </Card>
                )}

                <div className="space-y-6">
                  {/* C4: the street address when confirmed, otherwise the service-area fallback. */}
                  <div className="flex items-start gap-4">
                    <IconTile icon={MapPin} />
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground mb-1">
                        {address ? "Office" : "Service area"}
                      </div>
                      {address ? (
                        <address className={`${infoText} not-italic`}>
                          {address.lines.map((line, i) => (
                            <span key={line}>
                              {i > 0 && <br />}
                              {line}
                            </span>
                          ))}
                        </address>
                      ) : (
                        <div className={infoText}>{config.serviceAreaText}</div>
                      )}
                    </div>
                  </div>

                  {phone && (
                    <div className="flex items-start gap-4">
                      <IconTile icon={Phone} />
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground">Phone</div>
                        <div className={infoText}>
                          <a
                            href={phone}
                            className="inline-flex min-h-[44px] items-center underline-offset-4 hover:underline"
                          >
                            {config.phone?.display}
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {email && (
                    <div className="flex items-start gap-4">
                      <IconTile icon={Mail} />
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground">Email</div>
                        <div className={infoText}>
                          <a
                            href={email}
                            className="inline-flex min-h-[44px] items-center break-all underline-offset-4 hover:underline"
                          >
                            {config.email}
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  {hours && (
                    <div className="flex items-start gap-4">
                      <IconTile icon={Clock} />
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground mb-1">Business Hours</div>
                        <div className={infoText}>
                          {hours.map((line, i) => (
                            <span key={line}>
                              {i > 0 && <br />}
                              {line}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Form. FF-1: the status region is always mounted, so the success panel that
                  replaces the form is announced; the panel takes focus itself. */}
              <section
                className="lg:col-span-2"
                aria-labelledby={done ? "contact-success-heading" : "contact-form-heading"}
              >
                <div role="status">
                  {done && (
                    <FormSuccess
                      headingId="contact-success-heading"
                      heading={CONTACT_FORM.success.heading}
                      body={`${CONTACT_FORM.success.body} ${REPLY_COPY}`}
                      reference={reference}
                      textAttrs={{ "data-contact-success": "" }}
                    />
                  )}
                </div>

                {!done && (
                  <Card>
                    <h2 id="contact-form-heading" className="text-h3 text-foreground mb-2">Send us a Message</h2>
                    {/* STS-041: the asterisk is explained in text; it is hidden from screen readers, which get
                        "required" from the field itself. */}
                    <p id="contact-required-note" className="text-small text-secondary mb-6">Fields marked with * are required.</p>

                    <form
                      onSubmit={handleSubmit}
                      noValidate
                      className="space-y-6"
                      aria-busy={loading}
                      aria-labelledby="contact-form-heading"
                      aria-describedby="contact-required-note"
                    >
                      {/* Honeypot: hidden from people and assistive tech; bots fill it. */}
                      <div
                        aria-hidden="true"
                        style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}
                      >
                        <label htmlFor="contact-nickname">Nickname</label>
                        <input
                          id="contact-nickname"
                          name="nickname"
                          type="text"
                          tabIndex={-1}
                          autoComplete="off"
                          value={formData.nickname}
                          onChange={set("nickname")}
                        />
                      </div>

                      <div className="grid gap-6 md:grid-cols-2">
                        <FormField id="contact-name" label="Full Name" required error={errors.name}>
                          {(a11y) => (
                            <Input
                              {...a11y}
                              name="name"
                              autoComplete="name"
                              maxLength={CONTACT_LIMITS.name}
                              required
                              value={formData.name}
                              onChange={set("name")}
                            />
                          )}
                        </FormField>
                        <FormField id="contact-email" label="Email" required error={errors.email}>
                          {(a11y) => (
                            <Input
                              {...a11y}
                              name="email"
                              autoComplete="email"
                              maxLength={CONTACT_LIMITS.email}
                              type="email"
                              required
                              value={formData.email}
                              onChange={set("email")}
                            />
                          )}
                        </FormField>
                      </div>

                      <div className="grid gap-6 md:grid-cols-2">
                        <FormField id="contact-phone" label="Phone Number">
                          {(a11y) => (
                            <Input
                              {...a11y}
                              name="phone"
                              autoComplete="tel"
                              maxLength={CONTACT_LIMITS.phone}
                              type="tel"
                              value={formData.phone}
                              onChange={set("phone")}
                            />
                          )}
                        </FormField>
                        <FormField id="contact-company" label="Company">
                          {(a11y) => (
                            <Input
                              {...a11y}
                              name="company"
                              autoComplete="organization"
                              maxLength={CONTACT_LIMITS.company}
                              value={formData.company}
                              onChange={set("company")}
                            />
                          )}
                        </FormField>
                      </div>

                      <div className="grid gap-6 md:grid-cols-2">
                        {/* Design audit B6: a native select (was Radix), 48 px like the inputs. */}
                        <FormField id="contact-service" label="Service Interest" required>
                          {(a11y) => (
                            <NativeSelect {...a11y} name="service" required value={formData.service} onChange={set("service")}>
                              {SERVICE_INTERESTS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </NativeSelect>
                          )}
                        </FormField>

                        <LeadSourceSelect id="contact-source" value={source} onChange={(e) => setSource(e.target.value)} />
                      </div>

                      <FormField id="contact-message" label="Message" required error={errors.message}>
                        {(a11y) => (
                          <Textarea
                            {...a11y}
                            name="message"
                            maxLength={CONTACT_LIMITS.message}
                            rows={6}
                            required
                            value={formData.message}
                            onChange={set("message")}
                          />
                        )}
                      </FormField>

                      {/* FF-1: next to the submit button, announced, and focused when it appears. */}
                      <FormError id="contact-form-error" message={errorMessage} summary={hasErrors ? E.summary : undefined}>
                        {booking && (
                          <p>
                            You can also{" "}
                            <a
                              href={booking}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-primary underline underline-offset-2"
                            >
                              book a call
                              <span className="sr-only"> (opens in a new tab)</span>
                            </a>
                            .
                          </p>
                        )}
                      </FormError>

                      <div className="space-y-4">
                        <Button type="submit" variant="primary" size="xl" className="w-full sm:w-auto" loading={loading}>
                          Send Message
                        </Button>

                        {/* REQ-173: replaces "Your information will never be shared.", which /privacy contradicts. */}
                        <FormPrivacyNote />
                      </div>
                    </form>
                  </Card>
                )}
              </section>
            </div>
          </div>
        </section>

        {/* Map pinned to the street address: only with a confirmed address (C4) */}
        {mapSrc && (
          <section className="h-96 bg-muted">
            <iframe
              src={mapSrc}
              style={{
                width: "100%",
                height: "384px",
                border: "none",
              }}
              loading="lazy"
              allowFullScreen
              title={`Map of the ${config.name} office location`}
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </section>
        )}
      </div>

      {/* STS-046: this page is the conversion step, so the closing block is the trust slot only.
          The service area is already listed in the contact details above, so it is not repeated. */}
      <TrustSlot id="contact" standalone omit={["service-area"]} />
    </div>
  );
};

export default Contact;
