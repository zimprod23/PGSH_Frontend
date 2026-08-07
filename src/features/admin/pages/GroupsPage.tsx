import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Container,
  Divider,
  Group,
  Loader,
  Modal,
  NumberInput,
  ScrollArea,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconLayoutGrid,
  IconPencil,
  IconPlus,
  IconEraser,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconUsersGroup,
  IconWand,
  IconArrowRight,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useAcademicYear } from '../contexts/AcademicYearContext';
import { useNavigate } from 'react-router-dom';
import {
  useGetLevelsQuery,
  useGetStudentsQuery,
  useAutoArrangeGroupsMutation,
  useGetAcademicGroupsQuery,
  useCreateGroupMutation,
  useUpdateGroupMutation,
  useDeleteGroupMutation,
  useGetStagesQuery,
  useAssignRotationGroupsMutation,
  useGenerateMacroPlanMutation,
  useDeleteAllYearGroupsMutation,
  useEmptyGroupMutation,
  useEmptyAllYearGroupsMutation,
} from '../api/adminApi';
import type { BulkResponse } from '../../../common/types';
import type { AcademicGroupResponse, MacroPlanResult } from '../types/admin.types';
import { useNotify } from '../../../common/hooks/useNotify';
import { PATHS } from '../../../routes/paths';
import { ConfirmModal } from '../../../common/components/ConfirmModal';

// ─── Auto-arrange tab ────────────────────────────────────────────────────────

interface FormState {
  academicYearId: string | null;
  levelId: string | null;
  groupSize: number;
}

const EMPTY: FormState = { academicYearId: null, levelId: null, groupSize: 20 };

function AutoArrangeTab() {
  const notify = useNotify();
  const { currentYearId } = useAcademicYear();
  const { data: levels = [] } = useGetLevelsQuery(undefined);
  const [arrange, { isLoading }] = useAutoArrangeGroupsMutation();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [result, setResult] = useState<BulkResponse<string, number> | null>(null);

  const levelOptions = Object.entries(
    levels.reduce<Record<string, { value: string; label: string }[]>>((acc, l) => {
      const item = { value: String(l.id), label: l.label ?? `Année ${l.year}` };
      (acc[l.academicProgram] ??= []).push(item);
      return acc;
    }, {})
  ).map(([group, items]) => ({ group, items }));

  const canSubmit = currentYearId && form.levelId && form.groupSize >= 2;

  const handleArrange = async () => {
    if (!canSubmit) return;
    setResult(null);
    try {
      const res = await arrange({
        academicYearId: currentYearId!,
        levelId: Number(form.levelId),
        groupSize: form.groupSize,
      }).unwrap();
      setResult(res);
      notify.success(`${res.successCount} étudiant(s) réparti(s) en groupes`);
    } catch (err: unknown) {
      const msg = (err as { data?: { detail?: string } })?.data?.detail;
      notify.error(msg ?? 'Erreur lors de la répartition');
    }
  };

  const groupCount = result
    ? new Set(result.items.filter((i) => i.isSuccess).map((i) => i.data)).size
    : null;

  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
      <Card padding="xl" radius="lg" withBorder shadow="sm">
        <Stack gap="md">
          <Group gap="sm">
            <ThemeIcon size={36} radius="md" variant="light" color="navy">
              <IconWand size={20} stroke={1.5} />
            </ThemeIcon>
            <Stack gap={0}>
              <Text fw={600} size="sm">Arrangement automatique</Text>
              <Text size="xs" c="dimmed">Distribue les inscriptions sans groupe assigné</Text>
            </Stack>
          </Group>

          <Divider />

          <Select label="Niveau" placeholder="Sélectionner un niveau"
            data={levelOptions} value={form.levelId}
            onChange={(v) => setForm((p) => ({ ...p, levelId: v }))} searchable required />
          <NumberInput label="Taille de groupe"
            description="Nombre maximum d'étudiants par groupe"
            value={form.groupSize} onChange={(v) => setForm((p) => ({ ...p, groupSize: Number(v) || 20 }))}
            min={2} max={60} required />

          <Alert icon={<IconAlertTriangle size={16} stroke={1.5} />} color="warning" variant="light">
            Seuls les étudiants sans groupe assigné seront répartis.
          </Alert>

          <Button color="navy" loading={isLoading} disabled={!canSubmit}
            leftSection={<IconWand size={16} stroke={1.5} />} onClick={handleArrange}>
            Lancer la répartition
          </Button>
        </Stack>
      </Card>

      {result ? (
        <Card padding="xl" radius="lg" withBorder shadow="sm">
          <Stack gap="md">
            <Group gap="sm">
              <ThemeIcon size={36} radius="md" variant="light" color="success">
                <IconCircleCheck size={20} stroke={1.5} />
              </ThemeIcon>
              <Stack gap={0}>
                <Text fw={600} size="sm">Répartition terminée</Text>
                <Text size="xs" c="dimmed">Résumé de l'opération</Text>
              </Stack>
            </Group>
            <Divider />
            <SimpleGrid cols={2} spacing="md">
              {[
                { label: 'Groupes créés',     value: groupCount,            color: 'navy'    },
                { label: 'Étudiants assignés', value: result.successCount,  color: 'success' },
                { label: 'Total traités',      value: result.totalProcessed, color: 'dimmed'  },
                { label: 'Échecs',             value: result.failureCount,  color: result.failureCount > 0 ? 'danger' : 'dimmed' },
              ].map(({ label, value, color }) => (
                <Card key={label} padding="md" radius="md" withBorder>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={600}>{label}</Text>
                  <Text size="xl" fw={700} c={color === 'dimmed' ? 'dimmed' : color}>{value}</Text>
                </Card>
              ))}
            </SimpleGrid>
            {result.failureCount > 0 && (
              <Alert color="danger" variant="light">{result.failureCount} étudiant(s) non assigné(s).</Alert>
            )}
          </Stack>
        </Card>
      ) : (
        <Card padding="xl" radius="lg" withBorder shadow="sm"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 260 }}>
          <Stack align="center" gap="sm">
            <IconUsersGroup size={48} stroke={1} color="#CBD5E1" />
            <Text c="dimmed" size="sm" ta="center">
              Configurez les paramètres et lancez la répartition.
            </Text>
          </Stack>
        </Card>
      )}
    </SimpleGrid>
  );
}

