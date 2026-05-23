import { Box, Button, Container, Paper, Stack, Text, ThemeIcon, Title, rem } from '@mantine/core';
import { IconTools } from '@tabler/icons-react';

export function MaintenancePage() {
  return (
    <Box
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at top left, #FEF3C7 0%, #F8FAFC 60%, #fff 100%)',
      }}
    >
      <Container size="xs">
        <Paper
          shadow="md"
          radius="lg"
          p="xl"
          withBorder
          style={{ borderTop: '3px solid #F59E0B' }}
        >
          <Stack align="center" gap="xl">
            <ThemeIcon size={64} radius="xl" variant="light" color="orange">
              <IconTools style={{ width: rem(32), height: rem(32) }} stroke={1.5} />
            </ThemeIcon>

            <Stack gap={4} align="center">
              <Text size="xs" fw={700} c="orange.7" tt="uppercase" style={{ letterSpacing: '1px' }}>
                Maintenance
              </Text>
              <Title order={2} ta="center">Plateforme en maintenance</Title>
            </Stack>

            <Text c="dimmed" ta="center" maw={340}>
              La plateforme est temporairement indisponible pour des opérations de maintenance.
              Veuillez réessayer dans quelques instants.
            </Text>

            <Button color="navy" onClick={() => window.location.reload()}>
              Actualiser
            </Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
