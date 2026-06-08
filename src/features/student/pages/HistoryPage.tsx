import {
  Badge,
  Box,
  Card,
  Center,
  Container,
  Divider,
  Grid,
  Group,
  rem,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import { IconTimeline } from '@tabler/icons-react';
import { useGetCurrentStudentQuery, useGetStudentHistoryQuery } from '../api/studentApi';
import type { StudentHistoryResponse } from '../types/student.types';
import type { HistoryType } from '../../../common/types';
import { formatDate, getAcademicYear } from '../utils/format';
import { getHistoryConfig } from '../utils/historyConfig';

// ─── Single timeline event ────────────────────────────────────────────────────

function HistoryItem({
  event,
  isLast,
}: {
  event: StudentHistoryResponse;
  isLast: boolean;
}) {
  const { icon: Icon, color, label } = getHistoryConfig(event.historyType);

  const metaEntries = event.metadata
    ? Object.entries(event.metadata).filter(([, v]) => v !== null && v !== '')
    : [];

  return (
    <Group gap="sm" align="flex-start">
      {/* Icon + vertical line */}
      <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <ThemeIcon variant="light" color={color} size={36} radius="xl">
          <Icon size={17} stroke={1.5} />
        </ThemeIcon>
        {!isLast && (
          <Box
            style={{
              width: 1,
              flex: 1,
              minHeight: rem(24),
              background: '#E2E8F0',
              margin: `${rem(4)} 0`,
            }}
          />
        )}
      </Box>

      {/* Content */}
      <Stack gap={4} pb={isLast ? 0 : 'lg'} style={{ flex: 1, minWidth: 0 }}>
        <Group justify="space-between" wrap="nowrap">
          <Text size="sm" fw={600}>{label}</Text>
          <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
            {formatDate(event.createdAt)}
          </Text>
        </Group>

        {metaEntries.length > 0 && (
          <Box
            p="xs"
            style={{
              background: '#F8FAFC',
              borderRadius: rem(6),
              border: '1px solid #E2E8F0',
            }}
          >
            {metaEntries.map(([key, value]) => (
              <Group key={key} gap="xs">
                <Text size="xs" c="dimmed" tt="capitalize">{key}:</Text>
                <Text size="xs">{String(value)}</Text>
              </Group>
            ))}
          </Box>
        )}
      </Stack>
    </Group>
  );
}

// ─── Timeline grouped by academic year ───────────────────────────────────────

function HistoryTimeline({ events }: { events: StudentHistoryResponse[] }) {
  if (events.length === 0) {
    return (
      <Center py={80}>
        <Stack align="center" gap="md" maw={320}>
          <ThemeIcon size={64} radius="xl" variant="light" color="navy">
            <IconTimeline style={{ width: rem(30), height: rem(30) }} stroke={1.5} />
          </ThemeIcon>
          <Stack align="center" gap={4}>
            <Text fw={600}>Aucune activité</Text>
            <Text size="sm" c="dimmed" ta="center">
              Votre historique académique apparaîtra ici au fil de votre parcours.
            </Text>
          </Stack>
        </Stack>
      </Center>
    );
  }

  // Group events by academic year, most recent first
  const grouped = events.reduce<Record<string, StudentHistoryResponse[]>>((acc, e) => {
    const year = getAcademicYear(e.createdAt);
    (acc[year] ??= []).push(e);
    return acc;
  }, {});

  const sortedYears = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <Stack gap="xl">
      {sortedYears.map((year) => {
        const yearEvents = grouped[year];
        return (
          <Stack key={year} gap="md">
            <Group gap="sm">
              <Text size="xs" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: '0.5px' }}>
                {year}
              </Text>
              <Divider style={{ flex: 1 }} />
              <Badge size="xs" variant="light" color="navy" radius="xl">
                {yearEvents.length}
              </Badge>
            </Group>

            <Stack gap={0}>
              {yearEvents.map((event, i) => (
                <HistoryItem
                  key={event.id}
                  event={event}
                  isLast={i === yearEvents.length - 1}
                />
              ))}
            </Stack>
          </Stack>
        );
      })}
    </Stack>
  );
}

