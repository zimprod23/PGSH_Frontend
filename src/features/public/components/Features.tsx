import {
  Container,
  SimpleGrid,
  Text,
  Paper,
  ThemeIcon,
  Title,
  Stack,
  rem,
} from "@mantine/core";
import {
  IconTargetArrow,
  IconHistory,
  IconMessages,
  IconDeviceAnalytics,
} from "@tabler/icons-react";

const MOCKDATA = [
  {
    icon: IconTargetArrow,
    title: "Objectifs de Stage",
    description:
      "Suivez vos progrès en temps réel avec des objectifs clairs et des évaluations précises par vos superviseurs.",
  },
  {
    icon: IconDeviceAnalytics,
    title: "Suivi de Performance",
    description:
      "Visualisez vos compétences acquises au fil de vos rotations hospitalières grâce à des graphiques intuitifs.",
  },
  {
    icon: IconHistory,
    title: "Historique Complet",
    description:
      "Accédez à l'archive de tous vos stages passés, vos notes et vos attestations en un clic.",
  },
  {
    icon: IconMessages,
    title: "Espace Communautaire",
    description:
      "Échangez avec d'autres étudiants et professionnels via nos forums dédiés (Prochainement).",
  },
];

export function Features() {
  const items = MOCKDATA.map((item) => (
    <Paper
      key={item.title}
      p="xl"
      radius="md"
      withBorder
      style={{ transition: "transform 200ms ease, box-shadow 200ms ease" }}
      // Performance optimization: Using Mantine's hover styles instead of manual CSS
      styles={{
        root: {
          "&:hover": {
            transform: "translateY(-5px)",
            boxShadow: "var(--mantine-shadow-md)",
          },
        },
      }}
    >
      <ThemeIcon size={50} radius={50} variant="light" color="blue">
        <item.icon style={{ width: rem(26), height: rem(26) }} stroke={1.5} />
      </ThemeIcon>
      <Text mt="sm" mb={7} fw={700} size="lg">
        {item.title}
      </Text>
      <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
        {item.description}
      </Text>
    </Paper>
  ));

  return (
    <Container size="lg" py={80}>
      <Stack align="center" mb={50}>
        <Title order={2} ta="center" fw={900}>
          Tout ce dont vous avez besoin pour réussir
        </Title>
        <Text c="dimmed" ta="center" size="lg" maw={600}>
          Une plateforme conçue par des professionnels de santé pour les futurs
          praticiens.
        </Text>
      </Stack>

      <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="xl">
        {items}
      </SimpleGrid>
    </Container>
  );
}
