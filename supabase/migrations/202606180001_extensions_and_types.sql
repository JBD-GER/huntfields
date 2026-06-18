-- Huntfields core extensions and enums.
-- Run in Supabase SQL migrations before the schema migration.

create schema if not exists extensions;

create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pgcrypto with schema extensions;

do $$ begin
  create type public.user_role as enum ('hunter', 'landowner', 'admin');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.listing_status as enum ('draft', 'submitted', 'in_review', 'approved', 'rejected', 'archived');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.price_unit as enum ('per_day', 'per_week', 'per_season', 'per_request');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.request_status as enum ('pending', 'approved', 'declined', 'withdrawn', 'expired');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.booking_status as enum ('pending_payment', 'confirmed', 'cancelled', 'completed', 'refunded');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.admin_review_status as enum ('needs_review', 'approved', 'rejected', 'changes_requested');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.payment_provider as enum ('manual', 'stripe');
exception when duplicate_object then null;
end $$;
