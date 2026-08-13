import { ActionIcon, Alert, Badge, Button, Group, NumberInput, Select, Stack, Table, Text, Tooltip, rem } from '@mantine/core';
import { IconAlertTriangle, IconInfoCircle, IconPlus, IconTrash } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import type { AdminLevelResponse, ServiceLevelCapacity } from '../types/admin.types';

/**
 * Authors a service's intake rules: how many students of each promotion it takes at once.
 *
 * Two things this control has to communicate, because the data model cannot say them out loud:
 *
 * 1. **An empty list means the service takes every promotion.** Adding the first rule closes it to
 *    every promotion without one. Users read an empty table as "not configured yet" and a first row
 *    as "added an allowance"; it is really a switch from open to closed.
 * 2. **Quotas replace the service's total capacity, they do not sit under it.** As soon as one row
 *    exists, "Capacité totale" governs nothing — so the banner says so, otherwise admins go on
 *    tuning a number that no longer has any effect.
 *
 * Hence a banner that changes with state rather than static help text.
 */
export function ServiceLevelCapacityEditor({
  value,
  levels,
  serviceCapacity,
  onChange,
}: {
  value: ServiceLevelCapacity[];
  levels: AdminLevelResponse[];
  serviceCapacity: number;
  onChange: (next: ServiceLevelCapacity[]) => void;
}) {
  const [pendingLevel, setPendingLevel] = useState<string | null>(null);

  const levelById = useMemo(
    () => new Map(levels.map((l) => [l.id, l])),
    [levels],
  );

  const labelFor = (levelId: number) => {
    const level = levelById.get(levelId);
    if (!level) return `Niveau ${levelId}`;
    return `${level.label ?? `${level.year}ᵉ année`} — ${level.academicProgram}`;
  };

  const used = new Set(value.map((q) => q.levelId));
  const available = levels
    .filter((l) => !used.has(l.id))
    .map((l) => ({ value: String(l.id), label: labelFor(l.id) }));

  const addQuota = () => {
    if (!pendingLevel) return;
    // Default to the ceiling: the common restriction is "this promotion only", not "and fewer of them".
    onChange([...value, { levelId: Number(pendingLevel), capacity: serviceCapacity }]);
    setPendingLevel(null);
  };

  const setCapacity = (levelId: number, capacity: number) =>
    onChange(value.map((q) => (q.levelId === levelId ? { ...q, capacity } : q)));

  const remove = (levelId: number) => onChange(value.filter((q) => q.levelId !== levelId));

  const sum = value.reduce((total, q) => total + q.capacity, 0);

  return (
    <Stack gap="sm">
      <Group gap="xs" justify="space-between" wrap="wrap">
        <Text size="sm" fw={600}>Quotas par promotion</Text>
        {value.length === 0
          ? <Badge variant="light" color="success" radius="xl" size="sm">Ouvert à toutes les promotions</Badge>
          : <Badge variant="light" color="warning" radius="xl" size="sm">Réservé à {value.length} promotion(s)</Badge>}
      </Group>

      {value.length === 0 ? (
        <Alert variant="light" color="sky" radius="md" icon={<IconInfoCircle size={16} stroke={1.5} />}>
          Ce service accueille <b>toutes les promotions</b>, dans la limite de sa capacité de {serviceCapacity} places.
          Ajoutez un quota ci-dessous pour le réserver à certaines promotions — les autres n'y seront alors plus affectables.
        </Alert>
      ) : (
        <Alert variant="light" color="warning" radius="md" icon={<IconAlertTriangle size={16} stroke={1.5} />}>
          Seules les promotions listées ci-dessous peuvent être affectées à ce service, chacune dans
          la limite de son quota. La <b>capacité totale ci-dessus n'est plus prise en compte</b> tant
          qu'au moins un quota est défini. Retirez tous les quotas pour rouvrir le service à
          l'ensemble des promotions et revenir à sa capacité totale.
        </Alert>
      )}

      {value.length > 0 && (
        <Table verticalSpacing="xs" withTableBorder={false}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Promotion</Table.Th>
              <Table.Th w={140}>Places</Table.Th>
              <Table.Th w={48} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {value.map((quota) => (
              <Table.Tr key={quota.levelId}>
                <Table.Td><Text size="sm">{labelFor(quota.levelId)}</Text></Table.Td>
                <Table.Td>
                  {/* Not capped at serviceCapacity: that number no longer applies to a service
                      carrying quotas, so a quota above it contradicts nothing. */}
                  <NumberInput
                    value={quota.capacity}
                    onChange={(v) => setCapacity(quota.levelId, Number(v) || 1)}
                    min={1}
                    max={200}
                    size="xs"
                    radius="md"
                  />
                </Table.Td>
                <Table.Td>
                  <Tooltip label="Retirer ce quota">
                    <ActionIcon variant="subtle" color="red" size="sm" radius="md" onClick={() => remove(quota.levelId)}>
                      <IconTrash size={rem(14)} stroke={1.5} />
                    </ActionIcon>
                  </Tooltip>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      {/* Stated, not warned about: the sum exceeding the old total is permitted and common, but an
          admin who set "20" upstairs deserves to know the service may now hold more than that. */}
      {value.length > 0 && (
        <Text size="xs" c="dimmed">
          Total des quotas : {sum} place(s) réparties sur {value.length} promotion(s).
          Chaque promotion est plafonnée séparément, il n'y a pas de limite globale supplémentaire.
        </Text>
      )}

      <Group gap="sm" align="flex-end" wrap="nowrap">
        <Select
          placeholder={available.length === 0 ? 'Toutes les promotions ont un quota' : 'Ajouter une promotion…'}
          data={available}
          value={pendingLevel}
          onChange={setPendingLevel}
          disabled={available.length === 0}
          radius="md"
          size="sm"
          searchable
          style={{ flex: 1 }}
        />
        <Button
          variant="light"
          color="navy"
          radius="md"
          size="sm"
          leftSection={<IconPlus size={14} stroke={1.5} />}
          disabled={!pendingLevel}
          onClick={addQuota}
        >
          Ajouter
        </Button>
      </Group>
    </Stack>
  );
}
