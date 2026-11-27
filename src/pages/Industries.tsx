import { ArrowRight, Check } from "lucide-react";
import { motion } from "@/components/motion";
import { industries } from "@/constants/industries";
import {
  containerVariants,
  fadeInUpVariants,
  staggerItemVariants,
} from "@/constants/animations";

// Only documented, owner-verified figures belong here (STS-018). The stats
// section is not rendered while this list is empty.
const INDUSTRY_STATS: { number: string; label: string }[] = [];

const Industries = () => {
  return (
    <div className="min-h-screen bg-background">
      <div>
        {/* Hero Section */}
        <motion.section
          className="relative py-32 bg-muted"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              {/* Heading */}
              <motion.div
                className="space-y-6"
                variants={fadeInUpVariants}
                initial="hidden"
                animate="visible"
              >
                <h1 className="text-5xl md:text-7xl font-black text-foreground leading-tight">
                  Industry-Leading Solutions for{" "}
                  <span className="text-primary">Every</span>
                  <br />
                  <span className="text-primary">Sector</span>
                </h1>
                <p className="text-lg text-secondary max-w-2xl mx-auto leading-relaxed">
                  Transform your business with our specialized platforms
                  designed for Financial Services, Manufacturing, Healthcare,
                  Retail, and Education industries.
                </p>
              </motion.div>

              {/* CTA Buttons */}
              <motion.div
                className="flex flex-col sm:flex-row gap-4 justify-center pt-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                <motion.button
                  variants={staggerItemVariants}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-3 bg-primary hover:bg-primary-dark text-primary-foreground font-bold rounded-lg hover:shadow-lg transition-all duration-300"
                >
                  Explore Industries
                </motion.button>
                <motion.button
                  variants={staggerItemVariants}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-3 border-2 border-border text-foreground font-bold rounded-lg hover:border-primary hover:text-primary transition-all duration-300 bg-background"
                >
                  View Demo
                </motion.button>
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* Industries Grid Section */}
        <section className="relative py-24 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            {/* Section Title */}
            <div className="max-w-3xl mx-auto text-center mb-16">
              <h2 className="text-4xl font-black text-foreground mb-4">
                Industries We Serve
              </h2>
              <p className="text-secondary">
                Specialized solutions tailored to meet the unique challenges and
                requirements of your industry.
              </p>
            </div>

            {/* Grid */}
            <motion.div
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {industries.map((industry, index) => {
                const Icon = industry.icon;
                // Show last industry as custom solutions on wider screens
                const isLastAndWide = index === industries.length - 1;

                return isLastAndWide ? (
                  <motion.a
                    key={industry.id}
                    href={`/industry/${industry.id}`}
                    className="lg:col-span-1 lg:row-span-2"
                    variants={staggerItemVariants}
                    whileHover={{ y: -8 }}
                  >
                    <div className="h-full bg-foreground rounded-2xl p-8 text-primary-foreground flex flex-col justify-between group transition-[transform,box-shadow] duration-base ease-standard hover:shadow-md motion-safe:hover:-translate-y-0.5">
                      <div>
                        <Icon className="w-10 h-10 mb-6 text-gold opacity-80" />
                        <h3 className="text-2xl font-bold mb-2">
                          {industry.name}
                        </h3>
                        <p className="text-primary-foreground/80 mb-6">
                          {industry.description}
                        </p>
                      </div>

                      <div className="space-y-3">
                        {[
                          "Custom Development",
                          "Industry Expertise",
                          "Scalable Architecture",
                        ].map((feature, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-gold" />
                            <span className="text-sm text-primary-foreground/80">
                              {feature}
                            </span>
                          </div>
                        ))}
                      </div>

                      <button className="mt-6 text-gold font-semibold flex items-center gap-2 hover:gap-3 transition-all">
                        Contact Us <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.a>
                ) : (
                  <motion.a
                    key={industry.id}
                    href={`/industry/${industry.id}`}
                    className="group"
                    variants={staggerItemVariants}
                    whileHover={{ y: -8 }}
                  >
                    <div className="bg-card rounded-2xl p-6 border border-border hover:border-primary/30 h-full flex flex-col transition-[transform,box-shadow] duration-base ease-standard hover:shadow-md motion-safe:hover:-translate-y-0.5">
                      {/* Header with Icon */}
                      <div className="flex items-start justify-between mb-6">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                      </div>

                      {/* Title and Tagline */}
                      <h3 className="text-xl font-bold text-foreground mb-1">
                        {industry.name}
                      </h3>
                      <p className="text-sm font-semibold text-accent mb-4">
                        {industry.tagline}
                      </p>

                      {/* Description */}
                      <p className="text-secondary text-sm mb-6 flex-1">
                        {industry.description}
                      </p>

                      {/* Features */}
                      <div className="space-y-2 mb-6 border-t border-border pt-4">
                        {industry.features &&
                          industry.features.slice(0, 3).map((feature, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                              <span className="text-sm text-secondary">
                                {feature.title}
                              </span>
                            </div>
                          ))}
                      </div>

                      {/* Learn More Link */}
                      <button className="text-primary font-semibold text-sm flex items-center gap-2 group-hover:gap-3 transition-all">
                        Learn More <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.a>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* Stats Section */}
        {INDUSTRY_STATS.length > 0 && (
        <motion.section
          className="relative py-20 bg-foreground text-primary-foreground"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              className="text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <h2 className="text-4xl font-black mb-4">
                Trusted by Industry Leaders
              </h2>
              <p className="text-primary-foreground/80">
                Our solutions power businesses across all sectors
              </p>
            </motion.div>

            <motion.div
              className="grid md:grid-cols-4 gap-8"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {INDUSTRY_STATS.map((stat, idx) => (
                <motion.div
                  key={idx}
                  variants={staggerItemVariants}
                  className="text-center"
                >
                  <div className="text-5xl font-black mb-2">{stat.number}</div>
                  <p className="text-primary-foreground/80">{stat.label}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.section>
        )}

        {/* CTA Section */}
        <motion.section
          className="relative py-32 bg-gradient-to-r from-primary via-primary/90 to-accent overflow-hidden"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          {/* Decorative Element */}
          <motion.div
            className="absolute top-4 right-4 w-12 h-12 bg-gold/30 rounded-full blur-lg"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          />

          <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center space-y-8">
              <motion.div
                className="space-y-4"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                <h2 className="text-5xl md:text-6xl font-black text-primary-foreground leading-tight">
                  Ready to Transform Your Industry?
                </h2>
                <p className="text-lg text-primary-foreground/90">
                  Websites, apps and custom software for growing businesses.
                </p>
              </motion.div>

              <motion.div
                className="flex flex-col sm:flex-row gap-4 justify-center pt-4"
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                <motion.button
                  variants={staggerItemVariants}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-3 bg-primary-foreground hover:bg-primary-foreground/90 text-primary font-bold rounded-lg hover:shadow-xl transition-all duration-300"
                >
                  Start Free Trial
                </motion.button>
                <motion.button
                  variants={staggerItemVariants}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-3 border-2 border-primary-foreground text-primary-foreground font-bold rounded-lg hover:bg-primary-foreground/10 transition-all duration-300"
                >
                  Schedule Demo
                </motion.button>
              </motion.div>
            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default Industries;
