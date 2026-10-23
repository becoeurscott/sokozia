-- Les vidéos restent la propriété de Sokozia quand un compte est supprimé (created_by passe à null).
alter table public.videos alter column created_by drop not null;
