import { useKeycloak } from '@react-keycloak/web';

export type UserRole =
  | 'Student'
  | 'Scolarite'
  | 'Secretaire'
  | 'Professor'
  | 'Employee'
  | 'SuperUser';

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
    logout:   () => keycloak.logout(),
  };
};
