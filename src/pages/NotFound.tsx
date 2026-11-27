import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { NOT_FOUND } from "@/content/not-found/not-found";

/**
 * The catch-all page, also prerendered as dist/404.html (design audit B7).
 *
 * Start-aligned like every inner page, on the page background (no raw gray), one h1, one helper
 * sentence and three ways on: home (the one filled button), services and contact. The noindex comes
 * from getSeo() for any unknown path, not from here. It no longer logs the miss to the console: a
 * visitor's typo is not an application error.
 */
const NotFound = () => {
  const { home, services, contact } = NOT_FOUND.links;
  return (
    <section
      aria-labelledby="not-found-heading"
      data-not-found=""
      className="bg-background pt-32 pb-20 lg:pt-40 lg:pb-28 min-h-[70vh]"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-eyebrow uppercase text-secondary">{NOT_FOUND.eyebrow}</p>
          <h1 id="not-found-heading" className="mt-3 text-h1 text-foreground">
            {NOT_FOUND.heading}
          </h1>
          <p className="mt-4 max-w-measure text-body-lg text-secondary">{NOT_FOUND.body}</p>
          <ul className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <li>
              <Button asChild variant="primary" size="lg" className="w-full sm:w-auto">
                <Link to={home.href}>{home.label}</Link>
              </Button>
            </li>
            <li>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                <Link to={services.href}>{services.label}</Link>
              </Button>
            </li>
            <li>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                <Link to={contact.href}>{contact.label}</Link>
              </Button>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
};

export default NotFound;
