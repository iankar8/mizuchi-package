import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { cn } from '@/lib/utils';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className }) => {
  return (
    <div className={cn("markdown-renderer prose dark:prose-invert max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter
                style={vscDarkPlus}
                language={match[1]}
                PreTag="div"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          a: ({ node, ...props }) => (
            <a
              {...props}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            />
          ),
          h1: ({ node, ...props }) => <h1 {...props} className="text-2xl font-bold mt-6 mb-4" />,
          h2: ({ node, ...props }) => <h2 {...props} className="text-xl font-bold mt-5 mb-3" />,
          h3: ({ node, ...props }) => <h3 {...props} className="text-lg font-bold mt-4 mb-2" />,
          ul: ({ node, ...props }) => <ul {...props} className="list-disc pl-6 my-4" />,
          ol: ({ node, ...props }) => <ol {...props} className="list-decimal pl-6 my-4" />,
          blockquote: ({ node, ...props }) => (
            <blockquote
              {...props}
              className="border-l-4 border-muted pl-4 italic my-4"
            />
          ),
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-4">
              <table {...props} className="border-collapse table-auto w-full" />
            </div>
          ),
          th: ({ node, ...props }) => (
            <th {...props} className="border border-muted bg-muted px-4 py-2 text-left" />
          ),
          td: ({ node, ...props }) => (
            <td {...props} className="border border-muted px-4 py-2" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
