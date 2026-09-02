import { useMemo, useState } from 'react';
import {
  Accordion, Alert, Badge, Button, Card, Center, Group, Loader, Paper, Progress,
  SimpleGrid, Stack, Table, Text, Tooltip,
} from '@mantine/core';
import {
  IconAlertTriangle, IconCircleCheck, IconInfoCircle, IconRefresh, IconStethoscope,
} from '@tabler/icons-react';
import { useGetStudentParcoursQuery } from '../../../student/api/studentApi';
import { useGetOutstandingStagesQuery, useGetStudentLevelDossierQuery } from '../../api/adminApi';
import { RevalidateStageModal } from '../RevalidateStageModal';
import type { DossierStage, DossierStageState } from '../../types/dossier.types';
import type { ParcoursYear } from '../../../student/types/parcours.types';
import type { StageAssignmentResult } from '../../../../common/types';

/**
 * The stage side of a student's file — three reads that existed on the API and had no caller in the
 * admin app at all, so scolarité could see a student's registrations and not what he had done or
 * still owed under them.
 *
 * ⚠ **The three answer different questions and none replaces another.**
 *
 * - `outstanding-stages` is cursus-**wide**: every stage whose attempts all came back NonValidé,
 *   across every level. It is what `FinalYearGuard` reads before letting somebody *begin* a final
 *   year, so showing it here means the refusal a réinscription produces can be understood from the
 *   student's own file rather than only from the roll's report.
 * - `levels/{id}/dossier` is per **level**, folded across every registration he holds there — the
 *   only read that can say whether a stage is acquired, because a repeater has several.
 * - `parcours` is per **year**: what actually happened, in order.
 *
 * Folding them into one list would lose the distinction that matters most: a stage nobody has
 * attempted is not a debt, and an unmarked one is not a failure.
 */

const STATE_CFG: Record<DossierStageState, { label: string; color: string }> = {
  Validated:    { label: 'Validé',          color: 'teal'   },
  ToRevalidate: { label: 'À revalider',     color: 'red'    },
  InProgress:   { label: 'En cours',        color: 'blue'   },
  NotAttempted: { label: 'Jamais tenté',    color: 'gray'   },
};

const RESULT_CFG: Record<StageAssignmentResult, { label: string; color: string }> = {
  'Validé':      { label: 'Validé',      color: 'teal'   },
  'NonValidé':   { label: 'Non validé',  color: 'red'    },
  'NonÉvalué':   { label: 'Non évalué',  color: 'gray'   },
};

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('fr-FR') : '—');

interface Props {
  studentId: string;
  /** The registration a retake would hang off — the one he holds NOW, never the failed year's. */
  currentRegistrationId: string | null;
  currentLevelLabel: string | null;
}

