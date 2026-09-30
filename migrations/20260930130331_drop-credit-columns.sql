alter table public.payments rename column credits to videos;
alter table public.videos drop column credits_spent;
alter table public.profiles drop column credits;
drop table if exists public.credit_ledger;
