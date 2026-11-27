import { Link } from "react-router-dom";
import FinalCta from "@/components/FinalCta";
import PageHero from "@/components/PageHero";
import SectionHeader from "@/components/SectionHeader";
import { PUBLISHED_POSTS } from "@/content/insights/posts";
import { formatPostDate, postPath } from "@/content/insights/blog";
import { FREE_AUDIT_ACTION } from "@/content/trust/trust";
import { bookingHref } from "@/config/business";
import {
  INSIGHTS_ARTICLES,
  INSIGHTS_CTA,
  INSIGHTS_HERO,
  INSIGHTS_TOPICS,
  INSIGHTS_TOPIC_SLUGS,
} from "@/content/insights/insights";

const container = "container mx-auto px-4 sm:px-6 lg:px-8";

/**
 * STS-040. No article is published yet, so this page shows no article card, category, date or
 * "Read Article" button (REQ-018, REQ-031). It is noindex until the first article (seo.ts).
 *
 * STS-055: once the owner approves a post, an article list appears and a topic with a published
 * guide leaves the plain topic list. With no approved post this renders exactly as before.
 */
const Insights = () => {
  const booking = bookingHref();
  const published = new Set(PUBLISHED_POSTS.map((p) => p.slug));
  const topics = INSIGHTS_TOPICS.items.filter((t) => !published.has(INSIGHTS_TOPIC_SLUGS[t]));
  return (
    <>
      <PageHero
        id="insights-heading"
        title={INSIGHTS_HERO.headline}
        intro={INSIGHTS_HERO.intro}
        sectionAttrs={{ "data-insights-section": "hero" }}
      />

      {PUBLISHED_POSTS.length > 0 && (
        <section data-insights-section="articles" aria-labelledby="insights-articles-heading" className="section bg-background">
          <div className={container}>
            <SectionHeader id="insights-articles-heading" title={INSIGHTS_ARTICLES.heading} />
            <ul className="max-w-3xl space-y-6">
              {PUBLISHED_POSTS.map((p) => (
                <li key={p.slug}>
                  <article className="bg-card rounded-2xl p-6 shadow-card border border-border space-y-3">
                    <h3 className="text-xl font-bold text-foreground">{p.title}</h3>
                    <p className="text-sm text-foreground/80">
                      <time dateTime={p.date}>{formatPostDate(p.date)}</time>
                    </p>
                    <p className="text-foreground/80 leading-relaxed">{p.description}</p>
                    <Link
                      to={postPath(p.slug)}
                      aria-label={`${INSIGHTS_ARTICLES.readLabel}: ${p.title}`}
                      className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-4 hover:text-primary-light"
                    >
                      {INSIGHTS_ARTICLES.readLabel}
                    </Link>
                  </article>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {topics.length > 0 && (
        <section data-insights-section="topics" aria-labelledby="insights-topics-heading" className="section bg-background">
          <div className={container}>
            <SectionHeader id="insights-topics-heading" title={INSIGHTS_TOPICS.heading} lead={INSIGHTS_TOPICS.intro} />
            <ul className="list-disc pl-6 space-y-3 text-body-lg text-foreground/80 max-w-measure">
              {topics.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* STS-046: the sitewide closing block (CTA + trust slot), with this page's copy. */}
      <FinalCta
        id="insights"
        heading={INSIGHTS_CTA.heading}
        copy={INSIGHTS_CTA.copy}
        primary={{ label: INSIGHTS_CTA.button, href: booking }}
        secondary={FREE_AUDIT_ACTION}
        sectionAttrs={{ "data-insights-section": "cta" }}
      />
    </>
  );
};

export default Insights;
