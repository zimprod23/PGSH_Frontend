import {
  Avatar,
  Badge,
  Box,
  Card,
  Container,
  Group,
  Pagination,
  ScrollArea,
  SegmentedControl,
  Select,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  rem,
} from '@mantine/core';
import { IconSearch, IconUsers } from '@tabler/icons-react';
import { useEffect, useMemo } from 'react';
import { useListParams } from '../../../../common/hooks/useListParams';
import { useNavigate } from 'react-router-dom';
import {
  useGetLevelsQuery,
  useGetStudentsQuery,
  useLazyGetStudentsExportQuery,
} from '../../api/adminApi';
import { ExportButton } from '../../../../common/components/ExportButton';
import { useAcademicYear } from '../../contexts/useAcademicYear';
import type { AcademicProgram, RegistrationStatus } from '../../../../common/types';
import { PATHS } from '../../../../routes/paths';

const PROGRAM_COLOR: Record<AcademicProgram, string> = {
  Medecine:  'navy',
  Pharmacie: 'sky',
  Master:    'success',
  Doctorat:  'warning',
};

const PROGRAM_SHORT: Record<AcademicProgram, string> = {
  Medecine:  'MED',
  Pharmacie: 'PHA',
  Master:    'MST',
  Doctorat:  'DOC',
};

const STATUS_CFG: Record<RegistrationStatus, { label: string; color: string }> = {
  Pending:   { label: 'En attente', color: 'gray'    },
  Active:    { label: 'Active',     color: 'blue'    },
  Validated: { label: 'Admise',     color: 'teal'    },
  Failed:    { label: 'Redoublée',  color: 'red'     },
  Withdrawn: { label: 'Abandon',    color: 'orange'  },
  // Neither is the pair above it: one ends the cursus by success, the other by exclusion, and the
  // réinscription is the consumer that has to tell all four apart.
  Graduated: { label: 'Diplômée',   color: 'grape'   },
  Excluded:  { label: 'Exclue',     color: 'dark'    },
};

const PROGRAM_FILTER: { value: string; label: string }[] = [
  { value: '',          label: 'Tous'      },
  { value: 'Medecine',  label: 'Médecine'  },
  { value: 'Pharmacie', label: 'Pharmacie' },
  { value: 'Master',    label: 'Master'    },
  { value: 'Doctorat',  label: 'Doctorat'  },
];

/**
 * The verdicts, in the order a PV lists them, with the two positions a running year passes through
 * at the end.
 *
 * ⚠ Built from `STATUS_CFG` rather than re-typed, so the option and the badge on the row it returns
 * can never disagree about what a verdict is called. The five outcomes come first because that is
 * what somebody filtering is looking for — « qui a été diplômé », « qui redouble » — while `Pending`
 * and `Active` describe a year nobody has ruled on yet.
 */
const STATUS_FILTER: { value: string; label: string }[] = [
  ...(['Graduated', 'Validated', 'Failed', 'Excluded', 'Withdrawn', 'Active', 'Pending'] as const)
    .map((value) => ({ value, label: STATUS_CFG[value].label })),
];

const PAGE_SIZE_OPTIONS = ['10', '15', '25', '50'];

function SkeletonRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Table.Tr key={i}>
          {Array.from({ length: 6 }).map((__, j) => (
            <Table.Td key={j}><Skeleton height={14} radius="sm" /></Table.Td>
          ))}
        </Table.Tr>
      ))}
    </>
  );
}

type StudentFilters = {
  program: string | null; level: string | null; status: string | null; size: string | null;
};
/** Module-level so its identity is stable — useListParams memoises on it. */
const STUDENT_FILTERS: StudentFilters = { program: '', level: '', status: '', size: '15' };

