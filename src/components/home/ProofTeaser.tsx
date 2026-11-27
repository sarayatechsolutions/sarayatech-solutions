import { ArrowRight, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardMedia } from "@/components/ui/card";
import { responsiveImage } from "@/lib/responsiveImage";
import realisations from "../../../data/realisations.json";
import SectionHeader from "@/components/SectionHeader";
import { HERO_FRAMES, PROOF, PROOF_PATH } from "./content";

interface Realisation {
  company: string;
  industry: string;
  solution: string;
  image: string;
  isActive: boolean;
  link: string | null;
}

/** First sentence of the project description: what was built, nothing else (C10 fallback). */
const firstSentence = (text: string) => text.split(/(?<=\.)\s+/)[0];

/** The allow-listed projects that are live and have a public link, in the listed order. */
const proofProjects = (data: Realisation[] = realisations as Realisation[]) =>
  PROOF.projects
    .map((name) => data.find((r) => r.company === name))
    .filter((r): r is Realisation & { link: string } => !!r && r.isActive && !!r.link);

/**
 * Screenshots cleared for the home page: the hero frames' (ASTA, BMV INSPECTION), with their alt
 * text. The crop is 16:9 from the top for ASTA, so the portrait lower in that page never shows,
 * and from the centre for the BMV phone screens.
 */
const SHOTS = new Map<string, string>(HERO_FRAMES.frames.map((f) => [f.company, f.alt]));
const POSITION: Record<string, string> = { ASTA: "object-top", "BMV INSPECTION": "object-center" };

const host = (link: string) => new URL(link).hostname.replace(/^www\./, "");

/**
 * Proof teaser (STS-031, REQ-021). Project name, live link and what was built; no metrics.
 * Media cards (design audit B5, FD-20): one column, 2 at md, 3 at lg; the link sits at the
 * bottom. MIMAP shows a lettered tile, not its screenshot: that screenshot contains a stock photo
 * of a person, which must not read as our team or client (REQ-015).
 */
const ProofTeaser = () => {
  const projects = proofProjects();
  return (
    <section data-home-section="proof" aria-labelledby="home-proof-heading" className="section bg-surface-subtle">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader id="home-proof-heading" title={PROOF.heading} lead={PROOF.intro} />

        {projects.length > 0 && (
          <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => {
              const alt = SHOTS.get(project.company);
              return (
                <Card asChild padding="none" key={project.company} className="h-full">
                  <li data-proof-project={project.company}>
                    <CardMedia>
                      {alt ? (
                        <img
                          {...responsiveImage(
                            project.image,
                            "(min-width: 1280px) 400px, (min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw",
                          )}
                          alt={alt}
                          loading="lazy"
                          decoding="async"
                          className={`h-full w-full object-cover ${POSITION[project.company] ?? "object-top"}`}
                        />
                      ) : (
                        // No cleared screenshot: the live domain on a navy tile. The same words are
                        // in the card below, so the tile is hidden from assistive tech.
                        <div
                          aria-hidden="true"
                          data-proof-tile
                          className="flex h-full w-full flex-col items-start justify-end gap-1 bg-primary p-6 text-primary-foreground"
                        >
                          <span className="text-small text-white/85">{project.industry}</span>
                          <span className="text-h3">{host(project.link)}</span>
                        </div>
                      )}
                    </CardMedia>
                    <CardBody>
                      <p className="text-sm font-semibold text-primary">{project.industry}</p>
                      <h3 className="text-h4 text-foreground">{project.company}</h3>
                      <p className="text-foreground/80 leading-relaxed max-w-measure">{firstSentence(project.solution)}</p>
                      <a
                        href={project.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${PROOF.visitLabel(project.company)} (opens in a new tab)`}
                        className="mt-auto inline-flex min-h-11 items-center gap-1 pt-2 font-semibold text-primary underline-offset-4 hover:underline focus-visible:underline"
                      >
                        {PROOF.visitLabel(project.company)}
                        <ExternalLink aria-hidden="true" className="h-4 w-4" />
                      </a>
                    </CardBody>
                  </li>
                </Card>
              );
            })}
          </ul>
        )}

        <div className="mt-10">
          <Button asChild variant="secondary" size="xl" className="w-full sm:w-auto" iconEnd={<ArrowRight />}>
            <Link to={PROOF_PATH}>{PROOF.cta}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ProofTeaser;
