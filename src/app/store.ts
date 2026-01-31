import { configureStore } from "@reduxjs/toolkit";
import {
  type TypedUseSelectorHook,
  useDispatch,
  useSelector,
} from "react-redux";
import { apiSlice } from "./apiSlice";
import errorReducer from "./state/errorSlice";
import loadingReducer from "./loadingSlice";
import { createLogger } from "redux-logger";
import { errorMiddleware } from "./errorMiddleware";
import { loadingMiddleware } from "./loadingMiddleware";

const loggerMiddleware = createLogger({
  collapsed: true,
  timestamp: false,
  duration: true,
  colors: {
    title: () => "#139BFE",
    action: () => "#149945",
    error: () => "#ff0005",
  },
});

export const store = configureStore({
  reducer: {
    [apiSlice.reducerPath]: apiSlice.reducer,
    error: errorReducer,
    loading: loadingReducer,
    // Add your other slices here as we build them (e.g., UI, local state)
  },
  middleware: (getDefaultMiddleware) => {
    const middleware = getDefaultMiddleware({
      serializableCheck: false, // Cleaner for dev with Keycloak objects
    }).concat(apiSlice.middleware, errorMiddleware, loadingMiddleware);

    // Only log in development for performance
    return import.meta.env.DEV
      ? middleware.concat(loggerMiddleware)
      : middleware;
  },
  devTools: import.meta.env.DEV,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
