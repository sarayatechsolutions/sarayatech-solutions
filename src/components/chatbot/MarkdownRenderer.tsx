import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useNavigate } from 'react-router-dom';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

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
   * Handle link clicks
   * Internal links (/solutions, /about, etc.) navigate within app
   * External links open in new tab
   */
  const handleLinkClick = (href: string, e: React.MouseEvent) => {
    e.preventDefault();

    // Check if it's an internal route
    if (href.startsWith('/')) {
      navigate(href);
      onLinkClick?.(); // Notify parent (e.g., to close chatbot)
    } else {
      // External link - open in new tab
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Markdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Custom link rendering
        a: ({ node, href, children, ...props }) => {
          const isInternal = href?.startsWith('/');
          const isCalendly = href?.includes('calendly.com');

          return (
            <a
              href={href}
              onClick={(e) => handleLinkClick(href || '#', e)}
              className={`
                font-bold underline underline-offset-2 transition-colors
                text-gold hover:text-gold/80
                ${isCalendly ? 'inline-flex items-center gap-1' : ''}
              `}
              {...props}
            >
              {children}
              {!isInternal && (
                <span className="inline-block ml-1 text-xs opacity-90">↗</span>
              )}
            </a>
          );
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

        // Code (inline and blocks with syntax highlighting)
        code: ({ node, inline, className, children, ...props }) => {
          const match = /language-(\w+)/.exec(className || '');
          const language = match ? match[1] : '';

          return !inline && language ? (
            // Code block with syntax highlighting
            <SyntaxHighlighter
              style={vscDarkPlus}
              language={language}
              PreTag="div"
              className="rounded-lg my-2 text-sm"
              customStyle={{
                margin: '0.5rem 0',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                border: '1px solid rgba(212, 175, 55, 0.2)',
              }}
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          ) : (
            // Inline code or code block without language
            <code
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
