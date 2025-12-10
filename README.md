# Xynes Doc Service

Service responsible for managing document APIs in the Xynes platform.

## Global Standards

- **Runtime**: Bun
- **Framework**: Hono (optimized for Bun)
- **Database**: Postgres (via Drizzle ORM)
- **Language**: TypeScript
- **Testing**: Bun Test (Aim for > 75% coverage)
- **Linting**: ESLint + Prettier

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

> Note: If running standalone without the monorepo, these are mocked in `src/libs/xynes`.
