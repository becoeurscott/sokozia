-- Prix fixes (FCFA, tout compris) par durée : remplacent le calcul coût × marge quand ils existent.
alter table public.styles add column if not exists fixed_prices jsonb;
update public.styles set fixed_prices = '{"15": 2800, "30": 5000}' where id = 'eclair';
