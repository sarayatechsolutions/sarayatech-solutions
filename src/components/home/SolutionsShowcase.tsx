import { Button } from "@/components/ui/button";
import { ArrowRight, Cloud, Database, Cpu, Globe, Server, Shield, Zap, Lightbulb, Bot, LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { SOLUTIONS_DATA } from "@/constants/solutions";
import { fadeInUpVariants, staggerItemVariants } from "@/constants/animations";

const iconMap = {
  Cloud,
  Database,
  Cpu,
  Globe,
  Server,
  Shield,
  Zap,
  Lightbulb,
  Bot,
};

const SolutionsShowcase = () => {
  const solutions = [
    SOLUTIONS_DATA["web-mobile-development"],
    SOLUTIONS_DATA["ai-automation-chatbots"],
    SOLUTIONS_DATA["data-bi-solutions"],
  ];

  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center max-w-3xl mx-auto mb-20"
          variants={fadeInUpVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Our Digital Services
          </h2>
          <p className="text-xl text-secondary leading-relaxed">
            Custom solutions designed to accelerate your digital
            transformation and drive your growth.
          </p>
        </motion.div>

        <div className="space-y-32">
          {solutions.map((solution, index) => {
            const Icon = iconMap[solution.icon as keyof typeof iconMap];
            return (
              <motion.div
                key={solution.title}
                className={`grid lg:grid-cols-2 gap-12 items-center ${
                  solution.reverse ? "lg:grid-flow-col-dense" : ""
                }`}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                {/* Content */}
                <motion.div
                  className={`space-y-6 ${
                    solution.reverse ? "lg:col-start-2" : ""
                  }`}
                  initial={{ opacity: 0, x: solution.reverse ? 40 : -40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 + 0.1 }}
                  viewport={{ once: true }}
                >
                  <motion.div className="inline-flex items-center space-x-3 bg-primary/5 rounded-full px-4 py-2">
                    <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
                      <Icon className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <span className="text-sm font-semibold text-primary">
                      Service #{index + 1}
                    </span>
                  </motion.div>

                  <h3 className="text-3xl md:text-4xl font-bold">
                    {solution.title}
                  </h3>

                  <p className="text-lg text-secondary leading-relaxed">
                    {solution.description}
                  </p>

                  <motion.ul className="space-y-3">
                    {solution.benefitsList.map((benefit, idx) => (
                      <motion.li
                        key={benefit}
                        className="flex items-start space-x-3"
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        viewport={{ once: true }}
                      >
                        <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <div className="w-2 h-2 rounded-full bg-accent" />
                        </div>
                        <span className="text-foreground font-medium">
                          {benefit}
                        </span>
                      </motion.li>
                    ))}
                  </motion.ul>

                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Link to={solution.link}>
                      <Button className="bg-primary hover:bg-primary-light shadow-card group mt-4">
                        Learn More
                        <ArrowRight className="ml-2 group-hover:translate-x-1 transition-smooth" />
                      </Button>
                    </Link>
                  </motion.div>
                </motion.div>

                {/* Image */}
                <motion.div
                  className={`relative ${
                    solution.reverse ? "lg:col-start-1 lg:row-start-1" : ""
                  }`}
                  initial={{ opacity: 0, x: solution.reverse ? -40 : 40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 + 0.2 }}
                  viewport={{ once: true }}
                >
                  <motion.div
                    className="relative rounded-2xl overflow-hidden shadow-elegant border border-border hover-lift"
                    whileHover={{ y: -8 }}
                  >
                    <img
                      src={solution.image}
                      alt={solution.title}
                      className="w-full h-auto object-cover aspect-video"
                      loading="lazy"
                    />
                  </motion.div>
                  {/* Decorative Element */}
                  <div className="absolute -z-10 inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl transform translate-x-4 translate-y-4" />
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default SolutionsShowcase;
