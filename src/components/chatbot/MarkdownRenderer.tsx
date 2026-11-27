import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';
import { BARE_PATH, classifyChatHref, type ChatLinkPolicy } from './chatLinks';

interface MarkdownRendererProps {
  content: string;
  onLinkClick?: () => void; // Callback when internal link is clicked (e.g., to close chatbot)
  /** The link policy. Default: the chat allow-list (./chatLinks). Tests pass their own. */
  classifyLink?: ChatLinkPolicy;
}

/** The few mdast fields the text plugin reads. Everything else passes through untouched. */
interface MdNode {
  type: string;
  value?: string;
  url?: string;
  children?: MdNode[];
}

/** Text inside these is never re-linked or re-broken. */
const KEEP_AS_IS = new Set(['link', 'linkReference', 'inlineCode', 'code', 'html']);

/**
 * FF-5: a remark plugin over the parsed tree (never over HTML). In plain text only:
 *  - a bare page path ("Details: /services/local-seo") that the link policy accepts as an internal
 *    route becomes a link node, so it renders through the same `a` component and policy below;
 *  - a single newline becomes a line break, so "• item" lines stay one per line instead of
 *    collapsing into one paragraph.
 * The text itself is kept verbatim, so nothing a reply says is lost.
 */
function remarkChatText(classify: ChatLinkPolicy) {
  const splitText = (value: string): MdNode[] => {
    const out: MdNode[] = [];
    value.split('\n').forEach((line, i) => {
      if (i > 0) out.push({ type: 'break' });
      let last = 0;
      for (const match of line.matchAll(BARE_PATH)) {
        const path = match[0];
        const at = match.index ?? 0;
        if (classify(path).kind !== 'internal') continue;
        if (at > last) out.push({ type: 'text', value: line.slice(last, at) });
        out.push({ type: 'link', url: path, children: [{ type: 'text', value: path }] });
        last = at + path.length;
      }
      if (last < line.length) out.push({ type: 'text', value: line.slice(last) });
    });
    return out;
  };

  const walk = (node: MdNode) => {
    if (!node.children || KEEP_AS_IS.has(node.type)) return;
    node.children = node.children.flatMap((child) => {
      if (child.type === 'text' && typeof child.value === 'string') return splitText(child.value);
      walk(child);
      return [child];
    });
  };

  return () => (tree: MdNode) => {
    walk(tree);
  };
}

/**
 * MarkdownRenderer: the assistant's reply, parsed as Markdown (GFM) and rendered as React
 * elements. No raw HTML (there is no rehype-raw), no images, no dangerouslySetInnerHTML. Styled
 * for the --muted assistant bubble (B8 / FD-31): tokens only.
 */
