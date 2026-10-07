-- Photos jointes à un message du chat (affichées dans la bulle).
alter table public.messages add column if not exists attachments jsonb not null default '[]';
