import { Center, Loader } from '@mantine/core';

/**
 * The Suspense fallback every lazily-loaded route shares.
 *
 * Its own file because the router module exports the route configuration, not components — mixing
 * the two is what stops react-refresh hot-reloading either.
 */
export const PageLoader = () => (
  <Center h="100vh">
    <Loader color="navy" size="md" />
  </Center>
);
