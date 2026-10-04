-- Étape produit en conversation : photos envoyées dans le chat avant que la fiche produit soit complète,
-- et créateur choisi parmi le catalogue Sokozia.
alter table public.conversations add column if not exists photos jsonb not null default '[]';
alter table public.conversations add column if not exists creator_id text;
