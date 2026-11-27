import { Link, useParams } from "react-router-dom";
import FinalCta from "@/components/FinalCta";
import PageHero from "@/components/PageHero";
import { Block } from "@/components/blog/PostBody";
import NotFound from "@/pages/NotFound";
import { PUBLISHED_POSTS } from "@/content/insights/posts";
import { INSIGHTS_BASE_PATH, formatPostDate } from "@/content/insights/blog";
import { INSIGHTS_ARTICLES as L } from "@/content/insights/insights";

const container = "container mx-auto px-4 sm:px-6 lg:px-8";

/**
 * One blog article at /insights/:slug (STS-055). Only a published post renders; any other slug
 * (an unapproved draft, a typo) shows the 404 page, and the route is not registered at all while
 * no post is approved (src/routes.tsx). One h1, a breadcrumb back to /insights, text only.
 */
const BlogPost = () => {
  const { slug } = useParams();
  const post = PUBLISHED_POSTS.find((p) => p.slug === slug);
  if (!post) return <NotFound />;
  const sections = [{ heading: undefined, blocks: post.intro }, ...post.sections];

  return (
    <>
      <PageHero
        id={`post-${post.slug}-heading`}
        title={post.title}
        sectionAttrs={{ "data-post-section": "hero" }}
        meta={
          <>
            <span>{post.author.name}</span> · <time dateTime={post.date}>{formatPostDate(post.date)}</time>
          </>
        }
        breadcrumb={
          <nav aria-label={L.breadcrumbAria}>
            <ol className="flex flex-wrap items-center gap-2 text-sm text-white/90">
              <li>
                <Link to="/" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline focus-visible:underline">
                  {L.homeLabel}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link to={INSIGHTS_BASE_PATH} className="inline-flex min-h-11 items-center underline-offset-4 hover:underline focus-visible:underline">
                  {L.breadcrumbLabel}
                </Link>
              </li>
            </ol>
          </nav>
        }
      />

      <article data-post-section="body" className="section bg-background">
        <div className={container}>
          <div className="max-w-measure space-y-12">
          {sections.map((s, i) => (
            <section key={s.heading ?? `intro-${i}`} className="space-y-4">
              {s.heading && <h2 className="text-h2 text-foreground">{s.heading}</h2>}
              {s.blocks.map((b, j) => (
                <Block key={j} block={b} />
              ))}
            </section>
          ))}
          </div>
        </div>
      </article>

      <FinalCta id={`post-${post.slug}`} sectionAttrs={{ "data-post-section": "final-cta" }} />
    </>
  );
};

export default BlogPost;
