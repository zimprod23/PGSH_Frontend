import {
  Card,
  Container,
  Group,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
  UnstyledButton,
  rem,
} from '@mantine/core';
import {
  IconUsers,
  IconClipboardList,
  IconUsersGroup,
  IconArrowRight,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useGetStudentsQuery } from '../api/adminApi';
import { StatCard } from '../../student/components/StatCard';
import { PATHS } from '../../../routes/paths';

// ─── Quick action card ────────────────────────────────────────────────────────

function QuickAction({
  icon: Icon,
  color,
  label,
  description,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number; stroke?: number }>;
  color: string;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <UnstyledButton onClick={onClick} style={{ display: 'block' }}>
      <Card
        padding="md"
        radius="lg"
        withBorder
        shadow="sm"
        style={{ cursor: 'pointer', transition: 'box-shadow 150ms ease, border-color 150ms ease' }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)';
          (e.currentTarget as HTMLElement).style.borderColor = '#0EA5E9';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
          (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0';
        }}
      >
        <Group justify="space-between" align="flex-start">
          <Group gap="sm">
            <ThemeIcon variant="light" color={color} size={40} radius="md">
              <Icon size={20} stroke={1.5} />
            </ThemeIcon>
            <Stack gap={2}>
              <Text size="sm" fw={600}>{label}</Text>
              <Text size="xs" c="dimmed">{description}</Text>
            </Stack>
          </Group>
          <IconArrowRight size={16} stroke={1.5} color="#94A3B8" style={{ marginTop: rem(2) }} />
        </Group>
      </Card>
    </UnstyledButton>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const navigate = useNavigate();

  // Fetch with pageSize 1 — we only need totalCount for the stat
  const { data: studentsPage, isLoading } = useGetStudentsQuery({ pageNumber: 1, pageSize: 1 });

  return (
    <Container fluid>
      <Stack gap="xl">
        {/* Greeting */}
        <Stack gap={4}>
          <Title order={1} fw={800}>Tableau de bord</Title>
          <Text size="sm" c="dimmed">Vue d'ensemble de la plateforme.</Text>
        </Stack>

        {/* Stat cards */}
        <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="md">
          <StatCard
            icon={IconUsers}
            iconColor="navy"
            label="Étudiants inscrits"
            value={studentsPage?.totalCount ?? '—'}
            loading={isLoading}
          />
          <StatCard
            icon={IconClipboardList}
            iconColor="sky"
            label="Inscriptions actives"
            value="—"
            sub="Disponible prochainement"
            loading={false}
          />
          <StatCard
            icon={IconUsersGroup}
            iconColor="success"
            label="Groupes formés"
            value="—"
            sub="Disponible prochainement"
            loading={false}
          />
        </SimpleGrid>

        {/* Quick actions */}
        <Stack gap="sm">
          <Text size="sm" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
            Accès rapide
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
            <QuickAction
              icon={IconUsers}
              color="navy"
              label="Gérer les étudiants"
              description="Rechercher, consulter et gérer les profils étudiants"
              onClick={() => navigate(`${PATHS.ADMIN.ROOT}/students`)}
            />
            <QuickAction
              icon={IconClipboardList}
              color="sky"
              label="Inscriptions"
              description="Gérer les inscriptions et les statuts par année académique"
              onClick={() => {}}
            />
            <QuickAction
              icon={IconUsersGroup}
              color="success"
              label="Groupes académiques"
              description="Former et réorganiser les groupes d'étudiants"
              onClick={() => {}}
            />
          </SimpleGrid>
        </Stack>
      </Stack>
    </Container>
  );
}
