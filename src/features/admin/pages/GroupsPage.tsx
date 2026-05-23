import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Divider,
  Group,
  Modal,
  NumberInput,
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
import { useDisclosure } from '@mantine/hooks';
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconPencil,
  IconTrash,
  IconUsersGroup,
  IconWand,
  IconArrowRight,
} from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useGetAcademicYearsQuery,
  useGetLevelsQuery,
  useAutoArrangeGroupsMutation,
  useGetAcademicGroupsQuery,
  useUpdateGroupMutation,
  useDeleteGroupMutation,
} from '../api/adminApi';
import type { BulkResponse } from '../../../common/types';
import type { AcademicGroupResponse } from '../types/admin.types';
import { useNotify } from '../../../common/hooks/useNotify';
import { PATHS } from '../../../routes/paths';

// ─── Auto-arrange tab ────────────────────────────────────────────────────────

interface FormState {
  academicYearId: string | null;
  levelId: string | null;
  groupSize: number;
}

const EMPTY: FormState = { academicYearId: null, levelId: null, groupSize: 20 };

function AutoArrangeTab() {
  const notify = useNotify();
  const { data: years = [] } = useGetAcademicYearsQuery();
  const { data: levels = [] } = useGetLevelsQuery(undefined);
  const [arrange, { isLoading }] = useAutoArrangeGroupsMutation();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [result, setResult] = useState<BulkResponse<string, number> | null>(null);

  const yearOptions = years.map((y) => ({
    value: String(y.id),
    label: y.isCurrent ? `${y.label} (actuelle)` : y.label,
  }));

  const levelOptions = Object.entries(
    levels.reduce<Record<string, { value: string; label: string }[]>>((acc, l) => {
      const item = { value: String(l.id), label: l.label ?? `Année ${l.year}` };
      (acc[l.academicProgram] ??= []).push(item);
      return acc;
    }, {})
  ).map(([group, items]) => ({ group, items }));

  const canSubmit = form.academicYearId && form.levelId && form.groupSize >= 2;

  const handleArrange = async () => {
    if (!canSubmit) return;
    setResult(null);
    try {
      const res = await arrange({
        academicYearId: Number(form.academicYearId),
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

          <Select label="Année académique" placeholder="Sélectionner une année"
            data={yearOptions} value={form.academicYearId}
            onChange={(v) => setForm((p) => ({ ...p, academicYearId: v }))} required />
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

// ─── Groups list tab ──────────────────────────────────────────────────────────

function EditGroupModal({ group, opened, onClose }: {
  group: AcademicGroupResponse | null;
  opened: boolean;
  onClose: () => void;
}) {
  const notify = useNotify();
  const [label, setLabel] = useState(group?.label ?? '');
  const [updateGroup, { isLoading }] = useUpdateGroupMutation();

  const handleSave = async () => {
    if (!group || !label.trim()) return;
    try {
      await updateGroup({ id: group.id, label: label.trim() }).unwrap();
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

function GroupsListTab() {
  const notify   = useNotify();
  const navigate = useNavigate();

  const [selectedYear,  setSelectedYear]  = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [editTarget, setEditTarget]       = useState<AcademicGroupResponse | null>(null);
  const [editOpen, { open: openEdit, close: closeEdit }] = useDisclosure(false);

  const { data: years = [] }  = useGetAcademicYearsQuery();
  const { data: levels = [] } = useGetLevelsQuery(undefined);

  const { data: groups = [], isLoading: loadingGroups } = useGetAcademicGroupsQuery(
    {
      academicYearId: selectedYear  ? Number(selectedYear)  : undefined,
      levelId:        selectedLevel ? Number(selectedLevel) : undefined,
    },
    { skip: !selectedYear }
  );
  const [deleteGroup] = useDeleteGroupMutation();

  const yearOptions = years.map((y) => ({
    value: String(y.id),
    label: y.isCurrent ? `${y.label} (actuelle)` : y.label,
  }));

  const levelOptions = Object.entries(
    levels.reduce<Record<string, { value: string; label: string }[]>>((acc, l) => {
      const item = { value: String(l.id), label: l.label ?? `Année ${l.year}` };
      (acc[l.academicProgram] ??= []).push(item);
      return acc;
    }, {})
  ).map(([group, items]) => ({ group, items }));

  const handleDelete = async (g: AcademicGroupResponse) => {
    if (!window.confirm(`Supprimer le groupe "${g.label}" ?`)) return;
    try {
      await deleteGroup(g.id).unwrap();
      notify.success('Groupe supprimé');
    } catch {
      notify.error('Impossible de supprimer ce groupe (des cohortes y sont peut-être associées)');
    }
  };

  return (
    <Stack gap="md">
      <Group align="flex-end" gap="md">
        <Select
          label="Année académique"
          placeholder="Toutes les années"
          data={yearOptions}
          value={selectedYear}
          onChange={(v) => { setSelectedYear(v); setSelectedLevel(null); }}
          w={240}
          clearable
        />
        <Select
          label="Niveau"
          placeholder="Tous les niveaux"
          data={levelOptions}
          value={selectedLevel}
          onChange={setSelectedLevel}
          disabled={!selectedYear}
          searchable
          clearable
          w={240}
        />
      </Group>

      {selectedYear && (
        <Card padding="lg" radius="lg" withBorder shadow="sm" style={{ overflowX: 'auto' }}>
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>N°</Table.Th>
                <Table.Th>Libellé</Table.Th>
                <Table.Th>Année</Table.Th>
                <Table.Th w={120} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {loadingGroups ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Table.Tr key={i}>
                    {[40, 200, 100, 100].map((w, j) => (
                      <Table.Td key={j}><Skeleton height={14} width={w} radius="sm" /></Table.Td>
                    ))}
                  </Table.Tr>
                ))
              ) : groups.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={4}>
                    <Text c="dimmed" size="sm" ta="center" py="md">
                      {selectedLevel
                        ? 'Aucun groupe ne correspond à ce niveau pour l\'année sélectionnée.'
                        : 'Aucun groupe pour cette année. Lancez d\'abord la répartition automatique.'}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                groups.map((g) => (
                  <Table.Tr key={g.id}>
                    <Table.Td>
                      <Badge variant="light" color="navy" size="sm" radius="md">{g.groupNumber}</Badge>
                    </Table.Td>
                    <Table.Td><Text size="sm" fw={500}>{g.label}</Text></Table.Td>
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
                        <Tooltip label="Supprimer" position="top">
                          <ActionIcon variant="subtle" color="red" size="sm"
                            onClick={() => handleDelete(g)}>
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
    </Stack>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GroupsPage() {
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
          </Tabs.List>

          <Tabs.Panel value="list"><GroupsListTab /></Tabs.Panel>
          <Tabs.Panel value="arrange"><AutoArrangeTab /></Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}
