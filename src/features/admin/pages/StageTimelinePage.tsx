import { useMemo, useState, type ReactNode } from 'react';
import {
  Alert,
  Badge,
  Box,
  Button,
  Center,
  Collapse,
  Drawer,
  Group,
  Loader,
  Paper,
  ScrollArea,
  SimpleGrid,
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
import { useGetYearTimelineQuery } from '../api/adminApi';
import { useAcademicYear } from '../contexts/useAcademicYear';
import type { TimelineStage, TimelineLevel, TimelinePartition } from '../types/admin.types';

// ─── Date axis helpers ──────────────────────────────────────────────────────

const BAR_COLORS = ['indigo', 'teal', 'grape', 'orange', 'cyan', 'pink', 'lime', 'blue'] as const;

const PAUSE_LABELS: Record<string, string> = {
  Exam: 'Examens',
  Holiday: 'Vacances',
  Other: 'Pause',
};

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

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function monthTicks(axis: Axis) {
  const ticks: { label: string; left: string }[] = [];
  let cursor = axis.start.startOf('month');
  if (cursor.isBefore(axis.start)) cursor = cursor.add(1, 'month');
  while (cursor.isBefore(axis.end) || cursor.isSame(axis.end, 'month')) {
    const left = (cursor.diff(axis.start, 'day') / axis.totalDays) * 100;
    if (left >= 0 && left <= 100) {
      ticks.push({ label: cap(cursor.locale('fr').format('MMM YYYY')), left: `${left}%` });
    }
    cursor = cursor.add(1, 'month');
  }
  return ticks;
}

// Alternating month-wide bands give the grid a calendar feel and make spans easier to read.
function monthBands(axis: Axis) {
  const bands: { left: number; width: number; shaded: boolean }[] = [];
  let cursor = axis.start.startOf('month');
  let idx = 0;
  while (cursor.isBefore(axis.end)) {
    const next = cursor.add(1, 'month');
    const segStart = cursor.isBefore(axis.start) ? axis.start : cursor;
    const segEnd = next.isAfter(axis.end) ? axis.end : next;
    const left = (segStart.diff(axis.start, 'day') / axis.totalDays) * 100;
    const width = (segEnd.diff(segStart, 'day') / axis.totalDays) * 100;
    if (width > 0) bands.push({ left, width, shaded: idx % 2 === 1 });
    cursor = next;
    idx += 1;
  }
  return bands;
}

// Position of "today" on the axis, or null when outside the planned range.
function todayLeft(axis: Axis): number | null {
  const now = dayjs();
  if (now.isBefore(axis.start) || now.isAfter(axis.end)) return null;
  return (now.diff(axis.start, 'day') / axis.totalDays) * 100;
}

const fmt = (d: string | null) => (d ? dayjs(d).format('DD/MM/YYYY') : '—');

// ─── Time axis header ────────────────────────────────────────────────────────

function AxisHeader({ axis }: { axis: Axis }) {
  const ticks = monthTicks(axis);
  const today = todayLeft(axis);
  return (
    <Box style={{ position: 'relative', height: 24, borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
      {ticks.map((t, i) => (
        <Box key={i} style={{ position: 'absolute', left: t.left, top: 0, transform: 'translateX(-1px)' }}>
          <Box style={{ width: 1, height: 8, background: 'var(--mantine-color-gray-3)' }} />
          <Text size="10px" c="dimmed" fw={500} style={{ whiteSpace: 'nowrap' }}>{t.label}</Text>
        </Box>
      ))}
      {today !== null && (
        <Box style={{ position: 'absolute', left: `${today}%`, top: 0, transform: 'translateX(-50%)' }}>
          <Badge size="xs" color="red" variant="filled" radius="sm" style={{ whiteSpace: 'nowrap' }}>
            Aujourd'hui
          </Badge>
        </Box>
      )}
    </Box>
  );
}

// ─── A positioned bar on a track ───────────────────────────────────────────────

function Track({ axis, children, height = 32 }: { axis: Axis; children: ReactNode; height?: number }) {
  const bands = monthBands(axis);
  const today = todayLeft(axis);
  return (
    <Box style={{ position: 'relative', height, flex: 1, minWidth: 0, borderRadius: 6, overflow: 'hidden' }}>
      {bands.map((b, i) => (
        <Box
          key={i}
          style={{
            position: 'absolute', left: `${b.left}%`, width: `${b.width}%`, top: 0, bottom: 0,
            background: b.shaded ? 'var(--mantine-color-gray-0)' : 'transparent',
            borderRight: '1px solid var(--mantine-color-gray-1)',
          }}
        />
      ))}
      {today !== null && (
        <Box style={{ position: 'absolute', left: `${today}%`, top: 0, bottom: 0, width: 2, background: 'var(--mantine-color-red-4)' }} />
      )}
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

// ─── Partition row (expands to list its groups) ────────────────────────────────

function PartitionRow({ axis, partition }: { axis: Axis | null; partition: TimelinePartition }) {
  const [open, setOpen] = useState(false);
  const p = partition;
  const pos = axis ? position(axis, p.start, p.end) : null;
  const hasGroups = p.groups.length > 0;

  return (
    <Stack gap={4}>
      <Group gap="sm" wrap="nowrap" style={{ height: 36 }}>
        <UnstyledButton
          onClick={() => hasGroups && setOpen((o) => !o)}
          style={{ flexShrink: 0, cursor: hasGroups ? 'pointer' : 'default' }}
        >
          <Group gap={4} w={120} wrap="nowrap">
            {hasGroups ? (
              open ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />
            ) : (
              <Box w={14} />
            )}
            <Badge size="sm" variant="light" color={p.saturated ? 'red' : 'indigo'} radius="sm">
              {p.label ?? '—'}
            </Badge>
            <Text size="10px" c="dimmed" style={{ whiteSpace: 'nowrap' }}>{p.groups.length} gr.</Text>
            {p.saturated && <IconAlertTriangle size={13} color="var(--mantine-color-red-6)" />}
          </Group>
        </UnstyledButton>
        {axis ? (
          <Track axis={axis} height={30}>
            {pos && (
              <Tooltip label={`${fmt(p.start)} → ${fmt(p.end)} · ${p.cohortCount} cohorte(s) · ${p.studentCount} étud.`} withinPortal>
                <UnstyledButton
                  onClick={() => hasGroups && setOpen((o) => !o)}
                  style={{
                    position: 'absolute', left: pos.left, width: pos.width, top: 4, height: 22,
                    background: p.saturated ? 'var(--mantine-color-red-5)' : 'var(--mantine-color-indigo-5)',
                    borderRadius: 6, display: 'flex', alignItems: 'center', padding: '0 8px',
                    cursor: hasGroups ? 'pointer' : 'default',
                  }}
                >
                  <Text size="10px" c="white" fw={600} lineClamp={1}>
                    {p.cohortCount} coh. · {p.studentCount} étud.
                  </Text>
                </UnstyledButton>
              </Tooltip>
            )}
            {/* Hatched bands mark exam/holiday suspensions over the rotation window. */}
            {p.pauses.map((band, i) => {
              const bandPos = position(axis, band.start, band.end ?? p.end);
              if (!bandPos) return null;
              return (
                <Tooltip
                  key={i}
                  withinPortal
                  label={`${PAUSE_LABELS[band.kind] ?? 'Pause'} · ${fmt(band.start)}${band.end ? ` → ${fmt(band.end)}` : ' (en cours)'}`}
                >
                  <Box
                    style={{
                      position: 'absolute', left: bandPos.left, width: bandPos.width, top: 2, height: 26,
                      borderRadius: 4,
                      border: '1px solid var(--mantine-color-orange-5)',
                      background:
                        'repeating-linear-gradient(45deg, var(--mantine-color-orange-2) 0, var(--mantine-color-orange-2) 4px, transparent 4px, transparent 8px)',
                    }}
                  />
                </Tooltip>
              );
            })}
          </Track>
        ) : (
          <Text size="xs" c="dimmed">Aucune fenêtre planifiée</Text>
        )}
      </Group>

      {hasGroups && (
        <Collapse in={open}>
          <Box pl={28} pb={4}>
            <SimpleGrid cols={{ base: 2, sm: 3 }} spacing={6} verticalSpacing={6}>
              {p.groups.map((g) => (
                <Paper key={g.groupId} withBorder radius="sm" px="xs" py={6} bg="var(--mantine-color-gray-0)">
                  <Group justify="space-between" gap={4} wrap="nowrap">
                    <Text size="xs" fw={600} lineClamp={1}>{g.groupLabel}</Text>
                    <Badge size="xs" variant="light" color="gray" radius="sm" style={{ flexShrink: 0 }}>
                      {g.studentCount} ét.
                    </Badge>
                  </Group>
                  <Text size="10px" c="dimmed">Groupe {g.groupNumber}</Text>
                </Paper>
              ))}
            </SimpleGrid>
          </Box>
        </Collapse>
      )}
    </Stack>
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
          <Text size="10px" c="dimmed">Cliquez une partition pour voir ses groupes.</Text>
          <Stack gap={6}>
            {stage.partitions.map((p) => (
              <PartitionRow key={p.label ?? '—'} axis={axis} partition={p} />
            ))}
          </Stack>
        </Stack>
      )}
    </Drawer>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function StageTimelinePage() {
  // The year comes from the single global navbar selector. A second picker here meant the page could
  // sit on a different year from every other admin screen, with nothing on screen saying so.
  const { currentYear, currentYearId } = useAcademicYear();
  const [stage, setStage] = useState<TimelineStage | null>(null);
  const [drawerOpen, drawer] = useDisclosure(false);

  const { data, isFetching, refetch } = useGetYearTimelineQuery(
    { academicYearId: currentYearId! },
    { skip: currentYearId == null, refetchOnMountOrArgChange: true },
  );

  const axis = useMemo(() => makeAxis(data?.start ?? null, data?.end ?? null), [data?.start, data?.end]);

  const openStage = (s: TimelineStage) => { setStage(s); drawer.open(); };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <Stack gap={2}>
          <Text fw={700} size="xl">Calendrier des stages</Text>
          <Text size="sm" c="dimmed">
            Vue chronologique des stages et de leurs partitions sur {currentYear?.label ?? 'l\'année'}.
          </Text>
        </Stack>
        <Group align="flex-end" gap="sm">
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
