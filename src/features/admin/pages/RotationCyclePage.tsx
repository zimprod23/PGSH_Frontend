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
  useGetPromotionLevelsQuery,
  useGetStagesQuery,
  usePreviewRotationCycleMutation,
  useApplyRotationCycleMutation,
  useGenerateMacroPlanMutation,
  useLazyGenerateAxisWindowsQuery,
} from '../api/adminApi';
import type {
  AxisColumnUnit,
  DateWindowInput,
  GeneratedAxisResponse,
  RotationCycleLayout,
  StageDurationCheck,
} from '../types/admin.types';
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
  const [unit, setUnit] = useState<AxisColumnUnit>('Months');
  const [applied, setApplied] = useState(false);
  /** What the server made of the axis: working-day counts, holidays hit, warnings. */
  const [axis, setAxis] = useState<GeneratedAxisResponse | null>(null);
  const [durationChecks, setDurationChecks] = useState<StageDurationCheck[]>([]);

  // The result card renders below the fold on a laptop, so clicking Simuler looked like nothing had
  // happened. Bring it into view rather than leaving the user to guess.
  const resultRef = useRef<HTMLDivElement>(null);

  const { data: levels = [] } = useGetPromotionLevelsQuery(undefined);
  const { data: stagePage } = useGetStagesQuery(
    { levelId: levelId ?? undefined, pageNumber: 1, pageSize: 100 },
    { skip: levelId == null },
  );

  const [preview, { isLoading: previewing }] = usePreviewRotationCycleMutation();
  const [apply, { isLoading: applying }] = useApplyRotationCycleMutation();
  const [macroPlan, { isLoading: planning }] = useGenerateMacroPlanMutation();
  const [fetchAxis, { isFetching: generatingAxis }] = useLazyGenerateAxisWindowsQuery();

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
  const syncWindows = () => {
    setAxis(null);
    setWindows((prev) =>
      Array.from({ length: timeline }, (_, i) => prev[i] ?? [null, null]),
    );
  };

  /**
   * Lays out all T columns from one start date — the point being that the whole axis comes from a single
   * entry rather than 2T dates typed by hand.
   *
   * ⚠ A **server** call, deliberately. This used to be `setUTCMonth` here, which is right for calendar
   * months and silently wrong the moment a duration means *jours ouvrables*: the browser has no holiday
   * table, so a window generated locally counts Aïd as four days of stage. The server returns the windows
   * *and* what they cost in worked days, which is the number the faculty is actually choosing.
   *
   * Everything stays editable afterwards — a real calendar has irregularities no rule captures.
   */
  const generateWindows = async () => {
    if (!autoStart || timeline === 0) return;

    try {
      const res = await fetchAxis({
        columns: timeline,
        startDate: autoStart,
        unit,
        length: columnLength,
      }).unwrap();

      setAxis(res);
      setWindows(res.columns.map((c) => [c.startDate, c.endDate]));

      if (res.calendarIsEmpty)
        notify.info(
          'Aucun jour férié enregistré sur cette période — les jours ouvrables ne comptent donc que '
          + 'les week-ends. Renseignez le calendrier pour un décompte juste.',
        );
    } catch {
      // The error middleware toasts the API's own message.
      setAxis(null);
    }
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
      setDurationChecks(res.durationChecks);
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

      // ⚠ Never let a refused plan pass for a successful one. The macro plan reports every cell it
      // declined, and this page was the one place that dropped the number: a run that wrote 120 of
      // the 540 cells it was asked for toasted "120 cellule(s)" and nothing else, so a répartition
      // missing seven of its nine columns looked like it had worked.
      if (res.groupConflicts > 0) {
        notify.error(
          `${res.groupConflicts} cellule(s) non écrite(s) : ces groupes sont déjà affectés à un ` +
          'autre stage sur les mêmes dates. Si ce stage appartient à une autre promotion, les ' +
          'groupes de cette année sont partagés entre niveaux et doivent être séparés avant de répartir.',
        );
      }

      if (res.cohortsNotRequiredByCnpn > 0) {
        notify.info(
          `${res.cohortsNotRequiredByCnpn} combinaison(s) écartée(s) : le CNPN suivi par ces groupes ` +
          "n'exige pas ce stage à leur niveau.",
        );
      }
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
                max={unit === 'WorkingDays' ? 260 : 12}
                radius="md"
                w={140}
              />
              <Select
                label="Unité"
                description={
                  unit === 'WorkingDays'
                    ? 'Week-ends et jours fériés exclus — toutes les colonnes durent autant'
                    : 'Durée calendaire — février et mars ne pèsent pas pareil'
                }
                data={[
                  { value: 'Months', label: 'mois' },
                  { value: 'Weeks', label: 'semaines' },
                  { value: 'WorkingDays', label: 'jours ouvrables' },
                ]}
                value={unit}
                onChange={(v) => {
                  setUnit((v as AxisColumnUnit) ?? 'Months');
                  setAxis(null);
                }}
                radius="md"
                w={260}
                allowDeselect={false}
              />
              <Button
                radius="md"
                variant="light"
                color="navy"
                loading={generatingAxis}
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

            {axis && (
              <Stack gap="xs">
                {axis.warnings.map((w) => (
                  <Alert key={w} variant="light" color="orange" icon={<IconAlertTriangle size={14} />}>
                    {w}
                  </Alert>
                ))}

                <Group gap="xs">
                  <Badge variant="light" color="teal">
                    {axis.workingDaysTotal} jour(s) ouvrable(s) au total
                  </Badge>
                  <Badge variant="light" color="gray">
                    {axis.calendarDaysTotal} jour(s) calendaires
                  </Badge>
                  {axis.calendarIsEmpty && (
                    <Badge variant="light" color="orange">Calendrier vide — week-ends seuls</Badge>
                  )}
                  {axis.missingReligious.length > 0 && (
                    <Tooltip
                      multiline
                      w={320}
                      label={
                        'Ces fêtes suivent le calendrier hégirien : leur date est fixée par décret et '
                        + 'PGSH ne peut pas la calculer. Saisissez-les dans Calendrier pour que le '
                        + 'décompte soit juste.'
                      }
                    >
                      <Badge variant="light" color="yellow" style={{ cursor: 'help' }}>
                        À saisir : {axis.missingReligious.join(', ')}
                      </Badge>
                    </Tooltip>
                  )}
                </Group>
              </Stack>
            )}

            {windows.length > 0 && (
              <ScrollArea.Autosize mah={320}>
                <Stack gap="xs">
                  {windows.map((w, i) => {
                    const column = axis?.columns[i];

                    return (
                      <Group key={i} gap="sm" wrap="nowrap">
                        <Badge variant="light" color="navy" w={54}>
                          C{i + 1}
                        </Badge>
                        <DatePickerInput
                          type="range"
                          placeholder="Début → fin"
                          value={w}
                          onChange={(v) => {
                            // Typing over a generated window makes the server's counts describe dates
                            // that are no longer on screen.
                            setAxis(null);
                            setWindows((prev) =>
                              prev.map((x, j) => (j === i ? (v as [string | null, string | null]) : x)),
                            );
                          }}
                          radius="md"
                          style={{ flex: 1 }}
                        />
                        {column && (
                          <Group gap={6} wrap="nowrap" w={rem(260)}>
                            <Badge
                              variant="light"
                              color={column.workingDays === 0 ? 'red' : 'teal'}
                              size="sm"
                            >
                              {column.workingDays} j. ouvr.
                            </Badge>
                            <Text size="xs" c="dimmed">/ {column.calendarDays} j.</Text>
                            {column.holidays.length > 0 && (
                              <Tooltip label={column.holidays.join(' · ')} multiline w={260}>
                                <Badge
                                  variant="dot"
                                  size="sm"
                                  color={column.hasProvisionalDates ? 'orange' : 'gray'}
                                  style={{ cursor: 'help' }}
                                >
                                  {column.holidays.length} férié(s)
                                </Badge>
                              </Tooltip>
                            )}
                          </Group>
                        )}
                      </Group>
                    );
                  })}
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

              {durationChecks.length > 0 && (
                <>
                  <Divider label="Durée réelle par stage" labelPosition="left" />

                  <Text size="xs" c="dimmed">
                    Ce que les fenêtres donnent réellement à chaque stage, en jours ouvrables, face à la
                    durée annoncée par son catalogue. Un intervalle plutôt qu'un nombre : les partitions
                    prennent des tranches différentes de l'axe, et une tranche sur février est réellement
                    plus courte qu'une tranche sur mars. Informatif — jamais bloquant.
                  </Text>

                  <Table striped withTableBorder>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Stage</Table.Th>
                        <Table.Th>Périodes</Table.Th>
                        <Table.Th>Annoncé</Table.Th>
                        <Table.Th>Jours ouvrables</Table.Th>
                        <Table.Th>Jours calendaires</Table.Th>
                        <Table.Th>Remarque</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {durationChecks.map((c) => (
                        <Table.Tr key={c.stageId}>
                          <Table.Td>{c.name}</Table.Td>
                          <Table.Td>{c.periods}</Table.Td>
                          <Table.Td>{c.statedDurationInDays} j.</Table.Td>
                          <Table.Td>
                            <Badge variant="light" color={c.note ? 'orange' : 'teal'}>
                              {c.minWorkingDays === c.maxWorkingDays
                                ? c.minWorkingDays
                                : `${c.minWorkingDays} – ${c.maxWorkingDays}`}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" c="dimmed">
                              {c.minCalendarDays === c.maxCalendarDays
                                ? c.minCalendarDays
                                : `${c.minCalendarDays} – ${c.maxCalendarDays}`}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs" c={c.note ? 'orange' : 'dimmed'}>
                              {c.note ?? '—'}
                            </Text>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </>
              )}

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
