import { useState } from "react";
import {
  Cloud,
  Database,
  Cpu,
  ArrowRight,
  Server,
  Shield,
  Zap,
  Globe,
  Lightbulb,
  Bot,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import solutionsData from "../../data/solutions.json";
import {
  containerVariants,
  fadeInUpVariants,
  staggerItemVariants,
} from "@/constants/animations";

const iconMap = {
  Cloud,
  Database,
  Cpu,
  Server,
  Shield,
  Zap,
  Globe,
  Lightbulb,
  Bot,
};

const Solutions = () => {
  const [activeFilter, setActiveFilter] = useState("All Services");
  const [solutions, setSolutions] = useState(solutionsData);
  const [loading, setLoading] = useState(false);

  const filters = [
    "All Services",
    "Development",
    "Data & Analytics",
    "AI & Automation",
    "Infrastructure",
    "Consulting",
  ];

  const filteredSolutions =
    activeFilter === "All Services"
      ? solutions
      : solutions.filter((s) => s.category === activeFilter);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="pt-32 pb-12 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="max-w-4xl mx-auto text-center space-y-6"
            variants={fadeInUpVariants}
            initial="hidden"
            animate="visible"
          >
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
              Our <span className="text-primary">Services</span>
            </h1>
            <p className="text-lg md:text-xl text-secondary">
              Discover our range of digital services and expertise. Each service
              reflects our commitment to excellence and innovation.
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div
            className="grid grid-cols-3 gap-8 max-w-3xl mx-auto mt-12"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {[
              {
                value: "250+",
                label: "Projects Delivered",
                color: "text-primary",
              },
              {
                value: "97%",
                label: "Client Satisfaction",
                color: "text-accent",
              },
              { value: "20+", label: "Years Experience", color: "text-gold" },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                variants={staggerItemVariants}
                className="text-center"
              >
                <div
                  className={`text-3xl md:text-4xl font-bold ${stat.color} mb-2`}
                >
                  {stat.value}
                </div>
                <div className="text-sm text-secondary">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Solutions Grid */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Filter Tabs */}
          <motion.div
            className="flex flex-wrap justify-center gap-3 mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            viewport={{ once: true }}
          >
            {filters.map((filter) => (
              <motion.button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                  activeFilter === filter
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground hover:bg-primary hover:text-primary-foreground"
                }`}
              >
                {filter}
              </motion.button>
            ))}
          </motion.div>

          <AnimatePresence>
            <motion.div
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
              key={activeFilter}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0 }}
            >
              {filteredSolutions.map((solution) => {
                const Icon = iconMap[solution.icon as keyof typeof iconMap];
                return (
                  <motion.div
                    key={solution.title}
                    variants={staggerItemVariants}
                    layout
                    className="bg-card rounded-xl shadow-card border border-border hover-lift group overflow-hidden"
                    whileHover={{ y: -8 }}
                  >
                    {/* Image */}
                    <motion.div className="relative h-48 overflow-hidden">
                      <img
                        src={solution.image}
                        alt={solution.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                      <motion.div
                        className="absolute top-3 right-3 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full font-semibold shadow-lg"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        {solution.category}
                      </motion.div>
                      <motion.div
                        className="absolute bottom-3 left-3"
                        whileHover={{ scale: 1.1 }}
                      >
                        <div className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                      </motion.div>
                    </motion.div>

                    {/* Content */}
                    <div className="p-6 space-y-4">
                      <h3 className="text-xl font-bold">{solution.title}</h3>
                      <p className="text-secondary text-sm leading-relaxed">
                        {solution.description}
                      </p>

                      {/* Tech tags */}
                      <motion.div className="flex flex-wrap gap-2">
                        {solution.featuresList &&
                        Array.isArray(solution.featuresList)
                          ? solution.featuresList.map((feature, idx) => (
                              <motion.span
                                key={feature}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.05 }}
                                className="text-xs bg-muted text-foreground px-3 py-1 rounded-full"
                              >
                                {feature}
                              </motion.span>
                            ))
                          : null}
                      </motion.div>

                      <motion.a
                        href={solution.link}
                        className="inline-flex items-center text-primary hover:text-primary-light font-semibold text-sm"
                        whileHover={{ x: 4 }}
                      >
                        View Details
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </motion.a>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* CTA Section */}
      <motion.section
        className="py-20 bg-gradient-to-r from-primary to-primary-light"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h2
            className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            Ready to Start Your Next Project?
          </motion.h2>
          <motion.p
            className="text-lg text-primary-foreground/90 mb-8 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
          >
            Let's collaborate to bring your vision to life. Contact us today to
            discuss your needs and get a personalized quote.
          </motion.p>
          <motion.div
            className="flex flex-wrap justify-center gap-4"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-3 bg-white text-primary rounded-lg font-semibold hover:bg-gray-100 transition-all"
            >
              Start a Project
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-3 bg-transparent border-2 border-white text-white rounded-lg font-semibold hover:bg-white hover:text-primary transition-all"
            >
              View Our Process
            </motion.button>
          </motion.div>
        </div>
      </motion.section>
    </div>
  );
};

export default Solutions;
