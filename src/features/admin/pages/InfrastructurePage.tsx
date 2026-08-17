import {
  ActionIcon,
  Anchor,
  Badge,
  Button,
  Card,
  Container,
  Divider,
  Drawer,
  Group,
  Modal,
  Pagination,
  ScrollArea,
  Select,
  Skeleton,
  Stack,
  Table,
  Tabs,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
  rem,
} from '@mantine/core';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import { IconBuildingFactory2, IconBuildingHospital, IconPencil, IconPlus, IconStarFilled, IconStethoscope, IconTrash, IconUsers } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useGetCentersQuery, useCreateCenterMutation, useUpdateCenterMutation, useDeleteCenterMutation,
  useGetHospitalsQuery, useCreateHospitalMutation, useUpdateHospitalMutation, useDeleteHospitalMutation,
  useGetServicesQuery, useDeleteServiceMutation,
  useGetCentersQuery as useAllCenters,
  useGetHospitalsQuery as useAllHospitals,
  useGetServiceByIdQuery,
  useGetEmployeesQuery,
  useAssignStaffMutation,
  useRemoveStaffMutation,
  useAssignChefMutation,
  useRemoveChefMutation,
} from '../api/adminApi';
import type { CenterSummaryResponse, HospitalSummaryResponse, ServiceSummaryResponse, StaffMemberResponse } from '../types/admin.types';
import { useNotify } from '../../../common/hooks/useNotify';
import { ConfirmModal } from '../../../common/components/ConfirmModal';
import { ServiceFormModal } from '../components/ServiceFormModal';
import { LocalizationFields } from '../components/LocalizationFields';
import { coordinatePayload, EMPTY_COORDINATES } from '../components/localization';
import { PATHS } from '../../../routes/paths';

const PAGE_SIZE = 15;

const CENTER_TYPE_OPTIONS = ['None', 'CHU', 'Regional', 'Militaire'].map((v) => ({ value: v, label: v }));
const HOSPITAL_TYPE_OPTIONS = ['None', 'CHU', 'Central', 'Spetialité', 'LHOMA', 'Autre'].map((v) => ({ value: v, label: v }));

const TYPE_COLOR: Record<string, string> = {
  // CenterType
  CHU: 'navy', Regional: 'sky', Militaire: 'warning', None: 'gray',
  // HospitalType
  Central: 'navy', Spetialité: 'sky', LHOMA: 'success', Autre: 'gray',
  // ServiceType
  Biologie: 'success', Chirurgie: 'warning', Medical: 'navy',
};

function SkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: PAGE_SIZE }).map((_, i) => (
        <Table.Tr key={i}>
          {Array.from({ length: cols }).map((__, j) => (
            <Table.Td key={j}><Skeleton height={14} radius="sm" /></Table.Td>
          ))}
        </Table.Tr>
      ))}
    </>
  );
}

// ─── Centers tab ─────────────────────────────────────────────────────────────

