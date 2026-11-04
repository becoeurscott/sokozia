-- Offre simplifiée : 2 modèles (Éclair = Wan 3.0 Prime, Signature = Seedance 2.5) et 2 durées (15 s, 30 s).
-- Seedance 2.5 accepte 30 s (requête test acceptée puis annulée chez Higgsfield le 2026-11-04).
update public.styles set active = true, durations = '[15,30]', sort = 1 where id = 'eclair';
update public.styles set active = true, durations = '[15,30]', sort = 2 where id = 'signature';
update public.styles set active = false where id in ('naturel', 'studio');
