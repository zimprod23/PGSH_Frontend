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
  IconStethoscope,
  IconBuildingHospital,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useGetStudentsQuery, useGetStagesQuery, useGetAcademicGroupsQuery } from '../api/adminApi';
import { useAcademicYear } from '../contexts/AcademicYearContext';
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

  // Both counts are of a promotion, not of the whole imported history: 1,003 groups exist across
  // every year against ~101 in the current one. Passing the navbar's year also means changing it
  // refetches these — the query key carries it.
  const { currentYear, currentYearId } = useAcademicYear();
  const yearArg = currentYearId ?? undefined;

  const { data: studentsPage, isLoading: loadingStudents } = useGetStudentsQuery(
    { academicYearId: yearArg, pageNumber: 1, pageSize: 1 },
  );
  const { data: stagesPage,   isLoading: loadingStages   } = useGetStagesQuery({ pageNumber: 1, pageSize: 1 });
  // Only the count is shown, so ask for one row and read totalCount — this used to pull all 1,003
  // groups across every year just to render a number.
  const { data: groupsPage,   isLoading: loadingGroups   } = useGetAcademicGroupsQuery(
    { academicYearId: yearArg, pageNumber: 1, pageSize: 1 },
  );
  const groupCount = groupsPage?.totalCount ?? 0;

  return (
    <Container fluid>
      <Stack gap="xl">
        <Stack gap={4}>
          <Title order={1} fw={800}>Tableau de bord</Title>
          <Text size="sm" c="dimmed">Vue d'ensemble de la plateforme.</Text>
        </Stack>

        <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="md">
          {/* Both year-scoped tiles name their year. Without it the count silently changed meaning
              when the year filter landed — 8,077 enrolled this year against 10,204 student records
              going back to 2015 — and a number whose meaning you have to guess is worse than a
              wrong one. */}
          <StatCard
            icon={IconUsers}
            iconColor="navy"
            label="Étudiants inscrits"
            value={studentsPage?.totalCount ?? '—'}
            sub={currentYear?.label}
            loading={loadingStudents}
          />
          <StatCard
            icon={IconStethoscope}
            iconColor="sky"
            label="Stages configurés"
            value={stagesPage?.totalCount ?? '—'}
            loading={loadingStages}
          />
          <StatCard
            icon={IconUsersGroup}
            iconColor="success"
            label="Groupes formés"
            value={loadingGroups ? '…' : String(groupCount)}
            sub={groupCount === 0
              ? `Aucun groupe pour ${currentYear?.label ?? 'cette année'}`
              : currentYear?.label}
            loading={loadingGroups}
          />
        </SimpleGrid>

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
              onClick={() => navigate(`${PATHS.ADMIN.ROOT}/${PATHS.ADMIN.STUDENTS}`)}
            />
            <QuickAction
              icon={IconUsersGroup}
              color="success"
              label="Groupes académiques"
              description="Former et réorganiser les groupes d'étudiants"
              onClick={() => navigate(`${PATHS.ADMIN.ROOT}/${PATHS.ADMIN.GROUPS}`)}
            />
            <QuickAction
              icon={IconClipboardList}
              color="sky"
              label="Affectations & Rotations"
              description="Suivre les affectations et les périodes de stage"
              onClick={() => navigate(`${PATHS.ADMIN.ROOT}/${PATHS.ADMIN.ASSIGNMENTS}`)}
            />
            <QuickAction
              icon={IconStethoscope}
              color="violet"
              label="Stages"
              description="Créer et configurer les stages par niveau"
              onClick={() => navigate(`${PATHS.ADMIN.ROOT}/${PATHS.ADMIN.STAGES}`)}
            />
            <QuickAction
              icon={IconBuildingHospital}
              color="teal"
              label="Infrastructure hospitalière"
              description="Gérer les centres, hôpitaux et services"
              onClick={() => navigate(`${PATHS.ADMIN.ROOT}/${PATHS.ADMIN.HOSPITALS}`)}
            />
          </SimpleGrid>
        </Stack>
      </Stack>
    </Container>
  );
}
