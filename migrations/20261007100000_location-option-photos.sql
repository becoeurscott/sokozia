-- Photos des 3 lieux proposés par Awa (une par option), pour choisir sur image.
alter table public.project_images drop constraint if exists project_images_kind_check;
alter table public.project_images add constraint project_images_kind_check
  check (kind in ('product','creator','location','frame','upload','location_option'));
alter table public.project_images add column if not exists option_index integer;
