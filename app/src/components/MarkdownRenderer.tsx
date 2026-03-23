import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github-dark.css';

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
    return (
        <div className={`prose prose-sm prose-slate dark:prose-invert max-w-none text-[0.9rem] sm:text-[14.5px] md:text-[15px] lg:text-[15.5px] ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeRaw, rehypeKatex, rehypeHighlight]}
                components={{
                    // Markdown # → rendered as <h2> (page title already occupies <h1>)
                    h1: ({ children }) => (
                        <h2 className="text-xl sm:text-[22px] font-bold mt-5 mb-3">{children}</h2>
                    ),
                    // Markdown ## → <h3>
                    h2: ({ children }) => (
                        <h3 className="text-lg sm:text-[1.15rem] font-semibold mt-4 mb-2">{children}</h3>
                    ),
                    // Markdown ### → <h4>
                    h3: ({ children }) => (
                        <h4 className="text-base sm:text-[1.05rem] font-semibold mt-5 mb-2">{children}</h4>
                    ),
                    // Markdown #### → <h5>
                    h4: ({ children }) => (
                        <h5 className="text-sm sm:text-[15px] font-medium mt-4 mb-2">{children}</h5>
                    ),
                    // Markdown ##### → <h6>
                    h5: ({ children }) => (
                        <h6 className="text-xs sm:text-[13.5px] font-medium mt-3 mb-1">{children}</h6>
                    ),
                    // Markdown ###### → <h6> (smallest)
                    h6: ({ children }) => (
                        <h6 className="text-xs sm:text-[13.5px] font-medium mt-3 mb-1 text-muted-foreground">{children}</h6>
                    ),
                    // Inline code (not inside a code block)
                    code: ({ className: cls, children, ...props }) => {
                        const rawText = Array.isArray(children) ? children.join('') : String(children);
                        const isBlock = Boolean(cls?.includes('language-')) || rawText.includes('\n');
                        if (isBlock) {
                            // Block code — rendered by rehype-highlight, just pass through
                            return <code className={cls} {...props}>{children}</code>;
                        }
                        return (
                            <code
                                className="px-1.5 py-0.5 rounded bg-muted text-xs sm:text-[13px] font-mono text-primary"
                                {...props}
                            >
                                {children}
                            </code>
                        );
                    },
                    // Code block wrapper
                    pre: ({ children }) => (
                        <pre className="mt-4 mb-4 rounded-lg overflow-x-auto text-xs sm:text-[13px] leading-relaxed shadow-sm">{children}</pre>
                    ),
                    // Blockquote
                    blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-primary/40 pl-4 my-4 text-muted-foreground italic">
                            {children}
                        </blockquote>
                    ),
                    // Table styling
                    table: ({ children }) => (
                        <div className="overflow-x-auto my-4">
                            <table className="w-full border-collapse text-sm">{children}</table>
                        </div>
                    ),
                    th: ({ children }) => (
                        <th className="border border-border bg-muted px-4 py-2 text-left font-semibold">{children}</th>
                    ),
                    td: ({ children }) => (
                        <td className="border border-border px-4 py-2">{children}</td>
                    ),
                    // Links
                    a: ({ href, children }) => (
                        <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
                        >
                            {children}
                        </a>
                    ),
                    // Horizontal rule
                    hr: () => <hr className="my-4 border-border" />,
                    // Images
                    img: ({ src, alt }) => (
                        <span className="block my-6">
                            <img
                                src={src}
                                alt={alt ?? ''}
                                className="max-w-full mx-auto rounded-lg border border-border shadow-sm"
                                loading="lazy"
                            />
                            {alt && (
                                <span className="block text-center text-xs text-muted-foreground mt-2 italic">
                                    {alt}
                                </span>
                            )}
                        </span>
                    ),
                    // List items
                    ul: ({ children, className: listClassName }) => {
                        const isTaskList = Boolean(listClassName?.includes('contains-task-list'));
                        const classes = [
                            'my-4 space-y-1',
                            isTaskList ? 'list-none pl-0' : 'list-disc pl-5',
                            listClassName,
                        ]
                            .filter(Boolean)
                            .join(' ');
                        return <ul className={classes}>{children}</ul>;
                    },
                    ol: ({ children, className: listClassName }) => {
                        const classes = ['my-4 space-y-1 list-decimal pl-5', listClassName]
                            .filter(Boolean)
                            .join(' ');
                        return <ol className={classes}>{children}</ol>;
                    },
                    li: ({ children, className: itemClassName }) => {
                        const isTaskItem = Boolean(itemClassName?.includes('task-list-item'));
                        const classes = [
                            'my-1',
                            isTaskItem ? 'list-none' : '',
                            itemClassName,
                        ]
                            .filter(Boolean)
                            .join(' ');
                        return <li className={classes}>{children}</li>;
                    },
                    // Paragraph
                    p: ({ children }) => (
                        <p className="leading-relaxed my-4 first:mt-0">{children}</p>
                    ),
                    // Strong
                    strong: ({ children }) => (
                        <strong className="font-semibold text-foreground">{children}</strong>
                    ),
                    // Collapsible details block
                    details: ({ children }) => (
                        <details className="my-5 rounded-xl border border-border bg-muted/20 open:border-primary/30 open:bg-muted/5 transition-colors duration-200 group [&>summary+p]:mt-2 [&>summary+div]:mt-2 [&>p]:px-4 [&>p:first-child]:mt-2 [&>p:last-child]:pb-3 [&>p:last-child]:mb-0 [&>div]:px-4 [&>pre]:mx-3 [&>pre]:mb-3 [&>pre]:mt-2">
                            {children}
                        </details>
                    ),
                    summary: ({ children }) => (
                        <summary className="cursor-pointer select-none list-none px-4 py-3 font-medium text-foreground hover:text-primary transition-all duration-200 flex items-center gap-2 [&::-webkit-details-marker]:hidden before:content-['▶'] before:text-[10px] before:text-muted-foreground/60 before:transition-transform before:duration-200 group-open:before:rotate-90 group-open:before:text-primary/70 border-b border-transparent group-open:border-border/50">
                            {children}
                        </summary>
                    ),
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
