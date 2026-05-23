import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Combobox,
  Group,
  InputBase,
  Loader,
  Modal,
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
import {
  IconCalendarTime,
  IconCheck,
  IconCircleCheck,
  IconCircleX,
  IconGridDots,
  IconPlus,
  IconRocket,
  IconRocketOff,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { useState, useCallback } from 'react';
import {
  useGetStageScheduleQuery,
  useCreateStageSlotMutation,
  useDeleteStageSlotMutation,
  useSetCohortSlotAssignmentMutation,
  useClearCohortSlotAssignmentMutation,
  usePublishScheduleMutation,
  useUnpublishScheduleMutation,
  useGetServicesQuery,
} from '../api/adminApi';
import type { SlotCellResponse, StageSlotResponse } from '../types/admin.types';
import { useNotify } from '../../../common/hooks/useNotify';

// ─── Service search combobox (per cell) ──────────────────────────────────────

interface ServicePickerProps {
  cell: SlotCellResponse | null;
  stageId: number;
  slotId: number;
  cohortId: number;
  studentCount: number;
  disabled?: boolean;
}

function ServicePicker({ cell, stageId, slotId, cohortId, studentCount, disabled }: ServicePickerProps) {
  const notify = useNotify();
  const [opened, setOpened] = useState(false);
  const [search, setSearch] = useState('');
  const combobox = useCombobox({ onDropdownClose: () => combobox.resetSelectedOption() });

  const { data: servicesPage, isFetching } = useGetServicesQuery(
    { searchTerm: search, pageSize: 20 },
    { skip: search.length < 2 },
  );

  const [setAssignment, { isLoading: setting }] = useSetCohortSlotAssignmentMutation();
  const [clearAssignment, { isLoading: clearing }] = useClearCohortSlotAssignmentMutation();

  const isLoading = setting || clearing;

  const handleSelect = useCallback(async (serviceId: number) => {
    try {
      await setAssignment({ stageId, slotId, cohortId, serviceId }).unwrap();
      setOpened(false);
      setSearch('');
    } catch { notify.error('Impossible de définir ce service'); }
  }, [stageId, slotId, cohortId, setAssignment, notify]);

  const handleClear = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try { await clearAssignment({ stageId, slotId, cohortId }).unwrap(); }
    catch { notify.error('Impossible de supprimer cette affectation'); }
  }, [stageId, slotId, cohortId, clearAssignment, notify]);

  const capacityOk = !cell || (cell.occupiedSeats + studentCount <= cell.serviceCapacity);
  const capacityColor = !cell ? 'gray' : capacityOk ? 'teal' : 'red';

  return (
    <Popover opened={opened} onChange={setOpened} withArrow shadow="md" radius="md" width={300}>
      <Popover.Target>
        <Box
          onClick={() => !disabled && !isLoading && setOpened((o) => !o)}
          style={{
            display: 'flex', flexDirection: 'column', gap: 2,
            padding: '6px 8px',
            borderRadius: rem(6),
            cursor: disabled || isLoading ? 'default' : 'pointer',
            minWidth: 130,
            background: cell ? '#f0fdf4' : '#fafafa',
            border: `1px dashed ${cell ? '#86efac' : '#e2e8f0'}`,
            transition: 'background 120ms',
          }}
        >
          {isLoading ? (
            <Loader size={12} />
          ) : cell ? (
            <>
              <Group gap={4} wrap="nowrap" justify="space-between">
                <Text size="xs" fw={600} truncate style={{ maxWidth: 100 }}>{cell.serviceName}</Text>
                <ActionIcon size={12} variant="transparent" color="red" onClick={handleClear} style={{ flexShrink: 0 }}>
                  <IconX size={10} />
                </ActionIcon>
              </Group>
              <Group gap={4} wrap="nowrap">
                <Badge size="xs" radius="xl" color={capacityColor} variant="light">
                  {cell.occupiedSeats + studentCount} / {cell.serviceCapacity}
                </Badge>
              </Group>
            </>
          ) : (
            <Text size="xs" c="dimmed" ta="center" style={{ lineHeight: '28px' }}>— Vide —</Text>
          )}
        </Box>
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
                  servicesPage.items.map((s) => (
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
          onChange={(e) => setForm((f) => ({ ...f, label: e.currentTarget.value }))} />
        <Group grow>
          <TextInput type="date" label="Début" value={form.startDate}
            onChange={(e) => setForm((f) => ({ ...f, startDate: e.currentTarget.value }))} required />
          <TextInput type="date" label="Fin" value={form.endDate} min={form.startDate}
            onChange={(e) => setForm((f) => ({ ...f, endDate: e.currentTarget.value }))} required />
        </Group>
        <Group justify="flex-end" pt="xs">
          <Button variant="subtle" color="gray" onClick={onClose}>Annuler</Button>
          <Button color="navy" loading={isLoading} disabled={!canSubmit} onClick={handleSubmit}>Ajouter</Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// ─── Column header with delete ────────────────────────────────────────────────

function SlotHeader({ slot, stageId }: { slot: StageSlotResponse; stageId: number }) {
  const notify = useNotify();
  const [deleteSlot, { isLoading }] = useDeleteStageSlotMutation();

  const handleDelete = async () => {
    if (!window.confirm(`Supprimer le créneau P${slot.periodNumber} ? Les affectations seront aussi supprimées.`)) return;
    try { await deleteSlot({ stageId, slotId: slot.id }).unwrap(); notify.success(`Créneau P${slot.periodNumber} supprimé`); }
    catch { notify.error('Impossible de supprimer ce créneau'); }
  };

  return (
    <Stack gap={2} align="center" style={{ minWidth: 150 }}>
      <Group gap={4} wrap="nowrap" justify="center">
        <Text size="xs" fw={700} c="navy.7">P{slot.periodNumber}{slot.label ? ` — ${slot.label}` : ''}</Text>
        <ActionIcon size={14} variant="subtle" color="red" loading={isLoading} onClick={handleDelete}>
          <IconTrash size={10} />
        </ActionIcon>
      </Group>
      <Text size="xs" c="dimmed" ff="monospace">
        {slot.startDate} → {slot.endDate}
      </Text>
    </Stack>
  );
}

// ─── Publish button per cohort ────────────────────────────────────────────────

function PublishButton({ cohortId, stageId, isPublished }: { cohortId: number; stageId: number; isPublished: boolean }) {
  const notify = useNotify();
  const [publish, { isLoading: publishing }] = usePublishScheduleMutation();
  const [unpublish, { isLoading: unpublishing }] = useUnpublishScheduleMutation();
  const loading = publishing || unpublishing;

  const handlePublish = async () => {
    try { await publish({ cohortId, stageId }).unwrap(); notify.success('Planning publié'); }
    catch { notify.error('Erreur lors de la publication'); }
  };

  const handleUnpublish = async () => {
    if (!window.confirm('Dépublier ? Les périodes de service générées seront supprimées.')) return;
    try {
      const res = await unpublish({ cohortId, stageId }).unwrap();
      notify.success(`${res.removed} période(s) supprimée(s)`);
    } catch { notify.error('Erreur lors de la dépublication'); }
  };

  if (isPublished) {
    return (
      <Tooltip label="Dépublier" position="left">
        <ActionIcon size="sm" variant="subtle" color="red" loading={loading} onClick={handleUnpublish}>
          <IconRocketOff size={14} stroke={1.5} />
        </ActionIcon>
      </Tooltip>
    );
  }

  return (
    <Tooltip label="Publier le planning" position="left">
      <ActionIcon size="sm" variant="subtle" color="teal" loading={loading} onClick={handlePublish}>
        <IconRocket size={14} stroke={1.5} />
      </ActionIcon>
    </Tooltip>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

interface Props {
  opened: boolean;
  onClose: () => void;
  stageId: number;
}

export function ScheduleGridModal({ opened, onClose, stageId }: Props) {
  const [addSlotOpened, setAddSlotOpened] = useState(false);
  const { data: schedule, isLoading } = useGetStageScheduleQuery(stageId, { skip: !opened });

  const nextPeriodNumber = schedule ? (Math.max(0, ...schedule.slots.map((s) => s.periodNumber)) + 1) : 1;

  return (
    <>
      <Modal
        opened={opened}
        onClose={onClose}
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
          <Group justify="space-between">
            <Group gap="xs">
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
            <Button
              size="xs" color="navy" variant="light" radius="md"
              leftSection={<IconPlus size={12} stroke={1.5} />}
              onClick={() => setAddSlotOpened(true)}
            >
              Ajouter créneau
            </Button>
          </Group>

          {/* Legend */}
          <Group gap="md" wrap="nowrap">
            <Group gap={4}><Box w={12} h={12} style={{ borderRadius: 2, background: '#f0fdf4', border: '1px dashed #86efac' }} /><Text size="xs" c="dimmed">Service assigné</Text></Group>
            <Group gap={4}><Box w={12} h={12} style={{ borderRadius: 2, background: '#fafafa', border: '1px dashed #e2e8f0' }} /><Text size="xs" c="dimmed">Non assigné</Text></Group>
            <Group gap={4}><Badge size="xs" color="teal" variant="light">x/y</Badge><Text size="xs" c="dimmed">Capacité OK</Text></Group>
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
                  {schedule.cohorts.map((row) => (
                    <Table.Tr key={row.cohortId} style={{ background: row.isSchedulePublished ? '#f0fdf450' : undefined }}>
                      <Table.Td>
                        <Group gap="xs" wrap="nowrap">
                          {row.isSchedulePublished
                            ? <IconCircleCheck size={14} stroke={1.5} color="#22c55e" style={{ flexShrink: 0 }} />
                            : <IconCircleX size={14} stroke={1.5} color="#cbd5e1" style={{ flexShrink: 0 }} />}
                          <Stack gap={0} style={{ overflow: 'hidden' }}>
                            <Text size="xs" fw={600} truncate>{row.cohortLabel}</Text>
                            <Text size="xs" c="dimmed" truncate>{row.academicGroupLabel} · {row.studentCount} étud.</Text>
                          </Stack>
                        </Group>
                      </Table.Td>
                      {schedule.slots.map((slot, i) => (
                        <Table.Td key={slot.id} style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                          <Group justify="center">
                            <ServicePicker
                              cell={row.cells[i] ?? null}
                              stageId={stageId}
                              slotId={slot.id}
                              cohortId={row.cohortId}
                              studentCount={row.studentCount}
                              disabled={row.isSchedulePublished}
                            />
                          </Group>
                        </Table.Td>
                      ))}
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
          )}

          <Group justify="flex-end" pt="xs" style={{ borderTop: '1px solid #e2e8f0' }}>
            <Button variant="subtle" color="gray" onClick={onClose}>Fermer</Button>
          </Group>
        </Stack>
      </Modal>

      <AddSlotModal
        opened={addSlotOpened}
        onClose={() => setAddSlotOpened(false)}
        stageId={stageId}
        nextPeriodNumber={nextPeriodNumber}
      />
    </>
  );
}
