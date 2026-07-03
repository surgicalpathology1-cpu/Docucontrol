-- The bucket_id in storage.objects is still 'documents' (lowercase id)
-- but the bucket name is 'Documents'. RLS policies check bucket_id, so use lowercase.
DROP POLICY IF EXISTS "Allow authenticated users to read Documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin users to upload Documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin users to delete Documents" ON storage.objects;

CREATE POLICY "Allow authenticated users to read Documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Allow admin users to upload Documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents' AND public.is_admin());

CREATE POLICY "Allow admin users to delete Documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documents' AND public.is_admin());