-- Update bucket to use 'Documents' with capital D
-- The bucket_id is the unique key; we need to create a new one with the capital D
-- First check if the old bucket has objects; update the name
UPDATE storage.buckets SET name = 'Documents' WHERE id = 'documents';