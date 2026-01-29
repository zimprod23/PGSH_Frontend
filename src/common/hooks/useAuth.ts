import { useKeycloak } from "@react-keycloak/web";

// Define roles as a type to prevent magic strings elsewhere
export type UserRole = "Student" | "Admin" | "Employee";

export const useAuth = () => {
  const { keycloak, initialized } = useKeycloak();

  const login = () => keycloak.login();
  const logout = () => keycloak.logout();
  const isAuthenticated = !!keycloak.authenticated;
  const token = keycloak.token;

  /**
   * Optimal Role Check
   * Uses the Type 'UserRole' to ensure we only check for valid platform roles.
   */
  const hasRole = (role: UserRole) => keycloak.hasRealmRole(role);

  return {
    isAuthenticated,
    initialized,
    token,
    login,
    logout,
    hasRole,
    username: keycloak.tokenParsed?.preferred_username,
    email: keycloak.tokenParsed?.email, // Added for Profile UI later
  };
};
