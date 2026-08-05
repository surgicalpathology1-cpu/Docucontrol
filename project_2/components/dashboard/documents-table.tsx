'use client';

import { useState, useMemo, useRef } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { FileText, Search, PenLine, CheckCircle2, Clock, XCircle, Filter, X, Upload, Loader2 } from 'lucide-react';
import type { Document, Signature, DocumentRequiredSigner } from '@/lib/types';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase/client';
import { SignDocumentDialog } from '@/components/dashboard/sign-document-dialog';
import type { DocFilter } from './dashboard-shell';

const CATEGORIES = [
  '01_Standard_Operating_Procedures',
  '02_Quality_Control',
  '03_Safety_and_Compliance',
  '04_Equipment_and_Maintenance',
  '05_Administrative_and_HR',
  '06_Accreditation_and_Regulatory',
  '07_Forms_and_Logs',
  '08_Uncategorized',
];

const CATEGORY_LABELS: Record<string, string> = {
  '01_Standard_Operating_Procedures': 'Standard Operating Procedures',
  '02_Quality_Control': 'Quality Control',
  '03_Safety_and_Compliance': 'Safety and Compliance',
  '04_Equipment_and_Maintenance': 'Equipment and Maintenance',
  '05_Administrative_and_HR': 'Administrative and HR',
  '06_Accreditation_and_Regulatory': 'Accreditation and Regulatory',
  '07_Forms_and_Logs': 'Forms and Logs',
  '08_Uncategorized': 'Uncategorized',
};

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

function UploadDialog({ open, onOpenChange, onUploaded, userId }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUploaded: () => void;
  userId: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [version, setVersion] = useState('1');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setTitle('');
    setCategory(CATEGORIES[0]);
    setVersion('1');
    setError(null);
  };

  const handleUpload = async () => {
    if (!file || !title.trim()) {
      setError('Please select a file and enter a title.');
      return;
    }
    setUploading(true);
    setError(null);

    const storagePath = `${category}/${file.name}`;

    // Upload file to Supabase Storage
    const { error: storageError } = await supabase.storage
      .from('Documents')
      .upload(storagePath, file, { upsert: true });

    if (storageError) {
      setError(`Upload failed: ${storageError.message}`);
      setUploading(false);
      return;
    }

    // Insert document record
    const nextReview = new Date();
    nextReview.setFullYear(nextReview.getFullYear() + 1);

    const { error: dbError } = await supabase.from('documents').insert({
      title: title.trim(),
      storage_path: storagePath,
      version: parseInt(version) || 1,
      status: 'active',
      uploaded_by: userId,
      next_review_date: nextReview.toISOString().split('T')[0],
    });

    if (dbError) {
      setError(`Database error: ${dbError.message}`);
      setUploading(false);
      return;
    }

  // Send email notification
    try {
      await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'signature_required', documentTitle: title.trim() }),
      });
    } catch {}

    setUploading(false);
    reset();
    onOpenChange(false);
    onUploaded();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* File picker */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">PDF File</label>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
            >
              {file ? (
                <p className="text-sm font-medium text-primary">{file.name}</p>
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Click to select a PDF file</p>
                </>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {/* Title */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Document Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sample Handling Procedure"
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </div>

          {/* Version */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Version</label>
            <Input
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="1"
              type="number"
              min="1"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={uploading}>
            {uploading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading...</>
            ) : (
              <><Upload className="mr-2 h-4 w-4" />Upload</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DocumentsTable({ documents, mySignatures, requiredSigners, onRefresh, compact, filter = 'all', onClearFilter }: DocumentsTableProps) {
  const { profile, user } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [search, setSearch] = useState('');
  const [signDoc, setSignDoc] = useState<Document | null>(null);
  const [signOpen, setSignOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const filtered = useMemo(() => {
    let result = documents;
    if (filter === 'expired') {
      result = result.filter((d) => d.status === 'expired');
    } else if (filter === 'under_review') {
      result = result.filter((d) => d.status === 'under_review');
    } else if (filter === 'pending_signature') {
      const pendingDocIds = new Set(
        requiredSigners
          .filter((r) => !mySignatures.some((s) => s.document_id === r.document_id))
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
                  <Button variant="outline" size="sm" onClick={onClearFilter} className="h-9 shrink-0">
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
                {isAdmin && (
                  <Button size="sm" onClick={() => setUploadOpen(true)} className="shrink-0">
                    <Upload className="mr-1.5 h-4 w-4" />
                    Upload
                  </Button>
                )}
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
                    const sig = sigStatus(doc, mySignatures, requiredSigners) ?? { label: 'Not required', className: 'bg-muted text-muted-foreground', icon: FileText };
                    const SigIcon = sig.icon;
                    const canSign = sig.label === 'Pending your signature';
                    return (
                      <TableRow key={doc.id} className="group">
                       <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-3">
                          <div 
                           className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/5 text-primary cursor-pointer hover:bg-primary/20 transition-colors"
                           onClick={() => { setSignDoc(doc); setSignOpen(true); }}
                           title="View document"
                         >
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
                              onClick={() => { setSignDoc(doc); setSignOpen(true); }}
                              className="border-accent/30 text-accent hover:bg-accent hover:text-accent-foreground"
                            >
                              <PenLine className="mr-1.5 h-3.5 w-3.5" />
                              Sign Now
                            </Button>
                        ) : sig.label === 'Signed' ? (
  <div className="flex items-center justify-end gap-2">
    <span className="inline-flex items-center gap-1 text-xs text-success font-medium">
      <CheckCircle2 className="h-3 w-3" />
      Signed
    </span>
    <Button
      size="sm"
      variant="ghost"
      onClick={() => { setSignDoc(doc); setSignOpen(true); }}
      className="text-xs h-7 px-2"
    >
      View
    </Button>
  </div>
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

      {user && (
        <UploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          onUploaded={onRefresh}
          userId={user.id}
        />
      )}
    </section>
  );
}
