import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRef, useState } from "react";
import FormPrivacyNote from "@/components/FormPrivacyNote";
import { MapPin, Phone, Mail, Clock, CheckCircle2, CalendarDays } from "lucide-react";
import {
  CONTACT_LIMITS,
  submitContact,
  type ContactPayload,
} from "@/lib/contact-submit";
import {
  BUSINESS,
  bookingHref,
  emailHref,
  hasAddress,
  hasHours,
  hasVerifiedBooking,
  phoneHref,
} from "@/config/business";

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
  service: "General Inquiry", // Set default value to avoid uncontrolled warning
  message: "",
  nickname: "",
};

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
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  // A ref, not state: it blocks a second submit even before React re-renders.
  const inFlight = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setErrorMessage("");

    try {
      const result = await submitContact(formData);
      if ("message" in result) {
        setErrorMessage(result.message);
      } else {
        setModalOpen(true);
        setFormData(EMPTY_FORM);
      }
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div>
        {/* Hero Section */}
        <section className="pt-32 pb-20 gradient-primary text-primary-foreground">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center space-y-6 animate-fade-in-up">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight">
                Let's talk about your business
              </h1>
              <p className="text-xl md:text-2xl text-primary-foreground/90 leading-relaxed">
                Tell us what you're working on and what you need help with.{" "}
                {REPLY_COPY}
              </p>
            </div>
          </div>
        </section>

        {/* Contact Form & Info */}
        <section className="py-24 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-3 gap-12">
              {/* Contact Information: every block below renders only from confirmed config. */}
              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-bold mb-6">Get in Touch</h2>
                  <p className="text-secondary leading-relaxed">
                    {booking
                      ? "Send us a message using the form, or book a free consultation at a time that suits you."
                      : "Send us a message using the form and tell us a little about your business."}
                  </p>
                </div>

                {/* C15: shown only once the owner confirms the booking link; otherwise the form is the primary action. */}
                {booking && (
                  <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                        <CalendarDays className="w-6 h-6 text-primary-foreground" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold mb-1">Prefer to talk?</h3>
                        <p className="text-secondary text-sm mb-4">
                          Pick a time for a free consultation.
                        </p>
                      </div>
                    </div>
                    <Button
                      asChild
                      size="lg"
                      className="w-full bg-accent hover:bg-accent-light"
                    >
                      <a href={booking} target="_blank" rel="noopener noreferrer">
                        Book a Free Consultation
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    </Button>
                  </div>
                )}

                <div className="space-y-6">
                  {/* C4: the street address when confirmed, otherwise the service-area fallback. */}
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 text-primary-foreground" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold mb-1">
                        {address ? "Office" : "Service area"}
                      </div>
                      {address ? (
                        <address className="text-secondary text-sm not-italic">
                          {address.lines.map((line, i) => (
                            <span key={line}>
                              {i > 0 && <br />}
                              {line}
                            </span>
                          ))}
                        </address>
                      ) : (
                        <div className="text-secondary text-sm">
                          {config.serviceAreaText}
                        </div>
                      )}
                    </div>
                  </div>

                  {phone && (
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                        <Phone className="w-6 h-6 text-primary-foreground" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold mb-1">Phone</div>
                        <div className="text-secondary text-sm">
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
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                        <Mail className="w-6 h-6 text-primary-foreground" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold mb-1">Email</div>
                        <div className="text-secondary text-sm">
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
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                        <Clock className="w-6 h-6 text-primary-foreground" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold mb-1">Business Hours</div>
                        <div className="text-secondary text-sm">
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
              {/* Contact Form */}
              <div className="lg:col-span-2">
                <div className="bg-card rounded-2xl p-8 shadow-elegant border border-border">
                  <h2 className="text-2xl font-bold mb-6">Send us a Message</h2>

                  <form onSubmit={handleSubmit} className="space-y-6" aria-busy={loading}>
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
                        onChange={(e) =>
                          setFormData({ ...formData, nickname: e.target.value })
                        }
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="contact-name" className="block text-sm font-medium mb-2">
                          Full Name *
                        </label>
                        <Input
                          id="contact-name"
                          name="name"
                          autoComplete="name"
                          maxLength={CONTACT_LIMITS.name}
                          required
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label htmlFor="contact-email" className="block text-sm font-medium mb-2">
                          Email *
                        </label>
                        <Input
                          id="contact-email"
                          name="email"
                          autoComplete="email"
                          maxLength={CONTACT_LIMITS.email}
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="contact-phone" className="block text-sm font-medium mb-2">
                          Phone Number
                        </label>
                        <Input
                          id="contact-phone"
                          name="phone"
                          autoComplete="tel"
                          maxLength={CONTACT_LIMITS.phone}
                          type="tel"
                          placeholder="Your phone number"
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData({ ...formData, phone: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <label htmlFor="contact-company" className="block text-sm font-medium mb-2">
                          Company
                        </label>
                        <Input
                          id="contact-company"
                          name="company"
                          autoComplete="organization"
                          maxLength={CONTACT_LIMITS.company}
                          placeholder="Your company name"
                          value={formData.company}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              company: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="contact-service" className="block text-sm font-medium mb-2">
                        Service Interest *
                      </label>
                      <Select
                        required
                        value={formData.service}
                        onValueChange={(value) =>
                          setFormData({ ...formData, service: value })
                        }
                      >
                        <SelectTrigger id="contact-service">
                          <SelectValue placeholder="Select a service" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Web & Mobile Development">
                            Web & Mobile Development
                          </SelectItem>
                          <SelectItem value="Data & Business Intelligence">
                            Data & Business Intelligence
                          </SelectItem>
                          <SelectItem value="Custom Business Software">
                            Custom Business Software
                          </SelectItem>
                          <SelectItem value="Cloud & Infrastructure">
                            Cloud & Infrastructure
                          </SelectItem>
                          <SelectItem value="Digital Strategy & Consulting">
                            Digital Strategy & Consulting
                          </SelectItem>
                          <SelectItem value="Security & Compliance">
                            Security & Compliance
                          </SelectItem>
                          <SelectItem value="General Inquiry">
                            General Inquiry
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label htmlFor="contact-message" className="block text-sm font-medium mb-2">
                        Message *
                      </label>
                      <Textarea
                        id="contact-message"
                        name="message"
                        maxLength={CONTACT_LIMITS.message}
                        placeholder="Tell us about your project and how we can help..."
                        rows={6}
                        required
                        value={formData.message}
                        onChange={(e) =>
                          setFormData({ ...formData, message: e.target.value })
                        }
                      />
                    </div>

                    {/* Always mounted so screen readers announce the error when it appears. */}
                    <div aria-live="assertive" aria-atomic="true">
                      {errorMessage && (
                        <div
                          role="alert"
                          className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800"
                        >
                          <p>{errorMessage}</p>
                          {booking && (
                            <p className="mt-1">
                              You can also{" "}
                              <a
                                href={booking}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold underline"
                              >
                                book a call
                                <span className="sr-only"> (opens in a new tab)</span>
                              </a>
                              .
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full bg-accent hover:bg-accent-light shadow-card"
                      disabled={loading}
                    >
                      {loading ? "Sending..." : "Send Message"}
                    </Button>

                    {/* REQ-173: replaces "Your information will never be shared.", which /privacy contradicts. */}
                    <FormPrivacyNote className="text-center" />
                  </form>
                </div>
              </div>
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

      {/* Success Modal (errors are shown inline, next to the form) */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600" aria-hidden="true" />
              </div>
            </div>
            <DialogTitle className="text-center text-2xl">
              Message Sent Successfully!
            </DialogTitle>
            <DialogDescription className="text-center text-base pt-2">
              Thank you for contacting us! We've received your message. {REPLY_COPY}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center mt-4">
            <Button
              onClick={() => setModalOpen(false)}
              className="w-full sm:w-auto bg-accent hover:bg-accent-light"
            >
              Great, Thanks!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Contact;
