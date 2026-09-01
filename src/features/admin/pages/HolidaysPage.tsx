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
  Modal,
  ScrollArea,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import {
  IconAlertTriangle,
  IconCalendarEvent,
  IconCalendarPlus,
  IconInfoCircle,
  IconPencil,
  IconTrash,
} from '@tabler/icons-react';
import { useState } from 'react';
import {
  useGetHolidayCoverageQuery,
  useCreateHolidayMutation,
  useUpdateHolidayMutation,
  useDeleteHolidayMutation,
  useSeedNationalHolidaysMutation,
} from '../api/adminApi';
import type { Holiday, HolidayKind } from '../types/admin.types';
import { useAcademicYear } from '../contexts/useAcademicYear';
import { useNotify } from '../../../common/hooks/useNotify';
import { ConfirmModal } from '../../../common/components/ConfirmModal';

const KIND_LABEL: Record<HolidayKind, string> = {
  National: 'Nationale',
  Religious: 'Religieuse',
  Academic: 'Facultaire',
};

const KIND_COLOR: Record<HolidayKind, string> = {
  National: 'navy',
  Religious: 'grape',
  Academic: 'teal',
};

interface FormState {
  id: number | null;
  range: [string | null, string | null];
  name: string;
  kind: HolidayKind;
  isConfirmed: boolean;
}

const EMPTY: FormState = {
  id: null,
  range: [null, null],
  name: '',
  kind: 'Religious',
  isConfirmed: true,
};

const fr = (iso: string) => new Date(iso).toLocaleDateString('fr-FR');

/**
 * The calendar a stage's duration is counted against. A stage measured in *jours ouvrables* is only as
 * correct as this table: PGSH generates the fixed national dates, but the lunar ones — Aïd al-Fitr, Aïd
 * al-Adha, Moharram, Mawlid — turn on observation of the crescent and are announced by decree, so nothing
 * can compute them. They are entered here or the axis silently over-counts every stage that spans one.
 */
