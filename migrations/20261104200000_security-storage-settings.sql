-- Sécurité (audit 2026-11-04).
-- 1) Stockage : un utilisateur connecté ne doit plus pouvoir LISTER tous les fichiers des buckets publics
--    (il obtenait ainsi les liens des vidéos payées des autres clients), ni déposer des fichiers directement.
--    L'app lit et écrit le stockage uniquement côté serveur avec la clé admin (qui contourne ces règles).
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS storage_objects_owner_select ON storage.objects;
DROP POLICY IF EXISTS storage_objects_owner_insert ON storage.objects;
CREATE POLICY storage_objects_owner_select ON storage.objects
  FOR SELECT TO authenticated
  USING (uploaded_by = (SELECT auth.jwt() ->> 'sub'));
-- Pas de politique INSERT : aucun dépôt direct par les utilisateurs (UPDATE/DELETE restent limités au propriétaire).

-- 2) Réglages (marge, coûts, budget Higgsfield) : lus seulement par le serveur.
DROP POLICY IF EXISTS settings_read ON public.settings;
REVOKE SELECT ON public.settings FROM anon, authenticated;
