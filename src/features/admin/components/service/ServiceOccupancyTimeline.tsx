import { useState } from 'react';
import {
  Alert, Badge, Box, Group, Paper, Progress, Stack, Table, Text, Tooltip, UnstyledButton,
} from '@mantine/core';
import { IconAlertTriangle, IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import type { OccupancySegmentResponse, ServiceOccupancyResponse } from '../../types/admin.types';
import { ServiceOccupantsTable } from './ServiceOccupantsTable';

/**
 * What the service actually holds, stretch by stretch.
 *
 * ⚠ **The rows are not periods.** Nothing ties two stages' periods together — `StageSlot` is keyed
 * (stage, year, number), so Chirurgie P1 and ANES REA P1 have independent dates and legitimately
 * different lengths. One row per slot would print each slot's own cohorts, while the students
 * standing here on a given morning are the union of every window covering that day: **the peak lives
 * in the overlap**, and a per-slot list never shows it. The server therefore cuts the year at every
 * window boundary and each row below is a stretch over which the occupants do not change.
 */

const dateFormat = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const printDate = (iso: string) => dateFormat.format(new Date(iso));

interface Props {
  report: ServiceOccupancyResponse;
}

export function ServiceOccupancyTimeline({ report }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (report.segments.length === 0) {
    return (
      <Alert color="gray" variant="light">
        Aucun groupe n’est planifié dans ce service en {report.academicYearLabel}. Ce n’est pas une
        erreur&nbsp;: le service existe et n’a simplement rien à accueillir cette année.
      </Alert>
    );
  }

  return (
    <Stack gap="sm">
      {report.summary.overCapacitySegments > 0 && (
        <Alert color="orange" variant="light" icon={<IconAlertTriangle size={18} />}>
          <strong>
            {report.summary.overCapacitySegments} période
            {report.summary.overCapacitySegments > 1 ? 's' : ''} au-dessus de la limite
          </strong>
          , sur {report.summary.daysOverCapacity} jour
          {report.summary.daysOverCapacity > 1 ? 's' : ''} cumulés. Pic&nbsp;:{' '}
          <strong>{report.summary.peakStudents} étudiants</strong>
          {report.summary.peakStart && (
            <> du {printDate(report.summary.peakStart)} au {printDate(report.summary.peakEnd!)}</>
          )}
          .{' '}
          {/* The distinction that makes this actionable: an over-filled service is usually over-filled
              by a stage nobody was looking at, because the guard counts every stage and promotion that
              overlaps the dates — not just the one being planned. */}
          {report.summary.distinctStages > 1 && (
            <>
              La charge vient de {report.summary.distinctStages} stages et{' '}
              {report.summary.distinctLevels} promotion{report.summary.distinctLevels > 1 ? 's' : ''} —
              dépliez une ligne pour voir lesquels.
            </>
          )}
        </Alert>
      )}

      <Paper withBorder radius="md" style={{ overflow: 'hidden' }}>
        <Table striped highlightOnHover verticalSpacing="xs" horizontalSpacing="md">
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ width: 34 }} />
              <Table.Th>Période</Table.Th>
              <Table.Th style={{ width: 70 }}>Jours</Table.Th>
              <Table.Th style={{ width: 210 }}>Occupation</Table.Th>
              <Table.Th>Promotions présentes</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {report.segments.map((segment) => {
              const key = `${segment.startDate}_${segment.endDate}`;
              const isOpen = expanded === key;

              return (
                <>
                  <Table.Tr
                    key={key}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setExpanded(isOpen ? null : key)}
                  >
                    <Table.Td>
                      {isOpen ? <IconChevronDown size={15} /> : <IconChevronRight size={15} />}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500} style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {printDate(segment.startDate)} → {printDate(segment.endDate)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {segment.days}
                      </Text>
                    </Table.Td>
                    <Table.Td><LoadBar segment={segment} /></Table.Td>
                    <Table.Td>
                      <Group gap={6} wrap="wrap">
                        {segment.levels.map((level) => (
                          <Tooltip
                            key={level.levelId}
                            withArrow
                            label={
                              level.notAdmitted
                                ? `Ce service n’admet pas ${level.levelLabel} : des quotas existent et aucun ne le nomme.`
                                : level.capacity != null
                                  ? `${level.students} / ${level.capacity} — quota de ${level.levelLabel}`
                                  : `${level.students} étudiants de ${level.levelLabel}`
                            }
                          >
                            <Badge
                              size="sm"
                              variant={level.overflow > 0 ? 'filled' : 'light'}
                              color={level.notAdmitted ? 'red' : level.overflow > 0 ? 'orange' : 'gray'}
                            >
                              {level.levelLabel} · {level.students}
                              {level.capacity != null && `/${level.capacity}`}
                            </Badge>
                          </Tooltip>
                        ))}
                      </Group>
                    </Table.Td>
                  </Table.Tr>

                  {isOpen && (
                    <Table.Tr key={`${key}-detail`}>
                      <Table.Td colSpan={5} p={0}>
                        <Box p="md" bg="var(--mantine-color-gray-0)">
                          <SegmentDetail serviceId={report.serviceId} segment={segment} />
                        </Box>
                      </Table.Td>
                    </Table.Tr>
                  )}
                </>
              );
            })}
          </Table.Tbody>
        </Table>
      </Paper>
    </Stack>
  );
}

