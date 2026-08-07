import {
  Badge,
  Button,
  Group,
  Modal,
  NumberInput,
  Paper,
  ScrollArea,
  SegmentedControl,
  Skeleton,
  Stack,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';
import { IconCheck, IconStethoscope } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import {
  useGetEvaluationByPeriodQuery,
  useGetPeriodObjectivesQuery,
  useSubmitEvaluationMutation,
  useUpdateEvaluationMutation,
} from '../api/evaluationsApi';
import type {
  EvaluationMode,
  EvaluationOutcome,
  EvaluationTarget,
  ObjectiveScoreDto,
  PeriodObjective,
  ServiceEvaluationDetail,
} from '../types/evaluation.types';
import { useNotify } from '../../../common/hooks/useNotify';

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso));

/**
 * Records or corrects one rotation's evaluation, in whichever of the three modes the stage uses.
 * Opened by the service chef from his worklist and by an administrator from a student's stage
 * record — the form is identical, and the backend decides which of them is allowed to save.
 */
export function EvaluationModal({
  target,
  opened,
  onClose,
}: {
  target: EvaluationTarget | null;
  opened: boolean;
  onClose: () => void;
}) {
  const isEditMode = target?.hasEvaluation ?? false;

  const { data: existing, isLoading: loadingExisting } = useGetEvaluationByPeriodQuery(
    target?.periodId ?? '',
    { skip: !isEditMode || !opened || !target?.periodId },
  );

  const { data: objectives = [], isLoading: loadingObjectives } = useGetPeriodObjectivesQuery(
    target?.periodId ?? '',
    { skip: !opened || !target?.periodId },
  );

  const loading = loadingObjectives || (isEditMode && loadingExisting);

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
            {target?.studentFullName}
            {target && ` — ${fmtDate(target.startDate)} → ${fmtDate(target.endDate)}`}
          </Text>
          {target?.stageName && (
            <Badge size="xs" variant="light" color="navy"
              leftSection={<IconStethoscope size={11} stroke={1.5} />}>
              {target.stageName}
            </Badge>
          )}
          {target?.studentCne && (
            <Badge size="xs" variant="outline" color="gray" ff="monospace">CNE {target.studentCne}</Badge>
          )}
        </Group>

        {existing?.evaluatedByName?.trim() && (
          <Text size="xs" c="dimmed">
            Dernière évaluation par {existing.evaluatedByName.trim()}
            {existing.evaluatedAt ? ` le ${fmtDate(existing.evaluatedAt)}` : ''}
          </Text>
        )}

        {loading || !target ? (
          <Stack gap="xs">{[1, 2, 3].map((i) => <Skeleton key={i} height={48} radius="md" />)}</Stack>
        ) : (
          // Remounted per rotation (and once the marks on record arrive) so the form seeds its state
          // straight from props — no effect mirroring server data into local state.
          <EvaluationForm
            key={`${target.periodId}:${existing?.id ?? 'new'}`}
            target={target}
            existing={existing ?? null}
            objectives={objectives}
            onClose={onClose}
          />
        )}
      </Stack>
    </Modal>
  );
}

/**
 * The form itself. Mounted only once its data has loaded, so every field starts from the marks
 * already on record — or empty for a first evaluation — without an effect.
 */
function EvaluationForm({
  target,
  existing,
  objectives,
  onClose,
}: {
  target: EvaluationTarget;
  existing: ServiceEvaluationDetail | null;
  objectives: PeriodObjective[];
  onClose: () => void;
}) {
  const notify = useNotify();
  const hasObjectives = objectives.length > 0;
  const recorded = existing?.objectiveScores ?? [];

  // Evaluation mode (numeric grade · validate whole period · validate each objective).
  // Validate-by-objective needs objectives; fall back to numeric when the stage has none.
  const [selectedMode, setMode] = useState<EvaluationMode>(existing?.mode ?? 'Numeric');
  const mode: EvaluationMode =
    !hasObjectives && selectedMode === 'ValidateObjectives' ? 'Numeric' : selectedMode;

  // Per-objective grade (0–20), pass/fail verdict and note, each keyed by objective id.
  const [scores, setScores] = useState<Record<number, number | string>>(() =>
    Object.fromEntries(recorded.filter((o) => o.score != null).map((o) => [o.stageObjectiveId, o.score!])));
  const [outcomes, setOutcomes] = useState<Record<number, EvaluationOutcome>>(() =>
    Object.fromEntries(recorded.filter((o) => o.outcome != null).map((o) => [o.stageObjectiveId, o.outcome!])));
  const [notes, setNotes] = useState<Record<number, string>>(() =>
    Object.fromEntries(recorded.map((o) => [o.stageObjectiveId, o.note ?? ''])));

  const [periodOutcome, setPeriodOutcome] = useState<EvaluationOutcome>(existing?.outcome ?? 'Validated');
  const [manualScore, setManualScore] = useState<number>(
    existing?.totalScore != null ? Number(existing.totalScore) : 10);
  const [comment, setComment] = useState(existing?.supervisorComment ?? '');

  // Final score = weight-weighted average of the per-objective grades (mirrors the backend
  // StageScoring.PeriodMark). Falls back to a manual score when the stage defines no objectives.
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
    const body = {
      servicePeriodId:   target.periodId,
      mode,
      supervisorComment: comment.trim() || undefined,
      serviceId:         target.serviceId,
      assignmentId:      target.assignmentId,
      ...buildPayload(),
    };
    try {
      if (existing) {
        await update({ evaluationId: existing.id, ...body }).unwrap();
        notify.success('Évaluation mise à jour');
      } else {
        await submit(body).unwrap();
        notify.success('Évaluation soumise');
      }
      onClose();
    } catch (err: unknown) {
      const detail = (err as { data?: { detail?: string } })?.data?.detail;
      notify.error(detail ?? 'Erreur lors de la soumission');
    }
  };

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

      <Group justify="flex-end" pt="sm" style={{ borderTop: '1px solid #E2E8F0' }}>
        <Button variant="subtle" color="gray" onClick={onClose}>Annuler</Button>
        <Button
          color="navy"
          loading={isBusy}
          leftSection={<IconCheck size={16} stroke={1.5} />}
          onClick={handleSubmit}
        >
          {existing ? 'Enregistrer' : 'Soumettre'}
        </Button>
      </Group>
    </>
  );
}
