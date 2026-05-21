import { Card, Group, Skeleton, Stack, Text, ThemeIcon, rem } from '@mantine/core';
import type { ComponentType } from 'react';

interface Props {
  icon: ComponentType<{ size?: number; stroke?: number }>;
  iconColor: string;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  loading?: boolean;
}

export function StatCard({ icon: Icon, iconColor, label, value, sub, loading }: Props) {
  if (loading) {
    return <Skeleton height={100} radius="lg" />;
  }

  return (
    <Card padding="lg" radius="lg" withBorder shadow="sm">
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <Stack gap={4}>
          <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
            {label}
          </Text>
          <Text fw={700} style={{ fontSize: rem(24), lineHeight: 1.2 }}>
            {value}
          </Text>
          {sub && (
            <Text size="xs" c="dimmed">{sub}</Text>
          )}
        </Stack>

        <ThemeIcon variant="light" color={iconColor} size={40} radius="md" style={{ flexShrink: 0 }}>
          <Icon size={20} stroke={1.5} />
        </ThemeIcon>
      </Group>
    </Card>
  );
}
