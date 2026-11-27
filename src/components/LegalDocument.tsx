import { Link } from "react-router-dom";
import {
  DRAFT_NOTICE,
  LEGAL_PAGES_APPROVED,
  effectiveDateLine,
  type Inline,
  type LegalDocument as LegalDoc,
} from "@/content/legal/legal";

const container = "container mx-auto px-4 sm:px-6 lg:px-8";
const linkCls =
  "font-semibold text-primary underline underline-offset-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const renderInline = (parts: Inline[]) =>
  parts.map((part, i) =>
    typeof part === "string" ? (
      <span key={i}>{part}</span>
    ) : (
      <Link key={i} to={part.to} className={linkCls}>
        {part.text}
      </Link>
    ),
  );

/**
 * Renders one legal document (STS-037, REQ-046): one h1, the draft notice while C23 is open,
 * then one h2 per section. Copy lives in src/content/legal/.
 */
const LegalDocument = ({ doc, name }: { doc: LegalDoc; name: string }) => (
  <article data-legal-page={name} aria-labelledby={`${name}-title`} className="pt-32 pb-24 bg-background">
    <div className={`${container} max-w-3xl`}>
      <h1 id={`${name}-title`} className="text-4xl md:text-5xl font-extrabold leading-tight mb-6">
        {doc.title}
      </h1>

      {!LEGAL_PAGES_APPROVED && (
        <div
          role="note"
          aria-label={DRAFT_NOTICE.heading}
          data-legal-draft
          className="mb-8 rounded-xl border-2 border-warning-border bg-warning-surface p-4 text-warning"
        >
          <p className="font-bold">{DRAFT_NOTICE.heading}</p>
          <p className="mt-1">{DRAFT_NOTICE.body}</p>
        </div>
      )}

      <p className="text-sm text-foreground/70 mb-8">{effectiveDateLine()}</p>
      <p className="text-lg text-foreground/80 leading-relaxed mb-10">{renderInline(doc.intro)}</p>

      {doc.sections.map((s) => (
        <section key={s.id} aria-labelledby={`${name}-${s.id}`} className="mb-10">
          <h2 id={`${name}-${s.id}`} className="text-2xl font-bold mb-4">
            {s.heading}
          </h2>
          {/* Design review: the reading measure (about 72 characters a line at every width). */}
          <div className="space-y-4 max-w-measure text-foreground/80 leading-relaxed">
            {s.blocks.map((b, i) =>
              "p" in b ? (
                <p key={i}>{renderInline(b.p)}</p>
              ) : (
                <ul key={i} className="list-disc pl-6 space-y-2">
                  {b.ul.map((item, j) => (
                    <li key={j}>{renderInline(item)}</li>
                  ))}
                </ul>
              ),
            )}
          </div>
        </section>
      ))}
    </div>
  </article>
);

export default LegalDocument;
