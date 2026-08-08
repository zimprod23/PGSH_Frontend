import {
  ActionIcon,
  Badge,
  Card,
  Collapse,
  Container,
  Divider,
  Grid,
  Group,
  Progress,
  ScrollArea,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Tabs,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
  UnstyledButton,
  rem,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconArrowLeft,
  IconBuildingHospital,
  IconCalendar,
  IconChevronDown,
  IconChevronUp,
  IconCircleCheck,
  IconClipboardList,
  IconStethoscope,
  IconTimeline,
} from '@tabler/icons-react';
import { useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  useGetCurrentStudentQuery,
  useGetStageByIdQuery,
  useGetStudentParcoursQuery,
  useGetAssignmentByIdQuery,
  useGetAttendanceByPeriodQuery,
  useGetEvaluationByPeriodQuery,
} from '../../api/studentApi';
import { PATHS } from '../../../../routes/paths';
import type { ServicePeriodSummary } from '../../types/student.types';
import type { ParcoursStage } from '../../types/parcours.types';
import { StageStateBadge } from '../../components/StageStateBadge';
import { finalNoteOf, formatRotationSpan, stageStateOf } from '../../utils/stageState';

// ─── Attendance mini-bar ─────────────────────────────────────────────────────

function AttendanceSummary({ periodId }: { periodId: string }) {
  const { data: records = [], isLoading } = useGetAttendanceByPeriodQuery(periodId);

  if (isLoading) return <Skeleton height={14} width={100} radius="sm" />;
  if (records.length === 0)
    return <Text size="xs" c="dimmed">Aucune présence enregistrée</Text>;

  const present = records.filter((r) => r.status === 'Present').length;
  const absent  = records.length - present;
  const pct     = Math.round((present / records.length) * 100);

  return (
    <Stack gap={4}>
      <Group gap="xs">
        <Text size="xs" c="dimmed">{present}/{records.length} présences</Text>
        {absent > 0 && <Badge size="xs" color="orange" variant="light">{absent} abs.</Badge>}
      </Group>
      <Progress
        value={pct}
        color={pct >= 80 ? 'teal' : pct >= 60 ? 'orange' : 'red'}
        size="xs"
        radius="xl"
      />
    </Stack>
  );
}

// ─── Evaluation detail expandable section ────────────────────────────────────

