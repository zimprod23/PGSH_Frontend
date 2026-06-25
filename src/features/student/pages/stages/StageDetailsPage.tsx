import {
  ActionIcon,
  Badge,
  Box,
  Card,
  Collapse,
  Container,
  Divider,
  Group,
  Progress,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
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
  IconInfoCircle,
  IconStethoscope,
  IconTimeline,
} from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useGetCurrentStudentQuery,
  useGetStageByIdQuery,
  useGetMyAssignmentsQuery,
  useGetAssignmentByIdQuery,
  useGetAttendanceByPeriodQuery,
  useGetEvaluationByPeriodQuery,
} from '../../api/studentApi';
import { PATHS } from '../../../../routes/paths';
import type { ServicePeriodSummary } from '../../types/student.types';

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

        <Group gap="xs">
          <IconCalendar size={13} stroke={1.5} color="#94A3B8" />
          <Text size="xs" c="dimmed" ff="monospace">
            {period.startDate} → {period.endDate}
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

function AssignmentSection({ assignmentId }: { assignmentId: string }) {
  const { data: assignment, isLoading } = useGetAssignmentByIdQuery(assignmentId);

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

  const statusColor = () => {
    if (assignment.status === 'Validated' || assignment.status === 'Evaluated') return 'teal';
    if (assignment.status === 'Ongoing' || assignment.status === 'Completed') return 'blue';
    if (assignment.status === 'Rejected') return 'red';
    return 'gray';
  };

  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="wrap">
        <Group gap="sm">
          <Badge color={statusColor()} variant="light" size="sm">
            {assignment.status}
          </Badge>
          {assignment.finalScore !== null && (
            <Text size="sm" fw={700} c="navy">
              Note finale : {assignment.finalScore} / 20
            </Text>
          )}
        </Group>
        <Text size="xs" c="dimmed">{completed}/{total} rotations terminées</Text>
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

  const { data: stage,   isLoading: stageLoading   } = useGetStageByIdQuery(stageId);
  const { data: student                             } = useGetCurrentStudentQuery();
  const registrationId = student?.currentRegistration?.id;

  const { data: assignmentsPage, isLoading: assignmentsLoading } = useGetMyAssignmentsQuery(
    { registrationId: registrationId ?? '', stageId },
    { skip: !registrationId },
  );
  const myAssignment = assignmentsPage?.items?.[0] ?? null;

  return (
    <Container size="lg">
      <Stack gap="xl">
        {/* Back + title */}
        <Group gap="sm">
          <ActionIcon
            variant="subtle" color="gray" radius="md"
            onClick={() => navigate(`${PATHS.STUDENT.ROOT}/${PATHS.STUDENT.STAGES}`)}
          >
            <IconArrowLeft size={18} stroke={1.5} />
          </ActionIcon>
          {stageLoading ? (
            <Skeleton height={28} width={220} radius="sm" />
          ) : (
            <Stack gap={2}>
              <Title order={2} fw={700}>{stage?.name}</Title>
              {stage?.levelResponse && (
                <Text size="xs" c="dimmed">
                  {stage.levelResponse.label ?? `Année ${stage.levelResponse.year}`}
                </Text>
              )}
            </Stack>
          )}
        </Group>

        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl">
          {/* Left: stage info + objectives */}
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

          {/* Right: assignment (spans 2 cols) */}
          <Box style={{ gridColumn: 'span 2' }}>
            <Card padding="lg" radius="lg" withBorder shadow="sm" style={{ height: '100%' }}>
              <Stack gap="md">
                <Group gap="sm">
                  <IconClipboardList size={18} stroke={1.5} color="#0F4C81" />
                  <Text fw={600} size="sm">Mon affectation</Text>
                </Group>
                <Divider />

                {!registrationId ? (
                  <Group gap="sm">
                    <IconInfoCircle size={16} stroke={1.5} color="#94A3B8" />
                    <Text size="sm" c="dimmed">Aucune inscription active.</Text>
                  </Group>
                ) : assignmentsLoading ? (
                  <Stack gap="sm">
                    <Skeleton height={40} radius="md" />
                    <Skeleton height={110} radius="md" />
                  </Stack>
                ) : !myAssignment ? (
                  <Stack align="center" py="xl" gap="sm">
                    <ThemeIcon size={48} radius="xl" variant="light" color="gray">
                      <IconTimeline size={24} stroke={1.5} />
                    </ThemeIcon>
                    <Text size="sm" c="dimmed" ta="center">
                      Vous n'êtes pas encore affecté à ce stage.
                      <br />
                      Votre coordinateur créera votre affectation prochainement.
                    </Text>
                  </Stack>
                ) : (
                  <AssignmentSection assignmentId={myAssignment.id} />
                )}
              </Stack>
            </Card>
          </Box>
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
