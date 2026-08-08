import {
  Accordion,
  Badge,
  Box,
  Card,
  Center,
  Group,
  Skeleton,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Tooltip,
  UnstyledButton,
  rem,
} from '@mantine/core';
import { IconRepeat, IconSchool, IconUsersGroup } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import type { ParcoursStage, ParcoursYear } from '../types/parcours.types';
import { ParcoursTotalsBar } from './ParcoursTotalsBar';
import { RegistrationBadge } from './RegistrationBadge';
import { StageStateBadge } from './StageStateBadge';
import { finalNoteOf, formatRotationSpan, stageStateOf } from '../utils/stageState';
import { PATHS } from '../../../routes/paths';

function StageRow({ stage, onOpen }: { stage: ParcoursStage; onOpen: () => void }) {
  const note = finalNoteOf(stage);
  const span = formatRotationSpan(stage.startDate, stage.endDate);

  return (
    <Table.Tr style={{ cursor: 'pointer' }} onClick={onOpen}>
      <Table.Td>
        <Stack gap={2}>
          <Group gap={6} wrap="nowrap">
            <Text size="sm" fw={600} lineClamp={1}>{stage.stageName}</Text>
            {stage.attemptNumber > 1 && (
              <Tooltip label="Nouvelle tentative de ce stage" withArrow>
                <Badge
                  size="xs" variant="light" color="grape" radius="sm"
                  leftSection={<IconRepeat size={9} stroke={2} />}
                >
                  {stage.attemptNumber}
                </Badge>
              </Tooltip>
            )}
          </Group>
          <Text size="xs" c="dimmed" lineClamp={1}>
            {stage.cohortLabel}
            {stage.stageLevelLabel ? ` · ${stage.stageLevelLabel}` : ''}
          </Text>
        </Stack>
      </Table.Td>

      <Table.Td visibleFrom="md">
        <Text size="xs" c="dimmed">{span ?? 'Non planifié'}</Text>
      </Table.Td>

      <Table.Td>
        <StageStateBadge state={stageStateOf(stage)} size="xs" />
      </Table.Td>

      <Table.Td style={{ textAlign: 'right' }}>
        {note !== null ? (
          <Text size="sm" fw={700} c={note >= 10 ? 'teal.7' : 'red.7'}>
            {note.toFixed(2)}
          </Text>
        ) : (
          <Text size="xs" c="dimmed">—</Text>
        )}
      </Table.Td>
    </Table.Tr>
  );
}

/**
 * Phone layout for one line of the relevé. A four-column table on a 400 px screen pushes the note —
 * the column the student actually opened the relevé for — off the right edge and truncates the state
 * badge to "EN ATTE…". Stacked, everything fits and nothing needs horizontal scrolling.
 */
function StageCardRow({ stage, onOpen }: { stage: ParcoursStage; onOpen: () => void }) {
  const note = finalNoteOf(stage);
  const span = formatRotationSpan(stage.startDate, stage.endDate);

  return (
    <UnstyledButton
      onClick={onOpen}
      p="xs"
      style={{
        width: '100%',
        borderRadius: rem(8),
        border: '1px solid var(--mantine-color-gray-2)',
      }}
    >
      <Stack gap={6}>
        <Group justify="space-between" wrap="nowrap" gap="xs" align="flex-start">
          <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
            <Text size="sm" fw={600} lineClamp={2}>{stage.stageName}</Text>
            {stage.attemptNumber > 1 && (
              <Badge
                size="xs" variant="light" color="grape" radius="sm"
                leftSection={<IconRepeat size={9} stroke={2} />}
                style={{ flexShrink: 0 }}
              >
                {stage.attemptNumber}
              </Badge>
            )}
          </Group>
          {note !== null ? (
            <Text
              size="sm" fw={700} style={{ flexShrink: 0 }}
              c={note >= 10 ? 'teal.7' : 'red.7'}
            >
              {note.toFixed(2)}
            </Text>
          ) : (
            <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>—</Text>
          )}
        </Group>

        <Text size="xs" c="dimmed" lineClamp={1}>
          {stage.cohortLabel}
        </Text>

        <Group justify="space-between" wrap="nowrap" gap="xs">
          <StageStateBadge state={stageStateOf(stage)} size="xs" />
          <Text size="xs" c="dimmed" lineClamp={1} style={{ textAlign: 'right' }}>
            {span ?? 'Non planifié'}
          </Text>
        </Group>
      </Stack>
    </UnstyledButton>
  );
}

function YearPanel({ year }: { year: ParcoursYear }) {
  const navigate = useNavigate();

  const openStage = (stage: ParcoursStage) =>
    navigate(
      `${PATHS.STUDENT.ROOT}/${PATHS.STUDENT.STAGES}/${stage.stageId}` +
      `?attempt=${stage.assignmentId}`,
    );

  if (year.stages.length === 0) {
    return (
      <Text size="sm" c="dimmed" py="xs">
        Aucun stage n'a été affecté sur cette inscription.
      </Text>
    );
  }

  return (
    <Stack gap="md">
      <ParcoursTotalsBar totals={year.totals} />

      <Box visibleFrom="sm">
        <Table highlightOnHover verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Stage</Table.Th>
              <Table.Th visibleFrom="md">Période</Table.Th>
              <Table.Th>État</Table.Th>
              <Table.Th style={{ textAlign: 'right', width: rem(80) }}>Note</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {year.stages.map((stage) => (
              <StageRow
                key={stage.assignmentId}
                stage={stage}
                onOpen={() => openStage(stage)}
              />
            ))}
          </Table.Tbody>
        </Table>
      </Box>

      <Stack gap="xs" hiddenFrom="sm">
        {year.stages.map((stage) => (
          <StageCardRow
            key={stage.assignmentId}
            stage={stage}
            onOpen={() => openStage(stage)}
          />
        ))}
      </Stack>
    </Stack>
  );
}

