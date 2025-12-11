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

Throws `UnknownActionError` (400) if the action key is invalid. Handlers should throw standard DomainErrors.
