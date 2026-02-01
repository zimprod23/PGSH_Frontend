// src/api/errorMiddleware.ts
import { isRejectedWithValue, type Middleware } from "@reduxjs/toolkit";
import { notifications } from "@mantine/notifications";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { ApiProblemDetails } from "../common/types";
import keycloak from "../services/keycloak";

export const errorMiddleware: Middleware = () => (next) => (action) => {
  if (isRejectedWithValue(action)) {
    const errorPayload = action.payload as FetchBaseQueryError;
    const status = errorPayload.status;

    const errorData = errorPayload.data as ApiProblemDetails | undefined;

    const message =
      errorData?.title ?? errorData?.detail ?? "An unexpected error occurred";

    if (status === 403 || status === 401) {
      keycloak.logout();
    }

    console.error("[API Error]", { status, errorData });

    notifications.show({
      title: status ? `Error ${status}` : "Error",
      message,
      color: "red",
      position: "top-right",
    });
  }

  return next(action);
};
