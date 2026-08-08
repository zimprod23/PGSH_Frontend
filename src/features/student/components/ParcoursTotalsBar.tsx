import { Box, Group, Progress, Stack, Text, Tooltip, rem } from '@mantine/core';
import type { ParcoursTotals } from '../types/parcours.types';
import { STAGE_STATE, type StageState } from '../utils/stageState';

/** Buckets in the order a stage moves through them, so the bar reads left-to-right as progress. */
const SEGMENTS: Array<{ state: Exclude<StageState, 'unplanned'>; of: (t: ParcoursTotals) => number }> = [
  { state: 'validated', of: (t) => t.validated },
  { state: 'failed',    of: (t) => t.failed },
  { state: 'awaiting',  of: (t) => t.awaitingVerdict },
  { state: 'ongoing',   of: (t) => t.ongoing },
  { state: 'planned',   of: (t) => t.planned },
];

interface Props {
  totals: ParcoursTotals;
  legend?: boolean;
  /** Adds the "n sur m validés" line and the percentage above the bar. */
  headline?: boolean;
  size?: string;
}

function LegendChip({ state, count }: { state: Exclude<StageState, 'unplanned'>; count: number }) {
  const cfg = STAGE_STATE[state];

  return (
    <Group
      gap={6}
      wrap="nowrap"
      px={8}
      py={3}
      style={{
        borderRadius: rem(999),
        background: `var(--mantine-color-${cfg.color}-0)`,
        border: `1px solid var(--mantine-color-${cfg.color}-2)`,
      }}
    >
      <Box
        style={{
          width: 7, height: 7, borderRadius: 4, flexShrink: 0,
          background: `var(--mantine-color-${cfg.color}-6)`,
        }}
      />
      <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
        {cfg.label}
      </Text>
      <Text size="xs" fw={700} c={`${cfg.color}.8`}>{count}</Text>
    </Group>
  );
}

/**
 * The five buckets as one bar. Replaces the pair of stat cards that both counted every assignment,
 * so a stage that had been served, closed and marked still showed up as "planifié".
 */
export function ParcoursTotalsBar({ totals, legend = true, headline = false, size = 'md' }: Props) {
  if (totals.total === 0) {
    return <Text size="xs" c="dimmed">Aucun stage affecté pour le moment.</Text>;
  }

  const shown = SEGMENTS.filter((s) => s.of(totals) > 0);
  const pct = Math.round((totals.validated / totals.total) * 100);

  return (
    <Stack gap="xs">
      {headline && (
        <Group justify="space-between" align="baseline" wrap="nowrap" gap="xs">
          <Text size="sm" fw={600} lineClamp={1}>
            {totals.validated} sur {totals.total} validé{totals.total > 1 ? 's' : ''}
          </Text>
          <Text size="sm" fw={700} c={pct === 100 ? 'teal.7' : 'navy.7'} style={{ flexShrink: 0 }}>
            {pct} %
          </Text>
        </Group>
      )}

      <Progress.Root size={size} radius="xl" style={{ background: 'var(--mantine-color-gray-2)' }}>
        {shown.map(({ state, of }) => {
          const count = of(totals);
          const cfg = STAGE_STATE[state];
          return (
            <Tooltip key={state} label={`${cfg.label} : ${count}`} withArrow>
              <Progress.Section value={(count / totals.total) * 100} color={cfg.color} />
            </Tooltip>
          );
        })}
      </Progress.Root>

      {legend && (
        <Group gap={6} wrap="wrap">
          {shown.map(({ state, of }) => (
            <LegendChip key={state} state={state} count={of(totals)} />
          ))}
        </Group>
      )}
    </Stack>
  );
}
