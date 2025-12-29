import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import heroBg from "@/assets/hero-bg.jpg";
import dashboardMockup from "@/assets/dashboard-mockup.jpg";
import {
  fadeInUpVariants,
  containerVariants,
  staggerItemVariants,
} from "@/constants/animations";

const STATS = [
  { value: "250+", label: "Projects Delivered" },
  { value: "20+", label: "Years Experience" },
  { value: "97%", label: "Client Satisfaction" },
];

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-primary via-primary-light to-primary opacity-95"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        />
        <img
          src={heroBg}
          alt="Technology background"
          className="w-full h-full object-cover mix-blend-overlay opacity-30"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.1),transparent)]" />
      </div>

      <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8 py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Content */}
          <motion.div
            className="text-white space-y-8"
            variants={fadeInUpVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.div
              className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <motion.span
                className="w-2 h-2 bg-gold rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <span className="text-sm font-medium">
                250+ projects successfully delivered
              </span>
            </motion.div>

            <motion.h1
              className="text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              Your Partner for{" "}
              <span className="bg-gradient-to-r from-gold to-accent bg-clip-text text-transparent">
                Digital Transformation
              </span>{" "}
              & AI Innovation
            </motion.h1>

            <motion.p
              className="text-xl md:text-2xl text-white/90 leading-relaxed max-w-2xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              We design and develop custom digital solutions to accelerate your
              growth. From technical expertise to strategic consulting.{" "}
              <span className="font-semibold text-gold">
                97% client satisfaction
              </span>{" "}
              across all industries.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-4 pt-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div variants={staggerItemVariants}>
                <a
                  href="https://calendly.com/saraya-info"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      size="lg"
                      className="bg-accent hover:bg-accent-light text-accent-foreground shadow-accent text-lg px-8 h-14 group"
                    >
                      Discuss My Project
                      <ArrowRight className="ml-2 group-hover:translate-x-1 transition-smooth" />
                    </Button>
                  </motion.div>
                </a>
              </motion.div>
              <motion.div variants={staggerItemVariants}>
                <Link to="/realisation">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      size="lg"
                      variant="outline"
                      className="bg-white/10 hover:bg-white/20 text-white border-white/30 text-lg px-8 h-14 backdrop-blur-sm group"
                    >
                      <Play
                        className="mr-2 group-hover:scale-110 transition-smooth"
                        size={20}
                      />
                      View Case Studies
                    </Button>
                  </motion.div>
                </Link>
              </motion.div>
            </motion.div>

            {/* Stats Row */}
            <motion.div
              className="grid grid-cols-3 gap-6 pt-8 border-t border-white/20"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {STATS.map((stat) => (
                <motion.div key={stat.label} variants={staggerItemVariants}>
                  <div className="text-3xl font-bold text-gold mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-white/80">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right Column - Dashboard Mockup */}
          <motion.div
            className="relative hidden lg:block"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            <div className="relative">
              {/* Floating Cards */}
              <motion.div
                className="absolute -top-8 -left-8 bg-white rounded-xl p-4 shadow-elegant z-10"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <div className="text-sm font-semibold text-foreground mb-1">
                  Revenue Growth
                </div>
                <div className="text-2xl font-bold text-accent">+68%</div>
              </motion.div>

              <motion.div
                className="absolute -bottom-8 -right-8 bg-white rounded-xl p-4 shadow-elegant z-10"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
              >
                <div className="text-sm font-semibold text-foreground mb-1">
                  Active Users
                </div>
                <div className="text-2xl font-bold text-primary">150K</div>
              </motion.div>

              {/* Main Dashboard */}
              <motion.div
                className="relative rounded-2xl overflow-hidden shadow-glow border-4 border-white/20 hover-lift"
                whileHover={{ y: -8 }}
              >
                <img
                  src={dashboardMockup}
                  alt="SarayaTech Dashboard Interface"
                  className="w-full h-auto"
                />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-background">
        <svg
          className="absolute bottom-0 w-full h-24 text-primary"
          viewBox="0 0 1440 100"
          preserveAspectRatio="none"
        >
          <path
            fill="currentColor"
            d="M0,50 C240,100 480,0 720,50 C960,100 1200,0 1440,50 L1440,0 L0,0 Z"
          />
        </svg>
      </div>
    </section>
  );
};

export default HeroSection;
