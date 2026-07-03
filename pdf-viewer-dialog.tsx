'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Loader2, ShieldCheck, AlertCircle, X, ChevronDown } from 'lucide-react';
import { SignaturePad } from '@/components/ui/signature-pad';
import type { Document } from '@/lib/types';
import { toast } from 'sonner';

interface PdfViewerDialogProps {
  document: Document | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSigned?: () => void;
  /** If true, show the attestation bar + Sign button. If false, view-only mode. */
  signingMode?: boolean;
}

export function PdfViewerDialog({
  document: doc,
  open,
  onOpenChange,
  onSigned,
  signingMode = true,
}: PdfViewerDialogProps) {
  const { user } = useAuth();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Reset state when document changes or dialog opens/closes
  useEffect(() => {
    if (open) {
      setHasScrolledToBottom(false);
      setShowSignaturePad(false);
      setSignature(null);
      setError(null);
    } else {
      setSignedUrl(null);
      setLoading(true);
    }
  }, [open, doc?.id]);

  // Load signed URL when dialog opens
  useEffect(() => {
    if (!open || !doc) return;
    let cancelled = false;

    async function loadPdf() {
      if (!doc?.storage_path) {
        setError('Document not available in storage.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      const { data, error: urlError } = await supabase.storage
        .from('Documents')
        .createSignedUrl(doc.storage_path, 3600);
      if (cancelled) return;
      if (urlError || !data?.signedUrl) {
        setError('Failed to load document.');
        setLoading(false);
        return;
      }
      setSignedUrl(data.signedUrl);
      setLoading(false);
    }
    loadPdf();

    return () => {
      cancelled = true;
    };
  }, [open, doc?.storage_path]);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    // Consider "scrolled to bottom" when within 30px of the bottom
    if (scrollHeight - scrollTop - clientHeight < 30) {
      setHasScrolledToBottom(true);
    }
  }, []);

  const handleSubmit = async () => {
    if (!user || !doc) return;
    if (!signature) {
      toast.error('Please draw your signature before signing.');
      return;
    }
    setSubmitting(true);

    const existing = await supabase
      .from('signatures')
      .select('id')
      .eq('document_id', doc.id)
      .eq('user_id', user.id)
      .maybeSingle();

    const signatureData = {
      status: 'signed',
      signed_at: new Date().toISOString(),
      signature_image: signature,
    };

    let savedSignatureId: string | null = null;
    let wasUpdate = false;

    if (existing.data) {
      wasUpdate = true;
      savedSignatureId = existing.data.id;
      await supabase
        .from('signatures')
        .update(signatureData)
        .eq('id', existing.data.id);
    } else {
      const { data: inserted } = await supabase.from('signatures').insert({
        document_id: doc.id,
        user_id: user.id,
        ...signatureData,
      }).select('id').maybeSingle();
      if (inserted) savedSignatureId = inserted.id;
    }

    setSubmitting(false);
    onOpenChange(false);

    // Show persistent undo toast
    const toastId = toast.success('Document signed successfully! Click here to undo', {
      duration: Infinity,
      position: 'top-right',
      action: {
        label: 'Undo',
        onClick: async () => {
          if (wasUpdate && savedSignatureId) {
            await supabase
              .from('signatures')
              .update({ status: 'pending', signed_at: null, signature_image: null })
              .eq('id', savedSignatureId);
          } else if (savedSignatureId) {
            await supabase.from('signatures').delete().eq('id', savedSignatureId);
          }
          toast.dismiss(toastId);
          toast.success('Signature undone');
          onSigned?.();
        },
      },
      cancel: {
        label: 'x',
        onClick: () => {
          toast.dismiss(toastId);
        },
      },
      onDismiss: () => {},
    });

    onSigned?.();
  };

  if (!doc) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[95vw] w-[95vw] h-[95vh] max-h-[95vh] p-0 gap-0 overflow-hidden flex flex-col [&>button]:hidden"
      >
        <DialogTitle className="sr-only">{doc.title}</DialogTitle>

        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border/60 shrink-0 bg-card">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="h-5 w-5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{doc.title}</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs">{doc.version}</Badge>
                {doc.category && (
                  <span className="text-xs text-muted-foreground truncate">{doc.category}</span>
                )}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="shrink-0 h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* PDF content area */}
        <div className="flex-1 overflow-hidden bg-muted/30 relative">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          {error && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <AlertCircle className="h-10 w-10 text-destructive/60" />
              <p className="mt-3 text-sm text-muted-foreground">{error}</p>
            </div>
          )}
          {signedUrl && !loading && !error && (
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="h-full overflow-y-auto"
            >
              <iframe
                src={signedUrl}
                title={doc.title}
                className="w-full h-full border-0 min-h-full"
              />
            </div>
          )}
        </div>

        {/* Fixed attestation bar at bottom */}
        {signingMode && (
          <div className="shrink-0 border-t border-border/60 bg-card">
            {!hasScrolledToBottom ? (
              <div className="flex items-center justify-center gap-2 px-6 py-3 text-sm text-muted-foreground animate-pulse">
                <ChevronDown className="h-4 w-4 animate-bounce" />
                Scroll to the bottom of the document to enable signing
              </div>
            ) : (
              <div className="px-6 py-4 space-y-3 animate-fade-in">
                {!showSignaturePad ? (
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm leading-relaxed text-foreground flex-1">
                      By clicking <strong>Sign</strong>, I attest that I have read, understood,
                      and agree to abide by this policy.
                    </p>
                    <Button
                      onClick={() => setShowSignaturePad(true)}
                      className="bg-accent text-accent-foreground hover:bg-accent/90 shrink-0"
                    >
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Sign
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm leading-relaxed text-foreground flex-1">
                        By clicking <strong>Sign</strong>, I attest that I have read, understood,
                        and agree to abide by this policy.
                      </p>
                    </div>
                    <SignaturePad onChange={setSignature} disabled={submitting} />
                    <div className="flex items-center gap-3">
                      <Button
                        onClick={handleSubmit}
                        disabled={submitting || !signature}
                        className="bg-accent text-accent-foreground hover:bg-accent/90"
                      >
                        {submitting ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <ShieldCheck className="mr-2 h-4 w-4" />
                        )}
                        Sign Document
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowSignaturePad(false);
                          setSignature(null);
                        }}
                        disabled={submitting}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
