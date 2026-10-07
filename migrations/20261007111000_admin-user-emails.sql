-- Liste des comptes (e-mail, vérification, date) pour le back-office. Appelable uniquement avec la clé admin.
create or replace function public.admin_accounts()
returns table (id uuid, email text, email_verified boolean, created_at timestamptz)
language sql stable security definer set search_path = public, auth as $$
  select u.id, u.email, u.email_verified, u.created_at from auth.users u where not coalesce(u.is_anonymous, false)
$$;
revoke all on function public.admin_accounts() from public, anon, authenticated;
