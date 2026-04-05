# AeroBook API - Gemini CLI Guide

This document provides context and guidelines for Gemini CLI when working on the AeroBook API project.

## Project Overview
AeroBook API is a Node.js/Express REST API backend for a flying club management system. It handles member management, aircraft scheduling, flight logging, and automated billing.

## Tech Stack
- **Runtime**: Node.js
- **Framework**: Express 4
- **Database**: PostgreSQL (via `pg` pool) - **No ORM used.**
- **Authentication**: JWT (`jsonwebtoken`) + `bcryptjs` for password hashing.
- **Testing**: Jest (run sequentially with `npm test`).
- **Deployment**: Railway (configured via `scripts/railway/`).

## Architecture & Patterns
- **Controller-Route Pattern**: 
    - `src/controllers/`: Business logic and raw SQL queries.
    - `src/routes/`: Express routers, mounting controllers and auth middleware.
- **Database Access**: Always use `pool.query()` with parameterized queries from `src/config/database.js`.
- **Middleware**: `src/middleware/auth.js` handles `protect` (JWT validation) and `authorize` (RBAC).
- **Entry Points**: 
    - `index.js`: Main server entry.
    - `src/app.js`: Express app configuration.
    - `src/index.js`: Re-exports app for testing.
## Core Mandates & Constraints
1. **No ORM**: Do not introduce an ORM. Use raw SQL with the `pg` pool.
2. **Commit Approval**: NEVER perform a `git commit` or `git push` without receiving explicit approval from the user for that specific set of changes.
3. **Security**: 
...
    - Use parameterized queries (`$1`, `$2`, etc.) to prevent SQL injection.
    - Always use `protect` and `authorize` middleware for sensitive routes.
3. **Roles**: Use exact strings: `admin`, `operator`, `member`.
4. **Error Handling**: Return JSON: `{ "message": "Error description" }`.
5. **Testing**: 
    - Tests live in `test/`.
    - Mock `pg` and `jsonwebtoken`.
    - Run tests sequentially: `npm test` (uses `--runInBand`).
    - Use the `httpRequest` helper pattern found in existing tests.
6. **Timestamps**: Stored as `TIMESTAMP WITHOUT TIME ZONE` (UTC). The `database.js` type-parser appends `'Z'`.

## Common Workflows
- **Adding a Resource**: Create controller -> Create route -> Register in `app.js` -> Add test.
- **Database Changes**: Update `db/schema.sql` and `db/sample-data.sql`.
- **Environment**: Copy `.env.example` to `.env`.

## Key Files
- `src/config/database.js`: DB connection pool configuration.
- `src/middleware/auth.js`: Authentication and Authorization logic.
- `src/app.js`: Global middleware and route registrations.
- `db/schema.sql`: Database schema definition.
