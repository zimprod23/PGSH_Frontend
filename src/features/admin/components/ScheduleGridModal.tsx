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
  Pagination,
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
import type { SlotCellResponse, StageSlotResponse, StageScheduleSummary } from '../types/admin.types';
import { useNotify } from '../../../common/hooks/useNotify';
import { ConfirmModal } from '../../../common/components/ConfirmModal';
import { useAcademicYear } from '../contexts/useAcademicYear';

/**
 * Cohortes per page. Ten columns of ~8 Mantine components each is ~2 000 nodes at this size — enough
 * to fill any screen, small enough that mounting and unmounting the grid is instant. The whole
 * selection is still described by `summary`, which is what keeps a page from being mistaken for the
 * promotion.
 */
const PAGE_SIZE = 25;

// ─── Saturation summary bar ──────────────────────────────────────────────────

/**
 * The saturations « autoriser le dépassement d'effectif » will not lift: a promotion the service
 * does not take, and — since a service may now refuse the override — a service standing on its
 * number.
 *
 * ⚠ `forceable` is the server's, never re-derived from `reason`: the numbers of a firm service and
 * of a permissive one are identical, and only the service says which. `=== false` rather than
 * `!c.forceable` so an API predating the field reads as the old behaviour (forceable) instead of
 * marking every saturation as a wall.
 *
 * ⚠ The list is capped and the count is not, so a cap can hide more of these — except that the
 * server sorts the unforceable ones first, so the only ambiguous case is a cap reached entirely
 * inside them. That is what `capped` says, and it is why the sentence reads « au moins ».
 */
function unforceableSaturations(summary: StageScheduleSummary) {
  const rows = summary.saturations.filter((c) => c.forceable === false);
  const listed = summary.saturations.length;

  return { rows, capped: rows.length === listed && listed < summary.saturatedCellCount };
}

/** The half of those that is a firm service rather than an inadmissible promotion. */
function firmServiceSaturations(summary: StageScheduleSummary) {
  const { rows, capped } = unforceableSaturations(summary);
  const firm = rows.filter((c) => c.reason !== 'Refused');

  return { count: firm.length, capped, services: [...new Set(firm.map((c) => c.serviceName))] };
}

/**
 * The sentence under the publish checkbox. It has to name every power the box lacks, or an admin
 * ticks it, gets the same refusal, and concludes the screen is broken rather than that the plan is.
 */
function overCapacityCheckboxDescription(summary?: StageScheduleSummary): string {
  const base = "Publie malgré tout lorsqu'un service dépasse sa capacité totale ou le quota d'une "
    + "promotion. Ne force pas un service qui n'accueille pas cette promotion, "
    + "ni un service qui n'autorise pas le dépassement d'effectif.";

  if (!summary) return base;

  const firm = firmServiceSaturations(summary);
  if (firm.count === 0) return base;

  return `${base} ⚠ ${firm.capped ? 'Au moins ' : ''}${firm.count} affectation(s) portent sur `
    + `${firm.services.length} service(s) qui refusent le dépassement (${firm.services.slice(0, 3).join(', ')})`
    + ` : elles seront refusées quoi qu'il arrive.`;
}

