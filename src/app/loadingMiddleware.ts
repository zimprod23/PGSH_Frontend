import { type Middleware } from "@reduxjs/toolkit";
import { pending, fulfilled, rejected } from "./loadingSlice";

export const loadingMiddleware: Middleware =
  (api) => (next) => (action: any) => {
    // Check if the action comes from our apiSlice
    if (action.type.startsWith("api/")) {
      if (action.type.endsWith("/pending")) {
        api.dispatch(pending());
      } else if (action.type.endsWith("/fulfilled")) {
        api.dispatch(fulfilled());
      } else if (action.type.endsWith("/rejected")) {
        api.dispatch(rejected());
      }
    }
    return next(action);
  };
