-- Flux guidé en 5 étapes (produit, créateur, lieu, script, vidéo). Une conversation = un projet de pub.
alter table public.conversations
  add column step text not null default 'product' check (step in ('product','creator','location','script','video','done')),
  add column product jsonb,                      -- formulaire produit + réglages (langue, plateforme, style de vidéo…)
  add column options jsonb,                      -- 3 propositions numérotées de l'étape en cours
  add column picked text,                        -- option choisie à l'étape en cours
  add column duration_s integer,
  add column script text,
  add column retries jsonb not null default '{}'; -- régénérations utilisées par étape (max 3)

-- Images de référence générées (fiche produit, fiche personnage, lieu, image d'ouverture). Propriété Sokozia.
create table public.project_images (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  kind text not null check (kind in ('product','creator','location','frame','upload')),
  prompt text,
  status text not null default 'processing' check (status in ('processing','ready','failed')),
  apiframe_task_id text,
  url text,
  storage_key text,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);
create index project_images_conv_idx on public.project_images(conversation_id, kind, created_at desc);
alter table public.project_images enable row level security;
revoke insert, update, delete on public.project_images from anon, authenticated;
create policy project_images_read on public.project_images for select
  using (exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = auth.uid()));

-- Comment chaque modèle reçoit les 3 images de référence. null = pas de références : on génère une image d'ouverture.
alter table public.styles add column refs_key text;
update public.styles set refs_key = 'reference_image_urls' where id in ('naturel','studio');
update public.styles set refs_key = 'reference_images' where id = 'signature';
update public.styles set refs_key = null where id = 'eclair';

insert into public.settings(key, value) values ('image_model', '{"model":"nano-banana-2","params_key":"nanoBananaParams","refs_key":"image_input","params":{"resolution":"2K"},"cost_usd":0.12}')
on conflict (key) do nothing;
insert into public.settings(key, value) values ('max_retries', '3') on conflict (key) do nothing;
