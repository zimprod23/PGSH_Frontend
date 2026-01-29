import { Center, Paper, Box, Container } from "@mantine/core";
import { Outlet } from "react-router-dom";

export function SimpleLayout() {
  return (
    <Box
      bg="gray.0"
      style={{
        // 100dvh is more optimal for mobile (accounts for address bar)
        minHeight: "100dvh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Center style={{ flex: 1 }} p="md">
        <Container size="xs" w="100%">
          <Paper
            shadow="md"
            radius="lg"
            p={{ base: "lg", sm: "xl" }} // Responsive padding
            withBorder
            style={{
              backgroundColor: "white",
              // Maintain the narrow look for forms/errors, but allow flex
              width: "100%",
            }}
          >
            <Outlet />
          </Paper>
        </Container>
      </Center>
    </Box>
  );
}
