import { useState } from 'react';
import { Center, Group, Loader, Pagination, Table, Text, TextInput } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconSearch } from '@tabler/icons-react';
import { useGetServiceOccupantsQuery } from '../../api/adminApi';

/**
 * The students physically in the service over one stretch of the timeline, named.
 *
 * ⚠ **Paged, and not optionally.** A saturated stretch on the current data holds 85 students, and the
 * reason anyone opens one is that it is over capacity — the rows are most numerous exactly where they
 * will be read. The window comes from the segment rather than from a période: a segment is cut at
 * window boundaries and generally coincides with no single `StageSlot`.
 */

const PAGE_SIZE = 25;

interface Props {
  serviceId: number;
  startDate: string;
  endDate: string;
  total: number;
}

export function ServiceOccupantsTable({ serviceId, startDate, endDate, total }: Props) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 350);

  // A new term makes the current page meaningless — page 3 of the old result set is very likely
  // empty in the new one. Adjusted during render rather than in an effect: an effect would paint the
  // stale page once first, and would fetch it.
  const [termInUse, setTermInUse] = useState(debouncedSearch);
  if (termInUse !== debouncedSearch) {
    setTermInUse(debouncedSearch);
    setPage(1);
  }

  const { data, isFetching } = useGetServiceOccupantsQuery({
    serviceId,
    startDate,
    endDate,
    pageNumber: page,
    pageSize: PAGE_SIZE,
    // Below two characters the term would match most of the promotion, so it is not sent at all —
    // the unfiltered page is the cheaper and more useful answer.
    searchTerm: debouncedSearch.length >= 2 ? debouncedSearch : undefined,
  });

  const totalPages = data ? Math.ceil(data.totalCount / PAGE_SIZE) : 0;

  return (
    <>
      <Group justify="space-between" align="center" mb="xs">
        <TextInput
          size="xs"
          w={260}
          placeholder="Nom, prénom ou CNE…"
          leftSection={<IconSearch size={14} />}
          rightSection={isFetching ? <Loader size={12} /> : null}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
        />
        <Text size="xs" c="dimmed">
          {data ? `${data.totalCount} étudiant(s)` : `${total} étudiant(s)`}
        </Text>
      </Group>

      {!data ? (
        <Center h={80}><Loader size="sm" color="navy" /></Center>
      ) : data.items.length === 0 ? (
        <Text size="sm" c="dimmed" ta="center" py="md">Aucun étudiant ne correspond.</Text>
      ) : (
        <>
          <Table verticalSpacing={4} horizontalSpacing="sm" striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Étudiant</Table.Th>
                <Table.Th>CNE</Table.Th>
                <Table.Th>Promotion</Table.Th>
                <Table.Th>Groupe</Table.Th>
                <Table.Th>Stage</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.items.map((o) => (
                <Table.Tr key={`${o.studentId}-${o.stageId}-${o.periodNumber}`}>
                  <Table.Td><Text size="sm">{o.lastName} {o.firstName}</Text></Table.Td>
                  <Table.Td><Text size="sm" c="dimmed">{o.cne ?? '—'}</Text></Table.Td>
                  <Table.Td><Text size="sm" c="dimmed">{o.levelLabel}</Text></Table.Td>
                  <Table.Td>
                    <Text size="sm" style={{ fontVariantNumeric: 'tabular-nums' }}>{o.groupNumber}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">{o.stageName} · P{o.periodNumber}</Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>

          {totalPages > 1 && (
            <Group justify="center" mt="sm">
              <Pagination size="sm" value={page} onChange={setPage} total={totalPages} color="navy" />
            </Group>
          )}
        </>
      )}
    </>
  );
}
