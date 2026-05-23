import { Box, Button, Container, Group, Paper, Stack, Text, ThemeIcon, Title, rem } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

export function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <Box
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at top left, #E8F1FB 0%, #F8FAFC 60%, #fff 100%)',
      }}
    >
      <Container size="xs">
        <Paper
          shadow="md"
          radius="lg"
          p="xl"
          withBorder
          style={{ borderTop: '3px solid #0F4C81' }}
        >
          <Stack align="center" gap="xl">
            <ThemeIcon size={64} radius="xl" variant="light" color="navy">
              <IconLock style={{ width: rem(32), height: rem(32) }} stroke={1.5} />
            </ThemeIcon>

            <Stack gap={4} align="center">
              <Text size="xs" fw={700} c="navy.6" tt="uppercase" style={{ letterSpacing: '1px' }}>
                Erreur 403
              </Text>
              <Title order={2} ta="center">Accès restreint</Title>
            </Stack>

            <Text c="dimmed" ta="center" maw={340}>
              Vous n'avez pas les droits nécessaires pour accéder à cet espace.
              Vérifiez que vous êtes connecté avec le bon compte.
            </Text>

            <Group justify="center">
              <Button variant="default" onClick={() => navigate(-1)}>Retour</Button>
              <Button color="navy" onClick={() => navigate('/')}>Accueil</Button>
            </Group>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
