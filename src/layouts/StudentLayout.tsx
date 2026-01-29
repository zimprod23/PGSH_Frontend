import {
  AppShell,
  Burger,
  Group,
  Text,
  NavLink,
  Stack,
  Button,
  Box,
  Avatar,
  ThemeIcon,
  UnstyledButton,
  Divider,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconUser,
  IconFileCheck,
  IconSchool,
  IconHistory,
  IconLogout,
  // IconMessages,
  IconChevronRight,
} from "@tabler/icons-react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../common/hooks/useAuth";
import { PATHS } from "../routes/paths";

export function StudentLayout() {
  const [opened, { toggle }] = useDisclosure();
  const { username, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Inside StudentLayout.tsx
  const links = [
    {
      label: "Mon Profil",
      icon: IconUser,
      path: `${PATHS.STUDENT.ROOT}/${PATHS.STUDENT.PROFILE}`, // Result: /student/profile
      color: "blue",
    },
    {
      label: "Mes Demandes",
      icon: IconFileCheck,
      path: `${PATHS.STUDENT.ROOT}/${PATHS.STUDENT.DEMANDS}`, // Result: /student/demands
      color: "orange",
    },
    {
      label: "Stages & Cursus",
      icon: IconSchool,
      path: `${PATHS.STUDENT.ROOT}/${PATHS.STUDENT.STAGES}`, // Result: /student/stages
      color: "teal",
    },
    {
      label: "Historique",
      icon: IconHistory,
      path: `${PATHS.STUDENT.ROOT}/${PATHS.STUDENT.HISTORY}`, // Result: /student/history
      color: "grape",
    },
  ];

  return (
    <AppShell
      header={{ height: 70 }}
      navbar={{
        width: 280,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      {/* Header with Glassmorphism */}
      <AppShell.Header
        style={{
          backdropFilter: "blur(8px)",
          backgroundColor: "rgba(255, 255, 255, 0.8)",
          borderBottom: "1px solid var(--mantine-color-gray-2)",
        }}
      >
        <Group h="100%" px="xl" justify="space-between">
          <Group>
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
            />
            <Text
              fw={900}
              size="xl"
              variant="gradient"
              gradient={{ from: "blue.7", to: "cyan.5" }}
              style={{ letterSpacing: "-0.5px" }}
            >
              PGSH{" "}
              <span
                style={{ fontWeight: 300, fontSize: "14px", color: "gray" }}
              >
                | Étudiant
              </span>
            </Text>
          </Group>

          <Group visibleFrom="xs">
            {/* Simple search bar or notifications could go here */}
            <Divider orientation="vertical" h={24} />
            <Button
              variant="subtle"
              color="gray"
              size="sm"
              leftSection={<IconLogout size={16} />}
              onClick={() => logout()}
            >
              Quitter
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      {/* Modern Sidebar */}
      <AppShell.Navbar
        p="md"
        style={{ borderRight: "1px solid var(--mantine-color-gray-2)" }}
      >
        <AppShell.Section grow>
          <Stack gap="4">
            {links.map((item) => {
              const isActive =
                location.pathname === item.path ||
                (item.path !== PATHS.STUDENT.PROFILE &&
                  location.pathname.startsWith(item.path));
              return (
                <NavLink
                  key={item.path}
                  label={item.label}
                  leftSection={
                    <ThemeIcon
                      variant={isActive ? "filled" : "light"}
                      color={item.color}
                      size="sm"
                      radius="md"
                    >
                      <item.icon size={16} />
                    </ThemeIcon>
                  }
                  rightSection={<IconChevronRight size={12} stroke={1.5} />}
                  active={isActive}
                  onClick={() => {
                    navigate(item.path);
                    if (opened) toggle();
                  }}
                  variant="filled"
                  styles={(theme) => ({
                    root: {
                      borderRadius: theme.radius.md,
                      marginBottom: "4px",
                      transition: "all 0.2s ease",
                      backgroundColor: isActive
                        ? theme.colors.blue[0]
                        : "transparent",
                      color: isActive
                        ? theme.colors.blue[9]
                        : theme.colors.gray[7],
                      "&:hover": {
                        backgroundColor: theme.colors.gray[0],
                        transform: "translateX(4px)",
                      },
                    },
                    label: { fontWeight: isActive ? 600 : 500 },
                  })}
                />
              );
            })}
          </Stack>
        </AppShell.Section>

        {/* User Card at the Bottom */}
        <AppShell.Section>
          <Divider my="md" label="Session" labelPosition="center" />
          <UnstyledButton
            p="sm"
            style={{
              width: "100%",
              borderRadius: "12px",
              backgroundColor: "var(--mantine-color-gray-0)",
            }}
          >
            <Group gap="sm">
              <Avatar src={null} alt={username} color="blue" radius="xl">
                {username?.charAt(0).toUpperCase()}
              </Avatar>
              <div style={{ flex: 1 }}>
                <Text size="sm" fw={700} truncate>
                  {username || "Étudiant"}
                </Text>
                <Text size="xs" c="dimmed" truncate>
                  Session active
                </Text>
              </div>
            </Group>
          </UnstyledButton>
        </AppShell.Section>
      </AppShell.Navbar>

      {/* Main with subtle shadow on inner container */}
      <AppShell.Main bg="gray.0">
        <Box
          p="xl"
          style={{
            // maxWidth: "1400px",
            margin: "0 auto",
            minHeight: "calc(100vh - 100px)",
          }}
        >
          {/* This is the white card that "lifts" the content */}
          <Box
            bg="white"
            p="3rem" // More internal padding for a spacious feel
            style={{
              borderRadius: "24px",
              minHeight: "calc(100vh - 120px)",
              border: "1px solid var(--mantine-color-gray-2)",
              boxShadow: "var(--mantine-shadow-sm)",
            }}
          >
            <Outlet />
          </Box>
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
