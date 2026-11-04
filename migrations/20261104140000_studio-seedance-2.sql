-- Un modèle Higgsfield différent par style : Éclair = Wan 3.0 Prime, Naturel = Kling 3.0 Std,
-- Studio = Seedance 2.0 (au lieu de Kling 3.0 Pro), Signature = Seedance 2.5.
-- Seedance 2.0 : max 15 s ; coût ≈ 480×854 px × 24 i/s / 1024 × 0,014 $ / 1000 jetons ≈ 0,135 $/s (480p).
update public.styles set hf_endpoint = 'bytedance/seedance-2.0/image-to-video',
  hf_params = '{"resolution":"480p","generate_audio":true}', cost_usd_per_s = 0.135,
  durations = '[5,10,15]', quality_fr = 'Rendu pub soigné · son et voix inclus'
where id = 'studio';
