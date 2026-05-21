import { Container, Stack, Title, Text, ThemeIcon, rem } from '@mantine/core';
import { IconFileText } from '@tabler/icons-react';

export default function DemandsPage() {
  return (
    <Container size="sm" py={80}>
      <Stack align="center" gap="lg">
        <ThemeIcon size={72} radius="xl" variant="light" color="navy">
          <IconFileText style={{ width: rem(36), height: rem(36) }} stroke={1.5} />
        </ThemeIcon>

        <Stack align="center" gap="xs">
          <Title order={2} ta="center">
            Demandes en ligne
          </Title>
          <Text c="dimmed" ta="center" maw={400}>
            Cette fonctionnalité sera disponible prochainement. Vous pourrez soumettre
            et suivre vos demandes administratives directement depuis la plateforme.
          </Text>
        </Stack>
      </Stack>
    </Container>
  );
}
