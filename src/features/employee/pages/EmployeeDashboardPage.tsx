import { Container, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import {
  IconBuildingHospital,
  IconCalendar,
  IconClipboardList,
} from '@tabler/icons-react';
import { useAuth } from '../../../common/hooks/useAuth';
import { StatCard } from '../../student/components/StatCard';

export default function EmployeeDashboardPage() {
  const { username } = useAuth();

  return (
    <Container fluid>
      <Stack gap="xl">
        <Stack gap={4}>
          <Title order={1} fw={800}>Bonjour, {username ?? 'Employé'}</Title>
          <Text size="sm" c="dimmed">Vue d'ensemble de votre espace.</Text>
        </Stack>

        <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="md">
          <StatCard
            icon={IconBuildingHospital}
            iconColor="navy"
            label="Services assignés"
            value="—"
            sub="Disponible prochainement"
            loading={false}
          />
          <StatCard
            icon={IconCalendar}
            iconColor="sky"
            label="Présences ce mois"
            value="—"
            sub="Disponible prochainement"
            loading={false}
          />
          <StatCard
            icon={IconClipboardList}
            iconColor="warning"
            label="Évaluations en attente"
            value="—"
            sub="Disponible prochainement"
            loading={false}
          />
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
