import { Navigate, useLocation } from "react-router-dom";
import { Alert, Button, Center, Loader } from "@mantine/core";
import { useAuth, type UserRole } from "../hooks/useAuth";
import { useEffect, useState } from "react";
// import { IconAlertCircle } from "@tabler/icons-react";

interface AuthGuardProps {
  children: React.ReactNode;
  /** If provided, checks if the user has this specific role */
  requiredRole?: UserRole;
}

export const AuthGuard = ({ children, requiredRole }: AuthGuardProps) => {
  const { isAuthenticated, initialized, hasRole, login } = useAuth();
  const location = useLocation();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!initialized) setTimedOut(true);
    }, 8000); // 8 seconds timeout

    return () => clearTimeout(timer);
  }, [initialized]);

  if (timedOut && !initialized) {
    return (
      // <Center h="100vh">
      //   <Alert
      //     icon={<IconAlertCircle size="1rem" />}
      //     title="Service d'authentification indisponible"
      //     color="red"
      //   >
      //     <Stack gap="sm">
      //       <Text>
      //         Nous n'avons pas pu contacter le service d'authentification.
      //         Veuillez vérifier votre connexion ou réessayer plus tard.
      //       </Text>
      //       <Button
      //         variant="outline"
      //         color="red"
      //         onClick={() => window.location.reload()}
      //       >
      //         Réessayer
      //       </Button>
      //     </Stack>
      //   </Alert>
      // </Center>
      <Center h="100vh">
        <Alert color="red" title="Authentification Indisponible" maw={400}>
          Le serveur d'authentification ne répond pas.
          <Button mt="md" fullWidth onClick={() => window.location.reload()}>
            Réessayer
          </Button>
        </Alert>
      </Center>
    );
  }

  // 1. Wait for Keycloak to initialize (Performance: avoid flickering)
  if (!initialized) {
    return (
      <Center style={{ height: "100vh" }}>
        <Loader color="blue" size="xl" type="dots" />
      </Center>
    );
  }

  // 2. If not logged in, redirect to Keycloak Login
  if (!isAuthenticated) {
    login();
    return null;
  }

  // 3. If logged in but lacks the required role
  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }

  // 4. Authorized: Render the protected content
  return <>{children}</>;
};
