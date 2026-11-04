-- Générateur direct : créateur choisi (avatar) et prompt vidéo écrit par Claude (en attente de l'image d'ouverture).
alter table public.videos add column if not exists creator_id text;
alter table public.videos add column if not exists director_prompt text;
