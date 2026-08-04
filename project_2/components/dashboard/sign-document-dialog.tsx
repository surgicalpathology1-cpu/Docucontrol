'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';
import type { Document } from '@/lib/types';
import { CheckCircle2, Loader2, ChevronDown, Eraser } from 'lucide-react';

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
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!open || !document) {
      setPdfUrl(null);
      setSigned(false);
      setScrolledToBottom(false);
      setShowSignaturePad(false);
      setHasSignature(false);
      setError(null);
      return;
    }
    if (!document.storage_path) {
      setError('No PDF file linked to this document yet.');
      return;
    }
    setLoading(true);
    const publicUrl = `https://upifirvxrusitxhpzwpy.supabase.co/storage/v1/object/public/Documents/${encodeURIComponent(document.storage_path).replace(/%2F/g, '/')}`;
    setPdfUrl(publicUrl);
    setLoading(false);
  }, [open, document]);

  // Initialize canvas when signature pad shows
  useEffect(() => {
    if (!showSignaturePad || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [showSignaturePad]);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    drawing.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    lastPos.current = getPos(e, canvas);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current || !canvasRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e, canvas);
    if (lastPos.current) {
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      setHasSignature(true);
    }
    lastPos.current = pos;
  };

  const stopDraw = () => {
    drawing.current = false;
    lastPos.current = null;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

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

        {/* Attestation + Signature Bar */}
        <div className="border-t px-6 py-4 bg-muted/30">
          {signed ? (
            <div className="flex items-center justify-center gap-2 text-green-600 py-2">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Document signed successfully!</span>
            </div>
          ) : !showSignaturePad ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <p className="text-xs text-muted-foreground flex-1">
                By clicking Sign, I attest that I have read, understood, and agree to abide by this policy.
              </p>
              <Button
                onClick={() => setShowSignaturePad(true)}
                disabled={!scrolledToBottom || !!error}
                className="shrink-0"
              >
                Sign Document
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-muted-foreground">
                By signing below, I attest that I have read, understood, and agree to abide by this policy.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                <div className="flex flex-col gap-1 flex-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground">Draw your signature:</label>
                    <button
                      onClick={clearSignature}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Eraser className="h-3 w-3" />
                      Clear
                    </button>
                  </div>
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={100}
                    className="border border-border rounded-md bg-white cursor-crosshair w-full touch-none"
                    style={{ maxWidth: '500px', height: '100px' }}
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={stopDraw}
                    onMouseLeave={stopDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={stopDraw}
                  />
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setShowSignaturePad(false); clearSignature(); }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSign}
                    disabled={!hasSignature || signing}
                  >
                    {signing ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</>
                    ) : (
                      'Submit Signature'
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
