import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import keycloak from "../services/keycloak";

export const baseQuery = fetchBaseQuery({
  // Use a relative path.
  // In Dev: Vite Proxy will catch "/api"
  // In Prod: Nginx or your Gateway will catch "/api"
  baseUrl: "/api",

  prepareHeaders: async (headers) => {
    try {
      await keycloak.updateToken(30);
    } catch (error) {
      console.error("Session expired", error);
    }

    const token = keycloak.token;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
});
