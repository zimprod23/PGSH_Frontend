import React, { useMemo } from 'react';
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
  Select,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconLayoutDashboard,
  IconUsers,
  IconClipboardList,
  IconCalendar,
  IconGavel,
  IconSnowflake,
  IconBook2,
  IconSchool,
  IconUsersGroup,
  IconBuildingHospital,
  IconBriefcase,
  IconStethoscope,
  IconCalendarEvent,
  IconCalendarOff,
  IconTable,
  IconChartBar,
  IconRefresh,
  IconClipboardCheck,
  IconBell,
  IconSearch,
  IconLogout,
} from '@tabler/icons-react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../common/hooks/useAuth';
import { Roles } from '../common/constants/roles';
import { ErrorBoundary } from '../common/components/ErrorBoundary';
import { PATHS } from '../routes/paths';
import { AcademicYearProvider } from '../features/admin/contexts/AcademicYearContext';
import { useAcademicYear } from '../features/admin/contexts/useAcademicYear';

type Icon = React.ComponentType<{ size?: number; stroke?: number; color?: string }>;

interface NavLeaf {
  kind: 'leaf';
  label: string;
  icon: Icon;
  path: string;
  exact?: boolean;
  soon?: boolean;
}

interface NavGroup {
  kind: 'group';
  label: string;
  icon: Icon;
  items: NavLeaf[];
}

type NavEntry = NavLeaf | NavGroup;

const ROOT = PATHS.ADMIN.ROOT;

const NAV: NavEntry[] = [
  {
    kind: 'leaf',
    label: 'Tableau de bord',
    icon: IconLayoutDashboard,
    path: ROOT,
    exact: true,
  },
  {
    kind: 'group',
    label: 'Étudiants',
    icon: IconUsers,
    items: [
      { kind: 'leaf', label: 'Liste des étudiants', icon: IconUsers,         path: `${ROOT}/students`       },
      { kind: 'leaf', label: 'Inscriptions',         icon: IconClipboardList, path: `${ROOT}/registrations`, soon: true },
    ],
  },
  {
    kind: 'group',
    label: 'Académique',
    icon: IconSchool,
    items: [
      { kind: 'leaf', label: 'Années académiques', icon: IconCalendar,   path: `${ROOT}/academic-years` },
      { kind: 'leaf', label: 'Clôture & réinscription', icon: IconGavel, path: `${ROOT}/year-closure`   },
      { kind: 'leaf', label: 'Signalements',       icon: IconSnowflake,  path: `${ROOT}/signalements`    },
      { kind: 'leaf', label: 'Niveaux',            icon: IconSchool,     path: `${ROOT}/levels`         },
      { kind: 'leaf', label: 'CNPN (programme)',    icon: IconBook2,      path: `${ROOT}/curriculum`     },
      { kind: 'leaf', label: 'Groupes',            icon: IconUsersGroup, path: `${ROOT}/groups`             },
    ],
  },
  {
    kind: 'group',
    label: 'Formation',
    icon: IconStethoscope,
    items: [
      { kind: 'leaf', label: 'Stages',   icon: IconStethoscope, path: `${ROOT}/stages`   },
      { kind: 'leaf', label: 'Calendrier', icon: IconCalendarEvent, path: `${ROOT}/timeline` },
      { kind: 'leaf', label: 'Répartition annuelle', icon: IconTable, path: `${ROOT}/repartition` },
      { kind: 'leaf', label: 'Bloc de rotation', icon: IconRefresh, path: `${ROOT}/rotation-cycle` },
      { kind: 'leaf', label: 'Jours fériés', icon: IconCalendarOff, path: `${ROOT}/holidays` },
    ],
  },
  {
    kind: 'group',
    label: 'Infrastructure',
    icon: IconBuildingHospital,
    items: [
      { kind: 'leaf', label: 'Centres / Hôpitaux / Services', icon: IconBuildingHospital, path: `${ROOT}/hospitals` },
      { kind: 'leaf', label: 'Charge des services', icon: IconChartBar, path: `${ROOT}/charge-services` },
    ],
  },
  {
    kind: 'group',
    label: 'Personnel',
    icon: IconBriefcase,
    items: [
      { kind: 'leaf', label: 'Employés', icon: IconUsers, path: `${ROOT}/employees` },
    ],
  },
  {
    kind: 'group',
    label: 'Suivi',
    icon: IconCalendarEvent,
    items: [
      { kind: 'leaf', label: 'Affectations', icon: IconClipboardCheck, path: `${ROOT}/assignments` },
      { kind: 'leaf', label: 'Présences',    icon: IconCalendarEvent,  path: `${ROOT}/attendance`  },
    ],
  },
];

