import {
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Divider,
  Group,
  NumberInput,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
  rem,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import {
  IconAlertTriangle,
  IconArrowRight,
  IconCalendarPlus,
  IconCheck,
  IconInfoCircle,
  IconPlayerPlay,
  IconTrash,
} from '@tabler/icons-react';
import { useMemo, useRef, useState } from 'react';
import {
  useGetLevelsQuery,
  useGetStagesQuery,
  usePreviewRotationCycleMutation,
  useApplyRotationCycleMutation,
  useGenerateMacroPlanMutation,
} from '../api/adminApi';
import type { DateWindowInput, RotationCycleLayout } from '../types/admin.types';
import { useAcademicYear } from '../contexts/AcademicYearContext';
import { useNotify } from '../../../common/hooks/useNotify';
import { useListParams } from '../../../common/hooks/useListParams';

/** Module-level so its identity is stable — useListParams memoises on it. */
const CYCLE_FILTERS = { level: null as string | null };

interface BlockStage {
  stageId: string | null;
  periods: number;
}

const emptyStage = (): BlockStage => ({ stageId: null, periods: 1 });

/**
 * Authoring a rotation block: the stages that run concurrently, how long a partition stays in each, and
 * the axis they share — entered **once**.
 *
 * The point of the screen is that the dates are typed one time. Setting the same windows on each stage's
 * own grid is where a mistyped day silently misaligns the published table, and nothing downstream can
 * tell the difference (see `axisDisagreements`).
 */
export default function RotationCyclePage() {
  const notify = useNotify();
  const { currentYearId, currentYear } = useAcademicYear();

  const { filters, setFilter } = useListParams<{ level: string | null }>(CYCLE_FILTERS);
  const levelId = filters.level ? Number(filters.level) : null;

  const [stages, setStages] = useState<BlockStage[]>([emptyStage(), emptyStage()]);
  const [windows, setWindows] = useState<[string | null, string | null][]>([]);
  const [layout, setLayout] = useState<RotationCycleLayout | null>(null);
  const [autoStart, setAutoStart] = useState<string | null>(null);
  const [columnLength, setColumnLength] = useState(1);
  const [unit, setUnit] = useState<'months' | 'weeks'>('months');
  const [applied, setApplied] = useState(false);

  // The result card renders below the fold on a laptop, so clicking Simuler looked like nothing had
  // happened. Bring it into view rather than leaving the user to guess.
  const resultRef = useRef<HTMLDivElement>(null);

  const { data: levels = [] } = useGetLevelsQuery(undefined);
  const { data: stagePage } = useGetStagesQuery(
    { levelId: levelId ?? undefined, pageNumber: 1, pageSize: 100 },
    { skip: levelId == null },
  );

  const [preview, { isLoading: previewing }] = usePreviewRotationCycleMutation();
  const [apply, { isLoading: applying }] = useApplyRotationCycleMutation();
  const [macroPlan, { isLoading: planning }] = useGenerateMacroPlanMutation();

  const stageOptions = (stagePage?.items ?? []).map((s) => ({
    value: String(s.id),
    label: s.name,
  }));

  /**
   * T = Σkₛ. Shown live so the number of date windows to fill is never a surprise — it is the single
   * most common way to get this wrong.
   */
  const timeline = useMemo(
    () => stages.filter((s) => s.stageId).reduce((sum, s) => sum + (s.periods || 0), 0),
    [stages],
  );

  const windowsComplete =
    windows.length === timeline && timeline > 0 && windows.every(([a, b]) => a && b);

  const canSimulate = levelId != null && stages.every((s) => s.stageId) && windowsComplete;

  /**
   * The first unmet precondition, in the order the form is filled.
   *
   * ⚠ Rendered as visible text, not as a tooltip on the disabled control: a disabled Mantine button emits
   * no pointer events, so a Tooltip wrapping one never opens. Disabling a button and hiding the reason
   * behind a tooltip that cannot fire reads as "the button is broken" — which is exactly how it was
   * reported.
   */
  const nextStep =
    levelId == null
      ? 'Choisissez d’abord un niveau.'
      : !stages.every((s) => s.stageId)
        ? 'Désignez un stage sur chaque ligne.'
        : !autoStart && windows.length === 0
          ? `Choisissez la date de début, puis générez les ${timeline} fenêtre(s) — ou saisissez-les à la main.`
          : !windowsComplete
            ? `Complétez les ${timeline} fenêtre(s) de dates.`
            : null;

  const setStage = (index: number, patch: Partial<BlockStage>) =>
    setStages((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));

  /** Resizes the window list to T, keeping whatever the user already typed. */
  const syncWindows = () =>
    setWindows((prev) =>
      Array.from({ length: timeline }, (_, i) => prev[i] ?? [null, null]),
    );

  /**
   * Lays out all T columns from one start date — the point being that the whole axis comes from a single
   * entry rather than 2T dates typed by hand. Windows are contiguous and inclusive of both ends, which is
   * the convention `SlotOverlapGuard` enforces: the next column starts the day after the last one ends.
   *
   * Everything stays editable afterwards, because a real calendar has holidays the arithmetic cannot know.
   */
  const generateWindows = () => {
    if (!autoStart || timeline === 0) return;

    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const generated: [string | null, string | null][] = [];
    let cursor = new Date(`${autoStart}T00:00:00Z`);

    for (let i = 0; i < timeline; i++) {
      const end = new Date(cursor);
      if (unit === 'months') end.setUTCMonth(end.getUTCMonth() + columnLength);
      else end.setUTCDate(end.getUTCDate() + columnLength * 7);
      end.setUTCDate(end.getUTCDate() - 1);

      generated.push([iso(cursor), iso(end)]);

      cursor = new Date(end);
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    setWindows(generated);
  };

  const payload = () => ({
    levelId: levelId!,
    stages: stages
      .filter((s) => s.stageId)
      .map((s) => ({ stageId: Number(s.stageId), periods: s.periods })),
    windows: windows.map(([startDate, endDate]) => ({
      startDate: startDate!,
      endDate: endDate!,
    })) as DateWindowInput[],
    academicYearId: currentYearId ?? undefined,
  });

  const handleSimulate = async () => {
    try {
      const res = await preview(payload()).unwrap();
      setLayout(res.layout);
      setApplied(false);
      requestAnimationFrame(() =>
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      );

      if (!res.canApply)
        notify.error(`${res.publishedCells} créneau(x) déjà publiés — le bloc ne peut plus être redéfini.`);
      else if (res.existingSlots > 0)
        notify.info(`${res.existingSlots} créneau(x) existants seront remplacés.`);
    } catch {
      // The error middleware toasts the API's own message, which carries the arithmetic.
      setLayout(null);
    }
  };

  const handleApply = async () => {
    try {
      const res = await apply(payload()).unwrap();
      setLayout(res.layout);
      setApplied(true);
      notify.success(
        `${res.slotsCreated} créneau(x) écrits${res.slotsReplaced > 0 ? `, ${res.slotsReplaced} remplacés` : ''}.`,
      );
    } catch {
      /* toasted */
    }
  };

  /**
   * The second act: the axis is authored, now place the cohorts. Deliberately a separate button — the
   * backend returns the matrix rather than executing it, for the same reason déliberation and
   * réinscription are separate.
   */
  const handlePlan = async () => {
    if (!layout || currentYearId == null) return;
    try {
      const res = await macroPlan({
        academicYearId: currentYearId,
        plans: layout.matrix,
        assignStudents: true,
        autoArrange: true,
        publish: false,
      }).unwrap();

      notify.success(
        `${res.cohortsCreated} cohorte(s), ${res.studentsAssigned} étudiant(s), ${res.cellsArranged} cellule(s).`,
      );
    } catch {
      /* toasted */
    }
  };

  const partitionsUsed = layout
    ? new Set(layout.matrix.map((m) => m.rotationGroup)).size
    : 0;

  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        <div>
          <Title order={2}>Bloc de rotation</Title>
          <Text c="dimmed" size="sm">
            Les stages qui tournent en parallèle sur un même axe — dates saisies une seule fois pour tout
            le bloc. Année {currentYear?.label ?? '—'}.
          </Text>
        </div>

        <Card withBorder radius="md" padding="lg">
          <Stack gap="md">
            <Select
              label="Niveau"
              placeholder="Choisir une promotion"
              data={levels.map((l) => ({
                value: String(l.id),
                label: l.label ?? `Année ${l.year} — ${l.academicProgram}`,
              }))}
              value={filters.level}
              onChange={(v) => {
                setFilter('level', v);
                setStages([emptyStage(), emptyStage()]);
                setWindows([]);
                setLayout(null);
              }}
              radius="md"
              searchable
              w={320}
            />

            <Divider label="Stages du bloc" labelPosition="left" />

            <Stack gap="xs">
              {stages.map((s, i) => (
                <Group key={i} gap="sm" wrap="nowrap">
                  <Select
                    placeholder="Stage"
                    data={stageOptions}
                    value={s.stageId}
                    onChange={(v) => setStage(i, { stageId: v })}
                    disabled={levelId == null}
                    radius="md"
                    searchable
                    style={{ flex: 1 }}
                  />
                  <Tooltip
                    label="Nombre de services différents que le groupe traverse dans ce stage"
                    multiline
                    w={240}
                  >
                    <NumberInput
                      value={s.periods}
                      onChange={(v) => setStage(i, { periods: Math.max(1, Number(v) || 1) })}
                      min={1}
                      max={12}
                      radius="md"
                      w={130}
                      suffix=" pér."
                    />
                  </Tooltip>
                  <Button
                    variant="subtle"
                    color="red"
                    radius="md"
                    disabled={stages.length <= 1}
                    onClick={() => setStages((prev) => prev.filter((_, j) => j !== i))}
                  >
                    <IconTrash size={rem(16)} stroke={1.5} />
                  </Button>
                </Group>
              ))}

              <Group>
                <Button
                  variant="light"
                  color="navy"
                  radius="md"
                  size="xs"
                  onClick={() => setStages((prev) => [...prev, emptyStage()])}
                  disabled={levelId == null}
                >
                  Ajouter un stage
                </Button>
              </Group>
            </Stack>

            <Alert
              variant="light"
              color={timeline > 0 ? 'blue' : 'gray'}
              icon={<IconInfoCircle size={16} />}
              radius="md"
            >
              Le bloc occupe <b>{timeline}</b> colonne(s) —{' '}
              {stages.filter((s) => s.stageId).map((s) => s.periods).join(' + ') || '0'} — c'est le temps
              qu'il faut à une partition pour passer par tous les stages. Il faut donc{' '}
              <b>{timeline}</b> fenêtre(s) de dates.
            </Alert>

            <Divider label={`Axe partagé — ${timeline} fenêtre(s)`} labelPosition="left" />

            <Group align="flex-end" gap="sm">
              <DatePickerInput
                label="Début de l'axe"
                placeholder="Première colonne"
                value={autoStart}
                onChange={setAutoStart}
                radius="md"
                w={190}
              />
              <NumberInput
                label="Durée d'une colonne"
                value={columnLength}
                onChange={(v) => setColumnLength(Math.max(1, Number(v) || 1))}
                min={1}
                max={12}
                radius="md"
                w={140}
              />
              <Select
                label="Unité"
                data={[
                  { value: 'months', label: 'mois' },
                  { value: 'weeks', label: 'semaines' },
                ]}
                value={unit}
                onChange={(v) => setUnit((v as 'months' | 'weeks') ?? 'months')}
                radius="md"
                w={120}
                allowDeselect={false}
              />
              <Button
                radius="md"
                variant="light"
                color="navy"
                leftSection={<IconCalendarPlus size={14} />}
                onClick={generateWindows}
                disabled={!autoStart || timeline === 0}
              >
                Générer les {timeline} fenêtre(s)
              </Button>
              <Button
                variant="subtle"
                radius="md"
                size="xs"
                onClick={syncWindows}
                disabled={timeline === 0}
              >
                Saisir à la main
              </Button>
              {windows.length > 0 && windows.length !== timeline && (
                <Text size="xs" c="orange">
                  {windows.length} saisie(s) pour {timeline} attendue(s).
                </Text>
              )}
            </Group>

            {windows.length > 0 && (
              <ScrollArea.Autosize mah={280}>
                <Stack gap="xs">
                  {windows.map((w, i) => (
                    <Group key={i} gap="sm" wrap="nowrap">
                      <Badge variant="light" color="navy" w={54}>
                        C{i + 1}
                      </Badge>
                      <DatePickerInput
                        type="range"
                        placeholder="Début → fin"
                        value={w}
                        onChange={(v) =>
                          setWindows((prev) =>
                            prev.map((x, j) => (j === i ? (v as [string | null, string | null]) : x)),
                          )
                        }
                        radius="md"
                        style={{ flex: 1 }}
                      />
                    </Group>
                  ))}
                </Stack>
              </ScrollArea.Autosize>
            )}

            <Group justify="space-between" align="center">
              {nextStep ? (
                <Text size="sm" c="orange">
                  {nextStep}
                </Text>
              ) : (
                <Text size="sm" c="teal">
                  Prêt — {timeline} colonne(s) définie(s).
                </Text>
              )}
              <Button
                radius="md"
                color="navy"
                leftSection={<IconPlayerPlay size={16} />}
                onClick={handleSimulate}
                loading={previewing}
                disabled={!canSimulate}
              >
                Simuler
              </Button>
            </Group>
          </Stack>
        </Card>

        {layout && (
          <Card withBorder radius="md" padding="lg" ref={resultRef}>
            <Stack gap="md">
              <Group justify="space-between" align="flex-start">
                <div>
                  <Title order={4}>Croisement calculé</Title>
                  <Text size="sm" c="dimmed">
                    {layout.timeline} colonnes · {partitionsUsed} partition(s) ·{' '}
                    multiples de {layout.partitionStep} acceptés
                  </Text>
                </div>
                <Group gap="xs">
                  <Button
                    radius="md"
                    color="navy"
                    leftSection={<IconCheck size={16} />}
                    onClick={handleApply}
                    loading={applying}
                  >
                    Appliquer l'axe
                  </Button>
                  <Tooltip label="Écrivez d'abord l'axe" disabled={applied}>
                    <Button
                      radius="md"
                      variant="light"
                      color="navy"
                      rightSection={<IconArrowRight size={16} />}
                      onClick={handlePlan}
                      loading={planning}
                      disabled={!applied}
                    >
                      Générer le plan
                    </Button>
                  </Tooltip>
                </Group>
              </Group>

              {layout.warnings.map((w, i) => (
                <Alert key={i} variant="light" color="orange" icon={<IconAlertTriangle size={16} />} radius="md">
                  {w}
                </Alert>
              ))}

              <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Stage</Table.Th>
                    <Table.Th>Périodes</Table.Th>
                    <Table.Th>Partitions simultanées</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {layout.stages.map((t) => (
                    <Table.Tr key={t.stageId}>
                      <Table.Td>
                        {stageOptions.find((o) => o.value === String(t.stageId))?.label ?? t.stageId}
                      </Table.Td>
                      <Table.Td>{t.periods}</Table.Td>
                      <Table.Td>
                        <Badge variant="light" color={t.concurrency > 1 ? 'orange' : 'teal'}>
                          {t.concurrency}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>

              <Divider label="Qui va où" labelPosition="left" />

              <ScrollArea>
                <Table striped withTableBorder>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Partition</Table.Th>
                      {layout.stages.map((t) => (
                        <Table.Th key={t.stageId}>
                          {stageOptions.find((o) => o.value === String(t.stageId))?.label ?? t.stageId}
                        </Table.Th>
                      ))}
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {Array.from(new Set(layout.matrix.map((m) => m.rotationGroup)))
                      .sort()
                      .map((label) => (
                        <Table.Tr key={label}>
                          <Table.Td>
                            <Badge variant="filled" color="navy">
                              {label}
                            </Badge>
                          </Table.Td>
                          {layout.stages.map((t) => {
                            const cell = layout.matrix.find(
                              (m) => m.rotationGroup === label && m.stageId === t.stageId,
                            );
                            return (
                              <Table.Td key={t.stageId}>
                                {cell ? cell.periodNumbers.map((n) => `P${n}`).join(', ') : '—'}
                              </Table.Td>
                            );
                          })}
                        </Table.Tr>
                      ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            </Stack>
          </Card>
        )}
      </Stack>
    </Container>
  );
}