export default function HolidaysPage() {
  const notify = useNotify();
  const { currentYearId } = useAcademicYear();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Holiday | null>(null);

  const { data: coverage, isFetching } = useGetHolidayCoverageQuery(
    { academicYearId: currentYearId ?? undefined },
    { skip: currentYearId == null },
  );

  const [create, { isLoading: creating }] = useCreateHolidayMutation();
  const [update, { isLoading: updating }] = useUpdateHolidayMutation();
  const [remove] = useDeleteHolidayMutation();
  const [seed, { isLoading: seeding }] = useSeedNationalHolidaysMutation();

  const openCreate = () => {
    setForm(EMPTY);
    setModalOpen(true);
  };

  const openEdit = (holiday: Holiday) => {
    setForm({
      id: holiday.id,
      range: [holiday.startDate.slice(0, 10), holiday.endDate.slice(0, 10)],
      name: holiday.name,
      kind: holiday.kind,
      isConfirmed: holiday.isConfirmed,
    });
    setModalOpen(true);
  };

  const [from, to] = form.range;
  const canSubmit = form.name.trim().length > 0 && from != null && to != null;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    const body = {
      startDate: from!,
      endDate: to!,
      name: form.name.trim(),
      kind: form.kind,
      isConfirmed: form.isConfirmed,
    };

    try {
      if (form.id == null) {
        await create(body).unwrap();
        notify.success(`« ${body.name} » enregistré.`);
      } else {
        const res = await update({ id: form.id, ...body }).unwrap();
        notify.success(`« ${body.name} » mis à jour.`);

        // The moment this exists for: the estimate entered in September is corrected the day the décret
        // names Aïd, and every window laid to a count of jours ouvrables across either date was built on
        // the wrong calendar. The dates those slots hold do not move — they simply no longer reproduce.
        if (res.slotsSpanning > 0)
          notify.info(
            `La date a changé : ${res.slotsSpanning} créneau(x) couvrent l'ancienne ou la nouvelle `
            + 'période — leurs dates sont conservées mais ne correspondent plus au décompte qui les a '
            + 'produites. Régénérez l\'axe du bloc concerné si la répartition doit être réimprimée.',
          );
      }
      setModalOpen(false);
    } catch {
      /* toasted by the error middleware */
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      const res = await remove(pendingDelete.id).unwrap();
      notify.success(`« ${res.name} » supprimé.`);

      // The slots keep the dates they were given; what changes is that the count no longer reproduces.
      if (res.slotsSpanning > 0)
        notify.info(
          `${res.slotsSpanning} créneau(x) couvraient ce jour — leurs dates sont conservées mais ne `
          + 'correspondent plus au décompte qui les a produites.',
        );
    } catch {
      /* toasted */
    } finally {
      setPendingDelete(null);
    }
  };

  const handleSeed = async () => {
    try {
      const res = await seed({ academicYearId: currentYearId ?? undefined }).unwrap();
      notify.success(
        `${res.created} fête(s) nationale(s) ajoutée(s) pour ${res.academicYearLabel}`
        + (res.alreadyPresent > 0 ? `, ${res.alreadyPresent} déjà présente(s).` : '.'),
      );

      if (res.missingReligious.length > 0)
        notify.info(`Reste à saisir à la main : ${res.missingReligious.join(', ')}.`);
    } catch {
      /* toasted */
    }
  };

  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-start">
          <Group gap="sm">
            <ThemeIcon size={42} radius="md" variant="light" color="navy">
              <IconCalendarEvent size={22} stroke={1.5} />
            </ThemeIcon>
            <Stack gap={0}>
              <Title order={3}>Jours fériés et fermetures</Title>
              <Text size="sm" c="dimmed">
                Le calendrier contre lequel les durées de stage sont comptées
                {coverage ? ` — ${coverage.academicYearLabel}` : ''}
              </Text>
            </Stack>
          </Group>

          <Group gap="xs">
            <Button
              variant="light"
              color="navy"
              radius="md"
              loading={seeding}
              leftSection={<IconCalendarPlus size={16} />}
              onClick={handleSeed}
              disabled={currentYearId == null}
            >
              Générer les fêtes nationales
            </Button>
            <Button radius="md" color="navy" onClick={openCreate}>
              Ajouter
            </Button>
          </Group>
        </Group>

        <Alert variant="light" color="blue" icon={<IconInfoCircle size={16} />} radius="md">
          Les fêtes <b>nationales</b> ont une date fixe et sont générées. Les fêtes <b>religieuses</b>{' '}
          suivent le calendrier hégirien : leur date dépend de l'observation du croissant et est fixée par
          décret, donc PGSH ne peut pas les calculer — il faut les saisir. Sans elles, une colonne exprimée
          en jours ouvrables compte l'Aïd comme des jours de stage.
        </Alert>

        {coverage && (
          <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="md">
            {[
              { label: 'Jours ouvrables', value: coverage.workingDays, color: 'teal' },
              { label: 'Jours calendaires', value: coverage.calendarDays, color: 'dimmed' },
              { label: 'Nationales', value: coverage.nationalDays, color: 'navy' },
              { label: 'Religieuses', value: coverage.religiousDays, color: 'grape' },
              {
                label: 'Provisoires',
                value: coverage.provisionalCount,
                color: coverage.provisionalCount > 0 ? 'orange' : 'dimmed',
              },
            ].map(({ label, value, color }) => (
              <Card key={label} padding="md" radius="md" withBorder>
                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>{label}</Text>
                <Text size="xl" fw={700} c={color === 'dimmed' ? 'dimmed' : color}>{value}</Text>
              </Card>
            ))}
          </SimpleGrid>
        )}

        {coverage && coverage.missingReligious.length > 0 && (
          <Alert variant="light" color="orange" icon={<IconAlertTriangle size={16} />} radius="md">
            Aucune date enregistrée pour : <b>{coverage.missingReligious.join(', ')}</b>. Tant qu'elles
            manquent, tout stage qui les traverse est compté trop long. Une année planifiée en juillet ne
            connaît légitimement pas encore l'Aïd du printemps suivant.
          </Alert>
        )}

        <Card withBorder radius="md" padding="lg">
          <Stack gap="md">
            <Group justify="space-between">
              <Text fw={600} size="sm">
                {coverage?.holidays.length ?? 0} entrée(s)
                {coverage ? ` du ${fr(coverage.from)} au ${fr(coverage.to)}` : ''}
              </Text>
              {isFetching && <Text size="xs" c="dimmed">Actualisation…</Text>}
            </Group>

            <Divider />

            {coverage && coverage.holidays.length === 0 ? (
              <Text size="sm" c="dimmed" ta="center" py="lg">
                Rien d'enregistré pour cette année. « Générer les fêtes nationales » couvre la moitié fixe.
              </Text>
            ) : (
              <ScrollArea>
                <Table striped highlightOnHover withTableBorder>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Dates</Table.Th>
                      <Table.Th>Nom</Table.Th>
                      <Table.Th>Type</Table.Th>
                      <Table.Th>Jours</Table.Th>
                      <Table.Th>Ouvrables perdus</Table.Th>
                      <Table.Th />
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {coverage?.holidays.map((h) => (
                      <Table.Tr key={h.id}>
                        <Table.Td>
                          <Text size="sm">
                            {h.startDate === h.endDate
                              ? fr(h.startDate)
                              : `${fr(h.startDate)} → ${fr(h.endDate)}`}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Group gap={6}>
                            <Text size="sm">{h.name}</Text>
                            {!h.isConfirmed && (
                              <Tooltip label="Date encore provisoire — le décret peut la déplacer">
                                <Badge size="xs" variant="light" color="orange" style={{ cursor: 'help' }}>
                                  provisoire
                                </Badge>
                              </Tooltip>
                            )}
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Badge variant="light" color={KIND_COLOR[h.kind]}>
                            {KIND_LABEL[h.kind]}
                          </Badge>
                        </Table.Td>
                        <Table.Td>{h.dayCount}</Table.Td>
                        <Table.Td>
                          {/* Zero means it fell on a weekend: it costs nothing, and saying so stops it
                              being entered twice or blamed for a window that did not move. */}
                          <Badge variant="light" color={h.workingDaysLost === 0 ? 'gray' : 'teal'}>
                            {h.workingDaysLost}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Group gap={4} justify="flex-end">
                            <ActionIcon variant="subtle" onClick={() => openEdit(h)}>
                              <IconPencil size={16} />
                            </ActionIcon>
                            <ActionIcon variant="subtle" color="red" onClick={() => setPendingDelete(h)}>
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            )}
          </Stack>
        </Card>
      </Stack>

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id == null ? 'Nouveau jour férié' : 'Modifier'}
        radius="md"
        centered
      >
        <Stack gap="md">
          <DatePickerInput
            type="range"
            label="Dates"
            description="Une seule journée : cliquez deux fois sur la même date"
            placeholder="Début → fin"
            value={form.range}
            onChange={(v) => setForm((p) => ({ ...p, range: v as [string | null, string | null] }))}
            radius="md"
            required
          />
          <TextInput
            label="Nom"
            placeholder="Aïd al-Adha"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.currentTarget.value }))}
            radius="md"
            required
          />
          <Select
            label="Type"
            data={(['National', 'Religious', 'Academic'] as HolidayKind[]).map((k) => ({
              value: k,
              label: KIND_LABEL[k],
            }))}
            value={form.kind}
            onChange={(v) => setForm((p) => ({ ...p, kind: (v as HolidayKind) ?? 'Religious' }))}
            radius="md"
            allowDeselect={false}
          />
          <Checkbox
            label="Date confirmée"
            description="Décochez tant que le décret n'a pas fixé la date — la fenêtre reste comptée, mais signalée comme susceptible de bouger."
            checked={form.isConfirmed}
            onChange={(e) => setForm((p) => ({ ...p, isConfirmed: e.currentTarget.checked }))}
          />

          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button
              color="navy"
              onClick={handleSubmit}
              loading={creating || updating}
              disabled={!canSubmit}
            >
              Enregistrer
            </Button>
          </Group>
        </Stack>
      </Modal>

      <ConfirmModal
        opened={pendingDelete != null}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
        title="Supprimer ce jour férié ?"
        message={
          `« ${pendingDelete?.name ?? ''} » ne comptera plus comme jour non ouvrable. Les créneaux déjà `
          + 'datés gardent leurs dates : seuls les décomptes à venir changent.'
        }
        confirmLabel="Supprimer"
      />
    </Container>
  );
}
