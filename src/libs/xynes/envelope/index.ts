/**
 * Standard API Response Envelope Types
 * Provides consistent response structure across all platform services.
 */

import { ZodError, type ZodIssue } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiMeta {
  requestId: string;
}

export interface ApiSuccess<T> {
  ok: true;
  data: T;
  meta?: ApiMeta;
}

export interface ApiErrorDetails {
  issues?: Array<{ path: (string | number)[]; message: string; code?: string }>;
  [key: string]: unknown;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: ApiErrorDetails;
}

export interface ApiError {
  ok: false;
  error: ApiErrorPayload;
  meta?: ApiMeta;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─────────────────────────────────────────────────────────────────────────────
// Factory Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a successful API response envelope.
 */
export function createSuccessResponse<T>(data: T, requestId?: string): ApiSuccess<T> {
  const response: ApiSuccess<T> = {
    ok: true,
    data,
  };

  if (requestId) {
    response.meta = { requestId };
  }

  return response;
}

/**
 * Creates an error API response envelope.
 */
export function createErrorResponse(
  code: string,
  message: string,
  requestId?: string,
  details?: ApiErrorDetails,
): ApiError {
  const response: ApiError = {
    ok: false,
    error: { code, message },
  };

  if (details) {
    response.error.details = details;
  }

  if (requestId) {
    response.meta = { requestId };
  }

  return response;
}

// ─────────────────────────────────────────────────────────────────────────────
// Zod Error Formatting
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formats a Zod error into the standard ApiErrorDetails shape.
 * Extracts field paths and messages for client-friendly validation feedback.
 */
export function formatZodError(error: ZodError): ApiErrorDetails {
  return {
    issues: error.issues.map((issue: ZodIssue) => ({
      path: issue.path,
      message: issue.message,
      code: issue.code,
    })),
  };
}

/**
 * Creates a validation error response from a Zod error.
 * Convenience function combining createErrorResponse with formatZodError.
 */
export function createValidationErrorResponse(
  error: ZodError,
  requestId?: string,
  message = 'Payload validation failed',
): ApiError {
  return createErrorResponse('VALIDATION_ERROR', message, requestId, formatZodError(error));
}
