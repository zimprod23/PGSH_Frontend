import React from 'react';
import {
  ActionIcon,
  AppShell,
  Avatar,
  Badge,
  Box,
  Burger,
  Group,
  NavLink,
  rem,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconLayoutDashboard,
  IconUser,
  IconBuildingHospital,
  IconCalendar,
  IconClipboardList,
  IconBell,
  IconSearch,
  IconLogout,
} from '@tabler/icons-react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../common/hooks/useAuth';
import { Roles } from '../common/constants/roles';
import { ErrorBoundary } from '../common/components/ErrorBoundary';
import { PATHS } from '../routes/paths';
import { useGetCurrentEmployeeQuery } from '../features/employee/api/employeeApi';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ size?: number; stroke?: number; color?: string }>;
  path: string;
  exact?: boolean;
  soon?: boolean;
}

const ROOT = PATHS.EMPLOYEE.ROOT;

const NAV_ITEMS: NavItem[] = [
  { label: 'Tableau de bord', icon: IconLayoutDashboard, path: ROOT,                   exact: true },
  { label: 'Mon Profil',      icon: IconUser,             path: `${ROOT}/profile`                  },
  { label: 'Mes Services',    icon: IconBuildingHospital, path: `${ROOT}/services`                },
  { label: 'Présences',       icon: IconCalendar,         path: `${ROOT}/attendance`,  soon: true  },
  { label: 'Évaluations',     icon: IconClipboardList,    path: `${ROOT}/evaluations`, soon: true  },
];

const LANGS = [
  { code: 'FR', flag: '🇫🇷' },
  { code: 'AR', flag: '🇲🇦' },
  { code: 'EN', flag: '🇬🇧' },
] as const;

export function EmployeeLayout() {
  const [opened, { toggle }] = useDisclosure();
  const { username, email, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useGetCurrentEmployeeQuery(); // prefetch on zone entry; profile page reads from cache

  const roleLabel = hasRole(Roles.Professor) ? 'Professeur' : 'Employé';

  const initials = (username ?? email ?? 'E')
    .split(/[\s.@]/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('');

  const isActive = (path: string, exact = false) =>
    exact
      ? location.pathname === path
      : location.pathname.startsWith(path) && path !== '#';

  const pageLabel =
    NAV_ITEMS.find((n) => isActive(n.path, n.exact))?.label ?? 'PGSH';

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 220, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding={0}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <AppShell.Header style={{ background: '#ffffff', borderBottom: '1px solid #E2E8F0' }}>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="xs">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Group gap={6} visibleFrom="sm">
              <Text size="sm" c="dimmed">PGSH</Text>
              <Text size="sm" c="dimmed">/</Text>
              <Text size="sm" fw={600} c="navy.6">{pageLabel}</Text>
            </Group>
          </Group>

          <Group gap="xs">
            <Tooltip label="Rechercher" position="bottom">
              <ActionIcon variant="subtle" color="gray" size="md" radius="md">
                <IconSearch size={18} stroke={1.5} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Notifications" position="bottom">
              <ActionIcon variant="subtle" color="gray" size="md" radius="md">
                <IconBell size={18} stroke={1.5} />
              </ActionIcon>
            </Tooltip>
            <Group gap={2} visibleFrom="xs">
              {LANGS.map((lang) => (
                <UnstyledButton
                  key={lang.code}
                  px={6}
                  py={2}
                  style={{
                    borderRadius: rem(6),
                    fontSize: rem(12),
                    fontWeight: 600,
                    color: lang.code === 'FR' ? 'var(--color-navy)' : '#94A3B8',
                    background: lang.code === 'FR' ? '#E8F1FB' : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <Text span size="xs">{lang.flag} {lang.code}</Text>
                </UnstyledButton>
              ))}
            </Group>
            <Avatar
              size={32}
              radius="xl"
              style={{
                background: 'linear-gradient(135deg, #0F4C81 0%, #0EA5E9 100%)',
                color: '#fff',
                fontWeight: 700,
                fontSize: rem(13),
                cursor: 'pointer',
              }}
            >
              {initials}
            </Avatar>
          </Group>
        </Group>
      </AppShell.Header>

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <AppShell.Navbar
        style={{
          background: '#ffffff',
          borderRight: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column',
        }}
        p="md"
      >
        {/* Logo */}
        <Group gap="sm" mb="xl">
          <Avatar
            size={34}
            radius="md"
            style={{
              background: 'linear-gradient(135deg, #0F4C81 0%, #0EA5E9 100%)',
              color: '#fff',
              fontWeight: 800,
              fontSize: rem(13),
              flexShrink: 0,
            }}
          >
            PS
          </Avatar>
          <Stack gap={0}>
            <Text size="sm" fw={800} c="navy.6" lh={1.2}>PGSH</Text>
            <Text size={rem(11)} c="dimmed" lh={1.2}>Espace Employé</Text>
          </Stack>
        </Group>

        <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="xs" style={{ letterSpacing: rem(0.8) }}>
          Menu
        </Text>

        <AppShell.Section grow>
          <Stack gap={2}>
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.path, item.exact);
              return (
                <NavLink
                  key={item.label}
                  label={
                    <Group justify="space-between" wrap="nowrap">
                      <Text size="sm" fw={active ? 600 : 500} inherit>{item.label}</Text>
                      {item.soon && (
                        <Badge size="xs" variant="light" color="warning" radius="xl">
                          Bientôt
                        </Badge>
                      )}
                    </Group>
                  }
                  leftSection={
                    <item.icon size={18} stroke={1.5} color={active ? '#0F4C81' : '#94A3B8'} />
                  }
                  active={active}
                  onClick={() => {
                    if (!item.soon) { navigate(item.path); if (opened) toggle(); }
                  }}
                  styles={{
                    root: {
                      borderRadius: rem(8),
                      padding: `${rem(8)} ${rem(10)}`,
                      backgroundColor: active ? '#E8F1FB' : 'transparent',
                      color: active ? '#0F4C81' : '#475569',
                    },
                  }}
                />
              );
            })}
          </Stack>
        </AppShell.Section>

        {/* User card */}
        <Box mt="auto" pt="md" style={{ borderTop: '1px solid #E2E8F0' }}>
          <Group justify="space-between" wrap="nowrap">
            <Group gap="sm" style={{ overflow: 'hidden', flex: 1 }}>
              <Avatar
                size={32}
                radius="xl"
                style={{
                  background: 'linear-gradient(135deg, #0F4C81 0%, #0EA5E9 100%)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: rem(12),
                  flexShrink: 0,
                }}
              >
                {initials}
              </Avatar>
              <Stack gap={0} style={{ overflow: 'hidden' }}>
                <Text size="sm" fw={600} truncate>{username ?? roleLabel}</Text>
                <Text size="xs" c="dimmed" truncate>{roleLabel}</Text>
              </Stack>
            </Group>
            <Tooltip label="Se déconnecter" position="top">
              <ActionIcon variant="subtle" color="gray" size="sm" onClick={logout}>
                <IconLogout size={16} stroke={1.5} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Box>
      </AppShell.Navbar>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <AppShell.Main style={{ background: '#F8FAFC', minHeight: '100vh' }}>
        <Box p={{ base: 'md', sm: 'lg', md: 'xl' }}>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
