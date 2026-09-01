import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Checkbox,
  Container,
  Divider,
  Drawer,
  Group,
  NumberInput,
  Pagination,
  Radio,
  ScrollArea,
  Select,
  Skeleton,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
  rem,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconPencil,
  IconPlus,
  IconStethoscope,
  IconTrash,
  IconUsersGroup,
} from '@tabler/icons-react';
import { useState, useMemo, useEffect } from 'react';
import { StageCatalogueFigure } from '../components/StageCatalogueFigure';
import { useListParams } from '../../../common/hooks/useListParams';
import { useNavigate } from 'react-router-dom';
import {
  useGetStagesQuery,
  useGetStageByIdQuery,
  useGetPromotionLevelsQuery,
  useCreateStageMutation,
  useUpdateStageMutation,
  useDeleteStageMutation,
} from '../api/adminApi';
import type {
  StageSummaryResponse,
  StageObjectiveRequest,
  StageRotationMode,
} from '../types/admin.types';
import { useNotify } from '../../../common/hooks/useNotify';
import { PATHS } from '../../../routes/paths';
import { ConfirmModal } from '../../../common/components/ConfirmModal';

interface ObjectiveRow extends StageObjectiveRequest {
  _key: string;
}

interface StageForm {
  name: string;
  levelId: string | null;
  durationInDays: number;
  coefficient: number;
  description: string;
  objectives: ObjectiveRow[];
  rotationMode: StageRotationMode;
}

const EMPTY_FORM: StageForm = {
  name: '', levelId: null, durationInDays: 30, coefficient: 1, description: '', objectives: [],
  rotationMode: 'PerPeriod',
};

/** Module-level so its identity is stable — useListParams memoises on it. */
const STAGE_FILTERS = { level: null as string | null };

const newObjective = (): ObjectiveRow => ({
  _key: crypto.randomUUID(), label: '', description: '', weight: 10, isMandatory: false,
});