export function StudentStagesTab({ studentId, currentRegistrationId, currentLevelLabel }: Props) {
  const [revalOpen, setRevalOpen] = useState(false);

  // ⚠ `refetchOnMountOrArgChange` because the revalidation mutation lives in `adminApi` and the
  // parcours query in `studentApi`: RTK Query cannot invalidate across slices, so without this the
  // tab keeps showing the state from before the retake was opened.
  const { data: parcours, isLoading: loadingParcours } =
    useGetStudentParcoursQuery(studentId, { refetchOnMountOrArgChange: true });

  const { data: owed = [], isLoading: loadingOwed } =
    useGetOutstandingStagesQuery(studentId, { refetchOnMountOrArgChange: true });

  // The levels he has actually been registered in, most recent first — never the whole catalogue.
  const levels = useMemo(() => {
    const seen = new Map<number, { levelId: number; label: string; year: number }>();

    for (const year of parcours?.years ?? []) {
      if (!seen.has(year.levelId)) {
        seen.set(year.levelId, {
          levelId: year.levelId,
          label: year.levelLabel ?? `Niveau ${year.levelYear}`,
          year: year.levelYear,
        });
      }
    }

    return [...seen.values()].sort((a, b) => b.year - a.year);
  }, [parcours]);

  if (loadingParcours) {
    return <Center h={200}><Loader color="navy" /></Center>;
  }

  if (!parcours || parcours.years.length === 0) {
    return (
      <Alert color="gray" variant="light" icon={<IconInfoCircle size={16} />}>
        Cet étudiant n'a aucune inscription enregistrée, donc aucun stage. Ce n'est pas une erreur —
        inscrivez-le d'abord depuis l'onglet «&nbsp;Inscriptions&nbsp;».
      </Alert>
    );
  }

  const totals = parcours.totals;

  return (
    <Stack gap="lg">
      {/* ── What the whole cursus stands at ─────────────────────────────────────────────────── */}
      <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="sm">
        <Stat label="Stages"        value={totals.total}           color="navy" />
        <Stat label="Validés"       value={totals.validated}       color="teal" />
        <Stat label="Non validés"   value={totals.failed}          color="red" />
        <Stat label="À évaluer"     value={totals.awaitingVerdict} color="orange" />
        <Stat label="En cours"      value={totals.ongoing}         color="blue" />
      </SimpleGrid>

      {/* ── The debt, cursus-wide ───────────────────────────────────────────────────────────── */}
      {loadingOwed ? (
        <Center h={60}><Loader size="sm" color="navy" /></Center>
      ) : owed.length > 0 ? (
        <Alert
          color="red"
          variant="light"
          icon={<IconAlertTriangle size={18} />}
          title={`${owed.length} stage(s) restant(s) à revalider`}
        >
          <Stack gap="xs">
            <Group gap={6} wrap="wrap">
              {owed.map((stage) => (
                <Badge key={stage.stageId} color="red" variant="light" radius="sm">
                  {stage.stageName}
                  <Text span c="dimmed" fw={400}> · {stage.levelLabel}</Text>
                </Badge>
              ))}
            </Group>

            {/* The sentence the réinscription's refusal produces, said here, where it can be acted
                on. « Owed » is a strict test: every attempt came back NonValidé. A stage nobody has
                sat and a stage nobody has marked are both absent from this list. */}
            <Text size="xs">
              Ce sont les stages dont <strong>toutes</strong> les tentatives sont revenues «&nbsp;non
              validé&nbsp;». Un stage jamais tenté ou simplement pas encore noté n'y figure pas. Tant
              qu'il en reste, cet étudiant ne peut pas <strong>commencer</strong> sa dernière année —
              il peut la poursuivre s'il y est déjà inscrit.
            </Text>

            {currentRegistrationId && (
              <Group>
                <Button
                  size="xs"
                  variant="light"
                  color="red"
                  leftSection={<IconRefresh size={14} />}
                  onClick={() => setRevalOpen(true)}
                >
                  Ouvrir une revalidation
                </Button>
              </Group>
            )}
          </Stack>
        </Alert>
      ) : (
        <Alert color="teal" variant="light" icon={<IconCircleCheck size={18} />}>
          Aucun stage en attente de revalidation&nbsp;: toutes les tentatives enregistrées sont soit
          validées, soit encore en cours ou non notées.
        </Alert>
      )}

      {/* ── Level by level ──────────────────────────────────────────────────────────────────── */}
      <div>
        <Text size="sm" fw={600} mb={4}>Par promotion</Text>
        <Text size="xs" c="dimmed" mb="sm">
          Chaque niveau replie <strong>toutes</strong> ses inscriptions&nbsp;: un redoublant en a
          plusieurs, et seul ce repli dit si un stage est acquis. Le stage compte pour le niveau
          auquel il <em>appartient</em> — un rattrapage de 3ᵉ année servi en 6ᵉ figure ici sous la
          3ᵉ.
        </Text>

        <Accordion variant="separated" radius="md" defaultValue={String(levels[0]?.levelId)}>
          {levels.map((level) => (
            <LevelDossierPanel key={level.levelId} studentId={studentId} level={level} />
          ))}
        </Accordion>
      </div>

      {/* ── Year by year ────────────────────────────────────────────────────────────────────── */}
      <div>
        <Text size="sm" fw={600} mb={4}>Année par année</Text>
        <Text size="xs" c="dimmed" mb="sm">
          Ce qui s'est réellement passé, dans l'ordre — les dates, le service, la note.
        </Text>
        <Stack gap="sm">
          {parcours.years.map((year) => <ParcoursYearCard key={year.registrationId} year={year} />)}
        </Stack>
      </div>

      {currentRegistrationId && (
        <RevalidateStageModal
          opened={revalOpen}
          onClose={() => setRevalOpen(false)}
          registrationId={currentRegistrationId}
          levelLabel={currentLevelLabel}
        />
      )}
    </Stack>
  );
}

// ─── One level, folded across every registration held there ──────────────────