function EvaluationDetail({ periodId }: { periodId: string }) {
  const { data: evaluation, isLoading } = useGetEvaluationByPeriodQuery(periodId);

  if (isLoading) return <Skeleton height={60} radius="md" />;
  if (!evaluation) return null;

  const isNumeric = evaluation.mode === 'Numeric';

  return (
    <Stack gap="sm" pt="xs" style={{ borderTop: '1px solid #E2E8F0' }}>
      <Group justify="space-between">
        <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: rem(0.6) }}>
          {isNumeric ? 'Note finale' : 'Résultat'}
        </Text>
        {isNumeric ? (
          <Text size="sm" fw={700} c="navy">{evaluation.totalScore} / 20</Text>
        ) : (
          <Badge size="sm" variant="light" color={evaluation.outcome === 'Validated' ? 'teal' : 'red'}>
            {evaluation.outcome === 'Validated' ? 'Validé' : 'Non validé'}
          </Badge>
        )}
      </Group>

      {evaluation.objectiveScores.length > 0 && (
        <Table.ScrollContainer minWidth={320} type="native">
        <Table fz="xs" verticalSpacing={4} withColumnBorders withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Critère</Table.Th>
              <Table.Th style={{ textAlign: 'right', width: rem(60) }}>Poids</Table.Th>
              <Table.Th style={{ textAlign: 'right', width: rem(80) }}>{isNumeric ? 'Note' : 'Résultat'}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {evaluation.objectiveScores.map((obj) => (
              <Table.Tr key={obj.id}>
                <Table.Td>
                  <Stack gap={0}>
                    <Text size="xs" fw={500}>{obj.objectiveLabel}</Text>
                    {obj.note && <Text size="xs" c="dimmed">{obj.note}</Text>}
                  </Stack>
                </Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>{obj.weight} pts</Table.Td>
                <Table.Td style={{ textAlign: 'right' }}>
                  {obj.score != null ? (
                    <Text fw={600} c={obj.score >= obj.weight * 0.6 ? 'teal' : 'red'}>
                      {obj.score}
                    </Text>
                  ) : (
                    <Badge size="xs" variant="light" color={obj.outcome === 'Validated' ? 'teal' : 'red'}>
                      {obj.outcome === 'Validated' ? 'Validé' : 'Non validé'}
                    </Badge>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        </Table.ScrollContainer>
      )}

      {evaluation.supervisorComment && (
        <Stack gap={2}>
          <Text size="xs" fw={600} c="dimmed">Commentaire du superviseur</Text>
          <Text size="xs" c="dimmed" style={{ fontStyle: 'italic' }}>
            {evaluation.supervisorComment}
          </Text>
        </Stack>
      )}
    </Stack>
  );
}

// ─── One service period ───────────────────────────────────────────────────────

function PeriodCard({ period }: { period: ServicePeriodSummary }) {
  const [evalOpen, { toggle: toggleEval }] = useDisclosure(false);
  const navigate = useNavigate();

  const goToService = () => navigate(`${PATHS.STUDENT.ROOT}/services/${period.serviceId}`);

  return (
    <Card padding="md" radius="md" withBorder style={{ cursor: 'pointer' }} onClick={goToService}>
      <Stack gap="sm">
        <Group justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <ThemeIcon size={32} radius="md" variant="light" color="navy">
              <IconBuildingHospital size={16} stroke={1.5} />
            </ThemeIcon>
            <Stack gap={0}>
              <Text size="sm" fw={600} c="navy">{period.serviceName}</Text>
              <Text size="xs" c="dimmed">{period.hospitalName}</Text>
            </Stack>
          </Group>
          <Stack gap={4} align="flex-end">
            {period.isPaused && !period.isComplete ? (
              <Tooltip
                label={period.pauseReason ? `En pause : ${period.pauseReason}` : 'Rotation suspendue (examens)'}
                withArrow multiline w={220}
              >
                <Badge size="xs" color="orange" variant="light">En pause</Badge>
              </Tooltip>
            ) : period.isComplete ? (
              <Badge size="xs" color="teal" variant="light">Terminé</Badge>
            ) : period.isStarted ? (
              <Badge size="xs" color="blue" variant="light">En cours</Badge>
            ) : (
              <Badge size="xs" color="gray" variant="light">Planifié</Badge>
            )}
            {period.hasEvaluation && (
              <Badge size="xs" color="navy" variant="dot">Évalué</Badge>
            )}
          </Stack>
        </Group>

        <Group gap="xs" wrap="nowrap">
          <IconCalendar size={13} stroke={1.5} color="#94A3B8" style={{ flexShrink: 0 }} />
          <Text size="xs" c="dimmed" lineClamp={1}>
            {formatRotationSpan(period.startDate, period.endDate)}
          </Text>
        </Group>

        {period.isComplete && <AttendanceSummary periodId={period.id} />}

        {period.hasEvaluation && (
          <>
            <UnstyledButton onClick={(e) => { e.stopPropagation(); toggleEval(); }}>
              <Group gap={4}>
                {evalOpen
                  ? <IconChevronUp size={13} stroke={1.5} color="#0F4C81" />
                  : <IconChevronDown size={13} stroke={1.5} color="#0F4C81" />}
                <Text size="xs" c="navy" fw={500}>
                  {evalOpen ? 'Masquer l\'évaluation' : 'Voir l\'évaluation'}
                </Text>
              </Group>
            </UnstyledButton>
            <Collapse in={evalOpen}>
              <EvaluationDetail periodId={period.id} />
            </Collapse>
          </>
        )}
      </Stack>
    </Card>
  );
}

// ─── Assignment detail section ────────────────────────────────────────────────

function AssignmentSection({ attempt }: { attempt: ParcoursStage }) {
  // Pause/resume/transfer mutations live in the admin & employee API slices, so they can't
  // invalidate this student-slice query's cache. Refetch on mount/arg change so revisiting the
  // stage always shows live period status (En cours / En pause / Planifié) instead of a stale snapshot.
  const { data: assignment, isLoading } = useGetAssignmentByIdQuery(attempt.assignmentId, {
    refetchOnMountOrArgChange: true,
  });

  if (isLoading)
    return (
      <Stack gap="sm">
        {[1, 2].map((i) => <Skeleton key={i} height={110} radius="md" />)}
      </Stack>
    );

  if (!assignment) return null;

  const completed = assignment.servicePeriods.filter((p) => p.isComplete).length;
  const total     = assignment.servicePeriods.length;
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;

  const note = finalNoteOf(attempt);
  const span = formatRotationSpan(attempt.startDate, attempt.endDate);

  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="wrap" gap="sm">
        <Group gap="sm">
          <StageStateBadge state={stageStateOf(attempt)} />
          {note !== null ? (
            <Text size="sm" fw={700} c={note >= 10 ? 'teal.7' : 'red.7'}>
              Note finale : {note.toFixed(2)} / 20
            </Text>
          ) : attempt.finalScore !== null ? (
            <Tooltip label="Toutes les rotations ne sont pas encore notées" withArrow>
              <Text size="sm" c="dimmed" fs="italic">
                Note provisoire : {attempt.finalScore.toFixed(2)} / 20
              </Text>
            </Tooltip>
          ) : null}
        </Group>
        <Text size="xs" c="dimmed">{completed}/{total} rotations terminées</Text>
      </Group>

      <Group gap="lg">
        <Group gap={6}>
          <IconBuildingHospital size={13} stroke={1.5} color="#94A3B8" />
          <Text size="xs" c="dimmed">{attempt.cohortLabel}</Text>
        </Group>
        {span && (
          <Group gap={6}>
            <IconCalendar size={13} stroke={1.5} color="#94A3B8" />
            <Text size="xs" c="dimmed">{span}</Text>
          </Group>
        )}
      </Group>

      {total > 0 && (
        <Progress value={pct} color="navy" size="sm" radius="xl" />
      )}

      {total === 0 ? (
        <Text size="sm" c="dimmed">Aucune rotation planifiée pour ce stage.</Text>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          {assignment.servicePeriods.map((p) => (
            <PeriodCard key={p.id} period={p} />
          ))}
        </SimpleGrid>
      )}
    </Stack>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StageDetailsPage() {
  const { id }  = useParams<{ id: string }>();
  const stageId = Number(id);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: stage, isLoading: stageLoading } = useGetStageByIdQuery(stageId);
  const { data: student } = useGetCurrentStudentQuery();

  const { data: parcours, isLoading: parcoursLoading } = useGetStudentParcoursQuery(
    student?.id ?? '',
    { skip: !student?.id, refetchOnMountOrArgChange: true },
  );

  // Every sitting of this stage, across every registration — a retake belongs here next to the
  // attempt it repeats, and a stage served two years ago must not read as "pas encore affecté"
  // just because it is absent from the current registration.
  const attempts = useMemo<ParcoursStage[]>(
    () =>
      (parcours?.years ?? [])
        .flatMap((year) => year.stages.map((s) => ({ year, stage: s })))
        .filter(({ stage: s }) => s.stageId === stageId)
        .sort((a, b) => b.stage.attemptNumber - a.stage.attemptNumber)
        .map(({ stage: s }) => s),
    [parcours, stageId],
  );

  const yearLabelOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const year of parcours?.years ?? []) {
      for (const s of year.stages) map.set(s.assignmentId, year.academicYearLabel);
    }
    return map;
  }, [parcours]);

  const requested = searchParams.get('attempt');
  const selected =
    attempts.find((a) => a.assignmentId === requested) ?? attempts[0] ?? null;

  const selectAttempt = (assignmentId: string) => {
    searchParams.set('attempt', assignmentId);
    setSearchParams(searchParams, { replace: true });
  };

  return (
    <Container size="lg">
      <Stack gap="xl">
        {/* Back + title */}
        <Group gap="sm" wrap="nowrap" align="flex-start">
          <ActionIcon
            variant="subtle" color="gray" radius="md"
            style={{ flexShrink: 0 }}
            onClick={() => navigate(`${PATHS.STUDENT.ROOT}/${PATHS.STUDENT.STAGES}`)}
          >
            <IconArrowLeft size={18} stroke={1.5} />
          </ActionIcon>
          {stageLoading ? (
            <Skeleton height={28} width={220} radius="sm" />
          ) : (
            <Stack gap={2} style={{ minWidth: 0 }}>
              <Title order={2} fw={700} lineClamp={2} style={{ wordBreak: 'break-word' }}>
                {stage?.name}
              </Title>
              {stage?.levelResponse && (
                <Text size="xs" c="dimmed">
                  {stage.levelResponse.label ?? `Année ${stage.levelResponse.year}`}
                </Text>
              )}
            </Stack>
          )}
        </Group>

        {/* Grid, not SimpleGrid: the assignment panel spans two of three columns on desktop, and a
            hard `gridColumn: span 2` inside a single-column mobile grid overflowed the viewport.
            `order` also puts the affectation first on a phone — it is what the student came for. */}
        <Grid gutter={{ base: 'md', md: 'xl' }} align="flex-start">
          <Grid.Col span={{ base: 12, md: 4 }} order={{ base: 2, md: 1 }}>
          <Stack gap="md">
            <Card padding="md" radius="lg" withBorder shadow="sm">
              <Stack gap="sm">
                <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: rem(0.8) }}>
                  Informations
                </Text>
                {stageLoading ? (
                  Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} height={36} radius="md" />)
                ) : (
                  <>
                    <Group gap="sm">
                      <ThemeIcon size={28} radius="md" variant="light" color="navy">
                        <IconCalendar size={14} stroke={1.5} />
                      </ThemeIcon>
                      <Stack gap={0}>
                        <Text size="xs" c="dimmed">Durée</Text>
                        <Text size="sm" fw={600}>{stage?.durationInDays} jours</Text>
                      </Stack>
                    </Group>
                    <Group gap="sm">
                      <ThemeIcon size={28} radius="md" variant="light" color="sky">
                        <IconStethoscope size={14} stroke={1.5} />
                      </ThemeIcon>
                      <Stack gap={0}>
                        <Text size="xs" c="dimmed">Coefficient</Text>
                        <Text size="sm" fw={600}>{stage?.coefficient}</Text>
                      </Stack>
                    </Group>
                    {stage?.description && (
                      <Text
                        size="xs" c="dimmed"
                        style={{ borderTop: '1px solid #E2E8F0', paddingTop: rem(8) }}
                      >
                        {stage.description}
                      </Text>
                    )}
                  </>
                )}
              </Stack>
            </Card>

            <Card padding="md" radius="lg" withBorder shadow="sm">
              <Stack gap="sm">
                <Group justify="space-between">
                  <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: rem(0.8) }}>
                    Critères d'évaluation
                  </Text>
                  {stage && (
                    <Badge size="xs" color="navy" variant="light">
                      {stage.stageObjectiveResponse.length}
                    </Badge>
                  )}
                </Group>
                {stageLoading ? (
                  Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={28} radius="md" />)
                ) : stage?.stageObjectiveResponse.length === 0 ? (
                  <Text size="xs" c="dimmed">Aucun critère défini</Text>
                ) : (
                  stage?.stageObjectiveResponse.map((obj, i) => (
                    <Group key={i} gap="sm" wrap="nowrap">
                      <ThemeIcon size={20} radius="sm" variant="light"
                        color={obj.isMandatory ? 'navy' : 'gray'}>
                        <IconCircleCheck size={12} stroke={1.5} />
                      </ThemeIcon>
                      <Stack gap={0} style={{ flex: 1 }}>
                        <Text size="xs" fw={500}>{obj.label}</Text>
                        <Text size="xs" c="dimmed">
                          {obj.weight} pts{obj.isMandatory ? ' · Obligatoire' : ''}
                        </Text>
                      </Stack>
                    </Group>
                  ))
                )}
              </Stack>
            </Card>
          </Stack>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 8 }} order={{ base: 1, md: 2 }}>
            <Card padding="lg" radius="lg" withBorder shadow="sm" style={{ height: '100%' }}>
              <Stack gap="md">
                <Group justify="space-between" wrap="nowrap">
                  <Group gap="sm">
                    <IconClipboardList size={18} stroke={1.5} color="#0F4C81" />
                    <Text fw={600} size="sm">Mon affectation</Text>
                  </Group>
                  {attempts.length > 1 && (
                    <Badge size="xs" variant="light" color="grape" radius="xl">
                      {attempts.length} tentatives
                    </Badge>
                  )}
                </Group>

                {/* A retake and the attempt it repeats are two different records with two different
                    marks — switching between them is the only honest way to show both. */}
                {attempts.length > 1 && selected && (
                  <ScrollArea type="auto" offsetScrollbars scrollbarSize={6}>
                    <Tabs
                      value={selected.assignmentId}
                      onChange={(v) => v && selectAttempt(v)}
                      variant="outline"
                    >
                      <Tabs.List style={{ flexWrap: 'nowrap' }}>
                        {attempts.map((attempt) => (
                          <Tabs.Tab
                            key={attempt.assignmentId}
                            value={attempt.assignmentId}
                            style={{ whiteSpace: 'nowrap' }}
                          >
                            <Group gap={6} wrap="nowrap">
                              <span>
                                {yearLabelOf.get(attempt.assignmentId) ??
                                  `Tentative ${attempt.attemptNumber}`}
                              </span>
                              <StageStateBadge state={stageStateOf(attempt)} size="xs" />
                            </Group>
                          </Tabs.Tab>
                        ))}
                      </Tabs.List>
                    </Tabs>
                  </ScrollArea>
                )}

                <Divider />

                {parcoursLoading ? (
                  <Stack gap="sm">
                    <Skeleton height={40} radius="md" />
                    <Skeleton height={110} radius="md" />
                  </Stack>
                ) : !selected ? (
                  <Stack align="center" py="xl" gap="sm">
                    <ThemeIcon size={48} radius="xl" variant="light" color="gray">
                      <IconTimeline size={24} stroke={1.5} />
                    </ThemeIcon>
                    <Text size="sm" c="dimmed" ta="center">
                      {student?.currentRegistration
                        ? <>Vous n'êtes pas encore affecté à ce stage.<br />Votre coordinateur créera votre affectation prochainement.</>
                        : 'Aucune inscription active.'}
                    </Text>
                  </Stack>
                ) : (
                  <AssignmentSection key={selected.assignmentId} attempt={selected} />
                )}
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}
