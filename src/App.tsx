import { RouterProvider } from "react-router-dom";
import { router } from "./routes";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";

export default function App() {
  return (
    <MantineProvider>
      <Notifications position="top-right" zIndex={1000} />
      <RouterProvider router={router} />;
    </MantineProvider>
  );
}