function SaturationSummary(
  { summary }: { summary: StageScheduleSummary },
) {
  const [reportOpen, { open: openReport, close: closeReport }] = useDisclosure(false);

  // ⚠ Computed by the server, not here. It used to be folded out of the cells the client held,
  // which was correct only while the client held every cell: with the rows paged, a report built
  // from 25 visible cohortes would have named a fraction of the saturations and given a deficit
  // that shrank as you paged. The scope is the current selection — the same rows the publish button
  // beside it acts on — and `saturatedCellCount` stays exact even when the list below is capped.
  const saturated = summary.saturations;
  if (saturated.length === 0) return null;

  const unforceable = unforceableSaturations(summary);
  const top = saturated.slice(0, 3);
  const totalOverflow = saturated.reduce((sum, c) => sum + (c.occupiedSeats - c.capacity), 0);
  const listed = saturated.length;
  const total = summary.saturatedCellCount;

  return (
    <Card padding="sm" radius="md" withBorder style={{ borderColor: '#fca5a5', background: '#fff5f5' }}>
      <Stack gap={6}>
        <Group gap="xs" wrap="wrap" justify="space-between">
          <Group gap="xs" wrap="wrap">
            <Badge color="red" variant="light" radius="sm" size="sm">
              {total} affectation{total > 1 ? 's' : ''} saturée{total > 1 ? 's' : ''}
            </Badge>
            <Text size="xs" c="dimmed">
              Un service dépasse sa capacité — totale, ou le quota accordé à cette promotion.
              Ajustez la fiche du service ou répartissez sur d'autres services.
            </Text>
            {/* ⚠ Said here as well as in the publish dialog, because this bar is where somebody
                decides whether the plan is finished. « Saturé » alone reads as a warning to tick
                past; some of these cannot be ticked past at all. */}
            {unforceable.rows.length > 0 && (
              <Badge color="orange" variant="filled" radius="sm" size="sm">
                dont {unforceable.capped ? 'au moins ' : ''}{unforceable.rows.length} non forçable(s)
              </Badge>
            )}
          </Group>
          <Button size="compact-xs" variant="light" color="red" radius="md" onClick={openReport}>
            Voir le rapport
          </Button>
        </Group>
        <Group gap={6} wrap="wrap">
          {top.map((c) => (
            <Badge key={`${c.serviceId}-${c.stageSlotId}`} color="red" variant="outline" radius="sm" size="sm">
              {c.serviceName} · P{c.periodNumber} :{' '}
              {c.reason === 'Refused' ? 'promotion non admise' : `${c.occupiedSeats}/${c.capacity}`}
            </Badge>
          ))}
          {total > top.length && (
            <Text size="xs" c="dimmed">+{total - top.length} autre(s)</Text>
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
            {total} affectation(s) dépassent la capacité du service sur la période concernée.
            Augmentez la capacité du service à la valeur « requise » ou déplacez des groupes vers
            d'autres services.
          </Text>
          {/* A capped list must say it is capped, or the deficit below reads as the whole bill. */}
          {listed < total && (
            <Text size="xs" c="red" fw={600}>
              {listed} des {total} sont détaillées ici (les plus lourdes) — déficit des {listed}{' '}
              listées : {totalOverflow} place(s).
            </Text>
          )}
          {listed === total && (
            <Text size="xs" c="dimmed">
              Déficit total : <strong>{totalOverflow}</strong> place(s).
            </Text>
          )}
          <Table withTableBorder fz="xs" striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Service</Table.Th>
                <Table.Th ta="center">Période</Table.Th>
                <Table.Th ta="center">Motif</Table.Th>
                <Table.Th ta="center">Étud. / Cap.</Table.Th>
                <Table.Th ta="center">Requis</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {saturated.map((c) => (
                <Table.Tr key={`${c.serviceId}-${c.stageSlotId}`}>
                  <Table.Td>
                    <Stack gap={0}>
                      <Text size="xs" fw={600}>{c.serviceName}</Text>
                      <Text size="xs" c="dimmed">{c.hospitalName}</Text>
                    </Stack>
                  </Table.Td>
                  <Table.Td ta="center">P{c.periodNumber}</Table.Td>
                  <Table.Td ta="center">
                    <Stack gap={2} align="center">
                      <Text size="xs" c="dimmed">
                        {c.reason === 'Refused' ? 'Promotion non admise'
                          : c.reason === 'Quota' ? 'Quota promotion'
                          : 'Capacité totale'}
                      </Text>
                      {/* The row's whole point once services can refuse the override: two lines
                          reading « Capacité totale · 25/20 » are the same problem with opposite
                          remedies, and only this word separates them. */}
                      {c.forceable === false && (
                        <Badge color="orange" variant="light" radius="sm" size="xs">
                          non forçable
                        </Badge>
                      )}
                    </Stack>
                  </Table.Td>
                  <Table.Td ta="center">
                    <Badge color="red" variant="light" radius="sm" size="sm">
                      {c.reason === 'Refused' ? `${c.occupiedSeats} / —` : `${c.occupiedSeats}/${c.capacity}`}
                    </Badge>
                  </Table.Td>
                  <Table.Td ta="center">
                    <Text size="xs" fw={600} c="red">
                      {c.reason === 'Refused' ? 'Quota à créer' : `+${c.occupiedSeats - c.capacity}`}
                    </Text>
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

interface CellFaceProps extends React.ComponentPropsWithRef<'div'> {
  cell: SlotCellResponse | null;
  loading?: boolean;
  disabled?: boolean;
  onClear?: (e: React.MouseEvent) => void;
}

// ⚠ It must accept and forward `ref`. `Popover.Target` anchors its dropdown by putting a ref on its
// child; a component that swallows the ref leaves the popover with no anchor, and the service picker
// then opened detached from the cell it belongs to — the reason the search box appeared somewhere
// above the grid. React 19 passes `ref` as an ordinary prop, so no forwardRef is needed, but it does
// have to reach a real DOM node. The rest props matter too: Popover puts aria-* and its handlers there.
function CellFace({ cell, loading, disabled, onClick, onClear, ref, ...rest }: CellFaceProps) {
  // One badge, because one limit governs: the promotion's quota on a restricted service, the
  // service's own total otherwise. The backend already picked which, and counted the load to match.
  const capacityOk = !cell || (cell.admitsLevel && cell.occupiedSeats <= cell.capacity);
  const capacityColor = !cell ? 'gray' : capacityOk ? 'teal' : 'red';

  return (
    <Box
      ref={ref}
      onClick={onClick}
      {...rest}
      title={cell?.isPublished
        ? 'Cellule publiée : des périodes ont été matérialisées à partir d’elle.'
        : undefined}
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
              <Group gap={3} wrap="nowrap">
                {/* ⚠ Per cell, from the server's coverage read — not from the row. Under a
                    single-service stage one période covers a whole run, so the trailing columns of a
                    published run are published too and nothing on this grid used to say so. A native
                    title again: this renders once per cell. */}
                {cell.isPublished && (
                  <IconRocket
                    size={10}
                    stroke={1.5}
                    color="#16a34a"
                    style={{ flexShrink: 0 }}
                  />
                )}
                <Text size="xs" fw={600} truncate style={{ maxWidth: 100 }}>{cell.serviceName}</Text>
              </Group>
              <Text size="xs" c="dimmed" truncate style={{ maxWidth: 100 }}>{cell.hospitalName}</Text>
            </Stack>
            {/* A published cell cannot be cleared — the périodes materialised from it are what the
                chefs and the attendance hang off, and only « Dépublier » may undo that, naming what
                it costs. Refused server-side; said here so the refusal is not the way it is learnt. */}
            <ActionIcon
              size={12}
              variant="transparent"
              color="red"
              disabled={cell.isPublished}
              title={cell.isPublished
                ? 'Cellule publiée : dépubliez la cohorte avant de la retirer.'
                : undefined}
              onClick={onClear}
              style={{ flexShrink: 0 }}
            >
              <IconX size={10} />
            </ActionIcon>
          </Group>
          <Group gap={4} wrap="nowrap">
            {/* A native title, not a Mantine Tooltip. This renders once per cell, and a promotion
                of 80 groups over 4 periods is 320 of them — 320 floating-ui instances were most of
                the seconds this modal took to open and to close. */}
            <Badge
              size="xs"
              radius="xl"
              color={capacityColor}
              variant="light"
              title={
                !cell.admitsLevel
                  ? "Ce service n'accueille pas cette promotion — la publication sera refusée. Choisissez un autre service, ou ajoutez-lui un quota pour cette promotion."
                  : cell.isLevelQuota
                    ? capacityOk
                      ? `${cell.occupiedSeats} étudiant(s) de cette promotion — quota de ${cell.capacity} places dans ce service`
                      : `${cell.occupiedSeats} étudiant(s) de cette promotion pour un quota de ${cell.capacity} — la publication sera refusée. Déplacez des groupes, ou portez le quota à ${cell.occupiedSeats} depuis la fiche du service.`
                    : capacityOk
                      ? `${cell.occupiedSeats} étudiant(s), toutes promotions confondues — dans la limite des ${cell.capacity} places`
                      : `${cell.occupiedSeats} étudiant(s), toutes promotions confondues, pour ${cell.capacity} places — augmentez la capacité du service à ${cell.occupiedSeats} pour éviter la saturation`
              }
            >
              {cell.admitsLevel ? `${cell.occupiedSeats} / ${cell.capacity}` : 'Non admis'}
            </Badge>
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
    // Anchored under the cell and portalled out of the grid's ScrollArea, so it is never clipped by
    // the scroll container and flips above only when there is genuinely no room below.
    <Popover
      opened={opened}
      onChange={handlePopoverChange}
      position="bottom-start"
      withinPortal
      trapFocus
      middlewares={{ flip: true, shift: true }}
      withArrow
      shadow="md"
      radius="md"
      width={300}
    >
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
                  // An empty whitelist means "not configured", and manual assignment stays open —
                  // matching SetCohortSlotAssignmentCommandHandler, which only enforces the list
                  // when the stage actually has one. Only RotationArranger refuses, because it has
                  // no set to rotate through; that is why StageDetailPage's warning is scoped to
                  // «la répartition automatique» and not to planning as a whole.
                  // ⚠ Known limitation: the filter is applied to one page of 20 search results, so a
                  // whitelisted service ranked past the 20th match is invisible. Needs a server-side
                  // filter on /services to fix properly.
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
  academicYearId: number;
  nextPeriodNumber: number;
}

function AddSlotModal({ opened, onClose, stageId, academicYearId, nextPeriodNumber }: AddSlotModalProps) {
  const notify = useNotify();
  const [createSlot, { isLoading }] = useCreateStageSlotMutation();
  const [form, setForm] = useState({ label: '', startDate: '', endDate: '' });

  const handleSubmit = async () => {
    try {
      await createSlot({
        stageId,
        academicYearId,
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

// One icon per row and nothing else — no mutation hook, no confirm modal, no Tooltip. Those used to
// be per-row: 80 cohorts meant 160 RTK subscriptions and 80 mounted Mantine Modals, which together
// with the cell tooltips is what made this grid take seconds to open *and* to close. The dialogs and
// the mutations now live once in the parent, keyed by the row being acted on.
const PublishButton = memo(function PublishButton(
  { cohortId, isPublished, busy, onPublish, onUnpublish }: {
    cohortId: number;
    isPublished: boolean;
    busy: boolean;
    onPublish: (cohortId: number) => void;
    onUnpublish: (cohortId: number) => void;
  },
) {
  return isPublished ? (
    <ActionIcon
      size="sm" variant="subtle" color="red" loading={busy}
      title="Dépublier"
      onClick={() => onUnpublish(cohortId)}
    >
      <IconRocketOff size={14} stroke={1.5} />
    </ActionIcon>
  ) : (
    <ActionIcon
      size="sm" variant="subtle" color="teal" loading={busy}
      title="Publier le planning"
      onClick={() => onPublish(cohortId)}
    >
      <IconRocket size={14} stroke={1.5} />
    </ActionIcon>
  );
});

// ─── Publish all unpublished cohorts ─────────────────────────────────────────

function PublishAllButton(
  { stageId, academicYearId, publishableCount, activePartition, summary }: {
    stageId: number;
    academicYearId?: number;
    /** Read only to say what the checkbox below cannot lift — see {@link overCapacityCheckboxDescription}. */
    summary: StageScheduleSummary;
    /**
     * ⚠ The server's count over the whole selection, never the visible rows'. With the grid paged,
     * counting what the client holds would have offered « Publier tout (25) » on a selection of 90
     * — and the call it fires publishes all 90.
     */
    publishableCount: number;
    activePartition: string | null;
  },
) {
  const notify = useNotify();
  const [publishStage, { isLoading: loading }] = usePublishStageScheduleMutation();
  const [confirmOpen, { open, close }] = useDisclosure(false);
  const [allowOverCapacity, setAllowOverCapacity] = useState(false);

  const handlePublishAll = async () => {
    close();
    try {
      const res = await publishStage({
        stageId,
        academicYearId,
        partitionLabels: activePartition ? [activePartition] : undefined,
        allowOverCapacity,
      }).unwrap();
      notify.success(`${res.publishedCohorts} cohorte(s) publiée(s) · ${res.periodsCreated} période(s)`);
    } catch (err: unknown) {
      const detail = (err as { data?: { detail?: string } })?.data?.detail;
      notify.error(detail ?? 'Erreur lors de la publication');
    }
  };

  if (publishableCount === 0) return null;

  const scopeLabel = activePartition ? `partition ${activePartition}` : 'toutes les partitions';

  return (
    <>
      <Button
        size="xs" color="teal" variant="light" radius="md"
        leftSection={<IconRocket size={12} stroke={1.5} />}
        loading={loading}
        onClick={open}
      >
        Publier tout ({publishableCount})
      </Button>
      <ConfirmModal
        opened={confirmOpen}
        onClose={close}
        title="Publier les cohortes"
        message={`Publier le planning de ${publishableCount} cohorte(s) configurée(s) (${scopeLabel}) ?`}
        confirmLabel="Publier"
        confirmColor="teal"
        onConfirm={handlePublishAll}
        loading={loading}
      >
        <Checkbox
          checked={allowOverCapacity}
          onChange={(e) => setAllowOverCapacity(e.currentTarget.checked)}
          label="Autoriser le dépassement d'effectif"
          /* Was also promising to force a service that does not admit the promotion, and the server
             used to honour that. It no longer does — and since a chef may now refuse the override on
             his own service, there is a second power it lacks. A checkbox describing a power it
             lacks is worse than no checkbox: the admin ticks it, gets the same refusal, and
             concludes the screen is broken rather than that the plan is. */
          description={overCapacityCheckboxDescription(summary)}
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
  // Periods belong to a (stage, year) pair, so the grid always works against one year: the caller's
  // if it passed one, otherwise whatever the navbar is showing.
  const { currentYearId } = useAcademicYear();
  const yearId = academicYearId ?? currentYearId ?? undefined;
  const [addSlotOpened, setAddSlotOpened]   = useState(false);
  const [activePartition, setActivePartition] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [autoArrangePeriods, setAutoArrangePeriods] = useState<string[]>([]);
  const [autoArrangeOpen, { open: openAutoArrange, close: closeAutoArrange }] = useDisclosure(false);
  const [editing, setEditing] = useState<{ cohortId: number; slotId: number } | null>(null);
  const [clearingKey, setClearingKey] = useState<string | null>(null);

  // ⚠ Paged, and filtered by partition on the server. A promotion is ~105 cohortes over ten columns:
  // a thousand cells shipped and a thousand cell components mounted, which is what made this modal
  // take seconds to open — and seconds to *close*, where there is no request at all to blame.
  // `isFetching` rather than `isLoading` so paging shows the page is changing instead of freezing on
  // the previous one.
  const { data: schedule, isLoading, isFetching } = useGetStageScheduleQuery(
    { stageId, academicYearId: yearId, rotationGroup: activePartition, pageNumber: page, pageSize: PAGE_SIZE },
    { skip: !opened },
  );
  const [autoArrange, { isLoading: arranging }] = useAutoArrangeStageScheduleMutation();
  const [clearAssignment] = useClearCohortSlotAssignmentMutation();

  // Publish/unpublish live here, once, rather than in each of the 80 rows.
  const [publish, { isLoading: publishing }] = usePublishScheduleMutation();
  const [unpublish, { isLoading: unpublishing }] = useUnpublishScheduleMutation();
  const [publishTarget, setPublishTarget] = useState<number | null>(null);
  const [unpublishTarget, setUnpublishTarget] = useState<number | null>(null);
  const [allowOverCapacity, setAllowOverCapacity] = useState(false);
  const busyCohortId = publishing ? publishTarget : unpublishing ? unpublishTarget : null;

  const handleClose = useCallback(() => { setEditing(null); onClose(); }, [onClose]);

  // Changing the filter must land on page 1: page 3 of « toutes » is past the end of most partitions,
  // and an out-of-range page answers with an empty grid that reads exactly like an empty partition.
  const selectPartition = useCallback((label: string | null) => {
    setActivePartition(label);
    setPage(1);
    setEditing(null);
  }, []);

  const askPublish = useCallback((cohortId: number) => {
    setAllowOverCapacity(false);
    setPublishTarget(cohortId);
  }, []);

  const askUnpublish = useCallback((cohortId: number) => setUnpublishTarget(cohortId), []);

  // The target is cleared only once the call has settled. Clearing it first left `busyCohortId`
  // null for the whole request, so the row's spinner and the dialog's loading state never showed
  // and nothing stopped a second publish being fired meanwhile.
  const confirmPublish = useCallback(async () => {
    if (publishTarget == null) return;
    try {
      await publish({ cohortId: publishTarget, stageId, allowOverCapacity }).unwrap();
      notify.success('Planning publié');
    } catch {
      // ⚠ Rien ici. `errorMiddleware` a déjà affiché le refus **dans les mots du serveur** ; le
      //   doubler affichait deux fois la même phrase — vu le 06/09/2026 sur le refus d'un service
      //   qui n'autorise pas le dépassement, en « Conflit » puis en « Erreur ». Le `catch` reste
      //   parce que `unwrap()` rejette et qu'une promesse rejetée non traitée n'est pas un refus.
    } finally {
      setPublishTarget(null);
    }
  }, [publishTarget, publish, stageId, allowOverCapacity, notify]);

  const confirmUnpublish = useCallback(async () => {
    if (unpublishTarget == null) return;
    try {
      // Never forced here. The grid is for editing a plan; a rotation already underway is refused,
      // and the server's message says what it would have cost. Forcing it through is done from the
      // stage page, which shows that message and asks a second time.
      const res = await unpublish({ cohortId: unpublishTarget, stageId }).unwrap();
      notify.success(`${res.periodsRemoved} période(s) supprimée(s)`);
    } catch (error) {
      const problem = error as { data?: { detail?: string } };
      notify.error(problem.data?.detail ?? 'Erreur lors de la dépublication');
    }
    finally { setUnpublishTarget(null); }
  }, [unpublishTarget, unpublish, stageId, notify]);

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

  // The stage's partitions, from the server and never narrowed by the active filter — they are what
  // the user filters *with*, so deriving them from the filtered rows would leave no way back.
  const partitions = schedule?.summary.partitions ?? [];

  const handleAutoArrange = async () => {
    closeAutoArrange();
    try {
      const res = await autoArrange({
        stageId,
        academicYearId: yearId,
        partitionLabels: activePartition ? [activePartition] : undefined,
        periodNumbers: autoArrangePeriods.length ? autoArrangePeriods.map(Number) : undefined,
      }).unwrap();
      // Conflicts and saturation are independent outcomes of one run, so they are composed rather
      // than chained: an else-if reported the conflicts and silently swallowed "il manque N places",
      // which is the message that tells the admin the plan will not fit at all.
      const problems: string[] = [];

      if (res.groupConflicts > 0) {
        problems.push(
          `${res.groupConflicts} affectation(s) ignorée(s) : ces groupes sont déjà affectés à un ` +
          'autre stage sur les mêmes dates — ciblez une partition (A / B) avant de répartir.'
        );
      }

      if (res.saturatedServices > 0) {
        const gap = res.totalStudents - res.totalCapacity;
        if (gap > 0) {
          problems.push(
            `${res.saturatedServices} service(s) saturé(s) — il manque ${gap} place(s) : augmentez ` +
            'les capacités ou ajoutez de nouveaux services.'
          );
        } else {
          // Averaged over the rows on screen, and said so: this is advice about how big a service
          // has to be, not a count anybody acts on, and the exact figures live in the saturation
          // report — which the server computes over the whole selection.
          const sample = (schedule?.cohorts.items ?? []).filter((c) => !c.isSchedulePublished);
          // Délocalisés excluded, exactly as the server measures a cell's load: advising a capacity
          // for students who are not in the country is advice for a problem nobody has.
          const avgStudents = sample.length > 0
            ? Math.ceil(
                sample.reduce((sum, c) => sum + Math.max(0, c.studentCount - c.delocalizedCount), 0)
                / sample.length)
            : 0;
          problems.push(
            `${res.saturatedServices} service(s) saturé(s) — capacité insuffisante par service : ` +
            `chaque service doit pouvoir accueillir au moins ${avgStudents} étudiant(s).`
          );
        }
      }

      if (problems.length > 0) {
        notify.warning(`${res.assigned} affectation(s) générée(s). ${problems.join(' ')}`);
      } else if (res.assigned === 0) {
        notify.info('Aucune cohorte non publiée à configurer');
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
  const summary = schedule?.summary;
  // The rows of this page. The counts the screen states come from `summary`, never from these —
  // a bounded list can only describe itself.
  const rows = schedule?.cohorts.items ?? [];
  const totalPages = schedule ? Math.max(1, Math.ceil(schedule.cohorts.totalCount / schedule.cohorts.pageSize)) : 1;

  // Why "Répartition auto." cannot run yet, or null when it can. Mirrors the two guards
  // RotationArranger returns, so the user reads the reason on a disabled button instead of
  // discovering it in an error toast.
  const autoArrangeBlockedReason =
    slots.length === 0
      ? 'Aucune période définie pour cette année — ajoutez d’abord un créneau.'
      : allowedServiceIds.length === 0
      ? 'Aucun service autorisé pour ce stage — configurez-les avant de répartir.'
      : (summary?.totalCohorts ?? 0) === 0
      ? 'Aucune cohorte à répartir dans cette sélection.'
      : null;

  // Columns nobody in the selection stands in — i.e. the freshly-added ones. Arranging only these
  // continues the existing rotation instead of rewriting it.
  //
  // ⚠ From the server's `occupiedSlotIds`, which covers the whole selection. Read off the rows on
  // screen it would call a column empty because this page's 25 cohortes are not in it, and the
  // « nouveaux créneaux uniquement » button would then quietly rewrite a column already arranged.
  const emptySlotPeriods = useMemo(
    () => {
      const occupied = new Set(summary?.occupiedSlotIds ?? []);
      return slots.filter((s) => !occupied.has(s.id)).map((s) => s.periodNumber);
    },
    [slots, summary],
  );

  // Stacking guard: when targeting one partition, warn if the chosen window already
  // holds cells from OTHER partitions (they'd share services in the same periods → saturation).
  const targetPeriodNumbers = useMemo(
    () => (autoArrangePeriods.length
      ? autoArrangePeriods.map(Number)
      : slots.map((s) => s.periodNumber)),
    [autoArrangePeriods, slots],
  );

  // ⚠ From `summary.partitionUsage`, which the server reads across the WHOLE stage. This warning is
  // about the partitions the filter has just removed, so the rows on screen — filtered to the
  // targeted partition — are precisely the ones that can never answer it.
  const conflictingPartitions = useMemo(
    () => {
      if (!activePartition) return [];
      const targeted = new Set(
        slots.filter((s) => targetPeriodNumbers.includes(s.periodNumber)).map((s) => s.id),
      );
      return Array.from(new Set(
        (summary?.partitionUsage ?? [])
          .filter((u) => u.rotationGroup && u.rotationGroup !== activePartition && targeted.has(u.stageSlotId))
          .map((u) => u.rotationGroup as string),
      )).sort();
    },
    [summary, activePartition, targetPeriodNumbers, slots],
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
        /* The exit transition keeps the whole grid mounted while it plays, so « Fermer » felt as slow
           as opening did even after the rows were paged. Nothing here is worth animating. */
        transitionProps={{ duration: 0 }}
      >
        <Stack gap="md">
          {/* Controls */}
          <Group justify="space-between" wrap="nowrap" align="flex-start">
            {/* Every number here is the server's, over the whole selection — see StageScheduleSummary. */}
            <Group gap="xs" wrap="wrap">
              {summary && (
                <Badge color="gray" variant="light" size="sm">
                  {summary.totalCohorts} cohorte(s)
                </Badge>
              )}
              {summary && summary.publishedCohorts > 0 && (
                <Badge color="teal" variant="light" size="sm" leftSection={<IconCheck size={10} />}>
                  {summary.publishedCohorts} publiée(s)
                </Badge>
              )}
              {summary && summary.configuredUnpublishedCohorts > 0 && (
                <Badge color="orange" variant="light" size="sm">
                  {summary.configuredUnpublishedCohorts} configurée(s) non publiée(s)
                </Badge>
              )}
            </Group>
            <Group gap="xs" wrap="nowrap" align="flex-end">
              {summary && (
                <PublishAllButton
                  stageId={stageId}
                  academicYearId={yearId}
                  publishableCount={summary.configuredUnpublishedCohorts}
                  activePartition={activePartition}
                  summary={summary}
                />
              )}
              {/* Both preconditions the server enforces (Schedule.NoSlots / NoAllowedServices), stated
                  before the click rather than as a toast after it. The slots one is not hypothetical:
                  the legacy import carried no planning grid, so every stage starts with zero periods. */}
              <Tooltip label={autoArrangeBlockedReason} disabled={autoArrangeBlockedReason == null} multiline w={260}>
                <Button
                  size="xs" color="violet" variant="light" radius="md"
                  leftSection={<IconArrowsShuffle size={12} stroke={1.5} />}
                  loading={arranging}
                  disabled={autoArrangeBlockedReason != null}
                  onClick={openAutoArrange}
                >
                  Répartition auto.
                </Button>
              </Tooltip>
              <Tooltip
                label="Sélectionnez une année universitaire dans la barre de navigation."
                disabled={yearId != null}
              >
                <Button
                  size="xs" color="navy" variant="light" radius="md"
                  leftSection={<IconPlus size={12} stroke={1.5} />}
                  disabled={yearId == null}
                  onClick={() => setAddSlotOpened(true)}
                >
                  Ajouter créneau
                </Button>
              </Tooltip>
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
                  selectPartition(val || null);
                }}
              >
                <Group gap="xs">
                  <Chip value="" size="xs" variant="light" color="violet">Toutes</Chip>
                  {partitions.map((p) => (
                    <Chip key={p.label} value={p.label} size="xs" variant="light" color="violet">
                      {p.label} ({p.cohortCount})
                    </Chip>
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
          ) : !schedule || (schedule.slots.length === 0 && schedule.cohorts.totalCount === 0) ? (
            <Card padding="xl" radius="lg" withBorder>
              <Stack align="center" gap="xs">
                <IconCalendarTime size={32} stroke={1} color="#94A3B8" />
                <Text c="dimmed" size="sm" ta="center">
                  Ni cohorte ni créneau pour cette année.
                </Text>
                {/* ⚠ The server's sentence, not one written here. A blank table has three causes —
                    this year predates the planning grid, no axis has been laid, or the axis is laid
                    and nobody is arranged into it — and only the store can tell them apart. Reading
                    the first as the second is how an axis gets laid over a year already served. */}
                <Text c="dimmed" size="xs" ta="center" maw={380}>
                  {schedule?.summary.emptyGridNote
                    ?? 'Créez les cohortes du stage, puis ajoutez ses créneaux (P1, P2…) — ils sont '
                       + 'propres à chaque année universitaire.'}
                </Text>
              </Stack>
            </Card>
          ) : (
            <>
              {/* Silent as soon as one cell exists — a note that fires whatever the data says is
                  noise, and noise is dismissed, which puts the real one out of sight. */}
              {schedule.summary.emptyGridNote && (
                <Alert
                  icon={<IconCalendarTime size={16} />}
                  color={schedule.summary.declaredSlotCount === 0 ? 'gray' : 'blue'}
                  variant="light"
                  radius="md"
                >
                  <Text size="xs">{schedule.summary.emptyGridNote}</Text>
                </Alert>
              )}
              <SaturationSummary summary={schedule.summary} />
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
                  {rows.map((row) => (
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
                            {/* ⚠ « dont N hors CHU » is not decoration. The cells below are loaded
                                with studentCount − delocalizedCount, so a roster délocalisé en masse
                                shows a full membership beside cells carrying nothing — which reads as
                                a bug, and the next person re-arranges everyone back into the CHU.
                                Drawn on the rare state only: 0 is the ordinary case. */}
                            <Text size="xs" c="dimmed" truncate>
                              {row.academicGroupLabel} · {row.studentCount} étud.
                              {row.delocalizedCount > 0 && (
                                <Text span size="xs" c="teal.7" fw={500}>
                                  {' '}· dont {row.delocalizedCount} hors CHU
                                </Text>
                              )}
                            </Text>
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
                          <PublishButton
                            cohortId={row.cohortId}
                            isPublished={row.isSchedulePublished}
                            busy={busyCohortId === row.cohortId}
                            onPublish={askPublish}
                            onUnpublish={askUnpublish}
                          />
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>

            {/* ⚠ States the whole selection, not the page. A paged grid has a failure mode the
                unbounded one did not: the last page of a partition looks exactly like a promotion
                nobody has cut, and « 26-50 sur 105 » is what tells the two apart. */}
            <Group justify="space-between" wrap="wrap" gap="xs">
              <Text size="xs" c="dimmed">
                {schedule.cohorts.totalCount === 0
                  ? 'Aucune cohorte dans cette sélection.'
                  : `${(schedule.cohorts.pageNumber - 1) * schedule.cohorts.pageSize + 1}`
                    + `–${Math.min(schedule.cohorts.pageNumber * schedule.cohorts.pageSize, schedule.cohorts.totalCount)}`
                    + ` sur ${schedule.cohorts.totalCount} cohorte(s)`
                    + (activePartition ? ` — partition ${activePartition}` : '')}
              </Text>
              <Group gap="xs" wrap="nowrap">
                {isFetching && <Loader size={12} />}
                {totalPages > 1 && (
                  <Pagination
                    size="sm"
                    radius="md"
                    withEdges
                    total={totalPages}
                    value={schedule.cohorts.pageNumber}
                    onChange={(p) => { setEditing(null); setPage(p); }}
                  />
                )}
              </Group>
            </Group>
            </>
          )}

          <Group justify="flex-end" pt="xs" style={{ borderTop: '1px solid #e2e8f0' }}>
            <Button variant="subtle" color="gray" onClick={handleClose}>Fermer</Button>
          </Group>
        </Stack>
      </Modal>

      {yearId != null && (
        <AddSlotModal
          opened={addSlotOpened}
          onClose={() => setAddSlotOpened(false)}
          stageId={stageId}
          academicYearId={yearId}
          nextPeriodNumber={nextPeriodNumber}
        />
      )}

      {/* One instance each, driven by which row was clicked — not one pair per row. */}
      <ConfirmModal
        opened={publishTarget != null}
        onClose={() => setPublishTarget(null)}
        title="Publier le planning"
        message="Générer les périodes de service de cette cohorte ?"
        confirmLabel="Publier"
        confirmColor="teal"
        onConfirm={confirmPublish}
        loading={publishing}
      >
        <Checkbox
          checked={allowOverCapacity}
          onChange={(e) => setAllowOverCapacity(e.currentTarget.checked)}
          label="Autoriser le dépassement d'effectif"
          /* Was also promising to force a service that does not admit the promotion, and the server
             used to honour that. It no longer does — and since a chef may now refuse the override on
             his own service, there is a second power it lacks. A checkbox describing a power it
             lacks is worse than no checkbox: the admin ticks it, gets the same refusal, and
             concludes the screen is broken rather than that the plan is. */
          description={overCapacityCheckboxDescription(summary)}
          color="orange"
        />
      </ConfirmModal>

      <ConfirmModal
        opened={unpublishTarget != null}
        onClose={() => setUnpublishTarget(null)}
        title="Dépublier le planning"
        message="Les périodes de service générées seront supprimées."
        confirmLabel="Dépublier"
        confirmColor="red"
        onConfirm={confirmUnpublish}
        loading={unpublishing}
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
