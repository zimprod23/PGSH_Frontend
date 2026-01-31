export interface PGSHToken {
  realm_access?: {
    roles: string[];
  };
  preferred_username: string;
  email: string;
  // Add other custom claims you set in Keycloak here
}

// src/types/api.ts

// Matches your backend ProblemDetails
export interface ApiProblemDetails {
  type?: string; // RFC link or custom type
  title?: string; // Human-readable short message
  status?: number; // HTTP status
  detail?: string; // Optional detailed message
  errors?: Record<string, string[] | string>; // Validation errors
}

// Generic frontend result type
export type ApiResult<T = unknown> =
  | {
      ok: true; // Successful API call
      data: T; // Could be undefined for 204 No Content
    }
  | {
      ok: false; // Failed API call
      error: ApiProblemDetails; // RFC7807 ProblemDetails
    };
