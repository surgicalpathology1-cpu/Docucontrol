-- Drop policies that incorrectly referenced 'Documents' (capital D)
DROP POLICY IF EXISTS "Allow authenticated users to read Documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin users to upload Documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin users to delete Documents" ON storage.objects;

-- Recreate correct policies referencing 'documents' (lowercase, matching actual bucket)
CREATE POLICY "Allow authenticated users to read documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Allow admin users to upload documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents' AND public.is_admin());

CREATE POLICY "Allow admin users to delete documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documents' AND public.is_admin());