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
    setLoading(true);
    supabase.storage
      .from('Documents')
      .createSignedUrl(document.storage_path, 3600)
      .then(({ data, error }) => {
        if (error || !data) {
          setError('Could not load PDF. Please try again.');
        } else {
          setPdfUrl(data.signedUrl);
        }
        setLoading(false);
      });
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
