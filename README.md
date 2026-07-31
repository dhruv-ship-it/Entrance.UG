# Entrance UG

Production-oriented EdTech monorepo. The first complete Student slice is implemented: authentication, protected dashboard shell, profile management, notifications, and a live overview.

## Local development

1. Start local infrastructure: `docker compose up -d`.
2. Copy `apps/api/.env.example` to `apps/api/.env` and replace both JWT secrets with distinct, random strings of at least 32 characters. PostgreSQL is exposed on host port `5433` to avoid conflicting with an existing local PostgreSQL installation.
3. Install packages: `npm install`.
4. Apply migrations: `npm run db:deploy`.
5. Start both applications: `npm run dev`.

The web app runs on `http://localhost:5173` and the API on `http://localhost:4000`. For separate terminals, use `npm run dev:api` and `npm run dev:web` from the repository root.

## Currently implemented

- Student signup and role-selecting login with JWT in HTTP-only cookies.
- Protected Student dashboard overview backed by live Prisma queries.
- Student profile read/update, including profile-image URL support.
- Student-specific and dashboard-notice notifications.

The mock, content, mentorship, RC, purchase, and test-engine modules are intentionally not started yet; they will each be delivered as complete feature slices.

PostgreSQL and Redis are the only Dockerised services. The API remains a normal local Node process.
