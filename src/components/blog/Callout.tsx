import type { ReactNode } from 'react';

type CalloutType = 'tip' | 'note' | 'warning' | 'info' | 'idea';

const CALLOUT_STYLES: Record<
  CalloutType,
  { label: string; icon: ReactNode; cls: string; accentCls: string; titleCls: string }
> = {
  tip: {
    label: "Conseil d'artisan",
    cls: 'bg-[#F5F1E8] border-l-2 border-bois-clair',
    accentCls: 'text-bois-fonce',
    titleCls: 'text-bois-fonce',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
  },
  note: {
    label: 'À retenir',
    cls: 'bg-noir/[0.03] border-l-2 border-noir/40',
    accentCls: 'text-noir/65',
    titleCls: 'text-noir',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  warning: {
    label: 'Attention',
    cls: 'bg-[#FDF6EC] border-l-2 border-[#C57B14]',
    accentCls: 'text-[#8B5A0F]',
    titleCls: 'text-[#8B5A0F]',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  info: {
    label: 'Bon à savoir',
    cls: 'bg-[#EDF2EE] border-l-2 border-vert-foret',
    accentCls: 'text-vert-foret',
    titleCls: 'text-vert-foret',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  idea: {
    label: 'Inspiration',
    cls: 'bg-[#FBF7F0] border-l-2 border-bois-clair',
    accentCls: 'text-bois-fonce',
    titleCls: 'text-bois-fonce',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
  },
};

interface Props {
  type: CalloutType;
  title?: string;
  children: ReactNode;
}

export function Callout({ type, title, children }: Props) {
  const style = CALLOUT_STYLES[type] || CALLOUT_STYLES.note;
  return (
    <div className={`my-8 md:my-10 px-5 md:px-7 py-5 md:py-6 ${style.cls} not-prose`}>
      <div className={`flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase font-medium mb-3 ${style.accentCls}`}>
        <span className={style.accentCls}>{style.icon}</span>
        <span>{title || style.label}</span>
      </div>
      <div className={`text-[1rem] md:text-[1.0625rem] leading-[1.65] ${style.titleCls.replace('text-', 'text-').replace('vert-foret', 'noir')} text-noir/85 font-light callout-body`}>
        {children}
      </div>
    </div>
  );
}

/**
 * Detects [!type] or [!type Title] at the very start of a blockquote's children
 * and returns parsed info or null if it's not a callout.
 */
export function parseCalloutPrefix(text: string): { type: CalloutType; title: string | null; rest: string } | null {
  const match = text.match(/^\s*\[!(tip|note|warning|info|idea)\](?:\s+(.+?))?\s*(?:\n|$)/i);
  if (!match) return null;
  const type = match[1].toLowerCase() as CalloutType;
  const title = match[2] ? match[2].trim() : null;
  const rest = text.slice(match[0].length);
  return { type, title, rest };
}
