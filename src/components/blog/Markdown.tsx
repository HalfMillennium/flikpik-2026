import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ComponentPropsWithoutRef } from "react";

/**
 * Renders article markdown into the flikpik type system. Internal links use
 * next/link; the blockquote is styled as the in-article CTA callout.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="space-y-5 text-[17px] leading-[1.7] text-[var(--color-ink)]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => (
            <h2 className="type-title mt-10 mb-1 !text-[26px]">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-8 mb-1 font-display text-xl font-bold tracking-[-0.01em]">
              {children}
            </h3>
          ),
          p: ({ children }) => <p>{children}</p>,
          ul: ({ children }) => (
            <ul className="ml-1 space-y-2">{children}</ul>
          ),
          li: ({ children }) => (
            <li className="flex gap-2">
              <span
                aria-hidden
                className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-red)]"
              />
              <span className="min-w-0">{children}</span>
            </li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-[var(--color-ink)]">
              {children}
            </strong>
          ),
          em: ({ children }) => <em>{children}</em>,
          blockquote: ({ children }) => (
            <blockquote className="my-8 rounded-2xl border border-[var(--color-line)] bg-[var(--color-red-tint)]/40 px-5 py-4 text-[var(--color-ink)]">
              {children}
            </blockquote>
          ),
          a: ({ href, children }: ComponentPropsWithoutRef<"a">) => {
            const internal = href?.startsWith("/");
            const cls =
              "font-semibold text-[var(--color-red)] underline underline-offset-2 hover:text-[var(--color-red-deep)]";
            if (internal) {
              return (
                <Link href={href!} className={cls}>
                  {children}
                </Link>
              );
            }
            return (
              <a href={href} className={cls} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