function CentersTab() {
  const notify = useNotify();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [debouncedSearch] = useDebouncedValue(search, 350);
  useEffect(() => setPage(1), [debouncedSearch]);

  const { data, isLoading, isFetching } = useGetCentersQuery({ searchTerm: debouncedSearch || undefined, pageNumber: page, pageSize: PAGE_SIZE });
  const [createCenter, { isLoading: creating }] = useCreateCenterMutation();
  const [updateCenter, { isLoading: updating }] = useUpdateCenterMutation();
  const [deleteCenter] = useDeleteCenterMutation();

  const [opened, { open, close }] = useDisclosure(false);
  const [editTarget, setEditTarget]         = useState<CenterSummaryResponse | null>(null);
  const [deleteTarget, setDeleteTarget]     = useState<CenterSummaryResponse | null>(null);
  const [deleteOpen, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [form, setForm] = useState({ name: '', centerType: 'CHU', city: '', ...EMPTY_COORDINATES });

  const openCreate = () => { setEditTarget(null); setForm({ name: '', centerType: 'CHU', city: '', ...EMPTY_COORDINATES }); open(); };
  const openEdit = (c: CenterSummaryResponse) => {
    setEditTarget(c);
    setForm({
      name: c.name, centerType: c.centerType, city: c.city ?? '',
      localizationX: c.x ?? '', localizationY: c.y ?? '', localizationZ: c.z ?? '',
    });
    open();
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    const payload = { name: form.name.trim(), centerType: form.centerType, city: form.city.trim() || undefined, ...coordinatePayload(form) };
    try {
      if (editTarget) { await updateCenter({ id: editTarget.id, ...payload }).unwrap(); notify.success('Centre mis à jour'); }
      else { await createCenter(payload).unwrap(); notify.success('Centre créé'); }
      close();
    } catch { notify.error('Erreur lors de l\'enregistrement'); }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try { await deleteCenter(deleteTarget.id).unwrap(); notify.success('Centre supprimé'); }
    catch { notify.error('Impossible de supprimer ce centre'); }
    closeDeleteModal();
    setDeleteTarget(null);
  };

  return (
    <Stack gap="md">
      <Group gap="sm" justify="space-between" wrap="wrap">
        <TextInput placeholder="Rechercher un centre…" value={search} onChange={(e) => setSearch(e.target.value)} radius="md" style={{ flex: 1, minWidth: rem(200) }} />
        <Button leftSection={<IconPlus size={16} stroke={1.5} />} color="navy" radius="md" onClick={openCreate}>Nouveau centre</Button>
      </Group>

      <ScrollArea>
        <Table striped highlightOnHover verticalSpacing="sm" style={{ opacity: isFetching && !isLoading ? 0.6 : 1, transition: 'opacity 150ms' }}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nom</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th>Ville</Table.Th>
              <Table.Th w={80} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading ? <SkeletonRows cols={4} /> : (data?.items ?? []).length === 0 ? (
              <Table.Tr><Table.Td colSpan={4}><Text c="dimmed" size="sm" ta="center" py="xl">Aucun centre trouvé</Text></Table.Td></Table.Tr>
            ) : (data?.items ?? []).map((c) => (
              <Table.Tr key={c.id}>
                <Table.Td><Text size="sm" fw={500}>{c.name}</Text></Table.Td>
                <Table.Td><Badge variant="light" color={TYPE_COLOR[c.centerType] ?? 'gray'} radius="xl" size="sm">{c.centerType}</Badge></Table.Td>
                <Table.Td><Text size="sm" c="dimmed">{c.city ?? '—'}</Text></Table.Td>
                <Table.Td>
                  <Group gap={4} justify="flex-end" wrap="nowrap">
                    <Tooltip label="Modifier"><ActionIcon variant="subtle" color="gray" size="sm" radius="md" onClick={() => openEdit(c)}><IconPencil size={rem(14)} stroke={1.5} /></ActionIcon></Tooltip>
                    <Tooltip label="Supprimer"><ActionIcon variant="subtle" color="red" size="sm" radius="md" onClick={() => { setDeleteTarget(c); openDeleteModal(); }}><IconTrash size={rem(14)} stroke={1.5} /></ActionIcon></Tooltip>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>

      {(data?.totalPages ?? 1) > 1 && <Group justify="center"><Pagination value={page} onChange={setPage} total={data!.totalPages} radius="md" size="sm" color="navy" /></Group>}

      <Modal opened={opened} onClose={close} title={editTarget ? 'Modifier le centre' : 'Nouveau centre'} radius="lg" size="md">
        <Stack gap="md">
          <TextInput label="Nom" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} radius="md" required />
          <Select label="Type" data={CENTER_TYPE_OPTIONS} value={form.centerType} onChange={(v) => setForm((p) => ({ ...p, centerType: v ?? 'CHU' }))} radius="md" />
          <TextInput label="Ville" value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} radius="md" />
          <LocalizationFields value={form} onChange={(patch) => setForm((p) => ({ ...p, ...patch }))} />
          <Group justify="flex-end">
            <Button variant="subtle" color="gray" radius="md" onClick={close}>Annuler</Button>
            <Button color="navy" radius="md" loading={creating || updating} disabled={!form.name.trim()} onClick={handleSave}>Enregistrer</Button>
          </Group>
        </Stack>
      </Modal>
      <ConfirmModal
        opened={deleteOpen}
        onClose={() => { closeDeleteModal(); setDeleteTarget(null); }}
        title="Supprimer le centre"
        message={`Supprimer "${deleteTarget?.name}" ?`}
        confirmLabel="Supprimer"
        onConfirm={handleDeleteConfirm}
      />
    </Stack>
  );
}

// ─── Hospitals tab ────────────────────────────────────────────────────────────

function HospitalsTab() {
  const notify = useNotify();
  const [search, setSearch] = useState('');
  const [centerFilter, setCenterFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [debouncedSearch] = useDebouncedValue(search, 350);
  useEffect(() => setPage(1), [debouncedSearch, centerFilter]);

  const { data: allCenters = { items: [] } } = useAllCenters({ pageSize: 100 });
  const { data, isLoading, isFetching } = useGetHospitalsQuery({ centerId: centerFilter ? Number(centerFilter) : undefined, searchTerm: debouncedSearch || undefined, pageNumber: page, pageSize: PAGE_SIZE });
  const [createHospital, { isLoading: creating }] = useCreateHospitalMutation();
  const [updateHospital, { isLoading: updating }] = useUpdateHospitalMutation();
  const [deleteHospital] = useDeleteHospitalMutation();

  const [opened, { open, close }] = useDisclosure(false);
  const [editTarget, setEditTarget]         = useState<HospitalSummaryResponse | null>(null);
  const [deleteTarget, setDeleteTarget]     = useState<HospitalSummaryResponse | null>(null);
  const [deleteOpen, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [form, setForm] = useState({ name: '', centerId: '', hospitalType: 'Central', city: '', email: '', description: '', ...EMPTY_COORDINATES });

  const centerOptions = allCenters.items.map((c) => ({ value: String(c.id), label: c.name }));

  const openCreate = () => { setEditTarget(null); setForm({ name: '', centerId: '', hospitalType: 'Central', city: '', email: '', description: '', ...EMPTY_COORDINATES }); open(); };
  const openEdit = (h: HospitalSummaryResponse) => {
    setEditTarget(h);
    // Every field the save writes back is read here — a blank left in this object is a stored value
    // destroyed on the next save, which is what used to happen to the description.
    setForm({
      name: h.name, centerId: String(h.centerId), hospitalType: h.hospitalType, city: h.city,
      email: h.email ?? '', description: h.description ?? '',
      localizationX: h.x ?? '', localizationY: h.y ?? '', localizationZ: h.z ?? '',
    });
    open();
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.centerId || !form.city.trim()) return;
    const payload = { centerId: Number(form.centerId), name: form.name.trim(), hospitalType: form.hospitalType, city: form.city.trim(), email: form.email.trim() || undefined, description: form.description.trim() || undefined, ...coordinatePayload(form) };
    try {
      if (editTarget) { await updateHospital({ id: editTarget.id, ...payload }).unwrap(); notify.success('Hôpital mis à jour'); }
      else { await createHospital(payload).unwrap(); notify.success('Hôpital créé'); }
      close();
    } catch { notify.error('Erreur lors de l\'enregistrement'); }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try { await deleteHospital(deleteTarget.id).unwrap(); notify.success('Hôpital supprimé'); }
    catch { notify.error('Impossible de supprimer cet hôpital'); }
    closeDeleteModal();
    setDeleteTarget(null);
  };

  return (
    <Stack gap="md">
      <Group gap="sm" justify="space-between" wrap="wrap">
        <Group gap="sm" style={{ flex: 1 }} wrap="wrap">
          <TextInput placeholder="Rechercher un hôpital…" value={search} onChange={(e) => setSearch(e.target.value)} radius="md" style={{ flex: 1, minWidth: rem(200) }} />
          <Select placeholder="Tous les centres" data={[{ value: '', label: 'Tous les centres' }, ...centerOptions]} value={centerFilter ?? ''} onChange={(v) => setCenterFilter(v || null)} radius="md" w={200} clearable />
        </Group>
        <Button leftSection={<IconPlus size={16} stroke={1.5} />} color="navy" radius="md" onClick={openCreate}>Nouvel hôpital</Button>
      </Group>

      <ScrollArea>
        <Table striped highlightOnHover verticalSpacing="sm" style={{ opacity: isFetching && !isLoading ? 0.6 : 1, transition: 'opacity 150ms' }}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nom</Table.Th>
              <Table.Th>Centre</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th>Ville</Table.Th>
              <Table.Th w={80} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading ? <SkeletonRows cols={5} /> : (data?.items ?? []).length === 0 ? (
              <Table.Tr><Table.Td colSpan={5}><Text c="dimmed" size="sm" ta="center" py="xl">Aucun hôpital trouvé</Text></Table.Td></Table.Tr>
            ) : (data?.items ?? []).map((h) => (
              <Table.Tr key={h.id}>
                <Table.Td><Text size="sm" fw={500}>{h.name}</Text></Table.Td>
                <Table.Td><Text size="sm" c="dimmed">{h.centerName}</Text></Table.Td>
                <Table.Td><Badge variant="light" color={TYPE_COLOR[h.hospitalType] ?? 'gray'} radius="xl" size="sm">{h.hospitalType}</Badge></Table.Td>
                <Table.Td><Text size="sm" c="dimmed">{h.city}</Text></Table.Td>
                <Table.Td>
                  <Group gap={4} justify="flex-end" wrap="nowrap">
                    <Tooltip label="Modifier"><ActionIcon variant="subtle" color="gray" size="sm" radius="md" onClick={() => openEdit(h)}><IconPencil size={rem(14)} stroke={1.5} /></ActionIcon></Tooltip>
                    <Tooltip label="Supprimer"><ActionIcon variant="subtle" color="red" size="sm" radius="md" onClick={() => { setDeleteTarget(h); openDeleteModal(); }}><IconTrash size={rem(14)} stroke={1.5} /></ActionIcon></Tooltip>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>

      {(data?.totalPages ?? 1) > 1 && <Group justify="center"><Pagination value={page} onChange={setPage} total={data!.totalPages} radius="md" size="sm" color="navy" /></Group>}

      <Modal opened={opened} onClose={close} title={editTarget ? 'Modifier l\'hôpital' : 'Nouvel hôpital'} radius="lg" size="md">
        <Stack gap="md">
          <TextInput label="Nom" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} radius="md" required />
          <Group grow>
            <Select label="Centre" data={centerOptions} value={form.centerId} onChange={(v) => setForm((p) => ({ ...p, centerId: v ?? '' }))} radius="md" searchable required />
            <Select label="Type" data={HOSPITAL_TYPE_OPTIONS} value={form.hospitalType} onChange={(v) => setForm((p) => ({ ...p, hospitalType: v ?? 'Central' }))} radius="md" />
          </Group>
          <Group grow>
            <TextInput label="Ville" value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} radius="md" required />
            <TextInput label="Email" type="email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} radius="md" />
          </Group>
          <Textarea label="Description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} radius="md" autosize minRows={2} />
          <LocalizationFields value={form} onChange={(patch) => setForm((p) => ({ ...p, ...patch }))} />
          <Group justify="flex-end">
            <Button variant="subtle" color="gray" radius="md" onClick={close}>Annuler</Button>
            <Button color="navy" radius="md" loading={creating || updating} disabled={!form.name.trim() || !form.centerId || !form.city.trim()} onClick={handleSave}>Enregistrer</Button>
          </Group>
        </Stack>
      </Modal>
      <ConfirmModal
        opened={deleteOpen}
        onClose={() => { closeDeleteModal(); setDeleteTarget(null); }}
        title="Supprimer l'hôpital"
        message={`Supprimer "${deleteTarget?.name}" ?`}
        confirmLabel="Supprimer"
        onConfirm={handleDeleteConfirm}
      />
    </Stack>
  );
}

// ─── Staff management drawer ──────────────────────────────────────────────────

function StaffDrawer({ serviceId, onClose }: { serviceId: number | null; onClose: () => void }) {
  const notify = useNotify();
  const opened = serviceId !== null;

  const { data: service, isLoading: loadingService } = useGetServiceByIdQuery(serviceId!, { skip: serviceId === null });
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(employeeSearch, 300);
  const { data: employees } = useGetEmployeesQuery({ searchTerm: debouncedSearch || undefined, pageSize: 30 }, { skip: !opened });

  const [assignStaff,  { isLoading: assigning }]  = useAssignStaffMutation();
  const [removeStaff]                              = useRemoveStaffMutation();
  const [assignChef,   { isLoading: settingChef }] = useAssignChefMutation();
  const [removeChef]                               = useRemoveChefMutation();

  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);

  useEffect(() => { if (!opened) { setEmployeeSearch(''); setSelectedEmployee(null); } }, [opened]);

  const currentStaffIds = new Set((service?.staff ?? []).map((s) => s.id));
  const employeeOptions = (employees?.items ?? [])
    .filter((e) => !currentStaffIds.has(e.id))
    .map((e) => ({ value: e.id, label: `${e.firstName} ${e.lastName}${e.ppr ? ` — ${e.ppr}` : ''}` }));

  const handleAdd = async () => {
    if (!selectedEmployee || !serviceId) return;
    try { await assignStaff({ serviceId, employeeId: selectedEmployee }).unwrap(); setSelectedEmployee(null); notify.success('Personnel ajouté'); }
    catch { notify.error('Erreur lors de l\'ajout'); }
  };

  const handleRemove = async (member: StaffMemberResponse) => {
    if (!serviceId) return;
    try { await removeStaff({ serviceId, employeeId: member.id }).unwrap(); notify.success('Personnel retiré'); }
    catch { notify.error('Impossible de retirer ce membre'); }
  };

  const handleSetChef = async (member: StaffMemberResponse) => {
    if (!serviceId) return;
    try { await assignChef({ serviceId, employeeId: member.id }).unwrap(); notify.success('Chef de service mis à jour'); }
    catch { notify.error('Erreur lors de l\'assignation'); }
  };

  const handleRemoveChef = async () => {
    if (!serviceId) return;
    try { await removeChef(serviceId).unwrap(); notify.success('Chef de service retiré'); }
    catch { notify.error('Erreur lors de la suppression'); }
  };

  const chefId = service?.serviceChef?.id ?? null;

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={service ? `Personnel — ${service.name}` : 'Personnel'}
      position="right"
      size="md"
      radius="lg"
      padding="lg"
    >
      <Stack gap="lg">
        {/* Add staff */}
        <Stack gap="xs">
          <Text size="sm" fw={600}>Ajouter un membre</Text>
          <Group gap="xs">
            <Select
              placeholder="Rechercher un employé…"
              data={employeeOptions}
              value={selectedEmployee}
              onChange={setSelectedEmployee}
              searchable
              searchValue={employeeSearch}
              onSearchChange={setEmployeeSearch}
              radius="md"
              style={{ flex: 1 }}
              nothingFoundMessage="Aucun résultat"
            />
            <Button color="navy" radius="md" loading={assigning} disabled={!selectedEmployee} onClick={handleAdd}>
              Ajouter
            </Button>
          </Group>
        </Stack>

        <Divider />

        {/* Current staff */}
        <Stack gap="xs">
          <Text size="sm" fw={600}>Personnel actuel ({service?.staff.length ?? 0})</Text>
          {loadingService ? (
            <Stack gap="xs">{[0,1,2].map((i) => <Skeleton key={i} height={40} radius="md" />)}</Stack>
          ) : (service?.staff ?? []).length === 0 ? (
            <Text size="sm" c="dimmed" ta="center" py="md">Aucun personnel affecté</Text>
          ) : (
            <Stack gap={6}>
              {(service?.staff ?? []).map((member) => {
                const isChef = member.id === chefId;
                return (
                  <Group key={member.id} justify="space-between" p="xs" style={{ borderRadius: rem(8), background: isChef ? '#FFF9E6' : '#F8FAFC', border: `1px solid ${isChef ? '#F59E0B' : '#E2E8F0'}` }}>
                    <Group gap="xs">
                      {isChef && <IconStarFilled size={14} color="#F59E0B" />}
                      <Stack gap={0}>
                        <Text size="sm" fw={500}>{member.firstName} {member.lastName}</Text>
                        <Text size="xs" c="dimmed">{member.grade}{member.ppr ? ` · ${member.ppr}` : ''}</Text>
                      </Stack>
                    </Group>
                    <Group gap={4}>
                      {isChef ? (
                        <Tooltip label="Retirer chef">
                          <ActionIcon variant="light" color="warning" size="sm" radius="md" loading={settingChef} onClick={handleRemoveChef}>
                            <IconStarFilled size={12} />
                          </ActionIcon>
                        </Tooltip>
                      ) : (
                        <Tooltip label="Désigner chef de service">
                          <ActionIcon variant="subtle" color="gray" size="sm" radius="md" loading={settingChef} onClick={() => handleSetChef(member)}>
                            <IconStarFilled size={12} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                      <Tooltip label="Retirer du service">
                        <ActionIcon variant="subtle" color="red" size="sm" radius="md" onClick={() => handleRemove(member)}>
                          <IconTrash size={12} stroke={1.5} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Group>
                );
              })}
            </Stack>
          )}
        </Stack>
      </Stack>
    </Drawer>
  );
}

// ─── Services tab ─────────────────────────────────────────────────────────────

function ServicesTab() {
  const notify = useNotify();
  const [search, setSearch] = useState('');
  const [hospitalFilter, setHospitalFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [debouncedSearch] = useDebouncedValue(search, 350);
  useEffect(() => setPage(1), [debouncedSearch, hospitalFilter]);

  const { data: allHospitals = { items: [] } } = useAllHospitals({ pageSize: 200 });
  const { data, isLoading, isFetching } = useGetServicesQuery({ hospitalId: hospitalFilter ? Number(hospitalFilter) : undefined, searchTerm: debouncedSearch || undefined, pageNumber: page, pageSize: PAGE_SIZE });
  const [deleteService] = useDeleteServiceMutation();

  const [opened, { open, close }] = useDisclosure(false);
  const [editTarget, setEditTarget]         = useState<ServiceSummaryResponse | null>(null);
  const [deleteTarget, setDeleteTarget]     = useState<ServiceSummaryResponse | null>(null);
  const [deleteOpen, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [staffServiceId, setStaffServiceId] = useState<number | null>(null);

  const hospitalOptions = allHospitals.items.map((h) => ({ value: String(h.id), label: `${h.name} — ${h.city}` }));

  const openCreate = () => { setEditTarget(null); open(); };
  const openEdit = (s: ServiceSummaryResponse) => { setEditTarget(s); open(); };

  const handleDeleteConfirm = async () => {
    const s = deleteTarget;
    if (!s) return;
    try { await deleteService(s.id).unwrap(); notify.success('Service supprimé'); }
    catch { notify.error('Impossible de supprimer ce service'); }
    closeDeleteModal();
    setDeleteTarget(null);
  };

  return (
    <Stack gap="md">
      <Group gap="sm" justify="space-between" wrap="wrap">
        <Group gap="sm" style={{ flex: 1 }} wrap="wrap">
          <TextInput placeholder="Rechercher un service…" value={search} onChange={(e) => setSearch(e.target.value)} radius="md" style={{ flex: 1, minWidth: rem(200) }} />
          <Select placeholder="Tous les hôpitaux" data={[{ value: '', label: 'Tous les hôpitaux' }, ...hospitalOptions]} value={hospitalFilter ?? ''} onChange={(v) => setHospitalFilter(v || null)} radius="md" w={240} searchable clearable />
        </Group>
        <Button leftSection={<IconPlus size={16} stroke={1.5} />} color="navy" radius="md" onClick={openCreate}>Nouveau service</Button>
      </Group>

      <ScrollArea>
        <Table striped highlightOnHover verticalSpacing="sm" style={{ opacity: isFetching && !isLoading ? 0.6 : 1, transition: 'opacity 150ms' }}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nom</Table.Th>
              <Table.Th>Hôpital</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th>Spécialité</Table.Th>
              <Table.Th>Capacité</Table.Th>
              <Table.Th>Promotions</Table.Th>
              <Table.Th>Chef de service</Table.Th>
              <Table.Th w={80} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading ? <SkeletonRows cols={8} /> : (data?.items ?? []).length === 0 ? (
              <Table.Tr><Table.Td colSpan={8}><Text c="dimmed" size="sm" ta="center" py="xl">Aucun service trouvé</Text></Table.Td></Table.Tr>
            ) : (data?.items ?? []).map((s) => (
              <Table.Tr key={s.id}>
                {/* The name is the way in to the service's own page — where its real occupancy
                    lives. Capacity is felt at the service, but until now it was only readable from
                    the plan's side: a bare count of "services saturés" and a publish refusal one
                    service at a time. */}
                <Table.Td>
                  <Anchor
                    component={Link}
                    to={`${PATHS.ADMIN.ROOT}/services/${s.id}`}
                    size="sm"
                    fw={500}
                  >
                    {s.name}
                  </Anchor>
                </Table.Td>
                <Table.Td><Text size="sm" c="dimmed">{s.hospitalName}</Text></Table.Td>
                <Table.Td><Badge variant="light" color={TYPE_COLOR[s.serviceType] ?? 'gray'} radius="xl" size="sm">{s.serviceType}</Badge></Table.Td>
                <Table.Td><Text size="sm" c={s.specialty ? undefined : 'dimmed'}>{s.specialty ?? '—'}</Text></Table.Td>
                <Table.Td><Text size="sm" ff="monospace">{s.capacity}</Text></Table.Td>
                <Table.Td>
                  {s.restrictedLevelCount === 0 ? (
                    <Badge variant="light" color="success" radius="xl" size="sm">Toutes</Badge>
                  ) : (
                    <Tooltip label="Ce service n'accueille que certaines promotions">
                      <Badge variant="light" color="warning" radius="xl" size="sm">{s.restrictedLevelCount} promotion(s)</Badge>
                    </Tooltip>
                  )}
                </Table.Td>
                <Table.Td><Text size="sm" c={s.serviceChefName ? undefined : 'dimmed'}>{s.serviceChefName ?? '—'}</Text></Table.Td>
                <Table.Td>
                  <Group gap={4} justify="flex-end" wrap="nowrap">
                    <Tooltip label="Gérer le personnel">
                      <ActionIcon variant="subtle" color="navy" size="sm" radius="md" onClick={() => setStaffServiceId(s.id)}>
                        <IconUsers size={rem(14)} stroke={1.5} />
                      </ActionIcon>
                    </Tooltip>
                    <Tooltip label="Modifier"><ActionIcon variant="subtle" color="gray" size="sm" radius="md" onClick={() => openEdit(s)}><IconPencil size={rem(14)} stroke={1.5} /></ActionIcon></Tooltip>
                    <Tooltip label="Supprimer"><ActionIcon variant="subtle" color="red" size="sm" radius="md" onClick={() => { setDeleteTarget(s); openDeleteModal(); }}><IconTrash size={rem(14)} stroke={1.5} /></ActionIcon></Tooltip>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>

      {(data?.totalPages ?? 1) > 1 && <Group justify="center"><Pagination value={page} onChange={setPage} total={data!.totalPages} radius="md" size="sm" color="navy" /></Group>}

      <StaffDrawer serviceId={staffServiceId} onClose={() => setStaffServiceId(null)} />

      <ServiceFormModal
        opened={opened}
        serviceId={editTarget?.id ?? null}
        hospitalOptions={hospitalOptions}
        onClose={close}
      />
      <ConfirmModal
        opened={deleteOpen}
        onClose={() => { closeDeleteModal(); setDeleteTarget(null); }}
        title="Supprimer le service"
        message={`Supprimer "${deleteTarget?.name}" ?`}
        confirmLabel="Supprimer"
        onConfirm={handleDeleteConfirm}
      />
    </Stack>
  );
}

// ─── Page shell ──────────────────────────────────────────────────────────────

export default function InfrastructurePage() {
  return (
    <Container fluid>
      <Stack gap="xl">
        <Stack gap={4}>
          <Title order={2} fw={700}>Infrastructure hospitalière</Title>
          <Text size="sm" c="dimmed">Gérez les centres, hôpitaux et services de stage.</Text>
        </Stack>

        <Card padding="lg" radius="lg" withBorder shadow="sm">
          <Tabs defaultValue="centers" color="navy">
            <Tabs.List mb="lg">
              <Tabs.Tab value="centers" leftSection={<IconBuildingFactory2 size={16} stroke={1.5} />}>Centres</Tabs.Tab>
              <Tabs.Tab value="hospitals" leftSection={<IconBuildingHospital size={16} stroke={1.5} />}>Hôpitaux</Tabs.Tab>
              <Tabs.Tab value="services" leftSection={<IconStethoscope size={16} stroke={1.5} />}>Services</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="centers"><CentersTab /></Tabs.Panel>
            <Tabs.Panel value="hospitals"><HospitalsTab /></Tabs.Panel>
            <Tabs.Panel value="services"><ServicesTab /></Tabs.Panel>
          </Tabs>
        </Card>
      </Stack>
    </Container>
  );
}
