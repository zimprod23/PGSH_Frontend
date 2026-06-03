import { useMemo, useState, type ReactNode } from 'react';
import {
  Alert,
  Badge,
  Box,
  Button,
  Center,
  Drawer,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconAlertTriangle,
  IconCalendarEvent,
  IconRefresh,
  IconChevronRight,
  IconChevronDown,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useGetAcademicYearsQuery, useGetYearTimelineQuery } from '../api/adminApi';
import type { TimelineStage, TimelineLevel } from '../types/admin.types';

// ─── Date axis helpers ──────────────────────────────────────────────────────

const BAR_COLORS = ['indigo', 'teal', 'grape', 'orange', 'cyan', 'pink', 'lime', 'blue'] as const;

interface Axis {
  start: dayjs.Dayjs;
  end: dayjs.Dayjs;
  totalDays: number;
}

function makeAxis(start: string | null, end: string | null): Axis | null {
  if (!start || !end) return null;
  const s = dayjs(start);
  const e = dayjs(end);
  const totalDays = Math.max(1, e.diff(s, 'day'));
  return { start: s, end: e, totalDays };
}

function position(axis: Axis, start: string | null, end: string | null) {
  if (!start || !end) return null;
  const left = (dayjs(start).diff(axis.start, 'day') / axis.totalDays) * 100;
  const width = (Math.max(1, dayjs(end).diff(dayjs(start), 'day')) / axis.totalDays) * 100;
  return {
    left: `${Math.max(0, Math.min(100, left))}%`,
    width: `${Math.max(1.5, Math.min(100 - Math.max(0, left), width))}%`,
  };
}

function monthTicks(axis: Axis) {
  const ticks: { label: string; left: string }[] = [];
  let cursor = axis.start.startOf('month');
  if (cursor.isBefore(axis.start)) cursor = cursor.add(1, 'month');
  while (cursor.isBefore(axis.end) || cursor.isSame(axis.end, 'month')) {
    const left = (cursor.diff(axis.start, 'day') / axis.totalDays) * 100;
    if (left >= 0 && left <= 100) {
      ticks.push({ label: cursor.format('MMM YY'), left: `${left}%` });
    }
    cursor = cursor.add(1, 'month');
  }
  return ticks;
}

const fmt = (d: string | null) => (d ? dayjs(d).format('DD/MM/YYYY') : '—');

// ─── Time axis header ────────────────────────────────────────────────────────

