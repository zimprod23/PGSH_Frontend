import {
  Alert,
  Button,
  Card,
  Container,
  Divider,
  Group,
  NumberInput,
  Select,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconUsersGroup,
  IconWand,
} from '@tabler/icons-react';
import { useState } from 'react';
import { useGetAcademicYearsQuery, useGetLevelsQuery, useAutoArrangeGroupsMutation } from '../api/adminApi';
import type { BulkResponse } from '../../../common/types';
import { useNotify } from '../../../common/hooks/useNotify';

interface FormState {
  academicYearId: string | null;
  levelId: string | null;
  groupSize: number;
}

const EMPTY: FormState = { academicYearId: null, levelId: null, groupSize: 20 };

export default function GroupsPage() {
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

  const levelOptions = levels.map((l) => ({
    value: String(l.id),
    label: l.label ?? `Année ${l.year} — ${l.academicProgram}`,
    group: l.academicProgram,
  }));

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
    ? new Set(result.items.filter((i) => i.isSuccess).map((i) => i.result)).size
    : null;

  return (
    <Container fluid>
      <Stack gap="xl">
        <Stack gap={4}>
          <Title order={2} fw={700}>Gestion des groupes</Title>
          <Text size="sm" c="dimmed">
            Répartissez automatiquement les étudiants inscrits en groupes par niveau et année.
          </Text>
        </Stack>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
          {/* ── Form card ─────────────────────────────── */}
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

              <Select
                label="Année académique"
                placeholder="Sélectionner une année"
                data={yearOptions}
                value={form.academicYearId}
                onChange={(v) => setForm((p) => ({ ...p, academicYearId: v }))}
                radius="md"
                required
              />

              <Select
                label="Niveau"
                placeholder="Sélectionner un niveau"
                data={levelOptions}
                value={form.levelId}
                onChange={(v) => setForm((p) => ({ ...p, levelId: v }))}
                radius="md"
                searchable
                required
              />

              <NumberInput
                label="Taille de groupe"
                description="Nombre maximum d'étudiants par groupe"
                value={form.groupSize}
                onChange={(v) => setForm((p) => ({ ...p, groupSize: Number(v) || 20 }))}
                min={2}
                max={60}
                radius="md"
                required
              />

              <Alert
                icon={<IconAlertTriangle size={16} stroke={1.5} />}
                color="warning"
                variant="light"
                radius="md"
              >
                Seuls les étudiants sans groupe assigné seront répartis. Relancer l'opération créera de nouveaux groupes supplémentaires.
              </Alert>

              <Button
                color="navy"
                radius="md"
                loading={isLoading}
                disabled={!canSubmit}
                leftSection={<IconWand size={16} stroke={1.5} />}
                onClick={handleArrange}
              >
                Lancer la répartition
              </Button>
            </Stack>
          </Card>

          {/* ── Result card ───────────────────────────── */}
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
                    { label: 'Groupes créés',      value: groupCount,           color: 'navy'    },
                    { label: 'Étudiants assignés',  value: result.successCount,  color: 'success' },
                    { label: 'Total traités',        value: result.totalProcessed, color: 'dimmed' },
                    { label: 'Échecs',               value: result.failureCount,  color: result.failureCount > 0 ? 'danger' : 'dimmed' },
                  ].map(({ label, value, color }) => (
                    <Card key={label} padding="md" radius="md" withBorder>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>{label}</Text>
                      <Text size="xl" fw={700} c={color === 'dimmed' ? 'dimmed' : color}>{value}</Text>
                    </Card>
                  ))}
                </SimpleGrid>

                {result.failureCount > 0 && (
                  <Alert color="danger" variant="light" radius="md">
                    {result.failureCount} étudiant(s) n'ont pas pu être assignés.
                  </Alert>
                )}
              </Stack>
            </Card>
          ) : (
            <Card padding="xl" radius="lg" withBorder shadow="sm"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
              <Stack align="center" gap="sm">
                <IconUsersGroup size={48} stroke={1} color="#CBD5E1" />
                <Text c="dimmed" size="sm" ta="center">
                  Configurez les paramètres et lancez la répartition pour voir les résultats ici.
                </Text>
              </Stack>
            </Card>
          )}
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
