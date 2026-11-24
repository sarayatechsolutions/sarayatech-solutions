import { ExternalLink } from "lucide-react";
import { useState, type ComponentType } from "react";
import realisationsData from "../../data/realisations.json";
import { motion } from "framer-motion";
import {
  containerVariants,
  fadeInUpVariants,
  staggerItemVariants,
  hoverLiftVariants,
} from "@/constants/animations";

// Only documented, owner-verified figures belong here (STS-018). The stats
// overview is not rendered while this list is empty.
const STATS: {
  icon: ComponentType<{ className?: string }>;
  value: string;
  label: string;
}[] = [];

const Realisation = () => {
  const [realisations, setRealisations] = useState(
    realisationsData.filter((r) => r.isActive)
  );
  const [loading, setLoading] = useState(false);
  return (
    <div className="min-h-screen bg-background">
      <main>
        {/* Hero */}
        <motion.section
          className="pt-32 pb-20 gradient-primary text-primary-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              className="max-w-4xl mx-auto text-center space-y-6"
              variants={fadeInUpVariants}
              initial="hidden"
              animate="visible"
            >
              <h1 className="text-5xl md:text-6xl font-extrabold leading-tight">
                Recent Realisations
              </h1>
              <p className="text-xl md:text-2xl text-primary-foreground/90">
                Websites, apps and custom software we have built and launched
              </p>
            </motion.div>
          </div>
        </motion.section>

        {/* Stats Overview */}
        {STATS.length > 0 && (
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              className="grid md:grid-cols-4 gap-8"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {STATS.map((stat) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={stat.label}
                    variants={staggerItemVariants}
                    whileHover="hover"
                    className="text-center bg-card rounded-xl p-6 shadow-card border border-border hover-lift cursor-pointer"
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
          </div>
        </section>
        )}

        {/* Realisations */}
        <section className="py-24 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              className="space-y-16"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {realisations.map((realisation) => (
                <motion.div
                  key={realisation.company}
                  variants={staggerItemVariants}
                  className="bg-card rounded-2xl overflow-hidden shadow-elegant border border-border hover-lift"
                  whileHover={{ y: -8 }}
                >
                  <div className="p-6 md:p-8 lg:p-10">
                    {/* Header */}
                    <div className="mb-6 flex items-start justify-between gap-4">
                      <motion.div
                        className="inline-block bg-primary/10 text-primary rounded-full px-3 py-1 text-sm font-semibold"
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4 }}
                      >
                        {realisation.industry}
                      </motion.div>

                      {realisation.link ? (
                        <a
                          href={realisation.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-auto inline-flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                          Visit project
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      ) : null}
                    </div>

                    <div className="grid lg:grid-cols-3 gap-6 items-start">
                      {/* Image */}
                      <div className="col-span-1">
                        <img
                          src={
                            realisation.image ||
                            "/images/placeholder-project.svg"
                          }
                          alt={`${realisation.company} screenshot`}
                          className="w-full h-44 md:h-52 lg:h-full object-cover rounded-xl border border-border"
                        />
                      </div>

                      {/* Content */}
                      <div className="col-span-2 space-y-4">
                        <h2 className="text-2xl md:text-3xl font-bold">
                          {realisation.link ? (
                            <a
                              href={realisation.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline inline-flex items-center gap-2"
                            >
                              {realisation.company}
                              <ExternalLink className="w-4 h-4 text-muted-foreground" />
                            </a>
                          ) : (
                            realisation.company
                          )}
                        </h2>

                        <div className="grid md:grid-cols-2 gap-6">
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.45 }}
                          >
                            <h3 className="text-sm font-semibold text-primary mb-2">
                              Challenge
                            </h3>
                            <p className="text-secondary text-sm leading-relaxed">
                              {realisation.challenge}
                            </p>
                          </motion.div>

                          <motion.div
                            initial={{ opacity: 0, x: 10 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.45 }}
                          >
                            <h3 className="text-sm font-semibold text-primary mb-2">
                              Solution
                            </h3>
                            <p className="text-secondary text-sm leading-relaxed">
                              {realisation.solution}
                            </p>
                          </motion.div>
                        </div>

                        {/* Client quote: rendered only for a real, permissioned quote (STS-018) */}
                        {realisation.quote ? (
                        <div className="mt-2">
                          <blockquote className="text-foreground italic leading-relaxed mb-2">
                            "{realisation.quote}"
                          </blockquote>
                          <div className="text-sm font-semibold">
                            {realisation.author}
                          </div>
                          <div className="text-xs text-secondary">
                            {realisation.role}
                          </div>
                        </div>
                        ) : null}

                        {/* Results badges: rendered only for documented results (STS-018) */}
                        {realisation.results.length > 0 ? (
                        <div className="pt-2">
                          <h4 className="text-sm font-semibold mb-3">
                            Results
                          </h4>
                          <div className="flex flex-wrap gap-3">
                            {(
                              realisation.results as {
                                metric: string;
                                label: string;
                              }[]
                            ).map((result) => (
                              <div
                                key={result.label}
                                className="inline-flex items-center gap-2 bg-muted rounded-lg px-3 py-2 border border-border"
                                title={result.label}
                              >
                                <div className="text-lg font-bold text-primary">
                                  {result.metric}
                                </div>
                                <div className="text-xs text-secondary">
                                  {result.label}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        ) : null}

                        {/* CTA */}
                        {realisation.link ? (
                          <div className="mt-4">
                            <a
                              href={realisation.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md shadow-sm hover:opacity-95"
                            >
                              View project
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Realisation;
