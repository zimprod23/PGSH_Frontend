import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  Combobox,
  Drawer,
  Group,
  InputBase,
  Loader,
  Modal,
  MultiSelect,
  Popover,
  ScrollArea,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
  rem,
  useCombobox,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import {
  IconAlertTriangle,
  IconCalendarTime,
  IconCheck,
  IconCircleCheck,
  IconCircleX,
  IconGridDots,
  IconPlus,
  IconRocket,
  IconRocketOff,
  IconArrowsShuffle,
  IconTrash,
  IconEraser,
  IconX,
} from '@tabler/icons-react';
import { useState, useCallback, useMemo, memo } from 'react';
import {
  useGetStageScheduleQuery,
  useCreateStageSlotMutation,
  useDeleteStageSlotMutation,
  useSetCohortSlotAssignmentMutation,
  useClearCohortSlotAssignmentMutation,
  useClearSlotAssignmentsMutation,
  usePublishScheduleMutation,
  useUnpublishScheduleMutation,
  useAutoArrangeStageScheduleMutation,
  usePublishStageScheduleMutation,
  useGetServicesQuery,
} from '../api/adminApi';
import type { SlotCellResponse, StageSlotResponse, CohortScheduleRow } from '../types/admin.types';
import { useNotify } from '../../../common/hooks/useNotify';
import { ConfirmModal } from '../../../common/components/ConfirmModal';

// ─── Saturation summary bar ──────────────────────────────────────────────────

