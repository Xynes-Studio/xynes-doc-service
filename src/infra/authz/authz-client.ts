/**
 * Authz Service Client
 *
 * DOC-RBAC-1: Client for calling the authz service to check permissions.
 * All document actions must be permission-checked via this client.
 */

import { logger } from '../logger';

export interface AuthzCheckParams {
  userId: string;
  workspaceId: string;
  actionKey: string;
}

export interface AuthzCheckResult {
  allowed: boolean;
}

export interface IAuthzClient {
  check(params: AuthzCheckParams): Promise<AuthzCheckResult>;
}

export class AuthzClient implements IAuthzClient {
  private authzUrl: string;
  private internalServiceToken: string;

  constructor(authzUrl: string, internalServiceToken: string) {
    this.authzUrl = authzUrl;
    this.internalServiceToken = internalServiceToken;
  }

  private static extractAllowed(value: unknown): boolean | null {
    if (!value || typeof value !== 'object') return null;

    // Handle { allowed: boolean } response
    if ('allowed' in value && typeof (value as { allowed?: unknown }).allowed === 'boolean') {
      return (value as { allowed: boolean }).allowed;
    }

    // Handle { ok: true, data: { allowed: boolean } } envelope
    if ('ok' in value && (value as { ok?: unknown }).ok === true && 'data' in value) {
      const data = (value as { data?: unknown }).data;
      if (
        data &&
        typeof data === 'object' &&
        'allowed' in data &&
        typeof (data as { allowed?: unknown }).allowed === 'boolean'
      ) {
        return (data as { allowed: boolean }).allowed;
      }
    }

    return null;
  }

  async check(params: AuthzCheckParams): Promise<AuthzCheckResult> {
    const { userId, workspaceId, actionKey } = params;

    try {
      const response = await fetch(`${this.authzUrl}/authz/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service-Token': this.internalServiceToken,
        },
        body: JSON.stringify({ userId, workspaceId, actionKey }),
      });

      if (!response.ok) {
        logger.warn('[AuthzClient] Authz service returned non-OK status', {
          status: response.status,
          userId,
          workspaceId,
          actionKey,
        });
        return { allowed: false };
      }

      const parsed = await response.json().catch(() => null);
      const allowed = AuthzClient.extractAllowed(parsed);

      if (allowed === null) {
        logger.warn('[AuthzClient] Could not extract allowed from response', {
          userId,
          workspaceId,
          actionKey,
        });
        return { allowed: false };
      }

      return { allowed };
    } catch (error) {
      logger.error('[AuthzClient] Authz check failed', {
        error: (error as Error).message,
        userId,
        workspaceId,
        actionKey,
      });
      // Re-throw to let caller handle - fail-closed at route level
      throw error;
    }
  }
}

/**
 * Creates an AuthzClient instance from environment variables.
 */
export function createAuthzClient(): IAuthzClient {
  const authzUrl = process.env.AUTHZ_SERVICE_URL || 'http://localhost:4300';
  const internalServiceToken = process.env.INTERNAL_SERVICE_TOKEN || '';

  if (!internalServiceToken) {
    logger.warn('[AuthzClient] INTERNAL_SERVICE_TOKEN not set - authz calls will fail');
  }

  return new AuthzClient(authzUrl, internalServiceToken);
}

// Default singleton instance
let defaultClient: IAuthzClient | null = null;

export function getAuthzClient(): IAuthzClient {
  if (!defaultClient) {
    defaultClient = createAuthzClient();
  }
  return defaultClient;
}

// For testing - allows injecting a mock
export function setAuthzClient(client: IAuthzClient): void {
  defaultClient = client;
}

export function resetAuthzClient(): void {
  defaultClient = null;
}
