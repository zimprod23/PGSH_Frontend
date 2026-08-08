import {
  Badge,
  Box,
  Button,
  Card,
  Group,
  Progress,
  Skeleton,
  Stack,
  Text,
  UnstyledButton,
} from '@mantine/core';
import { IconCalendar, IconChevronRight, IconStethoscope } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import type { ParcoursStage } from '../types/parcours.types';
import type { StudentRegistrationSummary } from '../types/student.types';
import { RegistrationBadge } from './RegistrationBadge';
import { StageStateBadge } from './StageStateBadge';
import { formatLevel } from '../utils/format';
import { formatRotationSpan, stageStateOf } from '../utils/stageState';
import { PATHS } from '../../../routes/paths';

interface Props {
  registration: StudentRegistrationSummary | null;
  /** Stages of the year in progress that are under way or about to be — most imminent first. */
  liveStages: ParcoursStage[];
  loading: boolean;
}

function LiveStageRow({ stage, onOpen }: { stage: ParcoursStage; onOpen: () => void }) {
  const span = formatRotationSpan(stage.startDate, stage.endDate);
  const progress = stage.periodsTotal > 0
    ? Math.round((stage.periodsComplete / stage.periodsTotal) * 100)
    : 0;

  return (
    <UnstyledButton onClick={onOpen} style={{ width: '100%' }}>
      <Stack gap={6}>
        <Group justify="space-between" wrap="nowrap" gap="xs">
          <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
            <IconStethoscope size={15} stroke={1.5} color="#0F4C81" style={{ flexShrink: 0 }} />
            <Text size="sm" fw={600} lineClamp={1}>{stage.stageName}</Text>
          </Group>
          <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
            <StageStateBadge state={stageStateOf(stage)} size="xs" />
            <IconChevronRight size={14} stroke={1.5} color="#94A3B8" />
          </Group>
        </Group>

        <Group justify="space-between" gap="xs" wrap="nowrap">
          <Text size="xs" c="dimmed" lineClamp={1}>
            {span ?? stage.cohortLabel}
          </Text>
          {stage.periodsTotal > 0 && (
            <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
              {stage.periodsComplete}/{stage.periodsTotal} rotations
            </Text>
          )}
        </Group>

        {stage.periodsTotal > 0 && (
          <Progress value={progress} color="navy" size="xs" radius="xl" />
        )}
      </Stack>
    </UnstyledButton>
  );
}

export function CurrentStageCard({ registration, liveStages, loading }: Props) {
  const navigate = useNavigate();
  const goToStages = () => navigate(`${PATHS.STUDENT.ROOT}/${PATHS.STUDENT.STAGES}`);

  return (
    <Card padding={0} radius="lg" withBorder shadow="sm" style={{ overflow: 'hidden', height: '100%' }}>
      <Box
        p="lg"
        style={{ background: 'linear-gradient(135deg, #0F4C81 0%, #0EA5E9 100%)', color: '#fff' }}
      >
        <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
          <Stack gap={4} style={{ minWidth: 0 }}>
            <Text
              size="xs" fw={600}
              style={{ opacity: 0.8, letterSpacing: '0.5px', textTransform: 'uppercase' }}
            >
              Mon année en cours
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
            <RegistrationBadge status={registration.status} onDark />
          )}
        </Group>

        {!loading && registration && (
          <Group gap="xs" mt="sm">
            <IconCalendar size={14} stroke={1.5} style={{ opacity: 0.8 }} />
            <Text size="xs" style={{ opacity: 0.85 }}>{registration.academicYear}</Text>
          </Group>
        )}
      </Box>

      <Box p="lg">
        {loading ? (
          <Stack gap="sm">
            <Skeleton height={14} width="80%" />
            <Skeleton height={14} width="55%" />
            <Skeleton height={36} mt="sm" />
          </Stack>
        ) : !registration ? (
          <Stack gap="sm">
            <Text size="sm" c="dimmed">
              Aucune inscription active pour l'année en cours.
            </Text>
            <Badge variant="light" color="warning" radius="xl">En attente d'inscription</Badge>
          </Stack>
        ) : (
          <Stack gap="md">
            {liveStages.length === 0 ? (
              <Group gap="xs" wrap="nowrap">
                <IconStethoscope size={16} stroke={1.5} color="#94A3B8" />
                <Text size="sm" c="dimmed">
                  Aucun stage en cours. Vos affectations seront communiquées par la scolarité.
                </Text>
              </Group>
            ) : (
              <Stack gap="md">
                {liveStages.map((stage) => (
                  <LiveStageRow
                    key={stage.assignmentId}
                    stage={stage}
                    onOpen={() =>
                      navigate(
                        `${PATHS.STUDENT.ROOT}/${PATHS.STUDENT.STAGES}/${stage.stageId}` +
                        `?attempt=${stage.assignmentId}`,
                      )
                    }
                  />
                ))}
              </Stack>
            )}

            <Button variant="filled" color="navy" size="sm" radius="md" onClick={goToStages}>
              Voir tous mes stages
            </Button>
          </Stack>
        )}
      </Box>
    </Card>
  );
}
