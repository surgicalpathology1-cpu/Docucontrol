'use client';

import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, PenLine, RefreshCw, FileText } from 'lucide-react';
import type { Document, Signature } from '@/lib/types';
import { cn } from '@/lib/utils';
import type { DocFilter } from './dashboard-shell';

interface AdminStatsProps {
  documents: Document[];
  signatures: Signature[];
  onCardClick: (filter: DocFilter) => void;
}

export function AdminStats({ documents, signatures, onCardClick }: AdminStatsProps) {
  const expiredDocs = documents.filter((d) => d.status === 'expired').length;
  const pendingSigs = signatures.filter((s) => s.status === 'pending').length;
  const upForReview = documents.filter((d) => d.status === 'under_review').length;
  const totalDocs = documents.length;

  const cards = [
    {
      label: 'Expired Documents',
      value: expiredDocs,
      icon: AlertTriangle,
      accent: 'text-destructive',
      bg: 'bg-destructive/10',
      ring: 'ring-destructive/20',
      sub: 'Require immediate renewal',
      filter: 'expired' as DocFilter,
    },
    {
      label: 'Pending Signatures',
      value: pendingSigs,
      icon: PenLine,
      accent: 'text-accent',
      bg: 'bg-accent/10',
      ring: 'ring-accent/20',
      sub: 'Awaiting signer action',
      filter: 'pending_signature' as DocFilter,
    },
    {
      label: 'Up for Review',
      value: upForReview,
      icon: RefreshCw,
      accent: 'text-warning',
      bg: 'bg-warning/10',
      ring: 'ring-warning/20',
      sub: 'In review cycle',
      filter: 'under_review' as DocFilter,
    },
    {
      label: 'Total Documents',
      value: totalDocs,
      icon: FileText,
      accent: 'text-primary',
      bg: 'bg-primary/10',
      ring: 'ring-primary/20',
      sub: 'In the library',
      filter: 'all' as DocFilter,
    },
  ];

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
          Admin
        </span>
        <h2 className="text-sm font-semibold text-muted-foreground">Compliance Statistics</h2>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.label}
              onClick={() => onCardClick(card.filter)}
              className={cn(
                'relative overflow-hidden border-border/60 shadow-sm transition-all hover:shadow-md cursor-pointer hover:border-border/80'
              )}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                    <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                      {card.value}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{card.sub}</p>
                  </div>
                  <div
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-xl ring-1',
                      card.bg,
                      card.ring
                    )}
                  >
                    <Icon className={cn('h-6 w-6', card.accent)} />
                  </div>
                </div>
              </CardContent>
              <div className={cn('absolute bottom-0 left-0 h-1 w-full', card.bg)} />
            </Card>
          );
        })}
      </div>
    </section>
  );
}
