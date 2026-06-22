-- Stripe Identity sessions are the first trust layer for hunters and owners.
-- Document/property reviews remain separate and only become final after ID is verified.

create unique index if not exists identity_verification_provider_session_uid
  on public.identity_verification_checks (provider, provider_session_id)
  where provider_session_id is not null;

create index if not exists identity_verification_latest_check_idx
  on public.identity_verification_checks (user_id, provider, check_type, created_at desc);

