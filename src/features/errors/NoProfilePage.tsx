import { Box, Button, Container, Stack, Text, ThemeIcon, Title, rem } from '@mantine/core';
import { IconShieldOff } from '@tabler/icons-react';
import keycloak from '../../services/keycloak';

export function NoProfilePage() {
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
        <Stack align="center" gap="xl" ta="center">
          <ThemeIcon size={72} radius="xl" variant="light" color="orange">
            <IconShieldOff style={{ width: rem(36), height: rem(36) }} stroke={1.5} />
          </ThemeIcon>

          <Stack gap="sm">
            <Title order={2}>Profil introuvable</Title>
            <Text c="dimmed" maw={380} mx="auto">
              Votre compte est authentifié, mais aucun profil local ne lui est associé.
              Contactez l'administrateur de la plateforme pour créer votre accès.
            </Text>
          </Stack>

          <Button
            color="navy"
            onClick={() => keycloak.logout({ redirectUri: window.location.origin })}
          >
            Retour à l'accueil
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
