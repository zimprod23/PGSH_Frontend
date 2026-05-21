import { isRejectedWithValue, type Middleware } from '@reduxjs/toolkit';
import { notifications } from '@mantine/notifications';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { ApiError } from '../common/types';
import keycloak from '../services/keycloak';

export const errorMiddleware: Middleware = () => (next) => (action) => {
  if (isRejectedWithValue(action)) {
    const payload = action.payload as FetchBaseQueryError;

    if (payload.status === 'FETCH_ERROR') {
      notifications.show({
        title: 'Connexion impossible',
        message: 'Impossible de contacter le serveur. Vérifiez votre connexion.',
        color: 'red',
        position: 'top-right',
        autoClose: 6000,
      });
      return next(action);
    }

    const status = typeof payload.status === 'number' ? payload.status : 0;
    const error = payload.data as ApiError | undefined;
    const message = error?.detail ?? error?.title ?? 'Une erreur est survenue';

    if (status === 401) {
      // Token truly invalid — force re-login
      keycloak.logout();
      return next(action);
    }

    if (status === 403) {
      notifications.show({
        title: 'Accès refusé',
        message: "Vous n'avez pas les droits nécessaires pour effectuer cette action.",
        color: 'red',
        position: 'top-right',
        autoClose: 5000,
      });
      return next(action);
    }

    if (status === 400 || status === 422) {
      // Validation errors are displayed at the form level — only show a brief toast
      const validationErrors = error?.extensions?.errors;
      const detail = validationErrors?.length
        ? validationErrors.map((e) => e.description).join(' · ')
        : message;
      notifications.show({
        title: 'Données invalides',
        message: detail,
        color: 'orange',
        position: 'top-right',
        autoClose: 5000,
      });
      return next(action);
    }

    if (status === 409) {
      notifications.show({
        title: 'Conflit',
        message,
        color: 'orange',
        position: 'top-right',
        autoClose: 5000,
      });
      return next(action);
    }

    // 500+ or any other error
    notifications.show({
      title: status ? `Erreur ${status}` : 'Erreur',
      message: status >= 500 ? 'Une erreur serveur est survenue. Réessayez plus tard.' : message,
      color: 'red',
      position: 'top-right',
      autoClose: 6000,
    });
  }

  return next(action);
};
