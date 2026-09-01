import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";
import "./index.css";

import React from "react";
import ReactDOM from "react-dom/client";
import { ReactKeycloakProvider } from "@react-keycloak/web";
import { MantineProvider } from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import "dayjs/locale/fr";
import { Provider } from "react-redux";

import type Keycloak from "keycloak-js";
import keycloak from "./services/keycloak";
import { store } from "./app/store";
import App from "./App";

import { CONFIG } from "./app/config";
import { MaintenancePage } from "./features/errors/MaintenancePage";
import { theme } from "./common/components/Theme";

const initOptions = {
  // onLoad: "check-sso", // Checks if user is already logged in without forcing redirect immediately
  pkceMethod: "S256", // Best practice for performance and security in 2026
  // silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
};

/**
 * What `ReactKeycloakProvider` hands its `onTokens` callback. Expressed from `keycloak-js` — a
 * direct dependency — rather than imported from @react-keycloak/core, which is only transitive:
 * this is the same shape its `AuthClientTokens` declares.
 */
type KeycloakTokens = Pick<Keycloak, 'idToken' | 'refreshToken' | 'token'>;

const onKeycloakTokens = (tokens: KeycloakTokens) => {
  // We can log this during dev, but in prod it stays silent
  if (CONFIG.isDevelopment) {
    console.debug("Keycloak: Token Refreshed", tokens);
  }
};

const root = ReactDOM.createRoot(document.getElementById("root")!);
if (CONFIG.isMaintenanceMode) {
  root.render(
    <MantineProvider theme={theme}>
      <MaintenancePage />
    </MantineProvider>,
  );
} else {
  root.render(
    <React.StrictMode>
      <ReactKeycloakProvider
        authClient={keycloak}
        initOptions={initOptions}
        onTokens={onKeycloakTokens}
      >
        <Provider store={store}>
          <MantineProvider theme={theme}>
            <DatesProvider settings={{ locale: "fr", firstDayOfWeek: 1 }}>
              <App />
            </DatesProvider>
          </MantineProvider>
        </Provider>
      </ReactKeycloakProvider>
    </React.StrictMode>,
  );
}
