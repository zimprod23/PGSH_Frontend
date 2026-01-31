import {
  isRouteErrorResponse,
  useRouteError,
  useNavigate,
} from "react-router-dom";
import {
  Title,
  Text,
  Button,
  Container,
  Group,
  Stack,
  Box,
  Paper,
  ThemeIcon,
  rem,
} from "@mantine/core";
import { IconAlertTriangle, IconSearch, IconLock } from "@tabler/icons-react";

interface ErrorPageProps {
  status?: "403" | "404" | "500" | (string & {});
}

export function ErrorPage({ status }: ErrorPageProps) {
  const error = useRouteError();
  const navigate = useNavigate();

  let title = "Oups !";
  let description = "Une erreur inattendue est survenue.";
  let code: string = status || "500";
  let Icon = IconAlertTriangle;

  if (isRouteErrorResponse(error)) {
    code = error.status.toString();
    if (error.status === 404) {
      title = "Page Introuvable";
      description = "Désolé, nous ne trouvons pas la page que vous cherchez.";
      Icon = IconSearch;
    }
  } else if (code === "403") {
    title = "Espace Restreint";
    description = "Cet espace est réservé aux étudiants enregistrés.";
    Icon = IconLock;
  }

  return (
    <Box
      style={{
        height: "100dvh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // Consistent Background for both Layout and Global Catch
        background:
          "radial-gradient(circle at top left, #f0f7ff 0%, #ffffff 100%)",
      }}
    >
      <Container size="xs" w="100%">
        <Paper
          shadow="xl"
          radius="lg"
          p={rem(40)}
          withBorder
          style={{
            backgroundColor: "white",
            borderTop: `${rem(4)} solid #228be6`, // Your primary blue
          }}
        >
          <Stack align="center" gap="xl">
            <ThemeIcon
              variant="gradient"
              size={80}
              radius={80}
              gradient={{ from: "blue", to: "cyan" }} // Your brand gradient
            >
              <Icon style={{ width: rem(40), height: rem(40) }} />
            </ThemeIcon>

            <Stack gap={5} align="center">
              <Text fw={800} size="sm" c="blue.6" style={{ letterSpacing: 1 }}>
                ERREUR {code}
              </Text>
              <Title order={1} ta="center" size="h2">
                {title}
              </Title>
            </Stack>

            <Text c="dimmed" ta="center" size="md">
              {description}
            </Text>

            <Group grow w="100%" mt="md">
              <Button variant="default" onClick={() => navigate(-1)}>
                Retour
              </Button>
              <Button
                variant="gradient"
                gradient={{ from: "blue", to: "cyan" }}
                onClick={() => navigate("/")}
              >
                Accueil
              </Button>
            </Group>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
