import { Link } from "react-router-dom";
import manifest from "@/generated/image-manifest.json";
import { HIGH_FETCH_PRIORITY } from "@/lib/responsiveImage";
import realisationsData from "../../../data/realisations.json";
import { HERO_FRAMES, PROOF_PATH } from "./content";

type Entry = { width: number; height: number; variants: { w: number; src: string }[] };
const entries = manifest as Record<string, Entry>;

interface Realisation {
  company: string;
  industry: string;
  image: string;
  isActive: boolean;
  link: string | null;
}

/**
 * A 1x1 transparent GIF. The `<img>` fallback below lg, where the frames are hidden: a phone
 * downloads no screenshot at all, so the hero's LCP stays the headline (design audit FD-05).
 */
const BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/** The `lg` breakpoint, where the aside becomes visible. */
const LG = "(min-width: 1024px)";

/** Active projects named in HERO_FRAMES that have a screenshot in the image manifest. */
const heroFrameProjects = (data: Realisation[] = realisationsData as Realisation[]) =>
  HERO_FRAMES.frames
    .map((f) => {
      const r = data.find((d) => d.company === f.company && d.isActive);
      const e = r ? entries[r.image] : undefined;
      return r && e ? { ...f, image: r.image, link: r.link, entry: e } : null;
    })
    .filter((f): f is NonNullable<typeof f> => f !== null);

const host = (link: string | null) => (link ? new URL(link).hostname.replace(/^www\./, "") : "");

/** Screenshot that is only fetched at lg and up (media-gated `<source>`), eager there. */
const FrameImage = ({
  entry,
  alt,
  sizes,
  priority,
  className,
}: {
  entry: Entry;
  alt: string;
  sizes: string;
  priority?: boolean;
  className: string;
}) => (
  <picture>
    <source media={LG} srcSet={entry.variants.map((v) => `${v.src} ${v.w}w`).join(", ")} sizes={sizes} />
    <img
      src={BLANK}
      alt={alt}
      width={entry.width}
      height={entry.height}
      decoding="async"
      {...(priority ? HIGH_FETCH_PRIORITY : {})}
      className={className}
    />
  </picture>
);

const lift =
  "group block transition-[transform,box-shadow] duration-base ease-standard motion-safe:hover:-translate-y-1 hover:shadow-lg focus-visible:outline-white focus-visible:shadow-[0_0_0_2px_hsl(var(--primary-dark))]";

/**
 * The home hero's right column (design audit B4, FD-05): a browser-framed ASTA screenshot with
 * the BMV app screens overlapping at the bottom left. Both link to Our Work. Hidden below lg.
 * Entrance (A9): a 16 px rise and fade over 450 ms, the second frame 80 ms later; with reduced
 * motion the frames are simply there. `backwards` fill, so the hover lift still works afterwards.
 */
const HeroFrames = () => {
  const [site, app] = heroFrameProjects();
  if (!site) return null;
  return (
    <div data-hero-frames aria-label={HERO_FRAMES.label} role="group" className="relative hidden lg:block pb-16 pl-12">
      <Link
        to={PROOF_PATH}
        className={`${lift} overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-white/20 motion-safe:animate-frame-rise`}
      >
        <div aria-hidden="true" className="flex h-8 items-center gap-1.5 border-b border-border bg-muted px-3">
          <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
          <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
          <span className="h-2.5 w-2.5 rounded-full bg-border-strong" />
          <span className="ml-3 flex h-5 min-w-0 flex-1 items-center rounded-sm bg-background px-2 text-xs text-muted-foreground">
            {host(site.link)}
          </span>
        </div>
        <div className="aspect-video overflow-hidden bg-muted">
          <FrameImage
            entry={site.entry}
            alt={site.alt}
            sizes="(min-width: 1280px) 460px, 380px"
            priority
            className="h-full w-full object-cover object-top"
          />
        </div>
      </Link>
      {app ? (
        <Link
          to={PROOF_PATH}
          className={`${lift} absolute bottom-0 left-0 w-40 xl:w-48 overflow-hidden rounded-lg bg-white shadow-lg ring-4 ring-white motion-safe:animate-frame-rise [animation-delay:80ms]`}
        >
          <div className="aspect-[4/5] overflow-hidden bg-muted">
            <FrameImage
              entry={app.entry}
              alt={app.alt}
              sizes="192px"
              className="h-full w-full object-cover object-center"
            />
          </div>
        </Link>
      ) : null}
    </div>
  );
};

export default HeroFrames;
