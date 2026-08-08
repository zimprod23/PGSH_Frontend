import { isRejectedWithValue, type Middleware } from '@reduxjs/toolkit';
import { notifications } from '@mantine/notifications';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { ApiError } from '../common/types';
import { notifStyles } from '../common/hooks/useNotify';
import keycloak from '../services/keycloak';
import { PATHS } from '../routes/paths';

/**
 * RTK Query stamps every thunk with the endpoint kind it came from. Reading it lets the middleware
 * treat "the thing you asked for is not there" differently from "the change you asked for failed".
 */
function isQuery(action: unknown): boolean {
  const meta = (action as { meta?: { arg?: { type?: string } } })?.meta;
  return meta?.arg?.type === 'query';
}

export const errorMiddleware: Middleware = () => (next) => (action) => {
  if (!isRejectedWithValue(action)) return next(action);

  const payload = action.payload as FetchBaseQueryError;

  if (payload.status === 'FETCH_ERROR') {
    notifications.show({
      title:    'Connexion impossible',
      message:  'Impossible de contacter le serveur. Vérifiez votre connexion.',
      color:    'red',
      position: 'top-right',
      autoClose: 6000,
      styles:   notifStyles('#EF4444'),
    });
    return next(action);
  }

  const status = typeof payload.status === 'number' ? payload.status : 0;
  const error  = payload.data as ApiError | undefined;
  const message = error?.detail ?? error?.title ?? 'Une erreur est survenue';

  if (status === 401) {
    keycloak.logout();
    return next(action);
  }

  if (status === 403) {
    // No local DB profile for this Keycloak account → redirect out of the shell
    if (
      error?.title === 'Profile Not Found' &&
      window.location.pathname !== PATHS.NO_PROFILE
    ) {
      window.location.replace(PATHS.NO_PROFILE);
      return next(action);
    }

    notifications.show({
      title:    'Accès refusé',
      message:  "Vous n'avez pas les droits nécessaires pour effectuer cette action.",
      color:    'red',
      position: 'top-right',
      autoClose: 5000,
      styles:   notifStyles('#EF4444'),
    });
    return next(action);
  }

  if (status === 400 || status === 422) {
    const validationErrors = error?.extensions?.errors;
    const detail = validationErrors?.length
      ? validationErrors.map((e) => e.description).join(' · ')
      : message;
    notifications.show({
      title:    'Données invalides',
      message:  detail,
      color:    'orange',
      position: 'top-right',
      autoClose: 5000,
      styles:   notifStyles('#F59E0B'),
    });
    return next(action);
  }

  if (status === 409) {
    notifications.show({
      title:    'Conflit',
      message,
      color:    'orange',
      position: 'top-right',
      autoClose: 5000,
      styles:   notifStyles('#F59E0B'),
    });
    return next(action);
  }

  // A 404 from a *query* is "this does not exist yet", which is a state the screen renders itself —
  // the CNPN page shows an inline "aucune exigence enregistrée" panel and then used to stack two red
  // "Erreur 404" toasts on top of it. A 404 from a *mutation* is a real failure and still toasts:
  // you asked to change something that is not there.
  if (status === 404 && isQuery(action)) {
    return next(action);
  }

  // 500+ or any other status
  notifications.show({
    title:    status ? `Erreur ${status}` : 'Erreur',
    message:  status >= 500 ? 'Une erreur serveur est survenue. Réessayez plus tard.' : message,
    color:    'red',
    position: 'top-right',
    autoClose: 6000,
    styles:   notifStyles('#EF4444'),
  });

  return next(action);
};
