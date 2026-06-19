# Huntfields

Production-oriented MVP for an international hunting land access marketplace.

## Stack

- Next.js App Router on Vercel
- Supabase Auth, Postgres, Storage, and PostGIS
- MapLibre GL with Terra Draw polygon editing
- Resend transactional email
- Stripe-ready payment provider abstraction with manual/noop fallback for MVP
- US-first compliance workflows for hunter onboarding, listing rules, booking approval, and electronic lease signing

## Local Setup

1. Copy `.env.example` to `.env.local`.
2. Create a Supabase project and set the Supabase URL, anon key, and service role key.
3. Run the SQL files in `supabase/migrations` in order.
4. Configure Supabase Auth SMTP to use Resend if you want signup confirmation and magic-link emails through Resend.
5. Run `npm run dev`.

## Supabase

The migrations enable PostGIS and create:

- `profiles`, `legal_region_configs`, `listing_types`
- `listings` with exact `geometry(MultiPolygon, 4326)`, private `geography(Point, 4326)`, approximate public point, area fields, search vector, and GIST indexes
- `listing_requests`, `bookings`, `messages`, `favorites`, `saved_searches`, `admin_reviews`
- `us_state_hunting_rules`, `hunter_compliance_profiles`, `listing_compliance_profiles`, `booking_contracts`, `contract_signatures`, `booking_workflow_events`
- Storage buckets for listing images, avatars, and message attachments
- RLS policies and column grants so public users cannot directly select exact polygon coordinates
- RPCs for radius search, bounds search, featured region listings, area calculation, approximate public location, public listing details, and exact polygon access after approval or confirmed booking
- RPCs for reading state hunting rules and refreshing contract status after electronic signatures

## Map Privacy Model

Landowners draw exact polygons in the listing submission flow. Supabase stores the exact geometry for search, area calculation, and private access. Public pages and map search return only the rounded approximate public point. The `get_listing_exact_polygon` RPC returns exact coordinates only to admins, landowners, approved hunters, or confirmed bookings.

## AI Listing Covers

When `OPENAI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are configured, new listing submissions generate a unique regional cover image server-side. The prompt uses the listing title, state, region, nearest town, wildlife, habitat notes, and amenities, then uploads the image to the Supabase `listing-images` bucket. Without OpenAI or storage credentials, listings still work and fall back to the generated placeholder cover route.

## Email Events

Resend helpers are wired for:

- Signup confirmation template for custom flows
- New listing submitted
- Listing approved or rejected
- Hunter request sent to landowner
- Landowner response sent to hunter
- Booking/request status updates
- Lease agreement ready for signature
- Lease agreement fully signed
- Contact form notifications

Supabase Auth confirmation and magic-link delivery should be routed through Resend SMTP in the Supabase dashboard.

## Auth Provider Setup

The app supports three consumer sign-in paths on `/auth/login`:

- Email and password through Supabase Auth
- Google OAuth through the Supabase Google provider
- Passkey sign-in for users who add a passkey after logging in

For Supabase Auth URLs, set:

- Site URL: `https://www.huntfields.com`
- Redirect URLs:
  - `https://www.huntfields.com/auth/callback`
  - `https://www.huntfields.com/auth/confirm`
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/auth/confirm`

The default Supabase confirmation links work through `/auth/callback`. For the
most reliable server-side email confirmation and invite flow, update Supabase
Auth email templates to point at `/auth/confirm` with `token_hash`:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type={{ .Type }}&redirect_to={{ .RedirectTo }}">
  Confirm your Huntfields account
</a>
```

For Google, create a Google Cloud OAuth client with application type `Web application`.

- Authorized JavaScript origins:
  - `https://www.huntfields.com`
  - `http://localhost:3000`
- Authorized redirect URI:
  - copy the exact `Callback URL (for OAuth)` shown in Supabase Dashboard -> Auth -> Providers -> Google. It looks like `https://<project-ref>.supabase.co/auth/v1/callback`.

Then paste the Google Web Client ID and Client Secret into the Supabase Google provider settings and save.

For Passkeys, enable Supabase Dashboard -> Auth -> Providers -> Passkeys.

- Relying Party Display Name: `Huntfields`
- Local development Relying Party ID: `localhost`
- Local development Origin: `http://localhost:3000`
- Production Relying Party ID: `huntfields.com`
- Production Origin: `https://www.huntfields.com`

The app shows passkey sign-in on `/auth/login` and lets signed-in users add a
passkey from `/dashboard`.

Authenticated users can delete their own Supabase Auth user from `/dashboard`.
That action requires `SUPABASE_SERVICE_ROLE_KEY` on the server because it uses
the Supabase Admin API. If an account owns active marketplace records, archive
or transfer those records before deleting the Auth user.

## Payments

The app uses `getPaymentProvider()` to select Stripe when `STRIPE_SECRET_KEY` is present, otherwise it uses the manual MVP provider. The Stripe provider is built around Checkout Sessions and can support Connect destination charges with a connected account ID later.

## US Compliance and Contracts

The first market is the United States. The seeded launch states are Texas, Colorado, Montana, and Georgia. The compliance layer is intentionally data-driven through `us_state_hunting_rules`, so more states can be added without changing the app flow.

Current workflow:

- Hunters complete `/onboarding/hunter` before messaging landowners.
- Landowners complete state-aware listing checks during `/list-your-land`.
- Requests can be approved or declined in `/dashboard`.
- Approval creates a booking and generates a hunting lease agreement draft.
- Both hunter and landowner sign at `/contracts/[id]`.
- Once both signatures are stored, the contract status becomes `signed` and the booking becomes `confirmed`.

The generated lease is an operational template, not legal advice. State rules change, and production launch should include counsel review per target state.
