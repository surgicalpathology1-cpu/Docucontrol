export type UserRole = 'admin' | 'signer' | 'viewer';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  department: string;
  created_at: string;
}

export type DocumentStatus = 'active' | 'expired' | 'under_review';

export interface Document {
  id: string;
  title: string;
  version: string;
  file_url: string;
  status: DocumentStatus;
  uploaded_at: string;
  expires_at: string | null;
  uploaded_by: string | null;
  created_at: string;
  storage_path?: string;
  category?: string;
}

export type SignatureStatus = 'pending' | 'signed' | 'rejected';

export interface Signature {
  id: string;
  document_id: string;
  user_id: string;
  signed_at: string | null;
  status: SignatureStatus;
  created_at: string;
}

export type AlertType = 'signature_required' | 'expiring' | 'expired' | 'review';

export interface Alert {
  id: string;
  document_id: string | null;
  user_id: string;
  type: AlertType;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface DocumentRequiredSigner {
  id: string;
  document_id: string;
  user_id: string;
  created_at: string;
}
