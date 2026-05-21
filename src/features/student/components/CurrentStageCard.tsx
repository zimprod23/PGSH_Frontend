import {
  Badge,
  Box,
  Button,
  Card,
  Group,
  Skeleton,
  Stack,
  Text,
} from '@mantine/core';
import { IconStethoscope, IconCalendar } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import type { StudentRegistrationSummary } from '../types/student.types';
import { RegistrationBadge } from './RegistrationBadge';
import { formatLevel } from '../utils/format';
import { PATHS } from '../../../routes/paths';

interface Props {
  registration: StudentRegistrationSummary | null;
  loading: boolean;
}

export function CurrentStageCard({ registration, loading }: Props) {
  const navigate = useNavigate();

  return (
    <Card padding={0} radius="lg" withBorder shadow="sm" style={{ overflow: 'hidden', height: '100%' }}>
      {/* Gradient header */}
      <Box
        p="lg"
        style={{
          background: 'linear-gradient(135deg, #0F4C81 0%, #0EA5E9 100%)',
          color: '#fff',
        }}
      >
        <Group justify="space-between" align="flex-start">
          <Stack gap={4}>
            <Text size="xs" fw={600} style={{ opacity: 0.8, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Mon stage actuel
            </Text>
            {loading ? (
              <Skeleton height={22} width={200} />
            ) : registration ? (
              <Text fw={700} size="md">
                {formatLevel(registration.level.year, registration.level.academicProgram)}
              </Text>
            ) : (
              <Text fw={700} size="md">Aucune inscription active</Text>
            )}
          </Stack>
          {!loading && registration && (
            <RegistrationBadge status={registration.status} />
          )}
        </Group>

        {!loading && registration && (
          <Group gap="xs" mt="sm">
            <IconCalendar size={14} stroke={1.5} style={{ opacity: 0.8 }} />
            <Text size="xs" style={{ opacity: 0.85 }}>
              {registration.academicYear}
            </Text>
          </Group>
        )}
      </Box>

      {/* Body */}
      <Box p="lg">
        {loading ? (
          <Stack gap="sm">
            <Skeleton height={14} width="80%" />
            <Skeleton height={14} width="55%" />
            <Skeleton height={36} mt="sm" />
          </Stack>
        ) : registration ? (
          <Stack gap="md">
            <Group gap="xs">
              <IconStethoscope size={16} stroke={1.5} color="#94A3B8" />
              <Text size="sm" c="dimmed">
                L'affectation au service hospitalier sera communiquée par la scolarité.
              </Text>
            </Group>

            <Button
              variant="filled"
              color="navy"
              size="sm"
              radius="md"
              onClick={() => navigate(`${PATHS.STUDENT.ROOT}/${PATHS.STUDENT.STAGES}`)}
            >
              Voir mes stages
            </Button>
          </Stack>
        ) : (
          <Stack gap="sm">
            <Text size="sm" c="dimmed">
              Aucune inscription active pour l'année en cours.
            </Text>
            <Badge variant="light" color="warning" radius="xl">
              En attente d'inscription
            </Badge>
          </Stack>
        )}
      </Box>
    </Card>
  );
}
