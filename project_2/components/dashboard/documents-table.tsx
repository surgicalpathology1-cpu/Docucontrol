'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FileText, Search, PenLine, CheckCircle2, Clock, XCircle, Filter, X } from 'lucide-react';
import type { Document, Signature, DocumentRequiredSigner } from '@/lib/types';
import { cn } from '@/lib/utils';
import { SignDocumentDialog } from '@/components/dashboard/sign-document-dialog';
import type { DocFilter } from './dashboard-shell';

interface DocumentsTableProps {
  documents: Document[];
  mySignatures: Signature[];
  requiredSigners: DocumentRequiredSigner[];
  onRefresh: () => void;
  compact?: boolean;
  filter?: DocFilter;
  onClearFilter?: () => void;
}

function statusBadge(status: Document['status']) {
const map: Record<string, { label: string; className: string; icon: any }> = {
    active: { label: 'Active', className: 'bg-success/10 text-success', icon: CheckCircle2 },
    expired: { label: 'Expired', className: 'bg-destructive/10 text-destructive', icon: XCircle },
    under_review: { label: 'Under Review', className: 'bg-warning/10 text-warning', icon: Clock },
    draft: { label: 'Draft', className: 'bg-muted/10 text-muted-foreground', icon: Clock },
    archived: { label: 'Archived', className: 'bg-muted/10 text-muted-foreground', icon: Clock },
  };
  const cfg = map[status] ?? map['active'];
  const Icon = cfg.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', cfg.className)}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function sigStatus(doc: Document, sigs: Signature[], required: DocumentRequiredSigner[]) {
  const isRequired = required.some((r) => r.document_id === doc.id);
  const mySig = sigs.find((s) => s.document_id === doc.id);
  if (mySig) {
    return { label: 'Signed', className: 'bg-success/10 text-success', icon: CheckCircle2 };
  }
  if (isRequired) {
    return { label: 'Pending your signature', className: 'bg-accent/10 text-accent', icon: PenLine };
  }
  return { label: 'Not required', className: 'bg-muted text-muted-foreground', icon: FileText };
}
const filterLabels: Record<DocFilter, string> = {
  all: 'All Documents',
  expired: 'Expired Documents',
  pending_signature: 'Pending Signatures',
  under_review: 'Under Review',
};

export function DocumentsTable({ documents, mySignatures, requiredSigners, onRefresh, compact, filter = 'all', onClearFilter }: DocumentsTableProps) {
  const [search, setSearch] = useState('');
  const [signDoc, setSignDoc] = useState<Document | null>(null);
  const [signOpen, setSignOpen] = useState(false);

  const filtered = useMemo(() => {
    let result = documents;
    if (filter === 'expired') {
      result = result.filter((d) => d.status === 'expired');
    } else if (filter === 'under_review') {
      result = result.filter((d) => d.status === 'under_review');
    } else if (filter === 'pending_signature') {
      const pendingDocIds = new Set(
        requiredSigners
          .filter((r) => !mySignatures.some((s) => s.document_id === r.document_id && s.status === 'signed'))
          .map((r) => r.document_id)
      );
      result = result.filter((d) => pendingDocIds.has(d.id));
    }

    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (d) => d.title.toLowerCase().includes(q) || d.version.toLowerCase().includes(q)
      );
    }
    return result;
  }, [documents, filter, search, requiredSigners, mySignatures]);

  const visible = compact ? filtered.slice(0, 6) : filtered;

  return (
    <section>
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-primary" />
                Document Library
              </CardTitle>
              <CardDescription className="mt-1">
                Controlled documents with version, upload date, and signature status.
              </CardDescription>
            </div>
            {!compact && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {filter !== 'all' && onClearFilter && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onClearFilter}
                    className="h-9 shrink-0"
                  >
                    <Filter className="mr-1.5 h-3.5 w-3.5" />
                    {filterLabels[filter]}
                    <X className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                )}
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search documents…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm text-muted-foreground">
                {search ? 'No documents match your search.' : filter !== 'all' ? `No ${filterLabels[filter].toLowerCase()} found.` : 'No documents uploaded yet.'}
              </p>
              {filter !== 'all' && onClearFilter && (
                <Button variant="link" size="sm" onClick={onClearFilter} className="mt-2">
                  Clear filter
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="font-semibold text-foreground">Title</TableHead>
                    <TableHead className="font-semibold text-foreground">Category</TableHead>
                    <TableHead className="font-semibold text-foreground">Version</TableHead>
                    <TableHead className="font-semibold text-foreground">Upload Date</TableHead>
                    <TableHead className="font-semibold text-foreground">Status</TableHead>
                    <TableHead className="font-semibold text-foreground">Signature</TableHead>
                    <TableHead className="text-right font-semibold text-foreground">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((doc) => {
                    const sig = sigStatus(doc, mySignatures, requiredSigners);
                    const SigIcon = sig.icon;
                    const canSign = sig.label === 'Pending your signature';
                    return (
                      <TableRow key={doc.id} className="group">
                        <TableCell className="font-medium text-foreground">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/5 text-primary">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate">{doc.title}</p>
                              {doc.expires_at && (
                                <p className="text-xs text-muted-foreground">
                                  Expires {new Date(doc.expires_at).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {doc.category || 'Uncategorized'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {doc.version}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(doc.uploaded_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </TableCell>
                        <TableCell>{statusBadge(doc.status)}</TableCell>
                        <TableCell>
                          <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', sig.className)}>
                            <SigIcon className="h-3 w-3" />
                            {sig.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {canSign ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSignDoc(doc);
                                setSignOpen(true);
                              }}
                              className="border-accent/30 text-accent hover:bg-accent hover:text-accent-foreground"
                            >
                              <PenLine className="mr-1.5 h-3.5 w-3.5" />
                              Sign Now
                            </Button>
                          ) : sig.label === 'Signed' ? (
                            <span className="text-xs text-muted-foreground">Completed</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          {compact && documents.length > 6 && (
            <p className="pt-3 text-center text-xs text-muted-foreground">
              {documents.length - 6} more documents — see the Documents tab
            </p>
          )}
        </CardContent>
      </Card>

      <SignDocumentDialog
        document={signDoc}
        open={signOpen}
        onOpenChange={setSignOpen}
        onSigned={onRefresh}
      />
    </section>
  );
}
