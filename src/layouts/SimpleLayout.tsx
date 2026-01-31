import { Box } from "@mantine/core";
import { Outlet } from "react-router-dom";

export function SimpleLayout() {
  return (
    <Box style={{ width: "100%" }}>
      {/* The ErrorPage will provide its own full-screen centering */}
      <Outlet />
    </Box>
  );
}
