import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  ArrowRight,
  Users,
  TrendingUp,
  Zap,
  Lock,
} from "lucide-react";
import { industries } from "@/constants/industries";

const IndustryDetails = () => {
  const { industryId } = useParams<{ industryId: string }>();
  const industry = industries.find((ind) => ind.id === industryId);

  if (!industry) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Industry Not Found
          </h1>
          <p className="text-secondary mb-8">
            The industry you're looking for doesn't exist.
          </p>
          <Link
            to="/industries"
            className="text-primary hover:text-primary-light font-semibold"
          >
            ← Back to Industries
          </Link>
        </div>
      </div>
    );
  }

  const Icon = industry.icon;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative pt-24 pb-20 bg-gradient-to-b from-muted to-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            {/* Back Button */}
            <Link
              to="/industries"
              className="inline-flex items-center gap-2 text-secondary hover:text-primary transition-colors mb-8"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Industries
            </Link>

            <div className="text-center space-y-6">
              {/* Icon */}
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 mb-6">
                <Icon className="w-10 h-10 text-primary" />
              </div>

              {/* Title */}
              <h1 className="text-5xl md:text-6xl font-black text-foreground">
                {industry.name}
              </h1>

              {/* Tagline */}
              <p className="text-xl text-accent font-semibold">
                {industry.tagline}
              </p>

              {/* Description */}
              <p className="text-lg text-secondary max-w-2xl mx-auto leading-relaxed">
                {industry.detailedDescription}
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
                <button className="px-8 py-3 bg-primary hover:bg-primary-dark text-primary-foreground font-bold rounded-lg hover:shadow-lg transition-all duration-300">
                  Get Started
                </button>
                <button className="px-8 py-3 border-2 border-primary text-primary font-bold rounded-lg hover:bg-primary/5 transition-all duration-300">
                  View Case Studies
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            {/* Section Title */}
            <div className="text-center mb-16">
              <h2 className="text-4xl font-black text-foreground mb-4">
                Key Features
              </h2>
              <p className="text-secondary max-w-2xl mx-auto">
                Comprehensive solutions designed specifically for{" "}
                {industry.name.toLowerCase()} challenges
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-2 gap-8">
              {industry.features.map((feature, index) => {
                const FeatureIcon = feature.icon;
                return (
                  <div
                    key={index}
                    className="bg-card rounded-xl p-8 border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                        <FeatureIcon className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-foreground mb-2">
                          {feature.title}
                        </h3>
                        <p className="text-secondary">{feature.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* What We Do Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            {/* Section Title */}
            <div className="text-center mb-16">
              <h2 className="text-4xl font-black text-foreground mb-4">
                What We Do
              </h2>
              <p className="text-secondary max-w-2xl mx-auto">
                Our comprehensive approach to transforming{" "}
                {industry.name.toLowerCase()} operations
              </p>
            </div>

            {/* What We Do Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              {industry.whatWeDo.map((item, index) => (
                <div key={index} className="flex items-start gap-4">
                  <Check className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                  <p className="text-foreground font-medium">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            {/* Section Title */}
            <div className="text-center mb-16">
              <h2 className="text-4xl font-black text-foreground mb-4">
                Business Benefits
              </h2>
              <p className="text-secondary max-w-2xl mx-auto">
                Measurable results that drive real business value
              </p>
            </div>

            {/* Benefits Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {industry.benefits.map((benefit, index) => (
                <div
                  key={index}
                  className="bg-card rounded-xl p-6 border border-border hover:border-primary/30 transition-all duration-300"
                >
                  <div className="flex items-start gap-4">
                    <TrendingUp className="w-8 h-8 text-primary flex-shrink-0" />
                    <p className="text-foreground font-medium">{benefit}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Case Studies Section: rendered only when verified case studies exist (STS-018) */}
      {industry.caseStudies.length > 0 && (
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            {/* Section Title */}
            <div className="text-center mb-16">
              <h2 className="text-4xl font-black text-foreground mb-4">
                Realisation
              </h2>
              <p className="text-secondary max-w-2xl mx-auto">
                Real results from real implementations
              </p>
            </div>

            {/* Case Studies Grid */}
            <div className="grid md:grid-cols-2 gap-8">
              {industry.caseStudies.map((caseStudy, index) => (
                <div
                  key={index}
                  className="bg-card rounded-xl p-8 border border-border hover:border-primary/30 hover:shadow-lg transition-all duration-300"
                >
                  <h3 className="text-xl font-bold text-foreground mb-4">
                    {caseStudy.title}
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary"></div>
                    <p className="text-accent font-semibold">
                      {caseStudy.result}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Technologies Section */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            {/* Section Title */}
            <div className="text-center mb-16">
              <h2 className="text-4xl font-black text-foreground mb-4">
                Technologies We Use
              </h2>
              <p className="text-secondary max-w-2xl mx-auto">
                Cutting-edge technologies powering our{" "}
                {industry.name.toLowerCase()} solutions
              </p>
            </div>

            {/* Technologies Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {industry.technologies.map((tech, index) => (
                <div
                  key={index}
                  className="bg-card rounded-lg p-6 border border-border text-center hover:border-primary/30 transition-all duration-300"
                >
                  <p className="text-foreground font-semibold">{tech}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-gradient-to-r from-primary via-primary/90 to-accent">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h2 className="text-5xl md:text-6xl font-black text-primary-foreground leading-tight">
                Ready to Transform Your {industry.name}?
              </h2>
              <p className="text-lg text-primary-foreground/90 max-w-2xl mx-auto">
                Join industry leaders who trust our solutions to drive their
                digital transformation.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
              <button className="px-8 py-3 bg-primary-foreground hover:bg-primary-foreground/90 text-primary font-bold rounded-lg hover:shadow-xl transition-all duration-300">
                Start Your Project
              </button>
              <button className="px-8 py-3 border-2 border-primary-foreground text-primary-foreground font-bold rounded-lg hover:bg-primary-foreground/10 transition-all duration-300">
                Schedule Consultation
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default IndustryDetails;
