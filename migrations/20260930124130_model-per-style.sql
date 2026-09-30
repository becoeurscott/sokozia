-- Un style = un modèle IA différent (nom de marque, modèle caché). Durées autorisées par style.
alter table public.styles add column durations jsonb not null default '[15]';
alter table public.styles add column params_key text not null default 'seedanceParams';
alter table public.styles add column image_key text not null default 'start_image';

delete from public.styles where id not in (select distinct style_id from public.videos union select distinct style_id from public.payments where style_id is not null);
update public.styles set active = false;

insert into public.styles(id, name_fr, description_fr, apiframe_model, params_key, image_key, apiframe_params, cost_usd_per_s, credits_per_s, durations, sort, active) values
 ('eclair',    'Éclair',    'Rapide et économique. Parfait pour publier souvent et tester tes idées.',            'kling-3.0',    'klingParams',    'start_image', '{"mode":"standard","generate_audio":true}',  0.16, 1.6, '[15]',    1, true),
 ('naturel',   'Naturel',   'Une vraie personne qui parle de ton produit, très naturelle, comme une cliente.',       'seedance-2',   'seedanceParams', 'start_image', '{"resolution":"720p","generate_audio":true}', 0.19, 1.9, '[15]',    2, true),
 ('studio',    'Studio',    'Rendu pub soigné et fluide. Le seul style qui fait des pubs complètes de 30 secondes.',  'seedance-2.5', 'seedanceParams', 'start_image', '{"resolution":"720p","generate_audio":true}', 0.35, 3.5, '[15,30]', 3, true),
 ('signature', 'Signature', 'Qualité cinéma, image 1080p et voix parfaitement synchronisée. Spot court et percutant.', 'veo-3.1',      'veoParams',      'image',       '{"resolution":"1080p","generate_audio":true}', 0.50, 5.0, '[8]',     4, true)
on conflict (id) do update set name_fr=excluded.name_fr, description_fr=excluded.description_fr, apiframe_model=excluded.apiframe_model,
  params_key=excluded.params_key, image_key=excluded.image_key, apiframe_params=excluded.apiframe_params, cost_usd_per_s=excluded.cost_usd_per_s,
  credits_per_s=excluded.credits_per_s, durations=excluded.durations, sort=excluded.sort, active=true;

delete from public.settings where key = 'durations';

drop view public.public_styles;
create view public.public_styles as
  select id, name_fr, description_fr, credits_per_s, durations, sort
  from public.styles where active order by sort;
grant select on public.public_styles to anon, authenticated;
