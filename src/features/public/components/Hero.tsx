import {
  Container,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Image,
  SimpleGrid,
} from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { PATHS } from "../../../routes/paths";
import medStudent from "../../../assets/med_student_landing.png";

export function Hero() {
  const navigate = useNavigate();

  return (
    <Container size="lg" py={80}>
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing={50} verticalSpacing={30}>
        <Stack justify="center" gap="xl">
          <Title size="42px" fw={900} style={{ lineHeight: 1.1 }}>
            La plateforme moderne pour la{" "}
            <Text
              component="span"
              variant="gradient"
              gradient={{ from: "blue", to: "cyan" }}
              inherit
            >
              Gestion des Stages
            </Text>{" "}
            Hospitaliers.
          </Title>

          <Text c="dimmed" size="lg">
            Simplifiez le suivi académique, validez vos objectifs de stage en
            temps réel et connectez-vous avec les meilleurs établissements de
            santé.
          </Text>

          <Group gap="md">
            <Button
              size="lg"
              radius="xl"
              color="blue"
              onClick={() => navigate(PATHS.STUDENT.ROOT)}
            >
              Commencer mon stage
            </Button>
            <Button
              size="lg"
              radius="xl"
              onClick={() => {
                const el = document.getElementById("contact");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              En savoir plus
            </Button>
          </Group>
        </Stack>

        {/* You can replace this src with a medical-themed illustration */}
        <Image
          // src="https://raw.githubusercontent.com/mantinedev/mantine/master/.demo/images/bg-7.png"
          src={medStudent}
          radius="md"
          alt="Medical Platform"
        />
      </SimpleGrid>
    </Container>
  );
}
