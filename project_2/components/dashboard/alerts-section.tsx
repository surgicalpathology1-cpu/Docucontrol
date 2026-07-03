'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, FileSignature, AlertTriangle, Clock, RefreshCw, CheckCircle2, FileText, PenLine } from 'lucide-react';
import type { Alert, Document } from '@/lib/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SignDocumentDialog } from './sign-document-dialog';
import { PdfViewerDialog } from './pdf-viewer-dialog';

interface AlertsSectionProps {
  alerts: Alert[];
  documents: Document[];
  onRefresh: () => void;
  compact?: boolean;
  onAlertsMoreClick?: () => void;
}

const alertConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  signature_required: {
    icon: FileSignature,
    color: 'text-accent',
    bg: 'bg-accent/10',
    label: 'Signature Required',
  },
  expiring: {
    icon: Clock,
    color: 'text-warning',
    bg: 'bg-warning/10',
    label: 'Expiring Soon',
  },
  expiring_soon: {
    icon: Clock,
    color: 'text-warning',
    bg: 'bg-warning/10',
    label: 'Expiring Soon',
  },
  expired: {
    icon: AlertTriangle,
    color: 'text-destructive',
    bg: 'bg-destructive/10',
    label: 'Expired',
  },
  review: {
    icon: RefreshCw,
    color: 'text-secondary',
    bg: 'bg-secondary/10',
    label: 'Up for Review',
  },
  review_due: {
    icon: RefreshCw,
    color: 'text-secondary',
    bg: 'bg-secondary/10',
    label: 'Up for Review',
  },
  new_version_published: {
    icon: Bell,
    color: 'text-primary',
    bg: 'bg-primary/10',
    label: 'New Version',
  },
};

export function AlertsSection({ alerts, documents, onRefresh, compact, onAlertsMoreClick }: AlertsSectionProps) {
  const { user } = useAuth();
  const [signingDoc, setSigningDoc] = useState<Document | null>(null);
  const [signOpen, setSignOpen] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<Document | null>(null);
  const [viewOpen, setViewOpen] = useState(false);

  const docMap = new Map(documents.map((d) => [d.id, d]));
  const visible = compact ? alerts.slice(0, 4) : alerts;

  const markRead = async (alertId: string) => {
    await supabase.from('alerts').update({ is_read: true }).eq('id', alertId);
    onRefresh();
  };

  const handleSignClick = (doc: Document) => {
    setSigningDoc(doc);
    setSignOpen(true);
  };

  const handleViewClick = (doc: Document) => {
    setViewingDoc(doc);
    setViewOpen(true);
  };

  const handleSigned = () => {
    onRefresh();
  };

  return (
    <section>
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5 text-accent" />
              Action Alerts
            </CardTitle>
            <CardDescription className="mt-1">
              Documents requiring your signature or attention.
            </CardDescription>
          </div>
          {alerts.length > 0 && (
            <Badge variant="secondary" className="bg-accent/10 text-accent">
              {alerts.filter((a) => !a.is_read).length} unread
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CheckCircle2 className="h-10 w-10 text-success" />
              <p className="mt-3 text-sm font-medium text-foreground">All clear</p>
              <p className="text-sm text-muted-foreground">No pending alerts. You&apos;re up to date.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visible.map((alert) => {
                const cfg = alertConfig[alert.type] ?? alertConfig['signature_required'];
                const Icon = cfg.icon;
                const doc = alert.document_id ? docMap.get(alert.document_id) : null;
                const isSigRequired = alert.type === 'signature_required' && doc;
                return (
                  <div
                    key={alert.id}
                    className={cn(
                      'flex items-center gap-4 rounded-lg border p-4 transition-colors',
                      alert.is_read ? 'border-border/40 bg-card' : 'border-accent/20 bg-accent/5',
                    )}
                  >
                    <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', cfg.bg)}>
                      <Icon className={cn('h-5 w-5', cfg.color)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {doc?.title ?? alert.message}
                        </p>
                        {!alert.is_read && (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {alert.message}
                        {doc && (
                          <span className="ml-1 text-xs">
                            · Version {doc.version}
                            {doc.expires_at && (
                              <> · Expires {new Date(doc.expires_at).toLocaleDateString()}</>
                            )}
                          </span>
                        )}
                      </p>
                      <span className={cn('mt-1 inline-block text-xs font-medium', cfg.color)}>
                        {cfg.label}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {isSigRequired && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewClick(doc!)}
                            className="border-border/60 text-foreground hover:bg-muted"
                          >
                            <FileText className="mr-1.5 h-3.5 w-3.5" />
                            View Document
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSignClick(doc!)}
                            className="bg-accent text-accent-foreground hover:bg-accent/90"
                          >
                            <PenLine className="mr-1.5 h-3.5 w-3.5" />
                            Sign
                          </Button>
                        </>
                      )}
                      {!alert.is_read && alert.type !== 'signature_required' && (
                        <Button size="sm" variant="outline" onClick={() => markRead(alert.id)}>
                          Dismiss
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              {compact && alerts.length > 4 && (
                <button
                  onClick={onAlertsMoreClick}
                  className="w-full pt-1 text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {alerts.length - 4} more alerts — see the Alerts tab
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <SignDocumentDialog
        document={signingDoc}
        open={signOpen}
        onOpenChange={setSignOpen}
        onSigned={handleSigned}
      />

      <PdfViewerDialog
        document={viewingDoc}
        open={viewOpen}
        onOpenChange={setViewOpen}
        signingMode={false}
      />
    </section>
  );
}
