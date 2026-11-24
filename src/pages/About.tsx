import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Award,
  Globe,
  Users,
  Target,
  Heart,
  Zap,
  Shield,
  TrendingUp,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState, type ComponentType } from "react";
import teamPhoto from "@/assets/team-photo.jpg";
import aboutValuesData from "../../data/about-values.json";
import leadershipTeamData from "../../data/leadership-team.json";
import aboutStatsData from "../../data/about-stats.json";
import {
  containerVariants,
  fadeInUpVariants,
  slideInLeftVariants,
  staggerItemVariants,
} from "@/constants/animations";

const iconMap = {
  Award,
  Globe,
  Users,
  Target,
  Heart,
  Zap,
  Shield,
  TrendingUp,
};

// Only documented, owner-verified figures belong here (STS-018). The stats
// grid is not rendered while this list is empty.
const MISSION_STATS: {
  icon: ComponentType<{ className?: string }>;
  value: string;
  label: string;
}[] = [];

const About = () => {
  const [aboutValues, setAboutValues] = useState(aboutValuesData);
  const [leadershipTeam, setLeadershipTeam] = useState(leadershipTeamData);
  const [aboutStats, setAboutStats] = useState(aboutStatsData);
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
        <div className="absolute inset-0 opacity-20">
          <img
            src={teamPhoto}
            alt="SarayaTech Team"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-light to-primary opacity-90" />

        <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="max-w-4xl mx-auto text-center space-y-6"
            variants={fadeInUpVariants}
            initial="hidden"
            animate="visible"
          >
            <h1 className="text-5xl md:text-6xl font-extrabold leading-tight">
              Building Digital Solutions that{" "}
              <span className="text-gold">Make a Difference</span>
            </h1>
            <p className="text-xl md:text-2xl text-primary-foreground/90 leading-relaxed">
              We support organizations in their digital transformation with
              expertise, passion and commitment.
            </p>
          </motion.div>
        </div>
      </motion.section>

      {/* Mission Section */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className={`grid ${
              MISSION_STATS.length > 0 ? "lg:grid-cols-2" : ""
            } gap-16 items-center`}
          >
            <motion.div
              className="space-y-6"
              variants={slideInLeftVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <h2 className="text-4xl md:text-5xl font-bold">Our Mission</h2>
              <div className="space-y-4 text-lg text-secondary leading-relaxed">
                <p>
                  At SarayaTech, we believe technology should simplify, not
                  complicate. Our mission is to design and develop custom
                  digital solutions that precisely meet our clients' needs.
                </p>
                <p>
                  We support organizations across all sectors with their digital
                  challenges, from strategy to implementation. Through our
                  technical expertise, agile approach and unwavering commitment,
                  we transform your ideas into concrete solutions.
                </p>
                <p>
                  We work with local and international clients, and several of
                  the projects we have built are live today.
                </p>
              </div>
            </motion.div>

            {MISSION_STATS.length > 0 && (
            <motion.div
              className="grid grid-cols-2 gap-6"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {MISSION_STATS.map((stat) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={stat.label}
                    variants={staggerItemVariants}
                    className="bg-card rounded-2xl p-6 shadow-card border border-border text-center hover-lift"
                    whileHover={{ y: -8 }}
                  >
                    <Icon className="w-10 h-10 text-primary mx-auto mb-3" />
                    <div className="text-3xl font-bold text-foreground mb-1">
                      {stat.value}
                    </div>
                    <div className="text-sm text-secondary">{stat.label}</div>
                  </motion.div>
                );
              })}
            </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Values Section */}
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
              Our Core Values
            </h2>
            <p className="text-xl text-secondary leading-relaxed">
              These principles guide every decision we make and every solution
              we develop
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {aboutValues.map((value) => {
              const Icon = iconMap[value.icon as keyof typeof iconMap];
              return (
                <motion.div
                  key={value.title}
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
                  <h3 className="text-xl font-bold mb-3">{value.title}</h3>
                  <p className="text-secondary leading-relaxed">
                    {value.description}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Leadership Section */}
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
              Leadership Team
            </h2>
            <p className="text-xl text-secondary leading-relaxed">
              Passionate experts driving innovation and excellence
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {leadershipTeam.map((leader) => (
              <motion.div
                key={leader.name}
                variants={staggerItemVariants}
                className="bg-card rounded-2xl overflow-hidden shadow-card border border-border hover-lift group"
                whileHover={{ y: -8 }}
              >
                <motion.div
                  className="h-64 bg-gradient-to-br from-primary/20 to-accent/20 flex items-end justify-center"
                  whileHover={{ backgroundPosition: ["0% 50%", "100% 50%"] }}
                >
                  <motion.img
                    src={leader.image}
                    alt={leader.name}
                    className="w-40 h-40 rounded-full object-cover mb-4 border-4 border-white shadow-lg"
                    whileHover={{ scale: 1.05 }}
                    onError={(e) => {
                      e.currentTarget.src = "/images/placeholder-project.svg";
                    }}
                  />
                </motion.div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-1">{leader.name}</h3>
                  <div className="text-sm text-primary font-semibold mb-3">
                    {leader.role}
                  </div>
                  <p className="text-sm text-secondary leading-relaxed">
                    {leader.bio}
                  </p>
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
            Join Our Journey
          </motion.h2>
          <motion.p
            className="text-xl mb-8 max-w-2xl mx-auto text-primary-foreground/90"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            viewport={{ once: true }}
          >
            We're always looking for talented individuals to join our team
          </motion.p>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <Link to="/careers">
              <Button
                size="lg"
                className="bg-accent hover:bg-accent-light text-accent-foreground shadow-accent"
              >
                View Open Positions
              </Button>
            </Link>
          </motion.div>
        </div>
      </motion.section>
    </>
  );
};

export default About;
