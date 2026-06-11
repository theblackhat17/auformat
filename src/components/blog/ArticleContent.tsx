import { Children, isValidElement, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Callout, parseCalloutPrefix } from './Callout';

function CalloutAwareBlockquote({ children }: { children?: ReactNode }) {
  const kids = Children.toArray(children).filter(
    (c) => !(typeof c === 'string' && /^\s*$/.test(c)),
  );
  if (kids.length === 0) return <blockquote>{children}</blockquote>;

  const first = kids[0];
  if (!isValidElement(first)) return <blockquote>{children}</blockquote>;

  const firstChildren = Children.toArray(
    (first.props as { children?: ReactNode }).children,
  );
  const firstText =
    firstChildren.length > 0 && typeof firstChildren[0] === 'string'
      ? firstChildren[0]
      : '';

  const parsed = parseCalloutPrefix(firstText);
  if (!parsed) return <blockquote>{children}</blockquote>;

  const remainingFirstChildren: ReactNode[] = [];
  const rest = parsed.rest.replace(/^\n+/, '');
  if (rest) remainingFirstChildren.push(rest);
  remainingFirstChildren.push(...firstChildren.slice(1));

  const restKids = kids.slice(1);
  const content: ReactNode[] = [];
  if (remainingFirstChildren.length > 0) {
    content.push(<p key="callout-first">{remainingFirstChildren}</p>);
  }
  content.push(...restKids);

  return (
    <Callout type={parsed.type} title={parsed.title || undefined}>
      {content}
    </Callout>
  );
}

interface Props {
  content: string;
}

export function ArticleContent({ content }: Props) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        blockquote: CalloutAwareBlockquote,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
