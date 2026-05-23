import { isRouteErrorResponse, useRouteError, useNavigate } from 'react-router-dom';
import {
  Box, Button, Container, Group, Paper,
  Stack, Text, ThemeIcon, Title, rem,
} from '@mantine/core';
import { IconAlertTriangle, IconSearch } from '@tabler/icons-react';

export function ErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();

  const is404 = isRouteErrorResponse(error) && error.status === 404;

  const config = is404
    ? {
        code:        '404',
        title:       'Page introuvable',
        description: "La page que vous cherchez n'existe pas ou a été déplacée.",
        icon:        IconSearch,
        iconColor:   'navy' as const,
        accent:      '#0F4C81',
        bg:          'radial-gradient(circle at top left, #E8F1FB 0%, #F8FAFC 60%, #fff 100%)',
      }
    : {
        code:        '500',
        title:       'Erreur inattendue',
        description: "Une erreur inattendue s'est produite. Réessayez ou contactez le support.",
        icon:        IconAlertTriangle,
        iconColor:   'red' as const,
        accent:      '#EF4444',
        bg:          'radial-gradient(circle at top left, #FEF2F2 0%, #F8FAFC 60%, #fff 100%)',
      };

  const Icon = config.icon;

  return (
    <Box
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: config.bg,
      }}
    >
      <Container size="xs">
        <Paper
          shadow="md"
          radius="lg"
          p="xl"
          withBorder
          style={{ borderTop: `3px solid ${config.accent}` }}
        >
          <Stack align="center" gap="xl">
            <ThemeIcon size={64} radius="xl" variant="light" color={config.iconColor}>
              <Icon style={{ width: rem(32), height: rem(32) }} stroke={1.5} />
            </ThemeIcon>

            <Stack gap={4} align="center">
              <Text
                size="xs"
                fw={700}
                c={is404 ? 'navy.6' : 'red.6'}
                tt="uppercase"
                style={{ letterSpacing: '1px' }}
              >
                Erreur {config.code}
              </Text>
              <Title order={2} ta="center">{config.title}</Title>
            </Stack>

            <Text c="dimmed" ta="center" maw={340}>{config.description}</Text>

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
