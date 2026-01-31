import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import keycloak from "../services/keycloak";

// Keep your standard response interface
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

const baseQuery = fetchBaseQuery({
  baseUrl: "/api", // Vite Proxy handles this
  prepareHeaders: async (headers) => {
    // OPTIMAL: Keycloak handles token validity
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

const baseQueryWithFormat: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  try {
    const result = await baseQuery(args, api, extraOptions);

    // 1. Handle Network/Server Errors
    if (result.error) {
      const status = result.error.status;

      // Log the actual error object for debugging
      console.error("[API Error Details]:", {
        status,
        data: result.error.data,
        originalStatus: (result.error as any).originalStatus,
      });

      if (status === 401 || status === 403) {
        // keycloak.logout();
        console.warn("Unauthorized access - logging out");
      }

      return result;
    }

    // 2. Data Standardization
    // If your backend returns { success: false, error: "..." } with a 200 OK status,
    // you should handle that logic here.
    return result;
  } catch (error: any) {
    // This catches logic crashes inside this function
    return {
      error: {
        status: "CUSTOM_ERROR",
        error: error.message || "An internal slice error occurred",
        data: error,
      } as any,
    };
  }
};

// const baseQueryWithFormat: BaseQueryFn<
//   string | FetchArgs,
//   unknown,
//   FetchBaseQueryError
// > = async (args, api, extraOptions) => {
//   const result = await baseQuery(args, api, extraOptions);

//   // 1. Handle Network/Server Errors
//   if (result.error) {
//     const status = result.error.status;
//     if (status === 401 || status === 403) {
//       // Logic for unauthorized (e.g., keycloak.logout())
//       keycloak.logout();
//     }
//     if (status === 500) {
//       console.error("Server error occurred");
//     }
//     return result;
//   }

//   // 2. Standardize data (Your previous project's "success" check logic)
//   // If your C# backend uses a Result pattern that returns { success, data, error }
//   return result;
// };

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithFormat,
  tagTypes: ["Student", "History", "Registration"],
  endpoints: () => ({}),
});
