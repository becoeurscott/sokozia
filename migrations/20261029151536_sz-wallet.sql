-- Wallet: a prepaid FCFA balance per user, and the history of every move.
--
-- Top-ups are orders with purpose 'topup' (units = number of 15 s video
-- prices bought). A video can be paid from the balance instead of its own
-- checkout. A payment that lands for a video already paid is credited to
-- the balance instead of being lost.
--
-- Every balance change goes through public.sz_wallet_apply, which updates
-- the balance and writes the history row in one transaction, refuses to go
-- below zero, and is idempotent per order and per video. Callable with the
-- admin key only; users can read their own wallet and history.

alter table public.sz_orders add column if not exists purpose text not null default 'video';
alter table public.sz_orders add column if not exists units integer;
alter table public.sz_orders drop constraint if exists sz_orders_purpose_check;
alter table public.sz_orders add constraint sz_orders_purpose_check check (purpose in ('video', 'topup'));

create table if not exists public.sz_wallets (
  id uuid primary key, -- the user id
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.sz_wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind text not null check (kind in ('topup', 'video', 'credit', 'refund')),
  amount integer not null check (amount <> 0), -- FCFA: positive adds, negative spends
  balance_after integer not null check (balance_after >= 0),
  order_id uuid,
  generation_id uuid,
  label text not null,
  created_at timestamptz not null default now()
);

create index if not exists sz_wallet_tx_user_created on public.sz_wallet_transactions (user_id, created_at desc);
-- One balance move per paid order, and one debit per video.
create unique index if not exists sz_wallet_tx_order on public.sz_wallet_transactions (order_id) where order_id is not null;
create unique index if not exists sz_wallet_tx_video on public.sz_wallet_transactions (generation_id) where kind = 'video';

alter table public.sz_wallets enable row level security;
alter table public.sz_wallet_transactions enable row level security;
drop policy if exists "sz own wallet" on public.sz_wallets;
create policy "sz own wallet" on public.sz_wallets for select to authenticated using (id = auth.uid());
drop policy if exists "sz own wallet transactions" on public.sz_wallet_transactions;
create policy "sz own wallet transactions" on public.sz_wallet_transactions for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.sz_wallets from anon, authenticated;
revoke insert, update, delete on public.sz_wallet_transactions from anon, authenticated;

create or replace function public.sz_wallet_apply(
  p_user uuid,
  p_amount integer,
  p_kind text,
  p_label text,
  p_order uuid default null,
  p_generation uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
  v_tx uuid;
begin
  if p_amount = 0 then
    raise exception 'sz_wallet_apply: amount must not be zero';
  end if;

  insert into public.sz_wallets (id, balance) values (p_user, 0) on conflict (id) do nothing;

  begin
    update public.sz_wallets
       set balance = balance + p_amount, updated_at = now()
     where id = p_user and balance + p_amount >= 0
     returning balance into v_balance;

    if v_balance is null then
      return jsonb_build_object('ok', false, 'reason', 'insufficient',
        'balance', (select balance from public.sz_wallets where id = p_user));
    end if;

    insert into public.sz_wallet_transactions (user_id, kind, amount, balance_after, order_id, generation_id, label)
    values (p_user, p_kind, p_amount, v_balance, p_order, p_generation, p_label)
    returning id into v_tx;
  exception when unique_violation then
    -- Already applied for this order or video: the balance change above is rolled back.
    return jsonb_build_object('ok', true, 'duplicate', true,
      'balance', (select balance from public.sz_wallets where id = p_user));
  end;

  return jsonb_build_object('ok', true, 'balance', v_balance, 'transaction_id', v_tx);
end;
$$;

revoke all on function public.sz_wallet_apply(uuid, integer, text, text, uuid, uuid) from public, anon, authenticated;
