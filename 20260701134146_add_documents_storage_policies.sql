-- Storage policies for documents bucket
-- Allow authenticated users to read/list documents
CREATE POLICY "Allow authenticated users to read documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documents');

-- Allow admins to upload documents
CREATE POLICY "Allow admin users to upload documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents' AND public.is_admin());

-- Allow admins to delete documents
CREATE POLICY "Allow admin users to delete documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documents' AND public.is_admin());