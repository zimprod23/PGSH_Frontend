import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./index.css";

import React from "react";
import ReactDOM from "react-dom/client";
import { ReactKeycloakProvider } from "@react-keycloak/web";
import { MantineProvider } from "@mantine/core";
import { Provider } from "react-redux";

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

const onKeycloakTokens = (tokens: any) => {
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
            <App />
          </MantineProvider>
        </Provider>
      </ReactKeycloakProvider>
    </React.StrictMode>,
  );
}
