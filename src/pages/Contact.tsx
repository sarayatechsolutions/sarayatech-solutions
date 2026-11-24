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
import { MapPin, Phone, Mail, Clock, CheckCircle2 } from "lucide-react";
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


const EMPTY_FORM: ContactPayload = {
  name: "",
  email: "",
  phone: "",
  company: "",
  service: "General Inquiry", // Set default value to avoid uncontrolled warning
  message: "",
  nickname: "",
};

const Contact = () => {
  const phone = phoneHref();
  const email = emailHref();
  const mapSrc = hasAddress() ? BUSINESS.address?.mapEmbedUrl : undefined;
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
              <h1 className="text-5xl md:text-6xl font-extrabold leading-tight">
                Let's Start a Conversation
              </h1>
              <p className="text-xl md:text-2xl text-primary-foreground/90 leading-relaxed">
                Our team is ready to help you transform your business. Reach out
                today.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Form & Info */}
        <section className="py-24 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-3 gap-12">
              {/* Contact Information */}
              <div className="space-y-8">
                <div>
                  <h2 className="text-3xl font-bold mb-6">Get in Touch</h2>
                  <p className="text-secondary leading-relaxed">
                    Have questions? We're here to help. Our team typically
                    responds within 24 hours.
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <div className="font-semibold mb-1">
                        {hasAddress() ? "Headquarters" : "Service area"}
                      </div>
                      <div className="text-secondary text-sm">
                        {hasAddress()
                          ? BUSINESS.address?.lines.map((line, i) => (
                              <span key={line}>
                                {i > 0 && <br />}
                                {line}
                              </span>
                            ))
                          : BUSINESS.serviceAreaText}
                      </div>
                    </div>
                  </div>

                  {phone && (
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                        <Phone className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <div>
                        <div className="font-semibold mb-1">Phone</div>
                        <div className="text-secondary text-sm">
                          <a href={phone}>{BUSINESS.phone?.display}</a>
                        </div>
                      </div>
                    </div>
                  )}

                  {email && (
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                        <Mail className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <div>
                        <div className="font-semibold mb-1">Email</div>
                        <div className="text-secondary text-sm">
                          <a href={email}>{BUSINESS.email}</a>
                        </div>
                      </div>
                    </div>
                  )}

                  {hasHours() && (
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
                        <Clock className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <div>
                        <div className="font-semibold mb-1">Business Hours</div>
                        <div className="text-secondary text-sm">
                          {BUSINESS.hours?.map((line, i) => (
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
                  <h3 className="text-2xl font-bold mb-6">Send us a Message</h3>

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
                          placeholder="John Doe"
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
                          placeholder="john@company.com"
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
                          {hasVerifiedBooking() && (
                            <p className="mt-1">
                              You can also{" "}
                              <a
                                href={bookingHref()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold underline"
                              >
                                book a call
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

                    <p className="text-sm text-secondary text-center">
                      We respect your privacy. Your information will never be
                      shared.
                    </p>
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
              title="SarayaTech Solutions Office Location"
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
              Thank you for contacting us! We've received your message and will get back to you within 24-48 hours.
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
