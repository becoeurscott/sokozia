-- Back-office : journal des actions admin, remboursement des pubs, budget Higgsfield.
create table if not exists public.admin_audit (
  id uuid primary key default gen_random_uuid(),
  actor_email text not null,
  action text not null,
  target_type text not null,
  target_id text,
  before jsonb,
  after jsonb,
  reason text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_target_idx on public.admin_audit(target_id, created_at desc);
alter table public.admin_audit enable row level security;
revoke all on public.admin_audit from anon, authenticated;

alter table public.videos add column if not exists refunded boolean not null default false;
alter table public.video_passes drop constraint if exists video_passes_plan_check;
alter table public.video_passes add constraint video_passes_plan_check check (plan in ('single','pack5','monthly','admin','gift','refund'));

insert into public.settings(key, value) values
  ('admin_budget', '{"hfBudgetUsd":0,"hfBudgetSince":"2026-10-06","hfOtherSpendUsd":0,"hfAlertUsd":10,"imageCostUsd":0.12,"usdToXof":600}')
on conflict (key) do nothing;
