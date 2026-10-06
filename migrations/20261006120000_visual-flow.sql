-- Parcours visuel : produit -> créateur -> format -> lieu -> style (durée, prix) -> aperçu -> vidéo.
alter table public.conversations drop constraint if exists conversations_step_check;
-- Les anciens projets à l'étape « script » reprennent au choix du style.
update public.conversations set step='style' where step='script';
alter table public.conversations add constraint conversations_step_check
  check (step in ('product','creator','format','location','style','preview','video','done'));
alter table public.conversations add column if not exists style_id text references public.styles(id);

-- Référence visuelle (clip d'exemple) et niveau de qualité affichés sur les cartes de style.
alter table public.styles add column if not exists sample_clip text;
alter table public.styles add column if not exists quality_fr text not null default '';
update public.styles set sample_clip='livraison-whatsapp',  quality_fr='Qualité standard · 480p · voix incluse · jusqu''à 30 s' where id='eclair';
update public.styles set sample_clip='temoignage-karite',   quality_fr='Très naturel · 720p · voix incluse' where id='naturel';
update public.styles set sample_clip='grwm-perruque',       quality_fr='Rendu soigné · créateur et produit fidèles · voix incluse' where id='studio';
update public.styles set sample_clip='vendeuse-marche-wax', quality_fr='Le plus réaliste · visages et gestes au plus près du réel' where id='signature';
