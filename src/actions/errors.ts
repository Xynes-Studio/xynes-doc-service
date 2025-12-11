import { DomainError } from '@xynes/errors';

export class UnknownActionError extends DomainError {
  constructor(actionKey: string) {
    super(`Unknown action: ${actionKey}`, 'UNKNOWN_ACTION', 400);
  }
}
