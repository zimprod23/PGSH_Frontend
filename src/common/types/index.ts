export interface PGSHToken {
  realm_access?: {
    roles: string[];
  };
  preferred_username: string;
  email: string;
  // Add other custom claims you set in Keycloak here
}