function AxisHeader({ axis }: { axis: Axis }) {
  const ticks = monthTicks(axis);
  return (
    <Box style={{ position: 'relative', height: 22, borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
      {ticks.map((t, i) => (
        <Box key={i} style={{ position: 'absolute', left: t.left, top: 0, transform: 'translateX(-1px)' }}>
          <Box style={{ width: 1, height: 8, background: 'var(--mantine-color-gray-3)' }} />
          <Text size="10px" c="dimmed" style={{ whiteSpace: 'nowrap' }}>{t.label}</Text>
        </Box>
      ))}
    </Box>
  );
}

// ─── A positioned bar on a track ───────────────────────────────────────────────

function Track({ axis, children, height = 32 }: { axis: Axis; children: ReactNode; height?: number }) {
  const ticks = monthTicks(axis);
  return (
    <Box style={{ position: 'relative', height, flex: 1, minWidth: 0 }}>
      {ticks.map((t, i) => (
        <Box key={i} style={{ position: 'absolute', left: t.left, top: 0, bottom: 0, width: 1, background: 'var(--mantine-color-gray-1)' }} />
      ))}
      {children}
    </Box>
  );
}

// ─── Stage row (one bar) ────────────────────────────────────────────────────

function StageRow({ axis, stage, color, onOpen }: {
  axis: Axis; stage: TimelineStage; color: string; onOpen: (s: TimelineStage) => void;
}) {
  const pos = position(axis, stage.start, stage.end);
  return (
    <Group gap="sm" wrap="nowrap" align="center" style={{ height: 38 }}>
      <Box w={150} style={{ flexShrink: 0 }}>
        <Text size="xs" fw={600} lineClamp={1}>{stage.stageName}</Text>
        <Text size="10px" c="dimmed">{stage.partitionCount} part. · {stage.cohortCount} cohorte(s)</Text>
      </Box>
      <Track axis={axis}>
        {pos ? (
          <Tooltip label={`${fmt(stage.start)} → ${fmt(stage.end)} · ${stage.slotCount} période(s)`} withinPortal>
            <UnstyledButton
              onClick={() => onOpen(stage)}
              style={{
                position: 'absolute', left: pos.left, width: pos.width, top: 6, height: 26,
                background: `var(--mantine-color-${color}-6)`, borderRadius: 6,
                display: 'flex', alignItems: 'center', gap: 4, padding: '0 8px', overflow: 'hidden',
                boxShadow: '0 1px 2px rgba(0,0,0,.12)',
              }}
            >
              <Text size="10px" c="white" fw={600} lineClamp={1} style={{ flex: 1 }}>{stage.stageName}</Text>
              {stage.hasSaturation && <IconAlertTriangle size={12} color="white" />}
            </UnstyledButton>
          </Tooltip>
        ) : (
          <Text size="10px" c="dimmed" style={{ position: 'absolute', left: 0, top: 9 }}>
            Non planifié (aucun créneau)
          </Text>
        )}
      </Track>
    </Group>
  );
}

// ─── Level section (collapsible) ───────────────────────────────────────────────

function LevelSection({ axis, level, onOpen, baseColorIndex }: {
  axis: Axis; level: TimelineLevel; onOpen: (s: TimelineStage) => void; baseColorIndex: number;
}) {
  const [open, setOpen] = useState(true);
  return (
    <Paper withBorder radius="md" p="sm">
      <Group justify="space-between" mb={open ? 'xs' : 0} wrap="nowrap">
        <UnstyledButton onClick={() => setOpen((o) => !o)}>
          <Group gap={6} wrap="nowrap">
            <ThemeIcon variant="subtle" color="gray" size="sm">
              {open ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
            </ThemeIcon>
            <Text fw={700} size="sm">{level.levelLabel ?? `Niveau ${level.levelId}`}</Text>
            <Badge size="xs" variant="light" color="gray" radius="xl">{level.stages.length} stage(s)</Badge>
          </Group>
        </UnstyledButton>
        <Text size="10px" c="dimmed">{fmt(level.start)} → {fmt(level.end)}</Text>
      </Group>
      {open && (
        <Stack gap={2}>
          {level.stages.map((stage, i) => (
            <StageRow
              key={stage.stageId}
              axis={axis}
              stage={stage}
              color={BAR_COLORS[(baseColorIndex + i) % BAR_COLORS.length]}
              onOpen={onOpen}
            />
          ))}
        </Stack>
      )}
    </Paper>
  );
}

// ─── Partition drill-down drawer ───────────────────────────────────────────────

function PartitionDrawer({ stage, onClose }: { stage: TimelineStage | null; onClose: () => void }) {
  const axis = stage ? makeAxis(stage.start, stage.end) : null;
  return (
    <Drawer opened={!!stage} onClose={onClose} position="right" size="lg" title={
      <Group gap="xs">
        <ThemeIcon variant="light" color="indigo" size="sm"><IconCalendarEvent size={14} /></ThemeIcon>
        <Text fw={700}>{stage?.stageName}</Text>
      </Group>
    }>
      {stage && (
        <Stack gap="md">
          <Text size="xs" c="dimmed">
            {fmt(stage.start)} → {fmt(stage.end)} · {stage.slotCount} période(s) · {stage.partitionCount} partition(s)
          </Text>
          {stage.hasSaturation && (
            <Alert icon={<IconAlertTriangle size={16} />} color="orange" variant="light">
              Une ou plusieurs partitions saturent un service sur leur fenêtre.
            </Alert>
          )}
          {axis && <AxisHeader axis={axis} />}
          <Stack gap={6}>
            {stage.partitions.map((p) => {
              const pos = axis ? position(axis, p.start, p.end) : null;
              return (
                <Group key={p.label ?? '—'} gap="sm" wrap="nowrap" style={{ height: 36 }}>
                  <Group gap={6} w={90} style={{ flexShrink: 0 }} wrap="nowrap">
                    <Badge size="sm" variant="light" color={p.saturated ? 'red' : 'indigo'} radius="sm">
                      {p.label ?? '—'}
                    </Badge>
                    {p.saturated && <IconAlertTriangle size={13} color="var(--mantine-color-red-6)" />}
                  </Group>
                  {axis ? (
                    <Track axis={axis} height={30}>
                      {pos && (
                        <Tooltip label={`${fmt(p.start)} → ${fmt(p.end)} · ${p.cohortCount} cohorte(s) · ${p.studentCount} étud.`} withinPortal>
                          <Box style={{
                            position: 'absolute', left: pos.left, width: pos.width, top: 4, height: 22,
                            background: p.saturated ? 'var(--mantine-color-red-5)' : 'var(--mantine-color-indigo-5)',
                            borderRadius: 6, display: 'flex', alignItems: 'center', padding: '0 8px',
                          }}>
                            <Text size="10px" c="white" fw={600} lineClamp={1}>
                              {p.cohortCount} coh. · {p.studentCount} étud.
                            </Text>
                          </Box>
                        </Tooltip>
                      )}
                    </Track>
                  ) : (
                    <Text size="xs" c="dimmed">Aucune fenêtre planifiée</Text>
                  )}
                </Group>
              );
            })}
          </Stack>
        </Stack>
      )}
    </Drawer>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function StageTimelinePage() {
  const { data: years = [] } = useGetAcademicYearsQuery();
  const [yearId, setYearId] = useState<string | null>(null);
  const [stage, setStage] = useState<TimelineStage | null>(null);
  const [drawerOpen, drawer] = useDisclosure(false);

  const effectiveYearId = yearId ?? (years.find((y) => y.isCurrent)?.id ?? years[0]?.id)?.toString() ?? null;

  const { data, isFetching, refetch } = useGetYearTimelineQuery(
    { academicYearId: Number(effectiveYearId) },
    { skip: !effectiveYearId, refetchOnMountOrArgChange: true },
  );

  const axis = useMemo(() => makeAxis(data?.start ?? null, data?.end ?? null), [data?.start, data?.end]);

  const yearOptions = years.map((y) => ({ value: String(y.id), label: y.isCurrent ? `${y.label} (actuelle)` : y.label }));

  const openStage = (s: TimelineStage) => { setStage(s); drawer.open(); };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <Stack gap={2}>
          <Text fw={700} size="xl">Calendrier des stages</Text>
          <Text size="sm" c="dimmed">Vue chronologique des stages et de leurs partitions sur l'année.</Text>
        </Stack>
        <Group align="flex-end" gap="sm">
          <Select label="Année académique" placeholder="Sélectionner" data={yearOptions}
            value={effectiveYearId} onChange={setYearId} w={240} />
          <Button variant="light" color="gray" leftSection={<IconRefresh size={16} />}
            loading={isFetching} onClick={() => refetch()}>
            Actualiser
          </Button>
        </Group>
      </Group>

      {isFetching && !data ? (
        <Center py={80}><Loader /></Center>
      ) : !data || data.levels.length === 0 ? (
        <Center py={80}>
          <Stack align="center" gap="md" maw={380}>
            <ThemeIcon size={64} radius="xl" variant="light" color="indigo">
              <IconCalendarEvent size={30} stroke={1.5} />
            </ThemeIcon>
            <Text fw={600} ta="center">Aucun stage planifié pour cette année</Text>
            <Text size="sm" c="dimmed" ta="center">
              Créez des cohortes et planifiez leurs créneaux depuis l'onglet Groupes / Stages pour les voir apparaître ici.
            </Text>
          </Stack>
        </Center>
      ) : !axis ? (
        <Alert icon={<IconAlertTriangle size={16} />} color="blue" variant="light">
          Les stages existent mais aucun créneau daté n'est défini — définissez les périodes pour afficher la chronologie.
        </Alert>
      ) : (
        <ScrollArea type="auto">
          <Box style={{ minWidth: 720 }}>
            <Group gap="sm" wrap="nowrap" mb={4}>
              <Box w={150} style={{ flexShrink: 0 }} />
              <Box style={{ flex: 1, minWidth: 0 }}><AxisHeader axis={axis} /></Box>
            </Group>
            <Stack gap="md">
              {data.levels.map((level, li) => (
                <LevelSection
                  key={level.levelId}
                  axis={axis}
                  level={level}
                  onOpen={openStage}
                  baseColorIndex={li * 2}
                />
              ))}
            </Stack>
          </Box>
        </ScrollArea>
      )}

      <PartitionDrawer stage={drawerOpen ? stage : null} onClose={drawer.close} />
    </Stack>
  );
}
