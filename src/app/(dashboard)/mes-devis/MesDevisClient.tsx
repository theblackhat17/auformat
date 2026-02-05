'use client';

import { useState, useEffect } from 'react';
import type { Quote } from '@/lib/types';
import { QUOTE_STATUS_LABELS, QUOTE_STATUS_COLORS } from '@/lib/constants';
import { formatDate, formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';

export function MesDevisClient() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/quotes').then((r) => r.json()).then(setQuotes).finally(() => setLoading(false));
  }, []);

  async function handleAccept(id: string) {
    if (!confirm('Accepter ce devis ?')) return;
    const res = await fetch(`/api/quotes/${id}/accept`, { method: 'POST' });
    if (res.ok) {
      const updated = await res.json();
      setQuotes((prev) => prev.map((q) => q.id === id ? updated : q));
    }
  }

  async function handleRefuse(id: string) {
    const reason = prompt('Raison du refus (optionnel) :');
    if (reason === null) return;
    const res = await fetch(`/api/quotes/${id}/refuse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (res.ok) {
      const updated = await res.json();
      setQuotes((prev) => prev.map((q) => q.id === id ? updated : q));
    }
  }

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-vert-foret border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-noir">Mes devis</h1>
        <p className="text-sm text-noir/50 mt-1">{quotes.length} devis</p>
      </div>

      {quotes.length === 0 ? (
        <EmptyState icon="📄" title="Aucun devis" description="Vos devis apparaîtront ici une fois que notre équipe les aura préparés." />
      ) : (
        <div className="space-y-4">
          {quotes.map((quote) => (
            <Card key={quote.id} className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-sm font-mono text-noir/40">{quote.quoteNumber}</span>
                  <Badge variant={QUOTE_STATUS_COLORS[quote.status]}>{QUOTE_STATUS_LABELS[quote.status]}</Badge>
                </div>
                <h3 className="text-lg font-semibold text-noir truncate">{quote.title}</h3>
                {quote.description && <p className="text-sm text-noir/50 mt-1 line-clamp-1">{quote.description}</p>}
                <div className="flex gap-4 mt-2 text-xs text-noir/40">
                  <span>Créé le {formatDate(quote.createdAt)}</span>
                  {quote.validUntil && <span>Valable jusqu&apos;au {formatDate(quote.validUntil)}</span>}
                </div>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <p className="text-xl font-bold text-vert-foret">{formatPrice(quote.totalTtc)}</p>
                <div className="flex gap-2">
                  {quote.pdfUrl && (
                    <a href={quote.pdfUrl} target="_blank" rel="noopener">
                      <Button variant="outline" size="sm">PDF</Button>
                    </a>
                  )}
                  {(quote.status === 'sent' || quote.status === 'viewed') && (
                    <>
                      <Button size="sm" onClick={() => handleAccept(quote.id)}>Accepter</Button>
                      <Button variant="ghost" size="sm" onClick={() => handleRefuse(quote.id)} className="text-red-500">Refuser</Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
