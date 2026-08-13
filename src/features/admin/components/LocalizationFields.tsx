import { Group, Stack, Text, TextInput } from '@mantine/core';
import type { Coordinates } from './localization';

export function LocalizationFields({
  value,
  onChange,
  description,
}: {
  value: Coordinates;
  onChange: (next: Partial<Coordinates>) => void;
  description?: string;
}) {
  return (
    <Stack gap={6}>
      <Text size="sm" fw={600}>Localisation</Text>
      {description && <Text size="xs" c="dimmed">{description}</Text>}
      <Group grow>
        <TextInput label="Longitude (X)" placeholder="-6.8498" value={value.localizationX} onChange={(e) => onChange({ localizationX: e.target.value })} radius="md" size="sm" />
        <TextInput label="Latitude (Y)" placeholder="34.0209" value={value.localizationY} onChange={(e) => onChange({ localizationY: e.target.value })} radius="md" size="sm" />
        <TextInput label="Altitude (Z)" placeholder="Optionnel" value={value.localizationZ} onChange={(e) => onChange({ localizationZ: e.target.value })} radius="md" size="sm" />
      </Group>
    </Stack>
  );
}
