import { useKeycloak } from '@react-keycloak/web';
import { Roles, type UserRole } from '../constants/roles';

export type { UserRole };

export const useAuth = () => {
  const { keycloak, initialized } = useKeycloak();

  return {
    initialized,
    isAuthenticated: !!keycloak.authenticated,
    userId:   keycloak.subject ?? null,
    email:    keycloak.tokenParsed?.['email'] as string | undefined,
    username: keycloak.tokenParsed?.['preferred_username'] as string | undefined,
    hasRole:  (role: UserRole) => keycloak.hasRealmRole(role),
    login:    () => keycloak.login(),
    logout:   () => keycloak.logout({ redirectUri: window.location.origin }),
  };
};

export { Roles };
