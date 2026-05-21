import { Box, Button, Container, Group, Paper, Stack, Text, ThemeIcon, Title, rem } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

export function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <Box
      style={{
        height: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at top left, #E8F1FB 0%, #ffffff 100%)',
      }}
    >
      <Container size="xs" w="100%">
        <Paper shadow="xl" radius="lg" p={rem(40)} withBorder style={{ borderTop: `${rem(4)} solid #0F4C81` }}>
          <Stack align="center" gap="xl">
            <ThemeIcon variant="light" color="navy" size={80} radius={80}>
              <IconLock style={{ width: rem(40), height: rem(40) }} stroke={1.5} />
            </ThemeIcon>

            <Stack gap={4} align="center">
              <Text fw={800} size="sm" c="navy.6" style={{ letterSpacing: 1 }}>
                ERREUR 403
              </Text>
              <Title order={2} ta="center">Accès restreint</Title>
            </Stack>

            <Text c="dimmed" ta="center">
              Vous n'avez pas les droits nécessaires pour accéder à cet espace.
              Vérifiez que vous êtes connecté avec le bon compte.
            </Text>

            <Group grow w="100%">
              <Button variant="default" onClick={() => navigate(-1)}>Retour</Button>
              <Button color="navy"       onClick={() => navigate('/')}>Accueil</Button>
            </Group>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
