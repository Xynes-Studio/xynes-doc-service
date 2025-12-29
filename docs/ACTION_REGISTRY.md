# Internal Action Registry

The Internal Action Registry decouples business logic from HTTP transports (routes/controllers). This allows actions to be dispatched from various sources (HTTP, WebSocket, Internal Job, etc.) uniformly.

## Architecture

- **Registry (`src/actions/registry.ts`)**: Singleton key-value store mapping `DocActionKey` to `ActionHandler`.
- **Types (`src/actions/types.ts`)**: Definitions for Keys, Context, and Handlers.
- **Executor (`src/actions/execute.ts`)**: Central entry point. Validates action existence and invokes handler.

## Usage

### Registering an Action

```typescript
import { registerAction } from 'src/actions/registry';

registerAction('docs.document.create', async (payload, ctx) => {
    // Implementation
    return { id: '...', title: '...', ... };
});
registerAction('docs.document.read', async (payload, ctx) => {
  // Implementation
  return { id: '...', ... };
});
```

### Executing an Action

```typescript
import { executeDocAction } from 'src/actions/execute';

const result = await executeDocAction(
  'docs.document.create', 
  { title: 'New Doc' }, 
  { workspaceId: 'ws-1' }
);
```

## Error Handling

Errors are returned using the platform response envelope. In addition to action-level validation,
the internal HTTP endpoint enforces a maximum JSON request size (returns `413` for oversized bodies).

## Authorization

All document actions are protected by the authz service (DOC-RBAC-1):

- **Write actions** (`create`, `update`) require `X-XS-User-Id` header and authz permission check
- **Read actions** (`read`, `listByWorkspace`) can proceed without `X-XS-User-Id` if authz allows
- Authorization failures return `403 Forbidden`
- Missing `X-XS-User-Id` on write actions returns `401 Unauthorized`
- Authz service errors propagate as `500 Internal Server Error`

## Internal HTTP Endpoint

A single internal HTTP endpoint exposes these actions for inter-service communication.

### `POST /internal/doc-actions`

**Headers:**
- `X-Internal-Service-Token` (required) - Internal service authentication
- `X-Workspace-Id` (required) - Workspace scope for all operations
- `X-XS-User-Id` (required for write actions) - User ID for authorization

**Body:**
```json
{
  "actionKey": "docs.document.create",
  "payload": { ... }
}
```

**Response:**
- `200/201`: Success (Action Result)
- `400`: Validation Error / Unknown Action
- `401`: Unauthorized (missing user ID for write actions)
- `403`: Forbidden (permission denied / invalid service token)
- `413`: Payload Too Large
- `500`: Internal Server Error
