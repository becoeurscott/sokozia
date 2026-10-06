-- Fournisseur de génération par style : 'apiframe' ou 'higgsfield'.
-- Higgsfield : hf_endpoint (ex. bytedance/seedance-2.5/reference-to-video) + hf_params (résolution, son…).
alter table public.styles add column if not exists provider text not null default 'apiframe' check (provider in ('apiframe','higgsfield'));
alter table public.styles add column if not exists hf_endpoint text;
alter table public.styles add column if not exists hf_params jsonb not null default '{}';

-- Images de référence via Higgsfield (Marketing Studio garde le produit identique).
insert into public.settings(key, value) values
  ('image_provider', '{"provider":"apiframe","hf_endpoint":"marketing-studio/image","hf_params":{"resolution":"1k"}}')
on conflict (key) do nothing;