export default function StudentListPage() {
  const navigate = useNavigate();

  // In the URL so opening a student and coming back keeps the search, the programme and the page.
  const { search, setSearch, debouncedSearch, filters, setFilter, setFilters, page, setPage } =
    useListParams<StudentFilters>(STUDENT_FILTERS);
  const program = filters.program ?? '';
  const level = filters.level ?? '';
  const status = filters.status ?? '';
  const pageSize = Number(filters.size) || 15;

  // Changing the programme clears the promotion in the *same* patch: « Sixième Année Pharmacie »
  // under « Médecine » selects nobody, and a filter that silently empties the list reads as a bug in
  // the data. One call, not two — consecutive setFilter calls both start from the pre-render params
  // and the second discards the first (see useListParams).
  const setProgram = (v: string) => setFilters({ program: v, level: '' });


  // The navbar's globally-selected year drives the Niveau/Groupe/Statut columns: they reflect
  // that year's registration (blank when the student wasn't registered then).
  const { currentYearId } = useAcademicYear();

  // Search and programme reset the page through useListParams' setters; a navbar year change does not.
  useEffect(() => { setPage(1); }, [currentYearId, setPage]);

  // The whole catalogue, not `getPromotionLevels`: this is a browse filter over registrations that
  // already exist, and a withdrawn student's « Retrait » registration still has to be reachable.
  // Promotions-only belongs to the screens that *plan* — see the note on getPromotionLevels.
  const { data: levels = [] } = useGetLevelsQuery((program || undefined) as AcademicProgram | undefined);

  const levelOptions = useMemo(
    () =>
      [...levels]
        .sort((a, b) => a.academicProgram.localeCompare(b.academicProgram) || a.year - b.year)
        .map((l) => ({ value: String(l.id), label: l.label ?? `Année ${l.year}` })),
    [levels],
  );

  const { data, isLoading, isFetching } = useGetStudentsQuery({
    searchTerm: debouncedSearch.trim() || undefined,
    program: (program || undefined) as AcademicProgram | undefined,
    levelId: level ? Number(level) : undefined,
    academicYearId: currentYearId ?? undefined,
    status: (status || undefined) as RegistrationStatus | undefined,
    pageNumber: page,
    pageSize,
  });

  const students   = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  // ⚠ The export takes the **same** scope as the list above it, pagination excepted — a file
  // covering a different population from the table it sits under is worse than no file at all.
  // The year is the navbar's, explicitly: omitted, the server resolves the current one, which is
  // not necessarily the one being looked at.
  const [exportStudents] = useLazyGetStudentsExportQuery();
  const exportScope = {
    academicYearId: currentYearId ?? undefined,
    program: (program || undefined) as AcademicProgram | undefined,
    levelId: level ? Number(level) : undefined,
    status: (status || undefined) as RegistrationStatus | undefined,
    searchTerm: debouncedSearch.trim() || undefined,
  };

  return (
    <Container fluid>
      <Stack gap="xl">
        <Group justify="space-between" align="flex-end" wrap="wrap">
          <Stack gap={4}>
            <Title order={2} fw={700}>Étudiants</Title>
            <Text size="sm" c="dimmed">
              {data ? `${data.totalCount} étudiant${data.totalCount > 1 ? 's' : ''} au total` : 'Chargement…'}
            </Text>
          </Stack>

          {/* Nom · Prénom · CNE · Apogée · Groupe, plus the promotion and the statut as columns —
              so a row still says where it came from once the file has left the app. */}
          <ExportButton
            fetch={() => exportStudents(exportScope).unwrap()}
            disabledReason={currentYearId ? undefined : "Choisissez une année universitaire dans la barre du haut."}
          />
        </Group>

        <Card padding="lg" radius="lg" withBorder shadow="sm">
          <Stack gap="md">
            <Group gap="sm" wrap="wrap">
              <TextInput
                placeholder="Rechercher par nom, email, CNE, Apogée…"
                leftSection={<IconSearch size={16} stroke={1.5} />}
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
                radius="md"
                style={{ flex: 1, minWidth: rem(240) }}
              />
              <Select
                value={String(pageSize)}
                onChange={(v) => { if (v) setFilter('size', v); }}
                data={PAGE_SIZE_OPTIONS.map(v => ({ value: v, label: `${v} / page` }))}
                radius="md"
                w={120}
              />
            </Group>

            <Group gap="sm" wrap="wrap" align="center">
              <ScrollArea type="never">
                <SegmentedControl
                  value={program}
                  onChange={setProgram}
                  data={PROGRAM_FILTER}
                  radius="md"
                  size="sm"
                  color="navy"
                />
              </ScrollArea>

              {/* The promotion of the year in view, never a promotion the student was once in. */}
              <Select
                placeholder="Toutes les promotions"
                value={level || null}
                onChange={(v) => setFilter('level', v ?? '')}
                data={levelOptions}
                clearable
                searchable
                nothingFoundMessage="Aucun niveau"
                radius="md"
                size="sm"
                w={rem(220)}
              />

              {/* ⚠ The verdict of the *selected year's* registration, resolved server-side on the
                  same row as the promotion — a student diplômé in 2025-2026 and re-registered in
                  2026-2027 is not a « diplômé de 2026-2027 ». That is the ordinary case here, not an
                  edge one: the final year is re-registered every September until the thesis is
                  defended. It is also how the 1 217 diplômés a réinscription records become
                  reachable from a screen rather than only from a downloaded file. */}
              <Select
                placeholder="Toutes les décisions"
                value={status || null}
                onChange={(v) => setFilter('status', v ?? '')}
                data={STATUS_FILTER}
                clearable
                radius="md"
                size="sm"
                w={rem(200)}
              />
            </Group>

            {status && !currentYearId && (
              <Text size="xs" c="dimmed">
                Aucune année n'est sélectionnée dans la barre du haut, donc «&nbsp;
                {STATUS_CFG[status as RegistrationStatus].label}&nbsp;» porte sur{' '}
                <strong>toutes les années</strong>&nbsp;: un étudiant diplômé une année et réinscrit
                la suivante y figure.
              </Text>
            )}

            <ScrollArea>
              <Table
                striped
                highlightOnHover
                verticalSpacing="sm"
                style={{ opacity: isFetching && !isLoading ? 0.6 : 1, transition: 'opacity 150ms' }}
              >
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Étudiant</Table.Th>
                    <Table.Th>CNE / Apogée</Table.Th>
                    <Table.Th>Filière</Table.Th>
                    <Table.Th>Niveau / Groupe</Table.Th>
                    <Table.Th>Inscription</Table.Th>
                    <Table.Th>CIN</Table.Th>
                  </Table.Tr>
                </Table.Thead>

                <Table.Tbody>
                  {isLoading ? (
                    <SkeletonRows count={pageSize} />
                  ) : students.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={6}>
                        <Stack align="center" py="xl" gap="xs">
                          <IconUsers size={32} stroke={1.5} color="#94A3B8" />
                          <Text c="dimmed" size="sm">Aucun étudiant trouvé</Text>
                          {debouncedSearch && (
                            <Text c="dimmed" size="xs">Aucun résultat pour « {debouncedSearch} »</Text>
                          )}
                        </Stack>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    students.map((student) => (
                      <Table.Tr
                        key={student.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`${PATHS.ADMIN.ROOT}/students/${student.id}`)}
                      >
                        <Table.Td>
                          <Group gap="sm" wrap="nowrap">
                            <Avatar
                              size={32} radius="xl"
                              style={{
                                background: 'linear-gradient(135deg, #0F4C81 0%, #0EA5E9 100%)',
                                color: '#fff', fontSize: rem(11), fontWeight: 700, flexShrink: 0,
                              }}
                            >
                              {student.firstName[0]}{student.lastName[0]}
                            </Avatar>
                            <Box style={{ minWidth: 0 }}>
                              <Text size="sm" fw={500} truncate>
                                {student.firstName} {student.lastName}
                              </Text>
                              <Text size="xs" c="dimmed" truncate>{student.email}</Text>
                            </Box>
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Stack gap={0}>
                            <Text size="sm" ff="monospace" c="navy.6">{student.cne}</Text>
                            <Text size="xs" ff="monospace" c="dimmed">{student.appogee}</Text>
                          </Stack>
                        </Table.Td>
                        <Table.Td>
                          <Badge variant="light" color={PROGRAM_COLOR[student.academicProgram]} radius="xl" size="sm">
                            {PROGRAM_SHORT[student.academicProgram]}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          {student.currentLevelLabel ? (
                            <Group gap={6} wrap="nowrap">
                              <Text size="sm" truncate>{student.currentLevelLabel}</Text>
                              {student.currentGroupLabel && (
                                <Badge size="xs" variant="dot" color="grape" radius="sm" style={{ flexShrink: 0 }}>
                                  {student.currentGroupLabel}
                                </Badge>
                              )}
                            </Group>
                          ) : (
                            <Text size="xs" c="dimmed">Non inscrit</Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          {student.currentStatus ? (
                            <Badge size="sm" variant="light" radius="sm" color={STATUS_CFG[student.currentStatus].color}>
                              {STATUS_CFG[student.currentStatus].label}
                            </Badge>
                          ) : (
                            <Text size="xs" c="dimmed">—</Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c={student.cin ? undefined : 'dimmed'} ff="monospace">
                            {student.cin ?? '—'}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </ScrollArea>

            {totalPages > 1 && (
              <Group justify="center">
                <Pagination value={page} onChange={setPage} total={totalPages} radius="md" size="sm" color="navy" />
              </Group>
            )}
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
