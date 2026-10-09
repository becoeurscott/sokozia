-- Moyen de paiement : Mobile Money (pawaPay) ou carte (Stripe Checkout).
alter table public.payments add column if not exists method text not null default 'mobile' check (method in ('mobile', 'card'));
