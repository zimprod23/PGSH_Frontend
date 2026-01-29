import { isRejectedWithValue, type Middleware } from "@reduxjs/toolkit";
import { notifications } from "@mantine/notifications";
import { type FetchBaseQueryError } from "@reduxjs/toolkit/query";

export const rtkQueryErrorLogger: Middleware = () => (next) => (action) => {
  if (isRejectedWithValue(action)) {
    // Cast the payload to FetchBaseQueryError to access 'status' and 'data'
    const errorPayload = action.payload as FetchBaseQueryError;

    const status = errorPayload.status;
    const errorData = errorPayload.data as any; // Cast data to any to access your custom fields

    // Extract message based on your ApiResponse structure { success: false, error: "..." }
    const message =
      errorData?.error || errorData?.message || "An unexpected error occurred";

    console.error(`[API Error] Status: ${status}`, errorData);

    notifications.show({
      title: `Error ${status ?? ""}`,
      message: typeof message === "string" ? message : "Action failed",
      color: "red",
      position: "top-right",
    });
  }

  return next(action);
};
