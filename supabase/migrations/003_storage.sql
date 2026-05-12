-- =====================================================
-- STUDY'S — Migration 003: Storage Buckets
-- =====================================================

-- Bucket principal pour tous les uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'studys-uploads',
  'studys-uploads',
  true,
  52428800, -- 50MB max
  ARRAY[
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Bucket avatars (public, léger)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB max
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STORAGE RLS POLICIES
-- =====================================================

-- studys-uploads: lecture publique
CREATE POLICY "uploads_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'studys-uploads');

-- studys-uploads: upload authentifié dans son propre dossier
CREATE POLICY "uploads_auth_insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'studys-uploads'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- studys-uploads: supprimer ses propres fichiers
CREATE POLICY "uploads_auth_delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'studys-uploads'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

-- avatars: lecture publique
CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- avatars: upload son propre avatar
CREATE POLICY "avatars_auth_insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "avatars_auth_update" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );
