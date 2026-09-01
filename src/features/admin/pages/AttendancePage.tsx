import {
  Badge,
  Button,
  Card,
  Container,
  Group,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { IconCalendarEvent, IconCheck } from '@tabler/icons-react';
import { useState } from 'react';
import {
  useGetStagesQuery,
  useGetCohortOptionsByStageQuery,
  useGetServicePeriodsQuery,
  useRecordAttendanceMutation,
} from '../api/adminApi';
import type { AttendanceStatus, ServicePeriodResponse } from '../types/admin.types';
import { useAcademicYear } from '../contexts/useAcademicYear';
import { useNotify } from '../../../common/hooks/useNotify';

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: 'Present',         label: 'Présent',         color: 'teal'   },
  { value: 'Absent',          label: 'Absent',          color: 'red'    },
  { value: 'JustifiedAbsent', label: 'Absent justifié', color: 'orange' },
  { value: 'Late',            label: 'En retard',       color: 'yellow' },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function AttendancePage() {
  const notify = useNotify();

  // Presence is always recorded for the globally-selected academic year — the cohort picker and
  // the loaded periods are both scoped to it (getCohortsByStage returns every year).
  const { currentYearId } = useAcademicYear();

  const [stageId,  setStageId]  = useState<string | null>(null);
  const [cohortId, setCohortId] = useState<string | null>(null);
  const [date,     setDate]     = useState(todayISO());
  const [loaded,   setLoaded]   = useState(false);

  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [saving,   setSaving]   = useState(false);

  // Switching the year invalidates the current cohort selection (reset during render — the
  // React-endorsed alternative to a setState-in-effect).
  const [prevYearId, setPrevYearId] = useState(currentYearId);
  if (prevYearId !== currentYearId) {
    setPrevYearId(currentYearId);
    setCohortId(null);
    setLoaded(false);
  }

  const { data: stagesPage } = useGetStagesQuery({ pageSize: 100 });
  const stages = stagesPage?.items ?? [];

  // Filtered by year on the server now: fetching every year's cohorts only to discard all but one
  // client-side is what made this slow once real history landed.
  const { data: cohorts = [] } = useGetCohortOptionsByStageQuery(
    { stageId: Number(stageId), academicYearId: currentYearId ?? undefined }, { skip: !stageId }
  );

  const { data: periodsPage, isLoading: loadingPeriods } = useGetServicePeriodsQuery(
    {
      cohortId: cohortId ? Number(cohortId) : undefined,
      isComplete: false,
      academicYearId: currentYearId ?? undefined,
    },
    { skip: !loaded || !cohortId }
  );

  const allPeriods = periodsPage?.items ?? [];
  const activePeriods: ServicePeriodResponse[] = allPeriods.filter(
    (p) => p.startDate <= date && p.endDate >= date
  );

  const [recordAttendance] = useRecordAttendanceMutation();

  const stageOptions  = stages.map((s) => ({ value: String(s.id), label: s.name }));
  const cohortOptions = cohorts.map((c) => ({ value: String(c.id), label: c.label }));

  const handleLoad = () => {
    if (!cohortId || !date) return;
    setStatuses({});
    setLoaded(true);
  };

  const handleSave = async () => {
    setSaving(true);
    let ok = 0, fail = 0;
    for (const p of activePeriods) {
      try {
        await recordAttendance({
          servicePeriodId: p.id,
          date,
          status: statuses[p.id] ?? 'Present',
        }).unwrap();
        ok++;
      } catch {
        fail++;
      }
    }
    setSaving(false);
    if (fail === 0) notify.success(`${ok} présence(s) enregistrée(s)`);
    else            notify.warning(`${ok} enregistrée(s), ${fail} échoué(s)`);
  };

  return (
    <Container fluid>
      <Stack gap="xl">
        <Stack gap={4}>
          <Title order={2} fw={700}>Enregistrement des présences</Title>
          <Text size="sm" c="dimmed">
            Sélectionnez une cohorte et une date pour enregistrer les présences.
          </Text>
        </Stack>

        <Card padding="lg" radius="lg" withBorder shadow="sm">
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
            <Select
              label="Stage"
              placeholder="Choisir un stage"
              data={stageOptions}
              value={stageId}
              onChange={(v) => { setStageId(v); setCohortId(null); setLoaded(false); }}
              searchable
            />
            <Select
              label="Cohorte"
              placeholder={stageId ? 'Choisir une cohorte' : 'Sélectionnez un stage'}
              data={cohortOptions}
              value={cohortId}
              onChange={(v) => { setCohortId(v); setLoaded(false); }}
              disabled={!stageId}
              searchable
            />
            <TextInput
              label="Date"
              type="date"
              value={date}
              onChange={(e) => { setDate(e.currentTarget.value); setLoaded(false); }}
            />
            <Stack justify="flex-end">
              <Button
                color="navy"
                leftSection={<IconCalendarEvent size={16} stroke={1.5} />}
                disabled={!cohortId || !date}
                onClick={handleLoad}
              >
                Charger
              </Button>
            </Stack>
          </SimpleGrid>
        </Card>

        {loaded && (
          <Card padding="lg" radius="lg" withBorder shadow="sm">
            <Stack gap="md">
              <Group justify="space-between">
                <Text fw={600} size="sm">
                  {loadingPeriods
                    ? 'Chargement…'
                    : `${activePeriods.length} étudiant(s) en rotation le ${date}`}
                </Text>
                {activePeriods.length > 0 && (
                  <Button
                    color="navy"
                    size="sm"
                    leftSection={<IconCheck size={16} stroke={1.5} />}
                    loading={saving}
                    onClick={handleSave}
                  >
                    Enregistrer
                  </Button>
                )}
              </Group>

              <Table striped highlightOnHover verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Étudiant</Table.Th>
                    <Table.Th>Service</Table.Th>
                    <Table.Th>Période</Table.Th>
                    <Table.Th w={200}>Statut</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {loadingPeriods ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <Table.Tr key={i}>
                        {[160, 120, 140, 160].map((w, j) => (
                          <Table.Td key={j}><Skeleton height={14} width={w} radius="sm" /></Table.Td>
                        ))}
                      </Table.Tr>
                    ))
                  ) : activePeriods.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={4}>
                        <Text c="dimmed" size="sm" ta="center" py="md">
                          Aucun étudiant en rotation à cette date.
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    activePeriods.map((p) => {
                      const current    = statuses[p.id] ?? 'Present';
                      const statusInfo = STATUS_OPTIONS.find((s) => s.value === current)!;
                      return (
                        <Table.Tr key={p.id}>
                          <Table.Td>
                            <Text size="sm" fw={500}>{p.studentFullName}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" c="dimmed">{p.serviceName}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="xs" c="dimmed" ff="monospace">
                              {p.startDate} → {p.endDate}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Select
                              size="xs"
                              data={STATUS_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
                              value={current}
                              onChange={(v) =>
                                v && setStatuses((prev) => ({ ...prev, [p.id]: v as AttendanceStatus }))
                              }
                              leftSection={
                                <Badge size="xs" color={statusInfo.color} variant="dot" style={{ border: 'none' }} />
                              }
                            />
                          </Table.Td>
                        </Table.Tr>
                      );
                    })
                  )}
                </Table.Tbody>
              </Table>
            </Stack>
          </Card>
        )}
      </Stack>
    </Container>
  );
}
