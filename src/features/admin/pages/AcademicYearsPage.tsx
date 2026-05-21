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
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconCalendar, IconPlus } from '@tabler/icons-react';
import { useState } from 'react';
import { useGetAcademicYearsQuery, useCreateAcademicYearMutation } from '../api/adminApi';
import { useNotify } from '../../../common/hooks/useNotify';

interface FormState {
  label: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

const EMPTY: FormState = { label: '', startDate: '', endDate: '', isCurrent: false };

export default function AcademicYearsPage() {
  const notify = useNotify();
  const { data: years = [], isLoading } = useGetAcademicYearsQuery();
  const [createYear, { isLoading: creating }] = useCreateAcademicYearMutation();

  const [opened, { open, close }] = useDisclosure(false);
  const [form, setForm] = useState<FormState>(EMPTY);

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

  const handleSubmit = async () => {
    if (!isFormValid) return;
    try {
      await createYear({
        label: form.label.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        isCurrent: form.isCurrent,
      }).unwrap();
      notify.success('Année académique créée');
      setForm(EMPTY);
      close();
    } catch {
      notify.error('Impossible de créer l\'année académique');
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
          <Button leftSection={<IconPlus size={16} stroke={1.5} />} color="navy" radius="md" onClick={open}>
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
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {isLoading ? (
                <Table.Tr>
                  <Table.Td colSpan={4}>
                    <Text c="dimmed" size="sm" ta="center" py="xl">Chargement…</Text>
                  </Table.Td>
                </Table.Tr>
              ) : years.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={4}>
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
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </Card>
      </Stack>

      <Modal opened={opened} onClose={close} title="Nouvelle année académique" radius="lg" size="sm">
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
          <Checkbox
            label="Marquer comme année actuelle"
            checked={form.isCurrent}
            onChange={(e) => set('isCurrent')(e.currentTarget.checked)}
          />
          <Group justify="flex-end" mt="xs">
            <Button variant="subtle" color="gray" radius="md" onClick={close}>Annuler</Button>
            <Button
              color="navy"
              radius="md"
              loading={creating}
              disabled={!isFormValid}
              onClick={handleSubmit}
            >
              Créer
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
