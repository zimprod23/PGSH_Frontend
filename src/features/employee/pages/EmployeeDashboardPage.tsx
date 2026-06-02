import { Container, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import {
  IconBuildingHospital,
  IconStar,
  IconClipboardList,
} from '@tabler/icons-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useGetCurrentEmployeeQuery,
  useGetServicePeriodsByServiceQuery,
} from '../api/employeeApi';
import { StatCard } from '../../student/components/StatCard';
import { GRADE_LABELS } from '../types/employee.types';

// ─── Null-render helper: fetches complete periods for one service ──────────────

function PendingEvalFetcher({
  serviceId,
  onResult,
}: {
  serviceId: number;
  onResult: (serviceId: number, count: number) => void;
}) {
  const { data } = useGetServicePeriodsByServiceQuery({ serviceId, isComplete: true });

  const count = useMemo(
    () => (data?.items ?? []).filter((p) => !p.hasEvaluation).length,
    [data],
  );

  useEffect(() => {
    onResult(serviceId, count);
  }, [serviceId, count, onResult]);

  return null;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EmployeeDashboardPage() {
  const { data: me, isLoading } = useGetCurrentEmployeeQuery();

  const displayName = me
    ? `${me.firstName ?? ''} ${me.lastName ?? ''}`.trim() || me.email
    : '…';

  const totalServices = me?.services.length ?? 0;
  const chefServices  = me?.services.filter((s) => s.isChef).length ?? 0;
  const chefServiceIds = useMemo(
    () => me?.services.filter((s) => s.isChef).map((s) => s.serviceId) ?? [],
    [me],
  );

  const [pendingByService, setPendingByService] = useState<Record<number, number>>({});

  const handlePendingResult = useCallback((serviceId: number, count: number) => {
    setPendingByService((prev) => {
      if (prev[serviceId] === count) return prev;
      return { ...prev, [serviceId]: count };
    });
  }, []);

  const totalPending = Object.values(pendingByService).reduce((a, b) => a + b, 0);

  return (
    <Container fluid>
      <Stack gap="xl">
        {chefServiceIds.map((id) => (
          <PendingEvalFetcher key={id} serviceId={id} onResult={handlePendingResult} />
        ))}

        <Stack gap={4}>
          <Title order={1} fw={800}>Bonjour, {displayName}</Title>
          <Text size="sm" c="dimmed">
            {me ? GRADE_LABELS[me.grade] : ''}
          </Text>
        </Stack>

        <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="md">
          <StatCard
            icon={IconBuildingHospital}
            iconColor="navy"
            label="Services assignés"
            value={isLoading ? '…' : String(totalServices)}
            sub={totalServices === 0 ? 'Aucun service actif' : 'Services dans lesquels vous exercez'}
            loading={isLoading}
          />
          <StatCard
            icon={IconStar}
            iconColor="sky"
            label="Chef de service"
            value={isLoading ? '…' : String(chefServices)}
            sub={chefServices === 0 ? 'Aucun service en chef' : 'Services dont vous êtes responsable'}
            loading={isLoading}
          />
          <StatCard
            icon={IconClipboardList}
            iconColor="warning"
            label="Évaluations en attente"
            value={isLoading || chefServices === 0 ? '—' : String(totalPending)}
            sub={
              chefServices === 0
                ? 'Aucun service en chef'
                : totalPending === 0
                ? 'Toutes les rotations sont évaluées'
                : 'Rotations terminées sans évaluation'
            }
            loading={isLoading}
          />
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
