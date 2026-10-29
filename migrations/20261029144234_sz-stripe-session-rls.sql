-- Stripe Checkout through InsForge runs with the customer's own token, so
-- InsForge's managed session tables need RLS that lets a signed-in user
-- create and read only their own sessions (subject = the user). This is the
-- pattern from InsForge's Stripe guide; the payments schema allows it.

alter table payments.stripe_checkout_sessions enable row level security;
alter table payments.stripe_customer_portal_sessions enable row level security;

create policy "users create their stripe checkout sessions"
on payments.stripe_checkout_sessions
for insert
to authenticated
with check (subject_type = 'user' and subject_id = auth.uid()::text);

-- SELECT is also needed for idempotent retries (sz-order:<id>).
create policy "users read their stripe checkout sessions"
on payments.stripe_checkout_sessions
for select
to authenticated
using (subject_type = 'user' and subject_id = auth.uid()::text);

create policy "users create their stripe portal sessions"
on payments.stripe_customer_portal_sessions
for insert
to authenticated
with check (subject_type = 'user' and subject_id = auth.uid()::text);

create policy "users read their stripe portal sessions"
on payments.stripe_customer_portal_sessions
for select
to authenticated
using (subject_type = 'user' and subject_id = auth.uid()::text);
