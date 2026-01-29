import { Container, Title, Text, Stack, Box } from "@mantine/core";
import { IconSettingsAutomation } from "@tabler/icons-react";

export function MaintenancePage() {
  return (
    <Container
      style={{ height: "100vh", display: "flex", alignItems: "center" }}
    >
      <Stack align="center" w="100%">
        <Box c="blue">
          <IconSettingsAutomation size={100} stroke={1.5} />
        </Box>
        <Title order={1} ta="center">
          System Maintenance
        </Title>
        <Text c="dimmed" size="lg" ta="center">
          PGSH is currently undergoing scheduled updates to improve your
          experience. We'll be back online shortly.
        </Text>
      </Stack>
    </Container>
  );
}
