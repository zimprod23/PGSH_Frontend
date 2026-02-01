import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import keycloak from "../services/keycloak";
import type { ApiResult } from "../common/types";

// Keep your standard response interface
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

const baseQuery = fetchBaseQuery({
  baseUrl: "/api",
  prepareHeaders: async (headers) => {
    try {
      await keycloak.updateToken(30);
    } catch (e) {
      console.error("Auth refresh failed");
    }

    const token = keycloak.token;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return headers;
  },
});

// BaseQuery wrapper
export const baseQueryWithFormat: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  try {
    const result = await baseQuery(args, api, extraOptions);

    // 1️⃣ Pass through errors — handled by errorMiddleware
    if (result.error) return result;

    // 2️⃣ Normalize successful responses
    const normalized: ApiResult = {
      ok: true,
      data: result.data ?? undefined,
    };

    return { data: normalized };
  } catch (error: any) {
    // Unexpected runtime/slice errors
    return {
      error: {
        status: "CUSTOM_ERROR",
        error: error.message || "Internal slice error",
        data: error,
      } as any,
    };
  }
};

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithFormat,
  tagTypes: ["Student", "History", "Registration"],
  endpoints: () => ({}),
});