// ─── Stats card ───────────────────────────────────────────────────────────────

function StatsCard({ events }: { events: StudentHistoryResponse[] }) {
  const countByType = events.reduce<Partial<Record<HistoryType, number>>>((acc, e) => {
    acc[e.historyType] = (acc[e.historyType] ?? 0) + 1;
    return acc;
  }, {});

  const entries = (Object.keys(countByType) as HistoryType[])
    .sort((a, b) => (countByType[b] ?? 0) - (countByType[a] ?? 0));

  return (
    <Card padding="lg" radius="lg" withBorder shadow="sm">
      <Stack gap="md">
        <Text fw={600} size="sm">Résumé</Text>

        <Stack gap={4}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600} style={{ letterSpacing: '0.5px' }}>
            Total
          </Text>
          <Text fw={800} style={{ fontSize: rem(32), lineHeight: 1 }}>
            {events.length}
          </Text>
          <Text size="xs" c="dimmed">événements</Text>
        </Stack>

        {entries.length > 0 && (
          <>
            <Divider />
            <Stack gap="sm">
              <Text size="xs" c="dimmed" tt="uppercase" fw={600} style={{ letterSpacing: '0.5px' }}>
                Par type
              </Text>
              {entries.map((type) => {
                const { color, label } = getHistoryConfig(type);
                return (
                  <Group key={type} justify="space-between">
                    <Badge variant="light" color={color} radius="xl" size="sm">
                      {label}
                    </Badge>
                    <Text size="sm" fw={600}>{countByType[type]}</Text>
                  </Group>
                );
              })}
            </Stack>
          </>
        )}
      </Stack>
    </Card>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function HistoryPageSkeleton() {
  return (
    <Grid gutter="lg" align="flex-start">
      <Grid.Col span={{ base: 12, md: 8 }}>
        <Card padding="lg" radius="lg" withBorder shadow="sm">
          <Stack gap="lg">
            {Array.from({ length: 4 }).map((_, i) => (
              <Group key={i} gap="sm" align="flex-start">
                <Skeleton circle height={36} style={{ flexShrink: 0 }} />
                <Stack gap={6} style={{ flex: 1 }}>
                  <Skeleton height={14} width="60%" />
                  <Skeleton height={11} width="35%" />
                </Stack>
              </Group>
            ))}
          </Stack>
        </Card>
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 4 }}>
        <Card padding="lg" radius="lg" withBorder shadow="sm">
          <Stack gap="md">
            <Skeleton height={14} width={80} />
            <Skeleton height={40} width={60} />
            <Divider />
            {Array.from({ length: 3 }).map((_, i) => (
              <Group key={i} justify="space-between">
                <Skeleton height={22} width={120} radius="xl" />
                <Skeleton height={14} width={20} />
              </Group>
            ))}
          </Stack>
        </Card>
      </Grid.Col>
    </Grid>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const { data: student } = useGetCurrentStudentQuery();

  const { data: events = [], isLoading } = useGetStudentHistoryQuery(
    student?.id ?? '',
    { skip: !student?.id },
  );

  return (
    <Container fluid>
      <Stack gap="xl">
        <Stack gap={4}>
          <Title order={2} fw={700}>Historique</Title>
          <Text size="sm" c="dimmed">
            Votre parcours académique et vos événements importants.
          </Text>
        </Stack>

        {isLoading ? (
          <HistoryPageSkeleton />
        ) : (
          <Grid gutter="lg" align="flex-start">
            <Grid.Col span={{ base: 12, md: 8 }}>
              <Card padding="lg" radius="lg" withBorder shadow="sm">
                <HistoryTimeline events={events} />
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <StatsCard events={events} />
            </Grid.Col>
          </Grid>
        )}
      </Stack>
    </Container>
  );
}
