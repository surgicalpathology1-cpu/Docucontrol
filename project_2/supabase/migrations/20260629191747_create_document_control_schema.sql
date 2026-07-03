/*
# Document Control and Compliance Schema

## Overview
MediaLab-style document control system for managing scanned PDF documents with
mandatory user signatures and expiration tracking. Multi-user app with Supabase
Auth (email/password); all tables use authenticated-scoped RLS.

## New Tables
- profiles: id (uuid PK -> auth.users), full_name, role (admin|signer|viewer), department, created_at
- documents: id, title, version, file_url, status (active|expired|under_review), uploaded_at, expires_at, uploaded_by, created_at
- signatures: id, document_id, user_id, signed_at, status (pending|signed|rejected), created_at
- alerts: id, document_id, user_id, type, message, is_read, created_at
- document_required_signers: id, document_id, user_id, created_at

## Security (RLS)
- All tables RLS enabled.
- profiles: read/update own; admins read all.
- documents: all authenticated read (shared library); admins insert/update/delete.
- signatures: read own or admin; insert/update own; admin delete.
- alerts: read own or admin; admin insert; update own or admin; admin delete.
- document_required_signers: read own or admin; admin insert/delete.

## Notes
1. is_admin() is SECURITY DEFINER to avoid RLS recursion on profiles.
2. Owner columns default to auth.uid().
3. Tables created first, then is_admin() function, then all policies.
*/

-- ============ TABLES (created first) ============
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin','signer','viewer')),
  department text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  version text NOT NULL DEFAULT 'v1.0',
  file_url text DEFAULT '',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','expired','under_review')),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  uploaded_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  signed_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','signed','rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  type text NOT NULL CHECK (type IN ('signature_required','expiring','expired','review')),
  message text NOT NULL DEFAULT '',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.document_required_signers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============ HELPER FUNCTION (after tables exist) ============
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  );
$$;

-- ============ RLS ENABLE ============
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_required_signers ENABLE ROW LEVEL SECURITY;

-- ============ POLICIES ============
-- profiles
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
CREATE POLICY "profiles_insert_self"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- documents
DROP POLICY IF EXISTS "documents_select_all" ON public.documents;
CREATE POLICY "documents_select_all"
ON public.documents FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "documents_insert_admin" ON public.documents;
CREATE POLICY "documents_insert_admin"
ON public.documents FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "documents_update_admin" ON public.documents;
CREATE POLICY "documents_update_admin"
ON public.documents FOR UPDATE TO authenticated
USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "documents_delete_admin" ON public.documents;
CREATE POLICY "documents_delete_admin"
ON public.documents FOR DELETE TO authenticated
USING (public.is_admin());

-- signatures
DROP POLICY IF EXISTS "signatures_select_own_or_admin" ON public.signatures;
CREATE POLICY "signatures_select_own_or_admin"
ON public.signatures FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "signatures_insert_own" ON public.signatures;
CREATE POLICY "signatures_insert_own"
ON public.signatures FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "signatures_update_own" ON public.signatures;
CREATE POLICY "signatures_update_own"
ON public.signatures FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "signatures_delete_admin" ON public.signatures;
CREATE POLICY "signatures_delete_admin"
ON public.signatures FOR DELETE TO authenticated
USING (public.is_admin());

-- alerts
DROP POLICY IF EXISTS "alerts_select_own_or_admin" ON public.alerts;
CREATE POLICY "alerts_select_own_or_admin"
ON public.alerts FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "alerts_insert_admin" ON public.alerts;
CREATE POLICY "alerts_insert_admin"
ON public.alerts FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "alerts_update_own_or_admin" ON public.alerts;
CREATE POLICY "alerts_update_own_or_admin"
ON public.alerts FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "alerts_delete_admin" ON public.alerts;
CREATE POLICY "alerts_delete_admin"
ON public.alerts FOR DELETE TO authenticated
USING (public.is_admin());

-- document_required_signers
DROP POLICY IF EXISTS "drs_select_own_or_admin" ON public.document_required_signers;
CREATE POLICY "drs_select_own_or_admin"
ON public.document_required_signers FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "drs_insert_admin" ON public.document_required_signers;
CREATE POLICY "drs_insert_admin"
ON public.document_required_signers FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "drs_delete_admin" ON public.document_required_signers;
CREATE POLICY "drs_delete_admin"
ON public.document_required_signers FOR DELETE TO authenticated
USING (public.is_admin());

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_expires_at ON public.documents(expires_at);
CREATE INDEX IF NOT EXISTS idx_signatures_user_id ON public.signatures(user_id);
CREATE INDEX IF NOT EXISTS idx_signatures_document_id ON public.signatures(document_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON public.alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_is_read ON public.alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_drs_user_id ON public.document_required_signers(user_id);
CREATE INDEX IF NOT EXISTS idx_drs_document_id ON public.document_required_signers(document_id);
