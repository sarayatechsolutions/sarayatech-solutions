import { Fragment, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { parseInline, postLinkTarget, type PostBlock } from "@/content/insights/blog";

const linkClass = "font-semibold text-primary underline underline-offset-4 hover:text-primary-light focus-visible:underline";

/**
 * Body text with [label](/path), **bold** and *italic*. Every link goes through `postLinkTarget` (A7-2):
 * internal paths use the router, https: URLs open in a new tab with rel="noopener noreferrer", and
 * anything else (javascript:, data:, http:, "//host", ...) renders as its label in plain text.
 */
export const InlineText = ({ text }: { text: string }) => (
  <>
    {parseInline(text).map((node, i): ReactNode => {
      switch (node.type) {
        case "strong":
          return <strong key={i}>{node.text}</strong>;
        case "em":
          return <em key={i}>{node.text}</em>;
        case "link": {
          const target = postLinkTarget(node.href);
          if (target.kind === "internal") {
            return (
              <Link key={i} to={target.href} className={linkClass}>
                {node.text}
              </Link>
            );
          }
          if (target.kind === "external") {
            return (
              <a key={i} href={target.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                {node.text}
              </a>
            );
          }
          return <Fragment key={i}>{node.text}</Fragment>;
        }
        default:
          return <Fragment key={i}>{node.text}</Fragment>;
      }
    })}
  </>
);

const para = "text-lg text-foreground/80 leading-relaxed";

/** One body block. An owner `callout` never renders: a post that still has one is not publishable (blog.ts). */
export const Block = ({ block }: { block: PostBlock }) => {
  switch (block.kind) {
    case "p":
      return (
        <p className={para}>
          <InlineText text={block.text} />
        </p>
      );
    case "h3":
      return <h3 className="text-xl font-semibold text-foreground pt-2">{block.text}</h3>;
    case "ul":
      return (
        <ul className={`list-disc pl-6 space-y-2 ${para}`}>
          {block.items.map((t, i) => (
            <li key={i}>
              <InlineText text={t} />
            </li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol className={`list-decimal pl-6 space-y-2 ${para}`}>
          {block.items.map((t, i) => (
            <li key={i}>
              <InlineText text={t} />
            </li>
          ))}
        </ol>
      );
    case "table":
      return (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-left text-base text-foreground/80">
            <thead>
              <tr>
                {block.header.map((h, i) => (
                  <th key={i} scope="col" className="border-b border-border px-3 py-2 font-semibold text-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td key={c} className="border-b border-border px-3 py-2 align-top">
                      <InlineText text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "callout":
      return null;
  }
};
