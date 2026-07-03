-- Drop old policies referencing lowercase 'documents' bucket
DROP POLICY IF EXISTS "Allow authenticated users to read documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin users to upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin users to delete documents" ON storage.objects;

-- Recreate policies referencing 'Documents' (capital D) bucket
CREATE POLICY "Allow authenticated users to read Documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'Documents');

CREATE POLICY "Allow admin users to upload Documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'Documents' AND public.is_admin());

CREATE POLICY "Allow admin users to delete Documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'Documents' AND public.is_admin());