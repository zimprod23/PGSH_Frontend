import { Box, Group, Text, ThemeIcon } from '@mantine/core';
import type { ComponentType } from 'react';

interface Props {
  icon: ComponentType<{ size?: number; stroke?: number }>;
  iconColor: string;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}

export function ProfileFieldCell({ icon: Icon, iconColor, label, value, mono }: Props) {
  return (
    <Box
      p="md"
      style={{
        border: '1px solid #E2E8F0',
        borderRadius: 8,
        background: '#fff',
      }}
    >
      <Group gap="xs" mb={6}>
        <ThemeIcon variant="light" color={iconColor} size={22} radius="sm">
          <Icon size={13} stroke={1.5} />
        </ThemeIcon>
        <Text size="xs" fw={600} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.4px' }}>
          {label}
        </Text>
      </Group>
      <Text
        size="sm"
        fw={500}
        c={value === '—' ? 'dimmed' : 'dark'}
        ff={mono ? 'monospace' : undefined}
      >
        {value ?? '—'}
      </Text>
    </Box>
  );
}
