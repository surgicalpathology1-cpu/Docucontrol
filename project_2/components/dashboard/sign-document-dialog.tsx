'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';
import type { Document } from '@/lib/types';
import { CheckCircle2, Loader2, ChevronDown } from 'lucide-react';

interface SignDocumentDialogProps {
  document: Document | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSigned: () => void;
}

export function SignDocumentDialog({ document, open, onOpenChange, onSigned }: SignDocumentDialogProps) {
  const { user } = useAuth();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !document) {
      setPdfUrl(null);
      setSigned(false);
      setScrolledToBottom(false);
      setError(null);
      return;
    }
    if (!document.storage_path) {
      setError('No PDF file linked to this document yet.');
      return;
    }
    const publicUrl = `https://upifirvxrusitxhpzwpy.supabase.co/storage/v1/object/public/Documents/${encodeURIComponent(document.storage_path).replace(/%2F/g, '/')}`;
    setPdfUrl(publicUrl);
    setLoading(false);
  }, [open, document]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    if (atBottom) setScrolledToBottom(true);
  };

  const handleSign = async () => {
    if (!user || !document) return;
    setSigning(true);
    const { error } = await supabase.from('signatures').insert({
      document_id: document.id,
      user_id: user.id,
      document_version: Number(document.version) || 1,
    });
    setSigning(false);
    if (error) {
      setError('Failed to sign. You may have already signed this document.');
    } else {
      setSigned(true);
      setTimeout(() => {
        onOpenChange(false);
        onSigned();
      }, 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-lg">{document?.title}</DialogTitle>
        </DialogHeader>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto relative"
        >
          {loading && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading PDF...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full text-center px-8">
              <p className="text-muted-foreground">{error}</p>
            </div>
          )}

          {pdfUrl && !loading && (
            <iframe
              src={pdfUrl}
              className="w-full"
              style={{ height: '150%', minHeight: '800px' }}
              title={document?.title ?? 'Document'}
            />
          )}

          {!scrolledToBottom && pdfUrl && (
            <div className="sticky bottom-4 flex justify-center pointer-events-none">
              <div className="bg-primary/90 text-primary-foreground text-xs px-3 py-1.5 rounded-full flex items-center gap-1 shadow-lg">
                <ChevronDown className="h-3 w-3 animate-bounce" />
                Scroll to bottom to enable signing
              </div>
            </div>
          )}
        </div>

        <div className="border-t px-6 py-4 bg-muted/30">
          {signed ? (
            <div className="flex items-center justify-center gap-2 text-green-600 py-2">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Document signed successfully!</span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <p className="text-xs text-muted-foreground flex-1">
                By clicking Sign, I attest that I have read, understood, and agree to abide by this policy.
              </p>
              <Button
                onClick={handleSign}
                disabled={!scrolledToBottom || signing || !!error}
                className="shrink-0"
              >
                {signing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing...
                  </>
                ) : (
                  'Sign Document'
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
