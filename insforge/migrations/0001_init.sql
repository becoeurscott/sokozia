-- Sokozia schema for InsForge (Postgres).
-- Apply with the InsForge CLI / MCP (see README). All app access goes through
-- the project-admin key inside Next.js API routes; RLS is still enabled so the
-- anon key can never read another user's data if used directly.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key,
  name text,
  phone text,
  country text,
  locale text default 'fr',
  created_at timestamptz not null default now()
);

create table if not exists public.threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists threads_user_updated on public.threads (user_id, updated_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads (id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('user', 'assistant')),
  kind text not null check (kind in ('text', 'brief', 'video')),
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists messages_thread_created on public.messages (thread_id, created_at);

create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  thread_id uuid not null references public.threads (id) on delete cascade,
  message_id uuid,
  -- One model today (Seedance 2.0); the column stays so others can be added.
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
create index if not exists generations_user_created on public.generations (user_id, created_at desc);
create index if not exists generations_thread on public.generations (thread_id);
create unique index if not exists generations_provider_request on public.generations (provider_request_id) where provider_request_id is not null;

-- One order pays exactly one generation (pay-per-video).
create table if not exists public.orders (
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
create index if not exists orders_user_created on public.orders (user_id, created_at desc);

create table if not exists public.uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  url text not null,
  kind text not null,
  name text not null,
  created_at timestamptz not null default now()
);

-- Idempotency log for provider callbacks (one row per provider/id/status).
create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  external_id text not null,
  status text not null,
  payload jsonb,
  received_at timestamptz not null default now(),
  unique (provider, external_id, status)
);

-- Row Level Security: users only see their own rows through the anon/user key.
alter table public.profiles enable row level security;
alter table public.threads enable row level security;
alter table public.messages enable row level security;
alter table public.generations enable row level security;
alter table public.orders enable row level security;
alter table public.uploads enable row level security;
alter table public.webhook_events enable row level security;

create policy "own profile" on public.profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "own threads" on public.threads for select to authenticated using (user_id = auth.uid());
create policy "own messages" on public.messages for select to authenticated using (user_id = auth.uid());
create policy "own generations" on public.generations for select to authenticated using (user_id = auth.uid());
create policy "own orders" on public.orders for select to authenticated using (user_id = auth.uid());
create policy "own uploads" on public.uploads for select to authenticated using (user_id = auth.uid());
-- webhook_events: admin key only (no policies).

-- Storage buckets expected by the app (create them public in the dashboard or CLI):
--   uploads  : product photos sent by users
--   outputs  : finished videos copied from Higgsfield
