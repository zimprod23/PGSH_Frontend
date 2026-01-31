import { ErrorPage } from "./ErrorPage";

export function UnauthorizedPage() {
  // We reuse the beautiful UI but force the 403 state
  return <ErrorPage status="403" />;
}
