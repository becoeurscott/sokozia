-- Sokozia studio (Seedance 2.0 + Claude director) on the shared "sokozia"
-- InsForge project. The earlier app already owns tables here (profiles,
-- messages, videos, wallets…), so every table of this app is prefixed
-- `sz_` and nothing below reads or changes the existing ones.
--
-- All app access goes through the project-admin key inside Next.js API
-- routes. RLS is still on, so the anon/user key can only read a user's
-- own rows.

create table if not exists public.sz_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sz_threads_user_updated on public.sz_threads (user_id, updated_at desc);

create table if not exists public.sz_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.sz_threads (id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('user', 'assistant')),
  kind text not null check (kind in ('text', 'brief', 'video')),
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists sz_messages_thread_created on public.sz_messages (thread_id, created_at);

create table if not exists public.sz_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  thread_id uuid not null references public.sz_threads (id) on delete cascade,
  message_id uuid,
  style text not null default 'seedance' check (style in ('seedance')),
  duration int not null check (duration in (15, 30)),
  actor_id text not null,
  product text not null,
  product_image_url text,
  script text not null,
  prompt text not null,
  provider text not null default 'higgsfield',
  provider_request_id text,
  provider_status_url text,
  -- One entry per Seedance clip: a 30 s ad is two 15 s clips joined with ffmpeg.
  parts jsonb,
  status text not null default 'awaiting_payment'
    check (status in ('awaiting_payment', 'queued', 'in_progress', 'completed', 'failed', 'nsfw')),
  video_url text,
  poster_url text,
  error text,
  order_id uuid,
  price int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  last_checked_at timestamptz
);
create index if not exists sz_generations_user_created on public.sz_generations (user_id, created_at desc);
create index if not exists sz_generations_thread on public.sz_generations (thread_id);
create unique index if not exists sz_generations_provider_request on public.sz_generations (provider_request_id) where provider_request_id is not null;

-- One order pays exactly one generation (pay-per-video).
create table if not exists public.sz_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  style text not null default 'seedance',
  duration int not null,
  amount int not null,
  currency text not null default 'XAF',
  country text,
  provider text not null default 'pawapay',
  checkout_code text,
  redirect_url text,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed', 'expired')),
  generation_id uuid,
  thread_id uuid,
  failure text,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists sz_orders_user_created on public.sz_orders (user_id, created_at desc);

create table if not exists public.sz_uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  url text not null,
  kind text not null,
  name text not null,
  created_at timestamptz not null default now()
);

-- Idempotency log for provider callbacks (one row per provider/id/status).
create table if not exists public.sz_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_id text not null,
  status text not null,
  payload jsonb,
  received_at timestamptz not null default now(),
  unique (provider, external_id, status)
);

alter table public.sz_threads enable row level security;
alter table public.sz_messages enable row level security;
alter table public.sz_generations enable row level security;
alter table public.sz_orders enable row level security;
alter table public.sz_uploads enable row level security;
alter table public.sz_webhook_events enable row level security;

-- Read-only for signed-in users, own rows only. Writes go through the admin key.
revoke insert, update, delete on public.sz_threads, public.sz_messages, public.sz_generations, public.sz_orders, public.sz_uploads from anon, authenticated;
revoke all on public.sz_webhook_events from anon, authenticated;
grant select on public.sz_threads, public.sz_messages, public.sz_generations, public.sz_orders, public.sz_uploads to authenticated;

create policy "sz own threads" on public.sz_threads for select to authenticated using (user_id = auth.uid());
create policy "sz own messages" on public.sz_messages for select to authenticated using (user_id = auth.uid());
create policy "sz own generations" on public.sz_generations for select to authenticated using (user_id = auth.uid());
create policy "sz own orders" on public.sz_orders for select to authenticated using (user_id = auth.uid());
create policy "sz own uploads" on public.sz_uploads for select to authenticated using (user_id = auth.uid());
