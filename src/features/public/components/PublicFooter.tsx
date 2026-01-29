import {
  Container,
  Text,
  Group,
  ActionIcon,
  Stack,
  Divider,
  SimpleGrid,
  Box,
} from "@mantine/core";
import {
  IconBrandTwitter,
  IconBrandYoutube,
  IconBrandInstagram,
} from "@tabler/icons-react";

export function PublicFooter() {
  return (
    <Box
      component="footer"
      bg="gray.0"
      pt={50}
      pb={20}
      style={{ borderTop: "1px solid var(--mantine-color-gray-2)" }}
    >
      <Container size="lg">
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing={50}>
          <Stack gap="xs">
            <Text fw={900} size="lg">
              PGSH
            </Text>
            <Text size="sm" c="dimmed">
              La solution de référence pour la gestion des stages hospitaliers
              et le suivi des compétences médicales.
            </Text>
          </Stack>

          <Stack gap="xs">
            <Text fw={700}>Liens Rapides</Text>
            <Text size="sm" component="a" href="/about" c="dimmed">
              À Propos
            </Text>
            <Text size="sm" component="a" href="#" c="dimmed">
              Conditions d'utilisation
            </Text>
            <Text size="sm" component="a" href="#" c="dimmed">
              Politique de confidentialité
            </Text>
          </Stack>

          <Stack gap="xs">
            <Text fw={700}>Suivez-nous</Text>
            <Group gap="xs">
              <ActionIcon size="lg" variant="subtle" color="gray">
                <IconBrandTwitter size={18} />
              </ActionIcon>
              <ActionIcon size="lg" variant="subtle" color="gray">
                <IconBrandYoutube size={18} />
              </ActionIcon>
              <ActionIcon size="lg" variant="subtle" color="gray">
                <IconBrandInstagram size={18} />
              </ActionIcon>
            </Group>
          </Stack>
        </SimpleGrid>

        <Divider my="xl" />
        <Text ta="center" c="dimmed" size="xs">
          © 2026 PGSH. Tous droits réservés.
        </Text>
      </Container>
    </Box>
  );
}
