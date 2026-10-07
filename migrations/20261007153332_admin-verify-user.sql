-- Comptes créés depuis l'admin : e-mail marqué vérifié (appelable seulement avec la clé admin).
create or replace function public.admin_verify_user(uid uuid) returns void
language sql security definer set search_path = auth, public as $$
  update auth.users set email_verified = true where id = uid;
$$;
revoke all on function public.admin_verify_user(uuid) from public, anon, authenticated;
