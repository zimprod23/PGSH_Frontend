import {
  Container,
  Title,
  Text,
  TextInput,
  Textarea,
  Button,
  SimpleGrid,
  Stack,
  Paper,
} from "@mantine/core";

export function ContactSection() {
  return (
    <Container size="lg" py={80} id="contact">
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing={50}>
        <Stack gap="lg">
          <Title order={2}>Contactez notre support</Title>
          <Text c="dimmed" size="lg">
            Une question sur votre stage ou sur le fonctionnement de la
            plateforme ? Nos équipes sont là pour vous aider.
          </Text>
          <Stack gap="xs">
            <Text fw={700}>Email</Text>
            <Text c="blue">support@pgsh.ma</Text>
            <Text fw={700} mt="md">
              Téléphone
            </Text>
            <Text c="blue">+212 5XX XX XX XX</Text>
          </Stack>
        </Stack>

        <Paper withBorder shadow="md" p="xl" radius="md">
          <form>
            <Stack gap="md">
              <TextInput label="Nom complet" placeholder="Votre nom" required />
              <TextInput label="Email" placeholder="votre@email.com" required />
              <Textarea
                label="Message"
                placeholder="Comment pouvons-nous vous aider ?"
                minRows={4}
                required
              />
              <Button size="md" fullWidth color="blue">
                Envoyer le message
              </Button>
            </Stack>
          </form>
        </Paper>
      </SimpleGrid>
    </Container>
  );
}
