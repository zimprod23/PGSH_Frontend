import { Navigate, useLocation } from 'react-router-dom';
import { Alert, Button, Center, Loader } from '@mantine/core';
import { useEffect, useState } from 'react';
import { useAuth, type UserRole } from '../hooks/useAuth';
import { PATHS } from '../../routes/paths';

interface Props {
  children: React.ReactNode;
  requiredRole?: UserRole | UserRole[];
}

export function AuthGuard({ children, requiredRole }: Props) {
  const { isAuthenticated, initialized, hasRole, login } = useAuth();
  const location = useLocation();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!initialized) setTimedOut(true);
    }, 8000);
    return () => clearTimeout(timer);
  }, [initialized]);

  if (timedOut && !initialized) {
    return (
      <Center h="100vh">
        <Alert color="red" title="Authentification indisponible" maw={400}>
          Le serveur d'authentification ne répond pas.
          <Button mt="md" fullWidth onClick={() => window.location.reload()}>
            Réessayer
          </Button>
        </Alert>
      </Center>
    );
  }

  if (!initialized) {
    return (
      <Center h="100vh">
        <Loader color="navy" size="xl" type="oval" />
      </Center>
    );
  }

  if (!isAuthenticated) {
    login();
    return null;
  }

  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.some((r) => hasRole(r))) {
      return <Navigate to={PATHS.UNAUTHORIZED} state={{ from: location }} replace />;
    }
  }

  return <>{children}</>;
}
