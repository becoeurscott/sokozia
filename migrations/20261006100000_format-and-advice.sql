-- Format de pub choisi (parmi les exemples UGC) et style conseillé par Awa.
alter table public.conversations add column if not exists format_id text;
alter table public.conversations add column if not exists suggested_style text;
alter table public.conversations add column if not exists suggested_reason text;
