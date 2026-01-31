/**
 * Application Configuration Service
 * Provides a single source of truth for environment variables.
 */
export const CONFIG = {
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL,
  },
  keycloak: {
    url: "http://localhost:8082", //import.meta.env.VITE_KEYCLOAK_URL,
    realm: "pgsh", // import.meta.env.VITE_KEYCLOAK_REALM,
    clientId: "pgsh-frontend", //import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
  },
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  isMaintenanceMode: import.meta.env.VITE_MAINTENANCE_MODE === "true",
} as const;

// Optional: Validation check to ensure critical variables exist
const requiredKeys: (keyof typeof CONFIG.keycloak)[] = [
  "url",
  "realm",
  "clientId",
];
requiredKeys.forEach((key) => {
  if (!CONFIG.keycloak[key]) {
    console.error(`Configuration Error: Keycloak ${key} is missing in .env`);
  }
});
