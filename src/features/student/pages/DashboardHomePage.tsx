import { Container, SimpleGrid, Skeleton, Stack, Text, Title } from '@mantine/core';
import {
  IconCalendar,
  IconCircleCheck,
  IconStethoscope,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useGetCurrentStudentQuery, useGetStudentHistoryQuery } from '../api/studentApi';
import { StatCard } from '../components/StatCard';
import { RegistrationBadge } from '../components/RegistrationBadge';
import { CurrentStageCard } from '../components/CurrentStageCard';
import { ActivityTimeline } from '../components/ActivityTimeline';
import { PATHS } from '../../../routes/paths';

export default function DashboardHomePage() {
  const navigate = useNavigate();

  const { data: student, isLoading: studentLoading } = useGetCurrentStudentQuery();

  const { data: history = [], isLoading: historyLoading } = useGetStudentHistoryQuery(
    student?.id ?? '',
    { skip: !student?.id },
  );

  const greeting = student
    ? `Bonjour, ${student.firstName} 👋`
    : 'Bonjour 👋';

  return (
    <Container fluid>
      <Stack gap="xl">
        {/* Greeting */}
        <Stack gap={4}>
          {studentLoading ? (
            <Skeleton height={36} width={280} radius="md" />
          ) : (
            <Title order={1} fw={800}>{greeting}</Title>
          )}
          <Text c="dimmed" size="sm">
            Voici un aperçu de votre parcours de stage.
          </Text>
        </Stack>

        {/* Stat cards */}
        <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="md">
          <StatCard
            icon={IconCalendar}
            iconColor="sky"
            label="Année académique"
            value={student?.currentRegistration?.academicYear ?? '—'}
            loading={studentLoading}
          />
          <StatCard
            icon={IconCircleCheck}
            iconColor="success"
            label="Statut d'inscription"
            value={
              student?.currentRegistration
                ? <RegistrationBadge status={student.currentRegistration.status} size="md" />
                : <Text c="dimmed" size="sm">—</Text>
            }
            loading={studentLoading}
          />
          <StatCard
            icon={IconStethoscope}
            iconColor="navy"
            label="Stages effectués"
            value="—"
            sub="Disponible prochainement"
            loading={studentLoading}
          />
          <StatCard
            icon={IconAlertTriangle}
            iconColor="warning"
            label="Absences"
            value="—"
            sub="Disponible prochainement"
            loading={studentLoading}
          />
        </SimpleGrid>

        {/* Current stage + activity */}
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          <CurrentStageCard
            registration={student?.currentRegistration ?? null}
            loading={studentLoading}
          />
          <ActivityTimeline
            events={history.slice(0, 4)}
            loading={historyLoading}
            onSeeAll={() => navigate(`${PATHS.STUDENT.ROOT}/${PATHS.STUDENT.HISTORY}`)}
          />
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
