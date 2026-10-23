-- Portefeuille (paiement à l'usage) : plus de packs ni d'abonnement.
create table if not exists public.wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  currency text not null default 'XOF',
  updated_at timestamptz not null default now()
);
create table if not exists public.wallet_tx (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null,
  kind text not null check (kind in ('topup', 'generation', 'refund', 'gift', 'migration', 'adjust')),
  ref text,
  label text,
  created_at timestamptz not null default now()
);
create index if not exists wallet_tx_user on public.wallet_tx(user_id, created_at desc);
alter table public.wallets enable row level security;
alter table public.wallet_tx enable row level security;
drop policy if exists wallets_own on public.wallets;
create policy wallets_own on public.wallets for select using (user_id = auth.uid());
drop policy if exists wallet_tx_own on public.wallet_tx;
create policy wallet_tx_own on public.wallet_tx for select using (user_id = auth.uid());

-- Mouvement atomique : refuse si le solde deviendrait négatif. Retourne le nouveau solde, ou null si refusé.
create or replace function public.wallet_apply(uid uuid, delta integer, tx_kind text, tx_ref text, tx_label text, cur text default 'XOF')
returns integer language plpgsql security definer set search_path = public as $$
declare nb integer;
begin
  insert into wallets(user_id, balance, currency) values (uid, 0, cur) on conflict (user_id) do nothing;
  update wallets set balance = balance + delta, updated_at = now() where user_id = uid and balance + delta >= 0 returning balance into nb;
  if nb is null then return null; end if;
  insert into wallet_tx(user_id, amount, kind, ref, label) values (uid, delta, tx_kind, tx_ref, tx_label);
  return nb;
end $$;
revoke all on function public.wallet_apply(uuid, integer, text, text, text, text) from public, anon, authenticated;

-- Recharges de portefeuille.
alter table public.payments drop constraint if exists payments_plan_check;
alter table public.payments add constraint payments_plan_check check (plan in ('single', 'pack5', 'monthly', 'topup'));
alter table public.payments alter column style_id drop not null;
alter table public.payments alter column duration_s drop not null;

-- Générations directes : format, prix payé, coût réel.
alter table public.videos add column if not exists aspect_ratio text default '9:16';
alter table public.videos add column if not exists price integer;
alter table public.videos add column if not exists currency text;
alter table public.videos add column if not exists cost_usd numeric(10,4);
alter table public.videos add column if not exists wallet_tx text;

-- Modèles : image produit -> vidéo, formats proposés.
alter table public.styles add column if not exists aspect_ratios jsonb not null default '["9:16","16:9","1:1"]';
update public.styles set hf_endpoint = 'alibaba/wan-3.0-prime/image-to-video', hf_params = '{"resolution":"720p"}', cost_usd_per_s = 0.056, durations = '[5,10,15,20,30]' where id = 'eclair';
update public.styles set hf_endpoint = 'kling-video/v3.0/std/image-to-video', hf_params = '{"sound":"on"}', cost_usd_per_s = 0.126, durations = '[5,10,15]' where id = 'naturel';
update public.styles set hf_endpoint = 'kling-video/v3.0/pro/image-to-video', hf_params = '{"sound":"on"}', cost_usd_per_s = 0.168, durations = '[5,10,15]' where id = 'studio';
update public.styles set hf_endpoint = 'bytedance/seedance-2.5/image-to-video', hf_params = '{"resolution":"480p","generate_audio":true}', cost_usd_per_s = 0.2056, durations = '[5,10,15]' where id = 'signature';
insert into public.settings(key, value) values ('margin', '1.4') on conflict (key) do update set value = excluded.value;

-- Les pubs déjà payées et non utilisées deviennent du solde (prix payé par pub).
insert into public.wallets(user_id, balance, currency)
select vp.user_id, sum(vp.remaining * coalesce(p.amount / nullif(p.videos, 0), 0))::int, coalesce(max(p.currency), 'XOF')
from public.video_passes vp left join public.payments p on p.id = vp.payment_id
where vp.remaining > 0 and p.id is not null group by vp.user_id
on conflict (user_id) do update set balance = wallets.balance + excluded.balance;
insert into public.wallet_tx(user_id, amount, kind, label)
select vp.user_id, (vp.remaining * coalesce(p.amount / nullif(p.videos, 0), 0))::int, 'migration', 'Pubs non utilisées converties en solde'
from public.video_passes vp join public.payments p on p.id = vp.payment_id where vp.remaining > 0;
update public.video_passes vp set remaining = 0 from public.payments p where p.id = vp.payment_id and vp.remaining > 0;
