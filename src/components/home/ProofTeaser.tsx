import { ArrowRight, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import realisations from "../../../data/realisations.json";
import { PROOF, PROOF_PATH } from "./content";

interface Realisation {
  company: string;
  industry: string;
  solution: string;
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
 * Proof teaser (STS-031, REQ-021). Project name, live link and what was built; no metrics.
 * Text only: the MIMAP screenshot contains a stock photo of a person, which must not read as
 * our team or client (REQ-015). Screenshots stay on the proof page, owned by STS-035.
 */
const ProofTeaser = () => {
  const projects = proofProjects();
  return (
    <section data-home-section="proof" aria-labelledby="home-proof-heading" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
          <h2 id="home-proof-heading" className="text-3xl md:text-4xl font-bold">
            {PROOF.heading}
          </h2>
          <p className="text-lg text-foreground/80">{PROOF.intro}</p>
        </div>

        {projects.length > 0 && (
          <ul className="grid gap-8 md:grid-cols-3">
            {projects.map((project) => (
              <li
                key={project.company}
                className="bg-card rounded-2xl shadow-card border border-border flex flex-col"
              >
                <div className="p-6 space-y-2 flex flex-col flex-1">
                  <p className="text-sm font-semibold text-primary">{project.industry}</p>
                  <h3 className="text-xl font-bold text-foreground">{project.company}</h3>
                  <p className="text-foreground/80 leading-relaxed flex-1">{firstSentence(project.solution)}</p>
                  <a
                    href={project.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${PROOF.visitLabel(project.company)} (opens in a new tab)`}
                    className="inline-flex items-center gap-1 font-semibold text-primary underline-offset-4 hover:underline focus-visible:underline"
                  >
                    {PROOF.visitLabel(project.company)}
                    <ExternalLink aria-hidden="true" className="w-4 h-4" />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="text-center mt-12">
          <Button asChild variant="secondary" size="xl" className="w-full sm:w-auto" iconEnd={<ArrowRight />}>
            <Link to={PROOF_PATH}>{PROOF.cta}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ProofTeaser;
