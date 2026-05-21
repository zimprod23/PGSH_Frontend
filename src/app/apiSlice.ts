import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import keycloak from '../services/keycloak';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    prepareHeaders: async (headers) => {
      try {
        await keycloak.updateToken(30);
      } catch {
        // Token expired and couldn't refresh — errorMiddleware will handle the 401
      }
      if (keycloak.token) {
        headers.set('Authorization', `Bearer ${keycloak.token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Student', 'History', 'Registration', 'Stage', 'Level', 'Hospital', 'Center', 'Service'],
  endpoints: () => ({}),
});
