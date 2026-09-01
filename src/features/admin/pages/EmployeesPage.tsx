import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Loader,
  Modal,
  Pagination,
  ScrollArea,
  Select,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
  rem,
} from '@mantine/core';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import { usePagedFilters } from '../../../common/hooks/usePagedFilters';
import { IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import {
  useGetEmployeesQuery,
  useGetEmployeeByIdQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,
} from '../api/adminApi';
import type { EmployeeDetailResponse, EmployeeSummaryResponse, Grade, Position, WorkPlace } from '../types/admin.types';
import { useNotify } from '../../../common/hooks/useNotify';
import { ConfirmModal } from '../../../common/components/ConfirmModal';

const PAGE_SIZE = 20;

const GRADE_OPTIONS: { value: Grade; label: string }[] = [
  { value: 'MC',            label: 'Maître de conférences (MC)' },
  { value: 'PES',           label: 'Professeur de l\'enseignement supérieur (PES)' },
  { value: 'PH',            label: 'Praticien hospitalier (PH)' },
  { value: 'Nurse',         label: 'Infirmier(e)' },
  { value: 'Administrator', label: 'Administrateur' },
];

const POSITION_OPTIONS: { value: Position; label: string }[] = [
  { value: 'ServiceChef', label: 'Chef de service' },
  { value: 'Normal',      label: 'Normal' },
];

const WORKPLACE_OPTIONS: { value: WorkPlace; label: string }[] = [
  { value: 'Hospital', label: 'Hôpital' },
  { value: 'Fmpr',     label: 'FMPR' },
];

const GENDER_OPTIONS = [
  { value: 'Male',   label: 'Homme' },
  { value: 'Female', label: 'Femme' },
];

const GRADE_COLOR: Record<Grade, string> = {
  MC: 'navy', PES: 'sky', PH: 'success', Nurse: 'warning', Administrator: 'gray',
};

type FormValues = {
  email: string; firstName: string; lastName: string; cin: string;
  ppr: string; label: string; grade: Grade; position: string; workPlace: string;
  gender: string; dateOfBirth: string; placeOfBirth: string; fullAddress: string; pvSignatureDate: string;
};

const emptyForm = (): FormValues => ({
  email: '', firstName: '', lastName: '', cin: '',
  ppr: '', label: '', grade: 'PH', position: '', workPlace: '',
  gender: 'Male', dateOfBirth: '', placeOfBirth: '', fullAddress: '', pvSignatureDate: '',
});

/** The edit form's values for an employee the server has just returned. */
const formFrom = (e: EmployeeDetailResponse): FormValues => ({
  email:           e.email,
  firstName:       e.firstName,
  lastName:        e.lastName,
  cin:             e.cin           ?? '',
  ppr:             e.ppr           ?? '',
  label:           e.label         ?? '',
  grade:           e.grade,
  position:        e.position      ?? '',
  workPlace:       e.workPlace     ?? '',
  gender:          e.gender        ?? 'Male',
  dateOfBirth:     e.dateOfBirth   ?? '',
  placeOfBirth:    e.placeOfBirth  ?? '',
  fullAddress:     e.fullAddress   ?? '',
  pvSignatureDate: e.pvSignatureDate ?? '',
});

function validate(form: FormValues): Partial<Record<keyof FormValues, string>> {
  const errs: Partial<Record<keyof FormValues, string>> = {};
  if (!form.email.trim()) {
    errs.email = 'Email requis';
  } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) {
    errs.email = 'Email invalide';
  }
  if (!form.firstName.trim()) errs.firstName = 'Prénom requis';
  if (!form.lastName.trim())  errs.lastName  = 'Nom requis';
  return errs;
}

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

