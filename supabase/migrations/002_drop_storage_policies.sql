-- Migration 002: remove Supabase Storage from the project.
--
-- Background: all media now lives in Cloudflare R2 (bucket `lumi-membros`).
-- Six orphan files from legacy buckets (home-covers, thumbnails,
-- lesson-materials) were backed up to R2 prefix `legacy/<bucket>/<path>`
-- before deletion. The manifest is committed at
-- `scripts/migration-manifest.json`.
--
-- Steps this migration handles:
--   1. Drop all RLS policies on storage.objects.
--
-- Steps that CANNOT be done via SQL (Supabase blocks direct DELETE on
-- storage.* tables). These must be done via the Storage API. The repo ships
-- `scripts/delete-supabase-storage.mjs` which lists every bucket, removes
-- objects in batches, then deletes each bucket.

DROP POLICY IF EXISTS "avatars_owner_delete" ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "lesson_materials_storage: admin delete" ON storage.objects;
DROP POLICY IF EXISTS "lesson_materials_storage: admin upload" ON storage.objects;
DROP POLICY IF EXISTS "post_media_delete" ON storage.objects;
DROP POLICY IF EXISTS "post_media_insert" ON storage.objects;
DROP POLICY IF EXISTS "post_media_update" ON storage.objects;
DROP POLICY IF EXISTS "storage: autenticados fazem upload" ON storage.objects;
DROP POLICY IF EXISTS "storage: autenticados leem" ON storage.objects;
DROP POLICY IF EXISTS "storage: dono ou admin atualiza" ON storage.objects;
DROP POLICY IF EXISTS "storage: dono ou admin deleta" ON storage.objects;
DROP POLICY IF EXISTS "storage_public_read" ON storage.objects;
