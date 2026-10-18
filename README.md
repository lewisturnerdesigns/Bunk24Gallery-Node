# BUNK24 Gallery

A local-first monorepo for the BUNK24 art gallery.

## Stack

- Web: Next.js, React, TypeScript, Tailwind CSS
- API: NestJS REST API
- Database: MySQL with Prisma
- Local development: Windows, no Docker required

## Prerequisites

- Node.js 22 or newer
- MySQL Server 8 or newer

## Setup

1. Copy .env.example to .env and update the MySQL credentials.
2. Install dependencies with npm install.
3. Generate the Prisma client with npm run db:generate.
4. Apply database migrations with npm run db:migrate.
5. Start the web app and API with npm run dev.

The web app runs at http://localhost:3000 and the API at http://localhost:8000. The API health endpoint is http://localhost:8000/api/health.

Stripe is intentionally disabled until configured. Do not commit .env or secrets.
