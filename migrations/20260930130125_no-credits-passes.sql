-- Plus de crédits : on vend des pubs d'un style et d'une durée précis.
-- Un achat (1 pub, pack 5, mensuel 10) crée un « pass » : N pubs de ce style et de cette durée.
create table public.video_passes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  style_id text not null references public.styles(id),
  duration_s integer not null,
  plan text not null check (plan in ('single','pack5','monthly','admin')),
  total integer not null check (total > 0),
  remaining integer not null check (remaining >= 0),
  expires_at timestamptz,
  payment_id uuid references public.payments(id),
  created_at timestamptz not null default now(),
  check (remaining <= total)
);
create index video_passes_user_idx on public.video_passes(user_id, style_id, duration_s) where remaining > 0;
alter table public.video_passes enable row level security;
revoke insert, update, delete on public.video_passes from anon, authenticated;
create policy passes_read on public.video_passes for select using (user_id = auth.uid());

-- Prend une pub dans le pass valide qui expire le plus tôt (atomique). Renvoie l'id du pass ou null.
create or replace function public.consume_pass(p_user uuid, p_style text, p_duration integer)
returns uuid language plpgsql security definer set search_path = public as $$
declare pid uuid;
begin
  select id into pid from public.video_passes
   where user_id = p_user and style_id = p_style and duration_s = p_duration and remaining > 0
     and (expires_at is null or expires_at > now())
   order by expires_at nulls last, created_at
   limit 1 for update skip locked;
  if pid is null then return null; end if;
  update public.video_passes set remaining = remaining - 1 where id = pid;
  return pid;
end $$;

create or replace function public.refund_pass(p_pass uuid)
returns void language sql security definer set search_path = public as $$
  update public.video_passes set remaining = least(total, remaining + 1) where id = p_pass;
$$;
revoke all on function public.consume_pass(uuid, text, integer), public.refund_pass(uuid) from public, anon, authenticated;

alter table public.videos add column pass_id uuid references public.video_passes(id);
alter table public.videos alter column credits_spent drop not null;
alter table public.payments alter column credits drop not null;
alter table public.payments add column conversation_id uuid references public.conversations(id) on delete set null;
alter table public.payments add column image_url text;

-- Le prix se calcule directement depuis le coût réel par seconde.
alter table public.styles drop column credits_per_s cascade;
delete from public.settings where key = 'credit_usd';

drop view if exists public.public_styles;
create view public.public_styles as
  select id, name_fr, description_fr, durations, sort from public.styles where active order by sort;
grant select on public.public_styles to anon, authenticated;

drop function if exists public.apply_credits(uuid, integer, text, text);
