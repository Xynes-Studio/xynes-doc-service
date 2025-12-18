# Xynes Doc Service Developer Guide

## Architecture

The Document Service is built using Bun and Hono. It manages documents for the platform.

### Core Components

- **Actions**: Handler functions in `src/actions/` for document operations
- **Routes**: `src/routes/internal.route.ts` handles incoming action requests  
- **Middleware**:
  - `error-handler.ts`: Standardized error envelope responses
- **Schema**: Drizzle ORM schemas in `src/infra/db/`

## Development

### Global Standards

- **Folder Structure**: Feature-based separation in `src/`
- **Testing**: TDD mandatory. 75%+ coverage. Use `bun test`
- **Linting**: Run `bun run lint` before commits
- **Security**: Validate all inputs, cap request sizes, never log secrets

### Setup

```bash
bun install
bun run dev
```

### Testing

```bash
bun run test                     # Unit tests (no DB)
bun run test:coverage            # Unit tests + coverage
bun run test:integration         # Integration tests (requires Postgres)
bun run test:integration:coverage
```

Integration tests are gated behind `RUN_INTEGRATION_TESTS=true` to avoid accidental DB runs:

```bash
RUN_INTEGRATION_TESTS=true bun run test:integration
```

### Environment

- Scripts load `.env.dev` by default (Docker/dev). Override for host runs:
  - macOS/Linux (bash/zsh): `XYNES_ENV_FILE=.env.localhost bun run dev`
  - Windows (PowerShell): `$env:XYNES_ENV_FILE=".env.localhost"; bun run dev`
- JSON request bodies for `POST /internal/doc-actions` are capped by `MAX_JSON_BODY_BYTES` (default: `1048576`).

### Local DB (SSH Tunnel)

For any database-related work against the remote host, use an SSH tunnel:

```bash
ssh -N -L 5432:127.0.0.1:5432 xynes@84.247.176.134
```

## Routes

- `GET /health`: Liveness check. Returns `{ "status": "ok", "service": "xynes-doc-service" }`.
- `GET /ready`: Readiness check. Runs a fast Postgres check and returns `{ "status": "ready" }` (or 503 with error).

## Standard Response Envelope

All responses use the platform standard envelope, **except for** `/health` and `/ready` which follow a simplified format for infrastructure checks.

**Success**:
```json
{ "ok": true, "data": {...}, "meta": { "requestId": "req-..." } }
```

**Error**:
```json
{
  "ok": false,
  "error": { "code": "ERROR_CODE", "message": "...", "details": {...} },
  "meta": { "requestId": "req-..." }
}
```

## Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `VALIDATION_ERROR` | 400 | Payload validation failed |
| `UNKNOWN_ACTION` | 400 | Action key not registered |
| `NOT_FOUND` | 404 | Document not found |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

## Action Contracts

The internal action registry is exposed via `POST /internal/doc-actions` and requires `X-Workspace-Id`.

- `docs.document.update`
  - Validates `id` and requires at least one of `title`, `content`, `status`
  - Enforces workspace scoping via `ctx.workspaceId` (404 if not found in workspace)
  - Updates `updatedAt` and returns the updated document

- `docs.document.listByWorkspace`
  - Uses `ctx.workspaceId`
  - Returns a light DTO ordered by `createdAt DESC`: `id`, `title`, `status`, `createdAt`, `updatedAt`
