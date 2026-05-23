import React from 'react';
import {
  Box,
  Button,
  Container,
  Group,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Title,
  rem,
} from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

// ─── Fallback UI (functional so it can use hooks) ─────────────────────────────

function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <Box
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <Container size="xs">
        <Paper
          shadow="md"
          radius="lg"
          p="xl"
          withBorder
          style={{ borderTop: `3px solid #EF4444` }}
        >
          <Stack align="center" gap="xl">
            <ThemeIcon size={64} radius="xl" variant="light" color="red">
              <IconAlertTriangle style={{ width: rem(32), height: rem(32) }} stroke={1.5} />
            </ThemeIcon>

            <Stack gap={4} align="center">
              <Text size="xs" fw={700} c="red.6" tt="uppercase" style={{ letterSpacing: '1px' }}>
                Erreur inattendue
              </Text>
              <Title order={2} ta="center">Un problème est survenu</Title>
            </Stack>

            <Text c="dimmed" ta="center" maw={340}>
              Une erreur inattendue a empêché le chargement de cette section.
              Réessayez ou retournez à l'accueil.
            </Text>

            <Group justify="center">
              <Button variant="default" onClick={onRetry}>Réessayer</Button>
              <Button color="navy" onClick={() => { window.location.href = '/'; }}>Accueil</Button>
            </Group>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}

// ─── Class boundary ───────────────────────────────────────────────────────────

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error.message, info.componentStack);
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={this.reset} />;
    }
    return this.props.children;
  }
}
