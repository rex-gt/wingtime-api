# Copilot Instructions for WingTime API

## Project Overview

WingTime API is a Node.js/Express REST API backend for a flying club management system. It handles member management, aircraft scheduling, flight logging, and automated billing. The database is PostgreSQL, accessed via the `pg` connection pool. Authentication uses JWT (via `jsonwebtoken`) and passwords are hashed with `bcryptjs`.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express 4
- **Database**: PostgreSQL (via `pg` pool — see `src/config/database.js`)
- **Auth**: JWT (`jsonwebtoken`) + `bcryptjs` for password hashing
- **Testing**: Jest (`npm test`) — all tests run sequentially with `--runInBand`
- **Dev server**: `nodemon` (`npm run dev`)

## Architecture

The project uses a **Controller-Route** pattern:

- `src/controllers/` — all business logic and raw SQL queries live here; controllers export individual handler functions.
- `src/routes/` — thin Express routers that mount controller handlers and apply `protect` / `authorize` middleware for RBAC.
- `src/middleware/auth.js` — `protect` validates the JWT and attaches `req.user`; `authorize(...roles)` enforces role-based access.
- `src/config/database.js` — exports a single `pg.Pool` instance used everywhere; supports `DATABASE_URL` (Railway/production) or individual `DB_*` env vars (local).
- `src/app.js` — Express app setup: CORS (configurable via `ALLOWED_ORIGINS`), body parsing, route mounting, and error handling.
- `index.js` (root) — HTTP/HTTPS server entry point; `src/index.js` re-exports the app for tests.

## User Roles

Three roles exist — always use these exact strings:

| Role | Description |
|------|-------------|
| `admin` | Full access to all endpoints |
| `operator` | Manage aircraft, reservations, flight logs, and billing |
| `member` | View own data; create/cancel own reservations |

Apply roles in route files using `authorize('admin', 'operator')` etc.

## Conventions

### Adding a New Resource

1. Create `src/controllers/<resource>Controller.js` with async handler functions. Use `pool.query()` directly with parameterized queries (no ORM).
2. Create `src/routes/<resource>Routes.js`. Mount `protect` on all routes; add `authorize(...)` for restricted endpoints.
3. Register the router in `src/app.js` under `/api/<resource>`.
4. Add tests in `test/<resource>.test.js` following the pattern in existing test files (mock `pg` and `jsonwebtoken`, start an HTTP server with `app.listen(0)`).

### Database Queries

- Always use parameterized queries: `pool.query('SELECT ... WHERE id = $1', [id])`.
- Timestamps are stored as `TIMESTAMP WITHOUT TIME ZONE` in UTC. The pool type-parser in `database.js` appends `'Z'` when reading them back — do not change this behavior.

### Error Responses

Return consistent JSON error shapes:

```json
{ "message": "Human-readable error message" }
```

Use appropriate HTTP status codes:
- `400` — missing/invalid fields
- `401` — unauthenticated
- `403` — forbidden (wrong role)
- `404` — resource not found
- `409` — conflict (e.g. duplicate email, overlapping reservation)
- `500` — unexpected server error (handled by global error middleware)

### CORS

Allowed origins are configured via the `ALLOWED_ORIGINS` environment variable (comma-separated). Wildcard prefix patterns like `*.vercel.app` are supported. Do not hard-code origins in application code.

## Environment Variables

Copy `.env.example` to `.env` for local development. Required variables:

| Variable | Description |
|----------|-------------|
| `DB_USER` | PostgreSQL user |
| `DB_HOST` | PostgreSQL host |
| `DB_NAME` | PostgreSQL database name (`flying_club`) |
| `DB_PASSWORD` | PostgreSQL password |
| `DB_PORT` | PostgreSQL port (default `5432`) |
| `JWT_SECRET` | Secret key for signing JWTs — **must be changed in production** |
| `PORT` | HTTP server port (default `3000`) |
| `DATABASE_URL` | Full connection string (overrides `DB_*` vars; used in production/Railway) |
| `ALLOWED_ORIGINS` | Comma-separated allowed CORS origins (optional) |
| `SSL_KEY_PATH` / `SSL_CERT_PATH` | Paths to TLS key/cert for HTTPS (optional) |

## Running & Testing

```bash
# Install dependencies
npm install

# Start development server (auto-restart on changes)
npm run dev

# Run the full test suite (sequential)
npm test
```

### Test Conventions

- Tests live in `test/` and are named `<resource>.test.js`.
- Mock both `pg` and `jsonwebtoken` at the top of every test file using `jest.mock(...)`.
- Spin up a real HTTP server on a random port with `app.listen(0)` in `beforeAll`, and close it in `afterAll`.
- Use raw `http.request` (no test HTTP libraries) — follow the existing `httpRequest` helper pattern.
- Do **not** hit a real database in unit tests; all DB interactions must be intercepted by the `pg` mock.

## Database Schema

The full schema is in `db/schema.sql`. Sample data for manual testing is in `db/sample-data.sql`. Key tables: `members`, `aircraft`, `reservations`, `flight_logs`, `billing_records`.
