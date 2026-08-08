import { Badge, Card, Group, ScrollArea, Stack, Text, UnstyledButton, rem } from '@mantine/core';
import type { ParcoursYear } from '../types/parcours.types';

interface Props {
  years: ParcoursYear[];
  /** Registration id of the selected year. */
  value: string;
  onChange: (registrationId: string) => void;
}

/**
 * Horizontal picker over the student's registrations, most recent first. The portal is
 * year-scoped by nature — a stage belongs to the year it was served in — so switching year is the
 * primary navigation of every stage screen, not a filter tucked into a dropdown.
 */
export function AcademicYearRail({ years, value, onChange }: Props) {
  if (years.length <= 1) return null;

  return (
    <ScrollArea type="auto" offsetScrollbars scrollbarSize={6}>
      <Group gap="sm" wrap="nowrap" pb={4}>
        {years.map((year) => {
          const selected = year.registrationId === value;
          return (
            <UnstyledButton
              key={year.registrationId}
              onClick={() => onChange(year.registrationId)}
              style={{ flexShrink: 0 }}
            >
              <Card
                padding="sm"
                radius="md"
                withBorder
                shadow={selected ? 'sm' : undefined}
                style={{
                  minWidth: rem(168),
                  borderColor: selected
                    ? 'var(--mantine-color-navy-5)'
                    : 'var(--mantine-color-gray-3)',
                  borderWidth: selected ? 2 : 1,
                  background: selected ? 'var(--mantine-color-navy-0)' : undefined,
                }}
              >
                <Stack gap={4}>
                  <Group justify="space-between" wrap="nowrap" gap="xs">
                    <Text size="sm" fw={700} c={selected ? 'navy.8' : undefined}>
                      {year.academicYearLabel}
                    </Text>
                    {year.isCurrent && (
                      <Badge size="xs" variant="filled" color="sky" radius="sm">
                        Actuelle
                      </Badge>
                    )}
                  </Group>

                  <Text size="xs" c="dimmed" lineClamp={1}>
                    {year.levelLabel ?? `Année ${year.levelYear}`}
                  </Text>

                  <Text size="xs" c={year.totals.total === 0 ? 'dimmed' : 'teal.7'} fw={600}>
                    {year.totals.total === 0
                      ? 'Aucun stage'
                      : `${year.totals.validated}/${year.totals.total} validés`}
                  </Text>
                </Stack>
              </Card>
            </UnstyledButton>
          );
        })}
      </Group>
    </ScrollArea>
  );
}
