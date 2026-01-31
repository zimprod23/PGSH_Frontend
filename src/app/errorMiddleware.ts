import { isRejectedWithValue, type Middleware } from "@reduxjs/toolkit";
import { notifications } from "@mantine/notifications";
import { type FetchBaseQueryError } from "@reduxjs/toolkit/query";

type BackendApiError = {
  status: number;
  title: string;
  type?: string;
};

export const errorMiddleware: Middleware = () => (next) => (action) => {
  if (isRejectedWithValue(action)) {
    // Cast the payload to FetchBaseQueryError to access 'status' and 'data'
    const errorPayload = action.payload as FetchBaseQueryError;

    const status = errorPayload.status;
    const errorData = errorPayload.data as unknown as BackendApiError; // Cast data to any to access your custom fields

    // Extract message based on your ApiResponse structure { success: false, error: "..." }
    const message = errorData?.title || "An unexpected error occurred";

    console.error(`[API Error] Status: ${status}`, errorData);
    // alert(`[API Error] ${message}`);
    notifications.show({
      title: `Error ${status ?? ""}`,
      message: typeof message === "string" ? message : "Action failed",
      color: "red",
      position: "top-right",
    });
  }

  return next(action);
};
