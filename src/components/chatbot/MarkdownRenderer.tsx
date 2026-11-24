import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';
import { classifyHref } from './links';

interface MarkdownRendererProps {
  content: string;
  onLinkClick?: () => void; // Callback when internal link is clicked (e.g., to close chatbot)
}

/**
 * MarkdownRenderer Component
 * Renders markdown content with support for:
 * - Bold, italic, lists
 * - Links (internal navigation + external)
 * - Tables, strikethrough (GFM)
 * - Custom styling for chatbot messages
 */
const MarkdownRenderer = ({ content, onLinkClick }: MarkdownRendererProps) => {
  const navigate = useNavigate();

  /**
   * Internal links are routed in-app with the NORMALISED path from classifyHref. A modified
   * or non-primary click keeps the browser default, which is safe because the href attribute
   * is that same normalised same-origin path.
   */
  const handleInternalClick = (path: string, e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(path);
    onLinkClick?.(); // Notify parent (e.g., to close chatbot)
  };

  const linkClass = 'font-bold underline underline-offset-2 transition-colors text-gold hover:text-gold/80';

  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Links in bot text are untrusted (SEC-16): see ./links for the policy.
        a: ({ href, title, children }) => {
          const target = classifyHref(href);

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
                <span aria-hidden="true" className="inline-block ml-1 text-xs opacity-90">↗</span>
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            );
          }

          // Any other scheme (javascript:, data:, vbscript:, mailto:, ...) is shown as text.
          return <span data-unlinked="">{children}</span>;
        },

        // Bold text
        strong: ({ node, children, ...props }) => (
          <strong className="font-extrabold text-white" {...props}>
            {children}
          </strong>
        ),

        // Emphasis (italic)
        em: ({ node, children, ...props }) => (
          <em className="italic" {...props}>
            {children}
          </em>
        ),

        // Lists
        ul: ({ node, children, ...props }) => (
          <ul className="list-disc list-inside space-y-1.5 my-2 text-gray-100" {...props}>
            {children}
          </ul>
        ),

        ol: ({ node, children, ...props }) => (
          <ol className="list-decimal list-inside space-y-1.5 my-2 text-gray-100" {...props}>
            {children}
          </ol>
        ),

        li: ({ node, children, ...props }) => (
          <li className="text-sm leading-relaxed text-gray-100 ml-1" {...props}>
            {children}
          </li>
        ),

        // Paragraphs
        p: ({ node, children, ...props }) => (
          <p className="mb-2 last:mb-0 leading-relaxed text-gray-100" {...props}>
            {children}
          </p>
        ),

        // Headings
        h1: ({ node, children, ...props }) => (
          <h1 className="text-xl font-extrabold mb-2 mt-3 first:mt-0 text-white" {...props}>
            {children}
          </h1>
        ),

        h2: ({ node, children, ...props }) => (
          <h2 className="text-lg font-extrabold mb-2 mt-3 first:mt-0 text-white" {...props}>
            {children}
          </h2>
        ),

        h3: ({ node, children, ...props }) => (
          <h3 className="text-base font-bold mb-1 mt-2 first:mt-0 text-white" {...props}>
            {children}
          </h3>
        ),

        // Fenced code blocks: react-markdown renders <pre><code>. Plain, unhighlighted
        // markup keeps a syntax highlighter (and its grammars) out of the bundle.
        pre: ({ node, children, ...props }) => (
          <pre className="overflow-x-auto rounded-lg" {...props}>
            {children}
          </pre>
        ),

        // Code (inline and blocks)
        code: ({ node, className, children, ...props }) => {
          const match = /language-(\w+)/.exec(className || '');
          // react-markdown v10 dropped the `inline` prop: fenced blocks carry a
          // language class or end in a newline, inline code does neither.
          const inline = !match && !String(children).includes('\n');

          return (
            <code
              data-language={match ? match[1] : undefined}
              className={`
                ${inline
                  ? 'bg-gray-800 px-2 py-0.5 rounded text-sm font-mono text-gold border border-gold/30'
                  : 'block bg-gray-800 p-3 rounded-lg text-sm font-mono overflow-x-auto my-2 text-gray-100 border border-gold/20'
                }
              `}
              {...props}
            >
              {children}
            </code>
          );
        },

        // Blockquotes
        blockquote: ({ node, children, ...props }) => (
          <blockquote
            className="border-l-4 border-gold pl-4 py-2 my-2 italic text-gray-200 bg-gray-800/30 rounded-r"
            {...props}
          >
            {children}
          </blockquote>
        ),

        // Tables (GFM)
        table: ({ node, children, ...props }) => (
          <div className="overflow-x-auto my-3 border border-gold/20 rounded-lg">
            <table className="min-w-full divide-y divide-gold/20" {...props}>
              {children}
            </table>
          </div>
        ),

        thead: ({ node, children, ...props }) => (
          <thead className="bg-gray-800/50" {...props}>
            {children}
          </thead>
        ),

        tbody: ({ node, children, ...props }) => (
          <tbody className="divide-y divide-gold/10 bg-gray-900/20" {...props}>
            {children}
          </tbody>
        ),

        tr: ({ node, children, ...props }) => (
          <tr className="hover:bg-gray-800/30 transition-colors" {...props}>
            {children}
          </tr>
        ),

        th: ({ node, children, ...props }) => (
          <th
            className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-gold"
            {...props}
          >
            {children}
          </th>
        ),

        td: ({ node, children, ...props }) => (
          <td className="px-3 py-2 text-sm text-gray-100" {...props}>
            {children}
          </td>
        ),

        // Horizontal rule
        hr: ({ node, ...props }) => (
          <hr className="my-4 border-border" {...props} />
        ),
      }}
    >
      {content}
    </Markdown>
  );
};

export default MarkdownRenderer;
