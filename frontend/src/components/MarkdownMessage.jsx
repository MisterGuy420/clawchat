import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * MarkdownMessage Component
 * 
 * Renders message content with Markdown formatting support including:
 * - Bold (**text**)
 * - Italic (*text* or _text_)
 * - Strikethrough (~~text~~)
 * - Inline code (`code`)
 * - Code blocks (```code```)
 * - Links ([text](url))
 * - Blockquotes (> text)
 * - Lists (- item, * item, 1. item)
 * - Tables (GitHub flavored markdown)
 */
export default function MarkdownMessage({ text, isDark }) {
  // Pre-process text to handle Discord/Slack-style mentions and code blocks
  const processedText = text
    // Escape HTML tags to prevent XSS
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const components = {
    // Style code blocks
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      return inline ? (
        <code
          className={`px-1.5 py-0.5 rounded text-sm font-mono ${
            isDark
              ? 'bg-gray-700 text-claw-300'
              : 'bg-gray-200 text-claw-700'
          }`}
          {...props}
        >
          {children}
        </code>
      ) : (
        <div className="relative group">
          <pre
            className={`p-3 rounded-lg overflow-x-auto my-2 ${
              isDark
                ? 'bg-gray-800 border border-gray-700'
                : 'bg-gray-100 border border-gray-200'
            }`}
          >
            <code
              className={`text-sm font-mono ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}
              {...props}
            >
              {children}
            </code>
          </pre>
        </div>
      );
    },
    // Style blockquotes
    blockquote({ children }) {
      return (
        <blockquote
          className={`border-l-4 pl-4 py-1 my-2 italic ${
            isDark
              ? 'border-claw-500 bg-gray-800/50 text-gray-300'
              : 'border-claw-400 bg-gray-100/50 text-gray-600'
          }`}
        >
          {children}
        </blockquote>
      );
    },
    // Style lists
    ul({ children }) {
      return (
        <ul className={`list-disc pl-5 my-2 space-y-1 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
          {children}
        </ul>
      );
    },
    ol({ children }) {
      return (
        <ol className={`list-decimal pl-5 my-2 space-y-1 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
          {children}
        </ol>
      );
    },
    // Style links
    a({ href, children }) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`hover:underline break-all ${
            isDark
              ? 'text-claw-400 hover:text-claw-300'
              : 'text-claw-600 hover:text-claw-700'
          }`}
        >
          {children}
        </a>
      );
    },
    // Style horizontal rules
    hr() {
      return (
        <hr className={`my-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-300'}`} />
      );
    },
    // Style tables
    table({ children }) {
      return (
        <div className="overflow-x-auto my-2">
          <table className={`min-w-full border-collapse ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
            {children}
          </table>
        </div>
      );
    },
    thead({ children }) {
      return (
        <thead className={isDark ? 'bg-gray-800' : 'bg-gray-100'}>
          {children}
        </thead>
      );
    },
    th({ children }) {
      return (
        <th className={`border px-3 py-2 text-left font-semibold ${
          isDark ? 'border-gray-700 text-gray-200' : 'border-gray-300 text-gray-700'
        }`}>
          {children}
        </th>
      );
    },
    td({ children }) {
      return (
        <td className={`border px-3 py-2 ${
          isDark ? 'border-gray-700' : 'border-gray-300'
        }`}>
          {children}
        </td>
      );
    },
    // Style headings
    h1({ children }) {
      return <h1 className={`text-xl font-bold my-3 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{children}</h1>;
    },
    h2({ children }) {
      return <h2 className={`text-lg font-bold my-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{children}</h2>;
    },
    h3({ children }) {
      return <h3 className={`text-base font-bold my-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{children}</h3>;
    },
    h4({ children }) {
      return <h4 className={`text-sm font-bold my-1 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{children}</h4>;
    },
    p({ children }) {
      return <p className={`${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{children}</p>;
    },
    strong({ children }) {
      return <strong className="font-bold">{children}</strong>;
    },
    em({ children }) {
      return <em className="italic">{children}</em>;
    },
    del({ children }) {
      return <del className="line-through opacity-70">{children}</del>;
    },
  };

  return (
    <div className="markdown-content break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
        skipHtml={true}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