const LANGS = [
  { code: 'FR', flag: '🇫🇷' },
  { code: 'AR', flag: '🇲🇦' },
  { code: 'EN', flag: '🇬🇧' },
] as const;

function AcademicYearSelector() {
  const { years, currentYear, currentYearId, setCurrentYearId } = useAcademicYear();
  if (years.length === 0) return null;

  const activeYear = years.find((y) => y.isCurrent);
  const viewingCurrent = currentYear?.isCurrent ?? false;

  return (
    <Group gap={6} wrap="nowrap" visibleFrom="sm">
      <Select
        size="xs"
        w={150}
        data={years.map((y) => ({
          value: String(y.id),
          label: y.isCurrent ? `${y.label} • actuelle` : y.label,
        }))}
        value={currentYearId ? String(currentYearId) : null}
        onChange={(v) => setCurrentYearId(v ? Number(v) : null)}
        radius="md"
        placeholder="Année…"
        allowDeselect={false}
      />
      {viewingCurrent ? (
        <Badge size="xs" color="teal" variant="light" radius="sm">Actuelle</Badge>
      ) : activeYear ? (
        <Tooltip label={`Revenir à l'année actuelle (${activeYear.label})`} position="bottom">
          <Badge
            size="xs" color="orange" variant="light" radius="sm"
            style={{ cursor: 'pointer' }}
            onClick={() => setCurrentYearId(activeYear.id)}
          >
            Année passée
          </Badge>
        </Tooltip>
      ) : null}
    </Group>
  );
}

const leafStyles = (active: boolean) => ({
  root: {
    borderRadius: rem(8),
    padding: `${rem(7)} ${rem(10)}`,
    backgroundColor: active ? '#E8F1FB' : 'transparent',
    color: active ? '#0F4C81' : '#475569',
  },
});

const groupStyles = (active: boolean) => ({
  root: {
    borderRadius: rem(8),
    padding: `${rem(7)} ${rem(10)}`,
    backgroundColor: active ? '#F0F6FF' : 'transparent',
    color: active ? '#0F4C81' : '#475569',
  },
  children: {
    paddingLeft: rem(8),
    borderLeft: '2px solid #E2E8F0',
    marginLeft: rem(14),
    marginTop: rem(2),
    marginBottom: rem(2),
  },
});

export function AdminLayout() {
  return (
    <AcademicYearProvider>
      <AdminLayoutInner />
    </AcademicYearProvider>
  );
}

