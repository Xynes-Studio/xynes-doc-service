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

### Setup

```bash
bun install
bun run dev
```

### Testing

```bash
bun test                    # All tests
bun test --coverage         # With coverage
```

## Standard Response Envelope

All responses use the platform standard envelope:

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
