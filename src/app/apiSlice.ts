import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import keycloak from '../services/keycloak';

// RTK Query's default URLSearchParams serializer converts arrays to comma-separated
// strings ("cohortIds=1,2") instead of repeated params ("cohortIds=1&cohortIds=2").
// ASP.NET Core minimal API needs the repeated form for int[] binding.
function paramsSerializer(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      value.forEach((item) => search.append(key, String(item)));
    } else {
      search.append(key, String(value));
    }
  }
  return search.toString();
}

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    paramsSerializer,
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
  tagTypes: ['Student', 'History', 'Registration', 'Stage', 'Level', 'Hospital', 'Center', 'Service', 'User', 'Assignment', 'Employee'],
  endpoints: () => ({}),
});