function LevelDossierPanel({
  studentId,
  level,
}: {
  studentId: string;
  level: { levelId: number; label: string; year: number };
}) {
  const { data, isLoading } = useGetStudentLevelDossierQuery(
    { studentId, levelId: level.levelId },
    { refetchOnMountOrArgChange: true },
  );

  const pct = data && data.stagesTotal > 0
    ? Math.round((data.stagesValidated / data.stagesTotal) * 100)
    : 0;

  return (
    <Accordion.Item value={String(level.levelId)}>
      <Accordion.Control icon={<IconStethoscope size={16} />}>
        <Group justify="space-between" wrap="nowrap" pr="sm">
          <Text size="sm" fw={500}>{level.label}</Text>
          {data && (
            <Group gap="xs" wrap="nowrap">
              <Text size="xs" c="dimmed" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {data.stagesValidated} / {data.stagesTotal} validé(s)
              </Text>
              {data.isLevelComplete && (
                <Badge size="xs" color="teal" variant="light">complet</Badge>
              )}
            </Group>
          )}
        </Group>
      </Accordion.Control>

      <Accordion.Panel>
        {isLoading || !data ? (
          <Center h={80}><Loader size="sm" color="navy" /></Center>
        ) : (
          <Stack gap="sm">
            <Progress value={pct} size="sm" radius="xl" color={pct === 100 ? 'teal' : 'navy'} />

            {data.registrations.length > 1 && (
              <Text size="xs" c="dimmed">
                {data.registrations.length} inscriptions à ce niveau —{' '}
                {data.registrations.map((r) => r.academicYearLabel).join(', ')}.
              </Text>
            )}

            {data.stages.length === 0 ? (
              <Text size="sm" c="dimmed">
                Aucun stage n'est inscrit au catalogue de ce niveau.
              </Text>
            ) : (
              <Table verticalSpacing="xs" horizontalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Stage</Table.Th>
                    <Table.Th style={{ width: 130 }}>État</Table.Th>
                    <Table.Th style={{ width: 90, textAlign: 'right' }}>Meilleure note</Table.Th>
                    <Table.Th>Tentatives</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {data.stages.map((stage) => <DossierStageRow key={stage.stageId} stage={stage} />)}
                </Table.Tbody>
              </Table>
            )}
          </Stack>
        )}
      </Accordion.Panel>
    </Accordion.Item>
  );
}

function DossierStageRow({ stage }: { stage: DossierStage }) {
  const cfg = STATE_CFG[stage.state];

  return (
    <Table.Tr>
      <Table.Td>
        <Text size="sm" fw={500}>{stage.stageName}</Text>
        <Text size="xs" c="dimmed">coefficient {stage.coefficient}</Text>
      </Table.Td>
      <Table.Td>
        <Badge size="sm" variant="light" color={cfg.color} radius="sm">{cfg.label}</Badge>
      </Table.Td>
      <Table.Td style={{ textAlign: 'right' }}>
        <Text size="sm" fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>
          {stage.bestScore != null ? stage.bestScore.toFixed(2) : '—'}
        </Text>
      </Table.Td>
      <Table.Td>
        {stage.attempts.length === 0 ? (
          <Text size="xs" c="dimmed">aucune</Text>
        ) : (
          <Group gap={6} wrap="wrap">
            {stage.attempts.map((attempt) => {
              const result = attempt.result ? RESULT_CFG[attempt.result] : null;

              // ⚠ « Validé — année redoublée » is a different fact from « validé »: a redoublant
              // serves the year again in full, stages included, so the attempt establishes nothing.
              // Drawn with the same badge, the two were indistinguishable.
              return (
                <Tooltip
                  key={attempt.assignmentId}
                  withArrow
                  multiline
                  w={260}
                  label={
                    attempt.annulledByFailedYear
                      ? `${attempt.academicYearLabel} — l'année a été redoublée, donc cette tentative n'établit rien : ni acquis, ni dette.`
                      : `${attempt.academicYearLabel} — ${result?.label ?? attempt.status}`
                  }
                >
                  <Badge
                    size="xs"
                    radius="sm"
                    variant={attempt.annulledByFailedYear ? 'outline' : 'light'}
                    color={attempt.annulledByFailedYear ? 'gray' : result?.color ?? 'blue'}
                    style={attempt.annulledByFailedYear
                      ? { textDecoration: 'line-through' }
                      : undefined}
                  >
                    {attempt.academicYearLabel}
                    {attempt.finalScore != null && ` · ${attempt.finalScore.toFixed(1)}`}
                  </Badge>
                </Tooltip>
              );
            })}
          </Group>
        )}
      </Table.Td>
    </Table.Tr>
  );
}

