-- Les vidéos terminées du prototype (table sz_generations) apparaissent dans « Mes vidéos » de leur auteur.
insert into public.videos (id, created_by, owner, style_id, prompt, image_url, status, video_url, duration_s, aspect_ratio, price, currency, created_at, updated_at)
select g.id, g.user_id, 'sokozia', 'signature',
       coalesce(nullif(left(g.product::text, 300), ''), 'Vidéo du prototype Sokozia'),
       g.product_image_url, 'ready', g.video_url, g.duration, '9:16', g.price, 'XOF', g.created_at, coalesce(g.completed_at, g.updated_at, g.created_at)
from public.sz_generations g
where g.status = 'completed' and g.video_url is not null and g.user_id is not null
on conflict (id) do nothing;