function StageFormDrawer({
  opened, onClose, initial, editId, onSaved,
}: {
  opened: boolean;
  onClose: () => void;
  initial: StageForm;
  editId: number | null;
  onSaved: () => void;
}) {
  const notify = useNotify();
  const { data: levels = [] } = useGetPromotionLevelsQuery(undefined);
  const [createStage, { isLoading: creating }] = useCreateStageMutation();
  const [updateStage, { isLoading: updating }] = useUpdateStageMutation();

  const [form, setForm] = useState<StageForm>(initial);

  useEffect(() => {
    setForm(initial);
  }, [initial]);

  const set = <K extends keyof StageForm>(k: K, v: StageForm[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const levelOptions = Object.entries(
    levels.reduce<Record<string, { value: string; label: string }[]>>((acc, l) => {
      const item = { value: String(l.id), label: l.label ?? `Année ${l.year}` };
      (acc[l.academicProgram] ??= []).push(item);
      return acc;
    }, {})
  ).map(([group, items]) => ({ group, items }));

  const addObjective = () => set('objectives', [...form.objectives, newObjective()]);

  const updateObjective = (key: string, field: keyof ObjectiveRow, value: unknown) =>
    set('objectives', form.objectives.map((o) => o._key === key ? { ...o, [field]: value } : o));

  const removeObjective = (key: string) =>
    set('objectives', form.objectives.filter((o) => o._key !== key));

  const isValid = form.name.trim() && form.levelId;

  const handleSave = async () => {
    if (!isValid) return;
    const payload = {
      name: form.name.trim(),
      coefficient: form.coefficient,
      description: form.description.trim() || undefined,
      durationInDays: form.durationInDays,
      levelId: Number(form.levelId),
      rotationMode: form.rotationMode,
      objectives: form.objectives
        .filter((o) => o.label.trim())
        .map(({ _key: _k, ...o }) => ({ ...o, description: o.description || undefined })),
    };
    try {
      if (editId !== null) {
        await updateStage({ id: editId, ...payload }).unwrap();
        notify.success('Stage mis à jour');
      } else {
        await createStage(payload).unwrap();
        notify.success('Stage créé');
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      // ⚠ A bare `catch` here hid the reason. Every stage in the base carries zero objectives, the
      // validator demanded one, and the save was refused with a message naming a field the user was
      // not editing — but all that reached the screen was « Erreur lors de l'enregistrement », so a
      // rotation-mode switch looked like a broken button. A refusal the server took the trouble to
      // explain has to be shown.
      //
      // Validation failures carry their messages in `errors[]`; `detail` is the generic
      // « One or more validation errors occurred ». Every other refusal says it in `detail`.
      const problem = (err as {
        data?: { detail?: string; errors?: { description?: string }[] };
      })?.data;

      const validation = (problem?.errors ?? [])
        .map((e) => e.description)
        .filter(Boolean)
        .join(' · ');

      notify.error(validation || problem?.detail || "Erreur lors de l'enregistrement");
    }
  };

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={editId ? 'Modifier le stage' : 'Nouveau stage'}
      position="right"
      size="lg"
      padding="xl"
    >
      <Stack gap="md" h="100%">
        <TextInput
          label="Nom du stage"
          placeholder="ex: Chirurgie générale"
          value={form.name}
          onChange={(e) => set('name', e.currentTarget.value)}
          radius="md"
          required
        />

        <Group grow>
          <Select
            label="Niveau"
            placeholder="Sélectionner un niveau"
            data={levelOptions}
            value={form.levelId}
            onChange={(v) => set('levelId', v)}
            radius="md"
            searchable
            required
          />
          <NumberInput
            label="Durée (jours)"
            value={form.durationInDays}
            onChange={(v) => set('durationInDays', Number(v) || 1)}
            min={1}
            radius="md"
          />
          <NumberInput
            label="Coefficient"
            value={form.coefficient}
            onChange={(v) => set('coefficient', Number(v) || 1)}
            min={1} max={10}
            radius="md"
          />
        </Group>

        {/* Neither option is the "normal" one, so neither is presented as the exception: the choice
            depends on the stage, and the imported history has both. The description spells out the
            consequence that actually matters to whoever fills the form — how many evaluations the
            chef will be asked for. */}
        <Radio.Group
          label="Déroulement des périodes"
          description="Ce que fait le groupe quand ce stage occupe plusieurs périodes de l'axe."
          value={form.rotationMode}
          onChange={(v) => set('rotationMode', v as StageRotationMode)}
        >
          <Stack gap="xs" mt="xs">
            <Radio
              value="PerPeriod"
              label="Un service par période"
              description="Le groupe change de service à chaque période (S1 → S2 → …). Une évaluation par période ; la note du stage est leur moyenne et chacune doit être validée."
            />
            <Radio
              value="SingleService"
              label="Un seul service pour tout le stage"
              description="Le groupe reste dans le même service pendant toutes ses périodes consécutives, et le chef ne saisit qu'une seule évaluation."
            />
          </Stack>
        </Radio.Group>

        <Textarea
          label="Description"
          placeholder="Description optionnelle"
          value={form.description}
          onChange={(e) => set('description', e.currentTarget.value)}
          radius="md"
          autosize
          minRows={2}
          maxRows={4}
        />

        <Divider label="Critères d'évaluation" labelPosition="left" />

        <Stack gap="xs">
          {form.objectives.map((obj) => (
            <Card key={obj._key} padding="sm" radius="md" withBorder>
              <Group gap="sm" align="flex-start" wrap="nowrap">
                <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
                  <Group gap="sm" grow>
                    <TextInput
                      placeholder="Libellé du critère"
                      value={obj.label}
                      onChange={(e) => updateObjective(obj._key, 'label', e.currentTarget.value)}
                      radius="md"
                      size="xs"
                    />
                    <NumberInput
                      placeholder="Poids"
                      value={obj.weight}
                      onChange={(v) => updateObjective(obj._key, 'weight', Number(v) || 1)}
                      min={1} max={100}
                      radius="md"
                      size="xs"
                      w={80}
                    />
                  </Group>
                  <Checkbox
                    label="Critère obligatoire"
                    checked={obj.isMandatory}
                    onChange={(e) => updateObjective(obj._key, 'isMandatory', e.currentTarget.checked)}
                    size="xs"
                  />
                </Stack>
                <ActionIcon
                  variant="subtle" color="red" size="sm" mt={4}
                  onClick={() => removeObjective(obj._key)}
                >
                  <IconTrash size={rem(14)} stroke={1.5} />
                </ActionIcon>
              </Group>
            </Card>
          ))}
          <Button
            variant="light" color="navy" radius="md" size="xs"
            leftSection={<IconPlus size={14} stroke={1.5} />}
            onClick={addObjective}
          >
            Ajouter un critère
          </Button>
        </Stack>

        <Group justify="flex-end" mt="auto" pt="md" style={{ borderTop: '1px solid #E2E8F0' }}>
          <Button variant="subtle" color="gray" radius="md" onClick={onClose}>Annuler</Button>
          <Button
            color="navy" radius="md"
            loading={creating || updating}
            disabled={!isValid}
            onClick={handleSave}
          >
            {editId ? 'Enregistrer' : 'Créer'}
          </Button>
        </Group>
      </Stack>
    </Drawer>
  );
}

export default function StagesPage() {
  const navigate = useNavigate();
  const notify = useNotify();

  // In the URL, not in component state: opening a stage and coming back must not lose the filter you
  // narrowed the list with. See useListParams for why this also costs fewer requests.
  const { search, setSearch, debouncedSearch, filters, setFilter, page, setPage } =
    useListParams<{ level: string | null }>(STAGE_FILTERS);
  const levelFilter = filters.level;
  const PAGE_SIZE = 15;


  const { data: levels = [] } = useGetPromotionLevelsQuery(undefined);
  const { data, isLoading, isFetching } = useGetStagesQuery({
    searchTerm: debouncedSearch.trim() || undefined,
    levelId: levelFilter ? Number(levelFilter) : undefined,
    pageNumber: page,
    pageSize: PAGE_SIZE,
  });
  const [deleteStage] = useDeleteStageMutation();

  const [drawerOpen, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);
  const [editTarget, setEditTarget]         = useState<StageSummaryResponse | null>(null);
  const [deleteTarget, setDeleteTarget]     = useState<StageSummaryResponse | null>(null);
  const [deleteOpen, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);

  const { data: stageDetail } = useGetStageByIdQuery(editTarget?.id ?? 0, { skip: !editTarget });

  const stages = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  const levelOptions = [
    { value: '', label: 'Tous les niveaux' },
    ...levels.map((l) => ({
      value: String(l.id),
      label: l.label ?? `Année ${l.year} — ${l.academicProgram}`,
    })),
  ];

  const openCreate = () => { setEditTarget(null); openDrawer(); };
  const openEdit = (s: StageSummaryResponse) => { setEditTarget(s); openDrawer(); };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteStage(deleteTarget.id).unwrap();
      notify.success('Stage supprimé');
    } catch {
      notify.error('Impossible de supprimer ce stage');
    }
    closeDeleteModal();
    setDeleteTarget(null);
  };

  const drawerInitial = useMemo<StageForm>(() => {
    if (!editTarget) return EMPTY_FORM;
    if (!stageDetail) return {
      name: editTarget.name,
      levelId: null,
      durationInDays: editTarget.durationInDays,
      coefficient: editTarget.coefficient,
      description: '',
      objectives: [],
      // From the list row, so the placeholder form cannot write PerPeriod back over a
      // SingleService stage if the detail request has not landed yet.
      rotationMode: editTarget.rotationMode,
    };
    return {
      name: stageDetail.name,
      levelId: stageDetail.levelResponse ? String(stageDetail.levelResponse.id) : null,
      durationInDays: stageDetail.durationInDays,
      coefficient: stageDetail.coefficient,
      rotationMode: stageDetail.rotationMode,
      description: stageDetail.description ?? '',
      objectives: stageDetail.stageObjectiveResponse.map((o) => ({
        _key: crypto.randomUUID(),
        label: o.label,
        description: o.description ?? '',
        weight: o.weight,
        isMandatory: o.isMandatory,
      })),
    };
  }, [editTarget, stageDetail]);

  return (
    <Container fluid>
      <Stack gap="xl">
        <Group justify="space-between" align="flex-end" wrap="wrap">
          <Stack gap={4}>
            <Title order={2} fw={700}>Stages</Title>
            <Text size="sm" c="dimmed">
              {data ? `${data.totalCount} stage${data.totalCount > 1 ? 's' : ''} au total` : 'Chargement…'}
            </Text>
          </Stack>
          <Button leftSection={<IconPlus size={16} stroke={1.5} />} color="navy" radius="md" onClick={openCreate}>
            Nouveau stage
          </Button>
        </Group>

        <Card padding="lg" radius="lg" withBorder shadow="sm">
          <Stack gap="md">
            <Group gap="sm" wrap="wrap">
              <TextInput
                placeholder="Rechercher un stage…"
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
                radius="md"
                style={{ flex: 1, minWidth: rem(200) }}
              />
              <Select
                data={levelOptions}
                value={levelFilter ?? ''}
                onChange={(v) => setFilter('level', v || null)}
                radius="md"
                w={220}
                placeholder="Filtrer par niveau"
              />
            </Group>

            <ScrollArea>
              <Table
                striped highlightOnHover verticalSpacing="sm"
                style={{ opacity: isFetching && !isLoading ? 0.6 : 1, transition: 'opacity 150ms' }}
              >
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Nom</Table.Th>
                    <Table.Th>Niveau</Table.Th>
                    <Table.Th>Durée (catalogue)</Table.Th>
                    <Table.Th>Coefficient (catalogue)</Table.Th>
                    <Table.Th>Périodes</Table.Th>
                    <Table.Th w={100} />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {isLoading ? (
                    Array.from({ length: PAGE_SIZE }).map((_, i) => (
                      <Table.Tr key={i}>
                        {[180, 140, 80, 60, 110, 90].map((w, j) => (
                          <Table.Td key={j}><Skeleton height={14} width={w} radius="sm" /></Table.Td>
                        ))}
                      </Table.Tr>
                    ))
                  ) : stages.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={6}>
                        <Stack align="center" py="xl" gap="xs">
                          <IconStethoscope size={32} stroke={1.5} color="#94A3B8" />
                          <Text c="dimmed" size="sm">Aucun stage trouvé</Text>
                        </Stack>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    stages.map((stage) => (
                      <Table.Tr key={stage.id}>
                        <Table.Td>
                          <Text size="sm" fw={500}>{stage.name}</Text>
                        </Table.Td>
                        <Table.Td>
                          {stage.levelLabel ? (
                            <Badge variant="light" color="navy" radius="xl" size="sm">{stage.levelLabel}</Badge>
                          ) : (
                            <Text size="sm" c="dimmed">—</Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <StageCatalogueFigure
                            value={stage.durationInDays}
                            figure="durationInDays"
                            textFigures={stage.textFigures ?? []}
                          />
                        </Table.Td>
                        <Table.Td>
                          <StageCatalogueFigure
                            value={stage.coefficient}
                            figure="coefficient"
                            textFigures={stage.textFigures ?? []}
                            monospace
                          />
                        </Table.Td>
                        <Table.Td>
                          <Tooltip
                            withArrow
                            multiline
                            w={280}
                            label={stage.rotationMode === 'SingleService'
                              ? 'Le groupe reste dans le même service pendant toutes ses périodes consécutives, et une seule évaluation est saisie.'
                              : 'Le groupe change de service à chaque période, avec une évaluation par période.'}
                          >
                            <Badge
                              variant="light"
                              radius="xl"
                              size="sm"
                              color={stage.rotationMode === 'SingleService' ? 'teal' : 'gray'}
                            >
                              {stage.rotationMode === 'SingleService' ? 'Service unique' : 'Un par période'}
                            </Badge>
                          </Tooltip>
                        </Table.Td>
                        <Table.Td>
                          <Group gap={4} wrap="nowrap" justify="flex-end">
                            <Tooltip label="Cohortes" position="top">
                              <ActionIcon
                                variant="subtle" color="navy" size="sm" radius="md"
                                onClick={() => navigate(`${PATHS.ADMIN.ROOT}/stages/${stage.id}`)}
                              >
                                <IconUsersGroup size={rem(14)} stroke={1.5} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Modifier" position="top">
                              <ActionIcon
                                variant="subtle" color="gray" size="sm" radius="md"
                                onClick={() => openEdit(stage)}
                              >
                                <IconPencil size={rem(14)} stroke={1.5} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Supprimer" position="top">
                              <ActionIcon
                                variant="subtle" color="red" size="sm" radius="md"
                                onClick={() => { setDeleteTarget(stage); openDeleteModal(); }}
                              >
                                <IconTrash size={rem(14)} stroke={1.5} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </ScrollArea>

            {totalPages > 1 && (
              <Group justify="center">
                <Pagination value={page} onChange={setPage} total={totalPages} radius="md" size="sm" color="navy" />
              </Group>
            )}
          </Stack>
        </Card>
      </Stack>

      <StageFormDrawer
        opened={drawerOpen}
        onClose={closeDrawer}
        initial={drawerInitial}
        editId={editTarget?.id ?? null}
        onSaved={() => setEditTarget(null)}
      />
      <ConfirmModal
        opened={deleteOpen}
        onClose={() => { closeDeleteModal(); setDeleteTarget(null); }}
        title="Supprimer le stage"
        message={`Supprimer le stage "${deleteTarget?.name}" ?`}
        confirmLabel="Supprimer"
        onConfirm={handleDeleteConfirm}
      />
    </Container>
  );
}
