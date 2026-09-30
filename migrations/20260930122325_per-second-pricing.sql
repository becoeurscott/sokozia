-- Vraies pubs : 15 s ou 30 s. Le coût et les crédits deviennent « par seconde ».
alter table public.styles add column credits_per_s numeric(8,2);
alter table public.styles add column cost_usd_per_s numeric(10,4);

-- Estimations Seedance 2.5 (à corriger dans /admin selon la facture APIFrame réelle). 1 crédit = 0,10 $.
update public.styles set apiframe_model='seedance-2.5', apiframe_params='{"resolution":"480p","generate_audio":true}',  cost_usd_per_s=0.08, credits_per_s=0.8 where id='express';
update public.styles set apiframe_model='seedance-2.5', apiframe_params='{"resolution":"720p","generate_audio":true}',  cost_usd_per_s=0.18, credits_per_s=1.8 where id='realiste';
update public.styles set apiframe_model='seedance-2.5', apiframe_params='{"resolution":"1080p","generate_audio":true}', cost_usd_per_s=0.40, credits_per_s=4.0 where id='cinema';
update public.styles set apiframe_model='seedance-2.5', apiframe_params='{"resolution":"1080p","generate_audio":true,"bitrate_mode":"high"}', cost_usd_per_s=0.50, credits_per_s=5.0 where id='premium';

alter table public.styles alter column credits_per_s set not null;
alter table public.styles alter column cost_usd_per_s set not null;
alter table public.styles drop column credits cascade;
alter table public.styles drop column cost_usd;
alter table public.styles drop column duration_s cascade;

update public.styles set name_fr='Premium', description_fr='Qualité maximale, image nette et son riche. Pour tes grosses campagnes.' where id='premium';
update public.styles set description_fr='Rapide et économique. Idéal pour tester une idée ou publier souvent.' where id='express';

alter table public.videos add column duration_s integer not null default 15;
alter table public.payments add column duration_s integer not null default 15;

insert into public.settings(key, value) values ('durations', '[15, 30]');

create view public.public_styles as
  select id, name_fr, description_fr, credits_per_s, sort
  from public.styles where active order by sort;
grant select on public.public_styles to anon, authenticated;