function AdminLayoutInner() {
  const [opened, { toggle }] = useDisclosure();
  const { username, email, logout, hasRole } = useAuth();

  // A secrétaire reaches this shell only for Présences — she is an employee, not administration,
  // and the API refuses her everywhere else. Show her that one entry rather than a menu of links
  // that bounce off the route guard.
  const isAdministrative = hasRole(Roles.Scolarite) || hasRole(Roles.SuperUser);
  const nav = useMemo<NavEntry[]>(() => {
    if (isAdministrative) return NAV;
    return NAV
      .map((entry) => entry.kind === 'leaf'
        ? (entry.path === `${ROOT}/attendance` ? entry : null)
        : { ...entry, items: entry.items.filter((i) => i.path === `${ROOT}/attendance`) })
      .filter((entry): entry is NavEntry =>
        entry !== null && (entry.kind === 'leaf' || entry.items.length > 0));
  }, [isAdministrative]);
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string, exact = false) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  const isGroupActive = (group: NavGroup) =>
    group.items.some((i) => isActive(i.path, i.exact));

  const initStr = (username ?? email ?? 'A')
    .split(/[\s.@]/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('');

  const currentLeafLabel = (() => {
    for (const entry of nav) {
      if (entry.kind === 'leaf' && isActive(entry.path, entry.exact)) return entry.label;
      if (entry.kind === 'group') {
        const match = entry.items.find((i) => isActive(i.path, i.exact));
        if (match) return match.label;
      }
    }
    return 'Administration';
  })();

  const renderLeaf = (item: NavLeaf) => {
    const active = isActive(item.path, item.exact);
    return (
      <NavLink
        key={item.path}
        label={
          <Group justify="space-between" wrap="nowrap">
            <Text size="sm" fw={active ? 600 : 500} inherit>{item.label}</Text>
            {item.soon && (
              <Badge size="xs" variant="light" color="warning" radius="xl">Bientôt</Badge>
            )}
          </Group>
        }
        leftSection={<item.icon size={16} stroke={1.5} color={active ? '#0F4C81' : '#94A3B8'} />}
        active={active}
        styles={leafStyles(active)}
        onClick={() => { if (!item.soon) { navigate(item.path); if (opened) toggle(); } }}
      />
    );
  };

  const renderGroup = (group: NavGroup) => {
    const active = isGroupActive(group);
    return (
      <NavLink
        key={group.label}
        label={<Text size="sm" fw={active ? 600 : 500} inherit>{group.label}</Text>}
        leftSection={<group.icon size={16} stroke={1.5} color={active ? '#0F4C81' : '#94A3B8'} />}
        active={active}
        defaultOpened={active}
        styles={groupStyles(active)}
        childrenOffset={0}
      >
        {group.items.map(renderLeaf)}
      </NavLink>
    );
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 220, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding={0}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <AppShell.Header style={{ background: '#ffffff', borderBottom: '1px solid #E2E8F0' }}>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="xs">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Group gap={6} visibleFrom="sm">
              <Text size="sm" c="dimmed">Admin</Text>
              <Text size="sm" c="dimmed">/</Text>
              <Text size="sm" fw={600} c="navy.6">{currentLeafLabel}</Text>
            </Group>
          </Group>

          <Group gap="xs">
            <AcademicYearSelector />
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
                  px={6} py={2}
                  style={{
                    borderRadius: rem(6), fontSize: rem(12), fontWeight: 600,
                    color: lang.code === 'FR' ? 'var(--color-navy)' : '#94A3B8',
                    background: lang.code === 'FR' ? '#E8F1FB' : 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <Text span size="xs">{lang.flag} {lang.code}</Text>
                </UnstyledButton>
              ))}
            </Group>
            <Avatar size={32} radius="xl" style={{
              background: 'linear-gradient(135deg, #0F4C81 0%, #0EA5E9 100%)',
              color: '#fff', fontWeight: 700, fontSize: rem(13), cursor: 'pointer',
            }}>
              {initStr}
            </Avatar>
          </Group>
        </Group>
      </AppShell.Header>

      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <AppShell.Navbar
        style={{ background: '#ffffff', borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}
        p="md"
      >
        {/* Logo */}
        <Group gap="sm" mb="xl">
          <Avatar size={34} radius="md" style={{
            background: 'linear-gradient(135deg, #0F4C81 0%, #0EA5E9 100%)',
            color: '#fff', fontWeight: 800, fontSize: rem(13), flexShrink: 0,
          }}>
            PS
          </Avatar>
          <Stack gap={0}>
            <Text size="sm" fw={800} c="navy.6" lh={1.2}>PGSH</Text>
            <Text size={rem(11)} c="dimmed" lh={1.2}>Administration</Text>
          </Stack>
        </Group>

        <Text size="xs" fw={600} c="dimmed" tt="uppercase" mb="xs" style={{ letterSpacing: rem(0.8) }}>
          Menu
        </Text>

        <AppShell.Section grow style={{ overflowY: 'auto' }}>
          <Stack gap={2}>
            {nav.map((entry) =>
              entry.kind === 'leaf' ? renderLeaf(entry) : renderGroup(entry)
            )}
          </Stack>
        </AppShell.Section>

        {/* User card */}
        <Box mt="auto" pt="md" style={{ borderTop: '1px solid #E2E8F0' }}>
          <Group justify="space-between" wrap="nowrap">
            <Group gap="sm" style={{ overflow: 'hidden', flex: 1 }}>
              <Avatar size={32} radius="xl" style={{
                background: 'linear-gradient(135deg, #0F4C81 0%, #0EA5E9 100%)',
                color: '#fff', fontWeight: 700, fontSize: rem(12), flexShrink: 0,
              }}>
                {initStr}
              </Avatar>
              <Stack gap={0} style={{ overflow: 'hidden' }}>
                <Text size="sm" fw={600} truncate>{username ?? 'Admin'}</Text>
                <Text size="xs" c="dimmed" truncate>Administrateur</Text>
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

      {/* ── Main ───────────────────────────────────────────────────────── */}
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
