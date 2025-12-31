# Xynes Doc Service

Service responsible for managing document APIs in the Xynes platform.

## Global Standards

- **Runtime**: Bun
- **Framework**: Hono (optimized for Bun)
- **Database**: Postgres (via Drizzle ORM)
- **Language**: TypeScript
- **Testing**: Bun Test (Aim for > 75% coverage)
- **Linting**: ESLint + Prettier
- **Migrations**: Drizzle Kit

## Structure

```
src/
├── app.ts                 # Application setup (Hono)
├── index.ts               # Entry point (Server listener)
├── routes/                # Route definitions
├── controllers/           # Request handlers
├── middleware/            # Custom middleware (Error handling, Auth)
├── domain/                # Business logic & Types
└── infra/
    ├── config.ts          # Environment configuration
    ├── logger.ts          # Structured logging
    ├── http/              # HTTP helpers (body parsing, requestId)
    └── db/                # Database connection & Schema
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) (latest)
- Postgres Database

### Installation

```sh
bun install
```

### Development

Start the development server with hot-reload:

```sh
bun run dev
```

Server runs on `http://localhost:3000` by default.

### Testing

Run unit & integration tests:

```sh
bun test
```

Run with coverage:

```sh
bun test --coverage
```

### Database & Migrations

Run migrations to sync the schema:

```sh
bun run migrate
```

This applies changes from `src/infra/db/schema.ts` to the connected database.


### Linting

Check code quality:

```sh
bun run lint
```

Fix issues:

```sh
bun run lint:fix
```

## Environment Variables

Copy `.env.example` to `.env` (creates automatically if using `bun init` or manually).

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server Port | 3000 |
| DATABASE_URL | Postgres Connection String | postgres://localhost:5432/xynes_docs |
| NODE_ENV | Environment | development |
| MAX_JSON_BODY_BYTES | Max JSON request body size (bytes) | 1048576 |
| INTERNAL_JWT_SIGNING_KEY | HS256 signing key for JWT-based internal auth (≥32 bytes recommended) | (required for jwt mode) |
| INTERNAL_AUTH_MODE | Authentication mode: `jwt` (JWT only) or `hybrid` (JWT + legacy token) | hybrid |
| INTERNAL_SERVICE_TOKEN | Legacy shared secret for `/internal/*` endpoints (hybrid mode only) | (required for hybrid mode) |

### Internal Authentication (SEC-INTERNAL-AUTH-2)

This service supports JWT-based authentication for internal service-to-service calls. The authentication mode is controlled by `INTERNAL_AUTH_MODE`:

**JWT Mode (`INTERNAL_AUTH_MODE=jwt`)**
- Only accepts signed JWTs from the gateway
- Requires `INTERNAL_JWT_SIGNING_KEY` to be set
- Production-recommended setting

**Hybrid Mode (`INTERNAL_AUTH_MODE=hybrid`, default)**
- Accepts both JWT tokens and legacy static tokens
- Useful during migration from legacy to JWT-based auth
- Requires either `INTERNAL_JWT_SIGNING_KEY` or `INTERNAL_SERVICE_TOKEN` (or both)

#### Migration Guide: Legacy Tokens → JWT Authentication

1. **Phase 1 - Deploy with Hybrid Mode**
   ```bash
   INTERNAL_AUTH_MODE=hybrid
   INTERNAL_JWT_SIGNING_KEY=<your-32-byte-secret>
   INTERNAL_SERVICE_TOKEN=<your-legacy-token>
   ```

2. **Phase 2 - Verify JWT Auth Working**
   - Monitor logs for `[InternalAuth] JWT verification` messages
   - Confirm requests are being authenticated via JWT

3. **Phase 3 - Switch to JWT-Only Mode**
   ```bash
   INTERNAL_AUTH_MODE=jwt
   INTERNAL_JWT_SIGNING_KEY=<your-32-byte-secret>
   # Remove INTERNAL_SERVICE_TOKEN
   ```

4. **Phase 4 - Remove Legacy Token**
   - Remove `INTERNAL_SERVICE_TOKEN` from all services
   - Update gateway to only send JWTs

## Shared Libraries

This service relies on:
- `@xynes/config`: For typed env parsing.
- `@xynes/errors`: For standard error classes.
- `@xynes/contracts`: For shared types.

## Actions

### `docs.document.create`
Creates a new document.
- **Payload**:
  - `title?: string` - Document title (optional)
  - `type?: string` - Document type (default: `'doc'`)
  - `content?: object | any[]` - Document editor JSON (default: `{}`)
  - `status?: "draft" | "published"` - Document status (default: `'draft'`)

### `docs.document.read`
Reads a document by ID.
- **Payload**: `{ id: string }` (UUID)

### `docs.document.update`
Updates a document (partial update).
- **Payload**:
  - `id: string` - Document UUID (required)
  - `title?: string | null` - New title (optional, null to clear)
  - `content?: object | any[]` - New editor JSON (optional)
  - `status?: "draft" | "published"` - New status (optional)

- **Rules**:
  - `id` is required
  - at least one of `title`, `content`, `status` must be provided
  - document must exist in `docs.documents` for `ctx.workspaceId` (404 otherwise)
  - updates `updatedAt` and returns the updated document

### `docs.document.listByWorkspace`
Lists documents for a workspace (paginated).
- **Payload**:
  - `limit?: number` - Items per page (default: `20`)
  - `offset?: number` - Pagination offset (default: `0`)

 - **Returns**: documents ordered by `createdAt DESC` with a light DTO:
   - `id`, `title`, `status`, `createdAt`, `updatedAt`

> Note: If running standalone without the monorepo, libraries are mocked in `src/libs/xynes`.
