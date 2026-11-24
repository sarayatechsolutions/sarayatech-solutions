import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  MapPin,
  Clock,
  DollarSign,
  Users,
  Briefcase,
  ArrowRight,
} from "lucide-react";
import { motion } from "@/components/motion";
import { useState } from "react";
import careersData from "../../data/careers.json";
import {
  containerVariants,
  fadeInUpVariants,
  staggerItemVariants,
} from "@/constants/animations";

const Careers = () => {
  const [openPositions, setOpenPositions] = useState(careersData);
  const [loading, setLoading] = useState(false);

  return (
    <>
      {/* Hero Section */}
      <motion.section
        className="relative pt-32 pb-20 bg-primary text-primary-foreground overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-light to-primary opacity-90" />

        <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="max-w-4xl mx-auto text-center space-y-6"
            variants={fadeInUpVariants}
            initial="hidden"
            animate="visible"
          >
            <h1 className="text-5xl md:text-6xl font-extrabold leading-tight">
              Join Our <span className="text-gold">Team</span>
            </h1>
            <p className="text-xl md:text-2xl text-primary-foreground/90 leading-relaxed">
              Shape the future of enterprise technology with us. We're looking
              for passionate individuals ready to make an impact.
            </p>
          </motion.div>
        </div>
      </motion.section>

      {/* Why Join Us Section */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center max-w-3xl mx-auto mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Why Join SarayaTech?
            </h2>
            <p className="text-xl text-secondary leading-relaxed">
              We're more than just a workplace – we're a community of
              innovators, problem-solvers, and dreamers.
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {[
              {
                icon: Users,
                title: "Collaborative Culture",
                description:
                  "Work with talented individuals who share your passion for technology.",
              },
              {
                icon: Briefcase,
                title: "Growth Opportunities",
                description:
                  "Continuous learning and career development programs.",
              },
              {
                icon: Clock,
                title: "Work-Life Balance",
                description:
                  "Flexible schedules and remote work options available.",
              },
              {
                icon: DollarSign,
                title: "Competitive Compensation",
                description:
                  "Attractive salary packages with comprehensive benefits.",
              },
            ].map((benefit) => {
              const Icon = benefit.icon;
              return (
                <motion.div
                  key={benefit.title}
                  variants={staggerItemVariants}
                  className="bg-card rounded-2xl p-8 shadow-card border border-border hover-lift group"
                  whileHover={{ y: -8 }}
                >
                  <motion.div
                    className="w-16 h-16 rounded-xl gradient-primary flex items-center justify-center mb-6"
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Icon className="w-8 h-8 text-primary-foreground" />
                  </motion.div>
                  <h3 className="text-xl font-bold mb-3">{benefit.title}</h3>
                  <p className="text-secondary leading-relaxed">
                    {benefit.description}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Open Positions Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="text-center max-w-3xl mx-auto mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Open Positions
            </h2>
            <p className="text-xl text-secondary leading-relaxed">
              Explore exciting opportunities to join our growing team
            </p>
          </motion.div>

          <motion.div
            className="grid gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {openPositions.map((position, index) => (
              <motion.div
                key={position.title}
                variants={staggerItemVariants}
                className="bg-card rounded-2xl p-8 shadow-card border border-border hover-lift group"
                whileHover={{ y: -8 }}
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                      <h3 className="text-2xl font-bold">{position.title}</h3>
                      <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-semibold">
                        {position.department}
                      </span>
                    </div>
                    <p className="text-secondary mb-4 leading-relaxed">
                      {position.description}
                    </p>
                    <div className="flex flex-wrap gap-4 text-sm text-secondary">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {position.location}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {position.type}
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        {position.salary}
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <Button className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      Apply Now
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <motion.section
        className="py-24 gradient-primary text-primary-foreground"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h2
            className="text-4xl md:text-5xl font-bold mb-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            Ready to Make an Impact?
          </motion.h2>
          <motion.p
            className="text-xl mb-8 max-w-2xl mx-auto text-primary-foreground/90"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
          >
            Don't see the perfect role? We're always interested in hearing from
            talented individuals.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <Link to="/contact">
              <Button
                size="lg"
                className="bg-accent hover:bg-accent-light text-accent-foreground shadow-accent"
              >
                Get In Touch
              </Button>
            </Link>
          </motion.div>
        </div>
      </motion.section>
    </>
  );
};

export default Careers;
