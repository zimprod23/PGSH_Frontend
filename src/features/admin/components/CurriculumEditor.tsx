import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  NumberInput,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';
import {
  IconCopy,
  IconDeviceFloppy,
  IconFilePlus,
  IconMinus,
  IconPencil,
  IconPlus,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useNotify } from '../../../common/hooks/useNotify';
import {
  useCopyCurriculumMutation,
  useGetStagesQuery,
  useSaveCurriculumMutation,
} from '../api/adminApi';
import type {
  CnpnVersionResponse,
  CurriculumResponse,
  CurriculumStageInput,
} from '../types/admin.types';

/**
 * Recording a CNPN: what one text requires of one level, submitted whole.
 *
 * A set is opened either by cloning another text's (a new CNPN mostly repeats the last with an
 * edit or two) or by typing it; from then on it is amended in place. Dropping a stage is shown before it is saved,
 * because removal releases only *new* students — anyone who already failed it still owes it.
 */

const REFERENCE_MAX = 200;

interface EditorRow extends CurriculumStageInput {
  stageName: string;
}

interface CurriculumEditorProps {
  levelId: number;
  cnpnVersionId: number;
  cnpnVersionLabel: string;
  /** Every recorded text, so a missing set can be cloned from another CNPN. */
  versions: CnpnVersionResponse[];
  /** Undefined when this level has no requirements recorded under this text yet. */
  curriculum?: CurriculumResponse;
  isLoading: boolean;
}

export function CurriculumEditor({
  levelId,
  cnpnVersionId,
  cnpnVersionLabel,
  versions,
  curriculum,
  isLoading,
}: CurriculumEditorProps) {
  const [editing, setEditing] = useState(false);

  if (isLoading) {
    return (
      <Card padding="lg" radius="lg" withBorder shadow="sm">
        <Group gap="xs"><Loader size="xs" /><Text size="sm" c="dimmed">Chargement du texte…</Text></Group>
      </Card>
    );
  }

  if (editing) {
    return (
      <CurriculumForm
        // Remounting on identity change beats mirroring server data into state with an effect:
        // switching level or text gives a fresh form instead of one carrying the previous set.
        key={`${levelId}-${cnpnVersionId}-${curriculum?.id ?? 'new'}`}
        levelId={levelId}
        cnpnVersionId={cnpnVersionId}
        cnpnVersionLabel={cnpnVersionLabel}
        curriculum={curriculum}
        onDone={() => setEditing(false)}
      />
    );
  }

  if (!curriculum) {
    return (
      <EmptyCurriculum
        levelId={levelId}
        cnpnVersionId={cnpnVersionId}
        cnpnVersionLabel={cnpnVersionLabel}
        versions={versions}
        onCompose={() => setEditing(true)}
      />
    );
  }

  return (
    <Card padding="lg" radius="lg" withBorder shadow="sm">
      <Stack gap="xs">
        <Group justify="space-between" wrap="nowrap">
          <Text fw={600} size="sm">
            Programme — {curriculum.cnpnVersionLabel} ({curriculum.stages.length} stage(s))
          </Text>
          <Button
            size="xs"
            variant="light"
            color="navy"
            leftSection={<IconPencil size={14} />}
            onClick={() => setEditing(true)}
          >
            Modifier le texte
          </Button>
        </Group>
        {curriculum.reference && <Text size="xs" c="dimmed">Source : {curriculum.reference}</Text>}
        <Group gap="xs" mt="xs">
          {curriculum.stages.length === 0 ? (
            <Text size="sm" c="dimmed">Texte enregistré sans aucun stage.</Text>
          ) : (
            curriculum.stages.map((s) => (
              <Badge key={s.stageId} variant="light" color="navy" radius="md" size="lg">
                {s.stageName} · coef {s.coefficient} · {s.durationInDays}j
              </Badge>
            ))
          )}
        </Group>
      </Stack>
    </Card>
  );
}

// ─── Nothing recorded yet: clone another text, or type it ────────────────────