function SaturationSummary(
  { visibleCohorts, slots }: { visibleCohorts: CohortScheduleRow[]; slots: StageSlotResponse[] },
) {
  const [reportOpen, { open: openReport, close: closeReport }] = useDisclosure(false);
  const periodBySlot = new Map(slots.map((s) => [s.id, s.periodNumber]));

  // cell.occupiedSeats is the backend's true per-(slot × service) load across ALL
  // partitions, so it stays correct even when the grid is filtered to one partition.
  const cells = new Map<string, { service: string; hospital: string; period: number; occupied: number; capacity: number }>();
  for (const cohort of visibleCohorts) {
    for (const cell of cohort.cells) {
      if (!cell || cells.has(`${cell.stageSlotId}:${cell.serviceId}`)) continue;
      cells.set(`${cell.stageSlotId}:${cell.serviceId}`, {
        service:  cell.serviceName,
        hospital: cell.hospitalName,
        period:   periodBySlot.get(cell.stageSlotId) ?? 0,
        occupied: cell.occupiedSeats,
        capacity: cell.serviceCapacity,
      });
    }
  }

  const saturated = [...cells.values()]
    .filter((c) => c.occupied > c.capacity)
    .sort((a, b) => (b.occupied - b.capacity) - (a.occupied - a.capacity));

  if (saturated.length === 0) return null;

  const top = saturated.slice(0, 3);
  const totalOverflow = saturated.reduce((s, c) => s + (c.occupied - c.capacity), 0);

  return (
    <Card padding="sm" radius="md" withBorder style={{ borderColor: '#fca5a5', background: '#fff5f5' }}>
      <Stack gap={6}>
        <Group gap="xs" wrap="wrap" justify="space-between">
          <Group gap="xs" wrap="wrap">
            <Badge color="red" variant="light" radius="sm" size="sm">
              {saturated.length} affectation{saturated.length > 1 ? 's' : ''} saturée{saturated.length > 1 ? 's' : ''}
            </Badge>
            <Text size="xs" c="dimmed">
              Un service dépasse sa capacité sur une période — augmentez sa capacité ou répartissez sur d'autres services.
            </Text>
          </Group>
          <Button size="compact-xs" variant="light" color="red" radius="md" onClick={openReport}>
            Voir le rapport
          </Button>
        </Group>
        <Group gap={6} wrap="wrap">
          {top.map((c) => (
            <Badge key={`${c.service}-${c.period}`} color="red" variant="outline" radius="sm" size="sm">
              {c.service} · P{c.period} : {c.occupied}/{c.capacity}
            </Badge>
          ))}
          {saturated.length > top.length && (
            <Text size="xs" c="dimmed">+{saturated.length - top.length} autre(s)</Text>
          )}
        </Group>
      </Stack>

      <Drawer
        opened={reportOpen}
        onClose={closeReport}
        position="right"
        size="md"
        title={<Text fw={700} size="sm">Rapport de saturation</Text>}
      >
        <Stack gap="sm">
          <Text size="xs" c="dimmed">
            {saturated.length} affectation(s) dépassent la capacité du service sur la période concernée
            (déficit total : <strong>{totalOverflow}</strong> place(s)). Augmentez la capacité du service à la
            valeur « requise » ou déplacez des groupes vers d'autres services.
          </Text>
          <Table withTableBorder fz="xs" striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Service</Table.Th>
                <Table.Th ta="center">Période</Table.Th>
                <Table.Th ta="center">Étud. / Cap.</Table.Th>
                <Table.Th ta="center">Requis</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {saturated.map((c) => (
                <Table.Tr key={`${c.service}-${c.period}`}>
                  <Table.Td>
                    <Stack gap={0}>
                      <Text size="xs" fw={600}>{c.service}</Text>
                      <Text size="xs" c="dimmed">{c.hospital}</Text>
                    </Stack>
                  </Table.Td>
                  <Table.Td ta="center">P{c.period}</Table.Td>
                  <Table.Td ta="center">
                    <Badge color="red" variant="light" radius="sm" size="sm">{c.occupied}/{c.capacity}</Badge>
                  </Table.Td>
                  <Table.Td ta="center">
                    <Text size="xs" fw={600} c="red">+{c.occupied - c.capacity}</Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Stack>
      </Drawer>
    </Card>
  );
}

// ─── Cell face (shared presentational) ────────────────────────────────────────
// Pure render of a cell's current state. Used by both the lightweight read-only
// cell and the active editor, so the two always look identical.

interface CellFaceProps {
  cell: SlotCellResponse | null;
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  onClear?: (e: React.MouseEvent) => void;
}

function CellFace({ cell, loading, disabled, onClick, onClear }: CellFaceProps) {
  const capacityOk = !cell || (cell.occupiedSeats <= cell.serviceCapacity);
  const capacityColor = !cell ? 'gray' : capacityOk ? 'teal' : 'red';

  return (
    <Box
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', gap: 2,
        padding: '6px 8px',
        borderRadius: rem(6),
        cursor: disabled || loading ? 'default' : 'pointer',
        minWidth: 130,
        background: cell ? '#f0fdf4' : '#fafafa',
        border: `1px dashed ${cell ? '#86efac' : '#e2e8f0'}`,
        transition: 'background 120ms',
      }}
    >
      {loading ? (
        <Loader size={12} />
      ) : cell ? (
        <>
          <Group gap={4} wrap="nowrap" justify="space-between">
            <Stack gap={0} style={{ minWidth: 0, flex: 1 }}>
              <Text size="xs" fw={600} truncate style={{ maxWidth: 100 }}>{cell.serviceName}</Text>
              <Text size="xs" c="dimmed" truncate style={{ maxWidth: 100 }}>{cell.hospitalName}</Text>
            </Stack>
            <ActionIcon size={12} variant="transparent" color="red" onClick={onClear} style={{ flexShrink: 0 }}>
              <IconX size={10} />
            </ActionIcon>
          </Group>
          <Group gap={4} wrap="nowrap">
            <Tooltip
              label={
                capacityOk
                  ? `${cell.occupiedSeats} étudiant(s) — dans la limite des ${cell.serviceCapacity} places`
                  : `${cell.occupiedSeats} étudiant(s) pour ${cell.serviceCapacity} places — augmentez la capacité du service à ${cell.occupiedSeats} pour éviter la saturation`
              }
              position="top"
              withArrow
              multiline
              w={240}
            >
              <Badge size="xs" radius="xl" color={capacityColor} variant="light">
                {cell.occupiedSeats} / {cell.serviceCapacity}
              </Badge>
            </Tooltip>
          </Group>
        </>
      ) : (
        <Text size="xs" c="dimmed" ta="center" style={{ lineHeight: '28px' }}>— Vide —</Text>
      )}
    </Box>
  );
}

// ─── Lightweight cell (read-only until clicked) ───────────────────────────────
// The grid mounts one of these per cell. It carries no Combobox, query or mutation
// subscription — clicking promotes it to the heavy ServicePicker editor in the
// parent. Memoized so opening one cell doesn't re-render the other ~160.

interface ServiceCellProps {
  cell: SlotCellResponse | null;
  cohortId: number;
  slotId: number;
  disabled?: boolean;
  clearing?: boolean;
  onEdit: (cohortId: number, slotId: number) => void;
  onClear: (cohortId: number, slotId: number) => void;
}

const ServiceCell = memo(function ServiceCell(
  { cell, cohortId, slotId, disabled, clearing, onEdit, onClear }: ServiceCellProps,
) {
  return (
    <CellFace
      cell={cell}
      loading={clearing}
      disabled={disabled}
      onClick={() => { if (!disabled && !clearing) onEdit(cohortId, slotId); }}
      onClear={(e) => { e.stopPropagation(); onClear(cohortId, slotId); }}
    />
  );
});

// ─── Service search combobox (active cell only) ───────────────────────────────
// Mounted only for the single cell currently being edited, so its Combobox, debounce
// and service query exist at most once at a time instead of once per cell.

interface ServicePickerProps {
  cell: SlotCellResponse | null;
  stageId: number;
  slotId: number;
  cohortId: number;
  allowedServiceIds?: number[];
  onClose: () => void;
  onClear: (e: React.MouseEvent) => void;
}

function ServicePicker({ cell, stageId, slotId, cohortId, allowedServiceIds = [], onClose, onClear }: ServicePickerProps) {
  const notify = useNotify();
  const [opened, setOpened] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 300);
  const combobox = useCombobox({ onDropdownClose: () => combobox.resetSelectedOption() });

  const { data: servicesPage, isFetching } = useGetServicesQuery(
    { searchTerm: debouncedSearch, pageSize: 20 },
    { skip: debouncedSearch.length < 2 },
  );

  const [setAssignment, { isLoading: setting }] = useSetCohortSlotAssignmentMutation();

  const handleSelect = useCallback(async (serviceId: number) => {
    try {
      await setAssignment({ stageId, slotId, cohortId, serviceId }).unwrap();
      setOpened(false);
      setSearch('');
    } catch { notify.error('Impossible de définir ce service'); }
  }, [stageId, slotId, cohortId, setAssignment, notify]);

  const handlePopoverChange = (o: boolean) => {
    setOpened(o);
    if (!o) onClose();
  };

  return (
    <Popover opened={opened} onChange={handlePopoverChange} withArrow shadow="md" radius="md" width={300}>
      <Popover.Target>
        <CellFace
          cell={cell}
          loading={setting}
          onClick={() => setOpened((o) => !o)}
          onClear={onClear}
        />
      </Popover.Target>

      <Popover.Dropdown>
        <Stack gap="xs">
          <Combobox store={combobox} onOptionSubmit={(val) => handleSelect(Number(val))}>
            <Combobox.Target>
              <InputBase
                placeholder="Rechercher (min. 2 car.)…"
                size="xs"
                value={search}
                onChange={(e) => { setSearch(e.currentTarget.value); combobox.openDropdown(); }}
                onClick={() => combobox.openDropdown()}
                rightSection={isFetching ? <Loader size={12} /> : null}
                autoFocus
              />
            </Combobox.Target>
            <Combobox.Dropdown>
              <Combobox.Options>
                {search.length < 2 ? (
                  <Combobox.Empty>Tapez pour rechercher…</Combobox.Empty>
                ) : isFetching ? (
                  <Combobox.Empty>Chargement…</Combobox.Empty>
                ) : !servicesPage?.items.length ? (
                  <Combobox.Empty>Aucun service trouvé</Combobox.Empty>
                ) : (
                  (allowedServiceIds.length > 0
                    ? servicesPage.items.filter((s) => allowedServiceIds.includes(s.id))
                    : servicesPage.items
                  ).map((s) => (
                    <Combobox.Option key={s.id} value={String(s.id)}>
                      <Stack gap={0}>
                        <Text size="xs" fw={500}>{s.name}</Text>
                        <Text size="xs" c="dimmed">{s.hospitalName} · Cap. {s.capacity}</Text>
                      </Stack>
                    </Combobox.Option>
                  ))
                )}
              </Combobox.Options>
            </Combobox.Dropdown>
          </Combobox>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}

// ─── Add slot form ────────────────────────────────────────────────────────────

interface AddSlotModalProps {
  opened: boolean;
  onClose: () => void;
  stageId: number;
  nextPeriodNumber: number;
}

function AddSlotModal({ opened, onClose, stageId, nextPeriodNumber }: AddSlotModalProps) {
  const notify = useNotify();
  const [createSlot, { isLoading }] = useCreateStageSlotMutation();
  const [form, setForm] = useState({ label: '', startDate: '', endDate: '' });

  const handleSubmit = async () => {
    try {
      await createSlot({
        stageId,
        periodNumber: nextPeriodNumber,
        label: form.label || undefined,
        startDate: form.startDate,
        endDate: form.endDate,
      }).unwrap();
      notify.success(`Créneau P${nextPeriodNumber} ajouté`);
      setForm({ label: '', startDate: '', endDate: '' });
      onClose();
    } catch { notify.error('Impossible d\'ajouter ce créneau'); }
  };

  const canSubmit = form.startDate && form.endDate && form.endDate >= form.startDate;

  return (
    <Modal opened={opened} onClose={onClose} title={`Ajouter créneau P${nextPeriodNumber}`} radius="md" size="sm">
      <Stack gap="sm">
        <TextInput label="Libellé (optionnel)" placeholder="Ex: Chirurgie" value={form.label}
          onChange={(e) => { const v = e.currentTarget.value; setForm((f) => ({ ...f, label: v })); }} />
        <DatePickerInput
          type="range"
          label="Période (début → fin)"
          placeholder="Sélectionnez les dates"
          value={[form.startDate || null, form.endDate || null]}
          onChange={([start, end]) => setForm((f) => ({ ...f, startDate: start ?? '', endDate: end ?? '' }))}
          allowSingleDateInRange
          numberOfColumns={2}
          popoverProps={{ withinPortal: true }}
          required
        />
        <Text size="xs" c="dimmed">
          {form.startDate && form.endDate ? `${form.startDate} → ${form.endDate}` : 'Cliquez une date de début puis de fin'}
        </Text>
        <Group justify="flex-end" pt="xs">
          <Button variant="subtle" color="gray" onClick={onClose}>Annuler</Button>
          <Button color="navy" loading={isLoading} disabled={!canSubmit} onClick={handleSubmit}>Ajouter</Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// ─── Column header with delete and clear ──────────────────────────────────────

function SlotHeader({ slot, stageId }: { slot: StageSlotResponse; stageId: number }) {
  const notify = useNotify();
  const [deleteSlot, { isLoading: deleting }] = useDeleteStageSlotMutation();
  const [clearSlot, { isLoading: clearing }] = useClearSlotAssignmentsMutation();
  const [deleteOpen, { open: openDelete, close: closeDelete }] = useDisclosure(false);
  const [clearOpen,  { open: openClear,  close: closeClear  }] = useDisclosure(false);

  const handleDelete = async () => {
    try {
      await deleteSlot({ stageId, slotId: slot.id }).unwrap();
      notify.success(`Créneau P${slot.periodNumber} supprimé`);
    } catch { notify.error('Impossible de supprimer ce créneau'); }
    closeDelete();
  };

  const handleClear = async () => {
    try {
      const res = await clearSlot({ stageId, slotId: slot.id }).unwrap();
      if (res.skipped > 0)
        notify.info(`${res.cleared} affectation(s) vidée(s) · ${res.skipped} ignorée(s) (publiées)`);
      else
        notify.success(`${res.cleared} affectation(s) vidée(s)`);
    } catch { notify.error('Impossible de vider ce créneau'); }
    closeClear();
  };

  return (
    <>
      <Stack gap={2} align="center" style={{ minWidth: 150 }}>
        <Group gap={4} wrap="nowrap" justify="center">
          <Text size="xs" fw={700} c="navy.7">P{slot.periodNumber}{slot.label ? ` — ${slot.label}` : ''}</Text>
          <Tooltip label="Vider les affectations" position="top">
            <ActionIcon size={14} variant="subtle" color="orange" loading={clearing} onClick={openClear}>
              <IconEraser size={10} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Supprimer le créneau" position="top">
            <ActionIcon size={14} variant="subtle" color="red" loading={deleting} onClick={openDelete}>
              <IconTrash size={10} />
            </ActionIcon>
          </Tooltip>
        </Group>
        <Text size="xs" c="dimmed" ff="monospace">
          {slot.startDate} → {slot.endDate}
        </Text>
      </Stack>

      <ConfirmModal
        opened={deleteOpen}
        onClose={closeDelete}
        title={`Supprimer P${slot.periodNumber}`}
        message="Les affectations de service pour ce créneau seront aussi supprimées. Cette action est irréversible."
        confirmLabel="Supprimer"
        confirmColor="red"
        onConfirm={handleDelete}
        loading={deleting}
      />
      <ConfirmModal
        opened={clearOpen}
        onClose={closeClear}
        title={`Vider P${slot.periodNumber}`}
        message="Toutes les affectations de service non publiées pour ce créneau seront supprimées."
        confirmLabel="Vider"
        confirmColor="orange"
        onConfirm={handleClear}
        loading={clearing}
      />
    </>
  );
}

// ─── Publish button per cohort ────────────────────────────────────────────────

function PublishButton({ cohortId, stageId, isPublished }: { cohortId: number; stageId: number; isPublished: boolean }) {
  const notify = useNotify();
  const [publish, { isLoading: publishing }] = usePublishScheduleMutation();
  const [unpublish, { isLoading: unpublishing }] = useUnpublishScheduleMutation();
  const [unpublishOpen, { open: openUnpublish, close: closeUnpublish }] = useDisclosure(false);
  const [publishOpen, { open: openPublish, close: closePublish }] = useDisclosure(false);
  const [allowOverCapacity, setAllowOverCapacity] = useState(false);
  const loading = publishing || unpublishing;

  const handlePublish = async () => {
    closePublish();
    try {
      await publish({ cohortId, stageId, allowOverCapacity }).unwrap();
      notify.success('Planning publié');
    } catch (err: unknown) {
      const detail = (err as { data?: { detail?: string } })?.data?.detail;
      notify.error(detail ?? 'Erreur lors de la publication');
    }
  };

  const handleUnpublish = async () => {
    try {
      const res = await unpublish({ cohortId, stageId }).unwrap();
      notify.success(`${res.removed} période(s) supprimée(s)`);
    } catch { notify.error('Erreur lors de la dépublication'); }
    closeUnpublish();
  };

  if (isPublished) {
    return (
      <>
        <Tooltip label="Dépublier" position="left">
          <ActionIcon size="sm" variant="subtle" color="red" loading={loading} onClick={openUnpublish}>
            <IconRocketOff size={14} stroke={1.5} />
          </ActionIcon>
        </Tooltip>
        <ConfirmModal
          opened={unpublishOpen}
          onClose={closeUnpublish}
          title="Dépublier le planning"
          message="Les périodes de service générées seront supprimées."
          confirmLabel="Dépublier"
          confirmColor="red"
          onConfirm={handleUnpublish}
          loading={unpublishing}
        />
      </>
    );
  }

  return (
    <>
      <Tooltip label="Publier le planning" position="left">
        <ActionIcon size="sm" variant="subtle" color="teal" loading={loading} onClick={openPublish}>
          <IconRocket size={14} stroke={1.5} />
        </ActionIcon>
      </Tooltip>
      <ConfirmModal
        opened={publishOpen}
        onClose={closePublish}
        title="Publier le planning"
        message="Générer les périodes de service de cette cohorte ?"
        confirmLabel="Publier"
        confirmColor="teal"
        onConfirm={handlePublish}
        loading={publishing}
      >
        <Checkbox
          checked={allowOverCapacity}
          onChange={(e) => setAllowOverCapacity(e.currentTarget.checked)}
          label="Autoriser le dépassement de capacité"
          description="Publie même si un service dépasse sa capacité sur sa fenêtre."
          color="orange"
        />
      </ConfirmModal>
    </>
  );
}

// ─── Publish all unpublished cohorts ─────────────────────────────────────────

function PublishAllButton(
  { stageId, cohorts, activePartition }: { stageId: number; cohorts: CohortScheduleRow[]; activePartition: string | null },
) {
  const notify = useNotify();
  const [publishStage, { isLoading: loading }] = usePublishStageScheduleMutation();
  const [confirmOpen, { open, close }] = useDisclosure(false);
  const [allowOverCapacity, setAllowOverCapacity] = useState(false);

  const publishable = cohorts.filter((c) => !c.isSchedulePublished && c.cells.some((cell) => cell !== null));

  const handlePublishAll = async () => {
    close();
    try {
      const res = await publishStage({
        stageId,
        partitionLabels: activePartition ? [activePartition] : undefined,
        allowOverCapacity,
      }).unwrap();
      notify.success(`${res.publishedCohorts} cohorte(s) publiée(s) · ${res.periodsCreated} période(s)`);
    } catch (err: unknown) {
      const detail = (err as { data?: { detail?: string } })?.data?.detail;
      notify.error(detail ?? 'Erreur lors de la publication');
    }
  };

  if (publishable.length === 0) return null;

  const scopeLabel = activePartition ? `partition ${activePartition}` : 'toutes les partitions';

  return (
    <>
      <Button
        size="xs" color="teal" variant="light" radius="md"
        leftSection={<IconRocket size={12} stroke={1.5} />}
        loading={loading}
        onClick={open}
      >
        Publier tout ({publishable.length})
      </Button>
      <ConfirmModal
        opened={confirmOpen}
        onClose={close}
        title="Publier les cohortes"
        message={`Publier le planning de ${publishable.length} cohorte(s) configurée(s) (${scopeLabel}) ?`}
        confirmLabel="Publier"
        confirmColor="teal"
        onConfirm={handlePublishAll}
        loading={loading}
      >
        <Checkbox
          checked={allowOverCapacity}
          onChange={(e) => setAllowOverCapacity(e.currentTarget.checked)}
          label="Autoriser le dépassement de capacité"
          description="Publie même si un service dépasse sa capacité sur sa fenêtre."
          color="orange"
        />
      </ConfirmModal>
    </>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

interface Props {
  opened: boolean;
  onClose: () => void;
  stageId: number;
  academicYearId?: number;
  allowedServiceIds?: number[];
}

export function ScheduleGridModal({ opened, onClose, stageId, academicYearId, allowedServiceIds = [] }: Props) {
  const notify = useNotify();
  const [addSlotOpened, setAddSlotOpened]   = useState(false);
  const [activePartition, setActivePartition] = useState<string | null>(null);
  const [autoArrangePeriods, setAutoArrangePeriods] = useState<string[]>([]);
  const [autoArrangeOpen, { open: openAutoArrange, close: closeAutoArrange }] = useDisclosure(false);
  const [editing, setEditing] = useState<{ cohortId: number; slotId: number } | null>(null);
  const [clearingKey, setClearingKey] = useState<string | null>(null);
  const { data: schedule, isLoading } = useGetStageScheduleQuery(
    { stageId, academicYearId },
    { skip: !opened },
  );
  const [autoArrange, { isLoading: arranging }] = useAutoArrangeStageScheduleMutation();
  const [clearAssignment] = useClearCohortSlotAssignmentMutation();

  const handleClose = useCallback(() => { setEditing(null); onClose(); }, [onClose]);

  const handleEditCell = useCallback(
    (cohortId: number, slotId: number) => setEditing({ cohortId, slotId }),
    [],
  );

  const handleClearCell = useCallback(async (cohortId: number, slotId: number) => {
    setClearingKey(`${cohortId}:${slotId}`);
    try { await clearAssignment({ stageId, slotId, cohortId }).unwrap(); }
    catch { notify.error('Impossible de supprimer cette affectation'); }
    finally { setClearingKey(null); }
  }, [stageId, clearAssignment, notify]);

  const partitions = useMemo(
    () => Array.from(
      new Set(schedule?.cohorts.map((c) => c.rotationGroup).filter((g): g is string => g != null)),
    ).sort(),
    [schedule],
  );

  const handleAutoArrange = async () => {
    closeAutoArrange();
    try {
      const res = await autoArrange({
        stageId,
        partitionLabels: activePartition ? [activePartition] : undefined,
        periodNumbers: autoArrangePeriods.length ? autoArrangePeriods.map(Number) : undefined,
      }).unwrap();
      if (res.assigned === 0) {
        notify.info('Aucune cohorte non publiée à configurer');
      } else if (res.saturatedServices > 0) {
        const gap = res.totalStudents - res.totalCapacity;
        if (gap > 0) {
          notify.warning(
            `${res.assigned} affectation(s) générée(s) · ${res.saturatedServices} service(s) saturé(s). ` +
            `Il manque ${gap} place(s) — augmentez les capacités des services ou ajoutez de nouveaux services.`
          );
        } else {
          const unpublishedCohorts = schedule?.cohorts.filter((c) => !c.isSchedulePublished) ?? [];
          const avgStudents = unpublishedCohorts.length > 0
            ? Math.ceil(unpublishedCohorts.reduce((s, c) => s + c.studentCount, 0) / unpublishedCohorts.length)
            : 0;
          notify.warning(
            `${res.assigned} affectation(s) générée(s) · ${res.saturatedServices} service(s) saturé(s). ` +
            `Capacité insuffisante par service — chaque service doit pouvoir accueillir au moins ${avgStudents} étudiant(s).`
          );
        }
      } else {
        notify.success(`${res.assigned} affectation(s) générée(s) — aucun service saturé`);
      }
    } catch (err: unknown) {
      const detail = (err as { data?: { detail?: string } })?.data?.detail;
      notify.error(detail ?? 'Erreur lors de la répartition automatique');
    }
  };

  const slots = useMemo(() => schedule?.slots ?? [], [schedule]);
  const nextPeriodNumber = slots.length > 0 ? Math.max(0, ...slots.map((s) => s.periodNumber)) + 1 : 1;
  const visibleCohorts = useMemo(
    () => (activePartition
      ? (schedule?.cohorts ?? []).filter((c) => c.rotationGroup === activePartition)
      : (schedule?.cohorts ?? [])),
    [schedule, activePartition],
  );

  // Periods with no cell assigned in any visible cohort — i.e. the freshly-added columns.
  // Arranging only these continues the existing rotation instead of rewriting everything.
  const emptySlotPeriods = useMemo(
    () => slots
      .filter((_, i) => !visibleCohorts.some((c) => c.cells[i] != null))
      .map((s) => s.periodNumber),
    [slots, visibleCohorts],
  );

  // Stacking guard: when targeting one partition, warn if the chosen window already
  // holds cells from OTHER partitions (they'd share services in the same periods → saturation).
  const targetPeriodNumbers = useMemo(
    () => (autoArrangePeriods.length
      ? autoArrangePeriods.map(Number)
      : slots.map((s) => s.periodNumber)),
    [autoArrangePeriods, slots],
  );

  const conflictingPartitions = useMemo(
    () => (activePartition
      ? Array.from(new Set(
          (schedule?.cohorts ?? [])
            .filter((c) => c.rotationGroup && c.rotationGroup !== activePartition)
            .filter((c) => c.cells.some((cell, i) => cell && targetPeriodNumbers.includes(slots[i]?.periodNumber)))
            .map((c) => c.rotationGroup as string),
        )).sort()
      : []),
    [schedule, activePartition, targetPeriodNumbers, slots],
  );

  return (
    <>
      <Modal
        opened={opened}
        onClose={handleClose}
        title={
          <Group gap="sm">
            <ThemeIcon size={28} radius="md" variant="light" color="navy">
              <IconGridDots size={16} stroke={1.5} />
            </ThemeIcon>
            <Text fw={700} size="md">Grille de planning</Text>
          </Group>
        }
        radius="lg"
        size="90vw"
        scrollAreaComponent={ScrollArea.Autosize}
      >
        <Stack gap="md">
          {/* Controls */}
          <Group justify="space-between" wrap="nowrap" align="flex-start">
            <Group gap="xs" wrap="wrap">
              {schedule && schedule.cohorts.some((c) => c.isSchedulePublished) && (
                <Badge color="teal" variant="light" size="sm" leftSection={<IconCheck size={10} />}>
                  {schedule.cohorts.filter((c) => c.isSchedulePublished).length} publiée(s)
                </Badge>
              )}
              {schedule && schedule.cohorts.some((c) => !c.isSchedulePublished && c.cells.some((cell) => cell !== null)) && (
                <Badge color="orange" variant="light" size="sm">
                  {schedule.cohorts.filter((c) => !c.isSchedulePublished && c.cells.some((x) => x !== null)).length} configurée(s) non publiée(s)
                </Badge>
              )}
            </Group>
            <Group gap="xs" wrap="nowrap" align="flex-end">
              {schedule && <PublishAllButton stageId={stageId} cohorts={visibleCohorts} activePartition={activePartition} />}
              <Button
                size="xs" color="violet" variant="light" radius="md"
                leftSection={<IconArrowsShuffle size={12} stroke={1.5} />}
                loading={arranging}
                onClick={openAutoArrange}
              >
                Répartition auto.
              </Button>
              <Button
                size="xs" color="navy" variant="light" radius="md"
                leftSection={<IconPlus size={12} stroke={1.5} />}
                onClick={() => setAddSlotOpened(true)}
              >
                Ajouter créneau
              </Button>
            </Group>
          </Group>

          {/* Partition filter chips */}
          {partitions.length > 0 && (
            <Group gap="xs">
              <Text size="xs" c="dimmed" fw={500}>Partition :</Text>
              <Chip.Group
                value={activePartition ?? ''}
                onChange={(v) => {
                  const val = Array.isArray(v) ? (v[0] ?? '') : (v ?? '');
                  setActivePartition(val || null);
                }}
              >
                <Group gap="xs">
                  <Chip value="" size="xs" variant="light" color="violet">Toutes</Chip>
                  {partitions.map((p) => (
                    <Chip key={p} value={p} size="xs" variant="light" color="violet">{p}</Chip>
                  ))}
                </Group>
              </Chip.Group>
            </Group>
          )}

          {/* Legend */}
          <Group gap="md" wrap="nowrap">
            <Group gap={4}><Box w={12} h={12} style={{ borderRadius: 2, background: '#f0fdf4', border: '1px dashed #86efac' }} /><Text size="xs" c="dimmed">Service assigné</Text></Group>
            <Group gap={4}><Box w={12} h={12} style={{ borderRadius: 2, background: '#fafafa', border: '1px dashed #e2e8f0' }} /><Text size="xs" c="dimmed">Non assigné</Text></Group>
            <Group gap={4}><Badge size="xs" color="teal" variant="light">x/y</Badge><Text size="xs" c="dimmed">Étudiants planifiés / Capacité (OK)</Text></Group>
            <Group gap={4}><Badge size="xs" color="red" variant="light">x/y</Badge><Text size="xs" c="dimmed">Capacité dépassée</Text></Group>
          </Group>

          {/* Grid */}
          {isLoading ? (
            <Stack gap="xs">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={48} radius="md" />)}</Stack>
          ) : !schedule || (schedule.slots.length === 0 && schedule.cohorts.length === 0) ? (
            <Card padding="xl" radius="lg" withBorder>
              <Stack align="center" gap="xs">
                <IconCalendarTime size={32} stroke={1} color="#94A3B8" />
                <Text c="dimmed" size="sm">
                  {schedule?.cohorts.length === 0
                    ? 'Aucune cohorte dans ce stage. Créez des cohortes d\'abord.'
                    : 'Aucun créneau défini. Ajoutez un créneau pour commencer.'}
                </Text>
              </Stack>
            </Card>
          ) : (
            <>
              <SaturationSummary visibleCohorts={visibleCohorts} slots={schedule.slots} />
              <ScrollArea>
              <Table withTableBorder withColumnBorders fz="xs" style={{ minWidth: 400 + schedule.slots.length * 170 }}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th style={{ minWidth: 180, background: '#f8fafc' }}>
                      <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.5px' }}>Cohorte</Text>
                    </Table.Th>
                    {schedule.slots.map((slot) => (
                      <Table.Th key={slot.id} style={{ background: '#f8fafc', textAlign: 'center' }}>
                        <SlotHeader slot={slot} stageId={stageId} />
                      </Table.Th>
                    ))}
                    {schedule.slots.length === 0 && (
                      <Table.Th style={{ background: '#f8fafc' }}>
                        <Text size="xs" c="dimmed" ta="center">Ajoutez des créneaux →</Text>
                      </Table.Th>
                    )}
                    <Table.Th style={{ width: 48, background: '#f8fafc', textAlign: 'center' }}>
                      <Tooltip label="Publier / Dépublier" position="top"><IconRocket size={14} stroke={1.5} color="#94A3B8" /></Tooltip>
                    </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {visibleCohorts.map((row) => (
                    <Table.Tr key={row.cohortId} style={{ background: row.isSchedulePublished ? '#f0fdf450' : undefined }}>
                      <Table.Td>
                        <Group gap="xs" wrap="nowrap">
                          {row.isSchedulePublished
                            ? <IconCircleCheck size={14} stroke={1.5} color="#22c55e" style={{ flexShrink: 0 }} />
                            : <IconCircleX size={14} stroke={1.5} color="#cbd5e1" style={{ flexShrink: 0 }} />}
                          <Stack gap={0} style={{ overflow: 'hidden' }}>
                            <Group gap={4} wrap="nowrap">
                              <Text size="xs" fw={600} truncate>{row.cohortLabel}</Text>
                              {row.rotationGroup && (
                                <Badge size="xs" variant="dot" color="violet" radius="xl" style={{ flexShrink: 0 }}>{row.rotationGroup}</Badge>
                              )}
                            </Group>
                            <Text size="xs" c="dimmed" truncate>{row.academicGroupLabel} · {row.studentCount} étud.</Text>
                          </Stack>
                        </Group>
                      </Table.Td>
                      {schedule.slots.map((slot, i) => {
                        const cellData = row.cells[i] ?? null;
                        const isEditing = editing?.cohortId === row.cohortId && editing?.slotId === slot.id;
                        return (
                          <Table.Td key={slot.id} style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                            <Group justify="center">
                              {isEditing ? (
                                <ServicePicker
                                  cell={cellData}
                                  stageId={stageId}
                                  slotId={slot.id}
                                  cohortId={row.cohortId}
                                  allowedServiceIds={allowedServiceIds}
                                  onClose={() => setEditing(null)}
                                  onClear={(e) => { e.stopPropagation(); handleClearCell(row.cohortId, slot.id); }}
                                />
                              ) : (
                                <ServiceCell
                                  cell={cellData}
                                  cohortId={row.cohortId}
                                  slotId={slot.id}
                                  disabled={row.isSchedulePublished}
                                  clearing={clearingKey === `${row.cohortId}:${slot.id}`}
                                  onEdit={handleEditCell}
                                  onClear={handleClearCell}
                                />
                              )}
                            </Group>
                          </Table.Td>
                        );
                      })}
                      {schedule.slots.length === 0 && <Table.Td />}
                      <Table.Td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                        <Group justify="center">
                          <PublishButton cohortId={row.cohortId} stageId={stageId} isPublished={row.isSchedulePublished} />
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
            </>
          )}

          <Group justify="flex-end" pt="xs" style={{ borderTop: '1px solid #e2e8f0' }}>
            <Button variant="subtle" color="gray" onClick={handleClose}>Fermer</Button>
          </Group>
        </Stack>
      </Modal>

      <AddSlotModal
        opened={addSlotOpened}
        onClose={() => setAddSlotOpened(false)}
        stageId={stageId}
        nextPeriodNumber={nextPeriodNumber}
      />

      <Modal
        opened={autoArrangeOpen}
        onClose={closeAutoArrange}
        title="Répartition automatique"
        radius="md"
        size="md"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Répartit les services par rotation cyclique sur les cohortes non publiées.
            Les affectations existantes non publiées dans la sélection seront remplacées.
          </Text>

          <Card padding="xs" radius="md" withBorder bg="#faf5ff">
            <Text size="xs">
              Partition ciblée :{' '}
              <strong>{activePartition ? `Partition ${activePartition}` : 'Toutes les partitions'}</strong>
              {!activePartition && partitions.length > 0 && ' — utilisez les chips ci-dessus pour cibler une partition.'}
            </Text>
          </Card>

          <MultiSelect
            label="Fenêtre (créneaux)"
            description="Laisser vide pour répartir sur tous les créneaux"
            placeholder={autoArrangePeriods.length ? undefined : 'Tous les créneaux'}
            data={slots.map((s) => ({
              value: String(s.periodNumber),
              label: `P${s.periodNumber}${s.label ? ` — ${s.label}` : ''}`,
            }))}
            value={autoArrangePeriods}
            onChange={setAutoArrangePeriods}
            clearable
          />

          {emptySlotPeriods.length > 0 && (
            <Group gap="xs" wrap="wrap">
              <Button
                size="compact-xs"
                variant="light"
                color="violet"
                radius="md"
                onClick={() => setAutoArrangePeriods(emptySlotPeriods.map(String))}
              >
                Nouveaux créneaux uniquement ({emptySlotPeriods.length})
              </Button>
              <Text size="xs" c="dimmed">
                Cible les créneaux encore vides — la rotation existante n'est pas touchée.
              </Text>
            </Group>
          )}

          {conflictingPartitions.length > 0 && (
            <Alert icon={<IconAlertTriangle size={16} />} color="orange" variant="light" radius="md">
              Ces créneaux contiennent déjà les affectations de la partition{conflictingPartitions.length > 1 ? 's' : ''}{' '}
              <strong>{conflictingPartitions.join(', ')}</strong>. La partition {activePartition} partagerait alors les
              mêmes services sur les mêmes périodes (risque de saturation). Pour le modèle « A puis B », choisissez des
              périodes libres pour {activePartition}.
            </Alert>
          )}

          <Group justify="flex-end" pt="xs">
            <Button variant="subtle" color="gray" onClick={closeAutoArrange}>Annuler</Button>
            <Button color="violet" loading={arranging} onClick={handleAutoArrange}>Répartir</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
