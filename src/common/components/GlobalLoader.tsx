import { LoadingOverlay } from "@mantine/core";
import { useSelector } from "react-redux";
import { useDisclosure } from "@mantine/hooks";
import { useEffect } from "react";
import type { RootState } from "../../app/store";

export function GlobalLoader() {
  const activeRequests = useSelector(
    (state: RootState) => state.loading.activeRequests,
  );
  const isLoading = activeRequests > 0;

  const [visible, { open, close }] = useDisclosure(false);

  useEffect(() => {
    // FIX: Using 'number' or 'any' or the ReturnType helper is safer for Vite
    let timeout: ReturnType<typeof setTimeout>;

    if (isLoading) {
      // Show loader only for requests > 250ms for optimal UX
      timeout = setTimeout(open, 250);
    } else {
      close();
    }

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [isLoading, open, close]);

  return (
    <LoadingOverlay
      visible={visible}
      zIndex={2000} // Ensure it's above everything
      overlayProps={{ blur: 1 }}
      loaderProps={{ type: "bars" }}
    />
  );
}
