import {
  Group,
  Button,
  Container,
  Text,
  Box,
  Burger,
  Drawer,
  Stack,
  Divider,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useNavigate, useLocation } from "react-router-dom";
import { PATHS } from "../../../routes/paths";

export function PublicNavbar() {
  const [opened, { toggle, close }] = useDisclosure(false);
  const navigate = useNavigate();
  const location = useLocation();

  const navLinks = [
    { label: "Accueil", path: "#accueil" },
    { label: "À Propos", path: "/about" },
    { label: "Contact", path: "#contact" },
  ];

  const handleNavClick = (path: string) => {
    close();

    if (path.startsWith("#")) {
      const targetId = path.substring(1);

      if (location.pathname === "/") {
        // Already on home: Smooth scroll immediately
        const element = document.getElementById(targetId);
        element?.scrollIntoView({ behavior: "smooth" });
      } else {
        // On another page: Navigate to root + hash
        navigate(`/${path}`);
      }
    } else {
      // Normal page navigation
      navigate(path);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <Box
      component="header"
      h={70}
      bg="white"
      style={{
        borderBottom: "1px solid var(--mantine-color-gray-2)",
        position: "sticky",
        top: 0,
        zIndex: 1000,
      }}
    >
      <Container size="lg" h="100%">
        <Group justify="space-between" h="100%">
          <Text
            fw={900}
            size="xl"
            variant="gradient"
            gradient={{ from: "blue", to: "cyan" }}
            style={{ cursor: "pointer" }}
            onClick={() => handleNavClick("#accueil")}
          >
            PGSH
          </Text>

          {/* Desktop Navigation */}
          <Group gap={5} visibleFrom="sm">
            {navLinks.map((link) => (
              <Button
                key={link.label}
                variant="subtle"
                onClick={() => handleNavClick(link.path)}
              >
                {link.label}
              </Button>
            ))}
            <Divider orientation="vertical" mx="sm" />
            <Button
              variant="default"
              onClick={() => navigate(PATHS.STUDENT.ROOT)}
            >
              Espace Étudiant
            </Button>
            <Button color="blue" onClick={() => navigate("/employee")}>
              Espace Employé
            </Button>
          </Group>

          {/* Mobile Burger */}
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
        </Group>
      </Container>

      {/* Mobile Drawer Navigation */}
      <Drawer
        opened={opened}
        onClose={close}
        size="100%"
        padding="md"
        title="Menu"
        hiddenFrom="sm"
        zIndex={2000}
      >
        <Stack gap="md">
          {navLinks.map((link) => (
            <Button
              key={link.label}
              variant="light"
              fullWidth
              onClick={() => handleNavClick(link.path)}
            >
              {link.label}
            </Button>
          ))}
          <Divider label="Connexion" labelPosition="center" />
          <Button
            variant="outline"
            fullWidth
            onClick={() => navigate(PATHS.STUDENT.ROOT)}
          >
            Espace Étudiant
          </Button>
          <Button color="blue" fullWidth onClick={() => navigate("/employee")}>
            Espace Employé
          </Button>
        </Stack>
      </Drawer>
    </Box>
  );
}
