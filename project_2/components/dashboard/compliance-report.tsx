'use client';

import { useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Printer, Download, ShieldCheck } from 'lucide-react';
import type { Document, Signature } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ComplianceReportProps {
  documents: Document[];
  signatures: Signature[];
}

const SIGNATURE_URL = 'https://upifirvxrusitxhpzwpy.supabase.co/storage/v1/object/public/Documents/08_Signatures/signature_compressed.png';

export function ComplianceReport({ documents, signatures }: ComplianceReportProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const generatedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const sigMap = useMemo(() => {
    const map: Record<string, Signature[]> = {};
    for (const sig of signatures) {
      if (!map[sig.document_id]) map[sig.document_id] = [];
      map[sig.document_id].push(sig);
    }
    return map;
  }, [signatures]);

  const totalSigned = documents.filter((d) => sigMap[d.id]?.length > 0).length;
  const totalUnsigned = documents.length - totalSigned;
  const complianceRate = documents.length > 0
    ? Math.round((totalSigned / documents.length) * 100)
    : 0;

  const handlePrint = () => window.print();

  const handleDownload = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !reportRef.current) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>DocuControl Compliance Report</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; margin: 40px; }
            h1 { font-size: 20px; font-weight: bold; }
            h2 { font-size: 14px; font-weight: bold; margin-top: 24px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th { background: #1e3a5f; color: white; padding: 8px; text-align: left; font-size: 11px; }
            td { padding: 7px 8px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
            tr:nth-child(even) { background: #f9fafb; }
            .signed { color: #16a34a; font-weight: bold; }
            .unsigned { color: #dc2626; font-weight: bold; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 2px solid #1e3a5f; padding-bottom: 16px; }
            .stats { display: flex; gap: 32px; margin: 16px 0; }
            .stat { text-align: center; }
            .stat-num { font-size: 28px; font-weight: bold; color: #1e3a5f; }
            .stat-label { font-size: 11px; color: #6b7280; }
            .sig-img { height: 40px; }
          </style>
        </head>
        <body>
          ${reportRef.current.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  return (
    <div className="space-y-6">
      {/* Action buttons */}
      <div className="flex gap-3 print:hidden">
        <Button onClick={handlePrint} variant="outline">
          <Printer className="mr-2 h-4 w-4" />
          Print Report
        </Button>
        <Button onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </Button>
      </div>

      {/* Report content */}
      <div ref={reportRef}>
        {/* Header */}
        <Card className="border-2 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <ShieldCheck className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">
                    Gastrointestinal Specialists Pathology Laboratory
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Document Control Compliance Report
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Medical Director: Dr. Osama Alassi, MD
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Generated</p>
                <p className="text-sm font-medium">{generatedDate}</p>
              </div>
            </div>

            {/* Summary stats */}
            <div className="mt-6 grid grid-cols-4 gap-4 rounded-lg bg-muted/40 p-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{documents.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Total Documents</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{totalSigned}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Signed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-500">{totalUnsigned}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Pending</p>
              </div>
              <div className="text-center">
                <p className={cn(
                  "text-2xl font-bold",
                  complianceRate >= 90 ? "text-green-600" : complianceRate >= 70 ? "text-yellow-600" : "text-red-500"
                )}>
                  {complianceRate}%
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Compliance Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Document table */}
        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-base">Document Signature Status</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-primary text-primary-foreground">
                    <th className="px-4 py-3 text-left font-semibold text-xs">#</th>
                    <th className="px-4 py-3 text-left font-semibold text-xs">Document Title</th>
                    <th className="px-4 py-3 text-left font-semibold text-xs">Category</th>
                    <th className="px-4 py-3 text-left font-semibold text-xs">Version</th>
                    <th className="px-4 py-3 text-left font-semibold text-xs">Next Review</th>
                    <th className="px-4 py-3 text-left font-semibold text-xs">Status</th>
                    <th className="px-4 py-3 text-left font-semibold text-xs">Signed By</th>
                    <th className="px-4 py-3 text-left font-semibold text-xs">Date Signed</th>
                    <th className="px-4 py-3 text-left font-semibold text-xs">Signature</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc, idx) => {
                    const docSigs = sigMap[doc.id] ?? [];
                    const isSigned = docSigs.length > 0;
                    const firstSig = docSigs[0];
                    return (
                      <tr key={doc.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-foreground max-w-[200px]">
                          <p className="truncate text-xs">{doc.title}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {doc.category ?? 'Uncategorized'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs font-mono">{doc.version}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {doc.expires_at
                            ? new Date(doc.expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {isSigned ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                              <CheckCircle2 className="h-3 w-3" /> Signed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500">
                              <XCircle className="h-3 w-3" /> Pending
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {firstSig ? 'Dr. Osama Alassi, MD' : '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {firstSig?.signed_at
                            ? new Date(firstSig.signed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                            : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {isSigned ? (
                            <img
                              src={SIGNATURE_URL}
                              alt="Signature"
                              style={{ height: '32px', width: 'auto' }}
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-4 rounded-lg border border-border p-4 text-center">
          <p className="text-xs text-muted-foreground">
            This report was generated by DocuControl — Document Control & Compliance System
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Gastrointestinal Specialists Pathology Laboratory · Medical Director: Dr. Osama Alassi, MD
          </p>
        </div>
      </div>
    </div>
  );
}