// ─── Macro plan tab ──────────────────────────────────────────────────────────

function MacroPlanTab({ selectedYear }: { selectedYear: string | null }) {
  const notify = useNotify();

  const [selectedLevel,   setSelectedLevel]   = useState<string | null>(null);
  const [partitionCount,  setPartitionCount]  = useState<number | string>(2);
  // partition → (stageId → raw period window string, e.g. "1,2"; empty = all periods)
  const [selection,       setSelection]       = useState<Map<string, Map<number, string>>>(new Map());
  const [assignStudents,  setAssignStudents]   = useState(true);
  const [autoArrange,     setAutoArrange]      = useState(true);
  const [publish,         setPublish]          = useState(false);
  const [result,          setResult]          = useState<MacroPlanResult | null>(null);

  // The year is driven by the navbar; reset the in-progress plan whenever it changes.
  useEffect(() => { setSelection(new Map()); setResult(null); setSelectedLevel(null); }, [selectedYear]);

  const { data: levels = [] } = useGetLevelsQuery(undefined);

  // Partitions are per (year, level): scope the groups to the selected level so each
  // level keeps its own partition count (e.g. 2 in 1Med, 4 in 2Med).
  const { data: groups = [], isLoading: loadingGroups } = useGetAcademicGroupsQuery(
    { academicYearId: Number(selectedYear), levelId: selectedLevel ? Number(selectedLevel) : undefined },
    { skip: !selectedYear || !selectedLevel },
  );

  const { data: stagesPage, isLoading: loadingStages } = useGetStagesQuery(
    { levelId: Number(selectedLevel), pageSize: 100 },
    { skip: !selectedLevel },
  );

  const [assignPartitions, { isLoading: assigning }] = useAssignRotationGroupsMutation();
  const [generatePlan,     { isLoading: generating }] = useGenerateMacroPlanMutation();

  const partitions = Array.from(
    new Set(groups.map((g) => g.rotationGroup).filter((r): r is string => r != null))
  ).sort();

  const stages = stagesPage?.items ?? [];

  const groupCountByPartition = (partition: string) =>
    groups.filter((g) => g.rotationGroup === partition).length;

  const isChecked = (partition: string, stageId: number) =>
    selection.get(partition)?.has(stageId) ?? false;

  const periodsValue = (partition: string, stageId: number) =>
    selection.get(partition)?.get(stageId) ?? '';

  const toggle = (partition: string, stageId: number) => {
    setSelection((prev) => {
      const next = new Map(prev);
      const inner = new Map(next.get(partition) ?? []);
      if (inner.has(stageId)) inner.delete(stageId); else inner.set(stageId, '');
      if (inner.size > 0) next.set(partition, inner); else next.delete(partition);
      return next;
    });
  };

  const setPeriods = (partition: string, stageId: number, value: string) => {
    setSelection((prev) => {
      const next = new Map(prev);
      const inner = new Map(next.get(partition) ?? []);
      inner.set(stageId, value);
      next.set(partition, inner);
      return next;
    });
  };

  const selectAll = (stageId: number) => {
    setSelection((prev) => {
      const next = new Map(prev);
      for (const p of partitions) {
        const inner = new Map(next.get(p) ?? []);
        if (!inner.has(stageId)) inner.set(stageId, '');
        next.set(p, inner);
      }
      return next;
    });
  };

  const totalSelected = Array.from(selection.values()).reduce((sum, inner) => sum + inner.size, 0);

  const parsePeriods = (raw: string): number[] =>
    raw.split(',').map((p) => Number(p.trim())).filter((n) => Number.isInteger(n) && n > 0);

  const handleAssignPartitions = async () => {
    if (!selectedYear || !selectedLevel) return;
    try {
      const res = await assignPartitions({
        academicYearId: Number(selectedYear),
        partitionCount: Number(partitionCount) || 2,
        levelId: Number(selectedLevel),
      }).unwrap();
      notify.success(`${res.labeled} groupe(s) labelisé(s)`);
    } catch (err: unknown) {
      const msg = (err as { data?: { detail?: string } })?.data?.detail;
      notify.error(msg ?? 'Erreur lors de l\'assignation des partitions');
    }
  };

  const handleGenerate = async () => {
    const plans = Array.from(selection.entries()).flatMap(([rotationGroup, inner]) =>
      Array.from(inner.entries()).map(([stageId, raw]) => ({
        rotationGroup,
        stageId,
        periodNumbers: parsePeriods(raw),
      })),
    );
    if (plans.length === 0 || !selectedYear) return;
    try {
      const res = await generatePlan({
        academicYearId: Number(selectedYear),
        plans,
        assignStudents,
        autoArrange,
        publish,
      }).unwrap();
      setResult(res);
      notify.success(`Plan généré : ${res.cohortsCreated} cohorte(s), ${res.cellsArranged} affectation(s)`);
    } catch (err: unknown) {
      const msg = (err as { data?: { detail?: string } })?.data?.detail;
      notify.error(msg ?? 'Erreur lors de la génération du plan');
    }
  };

  const levelOptions = Object.entries(
    levels.reduce<Record<string, { value: string; label: string }[]>>((acc, l) => {
      const item = { value: String(l.id), label: l.label ?? `Année ${l.year}` };
      (acc[l.academicProgram] ??= []).push(item);
      return acc;
    }, {})
  ).map(([group, items]) => ({ group, items }));

  const showSetup = selectedYear && selectedLevel && !loadingGroups && partitions.length === 0;

  return (
    <Stack gap="lg">
      {/* ── Filters (year comes from the navbar) ── */}
      <Group align="flex-end" gap="md">
        <Select label="Niveau" placeholder="Sélectionner" data={levelOptions}
          description="Les partitions sont propres à chaque niveau"
          value={selectedLevel}
          onChange={(v) => { setSelectedLevel(v); setSelection(new Map()); setResult(null); }}
          searchable clearable disabled={!selectedYear} w={280} />
      </Group>

      {/* ── Prompt: a level is required (partitions are per level) ── */}
      {selectedYear && !selectedLevel && (
        <Alert icon={<IconAlertTriangle size={16} />} color="blue" variant="light">
          Sélectionnez un niveau pour gérer ses partitions — chaque niveau a ses propres partitions et stages.
        </Alert>
      )}

      {/* ── Step 1: assign partition labels if none exist ── */}
      {showSetup && (
        <Card padding="xl" radius="lg" withBorder shadow="sm">
          <Stack gap="md">
            <Group gap="sm">
              <ThemeIcon size={36} radius="md" variant="light" color="violet">
                <IconLayoutGrid size={20} stroke={1.5} />
              </ThemeIcon>
              <Stack gap={0}>
                <Text fw={600} size="sm">Étape 1 — Assigner les partitions</Text>
                <Text size="xs" c="dimmed">
                  Aucun groupe de ce niveau n'a encore de label de partition.
                  Définissez le nombre de partitions et assignez-les.
                </Text>
              </Stack>
            </Group>

            <Divider />

            <Group align="flex-end" gap="md">
              <NumberInput
                label="Nombre de partitions"
                description="Ex: 2 → groupes A et B"
                value={partitionCount}
                onChange={setPartitionCount}
                min={1} max={26} w={200}
              />
              <Button
                color="violet"
                loading={assigning}
                disabled={!partitionCount || Number(partitionCount) < 1}
                leftSection={<IconWand size={16} stroke={1.5} />}
                onClick={handleAssignPartitions}
              >
                Assigner les partitions
              </Button>
            </Group>

            <Alert icon={<IconAlertTriangle size={14} />} color="blue" variant="light">
              Les groupes de ce niveau sont distribués équitablement entre les partitions par ordre de numéro.
              Ces labels (A, B, C…) sont persistants et réutilisés dans tous les stages de ce niveau.
            </Alert>
          </Stack>
        </Card>
      )}

      {/* ── Hint: level has no stages ── */}
      {selectedLevel && partitions.length > 0 && stages.length === 0 && !loadingStages && (
        <Alert icon={<IconAlertTriangle size={16} />} color="blue" variant="light">
          Ce niveau n'a aucun stage défini. Créez ses stages avant de générer le plan.
        </Alert>
      )}

      {/* ── Step 2: partition × stage matrix ── */}
      {partitions.length > 0 && stages.length > 0 && (
        <Card padding="lg" radius="lg" withBorder shadow="sm">
          <Stack gap="md">
            <Group justify="space-between">
              <Stack gap={2}>
                <Text fw={600} size="sm">Matrice Partition × Stage</Text>
                <Text size="xs" c="dimmed">
                  Cochez (partition × stage) et indiquez la fenêtre de périodes (ex&nbsp;: «&nbsp;1,2&nbsp;», vide = toutes).
                  Les numéros renvoient aux créneaux <strong>déjà définis</strong> dans la grille de planning (ils ne sont pas créés ici).
                </Text>
              </Stack>
              {totalSelected > 0 && (
                <Badge color="violet" variant="light">{totalSelected} combinaison(s)</Badge>
              )}
            </Group>

            <ScrollArea>
              <Table withTableBorder withColumnBorders fz="sm" style={{ minWidth: 300 + stages.length * 160 }}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ minWidth: 160, background: '#f8fafc' }}>
                      <Text size="xs" fw={700} c="dimmed" tt="uppercase">Partition</Text>
                    </Table.Th>
                    {stages.map((s) => (
                      <Table.Th key={s.id} style={{ textAlign: 'center', background: '#f8fafc', minWidth: 160 }}>
                        <Stack gap={2} align="center">
                          <Text size="xs" fw={600}>{s.name}</Text>
                          <Button size="compact-xs" variant="subtle" color="violet"
                            onClick={() => selectAll(s.id)}>
                            Tout cocher
                          </Button>
                        </Stack>
                      </Table.Th>
                    ))}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {partitions.map((partition) => (
                    <Table.Tr key={partition}>
                      <Table.Td>
                        <Group gap="xs">
                          <Badge variant="dot" color="violet" size="md" radius="md">{partition}</Badge>
                          <Text size="xs" c="dimmed">{groupCountByPartition(partition)} groupe(s)</Text>
                        </Group>
                      </Table.Td>
                      {stages.map((s) => (
                        <Table.Td key={s.id} style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                          <Stack gap={4} align="center">
                            <Checkbox
                              checked={isChecked(partition, s.id)}
                              onChange={() => toggle(partition, s.id)}
                              color="violet"
                            />
                            {isChecked(partition, s.id) && (
                              <TextInput
                                size="xs"
                                w={110}
                                placeholder="Périodes (ex: 1,2)"
                                value={periodsValue(partition, s.id)}
                                onChange={(e) => setPeriods(partition, s.id, e.currentTarget.value)}
                              />
                            )}
                          </Stack>
                        </Table.Td>
                      ))}
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>

            <Divider />

            <Group gap="lg" wrap="wrap">
              <Text size="xs" fw={600} c="dimmed">Étapes à exécuter :</Text>
              <Checkbox label="Créer les cohortes" checked readOnly color="violet" size="sm" />
              <Checkbox label="Affecter les étudiants" checked={assignStudents}
                onChange={(e) => setAssignStudents(e.currentTarget.checked)} color="violet" size="sm" />
              <Checkbox label="Répartition auto. (services)" checked={autoArrange}
                onChange={(e) => setAutoArrange(e.currentTarget.checked)} color="violet" size="sm" />
              <Checkbox label="Publier" checked={publish}
                onChange={(e) => setPublish(e.currentTarget.checked)} color="violet" size="sm" />
            </Group>

            <Group justify="space-between" align="center">
              {result && (
                <Group gap="xs" wrap="wrap">
                  <Badge color="teal" variant="light" leftSection={<IconCircleCheck size={12} />}>
                    {result.cohortsCreated} cohorte(s)
                  </Badge>
                  {result.cohortsSkipped > 0 && (
                    <Badge color="gray" variant="light">{result.cohortsSkipped} ignorée(s)</Badge>
                  )}
                  {result.studentsAssigned > 0 && (
                    <Badge color="blue" variant="light">{result.studentsAssigned} étudiant(s) affecté(s)</Badge>
                  )}
                  {result.cellsArranged > 0 && (
                    <Badge color="violet" variant="light">{result.cellsArranged} affectation(s)</Badge>
                  )}
                  {result.saturatedServices > 0 && (
                    <Badge color="red" variant="light">{result.saturatedServices} service(s) saturé(s)</Badge>
                  )}
                  {result.cohortsPublished > 0 && (
                    <Badge color="teal" variant="filled">{result.cohortsPublished} publiée(s)</Badge>
                  )}
                </Group>
              )}
              <Button
                ml="auto"
                color="violet"
                loading={generating}
                disabled={totalSelected === 0}
                leftSection={<IconLayoutGrid size={16} stroke={1.5} />}
                onClick={handleGenerate}
              >
                Générer le plan
              </Button>
            </Group>
          </Stack>
        </Card>
      )}
    </Stack>
  );
}

// ─── Edit group modal ─────────────────────────────────────────────────────────

function EditGroupModal({ group, opened, onClose }: {
  group: AcademicGroupResponse | null;
  opened: boolean;
  onClose: () => void;
}) {
  const notify = useNotify();
  const [label, setLabel]               = useState(group?.label ?? '');
  const [rotationGroup, setRotationGroup] = useState(group?.rotationGroup ?? '');
  const [updateGroup, { isLoading }]    = useUpdateGroupMutation();

  const handleSave = async () => {
    if (!group || !label.trim()) return;
    try {
      await updateGroup({
        id: group.id,
        label: label.trim(),
        rotationGroup: rotationGroup.trim() || null,
      }).unwrap();
      notify.success('Groupe mis à jour');
      onClose();
    } catch {
      notify.error('Impossible de mettre à jour le groupe');
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Modifier le groupe" radius="lg" size="sm">
      <Stack gap="md">
        <TextInput
          label="Libellé" value={label} onChange={(e) => setLabel(e.currentTarget.value)} required
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
        />
        <TextInput
          label="Groupe de rotation"
          description="Étiquette de partition (A, B, C…) partagée entre tous les stages"
          placeholder="Ex: A"
          value={rotationGroup}
          onChange={(e) => setRotationGroup(e.currentTarget.value)}
        />
        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={onClose}>Annuler</Button>
          <Button color="navy" loading={isLoading} disabled={!label.trim()} onClick={handleSave}>
            Enregistrer
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// ─── Create group modal ───────────────────────────────────────────────────────

function CreateGroupModal({ opened, onClose, selectedYear }: {
  opened: boolean;
  onClose: () => void;
  selectedYear: string | null;
}) {
  const notify = useNotify();
  const [label, setLabel]               = useState('');
  const [rotationGroup, setRotationGroup] = useState('');
  const [levelId, setLevelId]           = useState<string | null>(null);
  const [createGroup, { isLoading }]    = useCreateGroupMutation();
  const { data: levels = [] }           = useGetLevelsQuery(undefined);

  const levelOptions = Object.entries(
    levels.reduce<Record<string, { value: string; label: string }[]>>((acc, l) => {
      const item = { value: String(l.id), label: l.label ?? `Année ${l.year}` };
      (acc[l.academicProgram] ??= []).push(item);
      return acc;
    }, {})
  ).map(([group, items]) => ({ group, items }));

  const handleCreate = async () => {
    if (!selectedYear || !label.trim()) return;
    try {
      await createGroup({
        label: label.trim(),
        academicYearId: Number(selectedYear),
        levelId: levelId ? Number(levelId) : null,
        rotationGroup: rotationGroup.trim() || null,
      }).unwrap();
      notify.success(`Groupe "${label.trim()}" créé`);
      setLabel('');
      setRotationGroup('');
      setLevelId(null);
      onClose();
    } catch {
      notify.error('Impossible de créer ce groupe');
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Créer un groupe" radius="lg" size="sm">
      <Stack gap="md">
        <Select
          label="Niveau"
          description="Associe ce groupe à un niveau pour le retrouver dans les filtres"
          placeholder="Sélectionner un niveau (optionnel)"
          data={levelOptions}
          value={levelId}
          onChange={setLevelId}
          searchable
          clearable
        />
        <TextInput
          label="Libellé"
          placeholder="Ex: G01 - Rabat Nord"
          value={label}
          onChange={(e) => setLabel(e.currentTarget.value)}
          required
          onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
        />
        <TextInput
          label="Groupe de rotation (optionnel)"
          description="Étiquette de partition (A, B, C…)"
          placeholder="Ex: A"
          value={rotationGroup}
          onChange={(e) => setRotationGroup(e.currentTarget.value)}
        />
        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={onClose}>Annuler</Button>
          <Button color="navy" loading={isLoading} disabled={!selectedYear || !label.trim()} onClick={handleCreate}>
            Créer
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// ─── Groups list tab ──────────────────────────────────────────────────────────

function GroupsListTab({ selectedYear, selectedLevel, onLevelChange }: {
  selectedYear: string | null;
  selectedLevel: string | null;
  onLevelChange: (v: string | null) => void;
}) {
  const notify   = useNotify();
  const navigate = useNavigate();
  const { currentYear } = useAcademicYear();

  const [editTarget, setEditTarget]       = useState<AcademicGroupResponse | null>(null);
  const [editOpen, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  const [createOpen, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [deleteTarget, setDeleteTarget]   = useState<AcademicGroupResponse | null>(null);
  const [deleteOpen, { open: openDelete, close: closeDelete }] = useDisclosure(false);
  const [deleteAllOpen, { open: openDeleteAll, close: closeDeleteAll }] = useDisclosure(false);
  const [emptyTarget, setEmptyTarget]     = useState<AcademicGroupResponse | null>(null);
  const [emptyOpen, { open: openEmpty, close: closeEmpty }] = useDisclosure(false);
  const [emptyAllOpen, { open: openEmptyAll, close: closeEmptyAll }] = useDisclosure(false);

  // Student search state. The picked student is tracked explicitly: a name like "Alaoui" matches
  // several students, and silently resolving to the first hit showed an arbitrary one's groups.
  const [studentSearch, setStudentSearch] = useState('');
  const [debouncedStudentSearch] = useDebouncedValue(studentSearch, 350);
  const [pickedStudentId, setPickedStudentId] = useState<string | null>(null);

  const { data: levels = [] } = useGetLevelsQuery(undefined);

  const { data: groups = [], isLoading: loadingGroups } = useGetAcademicGroupsQuery(
    {
      academicYearId: selectedYear  ? Number(selectedYear)  : undefined,
      levelId:        selectedLevel ? Number(selectedLevel) : undefined,
    },
    { skip: !selectedYear }
  );

  const { data: studentMatches, isFetching: searchingStudents } = useGetStudentsQuery(
    { searchTerm: debouncedStudentSearch, pageSize: 10 },
    { skip: debouncedStudentSearch.length < 2 }
  );

  const matches = studentMatches?.items ?? [];

  // A single hit needs no disambiguation; anything else waits for the user to choose. Reset on every
  // new term so a stale pick from the previous search can't linger.
  useEffect(() => {
    setPickedStudentId(matches.length === 1 ? matches[0].id : null);
  }, [debouncedStudentSearch, matches.length, matches]);

  const { data: studentGroups = [], isFetching: loadingStudentGroups } = useGetAcademicGroupsQuery(
    { academicYearId: selectedYear ? Number(selectedYear) : undefined, studentId: pickedStudentId ?? undefined },
    { skip: !pickedStudentId || !selectedYear }
  );

  const [deleteGroup, { isLoading: deleting }] = useDeleteGroupMutation();
  const [deleteAllGroups, { isLoading: deletingAllGroups }] = useDeleteAllYearGroupsMutation();
  const [emptyGroup, { isLoading: emptying }] = useEmptyGroupMutation();
  const [emptyAllGroups, { isLoading: emptyingAll }] = useEmptyAllYearGroupsMutation();

  const levelOptions = Object.entries(
    levels.reduce<Record<string, { value: string; label: string }[]>>((acc, l) => {
      const item = { value: String(l.id), label: l.label ?? `Année ${l.year}` };
      (acc[l.academicProgram] ??= []).push(item);
      return acc;
    }, {})
  ).map(([group, items]) => ({ group, items }));

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteGroup(deleteTarget.id).unwrap();
      notify.success('Groupe supprimé');
    } catch {
      notify.error('Impossible de supprimer ce groupe (des cohortes y sont peut-être associées)');
    }
    closeDelete();
    setDeleteTarget(null);
  };

  const handleDeleteAllConfirm = async () => {
    if (!selectedYear) return;
    try {
      const res = await deleteAllGroups(Number(selectedYear)).unwrap();
      notify.success(`${res.deleted} groupe${res.deleted !== 1 ? 's' : ''} supprimé${res.deleted !== 1 ? 's' : ''}`);
    } catch {
      notify.error('Impossible de supprimer les groupes — des étudiants sont affectés ou des affectations ont démarré');
    }
    closeDeleteAll();
  };

  const handleEmptyConfirm = async () => {
    if (!emptyTarget) return;
    try {
      const res = await emptyGroup(emptyTarget.id).unwrap();
      notify.success(`${res.unassigned} étudiant${res.unassigned !== 1 ? 's' : ''} retiré${res.unassigned !== 1 ? 's' : ''} du groupe`);
    } catch {
      notify.error('Impossible de vider ce groupe');
    }
    closeEmpty();
    setEmptyTarget(null);
  };

  const handleEmptyAllConfirm = async () => {
    if (!selectedYear) return;
    try {
      const res = await emptyAllGroups(Number(selectedYear)).unwrap();
      notify.success(`${res.unassigned} étudiant${res.unassigned !== 1 ? 's' : ''} retiré${res.unassigned !== 1 ? 's' : ''} de leurs groupes`);
    } catch {
      notify.error('Impossible de vider les groupes');
    }
    closeEmptyAll();
  };

  const yearLabel = currentYear?.label ?? selectedYear ?? '';
  const pickedStudent = matches.find((s) => s.id === pickedStudentId);
  const searchReady = debouncedStudentSearch.length >= 2 && !searchingStudents;
  const highlightedGroupIds = new Set(studentGroups.map((g) => g.id));

  return (
    <Stack gap="md">
      <Group align="flex-end" gap="md" wrap="wrap">
        <Select
          label="Niveau"
          placeholder="Tous les niveaux"
          data={levelOptions}
          value={selectedLevel}
          onChange={onLevelChange}
          disabled={!selectedYear}
          searchable
          clearable
          w={240}
        />
        <Button
          size="sm" color="navy" variant="light" radius="md"
          leftSection={<IconPlus size={14} stroke={1.5} />}
          onClick={openCreate}
        >
          Créer un groupe
        </Button>
        {selectedYear && groups.length > 0 && (
          <Tooltip
            label="Retire tous les étudiants de leurs groupes (les groupes et leurs cohortes restent)."
            position="top"
            multiline
            w={280}
          >
            <Button
              size="sm" color="orange" variant="subtle" radius="md"
              leftSection={<IconEraser size={14} stroke={1.5} />}
              loading={emptyingAll}
              onClick={openEmptyAll}
            >
              Vider toutes
            </Button>
          </Tooltip>
        )}
        {selectedYear && groups.length > 0 && (
          <Tooltip
            label="Supprime tous les groupes et leurs cohortes. Bloqué si des étudiants sont affectés ou si des affectations ont démarré."
            position="top"
            multiline
            w={280}
          >
            <Button
              size="sm" color="red" variant="subtle" radius="md"
              leftSection={<IconRefresh size={14} stroke={1.5} />}
              loading={deletingAllGroups}
              onClick={openDeleteAll}
            >
              Tout supprimer
            </Button>
          </Tooltip>
        )}
      </Group>

      {/* Student group search */}
      {selectedYear && (
        <Card padding="md" radius="lg" withBorder shadow="xs">
          <Stack gap="sm">
            <Group gap="sm">
              <IconSearch size={16} stroke={1.5} color="#0F4C81" />
              <Text fw={600} size="sm">Trouver le groupe d'un étudiant</Text>
            </Group>
            <TextInput
              placeholder="Nom, CNE ou Apogée de l'étudiant (min. 2 car.)…"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.currentTarget.value)}
              leftSection={<IconSearch size={14} stroke={1.5} />}
              rightSection={searchingStudents ? <Loader size={14} /> : null}
              w={{ base: '100%', sm: 360 }}
            />

            {studentSearch.length > 0 && studentSearch.length < 2 && (
              <Text size="xs" c="dimmed">Tapez au moins 2 caractères…</Text>
            )}

            {searchingStudents && (
              <Stack gap={6}>
                {[1, 2].map((i) => <Skeleton key={i} height={30} radius="sm" />)}
              </Stack>
            )}

            {searchReady && matches.length === 0 && (
              <Text size="xs" c="dimmed">Aucun étudiant trouvé.</Text>
            )}

            {/* Every match is listed — picking one is the user's call, never the first hit's. */}
            {searchReady && matches.length > 1 && (
              <Stack gap={4}>
                <Text size="xs" c="dimmed">
                  {matches.length} étudiants correspondent — choisissez&nbsp;:
                </Text>
                <Group gap={6} wrap="wrap">
                  {matches.map((s) => (
                    <Button
                      key={s.id}
                      size="xs"
                      radius="sm"
                      variant={s.id === pickedStudentId ? 'filled' : 'default'}
                      color="navy"
                      onClick={() => setPickedStudentId(s.id)}
                    >
                      {s.firstName} {s.lastName}
                      <Text component="span" size="xs" c="dimmed" ml={6} ff="monospace">
                        {s.cne}
                      </Text>
                    </Button>
                  ))}
                </Group>
              </Stack>
            )}

            {loadingStudentGroups && <Skeleton height={44} radius="sm" />}

            {pickedStudent && !loadingStudentGroups && studentGroups.length > 0 && (
              <Alert color="teal" variant="light" icon={<IconCircleCheck size={14} />}>
                <Text size="sm" fw={500}>
                  {pickedStudent.firstName} {pickedStudent.lastName} —{' '}
                  {studentGroups.map((g) => (
                    <Button
                      key={g.id}
                      size="xs" variant="subtle" color="navy" px={4}
                      onClick={() => navigate(`${PATHS.ADMIN.ROOT}/groups/${g.id}`)}
                    >
                      {g.label}
                    </Button>
                  ))}
                </Text>
              </Alert>
            )}

            {pickedStudent && !loadingStudentGroups && studentGroups.length === 0 && (
              <Text size="xs" c="dimmed">
                {pickedStudent.firstName} {pickedStudent.lastName} — aucun groupe pour cette année.
              </Text>
            )}
          </Stack>
        </Card>
      )}

      {selectedYear && (
        <Card padding="lg" radius="lg" withBorder shadow="sm" style={{ overflowX: 'auto' }}>
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>N°</Table.Th>
                <Table.Th>Libellé</Table.Th>
                <Table.Th>Niveau</Table.Th>
                <Table.Th>Rotation</Table.Th>
                <Table.Th>Année</Table.Th>
                <Table.Th w={120} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {loadingGroups ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Table.Tr key={i}>
                    {[40, 200, 100, 60, 100, 100].map((w, j) => (
                      <Table.Td key={j}><Skeleton height={14} width={w} radius="sm" /></Table.Td>
                    ))}
                  </Table.Tr>
                ))
              ) : groups.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Text c="dimmed" size="sm" ta="center" py="md">
                      {selectedLevel
                        ? 'Aucun groupe ne correspond à ce niveau pour l\'année sélectionnée.'
                        : 'Aucun groupe pour cette année. Lancez d\'abord la répartition automatique ou créez un groupe manuellement.'}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                groups.map((g) => (
                  <Table.Tr key={g.id} style={highlightedGroupIds.has(g.id) ? { background: '#f0fdf4' } : undefined}>
                    <Table.Td>
                      <Badge variant="light" color="navy" size="sm" radius="md">{g.groupNumber}</Badge>
                    </Table.Td>
                    <Table.Td><Text size="sm" fw={500}>{g.label}</Text></Table.Td>
                    <Table.Td>
                      {g.levelLabel
                        ? <Text size="xs" c="dimmed">{g.levelLabel}</Text>
                        : <Text size="xs" c="dimmed">—</Text>}
                    </Table.Td>
                    <Table.Td>
                      {g.rotationGroup
                        ? <Badge variant="dot" color="violet" size="sm" radius="md">{g.rotationGroup}</Badge>
                        : <Text size="xs" c="dimmed">—</Text>}
                    </Table.Td>
                    <Table.Td><Text size="xs" c="dimmed">{g.academicYearLabel}</Text></Table.Td>
                    <Table.Td>
                      <Group gap={4} wrap="nowrap" justify="flex-end">
                        <Tooltip label="Gérer les étudiants" position="top">
                          <ActionIcon variant="subtle" color="navy" size="sm"
                            onClick={() => navigate(`${PATHS.ADMIN.ROOT}/groups/${g.id}`)}>
                            <IconArrowRight size={14} stroke={1.5} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Modifier" position="top">
                          <ActionIcon variant="subtle" color="gray" size="sm"
                            onClick={() => { setEditTarget(g); openEdit(); }}>
                            <IconPencil size={14} stroke={1.5} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Vider le groupe (retirer les étudiants)" position="top">
                          <ActionIcon variant="subtle" color="orange" size="sm"
                            onClick={() => { setEmptyTarget(g); openEmpty(); }}>
                            <IconEraser size={14} stroke={1.5} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Supprimer" position="top">
                          <ActionIcon variant="subtle" color="red" size="sm"
                            onClick={() => { setDeleteTarget(g); openDelete(); }}>
                            <IconTrash size={14} stroke={1.5} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </Card>
      )}

      <EditGroupModal group={editTarget} opened={editOpen} onClose={() => { closeEdit(); setEditTarget(null); }} />
      <CreateGroupModal opened={createOpen} onClose={closeCreate} selectedYear={selectedYear} />

      <ConfirmModal
        opened={deleteOpen}
        onClose={() => { closeDelete(); setDeleteTarget(null); }}
        title="Supprimer le groupe"
        message={`Supprimer le groupe "${deleteTarget?.label}" ?`}
        confirmLabel="Supprimer"
        confirmColor="red"
        onConfirm={handleDeleteConfirm}
        loading={deleting}
      />
      <ConfirmModal
        opened={deleteAllOpen}
        onClose={closeDeleteAll}
        title="Supprimer tous les groupes"
        message={`Supprimer tous les groupes de l'année "${yearLabel}" (${groups.length} groupe${groups.length !== 1 ? 's' : ''}) ? Cette action supprime également toutes les cohortes associées. Elle est bloquée si des étudiants sont affectés aux groupes ou si des affectations ont déjà démarré.`}
        confirmLabel="Tout supprimer"
        confirmColor="red"
        onConfirm={handleDeleteAllConfirm}
        loading={deletingAllGroups}
      />
      <ConfirmModal
        opened={emptyOpen}
        onClose={() => { closeEmpty(); setEmptyTarget(null); }}
        title="Vider le groupe"
        message={`Retirer tous les étudiants du groupe "${emptyTarget?.label}" ? Le groupe est conservé.`}
        confirmLabel="Vider"
        confirmColor="orange"
        onConfirm={handleEmptyConfirm}
        loading={emptying}
      />
      <ConfirmModal
        opened={emptyAllOpen}
        onClose={closeEmptyAll}
        title="Vider tous les groupes"
        message={`Retirer tous les étudiants de leurs groupes pour l'année "${yearLabel}" ? Les groupes et leurs cohortes sont conservés.`}
        confirmLabel="Vider toutes"
        confirmColor="orange"
        onConfirm={handleEmptyAllConfirm}
        loading={emptyingAll}
      />
    </Stack>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GroupsPage() {
  // The academic year comes from the single global navbar selector — no per-tab year dropdown.
  const { currentYearId } = useAcademicYear();
  const selectedYear = currentYearId ? String(currentYearId) : null;
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  return (
    <Container fluid>
      <Stack gap="xl">
        <Stack gap={4}>
          <Title order={2} fw={700}>Gestion des groupes</Title>
          <Text size="sm" c="dimmed">
            Répartissez les étudiants en groupes et gérez leur composition.
          </Text>
        </Stack>

        <Tabs defaultValue="list">
          <Tabs.List mb="lg">
            <Tabs.Tab value="list" leftSection={<IconUsersGroup size={16} stroke={1.5} />}>
              Groupes
            </Tabs.Tab>
            <Tabs.Tab value="arrange" leftSection={<IconWand size={16} stroke={1.5} />}>
              Répartition automatique
            </Tabs.Tab>
            <Tabs.Tab value="macro" leftSection={<IconLayoutGrid size={16} stroke={1.5} />}>
              Planification Macro
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="list">
            <GroupsListTab
              selectedYear={selectedYear}
              selectedLevel={selectedLevel}
              onLevelChange={setSelectedLevel}
            />
          </Tabs.Panel>
          <Tabs.Panel value="arrange"><AutoArrangeTab /></Tabs.Panel>
          <Tabs.Panel value="macro">
            <MacroPlanTab selectedYear={selectedYear} />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}