const MarkdownRenderer = ({ content, onLinkClick, classifyLink = classifyChatHref }: MarkdownRendererProps) => {
  const navigate = useNavigate();

  /**
   * Internal links are routed in-app with the NORMALISED path from the policy. A modified or
   * non-primary click keeps the browser default, which is safe because the href attribute is that
   * same normalised same-origin path.
   */
  const handleInternalClick = (path: string, e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(path);
    onLinkClick?.(); // Notify parent (e.g., to close chatbot)
  };

  const linkClass =
    'rounded-sm font-semibold text-primary underline underline-offset-2 transition-colors duration-fast ease-standard hover:text-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1';

  return (
    <Markdown
      remarkPlugins={[remarkGfm, remarkChatText(classifyLink)]}
      components={{
        // Links in bot text are untrusted (SEC-16, FF-5): see ./chatLinks for the allow-list.
        a: ({ href, title, children }) => {
          const target = classifyLink(href);

          if (target.kind === 'internal') {
            return (
              <a
                href={target.href}
                title={title}
                onClick={(e) => handleInternalClick(target.href, e)}
                className={linkClass}
              >
                {children}
              </a>
            );
          }

          if (target.kind === 'external') {
            return (
              <a
                href={target.href}
                title={title}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                {children}
                <span aria-hidden="true" className="ml-1 inline-block text-xs">↗</span>
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            );
          }

          // Any other scheme, host or path is shown as text.
          return <span data-unlinked="">{children}</span>;
        },

        // Images in bot text are untrusted too: an <img> fetches its URL with no click, which an
        // injected reply can use to exfiltrate conversation text in the query string. Never
        // render one; show its alt text as plain text instead. (Raw HTML <img> is already
        // escaped because there is no rehype-raw.)
        img: ({ alt }) => <span data-unlinked="">{alt}</span>,

        strong: ({ node, children, ...props }) => (
          <strong className="font-semibold text-foreground" {...props}>
            {children}
          </strong>
        ),

        em: ({ node, children, ...props }) => (
          <em className="italic" {...props}>
            {children}
          </em>
        ),

        ul: ({ node, children, ...props }) => (
          <ul className="my-2 list-disc space-y-1 pl-5" {...props}>
            {children}
          </ul>
        ),

        ol: ({ node, children, ...props }) => (
          <ol className="my-2 list-decimal space-y-1 pl-5" {...props}>
            {children}
          </ol>
        ),

        li: ({ node, children, ...props }) => (
          <li className="leading-relaxed" {...props}>
            {children}
          </li>
        ),

        p: ({ node, children, ...props }) => (
          <p className="mb-2 leading-relaxed last:mb-0" {...props}>
            {children}
          </p>
        ),

        // Headings inside a bubble stay small: the panel's own title is the dialog heading.
        h1: ({ node, children, ...props }) => (
          <p className="mb-1 mt-3 font-semibold text-foreground first:mt-0" {...props}>
            {children}
          </p>
        ),

        h2: ({ node, children, ...props }) => (
          <p className="mb-1 mt-3 font-semibold text-foreground first:mt-0" {...props}>
            {children}
          </p>
        ),

        h3: ({ node, children, ...props }) => (
          <p className="mb-1 mt-2 font-semibold text-foreground first:mt-0" {...props}>
            {children}
          </p>
        ),

        // Fenced code blocks: react-markdown renders <pre><code>. Plain, unhighlighted
        // markup keeps a syntax highlighter (and its grammars) out of the bundle.
        pre: ({ node, children, ...props }) => (
          <pre className="overflow-x-auto rounded-sm" {...props}>
            {children}
          </pre>
        ),

        code: ({ node, className, children, ...props }) => {
          const match = /language-(\w+)/.exec(className || '');
          // react-markdown v10 dropped the `inline` prop: fenced blocks carry a
          // language class or end in a newline, inline code does neither.
          const inline = !match && !String(children).includes('\n');

          return (
            <code
              data-language={match ? match[1] : undefined}
              className={
                inline
                  ? 'rounded-sm border border-border bg-background px-1.5 py-0.5 font-mono text-[0.8125rem]'
                  : 'my-2 block overflow-x-auto rounded-sm border border-border bg-background p-3 font-mono text-[0.8125rem]'
              }
              {...props}
            >
              {children}
            </code>
          );
        },

        blockquote: ({ node, children, ...props }) => (
          <blockquote className="my-2 border-l-4 border-primary/30 py-1 pl-3 text-muted-foreground" {...props}>
            {children}
          </blockquote>
        ),

        table: ({ node, children, ...props }) => (
          <div className="my-3 overflow-x-auto rounded-sm border border-border">
            <table className="min-w-full divide-y divide-border" {...props}>
              {children}
            </table>
          </div>
        ),

        thead: ({ node, children, ...props }) => (
          <thead className="bg-background" {...props}>
            {children}
          </thead>
        ),

        tbody: ({ node, children, ...props }) => (
          <tbody className="divide-y divide-border" {...props}>
            {children}
          </tbody>
        ),

        tr: ({ node, children, ...props }) => <tr {...props}>{children}</tr>,

        th: ({ node, children, ...props }) => (
          <th className="px-3 py-2 text-left text-xs font-semibold text-foreground" {...props}>
            {children}
          </th>
        ),

        td: ({ node, children, ...props }) => (
          <td className="px-3 py-2" {...props}>
            {children}
          </td>
        ),

        hr: ({ node, ...props }) => <hr className="my-3 border-border" {...props} />,
      }}
    >
      {content}
    </Markdown>
  );
};

export default MarkdownRenderer;
