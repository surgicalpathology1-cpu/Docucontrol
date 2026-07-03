'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';
import type { Document, Signature, Alert, DocumentRequiredSigner } from '@/lib/types';

interface DashboardData {
  documents: Document[];
  mySignatures: Signature[];
  allSignatures: Signature[];
  myAlerts: Alert[];
  requiredSigners: DocumentRequiredSigner[];
  loading: boolean;
  refresh: () => void;
}

const CATEGORY_MAP: Record<string, string> = {
  '01_Standard_Operating_Procedures': 'Standard Operating Procedures',
  '02_Quality_Control': 'Quality Control',
  '03_Safety_and_Compliance': 'Safety and Compliance',
  '04_Equipment_and_Maintenance': 'Equipment and Maintenance',
  '05_Administrative_and_HR': 'Administrative and HR',
  '06_Accreditation_and_Regulatory': 'Accreditation and Regulatory',
  '07_Forms_and_Logs': 'Forms and Logs',
  '08_Uncategorized': 'Uncategorized',
};

function extractCategory(folder: string): string {
  return CATEGORY_MAP[folder] || folder.replace(/^\d+_/, '').replace(/_/g, ' ');
}

export function useDashboardData(): DashboardData {
  const { user, profile } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [mySignatures, setMySignatures] = useState<Signature[]>([]);
  const [allSignatures, setAllSignatures] = useState<Signature[]>([]);
  const [myAlerts, setMyAlerts] = useState<Alert[]>([]);
  const [requiredSigners, setRequiredSigners] = useState<DocumentRequiredSigner[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const isAdmin = profile?.role === 'admin';

    try {
      const { data: dbDocs } = await supabase
        .from('documents')
        .select('*')
        .order('upload_date', { ascending: false });

      const docs: Document[] = (dbDocs ?? []).map((d) => ({
        id: d.id,
        title: d.title,
        version: String(d.version ?? 1),
        file_url: d.file_url ?? '',
        status: d.status ?? 'active',
        uploaded_at: d.upload_date ?? d.created_at ?? new Date().toISOString(),
        expires_at: d.next_review_date ?? null,
        uploaded_by: d.uploaded_by ?? null,
        created_at: d.upload_date ?? new Date().toISOString(),
        storage_path: d.storage_path ?? undefined,
        category: d.storage_path
          ? extractCategory(d.storage_path.split('/')[0])
          : undefined,
      }));

      setDocuments(docs);

      const [sigsRes, alertsRes, allSigsRes] = await Promise.all([
        supabase.from('signatures').select('*').eq('user_id', user.id),
        supabase.from('alerts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        isAdmin ? supabase.from('signatures').select('*') : null,
      ]);

      const mySigs = sigsRes.data ?? [];
      const sigDocIds = new Set(mySigs.map((s) => s.document_id));

      const requiredSignersList: DocumentRequiredSigner[] = docs
        .filter((doc) => !sigDocIds.has(doc.id))
        .map((doc) => ({
          id: crypto.randomUUID(),
          document_id: doc.id,
          user_id: user.id,
          created_at: new Date().toISOString(),
        }));

      try {
        const existingAlertDocIds = new Set((alertsRes.data ?? []).map((a) => a.document_id));
        const newAlerts = docs
          .filter((doc) => !sigDocIds.has(doc.id) && !existingAlertDocIds.has(doc.id))
          .map((doc) => ({
            document_id: doc.id,
            user_id: user.id,
            alert_type: 'signature_required',
            status: 'pending',
            scheduled_for: new Date().toISOString(),
            message: `Your signature is required on "${doc.title}" (Version ${doc.version}).`,
          }));

        if (newAlerts.length > 0) {
          await supabase.from('alerts').insert(newAlerts);
        }
      } catch {
        // Ignore alert errors
      }

      const { data: updatedAlerts } = await supabase
        .from('alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setMySignatures(mySigs);
      setMyAlerts(updatedAlerts ?? alertsRes.data ?? []);
      setRequiredSigners(requiredSignersList);
      if (allSigsRes) setAllSignatures(allSigsRes.data ?? []);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, profile]);

  useEffect(() => {
    load();
  }, [load]);

  return { documents, mySignatures, allSignatures, myAlerts, requiredSigners, loading, refresh: load };
}
