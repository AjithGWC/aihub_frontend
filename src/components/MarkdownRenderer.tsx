import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownRendererProps {
  text: string;
  isUser?: boolean;
}

export default function MarkdownRenderer({ text, isUser = false }: MarkdownRendererProps) {
  const textColorClass = isUser ? 'text-white' : 'text-foreground';
  const headingColorClass = isUser ? 'text-white' : 'text-foreground/90 dark:text-foreground';
  const boldColorClass = isUser ? 'text-white' : 'text-foreground/95 dark:text-foreground';

  return (
    <div className={`markdown-content leading-relaxed ${textColorClass}`}>
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className={`text-base font-extrabold tracking-tight mt-3 mb-2 ${headingColorClass}`}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className={`text-sm font-extrabold tracking-tight mt-2.5 mb-1.5 ${headingColorClass}`}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className={`text-xs font-extrabold tracking-tight mt-2 mb-1 ${headingColorClass}`}>
              {children}
            </h3>
          ),
          p: ({ node, children }) => {
            const firstChild = node?.children?.[0];
            const isStandaloneBold =
              node?.children?.length === 1 &&
              firstChild?.type === 'element' &&
              (firstChild as any).tagName === 'strong';

            if (isStandaloneBold) {
              return (
                <p className={`text-sm font-extrabold tracking-tight mt-2.5 mb-1.5 ${boldColorClass} block`}>
                  {children}
                </p>
              );
            }

            return <p className="mb-2 last:mb-0 text-sm leading-relaxed">{children}</p>;
          },
          strong: ({ children }) => (
            <strong className={`font-extrabold ${isUser ? 'text-white' : 'text-foreground dark:text-white'}`}>
              {children}
            </strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => (
            <ul className="list-disc pl-5 my-2 space-y-1 text-sm">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 my-2 space-y-1 text-sm">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={`underline font-medium hover:opacity-85 transition-opacity ${
                isUser ? 'text-white hover:text-white/90' : 'text-primary hover:text-primary/95'
              }`}
            >
              {children}
            </a>
          ),
          code: ({ node, className, children, ...props }) => {
            const content = String(children).replace(/\n$/, '');
            const isInline = !content.includes('\n');

            if (isInline) {
              return (
                <code
                  className={`font-mono text-xs px-1.5 py-0.5 rounded ${
                    isUser
                      ? 'bg-white/20 text-white'
                      : 'bg-muted-foreground/15 text-foreground'
                  }`}
                  {...props}
                >
                  {content}
                </code>
              );
            }

            return (
              <pre className={`w-full my-3 overflow-x-auto rounded-xl border p-3 font-mono text-xs ${
                isUser
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'bg-secondary/50 border-border/40 text-foreground dark:text-neutral-200'
              }`}>
                <code {...props}>{content}</code>
              </pre>
            );
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
