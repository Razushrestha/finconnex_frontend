/**
 * Shared API result / error contract for frontend ↔ backend.
 * Backend should return JSON errors that map to ApiErrorBody.
 */

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "UNAVAILABLE"
  | "INTERNAL"
  | "NETWORK"
  | "NOT_IMPLEMENTED";

export interface ApiErrorBody {
  code: ApiErrorCode | string;
  message: string;
  /** Field-level validation errors (optional). */
  fields?: Record<string, string>;
  /** Stable request id for support / logs. */
  requestId?: string;
  details?: unknown;
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fields?: Record<string, string>;
  readonly requestId?: string;
  readonly details?: unknown;

  constructor(
    status: number,
    body: ApiErrorBody,
  ) {
    super(body.message);
    this.name = "ApiError";
    this.status = status;
    this.code = body.code;
    this.fields = body.fields;
    this.requestId = body.requestId;
    this.details = body.details;
  }

  get isUnauthorized() {
    return this.status === 401 || this.code === "UNAUTHORIZED";
  }

  get isForbidden() {
    return this.status === 403 || this.code === "FORBIDDEN";
  }

  get isNotFound() {
    return this.status === 404 || this.code === "NOT_FOUND";
  }

  get isConflict() {
    return this.status === 409 || this.code === "CONFLICT";
  }

  get isValidation() {
    return this.status === 422 || this.code === "VALIDATION";
  }
}

export type ApiOk<T> = { ok: true; data: T };
export type ApiFail = { ok: false; error: ApiError };
export type ApiResult<T> = ApiOk<T> | ApiFail;

export function apiOk<T>(data: T): ApiOk<T> {
  return { ok: true, data };
}

export function apiFail(error: ApiError): ApiFail {
  return { ok: false, error };
}

export function toApiError(err: unknown, fallbackStatus = 500): ApiError {
  if (err instanceof ApiError) return err;
  if (err instanceof Error) {
    return new ApiError(fallbackStatus, {
      code: "INTERNAL",
      message: err.message,
    });
  }
  return new ApiError(fallbackStatus, {
    code: "INTERNAL",
    message: "Unexpected error",
  });
}
