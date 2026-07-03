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

const STORAGE_FOLDERS = [
  '01_Standard_Operating_Procedures',
  '02_Quality_Control',
  '03_Safety_and_Compliance',
  '04_Equipment_and_Maintenance',
  '05_Administrative_and_HR',
  '06_Accreditation_and_Regulatory',
  '07_Forms_and_Logs',
  '08_Uncategorized',
];

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

function fileStatus(filename: string): Document['status'] {
  const lower = filename.toLowerCase();
  if (lower.includes('expired') || lower.includes('deprecated')) return 'expired';
  if (lower.includes('review') || lower.includes('draft')) return 'under_review';
  return 'active';
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

    // Fetch documents from the database table
    const { data: dbDocs } = await supabase
      .from('documents')
      .select('*')
      .order('uploaded_at', { ascending: false });
console.log('Documents fetched:', dbDocs, 'User:', user?.id);
    const docs: Document[] = (dbDocs ?? []).map((d) => ({
      id: d.id,
      title: d.title,
      version: d.version,
      file_url: d.file_url ?? '',
      status: d.status,
      uploaded_at: d.uploaded_at,
      expires_at: d.expires_at,
      uploaded_by: d.uploaded_by,
      created_at: d.created_at,
      storage_path: d.storage_path ?? undefined,
      category: d.category ?? undefined,
    }));

    // Also load any files from storage folders that aren't in the DB
    const folderPromises = STORAGE_FOLDERS.map((folder) =>
      supabase.storage.from('Documents').list(folder, { limit: 500 })
    );

    const folderResults = await Promise.all(folderPromises);

    const existingPaths = new Set(docs.map((d) => d.storage_path));

    for (let i = 0; i < folderResults.length; i++) {
      const folder = STORAGE_FOLDERS[i];
      const result = folderResults[i];
      const files = (result.data ?? []).filter(
        (f) => f.name && !f.name.startsWith('.') && f.name.toLowerCase().endsWith('.pdf')
      );

      for (const file of files) {
        const storagePath = `${folder}/${file.name}`;
        if (existingPaths.has(storagePath)) continue;

        docs.push({
          id: storagePath,
          title: file.name.replace(/\.pdf$/i, ''),
          version: 'v1.0',
          file_url: '',
          status: fileStatus(file.name),
          uploaded_at: file.created_at ?? new Date().toISOString(),
          expires_at: null,
          uploaded_by: null,
          created_at: file.created_at ?? new Date().toISOString(),
          storage_path: storagePath,
          category: extractCategory(folder),
        });
      }
    }

    // Sort documents by upload date
    docs.sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());

    // Fetch signatures and alerts from database
    const [sigsRes, alertsRes, allSigsRes] = await Promise.all([
      supabase.from('signatures').select('*').eq('user_id', user.id),
      supabase.from('alerts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      isAdmin ? supabase.from('signatures').select('*') : null,
    ]);

    const mySigs = sigsRes.data ?? [];
    const sigDocIds = new Set(mySigs.map((s) => s.document_id));

    // Create required signers list - documents that haven't been signed yet
    const requiredSignersList: DocumentRequiredSigner[] = docs
      .filter((doc) => !sigDocIds.has(doc.id))
      .map((doc) => ({
        id: crypto.randomUUID(),
        document_id: doc.id,
        user_id: user.id,
        created_at: new Date().toISOString(),
      }));

    // Create alerts for documents that need signatures
    const existingAlertDocIds = new Set((alertsRes.data ?? []).map((a) => a.document_id));
    const newAlerts = docs
      .filter((doc) => !sigDocIds.has(doc.id) && !existingAlertDocIds.has(doc.id))
      .map((doc) => ({
        document_id: doc.id,
        user_id: user.id,
        type: 'signature_required' as const,
        message: `Your signature is required on "${doc.title}" (Version ${doc.version}).`,
      }));

    if (newAlerts.length > 0) {
      try {
        await supabase.from('alerts').insert(newAlerts);
      } catch {
        // Ignore errors - alerts may already exist
      }
    }

    // Refetch alerts after inserting
    const { data: updatedAlerts } = await supabase
      .from('alerts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setDocuments(docs);
    setMySignatures(mySigs);
    setMyAlerts(updatedAlerts ?? alertsRes.data ?? []);
    setRequiredSigners(requiredSignersList);
    if (allSigsRes) setAllSignatures(allSigsRes.data ?? []);
    setLoading(false);
  }, [user, profile]);

  useEffect(() => {
    load();
  }, [load]);

  return { documents, mySignatures, allSignatures, myAlerts, requiredSigners, loading, refresh: load };
}