function EmptyCurriculum({
  levelId,
  cnpnVersionId,
  cnpnVersionLabel,
  versions,
  onCompose,
}: {
  levelId: number;
  cnpnVersionId: number;
  cnpnVersionLabel: string;
  versions: CnpnVersionResponse[];
  onCompose: () => void;
}) {
  const notify = useNotify();
  const [copyCurriculum, { isLoading: copying }] = useCopyCurriculumMutation();
  const [source, setSource] = useState<string | null>(null);

  // Copying onto an existing set is refused by the server, so only a *missing* one gets here; the
  // source still has to be a different text, hence the exclusion.
  const sources = versions
    .filter((v) => v.id !== cnpnVersionId)
    .map((v) => ({ value: String(v.id), label: v.label }));

  const handleCopy = async () => {
    if (source === null) return;
    try {
      await copyCurriculum({
        levelId,
        cnpnVersionId,
        fromCnpnVersionId: Number(source),
      }).unwrap();
      notify.success(`CNPN ${cnpnVersionLabel} ouvert depuis ${sources.find((s) => s.value === source)?.label}`);
    } catch {
      notify.error("Impossible de cloner ce texte — le CNPN source n’a peut-être aucune exigence pour ce niveau");
    }
  };

  return (
    <Card padding="lg" radius="lg" withBorder shadow="sm">
      <Stack gap="md">
        <Alert color="orange" variant="light" radius="md" icon={<IconFilePlus size={16} />}>
          <Text size="sm" fw={600} mb={4}>Aucune exigence enregistrée pour {cnpnVersionLabel}</Text>
          <Text size="sm">
            Ouvrez-le en clonant un texte existant — la plupart des CNPN reprennent le précédent
            à une modification près — ou saisissez-le entièrement.
          </Text>
        </Alert>

        <Group align="flex-end" gap="sm">
          <Select
            label="Cloner depuis"
            placeholder="CNPN source"
            data={sources}
            value={source}
            onChange={setSource}
            searchable
            w={240}
          />
          <Button
            variant="light"
            color="navy"
            leftSection={<IconCopy size={16} />}
            onClick={handleCopy}
            loading={copying}
            disabled={source === null}
          >
            Cloner
          </Button>
          <Button variant="subtle" leftSection={<IconPlus size={16} />} onClick={onCompose}>
            Saisir le texte
          </Button>
        </Group>
        {source === null && (
          <Text size="xs" c="dimmed">Choisissez le CNPN à cloner, ou saisissez les exigences à la main.</Text>
        )}
      </Stack>
    </Card>
  );
}

// ─── The form ────────────────────────────────────────────────────────────────