/**
 * The bar is capped at 100% but the *number* is not: on a service holding 85 against 20 a bar alone
 * says only "full", which is the same thing it says at 21. The overflow is written out beside it.
 */
function LoadBar({ segment }: { segment: OccupancySegmentResponse }) {
  // On a restricted service there is no single ceiling — the sum of the quotas of the promotions
  // actually present is the only honest denominator, and it is 0 for a promotion not admitted at all.
  const ceiling = segment.capacity
    ?? segment.levels.reduce((total, l) => total + (l.capacity ?? 0), 0);

  const pct = ceiling > 0 ? Math.min(100, (segment.students / ceiling) * 100) : 100;

  return (
    <Stack gap={3}>
      <Group gap={6} justify="space-between" wrap="nowrap">
        <Text size="sm" fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>
          {segment.students}
          {ceiling > 0 && <Text span c="dimmed" fw={400}> / {ceiling}</Text>}
        </Text>
        {segment.overflow > 0 && (
          <Badge size="xs" color="orange" variant="filled">+{segment.overflow}</Badge>
        )}
      </Group>
      <Progress
        value={pct}
        size="sm"
        radius="xl"
        color={segment.overflow > 0 ? 'orange' : pct > 85 ? 'yellow' : 'teal'}
      />
    </Stack>
  );
}

/** Who is here, by stage — and, on demand, by name. */
function SegmentDetail({ serviceId, segment }: { serviceId: number; segment: OccupancySegmentResponse }) {
  const [named, setNamed] = useState(false);

  return (
    <Stack gap="sm">
      <Table withTableBorder={false} verticalSpacing={4} horizontalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Stage</Table.Th>
            <Table.Th>Promotion</Table.Th>
            <Table.Th>Période</Table.Th>
            <Table.Th>Groupes</Table.Th>
            <Table.Th style={{ textAlign: 'right' }}>Étudiants</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {segment.occupants.map((o) => (
            <Table.Tr key={`${o.stageId}-${o.periodNumber}`}>
              <Table.Td><Text size="sm" fw={500}>{o.stageName}</Text></Table.Td>
              <Table.Td><Text size="sm" c="dimmed">{o.levelLabel}</Text></Table.Td>
              <Table.Td><Text size="sm" c="dimmed">P{o.periodNumber}</Text></Table.Td>
              <Table.Td>
                <Text size="sm" style={{ fontVariantNumeric: 'tabular-nums' }}>{o.groupNumbers}</Text>
              </Table.Td>
              <Table.Td style={{ textAlign: 'right' }}>
                <Text size="sm" fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>{o.students}</Text>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      {/* Deliberately behind a click: a saturated stretch holds 85 students and the list is paged, so
          it is a request, not something to fetch for every row the user happens to open. */}
      {!named ? (
        <UnstyledButton onClick={() => setNamed(true)}>
          <Text size="xs" c="navy" fw={500}>Voir les {segment.students} étudiants nommément →</Text>
        </UnstyledButton>
      ) : (
        <ServiceOccupantsTable
          serviceId={serviceId}
          startDate={segment.startDate}
          endDate={segment.endDate}
          total={segment.students}
        />
      )}
    </Stack>
  );
}
