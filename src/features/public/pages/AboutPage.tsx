import {
  Container,
  Title,
  Text,
  Stack,
  SimpleGrid,
  ThemeIcon,
  Paper,
  Box,
} from "@mantine/core";
import {
  IconStethoscope,
  IconSchool,
  IconShieldCheck,
} from "@tabler/icons-react";
import { PublicNavbar } from "../components/PublicNavbar";
import { PublicFooter } from "../components/PublicFooter";

const VALUES = [
  {
    icon: IconStethoscope,
    title: "Excellence Clinique",
    description:
      "Permettre aux étudiants de se concentrer sur l'apprentissage pratique en simplifiant la gestion administrative.",
  },
  {
    icon: IconSchool,
    title: "Suivi Académique",
    description:
      "Assurer une continuité entre les objectifs pédagogiques et la réalité du terrain hospitalier.",
  },
  {
    icon: IconShieldCheck,
    title: "Transparence",
    description:
      "Une validation claire et sécurisée des compétences par les encadrants et les chefs de service.",
  },
];

export function AboutPage() {
  return (
    <Box>
      <PublicNavbar />

      <Box bg="blue.7" py={60}>
        <Container size="lg">
          <Title c="white" order={1} size="h1">
            À Propos de PGSH
          </Title>
          <Text c="blue.1" size="xl" mt="md" maw={600}>
            La plateforme intégrée pour la gestion, le suivi et la validation
            des stages hospitaliers au Maroc.
          </Text>
        </Container>
      </Box>

      <Container size="lg" py={80}>
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing={80}>
          <Stack gap="xl">
            <Title order={2}>Notre Mission</Title>
            <Text size="lg" c="dimmed" style={{ lineHeight: 1.8 }}>
              PGSH est né de la volonté de moderniser le parcours des stagiaires
              en milieu hospitalier. En digitalisant le carnet de stage et les
              évaluations, nous offrons aux étudiants, aux universités et aux
              hôpitaux un outil unique pour collaborer efficacement.
            </Text>
            <Text size="lg" c="dimmed" style={{ lineHeight: 1.8 }}>
              Notre objectif est d'éliminer la paperasse inutile pour laisser
              plus de place à la transmission du savoir médical et à
              l'excellence des soins.
            </Text>
          </Stack>

          <Box>
            <Stack gap="lg">
              {VALUES.map((val) => (
                <Paper key={val.title} withBorder p="lg" radius="md">
                  <Stack align="flex-start" gap="sm">
                    <ThemeIcon
                      size="lg"
                      radius="md"
                      variant="light"
                      color="blue"
                    >
                      <val.icon size={20} />
                    </ThemeIcon>
                    <Text fw={700}>{val.title}</Text>
                    <Text size="sm" c="dimmed">
                      {val.description}
                    </Text>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Box>
        </SimpleGrid>
      </Container>

      <PublicFooter />
    </Box>
  );
}
