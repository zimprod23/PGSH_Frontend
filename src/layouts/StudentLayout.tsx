import React from 'react';
import {
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
  ActionIcon,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconLayoutDashboard,
  IconUser,
  IconStethoscope,
  IconTimeline,
  IconFileText,
  IconMessage,
  IconBell,
  IconSearch,
  IconLogout,
} from '@tabler/icons-react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../common/hooks/useAuth';
import { ErrorBoundary } from '../common/components/ErrorBoundary';
import { PATHS } from '../routes/paths';

// ─── Sidebar nav items from design screenshots ───────────────────────────────

interface NavItem {
  label: string;
  icon: React.ComponentType<{ size?: number; stroke?: number; color?: string }>;
  path: string;
  exact?: boolean;
  soon?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Tableau de bord', icon: IconLayoutDashboard, path: PATHS.STUDENT.ROOT,               exact: true  },
  { label: 'Mon Profil',      icon: IconUser,             path: `${PATHS.STUDENT.ROOT}/profile`               },
  { label: 'Mes Stages',      icon: IconStethoscope,      path: `${PATHS.STUDENT.ROOT}/stages`                },
  { label: 'Historique',      icon: IconTimeline,         path: `${PATHS.STUDENT.ROOT}/history`               },
  { label: 'Demandes',        icon: IconFileText,         path: `${PATHS.STUDENT.ROOT}/demands`,  soon: true   },
  { label: 'Messages',        icon: IconMessage,          path: '#',                              soon: true   },
];

// ─── Language switcher data ───────────────────────────────────────────────────

const LANGS = [
  { code: 'FR', flag: '🇫🇷' },
  { code: 'AR', flag: '🇲🇦' },
  { code: 'EN', flag: '🇬🇧' },
] as const;

// ─── Component ───────────────────────────────────────────────────────────────

export function StudentLayout() {
  const [opened, { toggle }] = useDisclosure();
  const { username, email, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const initials = (username ?? email ?? 'U')
    .split(/[\s.@]/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('');

  const isActive = (path: string, exact = false) =>
    exact
      ? location.pathname === path
      : location.pathname.startsWith(path) && path !== '#';

  // Derive breadcrumb page name from the active nav item
  const pageLabel =
    NAV_ITEMS.find((n) => isActive(n.path, (n as { exact?: boolean }).exact))?.label ?? 'PGSH';

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 220, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding={0}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <AppShell.Header
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #E2E8F0',
        }}
      >
        <Group h="100%" px="md" justify="space-between">
          {/* Left: burger (mobile) + breadcrumb */}
          <Group gap="xs">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Group gap={6} visibleFrom="sm">
              <Text size="sm" c="dimmed">PGSH</Text>
              <Text size="sm" c="dimmed">/</Text>
              <Text size="sm" fw={600} c="navy.6">{pageLabel}</Text>
            </Group>
          </Group>

          {/* Right: search + notifications + language + avatar */}
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

            {/* Language switcher — i18n wired in Phase 1b */}
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
            <Text size={rem(11)} c="dimmed" lh={1.2}>Stages Hospitaliers</Text>
          </Stack>
        </Group>

        {/* Menu label */}
        <Text
          size="xs"
          fw={600}
          c="dimmed"
          tt="uppercase"
          mb="xs"
          style={{ letterSpacing: rem(0.8) }}
        >
          Menu
        </Text>

        {/* Nav items */}
        <AppShell.Section grow>
          <Stack gap={2}>
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.path, item.exact);
              return (
                <NavLink
                  key={item.label}
                  label={
                    <Group justify="space-between" wrap="nowrap">
                      <Text size="sm" fw={active ? 600 : 500} inherit>
                        {item.label}
                      </Text>
                      {item.soon && (
                        <Badge size="xs" variant="light" color="warning" radius="xl">
                          Bientôt
                        </Badge>
                      )}
                    </Group>
                  }
                  leftSection={
                    <item.icon
                      size={18}
                      stroke={1.5}
                      color={active ? '#0F4C81' : '#94A3B8'}
                    />
                  }
                  active={active}
                  onClick={() => {
                    if (item.path !== '#') navigate(item.path);
                    if (opened) toggle();
                  }}
                  styles={{
                    root: {
                      borderRadius: rem(8),
                      padding: `${rem(8)} ${rem(10)}`,
                      backgroundColor: active ? '#E8F1FB' : 'transparent',
                      color: active ? '#0F4C81' : '#475569',
                      '&:hover': {
                        backgroundColor: active ? '#E8F1FB' : '#F8FAFC',
                      },
                    },
                  }}
                />
              );
            })}
          </Stack>
        </AppShell.Section>

        {/* Bottom user card */}
        <Box
          mt="auto"
          pt="md"
          style={{ borderTop: '1px solid #E2E8F0' }}
        >
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
                <Text size="sm" fw={600} truncate>
                  {username ?? 'Étudiant'}
                </Text>
                <Text size="xs" c="dimmed" truncate>
                  Étudiant
                </Text>
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

      {/* ── Main content ───────────────────────────────────────────────────── */}
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
