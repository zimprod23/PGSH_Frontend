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
import { useDebouncedValue } from '@mantine/hooks';
import { IconSearch, IconUsers } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetStudentsQuery } from '../../api/adminApi';
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
  Validated: { label: 'Validée',    color: 'teal'    },
  Failed:    { label: 'Échouée',    color: 'red'     },
  Withdrawn: { label: 'Retirée',    color: 'orange'  },
};

const PROGRAM_FILTER: { value: string; label: string }[] = [
  { value: '',          label: 'Tous'      },
  { value: 'Medecine',  label: 'Médecine'  },
  { value: 'Pharmacie', label: 'Pharmacie' },
  { value: 'Master',    label: 'Master'    },
  { value: 'Doctorat',  label: 'Doctorat'  },
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

export default function StudentListPage() {
  const navigate = useNavigate();

  const [search, setSearch]         = useState('');
  const [program, setProgram]       = useState('');
  const [page, setPage]             = useState(1);
  const [pageSize, setPageSize]     = useState(15);

  const [debouncedSearch] = useDebouncedValue(search, 350);

  useEffect(() => { setPage(1); }, [debouncedSearch, program]);

  const { data, isLoading, isFetching } = useGetStudentsQuery({
    searchTerm: debouncedSearch.trim() || undefined,
    program: (program || undefined) as AcademicProgram | undefined,
    pageNumber: page,
    pageSize,
  });

  const students   = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

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
                onChange={(v) => { if (v) { setPageSize(Number(v)); setPage(1); } }}
                data={PAGE_SIZE_OPTIONS.map(v => ({ value: v, label: `${v} / page` }))}
                radius="md"
                w={120}
              />
            </Group>

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
