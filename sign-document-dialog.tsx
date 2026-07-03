'use client';

import { PdfViewerDialog } from '@/components/dashboard/pdf-viewer-dialog';
import type { Document } from '@/lib/types';

interface SignDocumentDialogProps {
  document: Document | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSigned: () => void;
}

export function SignDocumentDialog({ document, open, onOpenChange, onSigned }: SignDocumentDialogProps) {
  return (
    <PdfViewerDialog
      document={document}
      open={open}
      onOpenChange={onOpenChange}
      onSigned={onSigned}
      signingMode
    />
  );
}