// ─── One year, in order ──────────────────────────────────────────────────────

function ParcoursYearCard({ year }: { year: ParcoursYear }) {
  return (
    <Paper withBorder radius="md" p="sm">
      <Group justify="space-between" align="baseline" wrap="wrap" mb={year.stages.length ? 'xs' : 0}>
        <Group gap="xs">
          <Text size="sm" fw={600}>{year.academicYearLabel}</Text>
          <Text size="sm" c="dimmed">{year.levelLabel ?? `Niveau ${year.levelYear}`}</Text>
          {year.isCurrent && <Badge size="xs" color="navy" variant="light">année en cours</Badge>}
          {year.academicGroupLabel && (
            <Badge size="xs" color="grape" variant="dot">{year.academicGroupLabel}</Badge>
          )}
        </Group>
        <Text size="xs" c="dimmed">
          {year.totals.total} stage(s) · {year.totals.validated} validé(s)
        </Text>
      </Group>

      {year.stages.length === 0 ? (
        <Text size="xs" c="dimmed">
          Aucun stage affecté sur cette inscription.
        </Text>
      ) : (
        <Table verticalSpacing={4} horizontalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Stage</Table.Th>
              <Table.Th>Période</Table.Th>
              <Table.Th style={{ width: 110 }}>Rotations</Table.Th>
              <Table.Th style={{ width: 80, textAlign: 'right' }}>Note</Table.Th>
              <Table.Th style={{ width: 110 }}>Résultat</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {year.stages.map((stage) => {
              const result = stage.result ? RESULT_CFG[stage.result] : null;
              // The stage's own level, not the registration's: a rattrapage hangs off the
              // registration held now, and labelling it with that level files it under the wrong year.
              const elsewhere = stage.stageLevelId !== year.levelId;

              return (
                <Table.Tr key={stage.assignmentId}>
                  <Table.Td>
                    <Group gap={6} wrap="nowrap">
                      <Text size="sm">{stage.stageName}</Text>
                      {stage.attemptNumber > 1 && (
                        <Badge size="xs" color="orange" variant="light" radius="sm">
                          tentative {stage.attemptNumber}
                        </Badge>
                      )}
                      {elsewhere && (
                        <Tooltip
                          withArrow
                          label={`Stage de ${stage.stageLevelLabel ?? 'un autre niveau'}, rattrapé sur cette inscription.`}
                        >
                          <Badge size="xs" color="grape" variant="outline" radius="sm">
                            {stage.stageLevelLabel ?? 'autre niveau'}
                          </Badge>
                        </Tooltip>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" c="dimmed" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {stage.startDate ? `${fmt(stage.startDate)} → ${fmt(stage.endDate)}` : 'non planifié'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" c="dimmed" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {stage.periodsComplete} / {stage.periodsTotal}
                    </Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    {/* ⚠ A mean over périodes not all evaluated is partial, and printing it bare
                        makes a running average look like a final note. */}
                    <Tooltip
                      withArrow
                      disabled={stage.finalScore == null || stage.allPeriodsEvaluated}
                      label="Moyenne partielle : toutes les périodes ne sont pas encore évaluées."
                    >
                      <Text
                        size="sm"
                        fw={600}
                        c={stage.finalScore != null && !stage.allPeriodsEvaluated ? 'dimmed' : undefined}
                        style={{ fontVariantNumeric: 'tabular-nums' }}
                      >
                        {stage.finalScore != null
                          ? `${stage.finalScore.toFixed(2)}${stage.allPeriodsEvaluated ? '' : '*'}`
                          : '—'}
                      </Text>
                    </Tooltip>
                  </Table.Td>
                  <Table.Td>
                    {result ? (
                      <Badge size="sm" variant="light" color={result.color} radius="sm">
                        {result.label}
                      </Badge>
                    ) : (
                      <Text size="xs" c="dimmed">{stage.status}</Text>
                    )}
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      )}
    </Paper>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card padding="sm" radius="md" withBorder>
      <Text size="xl" fw={700} c={color} style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</Text>
      <Text size="xs" c="dimmed">{label}</Text>
    </Card>
  );
}
