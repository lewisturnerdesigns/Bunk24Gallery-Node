# BUNK24 Gallery

A local-first monorepo for the BUNK24 art gallery.

## Stack

- Web: Next.js, React, TypeScript
- API: NestJS REST API
- Database: MySQL with Prisma
- Local development: Windows, no Docker required

## Prerequisites

- Node.js 22 or newer
- MySQL Server 8 or newer

## Setup on Windows

1. In MySQL Workbench or another MySQL client, run this once as an account allowed to create users and databases:

   ```sql
   CREATE DATABASE bunk24_gallery CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'bunk24_app'@'localhost' IDENTIFIED BY 'choose-a-local-password';
   GRANT ALL PRIVILEGES ON bunk24_gallery.* TO 'bunk24_app'@'localhost';
   ```

   If you already created the database or user, do not create them again. Update the grants/password as needed instead.

2. Copy `.env.example` to `.env` in the repository root.
3. Edit `DATABASE_URL` in `.env` to use the same MySQL password. URL-encode special characters in the password (for example, `@` becomes `%40`).
4. From the repository root, run:

   ```powershell
   npm install
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   npm run dev
   ```

The web app runs at http://localhost:3000 and the API health endpoint is http://localhost:8000/api/health.

Stripe is intentionally disabled until configured. Do not commit `.env` or secrets.
