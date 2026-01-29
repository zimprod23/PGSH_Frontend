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
} from "@mantine/core";

export function ErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();

  // 1. Set standard defaults
  let title = "Something went wrong";
  let description = "An unexpected error occurred.";
  let code = "500";

  // 2. If it's a thrown Router Error (404, 403, etc.)
  if (isRouteErrorResponse(error)) {
    code = error.status.toString();
    if (error.status === 404) {
      title = "Page Not Found";
      description = "The page you're looking for doesn't exist.";
    } else if (error.status === 403) {
      title = "Forbidden";
      description = "You don't have permission to access this resource.";
    }
  }
  // 3. If it's a code crash (ReferenceError, etc.)
  else if (error instanceof Error) {
    title = "Application Error";
    description = error.message;
    code = "BUG";
  }
  // 4. FALLBACK: If useRouteError() is undefined, but the page is showing,
  // it's almost certainly a 404 catch-all situation.
  else if (!error) {
    title = "Page Not Found";
    description = "The page you're looking for doesn't exist.";
    code = "404";
  }

  return (
    <Box
      py={80}
      style={{ minHeight: "60vh", display: "flex", alignItems: "center" }}
    >
      <Container size="md">
        <Stack align="center" gap="xl">
          <Text
            fw={900}
            size="clamp(80px, 20vw, 120px)" // Responsive font size
            c="gray.3"
            style={{ lineHeight: 1 }}
          >
            {code}
          </Text>
          <Title order={1} ta="center">
            {title}
          </Title>
          <Text c="dimmed" size="lg" ta="center" maw={500}>
            {description}
          </Text>
          <Group justify="center">
            <Button variant="subtle" size="md" onClick={() => navigate(-1)}>
              Retour
            </Button>
            <Button size="md" onClick={() => navigate("/")}>
              Accueil
            </Button>
          </Group>
        </Stack>
      </Container>
    </Box>
  );
}
