import { DomainError } from '@xynes/errors';

export class UnknownActionError extends DomainError {
  constructor(actionKey: string) {
    super(`Unknown action: ${actionKey}`, 'UNKNOWN_ACTION', 400);
  }
}

export class NotFoundError extends DomainError {
  constructor(resource: string, id: string) {
    super(`${resource} not found with id ${id}`, 'NOT_FOUND', 404);
  }
}

/**
 * DOC-RBAC-1: Thrown when user is not authenticated but action requires authentication.
 */
export class UnauthorizedError extends DomainError {
  constructor(message: string = 'Authentication required') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

/**
 * DOC-RBAC-1: Thrown when user doesn't have permission to perform an action.
 */
export class ForbiddenError extends DomainError {
  constructor(message: string = 'Permission denied') {
    super(message, 'FORBIDDEN', 403);
  }
}
