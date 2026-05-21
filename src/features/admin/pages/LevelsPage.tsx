import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Modal,
  NumberInput,
  ScrollArea,
  SegmentedControl,
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
import { useDisclosure } from '@mantine/hooks';
import { IconPencil, IconPlus, IconSchool } from '@tabler/icons-react';
import { useState } from 'react';
import { useGetLevelsQuery, useCreateLevelMutation, useUpdateLevelMutation } from '../api/adminApi';
import type { AdminLevelResponse } from '../types/admin.types';
import type { AcademicProgram } from '../../../common/types';
import { useNotify } from '../../../common/hooks/useNotify';

type ProgramFilter = 'all' | AcademicProgram;

const PROGRAM_LABEL: Record<AcademicProgram, string> = {
  Medecine:  'Médecine',
  Pharmacie: 'Pharmacie',
  Master:    'Master',
  Doctorat:  'Doctorat',
};

const PROGRAM_COLOR: Record<AcademicProgram, string> = {
  Medecine:  'navy',
  Pharmacie: 'sky',
  Master:    'success',
  Doctorat:  'warning',
};

const PROGRAM_OPTIONS = Object.entries(PROGRAM_LABEL).map(([value, label]) => ({ value, label }));

const FILTER_TABS = [
  { value: 'all',       label: 'Tous'      },
  { value: 'Medecine',  label: 'Médecine'  },
  { value: 'Pharmacie', label: 'Pharmacie' },
  { value: 'Master',    label: 'Master'    },
  { value: 'Doctorat',  label: 'Doctorat'  },
];

interface FormState {
  label: string;
  year: number;
  academicProgram: AcademicProgram;
}

const EMPTY: FormState = { label: '', year: 1, academicProgram: 'Medecine' };

function LevelFormModal({
  opened, onClose, initial, onSave, saving, title,
}: {
  opened: boolean;
  onClose: () => void;
  initial: FormState;
  onSave: (f: FormState) => void;
  saving: boolean;
  title: string;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <Modal opened={opened} onClose={onClose} title={title} radius="lg" size="sm">
      <Stack gap="md">
        <TextInput
          label="Libellé"
          placeholder="ex: Année 1 Médecine"
          value={form.label}
          onChange={(e) => set('label', e.currentTarget.value)}
          radius="md"
        />
        <NumberInput
          label="Année d'études"
          value={form.year}
          onChange={(v) => set('year', Number(v) || 1)}
          min={1} max={10}
          radius="md"
          required
        />
        <Select
          label="Filière"
          data={PROGRAM_OPTIONS}
          value={form.academicProgram}
          onChange={(v) => { if (v) set('academicProgram', v as AcademicProgram); }}
          radius="md"
          required
        />
        <Group justify="flex-end" mt="xs">
          <Button variant="subtle" color="gray" radius="md" onClick={onClose}>Annuler</Button>
          <Button color="navy" radius="md" loading={saving} onClick={() => onSave(form)}>
            Enregistrer
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export default function LevelsPage() {
  const notify = useNotify();
  const [filter, setFilter] = useState<ProgramFilter>('all');

  const { data: levels = [], isLoading } = useGetLevelsQuery(undefined);
  const [createLevel, { isLoading: creating }] = useCreateLevelMutation();
  const [updateLevel, { isLoading: updating }] = useUpdateLevelMutation();

  const [createOpen, { open: openCreate, close: closeCreate }] = useDisclosure(false);
  const [editTarget, setEditTarget] = useState<AdminLevelResponse | null>(null);

  const displayed = filter === 'all'
    ? levels
    : levels.filter((l) => l.academicProgram === filter);

  const handleCreate = async (form: FormState) => {
    try {
      await createLevel(form).unwrap();
      notify.success('Niveau créé');
      closeCreate();
    } catch {
      notify.error('Impossible de créer le niveau');
    }
  };

  const handleUpdate = async (form: FormState) => {
    if (!editTarget) return;
    try {
      await updateLevel({ id: editTarget.id, ...form }).unwrap();
      notify.success('Niveau mis à jour');
      setEditTarget(null);
    } catch {
      notify.error('Impossible de mettre à jour le niveau');
    }
  };

  return (
    <Container fluid>
      <Stack gap="xl">
        <Group justify="space-between" align="flex-end" wrap="wrap">
          <Stack gap={4}>
            <Title order={2} fw={700}>Niveaux académiques</Title>
            <Text size="sm" c="dimmed">
              {isLoading ? 'Chargement…' : `${levels.length} niveau${levels.length > 1 ? 'x' : ''} au total`}
            </Text>
          </Stack>
          <Button leftSection={<IconPlus size={16} stroke={1.5} />} color="navy" radius="md" onClick={openCreate}>
            Nouveau niveau
          </Button>
        </Group>

        <SegmentedControl
          value={filter}
          onChange={(v) => setFilter(v as ProgramFilter)}
          data={FILTER_TABS}
          radius="md"
          color="navy"
          size="sm"
        />

        <Card padding="lg" radius="lg" withBorder shadow="sm">
          <ScrollArea>
            <Table striped highlightOnHover verticalSpacing="sm"
              style={{ opacity: isLoading ? 0.5 : 1, transition: 'opacity 150ms' }}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Libellé</Table.Th>
                  <Table.Th>Année</Table.Th>
                  <Table.Th>Filière</Table.Th>
                  <Table.Th w={60} />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <Table.Tr key={i}>
                      {[140, 60, 100, 40].map((w, j) => (
                        <Table.Td key={j}><Skeleton height={14} width={w} radius="sm" /></Table.Td>
                      ))}
                    </Table.Tr>
                  ))
                ) : displayed.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={4}>
                      <Stack align="center" py="xl" gap="xs">
                        <IconSchool size={32} stroke={1.5} color="#94A3B8" />
                        <Text c="dimmed" size="sm">Aucun niveau trouvé</Text>
                      </Stack>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  displayed.map((level) => (
                    <Table.Tr key={level.id}>
                      <Table.Td>
                        <Text size="sm" fw={500}>{level.label ?? `Année ${level.year}`}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed" ff="monospace">{level.year}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light" color={PROGRAM_COLOR[level.academicProgram]} radius="xl" size="sm">
                          {PROGRAM_LABEL[level.academicProgram]}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Tooltip label="Modifier" position="left">
                          <ActionIcon
                            variant="subtle" color="gray" size="sm" radius="md"
                            onClick={() => setEditTarget(level)}
                          >
                            <IconPencil size={rem(14)} stroke={1.5} />
                          </ActionIcon>
                        </Tooltip>
                      </Table.Td>
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Card>
      </Stack>

      <LevelFormModal
        opened={createOpen}
        onClose={closeCreate}
        initial={EMPTY}
        onSave={handleCreate}
        saving={creating}
        title="Nouveau niveau"
      />

      <LevelFormModal
        opened={editTarget !== null}
        onClose={() => setEditTarget(null)}
        initial={editTarget ? { label: editTarget.label ?? '', year: editTarget.year, academicProgram: editTarget.academicProgram } : EMPTY}
        onSave={handleUpdate}
        saving={updating}
        title="Modifier le niveau"
      />
    </Container>
  );
}
