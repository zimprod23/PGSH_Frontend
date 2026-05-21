export const CONFIG = {
  keycloak: {
    url:      import.meta.env.VITE_KEYCLOAK_URL      ?? 'http://localhost:8082',
    realm:    import.meta.env.VITE_KEYCLOAK_REALM    ?? 'pgsh',
    clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? 'pgsh-frontend',
  },
  isDevelopment:    import.meta.env.DEV,
  isProduction:     import.meta.env.PROD,
  isMaintenanceMode: import.meta.env.VITE_MAINTENANCE_MODE === 'true',
} as const;
