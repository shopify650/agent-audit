import type { ReactNode } from 'react';
import type { Block } from '../lib/content';
import MicroAuditPlayground from './MicroAuditPlayground';

const calloutTones: Record<string, string> = {
  info: 'border-[var(--optimization)]/25 bg-[var(--optimization)]/8 text-[color:var(--body)]',
  success: 'border-[var(--success)]/25 bg-[var(--success)]/8 text-[color:var(--body)]',
  warning: 'border-[var(--warning)]/25 bg-[var(--warning)]/10 text-[color:var(--body)]',
  error: 'border-[var(--error)]/25 bg-[var(--error)]/10 text-[color:var(--body)]',
};

function CodeBlock({ title, code }: { title?: string; code: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--surface-white)]">
      {title && (
        <div className="border-b border-[var(--card-border)] bg-[var(--surface-card)] px-4 py-2 font-mono text-xs text-[color:var(--muted)]">
          {title}
        </div>
      )}
      <pre className="overflow-x-auto bg-[var(--canvas-soft)] p-4 font-mono text-xs leading-6 text-[color:var(--ink)]">
        {code}
      </pre>
    </div>
  );
}

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case 'p':
      return <p className="text-base leading-7 text-[color:var(--body)]">{block.text}</p>;
    case 'h2':
      return (
        <h2 id={slugify(block.text)} className="scroll-mt-24 text-2xl font-normal tracking-[-0.02em] text-[color:var(--ink)]">
          {block.text}
        </h2>
      );
    case 'h3':
      return <h3 className="text-lg font-medium text-[color:var(--ink)]">{block.text}</h3>;
    case 'ul':
      return (
        <ul className="space-y-2.5 text-base leading-7 text-[color:var(--body)]">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    case 'ol':
      return (
        <ol className="space-y-2.5 text-base leading-7 text-[color:var(--body)]">
          {block.items.map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--accent)]/12 text-xs font-semibold text-[var(--accent)]">
                {i + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      );
    case 'callout':
      return (
        <div className={`rounded-xl border p-4 text-sm leading-6 ${calloutTones[block.tone]}`}>
          {block.text}
        </div>
      );
    case 'code':
      return <CodeBlock title={block.title} code={block.code} />;
    case 'playground':
      return <MicroAuditPlayground before={block.before} after={block.after} caption={block.caption} />;
    case 'table':
      return (
        <div className="overflow-x-auto rounded-xl border border-[var(--card-border)]">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--card-border)] bg-[var(--surface-card)]">
                {block.headers.map((h) => (
                  <th key={h} className="px-4 py-3 font-medium text-[color:var(--ink)]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri} className="border-b border-[var(--hairline-soft)] last:border-0">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-4 py-3 align-top text-[color:var(--body)]">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'quote':
      return (
        <blockquote className="border-l-2 border-[var(--accent)] pl-4 text-lg leading-8 text-[color:var(--ink)]">
          <p>{block.text}</p>
          {block.cite && <p className="mt-2 text-sm text-[color:var(--muted)]">— {block.cite}</p>}
        </blockquote>
      );
  }
}

export default function PostBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-6">
      {blocks.map((block, i) => (
        <BlockView key={i} block={block} />
      ))}
    </div>
  );
}
