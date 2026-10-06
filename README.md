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

The host-run development server defaults to `http://localhost:3000`. The H-5
production image sets the platform service port to `4201`.

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
| XYNES_BUILD_VERSION | Version reported by `GET /health` | dev |
| MAX_JSON_BODY_BYTES | Max JSON request body size (bytes) | 1048576 |
| INTERNAL_REQUEST_TRUST_FILE | Receiver public trust JSON | required for internal actions |
| INTERNAL_REQUEST_PRIVATE_KEY_FILE | Docs-owned Ed25519 signing file for authz checks | required for protected authoring |
| INTERNAL_REQUEST_KEY_ID | Docs signing key id | provisioned key id |

### Internal Authentication

Internal requests require Ed25519 signatures bound to receiver, operation, exact body and actor/workspace/request headers. Shared tokens, HS256 service tokens and hybrid fallback are rejected.

Receivers require `INTERNAL_REQUEST_TRUST_FILE` containing only permitted callers' public keys. Callers require their own `INTERNAL_REQUEST_PRIVATE_KEY_FILE` and `INTERNAL_REQUEST_KEY_ID`. Never distribute a caller private key in a shared env file or mount it in a sibling. Deploy all seven compatible services together and follow the identity runbook at `xynes/xynes-infra/infra/release/INTERNAL-REQUEST-IDENTITIES.md` (workspace-root relative) for provisioning and rotation. Protocol source and checked mirrors belong to platform-contracts.

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
