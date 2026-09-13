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
    // ⚠ `errors` sits at the top level of the problem document, not under `extensions` — see the
    // note on `ApiError`. Read from the wrong place it was always undefined, so every refusal
    // showed « Données invalides · One or more validation errors occurred », which names no field
    // and no rule. A refusal the server took the trouble to explain has to be shown.
    const validationErrors = error?.errors;
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

  // ⚠ 503 n'est pas « une erreur serveur » de plus : il dit que l'application est là et que ce dont
  // elle dépend ne l'est pas — une base injoignable, typiquement. Il n'y a rien à corriger dans la
  // demande, et la phrase du serveur est la seule qui dise où aller ; c'est pourquoi ce code est
  // l'exception au masquage des ≥ 500 plus bas (un 500 peut porter n'importe quel interne, un 503
  // est écrit exprès pour être lu). Vécu le 13/09/2026 : WSL s'est mis à jour, PostgreSQL est parti
  // avec la machine Docker, et chaque écran affichait « Une erreur serveur est survenue ».
  if (status === 503) {
    notifications.show({
      title:    'Service indisponible',
      message,
      color:    'red',
      position: 'top-right',
      autoClose: 8000,
      styles:   notifStyles('#EF4444'),
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
