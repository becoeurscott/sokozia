-- Card payments for the Sokozia studio (Stripe Checkout through InsForge).
--
-- InsForge stores verified Stripe events in payments.webhook_events. The
-- app opens a Checkout Session with metadata.order_id = sz_orders.id and
-- reads the outcome through this function, so Next.js never needs direct
-- access to the payments schema. Callable with the admin key only.

create or replace function public.sz_stripe_checkout_status(p_order_id text)
returns jsonb
language sql
stable
security definer
set search_path = public, payments
as $$
  select jsonb_build_object(
    'status',
      case
        when e.event_type in ('checkout.session.completed', 'checkout.session.async_payment_succeeded')
             and e.payload -> 'data' -> 'object' ->> 'payment_status' = 'paid' then 'paid'
        when e.event_type = 'checkout.session.async_payment_failed' then 'failed'
        when e.event_type = 'checkout.session.expired' then 'expired'
        else 'pending'
      end,
    'amount', (e.payload -> 'data' -> 'object' ->> 'amount_total')::bigint,
    'currency', e.payload -> 'data' -> 'object' ->> 'currency',
    'session', e.payload -> 'data' -> 'object' ->> 'id',
    'livemode', e.livemode
  )
  from payments.webhook_events e
  where e.provider = 'stripe'
    and e.processing_status = 'processed'
    and e.event_type in (
      'checkout.session.completed',
      'checkout.session.async_payment_succeeded',
      'checkout.session.async_payment_failed',
      'checkout.session.expired'
    )
    and e.payload -> 'data' -> 'object' -> 'metadata' ->> 'sz_order_id' = p_order_id
  -- A paid event wins over a later "expired" for the same session.
  order by
    (e.event_type in ('checkout.session.completed', 'checkout.session.async_payment_succeeded')
      and e.payload -> 'data' -> 'object' ->> 'payment_status' = 'paid') desc,
    e.received_at desc
  limit 1;
$$;

revoke all on function public.sz_stripe_checkout_status(text) from public, anon, authenticated;