function CurriculumForm({
  levelId,
  cnpnVersionId,
  cnpnVersionLabel,
  curriculum,
  onDone,
}: {
  levelId: number;
  cnpnVersionId: number;
  cnpnVersionLabel: string;
  curriculum?: CurriculumResponse;
  onDone: () => void;
}) {
  const notify = useNotify();
  const [saveCurriculum, { isLoading: saving }] = useSaveCurriculumMutation();

  // A level has a handful of stages, and the picker needs them all at once — one large page rather
  // than an unbounded fetch, the same shape as the other option queries.
  const { data: stagesPage, isFetching: loadingStages } = useGetStagesQuery({ levelId, pageSize: 200 });
  const levelStages = useMemo(() => stagesPage?.items ?? [], [stagesPage]);

  const [reference, setReference] = useState(curriculum?.reference ?? '');
  const [rows, setRows] = useState<EditorRow[]>(
    () =>
      curriculum?.stages.map((s) => ({
        stageId: s.stageId,
        stageName: s.stageName,
        coefficient: s.coefficient,
        durationInDays: s.durationInDays,
      })) ?? [],
  );
  const [pick, setPick] = useState<string | null>(null);

  const original = curriculum?.stages ?? [];

  const addable = useMemo(
    () =>
      levelStages
        .filter((s) => !rows.some((r) => r.stageId === s.id))
        .map((s) => ({ value: String(s.id), label: s.name })),
    [levelStages, rows],
  );

  // Shown before saving, not after: the faculty's rule is that a student who failed a dropped stage
  // serves it anyway, so whoever removes it should see who it does *not* release.
  const dropped = original.filter((o) => !rows.some((r) => r.stageId === o.stageId));

  const dirty =
    reference !== (curriculum?.reference ?? '') ||
    dropped.length > 0 ||
    rows.length !== original.length ||
    rows.some((r) => {
      const before = original.find((o) => o.stageId === r.stageId);
      return (
        before === undefined ||
        before.coefficient !== r.coefficient ||
        before.durationInDays !== r.durationInDays
      );
    });

  // Mirrors SaveCurriculumCommandValidator — the client guard is the fast path, not the authority.
  const invalidRow = rows.some((r) => r.coefficient < 1 || r.durationInDays < 1);
  const referenceTooLong = reference.length > REFERENCE_MAX;
  const blockedReason = referenceTooLong
    ? `La référence dépasse ${REFERENCE_MAX} caractères.`
    : invalidRow
      ? 'Coefficient ≥ 1 et durée > 0 pour chaque stage.'
      : !dirty
        ? 'Aucune modification à enregistrer.'
        : null;

  const addStage = () => {
    if (pick === null) return;
    const stage = levelStages.find((s) => s.id === Number(pick));
    if (stage === undefined) return;
    setRows((current) => [
      ...current,
      {
        stageId: stage.id,
        stageName: stage.name,
        // The catalogue weights are the sensible starting point; the text may override them.
        coefficient: stage.coefficient,
        durationInDays: stage.durationInDays,
      },
    ]);
    setPick(null);
  };

  const patchRow = (stageId: number, patch: Partial<EditorRow>) =>
    setRows((current) => current.map((r) => (r.stageId === stageId ? { ...r, ...patch } : r)));

  const handleSave = async () => {
    try {
      await saveCurriculum({
        levelId,
        cnpnVersionId,
        reference: reference.trim() || undefined,
        stages: rows.map(({ stageId, coefficient, durationInDays }) => ({
          stageId,
          coefficient,
          durationInDays,
        })),
      }).unwrap();
      notify.success(`CNPN ${cnpnVersionLabel} enregistré`);
      onDone();
    } catch {
      notify.error("Erreur lors de l'enregistrement du CNPN");
    }
  };

  return (
    <Card padding="lg" radius="lg" withBorder shadow="sm">
      <Stack gap="md">
        <Group justify="space-between" wrap="nowrap">
          <Text fw={600} size="sm">
            {curriculum ? 'Modifier' : 'Saisir'} le CNPN — {cnpnVersionLabel}
          </Text>
          <Group gap="xs">
            <Button size="xs" variant="subtle" leftSection={<IconX size={14} />} onClick={onDone}>
              Annuler
            </Button>
            <Tooltip label={blockedReason} disabled={blockedReason === null} withArrow>
              <Button
                size="xs"
                color="navy"
                leftSection={<IconDeviceFloppy size={14} />}
                onClick={handleSave}
                loading={saving}
                disabled={blockedReason !== null}
              >
                Enregistrer
              </Button>
            </Tooltip>
          </Group>
        </Group>

        <TextInput
          label="Référence du texte"
          description="Le CNPN dont ce programme est issu (arrêté, circulaire…)"
          placeholder="CNPN 2023 — Médecine"
          value={reference}
          onChange={(e) => setReference(e.currentTarget.value)}
          error={referenceTooLong ? `${reference.length}/${REFERENCE_MAX} caractères` : null}
          maw={480}
        />

        {dropped.length > 0 && (
          <Alert color="red" variant="light" radius="md" icon={<IconMinus size={16} />}>
            <Text size="sm" fw={600} mb={4}>
              {dropped.length} stage(s) retiré(s) à l'enregistrement
            </Text>
            <Text size="sm">
              {dropped.map((d) => d.stageName).join(', ')} — un étudiant qui ne l'a pas validé le
              repasse malgré tout&nbsp;: la suppression ne libère que les nouveaux inscrits.
            </Text>
          </Alert>
        )}

        <Table striped highlightOnHover verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Stage</Table.Th>
              <Table.Th w={140}>Coefficient</Table.Th>
              <Table.Th w={140}>Durée (j)</Table.Th>
              <Table.Th w={60} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={4}>
                  <Text c="dimmed" size="sm" ta="center" py="md">
                    Aucun stage dans ce texte — ajoutez-en ci-dessous.
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              rows.map((r) => (
                <Table.Tr key={r.stageId}>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <Text size="sm">{r.stageName}</Text>
                      {!original.some((o) => o.stageId === r.stageId) && (
                        <Badge size="xs" variant="light" color="teal" radius="md">nouveau</Badge>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <NumberInput
                      size="xs"
                      min={1}
                      value={r.coefficient}
                      onChange={(v) => patchRow(r.stageId, { coefficient: Number(v) || 0 })}
                      error={r.coefficient < 1}
                    />
                  </Table.Td>
                  <Table.Td>
                    <NumberInput
                      size="xs"
                      min={1}
                      value={r.durationInDays}
                      onChange={(v) => patchRow(r.stageId, { durationInDays: Number(v) || 0 })}
                      error={r.durationInDays < 1}
                    />
                  </Table.Td>
                  <Table.Td>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => setRows((current) => current.filter((c) => c.stageId !== r.stageId))}
                      aria-label={`Retirer ${r.stageName}`}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>

        <Group align="flex-end" gap="sm">
          <Select
            label="Ajouter un stage"
            placeholder={addable.length === 0 ? 'Tous les stages du niveau sont listés' : 'Choisir un stage'}
            data={addable}
            value={pick}
            onChange={setPick}
            searchable
            disabled={addable.length === 0 || loadingStages}
            rightSection={loadingStages ? <Loader size="xs" /> : undefined}
            w={320}
          />
          <Button
            variant="light"
            color="navy"
            leftSection={<IconPlus size={16} />}
            onClick={addStage}
            disabled={pick === null}
          >
            Ajouter
          </Button>
        </Group>
        <Text size="xs" c="dimmed">
          Seuls les stages du niveau sélectionné peuvent figurer dans son CNPN — un stage d'un autre
          niveau ne serait servi par aucun groupe.
        </Text>
      </Stack>
    </Card>
  );
}
