# BUNK24 Gallery

BUNK24 Gallery is a multi-page Next.js storefront with a NestJS API and MySQL/Prisma data layer. Local development does not require Docker.

## Local setup

1. Copy `.env.example` to `.env` and set your local MySQL connection.
2. Set a long random `ADMIN_API_KEY`. Keep it private and never prefix it with `NEXT_PUBLIC_`.
3. Run `npm install`.
4. Run `npm run db:generate`.
5. Run `npm run db:migrate`; when Prisma asks for a new migration name, use `artist_catalog_management`.
   - If Prisma proposes resetting an existing database, cancel. Do not reset a database containing artwork or orders; resolve the migration history first.
6. Run `npm run db:seed`.
7. Run `npm run dev`.

- Web: http://localhost:3000
- API health: http://localhost:8000/api/health
- Public catalogue API: http://localhost:8000/api/artworks
- Printify connection status: http://localhost:8000/api/printify/status

## Artist and catalogue management

The Printify admin page is a read-only provider catalogue with product search, imported/published filters, readable mockups and metadata, variant-level provider costs and availability, and a complete raw-response viewer. Importing creates a BUNK24 draft. Select an artist and use **Assign & publish** to publish the BUNK24 website listing; this does not publish anything to Printify.

Public catalogue endpoints:

- `GET /api/artworks` — all published artwork; optional `artist=<artist-slug>`, `featured=true|false`, `q=<search>`, and `limit=<1..100>` filters.
- `GET /api/artworks/featured` — published featured artwork.
- `GET /api/artworks/:slug` — one published artwork with active variants and artist information.
- `GET /api/artists` — artists with published artwork.
- `GET /api/artists/:slug` — one artist profile and published-work count.
- `GET /api/artists/:slug/artworks` — published artwork for one artist.

Admin endpoints (Bearer admin session required):

- `GET /api/admin/artists` and `POST /api/admin/artists` — list/create artists.
- `PATCH /api/admin/artworks/:id` — assign/clear artist, toggle featured, update metadata, or publish/unpublish.
- `GET /api/admin/artworks` — all artwork with variants and artist assignment.

## Printify

Set `PRINTIFY_API_TOKEN` and `PRINTIFY_SHOP_ID` in the root `.env` file. Credentials stay server-side. The API currently includes a configuration status endpoint and protected endpoints to inspect connected Printify shops and products. It does not submit paid orders to Printify yet: that must only be enabled after verified payment, shipping validation, idempotency, and webhook/order reconciliation are implemented.

## Payments

Stripe is disabled by default. Never mark an order paid or send it to Printify merely because a customer submitted a checkout form. Enable payment only after the Stripe checkout and signed webhook flow are configured and tested.

## Admin API

Protected endpoints require `x-admin-key` matching the private `ADMIN_API_KEY` environment variable. This is a local integration gate, not a substitute for a full admin login/session system before public deployment.
