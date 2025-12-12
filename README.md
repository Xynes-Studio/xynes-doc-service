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
  - `content?: any` - Document content (default: `{}`)
  - `status?: string` - Document status (default: `'draft'`)

### `docs.document.read`
Reads a document by ID.
- **Payload**: `{ id: string }` (UUID)

### `docs.document.update`
Updates a document's content and title.
- **Payload**:
  - `id: string` - Document UUID (required)
  - `title?: string | null` - New title (optional, null to clear)
  - `content?: any` - New content (optional)

### `docs.document.listByWorkspace`
Lists documents for a workspace (paginated).
- **Payload**:
  - `limit?: number` - Items per page (default: `20`)
  - `offset?: number` - Pagination offset (default: `0`)

> Note: If running standalone without the monorepo, libraries are mocked in `src/libs/xynes`.

