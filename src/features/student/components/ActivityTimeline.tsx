import {
  Box,
  Card,
  Group,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
  rem,
  Anchor,
} from '@mantine/core';
import type { StudentHistoryResponse } from '../types/student.types';
import { timeAgo } from '../utils/format';
import { getHistoryConfig } from '../utils/historyConfig';

interface Props {
  events: StudentHistoryResponse[];
  loading: boolean;
  onSeeAll?: () => void;
}

export function ActivityTimeline({ events, loading, onSeeAll }: Props) {
  return (
    <Card padding="lg" radius="lg" withBorder shadow="sm" style={{ height: '100%' }}>
      <Group justify="space-between" mb="md">
        <Text fw={600} size="sm">Activité récente</Text>
        {onSeeAll && (
          <Anchor size="xs" c="navy.6" onClick={onSeeAll} style={{ cursor: 'pointer' }}>
            Tout voir
          </Anchor>
        )}
      </Group>

      {loading ? (
        <Stack gap="md">
          {Array.from({ length: 4 }).map((_, i) => (
            <Group key={i} gap="sm">
              <Skeleton circle height={32} />
              <Stack gap={4} style={{ flex: 1 }}>
                <Skeleton height={14} width="70%" />
                <Skeleton height={11} width="40%" />
              </Stack>
            </Group>
          ))}
        </Stack>
      ) : events.length === 0 ? (
        <Stack align="center" justify="center" style={{ flex: 1, minHeight: rem(160) }}>
          <Text c="dimmed" size="sm" ta="center">Aucune activité récente</Text>
        </Stack>
      ) : (
        <Stack gap={0}>
          {events.map((event, index) => {
            const { icon: Icon, color, label } = getHistoryConfig(event.historyType);
            const isLast = index === events.length - 1;

            return (
              <Group key={event.id} gap="sm" align="flex-start">
                {/* Timeline line + icon */}
                <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <ThemeIcon variant="light" color={color} size={32} radius="xl">
                    <Icon size={15} stroke={1.5} />
                  </ThemeIcon>
                  {!isLast && (
                    <Box
                      style={{
                        width: 1,
                        flex: 1,
                        minHeight: rem(20),
                        background: '#E2E8F0',
                        margin: `${rem(4)} 0`,
                      }}
                    />
                  )}
                </Box>

                {/* Content */}
                <Stack gap={2} pb={isLast ? 0 : 'sm'} style={{ flex: 1 }}>
                  <Text size="sm" fw={500}>{label}</Text>
                  <Text size="xs" c="dimmed">{timeAgo(event.createdAt)}</Text>
                </Stack>
              </Group>
            );
          })}
        </Stack>
      )}
    </Card>
  );
}
