import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Collapse,
  Container,
  Group,
  Modal,
  NumberInput,
  Paper,
  ScrollArea,
  SegmentedControl,
  Skeleton,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Tooltip,
  Title,
  UnstyledButton,
  rem,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconBuildingHospital,
  IconCalendarEvent,
  IconChevronRight,
  IconClipboardList,
  IconCheck,
  IconPencil,
  IconSearch,
  IconStethoscope,
  IconUsers,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import {
  useGetCurrentEmployeeQuery,
  useGetEvaluationByPeriodQuery,
  useGetPeriodObjectivesQuery,
  useGetServicePeriodsByServiceQuery,
  useSubmitEvaluationMutation,
  useUpdateEvaluationMutation,
} from '../api/employeeApi';
import type {
  EvaluationMode,
  EvaluationOutcome,
  MyServicePeriodResponse,
  ObjectiveScoreDto,
} from '../types/employee.types';
import { useNotify } from '../../../common/hooks/useNotify';

// ─── Evaluation modal ─────────────────────────────────────────────────────────

function EvaluationModal({
  period,
  opened,
  onClose,
}: {
  period: MyServicePeriodResponse | null;
  opened: boolean;
  onClose: () => void;
}) {
  const notify = useNotify();
  const isEditMode = period?.hasEvaluation ?? false;

  const { data: existing, isLoading: loadingExisting } = useGetEvaluationByPeriodQuery(
    period?.id ?? '',
    { skip: !isEditMode || !opened || !period?.id },
  );

  const { data: objectives = [], isLoading: loadingObjectives } = useGetPeriodObjectivesQuery(
    period?.id ?? '',
    { skip: !opened || !period?.id },
  );

  const hasObjectives = objectives.length > 0;

  // Evaluation mode (numeric grade · validate whole period · validate each objective).
  // Validate-by-objective needs objectives; fall back to numeric when the stage has none.
  const [selectedMode, setMode] = useState<EvaluationMode>('Numeric');
  const mode: EvaluationMode =
    !hasObjectives && selectedMode === 'ValidateObjectives' ? 'Numeric' : selectedMode;
  // Per-objective grade (0–20) and optional note, keyed by objective id.
  const [scores, setScores]   = useState<Record<number, number | string>>({});
  // Per-objective pass/fail verdict (ValidateObjectives mode), keyed by objective id.
  const [outcomes, setOutcomes] = useState<Record<number, EvaluationOutcome>>({});
  const [periodOutcome, setPeriodOutcome] = useState<EvaluationOutcome>('Validated');
  const [notes,  setNotes]    = useState<Record<number, string>>({});
  const [manualScore, setManualScore] = useState<number>(10);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (!opened) return;
    if (isEditMode && existing) {
      const s: Record<number, number> = {};
      const o: Record<number, EvaluationOutcome> = {};
      const n: Record<number, string> = {};
      existing.objectiveScores.forEach((os) => {
        if (os.score != null) s[os.stageObjectiveId] = os.score;
        if (os.outcome) o[os.stageObjectiveId] = os.outcome;
        n[os.stageObjectiveId] = os.note ?? '';
      });
      setMode(existing.mode);
      setScores(s);
      setOutcomes(o);
      setPeriodOutcome(existing.outcome ?? 'Validated');
      setManualScore(existing.totalScore != null ? Number(existing.totalScore) : 10);
      setNotes(n);
      setComment(existing.supervisorComment ?? '');
    } else if (!isEditMode) {
      setMode('Numeric');
      setScores({});
      setOutcomes({});
      setPeriodOutcome('Validated');
      setManualScore(10);
      setNotes({});
      setComment('');
    }
  }, [existing, isEditMode, opened]);

  // Final score = weight-weighted average of the per-objective grades (mirrors the
  // backend RecomputeFinalScore). Falls back to a manual score when the stage defines
  // no objectives.
  const computedTotal = useMemo(() => {
    const totalWeight = objectives.reduce((sum, o) => sum + o.weight, 0);
    if (totalWeight === 0) return 0;
    const weightedSum = objectives.reduce((sum, o) => sum + (Number(scores[o.id]) || 0) * o.weight, 0);
    return Math.round((weightedSum / totalWeight) * 100) / 100;
  }, [objectives, scores]);

  const effectiveTotal = hasObjectives ? computedTotal : manualScore;

  // For ValidateObjectives, the period is validated when every mandatory objective passes
  // (or every objective, when none is mandatory) — mirrors the backend DeriveObjectiveOutcome.
  const derivedObjectiveOutcome: EvaluationOutcome = useMemo(() => {
    const gates = objectives.some((o) => o.isMandatory)
      ? objectives.filter((o) => o.isMandatory)
      : objectives;
    return gates.every((o) => outcomes[o.id] === 'Validated') ? 'Validated' : 'NotValidated';
  }, [objectives, outcomes]);

  const [submit, { isLoading: submitting }] = useSubmitEvaluationMutation();
  const [update, { isLoading: updating   }] = useUpdateEvaluationMutation();

  const buildPayload = () => {
    if (mode === 'ValidatePeriod') {
      return { totalScore: null, outcome: periodOutcome, objectiveScores: [] as ObjectiveScoreDto[] };
    }
    if (mode === 'ValidateObjectives') {
      return {
        totalScore: null,
        outcome: null,
        objectiveScores: objectives.map((o) => ({
          stageObjectiveId: o.id,
          outcome:          outcomes[o.id] ?? 'NotValidated',
          note:             (notes[o.id] ?? '').trim() || undefined,
        })) as ObjectiveScoreDto[],
      };
    }
    return {
      totalScore: effectiveTotal,
      outcome: null,
      objectiveScores: (hasObjectives
        ? objectives.map((o) => ({
            stageObjectiveId: o.id,
            score:            Number(scores[o.id]) || 0,
            note:             (notes[o.id] ?? '').trim() || undefined,
          }))
        : []) as ObjectiveScoreDto[],
    };
  };

  const handleSubmit = async () => {
    if (!period) return;
    const payload = buildPayload();
    try {
      if (isEditMode && existing) {
        await update({
          evaluationId:      existing.id,
          servicePeriodId:   period.id,
          serviceId:         period.serviceId,
          mode,
          supervisorComment: comment.trim() || undefined,
          ...payload,
        }).unwrap();
        notify.success('Évaluation mise à jour');
      } else {
        await submit({
          servicePeriodId:   period.id,
          serviceId:         period.serviceId,
          mode,
          supervisorComment: comment.trim() || undefined,
          ...payload,
        }).unwrap();
        notify.success('Évaluation soumise');
      }
      onClose();
    } catch (err: unknown) {
      const detail = (err as { data?: { detail?: string } })?.data?.detail;
      notify.error(detail ?? 'Erreur lors de la soumission');
    }
  };

  const loading = loadingObjectives || (isEditMode && loadingExisting);
  const isBusy = submitting || updating;

  const outcomeControl = (value: EvaluationOutcome, onChange: (v: EvaluationOutcome) => void, size: 'xs' | 'sm' = 'sm') => (
    <SegmentedControl
      size={size}
      radius="md"
      value={value}
      onChange={(v) => onChange(v as EvaluationOutcome)}
      color={value === 'Validated' ? 'teal' : 'red'}
      data={[
        { value: 'Validated',    label: 'Validé' },
        { value: 'NotValidated', label: 'Non validé' },
      ]}
    />
  );

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={isEditMode ? 'Modifier l\'évaluation' : 'Nouvelle évaluation'}
      size="lg"
    >
      <Stack gap="md">
        <Group gap="xs">
          <Text size="sm" c="dimmed">
            {period?.studentFullName} — {period?.startDate} → {period?.endDate}
          </Text>
          {period?.stageName && (
            <Badge size="xs" variant="light" color="navy"
              leftSection={<IconStethoscope size={11} stroke={1.5} />}>
              {period.stageName}
            </Badge>
          )}
          {period?.studentCne && (
            <Badge size="xs" variant="outline" color="gray" ff="monospace">CNE {period.studentCne}</Badge>
          )}
        </Group>

        {loading ? (
          <Stack gap="xs">{[1, 2, 3].map((i) => <Skeleton key={i} height={48} radius="md" />)}</Stack>
        ) : (
          <>
            <SegmentedControl
              fullWidth
              radius="md"
              color="navy"
              size="sm"
              value={mode}
              onChange={(v) => setMode(v as EvaluationMode)}
              data={[
                { value: 'Numeric',            label: 'Note (0–20)' },
                { value: 'ValidatePeriod',     label: 'Valider le stage' },
                { value: 'ValidateObjectives', label: 'Valider par objectif', disabled: !hasObjectives },
              ]}
            />

            {mode === 'Numeric' && (hasObjectives ? (
              <>
                <Group justify="space-between" align="center">
                  <Text size="sm" fw={600}>Objectifs évalués</Text>
                  <Badge size="lg" color={effectiveTotal >= 10 ? 'teal' : 'red'} variant="light">
                    Note finale : {effectiveTotal.toFixed(2)} / 20
                  </Badge>
                </Group>
                <Text size="xs" c="dimmed">
                  La note finale est la moyenne pondérée des objectifs (par leur coefficient).
                </Text>
                <ScrollArea.Autosize mah={360}>
                  <Stack gap="sm">
                    {objectives.map((o) => (
                      <Paper key={o.id} withBorder radius="md" p="sm">
                        <Stack gap={6}>
                          <Group justify="space-between" gap="xs" wrap="nowrap">
                            <Group gap={6} wrap="nowrap">
                              <Text size="sm" fw={500} lineClamp={2}>{o.label}</Text>
                              {o.isMandatory && <Badge size="xs" color="orange" variant="light">Obligatoire</Badge>}
                            </Group>
                            <Badge size="xs" color="gray" variant="light" style={{ flexShrink: 0 }}>
                              Coef. {o.weight}
                            </Badge>
                          </Group>
                          {o.description && <Text size="xs" c="dimmed">{o.description}</Text>}
                          <Group gap="sm" align="flex-end" wrap="nowrap">
                            <NumberInput
                              label="Note (0 – 20)"
                              w={130}
                              value={scores[o.id] ?? ''}
                              onChange={(v) => setScores((prev) => ({ ...prev, [o.id]: v }))}
                              min={0}
                              max={20}
                              step={0.5}
                              decimalScale={2}
                            />
                            <TextInput
                              label="Remarque (optionnel)"
                              style={{ flex: 1 }}
                              value={notes[o.id] ?? ''}
                              onChange={(e) => { const v = e.currentTarget.value; setNotes((prev) => ({ ...prev, [o.id]: v })); }}
                            />
                          </Group>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                </ScrollArea.Autosize>
              </>
            ) : (
              <>
                <Text size="xs" c="dimmed">
                  Ce stage n'a pas d'objectifs définis — saisissez directement la note finale.
                </Text>
                <NumberInput
                  label="Note finale (0 – 20)"
                  value={manualScore}
                  onChange={(v) => setManualScore(Number(v) || 0)}
                  min={0}
                  max={20}
                  step={0.5}
                  decimalScale={2}
                  required
                />
              </>
            ))}

            {mode === 'ValidatePeriod' && (
              <Paper withBorder radius="md" p="md">
                <Stack gap="sm">
                  <Text size="sm" fw={600}>Validation du stage</Text>
                  <Text size="xs" c="dimmed">
                    Aucune note chiffrée — indiquez simplement si l'étudiant a validé ce stage.
                  </Text>
                  <Group justify="center">
                    {outcomeControl(periodOutcome, setPeriodOutcome)}
                  </Group>
                </Stack>
              </Paper>
            )}

            {mode === 'ValidateObjectives' && (
              <>
                <Group justify="space-between" align="center">
                  <Text size="sm" fw={600}>Validation par objectif</Text>
                  <Badge size="lg" variant="light" color={derivedObjectiveOutcome === 'Validated' ? 'teal' : 'red'}>
                    {derivedObjectiveOutcome === 'Validated' ? 'Stage validé' : 'Stage non validé'}
                  </Badge>
                </Group>
                <Text size="xs" c="dimmed">
                  Le stage est validé lorsque tous les objectifs obligatoires sont validés.
                </Text>
                <ScrollArea.Autosize mah={360}>
                  <Stack gap="sm">
                    {objectives.map((o) => (
                      <Paper key={o.id} withBorder radius="md" p="sm">
                        <Stack gap={6}>
                          <Group justify="space-between" gap="xs" wrap="nowrap">
                            <Group gap={6} wrap="nowrap">
                              <Text size="sm" fw={500} lineClamp={2}>{o.label}</Text>
                              {o.isMandatory && <Badge size="xs" color="orange" variant="light">Obligatoire</Badge>}
                            </Group>
                            {outcomeControl(
                              outcomes[o.id] ?? 'NotValidated',
                              (v) => setOutcomes((prev) => ({ ...prev, [o.id]: v })),
                              'xs',
                            )}
                          </Group>
                          {o.description && <Text size="xs" c="dimmed">{o.description}</Text>}
                          <TextInput
                            label="Remarque (optionnel)"
                            value={notes[o.id] ?? ''}
                            onChange={(e) => { const v = e.currentTarget.value; setNotes((prev) => ({ ...prev, [o.id]: v })); }}
                          />
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                </ScrollArea.Autosize>
              </>
            )}

            <Textarea
              label="Commentaire général"
              placeholder="Observations, points forts, axes d'amélioration…"
              value={comment}
              onChange={(e) => setComment(e.currentTarget.value)}
              minRows={2}
              maxRows={5}
              autosize
            />
          </>
        )}

        <Group justify="flex-end" pt="sm" style={{ borderTop: '1px solid #E2E8F0' }}>
          <Button variant="subtle" color="gray" onClick={onClose}>Annuler</Button>
          <Button
            color="navy"
            loading={isBusy}
            disabled={loading}
            leftSection={<IconCheck size={16} stroke={1.5} />}
            onClick={handleSubmit}
          >
            {isEditMode ? 'Enregistrer' : 'Soumettre'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// ─── Granularity helpers ──────────────────────────────────────────────────────

type PeriodStatus = 'active' | 'toEvaluate' | 'evaluated';

const STATUS_ORDER: PeriodStatus[] = ['active', 'toEvaluate', 'evaluated'];

const STATUS_META: Record<PeriodStatus, { label: string; color: string }> = {
  active:     { label: 'En cours',  color: 'blue'   },
  toEvaluate: { label: 'À évaluer', color: 'orange' },
  evaluated:  { label: 'Évalué',    color: 'teal'   },
};

function periodStatus(p: MyServicePeriodResponse): PeriodStatus {
  if (!p.isComplete) return 'active';
  return p.hasEvaluation ? 'evaluated' : 'toEvaluate';
}

const isTransfer = (p: MyServicePeriodResponse) => p.transfer != null;

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));

interface GroupBucket {
  label: string;
  rows: MyServicePeriodResponse[];
}

interface WindowBucket {
  key: string;
  startDate: string;
  endDate: string;
  stageName: string;
  levelLabel: string | null;
  groups: GroupBucket[];
  counts: Record<PeriodStatus, number>;
  total: number;
  transferIn: number;
  transferOut: number;
}

/** Distinct, non-empty stage names across a set of rows (a window is usually one stage). */
const distinctStages = (rows: MyServicePeriodResponse[]) =>
  Array.from(new Set(rows.map((r) => r.stageName).filter(Boolean)));

function pushTo<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const arr = map.get(key);
  if (arr) arr.push(value);
  else map.set(key, [value]);
}

/** Period (time window) → academic group → students. */
function buildWindows(periods: MyServicePeriodResponse[]): WindowBucket[] {
  const byWindow = new Map<string, MyServicePeriodResponse[]>();
  for (const p of periods) pushTo(byWindow, `${p.startDate}__${p.endDate}`, p);

  const windows: WindowBucket[] = [];
  for (const [key, rows] of byWindow) {
    const [startDate, endDate] = key.split('__');

    const byGroup = new Map<string, MyServicePeriodResponse[]>();
    for (const r of rows) pushTo(byGroup, r.academicGroupLabel, r);

    // Live roster entries sort first; transfer overlays (in/out) sink to the bottom of the group.
    const groups = Array.from(byGroup, ([label, gr]) => ({
      label,
      rows: gr.slice().sort((a, b) =>
        Number(isTransfer(a)) - Number(isTransfer(b)) || a.studentFullName.localeCompare(b.studentFullName)),
    })).sort((a, b) => a.label.localeCompare(b.label));

    const counts: Record<PeriodStatus, number> = { active: 0, toEvaluate: 0, evaluated: 0 };
    let transferIn = 0;
    let transferOut = 0;
    for (const r of rows) {
      if (r.transfer?.direction === 'Incoming') transferIn++;
      else if (r.transfer?.direction === 'Outgoing') transferOut++;
      else counts[periodStatus(r)]++;
    }

    const total = rows.length - transferIn - transferOut;
    const stageName = distinctStages(rows).join(' · ');
    const levelLabel = rows.find((r) => r.levelLabel)?.levelLabel ?? null;
    windows.push({ key, startDate, endDate, stageName, levelLabel, groups, counts, total, transferIn, transferOut });
  }

  return windows.sort((a, b) => a.startDate.localeCompare(b.startDate));
}

// ─── Service card ─────────────────────────────────────────────────────────────

function ServiceCard({ serviceId, serviceName, hospitalName }: {
  serviceId: number;
  serviceName: string;
  hospitalName: string;
}) {
  const [evalPeriod, setEvalPeriod] = useState<MyServicePeriodResponse | null>(null);
  const [modalOpen, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PeriodStatus>('all');
  const [serviceOpen, setServiceOpen] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const { data: page, isLoading } = useGetServicePeriodsByServiceQuery({ serviceId });

  const periods = useMemo(() => page?.items ?? [], [page]);

  const openFor = (period: MyServicePeriodResponse) => {
    setEvalPeriod(period);
    openModal();
  };

  const groups = useMemo(
    () => Array.from(new Set(periods.map((p) => p.academicGroupLabel))).sort(),
    [periods],
  );

  // The stage(s) this chef evaluates in this service — usually one, but a service can host
  // different rotations across windows, so show every distinct stage present.
  const stages = useMemo(() => distinctStages(periods), [periods]);

  const counts = useMemo(() => {
    const c: Record<PeriodStatus, number> = { active: 0, toEvaluate: 0, evaluated: 0 };
    for (const p of periods) if (!isTransfer(p)) c[periodStatus(p)]++;
    return c;
  }, [periods]);

  const transferCounts = useMemo(() => {
    let incoming = 0;
    let outgoing = 0;
    for (const p of periods) {
      if (p.transfer?.direction === 'Incoming') incoming++;
      else if (p.transfer?.direction === 'Outgoing') outgoing++;
    }
    return { incoming, outgoing };
  }, [periods]);

  const liveTotal = periods.length - transferCounts.incoming - transferCounts.outgoing;

  const q = search.trim().toLowerCase();
  const windows = useMemo(() => {
    const filtered = periods.filter((p) => {
      // The status filter targets the live roster; transfer overlays only appear under "Tous".
      if (statusFilter !== 'all' && (isTransfer(p) || periodStatus(p) !== statusFilter)) return false;
      if (q && !`${p.studentFullName} ${p.studentCne} ${p.studentAppogee}`.toLowerCase().includes(q)) return false;
      return true;
    });
    return buildWindows(filtered);
  }, [periods, statusFilter, q]);

  // While searching, every rendered group already contains only matches — force them open.
  const searching = q.length > 0;
  const allGroupKeys = useMemo(
    () => windows.flatMap((w) => w.groups.map((g) => `${w.key}::${g.label}`)),
    [windows],
  );
  const allExpanded = allGroupKeys.length > 0 && allGroupKeys.every((k) => expandedGroups.has(k));
  const groupOpen = (key: string) => searching || expandedGroups.has(key);
  const toggleGroup = (key: string) =>
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const toggleAllGroups = () =>
    setExpandedGroups(allExpanded ? new Set() : new Set(allGroupKeys));

  const actionFor = (p: MyServicePeriodResponse, status: PeriodStatus) => {
    if (status === 'active') {
      // Closing a period is an administrative act (done when the scheduled window ends).
      // The chef can only evaluate once it's closed — so no action here, just a hint.
      return (
        <Tooltip label="La période sera évaluable une fois clôturée par l'administration" withArrow multiline w={220}>
          <Text size="xs" c="dimmed" fs="italic">En attente de clôture</Text>
        </Tooltip>
      );
    }
    if (status === 'toEvaluate') {
      return (
        <Button
          size="xs"
          variant="light"
          color="navy"
          leftSection={<IconClipboardList size={14} stroke={1.5} />}
          onClick={() => openFor(p)}
        >
          Évaluer
        </Button>
      );
    }
    return (
      <Button
        size="xs"
        variant="subtle"
        color="gray"
        leftSection={<IconPencil size={14} stroke={1.5} />}
        onClick={() => openFor(p)}
      >
        Modifier
      </Button>
    );
  };

  return (
    <>
      <Card padding="lg" radius="lg" withBorder shadow="sm">
        <Stack gap="md">
          <Group
            justify="space-between"
            align="center"
            wrap="nowrap"
            onClick={() => setServiceOpen((o) => !o)}
            style={{ cursor: 'pointer' }}
          >
            <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
              <ActionIcon
                variant="subtle"
                color="gray"
                radius="md"
                aria-label={serviceOpen ? 'Réduire le service' : 'Développer le service'}
                onClick={(e) => { e.stopPropagation(); setServiceOpen((o) => !o); }}
              >
                <IconChevronRight
                  size={18}
                  style={{ transform: serviceOpen ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }}
                />
              </ActionIcon>
              <ThemeIcon size={40} radius="md" variant="light" color="navy">
                <IconBuildingHospital size={20} stroke={1.5} />
              </ThemeIcon>
              <Stack gap={2} style={{ minWidth: 0 }}>
                <Text fw={700} size="md" truncate>{serviceName}</Text>
                <Text size="xs" c="dimmed" truncate>{hospitalName}</Text>
                {stages.length > 0 && (
                  <Group gap={4} wrap="nowrap" style={{ minWidth: 0 }}>
                    <IconStethoscope size={12} stroke={1.5} color="#0F4C81" style={{ flexShrink: 0 }} />
                    <Text size="xs" fw={600} c="navy.6" truncate>{stages.join(' · ')}</Text>
                  </Group>
                )}
              </Stack>
            </Group>
            <Group gap={6} justify="flex-end" style={{ flexWrap: 'wrap', maxWidth: '55%' }}>
              {STATUS_ORDER.filter((s) => counts[s] > 0).map((s) => (
                <Badge key={s} size="sm" variant="light" color={STATUS_META[s].color} radius="sm">
                  {counts[s]} {STATUS_META[s].label.toLowerCase()}
                </Badge>
              ))}
              {transferCounts.incoming > 0 && (
                <Badge size="sm" variant="light" color="teal" radius="sm">
                  {transferCounts.incoming} entrant{transferCounts.incoming > 1 ? 's' : ''}
                </Badge>
              )}
              {transferCounts.outgoing > 0 && (
                <Badge size="sm" variant="light" color="gray" radius="sm">
                  {transferCounts.outgoing} sortant{transferCounts.outgoing > 1 ? 's' : ''}
                </Badge>
              )}
              {groups.length > 0 && (
                <Badge size="sm" variant="outline" color="grape" radius="sm">
                  {groups.length} groupe{groups.length > 1 ? 's' : ''}
                </Badge>
              )}
            </Group>
          </Group>

          <Collapse in={serviceOpen}>
            <Stack gap="md">
              <Group gap="sm" wrap="wrap">
                <TextInput
                  placeholder="Rechercher un étudiant (nom, CNE, Apogée)…"
                  leftSection={<IconSearch size={16} stroke={1.5} />}
                  value={search}
                  onChange={(e) => setSearch(e.currentTarget.value)}
                  radius="md"
                  style={{ flex: 1, minWidth: rem(220) }}
                />
                <ScrollArea type="never">
                  <SegmentedControl
                    value={statusFilter}
                    onChange={(v) => setStatusFilter(v as 'all' | PeriodStatus)}
                    radius="md"
                    size="xs"
                    color="navy"
                    data={[
                      { value: 'all',        label: `Tous (${liveTotal})` },
                      { value: 'active',     label: `En cours (${counts.active})` },
                      { value: 'toEvaluate', label: `À évaluer (${counts.toEvaluate})` },
                      { value: 'evaluated',  label: `Évalués (${counts.evaluated})` },
                    ]}
                  />
                </ScrollArea>
                {allGroupKeys.length > 0 && (
                  <Button
                    variant="subtle"
                    color="navy"
                    size="xs"
                    radius="md"
                    disabled={searching}
                    onClick={toggleAllGroups}
                  >
                    {allExpanded ? 'Tout replier' : 'Tout déplier'}
                  </Button>
                )}
              </Group>

              {isLoading ? (
                <Stack gap="xs">{[1, 2].map((i) => <Skeleton key={i} height={72} radius="md" />)}</Stack>
              ) : periods.length === 0 ? (
                <Center py="lg">
                  <Stack align="center" gap={4}>
                    <IconUsers size={28} stroke={1.5} color="#94A3B8" />
                    <Text size="sm" c="dimmed">Aucune rotation pour ce service.</Text>
                  </Stack>
                </Center>
              ) : windows.length === 0 ? (
                <Center py="lg">
                  <Text size="sm" c="dimmed">Aucun étudiant ne correspond à votre recherche.</Text>
                </Center>
              ) : (
                <Stack gap="md">
                  {windows.map((w) => (
                    <Paper key={w.key} withBorder radius="md" p="md" bg="gray.0">
                      <Stack gap="sm">
                        <Group justify="space-between" align="flex-start" wrap="nowrap">
                          <Group gap="xs" wrap="nowrap">
                            <ThemeIcon variant="light" color="navy" size={34} radius="md">
                              <IconCalendarEvent size={18} stroke={1.5} />
                            </ThemeIcon>
                            <Stack gap={2}>
                              <Text fw={600} size="sm">{fmtDate(w.startDate)} → {fmtDate(w.endDate)}</Text>
                              {w.stageName && (
                                <Group gap={6} wrap="nowrap">
                                  <Badge size="sm" variant="light" color="navy" radius="sm"
                                    leftSection={<IconStethoscope size={12} stroke={1.5} />}>
                                    {w.stageName}
                                  </Badge>
                                  {w.levelLabel && <Text size="xs" c="dimmed">{w.levelLabel}</Text>}
                                </Group>
                              )}
                              <Text size="xs" c="dimmed">
                                {w.total} étudiant{w.total > 1 ? 's' : ''} · {w.groups.length} groupe{w.groups.length > 1 ? 's' : ''}
                              </Text>
                            </Stack>
                          </Group>
                          <Group gap={6} justify="flex-end" style={{ flexWrap: 'wrap' }}>
                            {STATUS_ORDER.filter((s) => w.counts[s] > 0).map((s) => (
                              <Badge key={s} size="sm" variant="light" color={STATUS_META[s].color} radius="sm">
                                {w.counts[s]} {STATUS_META[s].label.toLowerCase()}
                              </Badge>
                            ))}
                            {w.transferIn > 0 && (
                              <Badge size="sm" variant="light" color="teal" radius="sm">
                                {w.transferIn} entrant{w.transferIn > 1 ? 's' : ''}
                              </Badge>
                            )}
                            {w.transferOut > 0 && (
                              <Badge size="sm" variant="light" color="gray" radius="sm">
                                {w.transferOut} sortant{w.transferOut > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </Group>
                        </Group>

                        {w.groups.map((g) => {
                          const gkey = `${w.key}::${g.label}`;
                          const open = groupOpen(gkey);
                          return (
                            <Paper key={g.label} withBorder radius="md" bg="white">
                              <UnstyledButton
                                w="100%"
                                p="sm"
                                onClick={() => toggleGroup(gkey)}
                                disabled={searching}
                                style={{ borderRadius: 'var(--mantine-radius-md)' }}
                              >
                                <Group justify="space-between" wrap="nowrap">
                                  <Group gap={8} wrap="nowrap">
                                    <IconChevronRight
                                      size={15}
                                      color="var(--mantine-color-gray-5)"
                                      style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 150ms', flexShrink: 0 }}
                                    />
                                    <Badge size="sm" variant="filled" color="grape" radius="sm">Groupe {g.label}</Badge>
                                    <Text size="xs" c="dimmed">{g.rows.length} étudiant{g.rows.length > 1 ? 's' : ''}</Text>
                                  </Group>
                                  <Group gap={4} wrap="nowrap">
                                    {STATUS_ORDER.map((s) => {
                                      const n = g.rows.filter((r) => !isTransfer(r) && periodStatus(r) === s).length;
                                      return n > 0 ? (
                                        <Badge key={s} size="xs" variant="dot" color={STATUS_META[s].color} radius="sm">
                                          {n}
                                        </Badge>
                                      ) : null;
                                    })}
                                    {(() => {
                                      const inc = g.rows.filter((r) => r.transfer?.direction === 'Incoming').length;
                                      return inc > 0 ? (
                                        <Badge size="xs" variant="dot" color="teal" radius="sm">{inc}</Badge>
                                      ) : null;
                                    })()}
                                    {(() => {
                                      const out = g.rows.filter((r) => r.transfer?.direction === 'Outgoing').length;
                                      return out > 0 ? (
                                        <Badge size="xs" variant="dot" color="gray" radius="sm">{out}</Badge>
                                      ) : null;
                                    })()}
                                  </Group>
                                </Group>
                              </UnstyledButton>
                              <Collapse in={open}>
                                <Box px="sm" pb="sm">
                                  <Table verticalSpacing="xs" fz="sm" highlightOnHover>
                                    <Table.Tbody>
                                      {g.rows.map((p) => {
                                        const t = p.transfer;
                                        if (t) {
                                          const incoming = t.direction === 'Incoming';
                                          const detail = `${incoming ? '←' : '→'} Groupe ${t.groupLabel}${t.serviceName ? ` · ${t.serviceName}` : ''}`;
                                          return (
                                            <Table.Tr key={`${p.id}-${p.internshipAssignmentId}-${p.startDate}`}>
                                              <Table.Td>
                                                <Stack gap={2}>
                                                  <Text
                                                    size="sm"
                                                    fw={500}
                                                    c={incoming ? undefined : 'dimmed'}
                                                    td={incoming ? undefined : 'line-through'}
                                                  >
                                                    {p.studentFullName}
                                                  </Text>
                                                  <Text size="xs" c="dimmed" ff="monospace">
                                                    CNE {p.studentCne} · {p.studentAppogee}
                                                  </Text>
                                                  <Text size="xs" fw={500} c={incoming ? 'teal.7' : 'gray.6'}>
                                                    {detail}
                                                  </Text>
                                                </Stack>
                                              </Table.Td>
                                              <Table.Td>
                                                <Tooltip
                                                  label={t.reason ? `Motif : ${t.reason}` : 'Aucun motif renseigné'}
                                                  multiline
                                                  w={240}
                                                  withArrow
                                                  disabled={!t.reason}
                                                >
                                                  <Badge size="sm" variant="light" color={incoming ? 'teal' : 'gray'} radius="sm">
                                                    {incoming ? 'Entrant' : 'Sortant'}
                                                  </Badge>
                                                </Tooltip>
                                              </Table.Td>
                                              <Table.Td align="right" w={rem(140)}>
                                                {t.date && <Text size="xs" c="dimmed">{fmtDate(t.date)}</Text>}
                                              </Table.Td>
                                            </Table.Tr>
                                          );
                                        }
                                        const status = periodStatus(p);
                                        return (
                                          <Table.Tr key={p.id}>
                                            <Table.Td>
                                              <Stack gap={0}>
                                                <Text size="sm" fw={500}>{p.studentFullName}</Text>
                                                <Text size="xs" c="dimmed" ff="monospace">
                                                  CNE {p.studentCne} · {p.studentAppogee}
                                                </Text>
                                              </Stack>
                                            </Table.Td>
                                            <Table.Td>
                                              <Badge size="sm" variant="light" color={STATUS_META[status].color} radius="sm">
                                                {STATUS_META[status].label}
                                              </Badge>
                                            </Table.Td>
                                            <Table.Td align="right" w={rem(140)}>
                                              {actionFor(p, status)}
                                            </Table.Td>
                                          </Table.Tr>
                                        );
                                      })}
                                    </Table.Tbody>
                                  </Table>
                                </Box>
                              </Collapse>
                            </Paper>
                          );
                        })}
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Stack>
          </Collapse>
        </Stack>
      </Card>

      <EvaluationModal period={evalPeriod} opened={modalOpen} onClose={closeModal} />
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EmployeeServicesPage() {
  const { data: me, isLoading } = useGetCurrentEmployeeQuery();

  const services = me?.services.filter((s) => s.isChef) ?? [];

  return (
    <Container fluid>
      <Stack gap="xl">
        <Stack gap={4}>
          <Title order={2} fw={700}>Mes Services</Title>
          <Text size="sm" c="dimmed">
            Services dont vous êtes chef — rotations actives et évaluations en attente.
          </Text>
        </Stack>

        {isLoading ? (
          <Stack gap="md">
            {[1, 2].map((i) => <Skeleton key={i} height={200} radius="lg" />)}
          </Stack>
        ) : services.length === 0 ? (
          <Card padding="xl" radius="lg" withBorder shadow="sm">
            <Stack align="center" gap="sm">
              <ThemeIcon size={56} radius="xl" variant="light" color="gray">
                <IconBuildingHospital size={28} stroke={1.5} />
              </ThemeIcon>
              <Text fw={600} c="dimmed">Aucun service assigné</Text>
              <Text size="sm" c="dimmed" ta="center" maw={320}>
                Vous n'êtes actuellement chef d'aucun service. Contactez l'administrateur.
              </Text>
            </Stack>
          </Card>
        ) : (
          <Stack gap="lg">
            {services.map((s) => (
              <ServiceCard
                key={s.serviceId}
                serviceId={s.serviceId}
                serviceName={s.serviceName}
                hospitalName={s.hospitalName}
              />
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
