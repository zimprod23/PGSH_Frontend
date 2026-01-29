import Keycloak from "keycloak-js";
import { CONFIG } from "../app/config";

const keycloak = new Keycloak({
  url: CONFIG.keycloak.url,
  realm: CONFIG.keycloak.realm,
  clientId: CONFIG.keycloak.clientId,
});

export default keycloak;
