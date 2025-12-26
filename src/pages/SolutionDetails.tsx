import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Cloud,
  Zap,
  Shield,
  Globe,
  Database,
  Cpu,
  Lock,
  TrendingUp,
  BarChart3,
  Brain,
  Puzzle,
  Link2,
  Palette,
  Users,
  Star,
  Heart,
  Share2,
  Check,
  Bot,
  MessageSquare,
  Workflow,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SOLUTIONS_DATA } from "@/constants/solutions";

const SolutionDetails = () => {
  const { solutionId } = useParams();
  const solution = SOLUTIONS_DATA[solutionId as keyof typeof SOLUTIONS_DATA];
  const [activeTab, setActiveTab] = useState("overview");

  if (!solution) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-32 pb-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl font-bold mb-4">Solution Not Found</h1>
            <p className="text-secondary mb-8">
              The requested solution could not be found.
            </p>
            <Link to="/solutions">
              <Button>View All Solutions</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const getIcon = (iconName: string) => {
    const icons: {
      [key: string]: React.ComponentType<{ className?: string }>;
    } = {
      Cloud,
      Zap,
      Shield,
      Globe,
      Database,
      Cpu,
      Lock,
      TrendingUp,
      BarChart3,
      Brain,
      Puzzle,
      Link2,
      Palette,
      Users,
      Bot,
      MessageSquare,
      Workflow,
    };
    return icons[iconName] || Cloud;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="pt-20">
        {/* Breadcrumb */}
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center text-sm text-gray-600">
              <Link to="/" className="hover:text-primary">
                Home
              </Link>
              <span className="mx-2">›</span>
              <Link to="/solutions" className="hover:text-primary">
                Solutions
              </Link>
              <span className="mx-2">›</span>
              <span className="text-gray-900">{solution.title}</span>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Hero Card */}
              <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
                      {React.createElement(
                        getIcon(solution.features[0]?.icon || "Cloud"),
                        {
                          className: "w-8 h-8 text-white",
                        }
                      )}
                    </div>
                    <div className="flex-1">
                      <h1 className="text-3xl font-bold mb-2">
                        {solution.title}
                      </h1>
                      <p className="text-gray-600 mb-4">{solution.subtitle}</p>

                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Check className="w-5 h-5 text-green-500" />
                          <span className="text-gray-700">
                            Custom-built for your needs
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <Check className="w-5 h-5 text-green-500" />
                          <span className="text-gray-700">
                            End-to-end support
                          </span>
                        </div>

                        <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                          {solution.badge}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <Heart className="w-5 h-5 text-gray-600" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <Share2 className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Preview Image */}
                <div className="relative h-96 overflow-hidden">
                  <img
                    src={solution.image}
                    alt={solution.title}
                    className="w-full h-full object-cover"
                    loading="eager"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/40 to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6">
                    <div className="flex gap-3 flex-wrap">
                      {solution.featuresList.map((feature, idx) => (
                        <div
                          key={idx}
                          className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-white text-sm font-medium border border-white/20"
                        >
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="border-b">
                  <div className="flex">
                    <button
                      onClick={() => setActiveTab("overview")}
                      className={`px-6 py-3 border-b-2 font-medium transition-colors ${
                        activeTab === "overview"
                          ? "border-primary text-primary"
                          : "border-transparent text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Overview
                    </button>
                    <button
                      onClick={() => setActiveTab("features")}
                      className={`px-6 py-3 border-b-2 font-medium transition-colors ${
                        activeTab === "features"
                          ? "border-primary text-primary"
                          : "border-transparent text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Features
                    </button>
                    <button
                      onClick={() => setActiveTab("specifications")}
                      className={`px-6 py-3 border-b-2 font-medium transition-colors ${
                        activeTab === "specifications"
                          ? "border-primary text-primary"
                          : "border-transparent text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Specifications
                    </button>
                    <button
                      onClick={() => setActiveTab("reviews")}
                      className={`px-6 py-3 border-b-2 font-medium transition-colors ${
                        activeTab === "reviews"
                          ? "border-primary text-primary"
                          : "border-transparent text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Reviews
                    </button>
                    <button
                      onClick={() => setActiveTab("support")}
                      className={`px-6 py-3 border-b-2 font-medium transition-colors ${
                        activeTab === "support"
                          ? "border-primary text-primary"
                          : "border-transparent text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Support
                    </button>
                  </div>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                  {activeTab === "overview" && (
                    <div>
                      <h2 className="text-2xl font-bold mb-4">
                        Solution Overview
                      </h2>
                      <div className="space-y-4 text-gray-700 leading-relaxed">
                        {solution.overview.map((paragraph, index) => (
                          <p key={index}>{paragraph}</p>
                        ))}
                      </div>

                      <div className="grid md:grid-cols-2 gap-6 mt-8">
                        {solution.features.slice(0, 4).map((feature) => (
                          <div key={feature.title} className="flex gap-4">
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              {React.createElement(getIcon(feature.icon), {
                                className: "w-6 h-6 text-primary",
                              })}
                            </div>
                            <div>
                              <h3 className="font-semibold mb-1">
                                {feature.title}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {feature.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === "features" && (
                    <div>
                      <h2 className="text-2xl font-bold mb-6">All Features</h2>
                      <div className="grid md:grid-cols-2 gap-6">
                        {solution.features.map((feature) => (
                          <div
                            key={feature.title}
                            className="flex gap-4 p-4 rounded-lg border hover:border-primary/50 transition-colors"
                          >
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              {React.createElement(getIcon(feature.icon), {
                                className: "w-6 h-6 text-primary",
                              })}
                            </div>
                            <div>
                              <h3 className="font-semibold mb-1">
                                {feature.title}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {feature.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === "specifications" && (
                    <div>
                      <h2 className="text-2xl font-bold mb-6">
                        Technical Specifications
                      </h2>
                      <div className="space-y-6">
                        <div>
                          <h3 className="font-semibold text-lg mb-3">
                            System Requirements
                          </h3>
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-50 rounded-lg">
                              <p className="text-sm font-medium text-gray-900 mb-1">
                                Deployment
                              </p>
                              <p className="text-sm text-gray-600">
                                Cloud, On-premise, Hybrid
                              </p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                              <p className="text-sm font-medium text-gray-900 mb-1">
                                Integration
                              </p>
                              <p className="text-sm text-gray-600">
                                REST API, Webhooks, SDKs
                              </p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                              <p className="text-sm font-medium text-gray-900 mb-1">
                                Security
                              </p>
                              <p className="text-sm text-gray-600">
                                SOC 2, GDPR, ISO 27001
                              </p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                              <p className="text-sm font-medium text-gray-900 mb-1">
                                Scalability
                              </p>
                              <p className="text-sm text-gray-600">
                                Auto-scaling, Load balancing
                              </p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="font-semibold text-lg mb-3">
                            Performance Metrics
                          </h3>
                          <div className="space-y-3">
                            {solution.benefits.map((benefit) => (
                              <div
                                key={benefit.label}
                                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                              >
                                <span className="font-medium">
                                  {benefit.label}
                                </span>
                                <span className="text-2xl font-bold text-primary">
                                  {benefit.metric}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "reviews" && (
                    <div>
                      <h2 className="text-2xl font-bold mb-6">
                        Client Success Stories
                      </h2>
                      <div className="space-y-4 mb-8">
                        <p className="text-gray-600">
                          See how our clients have transformed their business
                          with custom solutions tailored to their specific
                          needs.
                        </p>
                      </div>

                      <div className="space-y-6">
                        {[
                          {
                            name: "Sarah Johnson",
                            company: "TechCorp Inc.",
                            role: "CTO",
                            comment:
                              "Working with SarayaTech was a game-changer. They took the time to understand our unique challenges and built a solution that perfectly fits our workflow. The team's expertise and dedication were exceptional.",
                          },
                          {
                            name: "Michael Chen",
                            company: "HealthPlus",
                            role: "Director of Operations",
                            comment:
                              "The custom dashboard they developed has transformed how we monitor patient data. The solution exceeded our expectations, and their ongoing support has been outstanding.",
                          },
                          {
                            name: "Emily Rodriguez",
                            company: "FinanceFlow",
                            role: "Product Manager",
                            comment:
                              "SarayaTech delivered a robust data platform that scales with our needs. Their agile approach and constant communication made the entire process smooth and efficient.",
                          },
                        ].map((testimonial, i) => (
                          <div
                            key={i}
                            className="p-6 border rounded-lg bg-white"
                          >
                            <div className="flex items-start gap-4 mb-4">
                              <img
                                src={`https://i.pravatar.cc/48?img=${i + 10}`}
                                alt={testimonial.name}
                                className="w-12 h-12 rounded-full"
                              />
                              <div className="flex-1">
                                <h4 className="font-semibold">
                                  {testimonial.name}
                                </h4>
                                <p className="text-sm text-gray-600">
                                  {testimonial.role}
                                </p>
                                <p className="text-sm text-primary font-medium">
                                  {testimonial.company}
                                </p>
                              </div>
                            </div>
                            <p className="text-gray-700 italic">
                              "{testimonial.comment}"
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === "support" && (
                    <div>
                      <h2 className="text-2xl font-bold mb-6">
                        Support & Resources
                      </h2>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="p-6 border rounded-lg hover:border-primary/50 transition-colors">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                            <Shield className="w-6 h-6 text-primary" />
                          </div>
                          <h3 className="font-semibold text-lg mb-2">
                            24/7 Support
                          </h3>
                          <p className="text-gray-600 mb-4">
                            Our dedicated support team is available round the
                            clock to help you with any questions or issues.
                          </p>
                          <Button variant="outline" size="sm">
                            Contact Support
                          </Button>
                        </div>

                        <div className="p-6 border rounded-lg hover:border-primary/50 transition-colors">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                            <Database className="w-6 h-6 text-primary" />
                          </div>
                          <h3 className="font-semibold text-lg mb-2">
                            Documentation
                          </h3>
                          <p className="text-gray-600 mb-4">
                            Comprehensive guides, API references, and tutorials
                            to help you get the most out of our platform.
                          </p>
                          <Button variant="outline" size="sm">
                            View Docs
                          </Button>
                        </div>

                        <div className="p-6 border rounded-lg hover:border-primary/50 transition-colors">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                            <Users className="w-6 h-6 text-primary" />
                          </div>
                          <h3 className="font-semibold text-lg mb-2">
                            Community Forum
                          </h3>
                          <p className="text-gray-600 mb-4">
                            Connect with other users, share best practices, and
                            get answers from the community.
                          </p>
                          <Button variant="outline" size="sm">
                            Join Community
                          </Button>
                        </div>

                        <div className="p-6 border rounded-lg hover:border-primary/50 transition-colors">
                          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                            <Brain className="w-6 h-6 text-primary" />
                          </div>
                          <h3 className="font-semibold text-lg mb-2">
                            Training & Webinars
                          </h3>
                          <p className="text-gray-600 mb-4">
                            Regular training sessions and webinars to help your
                            team master the platform.
                          </p>
                          <Button variant="outline" size="sm">
                            View Schedule
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Key Features Section */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-2xl font-bold mb-6">Key Features</h2>
                <div className="space-y-6">
                  {solution.features.slice(0, 3).map((feature) => (
                    <div
                      key={feature.title}
                      className="flex gap-4 pb-6 border-b last:border-0 last:pb-0"
                    >
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        {React.createElement(getIcon(feature.icon), {
                          className: "w-6 h-6 text-primary",
                        })}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-2">
                          {feature.title}
                        </h3>
                        <p className="text-gray-600">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Get Started Card */}
              <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-24">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold mb-2">Get Started</h3>
                  <p className="text-sm text-gray-600">
                    Let's discuss your project and build a custom solution
                  </p>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span>Free initial consultation</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span>Custom proposal & quote</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span>Flexible engagement models</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span>Ongoing support & maintenance</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Link to="/contact">
                    <Button className="w-full bg-primary hover:bg-primary/90">
                      Schedule a Consultation
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Why Choose Us Card */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="font-bold mb-4">Why Choose Us</h3>

                <div className="space-y-4 mb-4">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">
                        Expert Team
                      </h4>
                      <p className="text-xs text-gray-600">
                        20+ years of industry experience
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Check className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">
                        Proven Track Record
                      </h4>
                      <p className="text-xs text-gray-600">
                        250+ successful projects delivered
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Shield className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">
                        Quality Assurance
                      </h4>
                      <p className="text-xs text-gray-600">
                        97% client satisfaction rate
                      </p>
                    </div>
                  </div>
                </div>

                <Link to="/about">
                  <Button variant="outline" className="w-full">
                    Learn More About Us
                  </Button>
                </Link>
              </div>

              {/* Related Services */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="font-bold mb-4">Related Services</h3>
                <div className="space-y-4">
                  <Link to="/solutions/cloud-infrastructure" className="block">
                    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      <div className="w-10 h-10 bg-blue-500 rounded-lg flex-shrink-0 flex items-center justify-center">
                        <Cloud className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">
                          Cloud & Infrastructure
                        </h4>
                        <p className="text-xs text-gray-600 truncate">
                          DevOps and cloud migration
                        </p>
                      </div>
                    </div>
                  </Link>

                  <Link
                    to="/solutions/digital-strategy-consulting"
                    className="block"
                  >
                    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      <div className="w-10 h-10 bg-purple-500 rounded-lg flex-shrink-0 flex items-center justify-center">
                        <Brain className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">
                          Strategy & Consulting
                        </h4>
                        <p className="text-xs text-gray-600 truncate">
                          Digital transformation roadmap
                        </p>
                      </div>
                    </div>
                  </Link>

                  <Link to="/solutions/security-compliance" className="block">
                    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      <div className="w-10 h-10 bg-green-500 rounded-lg flex-shrink-0 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">
                          Security & Compliance
                        </h4>
                        <p className="text-xs text-gray-600 truncate">
                          Security audit and GDPR
                        </p>
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SolutionDetails;
