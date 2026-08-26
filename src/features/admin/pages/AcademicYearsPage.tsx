import {
  Badge,
  Button,
  Card,
  Checkbox,
  Container,
  Group,
  Modal,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
  ActionIcon,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconCalendar, IconCheck, IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import {
  useGetAcademicYearsQuery,
  useCreateAcademicYearMutation,
  useUpdateAcademicYearMutation,
  useSetCurrentAcademicYearMutation,
  useDeleteAcademicYearMutation,
} from '../api/adminApi';
import type { AcademicYearResponse } from '../types/admin.types';
import { useNotify } from '../../../common/hooks/useNotify';

interface FormState {
  label: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

const EMPTY: FormState = { label: '', startDate: '', endDate: '', isCurrent: false };

// ⚠ No error toast anywhere below. `errorMiddleware` already shows one for every rejected mutation,
// carrying the server's own `detail` — which is exactly what these refusals need to say, since each
// names what stands in the way (which years overlap, which counts hold the year). A page-level toast
// on top of it is a second copy of the same sentence: the delete refusal printed « Conflit » and
// « Erreur » side by side, with identical text. Success messages stay here, because they carry what
// the middleware cannot know — the year that stood down, the périodes left outside the span, the
// rosters the cascade took.

export default function AcademicYearsPage() {
  const notify = useNotify();
  const { data: years = [], isLoading } = useGetAcademicYearsQuery();
  const [createYear, { isLoading: creating }] = useCreateAcademicYearMutation();
  const [updateYear, { isLoading: updating }] = useUpdateAcademicYearMutation();
  const [setCurrentYear, { isLoading: promoting }] = useSetCurrentAcademicYearMutation();
  const [deleteYear, { isLoading: deleting }] = useDeleteAcademicYearMutation();

  const [opened, { open, close }] = useDisclosure(false);
  const [form, setForm] = useState<FormState>(EMPTY);

  /** The year being edited, or null when the modal is creating one. */
  const [editing, setEditing] = useState<AcademicYearResponse | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<AcademicYearResponse | null>(null);

  const set = (field: keyof FormState) => (value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const maxStartYear = new Date().getFullYear() + 1;

  const startYearError = form.startDate
    ? new Date(form.startDate).getFullYear() > maxStartYear
      ? `L'année de début ne peut pas dépasser ${maxStartYear}`
      : null
    : null;

  const endBeforeStart = form.startDate && form.endDate && form.endDate <= form.startDate;

  const isFormValid = form.label.trim() && form.startDate && form.endDate
    && !startYearError && !endBeforeStart;

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    open();
  };

  const openEdit = (year: AcademicYearResponse) => {
    setEditing(year);
    setForm({
      label: year.label,
      startDate: year.startDate,
      endDate: year.endDate,
      isCurrent: year.isCurrent,
    });
    open();
  };

  const handleSubmit = async () => {
    if (!isFormValid) return;
    try {
      if (editing) {
        const report = await updateYear({
          id: editing.id,
          label: form.label.trim(),
          startDate: form.startDate,
          endDate: form.endDate,
        }).unwrap();

        // Not a failure: a year is routinely corrected while its axis is still a draft. But périodes
        // keep the dates they were authored with, so narrowing a year can leave them outside it — and
        // nothing else on screen would ever say so.
        notify.success(
          report.slotsOutsideSpan > 0
            ? `Année modifiée — ${report.slotsOutsideSpan} période(s) de stage tombent désormais hors de son calendrier`
            : "Année modifiée",
        );
      } else {
        await createYear({
          label: form.label.trim(),
          startDate: form.startDate,
          endDate: form.endDate,
          isCurrent: form.isCurrent,
        }).unwrap();
        notify.success("Année académique créée");
      }

      setForm(EMPTY);
      setEditing(null);
      close();
    } catch {
      // Reported by errorMiddleware, in the server's own words.
    }
  };

  const handleSetCurrent = async (year: AcademicYearResponse) => {
    try {
      const report = await setCurrentYear(year.id).unwrap();
      notify.success(
        report.previousLabel
          ? `« ${report.label} » est l'année en cours — « ${report.previousLabel} » ne l'est plus`
          : `« ${report.label} » est l'année en cours`,
      );
    } catch {
      // Reported by errorMiddleware.
    }
  };

  const handleDelete = async () => {
    if (!confirmingDelete) return;
    try {
      const report = await deleteYear(confirmingDelete.id).unwrap();
      notify.success(
        report.rostersRemoved > 0
          ? `« ${report.label} » supprimée — ${report.rostersRemoved} groupe(s) vide(s) supprimé(s) avec elle`
          : `« ${report.label} » supprimée`,
      );
      setConfirmingDelete(null);
    } catch {
      // The refusal names every count that stands in the way, and errorMiddleware prints it verbatim.
      // The dialog stays open on purpose: the user has something to go and clear.
    }
  };

  const fmt = (d: string) => {
    if (!d) return '—';
    const [y, m, day] = d.split('-').map(Number);
    return new Date(y, m - 1, day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <Container fluid>
      <Stack gap="xl">
        <Group justify="space-between" align="flex-end" wrap="wrap">
          <Stack gap={4}>
            <Title order={2} fw={700}>Années académiques</Title>
            <Text size="sm" c="dimmed">
              {isLoading ? 'Chargement…' : `${years.length} année${years.length > 1 ? 's' : ''} au total`}
            </Text>
          </Stack>
          <Button leftSection={<IconPlus size={16} stroke={1.5} />} color="navy" radius="md" onClick={openCreate}>
            Nouvelle année
          </Button>
        </Group>

        <Card padding="lg" radius="lg" withBorder shadow="sm">
          <Table striped highlightOnHover verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Année</Table.Th>
                <Table.Th>Début</Table.Th>
                <Table.Th>Fin</Table.Th>
                <Table.Th>Statut</Table.Th>
                <Table.Th ta="right">Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {isLoading ? (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Text c="dimmed" size="sm" ta="center" py="xl">Chargement…</Text>
                  </Table.Td>
                </Table.Tr>
              ) : years.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Stack align="center" py="xl" gap="xs">
                      <IconCalendar size={32} stroke={1.5} color="#94A3B8" />
                      <Text c="dimmed" size="sm">Aucune année académique</Text>
                    </Stack>
                  </Table.Td>
                </Table.Tr>
              ) : (
                years.map((year) => (
                  <Table.Tr key={year.id}>
                    <Table.Td>
                      <Text size="sm" fw={600}>{year.label}</Text>
                    </Table.Td>
                    <Table.Td><Text size="sm" c="dimmed">{fmt(year.startDate)}</Text></Table.Td>
                    <Table.Td><Text size="sm" c="dimmed">{fmt(year.endDate)}</Text></Table.Td>
                    <Table.Td>
                      {year.isCurrent && (
                        <Badge variant="light" color="success" radius="xl" size="sm">Actuelle</Badge>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4} justify="flex-end" wrap="nowrap">
                        <Tooltip
                          label={year.isCurrent
                            ? "Déjà l'année en cours"
                            : "Faire de cette année l'année en cours"}
                        >
                          <span>
                            <ActionIcon
                              variant="subtle"
                              color="success"
                              radius="md"
                              disabled={year.isCurrent || promoting}
                              onClick={() => handleSetCurrent(year)}
                              aria-label={`Définir ${year.label} comme année en cours`}
                            >
                              <IconCheck size={16} stroke={1.5} />
                            </ActionIcon>
                          </span>
                        </Tooltip>
                        <Tooltip label="Modifier le libellé ou les dates">
                          <ActionIcon
                            variant="subtle"
                            color="navy"
                            radius="md"
                            onClick={() => openEdit(year)}
                            aria-label={`Modifier ${year.label}`}
                          >
                            <IconPencil size={16} stroke={1.5} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip
                          label={year.isCurrent
                            ? "L'année en cours ne peut pas être supprimée : désignez-en une autre d'abord"
                            : 'Supprimer cette année'}
                        >
                          <span>
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              radius="md"
                              disabled={year.isCurrent}
                              onClick={() => setConfirmingDelete(year)}
                              aria-label={`Supprimer ${year.label}`}
                            >
                              <IconTrash size={16} stroke={1.5} />
                            </ActionIcon>
                          </span>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </Card>
      </Stack>

      <Modal
        opened={opened}
        onClose={close}
        title={editing ? `Modifier « ${editing.label} »` : 'Nouvelle année académique'}
        radius="lg"
        size="sm"
      >
        <Stack gap="md">
          <TextInput
            label="Libellé"
            placeholder="ex: 2026-2027"
            value={form.label}
            onChange={(e) => set('label')(e.currentTarget.value)}
            radius="md"
            required
          />
          <TextInput
            label="Date de début"
            type="date"
            value={form.startDate}
            onChange={(e) => set('startDate')(e.currentTarget.value)}
            error={startYearError}
            radius="md"
            required
          />
          <TextInput
            label="Date de fin"
            type="date"
            value={form.endDate}
            onChange={(e) => set('endDate')(e.currentTarget.value)}
            error={endBeforeStart ? 'La date de fin doit être après la date de début' : undefined}
            radius="md"
            required
          />
          {editing ? (
            <Text size="xs" c="dimmed">
              L'année en cours se change depuis la liste — c'est un acte distinct, qui déplace ce que
              tous les écrans affichent.
            </Text>
          ) : (
            <Checkbox
              label="Marquer comme année actuelle"
              checked={form.isCurrent}
              onChange={(e) => set('isCurrent')(e.currentTarget.checked)}
            />
          )}
          <Group justify="flex-end" mt="xs">
            <Button variant="subtle" color="gray" radius="md" onClick={close}>Annuler</Button>
            <Button
              color="navy"
              radius="md"
              loading={creating || updating}
              disabled={!isFormValid}
              onClick={handleSubmit}
            >
              {editing ? 'Enregistrer' : 'Créer'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={confirmingDelete !== null}
        onClose={() => setConfirmingDelete(null)}
        title="Supprimer l'année ?"
        radius="lg"
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm">
            « {confirmingDelete?.label} » sera supprimée. Une année universitaire <b>constitue</b> les
            inscriptions, les groupes, les périodes et les cohortes qui la nomment : si l'une d'elles
            existe encore, la suppression sera refusée en les énumérant.
          </Text>
          <Text size="xs" c="dimmed">
            Les groupes <b>vides</b> de cette année, eux, partiront avec elle — leur nombre est indiqué
            après coup, car c'est la seule chose qu'on ne puisse plus relire ensuite.
          </Text>
          <Group justify="flex-end" mt="xs">
            <Button variant="subtle" color="gray" radius="md" onClick={() => setConfirmingDelete(null)}>
              Annuler
            </Button>
            <Button color="red" radius="md" loading={deleting} onClick={handleDelete}>
              Supprimer
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