interface Props {
  years: ParcoursYear[];
  loading: boolean;
}

/**
 * The academic side of the history: what was served each year and how it went. The event timeline
 * next to it records what *happened to* the student (transfers, status changes) — it never held the
 * record itself, which is why the portal had no history to show.
 */
export function ParcoursRecord({ years, loading }: Props) {
  if (loading) {
    return (
      <Stack gap="md">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} height={72} radius="md" />
        ))}
      </Stack>
    );
  }

  if (years.length === 0) {
    return (
      <Center py={64}>
        <Stack align="center" gap="sm" maw={340}>
          <ThemeIcon size={56} radius="xl" variant="light" color="navy">
            <IconSchool style={{ width: rem(26), height: rem(26) }} stroke={1.5} />
          </ThemeIcon>
          <Text fw={600}>Aucun parcours enregistré</Text>
          <Text size="sm" c="dimmed" ta="center">
            Votre relevé de stages apparaîtra ici dès votre première inscription.
          </Text>
        </Stack>
      </Center>
    );
  }

  const defaultOpen = (years.find((y) => y.isCurrent) ?? years[0]).registrationId;

  return (
    <Accordion variant="separated" radius="lg" defaultValue={defaultOpen} multiple={false}>
      {years.map((year) => (
        <Accordion.Item key={year.registrationId} value={year.registrationId}>
          {/* Wraps rather than squeezing: on a phone the year/level block and the two badges cannot
              share one line without truncating both. */}
          <Accordion.Control>
            <Group justify="space-between" wrap="wrap" gap="xs" pr="sm">
              <Stack gap={2} style={{ minWidth: 0, flex: '1 1 240px' }}>
                <Group gap="xs" wrap="nowrap">
                  <Text fw={700} size="sm">{year.academicYearLabel}</Text>
                  {year.isCurrent && (
                    <Badge size="xs" variant="light" color="sky" radius="sm">En cours</Badge>
                  )}
                </Group>
                <Group gap="sm" wrap="nowrap">
                  <Text size="xs" c="dimmed" lineClamp={1}>
                    {year.levelLabel ?? `Année ${year.levelYear}`}
                  </Text>
                  {year.academicGroupLabel && (
                    <Group gap={4} wrap="nowrap" style={{ minWidth: 0 }}>
                      <IconUsersGroup
                        size={12} stroke={1.5} color="#94A3B8" style={{ flexShrink: 0 }}
                      />
                      <Text size="xs" c="dimmed" lineClamp={1}>{year.academicGroupLabel}</Text>
                    </Group>
                  )}
                </Group>
              </Stack>

              <Group gap="xs" wrap="wrap">
                <Badge
                  size="sm" variant="light" radius="xl"
                  color={year.totals.total === 0 ? 'gray' : 'teal'}
                >
                  {year.totals.total === 0
                    ? 'Aucun stage'
                    : `${year.totals.validated}/${year.totals.total} validés`}
                </Badge>
                <RegistrationBadge status={year.registrationStatus} size="xs" />
              </Group>
            </Group>
          </Accordion.Control>

          <Accordion.Panel>
            <YearPanel year={year} />
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}

/** Compact totals card for the sidebar next to the record. */
export function ParcoursSummaryCard({ years }: { years: ParcoursYear[] }) {
  const totals = years.reduce(
    (acc, y) => ({
      planned: acc.planned + y.totals.planned,
      ongoing: acc.ongoing + y.totals.ongoing,
      awaitingVerdict: acc.awaitingVerdict + y.totals.awaitingVerdict,
      validated: acc.validated + y.totals.validated,
      failed: acc.failed + y.totals.failed,
      total: acc.total + y.totals.total,
    }),
    { planned: 0, ongoing: 0, awaitingVerdict: 0, validated: 0, failed: 0, total: 0 },
  );

  return (
    <Card padding="lg" radius="lg" withBorder shadow="sm">
      <Stack gap="md">
        <Text fw={600} size="sm">Relevé</Text>

        <Stack gap={4}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600} style={{ letterSpacing: '0.5px' }}>
            Stages validés
          </Text>
          <Group gap={6} align="baseline">
            <Text fw={800} style={{ fontSize: rem(32), lineHeight: 1 }}>{totals.validated}</Text>
            <Text size="sm" c="dimmed">/ {totals.total}</Text>
          </Group>
          <Text size="xs" c="dimmed">
            sur {years.length} année{years.length > 1 ? 's' : ''} d'inscription
          </Text>
        </Stack>

        <ParcoursTotalsBar totals={totals} />
      </Stack>
    </Card>
  );
}