export default function EmployeesPage() {
  const notify = useNotify();
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string | null>(null);
  const [debouncedSearch] = useDebouncedValue(search, 350);
  const [page, setPage] = usePagedFilters(debouncedSearch, gradeFilter);

  const { data, isLoading, isFetching } = useGetEmployeesQuery({
    searchTerm: debouncedSearch || undefined,
    grade: (gradeFilter as Grade) || undefined,
    pageNumber: page,
    pageSize: PAGE_SIZE,
  });

  const [createEmployee, { isLoading: creating }] = useCreateEmployeeMutation();
  const [updateEmployee, { isLoading: updating }] = useUpdateEmployeeMutation();
  const [deleteEmployee]                          = useDeleteEmployeeMutation();

  // Modal state
  const [opened, { open, close }]               = useDisclosure(false);
  const [deleteTarget, setDeleteTarget]         = useState<EmployeeSummaryResponse | null>(null);
  const [deleteOpen, { open: openDeleteModal, close: closeDeleteModal }] = useDisclosure(false);
  const [editEmployeeId, setEditEmployeeId]     = useState<string | null>(null);
  const [form, setForm]                 = useState<FormValues>(emptyForm());
  const [errors, setErrors]             = useState<Partial<Record<keyof FormValues, string>>>({});

  // Fetch full employee data when editing
  const { data: fullEmployee, isFetching: loadingFull } = useGetEmployeeByIdQuery(
    editEmployeeId!,
    { skip: !editEmployeeId }
  );

  // Populated the moment the fetch lands, during render rather than in an effect: an effect commits
  // one render first, so the form briefly showed the values it was opened with. `loadedFor` is what
  // makes it happen once per employee instead of on every render.
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  if (fullEmployee && editEmployeeId === fullEmployee.id && loadedFor !== fullEmployee.id) {
    setLoadedFor(fullEmployee.id);
    setForm(formFrom(fullEmployee));
  }

  const openCreate = () => {
    setEditEmployeeId(null);
    setLoadedFor(null);
    setForm(emptyForm());
    setErrors({});
    open();
  };
  const openEdit = (e: EmployeeSummaryResponse) => {
    setEditEmployeeId(e.id);
    setLoadedFor(null);
    setForm(emptyForm()); // reset while full data loads
    setErrors({});
    open();
  };
  const handleClose = () => { close(); setEditEmployeeId(null); };

  const field = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setForm((p) => ({ ...p, [key]: value }));

  const buildPayload = () => ({
    email:           form.email.trim(),
    firstName:       form.firstName.trim(),
    lastName:        form.lastName.trim(),
    cin:             form.cin.trim()             || undefined,
    ppr:             form.ppr.trim()             || undefined,
    label:           form.label.trim()           || undefined,
    grade:           form.grade,
    position:        (form.position as Position) || undefined,
    workPlace:       (form.workPlace as WorkPlace) || undefined,
    gender:          form.gender,
    dateOfBirth:     form.dateOfBirth            || undefined,
    placeOfBirth:    form.placeOfBirth.trim()    || undefined,
    fullAddress:     form.fullAddress.trim()     || undefined,
    pvSignatureDate: form.pvSignatureDate        || undefined,
  });

  const handleSave = async () => {
    const errs = validate(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    try {
      if (editEmployeeId) {
        await updateEmployee({ id: editEmployeeId, ...buildPayload() }).unwrap();
        notify.success('Employé mis à jour');
      } else {
        await createEmployee(buildPayload()).unwrap();
        notify.success('Employé créé');
      }
      handleClose();
    } catch {
      notify.error('Erreur lors de l\'enregistrement');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try { await deleteEmployee(deleteTarget.id).unwrap(); notify.success('Employé supprimé'); }
    catch { notify.error('Impossible de supprimer cet employé'); }
    closeDeleteModal();
    setDeleteTarget(null);
  };

  return (
    <Container fluid>
      <Stack gap="xl">
        <Stack gap={4}>
          <Title order={2} fw={700}>Employés</Title>
          <Text size="sm" c="dimmed">Gérez le personnel hospitalier et universitaire.</Text>
        </Stack>

        <Card padding="lg" radius="lg" withBorder shadow="sm">
          <Stack gap="md">
            <Group gap="sm" justify="space-between" wrap="wrap">
              <Group gap="sm" style={{ flex: 1 }} wrap="wrap">
                <TextInput
                  placeholder="Rechercher par nom, email, PPR…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  radius="md"
                  style={{ flex: 1, minWidth: rem(220) }}
                />
                <Select
                  placeholder="Tous les grades"
                  data={[{ value: '', label: 'Tous les grades' }, ...GRADE_OPTIONS]}
                  value={gradeFilter ?? ''}
                  onChange={(v) => setGradeFilter(v || null)}
                  radius="md"
                  w={200}
                  clearable
                />
              </Group>
              <Button leftSection={<IconPlus size={16} stroke={1.5} />} color="navy" radius="md" onClick={openCreate}>
                Nouvel employé
              </Button>
            </Group>

            <ScrollArea>
              <Table striped highlightOnHover verticalSpacing="sm" style={{ opacity: isFetching && !isLoading ? 0.6 : 1, transition: 'opacity 150ms' }}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Nom</Table.Th>
                    <Table.Th>Email</Table.Th>
                    <Table.Th>PPR</Table.Th>
                    <Table.Th>Grade</Table.Th>
                    <Table.Th>Poste</Table.Th>
                    <Table.Th>Lieu de travail</Table.Th>
                    <Table.Th w={80} />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {isLoading ? <SkeletonRows cols={7} /> : (data?.items ?? []).length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={7}>
                        <Text c="dimmed" size="sm" ta="center" py="xl">Aucun employé trouvé</Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (data?.items ?? []).map((e) => (
                    <Table.Tr key={e.id}>
                      <Table.Td><Text size="sm" fw={500}>{e.firstName} {e.lastName}</Text></Table.Td>
                      <Table.Td><Text size="sm" c="dimmed">{e.email}</Text></Table.Td>
                      <Table.Td><Text size="sm" ff="monospace">{e.ppr ?? '—'}</Text></Table.Td>
                      <Table.Td>
                        <Badge variant="light" color={GRADE_COLOR[e.grade] ?? 'gray'} radius="xl" size="sm">{e.grade}</Badge>
                      </Table.Td>
                      <Table.Td><Text size="sm" c={e.position ? undefined : 'dimmed'}>{e.position ?? '—'}</Text></Table.Td>
                      <Table.Td><Text size="sm" c={e.workPlace ? undefined : 'dimmed'}>{e.workPlace ?? '—'}</Text></Table.Td>
                      <Table.Td>
                        <Group gap={4} justify="flex-end" wrap="nowrap">
                          <Tooltip label="Modifier">
                            <ActionIcon variant="subtle" color="gray" size="sm" radius="md" onClick={() => openEdit(e)}>
                              <IconPencil size={rem(14)} stroke={1.5} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Supprimer">
                            <ActionIcon variant="subtle" color="red" size="sm" radius="md" onClick={() => { setDeleteTarget(e); openDeleteModal(); }}>
                              <IconTrash size={rem(14)} stroke={1.5} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>

            {(data?.totalPages ?? 1) > 1 && (
              <Group justify="center">
                <Pagination value={page} onChange={setPage} total={data!.totalPages} radius="md" size="sm" color="navy" />
              </Group>
            )}
          </Stack>
        </Card>
      </Stack>

      <Modal
        opened={opened}
        onClose={handleClose}
        title={editEmployeeId ? 'Modifier l\'employé' : 'Nouvel employé'}
        radius="lg"
        size="lg"
      >
        {editEmployeeId && loadingFull ? (
          <Stack align="center" py="xl">
            <Loader color="navy" size="sm" />
            <Text size="sm" c="dimmed">Chargement des données…</Text>
          </Stack>
        ) : (
          <Stack gap="md">
            <Group grow>
              <TextInput
                label="Prénom" value={form.firstName} onChange={(e) => field('firstName', e.target.value)}
                radius="md" required error={errors.firstName}
              />
              <TextInput
                label="Nom" value={form.lastName} onChange={(e) => field('lastName', e.target.value)}
                radius="md" required error={errors.lastName}
              />
            </Group>

            <TextInput
              label="Email" type="email" value={form.email} onChange={(e) => field('email', e.target.value)}
              radius="md" required error={errors.email}
            />

            <Group grow>
              <Select
                label="Grade" data={GRADE_OPTIONS} value={form.grade}
                onChange={(v) => field('grade', (v ?? 'PH') as Grade)} radius="md" required
              />
              <Select
                label="Genre" data={GENDER_OPTIONS} value={form.gender}
                onChange={(v) => field('gender', v ?? 'Male')} radius="md"
              />
            </Group>

            <Group grow>
              <Select
                label="Poste" data={[{ value: '', label: '—' }, ...POSITION_OPTIONS]}
                value={form.position} onChange={(v) => field('position', v ?? '')} radius="md" clearable
              />
              <Select
                label="Lieu de travail" data={[{ value: '', label: '—' }, ...WORKPLACE_OPTIONS]}
                value={form.workPlace} onChange={(v) => field('workPlace', v ?? '')} radius="md" clearable
              />
            </Group>

            <Group grow>
              <TextInput
                label="PPR" value={form.ppr} onChange={(e) => field('ppr', e.target.value)} radius="md"
              />
              <TextInput
                label="CIN" value={form.cin} onChange={(e) => field('cin', e.target.value)} radius="md"
              />
            </Group>

            <Group grow>
              <TextInput
                label="Date de naissance" type="date" value={form.dateOfBirth}
                onChange={(e) => field('dateOfBirth', e.target.value)} radius="md"
              />
              <TextInput
                label="Lieu de naissance" value={form.placeOfBirth}
                onChange={(e) => field('placeOfBirth', e.target.value)} radius="md"
              />
            </Group>

            <Group grow>
              <TextInput
                label="Label / Titre" value={form.label}
                onChange={(e) => field('label', e.target.value)} radius="md"
              />
              <TextInput
                label="Date PV signature" type="date" value={form.pvSignatureDate}
                onChange={(e) => field('pvSignatureDate', e.target.value)} radius="md"
              />
            </Group>

            <TextInput
              label="Adresse complète" value={form.fullAddress}
              onChange={(e) => field('fullAddress', e.target.value)} radius="md"
            />

            <Group justify="flex-end">
              <Button variant="subtle" color="gray" radius="md" onClick={handleClose}>Annuler</Button>
              <Button color="navy" radius="md" loading={creating || updating} onClick={handleSave}>
                Enregistrer
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      <ConfirmModal
        opened={deleteOpen}
        onClose={() => { closeDeleteModal(); setDeleteTarget(null); }}
        title="Supprimer l'employé"
        message={`Supprimer "${deleteTarget?.firstName} ${deleteTarget?.lastName}" ?`}
        confirmLabel="Supprimer"
        confirmColor="red"
        onConfirm={handleDeleteConfirm}
      />
    </Container>
  );
}
