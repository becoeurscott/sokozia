-- Découpage plan par plan proposé par Awa et validé (ou modifié) par le client avant la vidéo.
alter table public.conversations add column if not exists shots jsonb;
