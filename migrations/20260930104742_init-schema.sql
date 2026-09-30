-- Sokozia: vidéos UGC IA. Tout contenu généré appartient à Sokozia (owner = 'sokozia').

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  country text not null default 'CM',          -- ISO2, choisit la devise / l'opérateur pawaPay
  credits integer not null default 0 check (credits >= 0),
  is_admin boolean not null default false,
  accepted_terms_at timestamptz,
  created_at timestamptz not null default now()
);

-- Le nom du modèle (apiframe_model) n'est JAMAIS exposé au client : voir la vue public_styles.
create table public.styles (
  id text primary key,
  name_fr text not null,
  description_fr text not null,
  apiframe_model text not null,
  apiframe_params jsonb not null default '{}',
  cost_usd numeric(10,4) not null,             -- coût APIFrame réel par vidéo
  credits integer not null check (credits > 0),-- coût en crédits pour l'utilisateur
  duration_s integer not null default 5,
  sort integer not null default 0,
  active boolean not null default true
);

create table public.settings (
  key text primary key,
  value jsonb not null
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Nouvelle vidéo',
  brief jsonb,                                 -- brief final produit par le directeur
  created_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
create index messages_conv_idx on public.messages(conversation_id, created_at);

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete set null,
  owner text not null default 'sokozia',
  conversation_id uuid references public.conversations(id) on delete set null,
  style_id text not null references public.styles(id),
  prompt text not null,
  image_url text,
  status text not null default 'pending' check (status in ('pending','processing','ready','failed')),
  credits_spent integer not null,
  apiframe_task_id text,
  storage_key text,
  video_url text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index videos_user_idx on public.videos(created_by, created_at desc);
create index videos_status_idx on public.videos(status) where status in ('pending','processing');

create table public.credit_ledger (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  delta integer not null,
  reason text not null,                        -- purchase | generation | refund | admin
  ref text,
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),  -- = depositId pawaPay
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null check (plan in ('single','pack5','monthly')),
  style_id text references public.styles(id),
  credits integer not null,
  amount integer not null,
  currency text not null,
  provider text not null default 'pawapay',
  correspondent text,
  phone text,
  status text not null default 'pending' check (status in ('pending','completed','failed')),
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_period_end timestamptz not null,
  last_payment_id uuid references public.payments(id)
);

-- Solde : seules ces fonctions modifient profiles.credits (appelées côté serveur).
create or replace function public.apply_credits(p_user uuid, p_delta integer, p_reason text, p_ref text)
returns integer language plpgsql security definer set search_path = public as $$
declare new_balance integer;
begin
  update public.profiles set credits = credits + p_delta
    where id = p_user and credits + p_delta >= 0
    returning credits into new_balance;
  if new_balance is null then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;
  insert into public.credit_ledger(user_id, delta, reason, ref) values (p_user, p_delta, p_reason, p_ref);
  return new_balance;
end $$;
revoke all on function public.apply_credits(uuid, integer, text, text) from public, anon, authenticated;

-- Vue publique des styles, sans modèle ni coût.
create view public.public_styles as
  select id, name_fr, description_fr, credits, duration_s, sort
  from public.styles where active order by sort;
grant select on public.public_styles to anon, authenticated;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.styles enable row level security;
alter table public.settings enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.videos enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.payments enable row level security;
alter table public.subscriptions enable row level security;

-- profils : lecture propre ; mise à jour limitée aux champs non sensibles
revoke update, insert, delete on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant insert (id, full_name, phone, country, accepted_terms_at) on public.profiles to authenticated;
grant update (full_name, phone, country, accepted_terms_at) on public.profiles to authenticated;
create policy profiles_select on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_insert on public.profiles for insert with check (id = auth.uid());
create policy profiles_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- styles/settings : admin seulement (le public passe par public_styles)
create policy styles_admin on public.styles for all using (public.is_admin()) with check (public.is_admin());
create policy settings_read on public.settings for select using (true);
create policy settings_admin on public.settings for all using (public.is_admin()) with check (public.is_admin());

create policy conv_own on public.conversations for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy msg_own on public.messages for all
  using (exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = auth.uid()));

-- vidéos / paiements / ledger : lecture seule pour l'utilisateur, écritures par les fonctions serveur
revoke insert, update, delete on public.videos, public.credit_ledger, public.payments, public.subscriptions from anon, authenticated;
create policy videos_read on public.videos for select using (created_by = auth.uid() or public.is_admin());
create policy ledger_read on public.credit_ledger for select using (user_id = auth.uid());
create policy payments_read on public.payments for select using (user_id = auth.uid() or public.is_admin());
create policy subs_read on public.subscriptions for select using (user_id = auth.uid());

-- Données initiales (coûts à ajuster depuis /admin selon la grille APIFrame)
insert into public.settings(key, value) values
  ('multipliers', '{"single":5,"pack5":4,"monthly":3}'),
  ('credit_usd', '0.10'),
  ('monthly_videos', '10'),
  ('fx', '{"XAF":600,"XOF":600,"GHS":15,"NGN":1600,"KES":130,"UGX":3700,"RWF":1400,"ZMW":27,"CDF":2850,"USD":1}');

insert into public.styles(id, name_fr, description_fr, apiframe_model, cost_usd, credits, duration_s, sort) values
  ('express',  'Express',          'Rapide et économique, idéal pour tester une idée.',           'seedance-lite', 0.20, 2, 5, 1),
  ('realiste', 'Réaliste',         'Une vraie personne qui parle de ton produit, très naturel.',   'seedance-pro',  0.50, 5, 5, 2),
  ('cinema',   'Cinéma',           'Mouvements de caméra fluides, rendu pub haut de gamme.',        'kling',         0.80, 8, 5, 3),
  ('premium',  'Premium avec voix','La meilleure qualité, avec voix et son intégrés.',              'veo',           2.50, 25, 8, 4);
