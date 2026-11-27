/**
 * RETIRED (design audit B9 / FD-36). DO NOT IMPORT.
 * This component holds invented client testimonials: made-up names, companies and results.
 * It is not true of SarayaTech and must never be shown on the site. No page renders it; the
 * file is kept only because front-end code files are never deleted (owner rule).
 * Guarded by src/content/retiredComponents.test.tsx (import graph and server render) and by
 * RETIRED_FAKE_CONTENT_PHRASES in tests/smoke/smoke.mjs (built HTML).
 */
import { Quote } from "lucide-react";

const TestimonialsSection = () => {
  const testimonials = [
    {
      quote: "SarayaTech transformed our entire digital infrastructure. The platform's scalability allowed us to handle 10x growth without breaking a sweat. Their team's expertise in enterprise solutions is unmatched.",
      author: "Michael Chen",
      role: "CTO",
      company: "Global Finance Corp",
      metric: "+315% efficiency increase"
    },
    {
      quote: "The analytics platform gave us insights we never knew existed. We reduced operational costs by 40% in the first quarter alone. SarayaTech isn't just a vendor, they're a strategic partner.",
      author: "Sarah Martinez",
      role: "VP of Operations",
      company: "Manufacturing Leader Inc",
      metric: "40% cost reduction"
    },
    {
      quote: "Implementation was seamless, integration was flawless, and support has been exceptional. Our time-to-market decreased by 60%, giving us a significant competitive advantage.",
      author: "David Thompson",
      role: "Chief Innovation Officer",
      company: "Healthcare Solutions Ltd",
      metric: "60% faster deployment"
    }
  ];

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 animate-reveal">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Trusted by Industry Leaders
          </h2>
          <p className="text-xl text-secondary leading-relaxed">
            See how enterprises are achieving breakthrough results with SarayaTech
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.author}
              className="relative bg-card rounded-2xl p-8 shadow-card hover:shadow-elegant transition-all duration-300 border border-border group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Quote Icon */}
              <div className="absolute -top-4 left-8">
                <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center shadow-card">
                  <Quote className="w-6 h-6 text-primary-foreground" />
                </div>
              </div>

              {/* Metric Badge */}
              <div className="inline-flex items-center bg-accent/10 text-accent rounded-full px-4 py-2 text-sm font-semibold mb-6 mt-4">
                {testimonial.metric}
              </div>

              {/* Quote */}
              <blockquote className="text-foreground leading-relaxed mb-6 italic">
                "{testimonial.quote}"
              </blockquote>

              {/* Author Info */}
              <div className="border-t border-border pt-6">
                <div className="font-bold text-foreground">{testimonial.author}</div>
                <div className="text-sm text-secondary">{testimonial.role}</div>
                <div className="text-sm text-primary font-medium mt-1">{testimonial.company}</div>
              </div>

              {/* Hover Effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
