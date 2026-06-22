alter table public.hunter_compliance_profiles
  add column if not exists verification_status public.verification_status not null default 'not_started',
  add column if not exists verification_reviewed_at timestamptz,
  add column if not exists verification_reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists verification_rejection_reason text;

create index if not exists hunter_compliance_verification_status_idx
  on public.hunter_compliance_profiles (verification_status, completed_at desc);
