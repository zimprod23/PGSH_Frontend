import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Collapse,
  Container,
  Group,
  Loader,
  Pagination,
  Paper,
  ScrollArea,
  SegmentedControl,
  Select,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Tooltip,
  Title,
  UnstyledButton,
  rem,
} from '@mantine/core';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import {
  IconBuildingHospital,
  IconCalendarEvent,
  IconChevronRight,
  IconClipboardList,
  IconClock,
  IconPencil,
  IconPlayerPause,
  IconSearch,
  IconStethoscope,
  IconUsers,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import {
  useGetCurrentEmployeeQuery,
  useGetServicePeriodsByServiceQuery,
  useGetWorklistAcademicYearsQuery,
} from '../api/employeeApi';
import {
  PERIOD_STATE_META,
  WORKLIST_STATES,
  type ChefWorklistCounts,
  type MyServicePeriodResponse,
  type ServicePeriodState,
} from '../types/employee.types';
import { EvaluationModal } from '../../evaluations/components/EvaluationModal';
import type { EvaluationTarget } from '../../evaluations/types/evaluation.types';

// ─── Granularity helpers ──────────────────────────────────────────────────────

const isTransfer = (p: MyServicePeriodResponse) => p.transfer != null;

const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));

/** Rows per page. Matches the server's own default and its hard ceiling. */
const PAGE_SIZE = 200;

/** Below this the search is ignored, so a stray keystroke does not re-query the whole service. */
const MIN_SEARCH = 2;

/**
 * The sentinel for « toutes les années ». An explicit option rather than clearing the field: an
 * empty selector reads as "no filter", and here the absence of a choice means the opposite — the
 * server applies the current year. Spanning every year has to be something the chef says.
 */
const ALL_YEARS = 'all';

interface GroupBucket {
  label: string;
  rows: MyServicePeriodResponse[];
}

interface WindowBucket {
  key: string;
  startDate: string;
  endDate: string;
  stageName: string;
  levelLabel: string | null;
  groups: GroupBucket[];
  counts: Record<ServicePeriodState, number>;
  total: number;
  transferIn: number;
  transferOut: number;
}

/** Distinct, non-empty stage names across a set of rows (a window is usually one stage). */
const distinctStages = (rows: MyServicePeriodResponse[]) =>
  Array.from(new Set(rows.map((r) => r.stageName).filter(Boolean)));

function pushTo<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const arr = map.get(key);
  if (arr) arr.push(value);
  else map.set(key, [value]);
}

/**
 * Period (time window) → academic group → students.
 *
 * ⚠ Grouping is per page now. It used to be over every row of the service, which is exactly why the
 * server returned every row — and why the card mounted thousands of them at once. A slice normally
 * fits one page, so the grouping is usually over the whole slice anyway; when it is not, the pager
 * says so rather than the rows silently vanishing.
 */
function buildWindows(periods: MyServicePeriodResponse[]): WindowBucket[] {
  const byWindow = new Map<string, MyServicePeriodResponse[]>();
  for (const p of periods) pushTo(byWindow, `${p.startDate}__${p.endDate}`, p);

  const windows: WindowBucket[] = [];
  for (const [key, rows] of byWindow) {
    const [startDate, endDate] = key.split('__');

    const byGroup = new Map<string, MyServicePeriodResponse[]>();
    for (const r of rows) pushTo(byGroup, r.academicGroupLabel, r);

    // Live roster entries sort first; transfer overlays (in/out) sink to the bottom of the group.
    const groups = Array.from(byGroup, ([label, gr]) => ({
      label,
      rows: gr.slice().sort((a, b) =>
        Number(isTransfer(a)) - Number(isTransfer(b)) || a.studentFullName.localeCompare(b.studentFullName)),
    })).sort((a, b) => a.label.localeCompare(b.label));

    const counts: Record<ServicePeriodState, number> =
      { Planned: 0, Underway: 0, AwaitingEvaluation: 0, Settled: 0 };
    let transferIn = 0;
    let transferOut = 0;
    for (const r of rows) {
      if (r.transfer?.direction === 'Incoming') transferIn++;
      else if (r.transfer?.direction === 'Outgoing') transferOut++;
      else counts[r.state]++;
    }

    const total = rows.length - transferIn - transferOut;
    const stageName = distinctStages(rows).join(' · ');
    const levelLabel = rows.find((r) => r.levelLabel)?.levelLabel ?? null;
    windows.push({ key, startDate, endDate, stageName, levelLabel, groups, counts, total, transferIn, transferOut });
  }

  return windows.sort((a, b) => a.startDate.localeCompare(b.startDate));
}

/**
 * Which slice to open on. A bounded list has one failure mode the unbounded one did not — landing on
 * an empty slice reads exactly like "this chef has no work" — so the first slice with something in
 * it wins, in the order a chef cares about it.
 */
function firstNonEmptyState(counts: ChefWorklistCounts): ServicePeriodState {
  return WORKLIST_STATES.find((s) => counts[PERIOD_STATE_META[s].countKey] > 0) ?? 'Underway';
}

const emptyMessage: Record<ServicePeriodState, string> = {
  Underway:           'Aucune rotation en cours dans ce service.',
  AwaitingEvaluation: 'Aucune évaluation en attente.',
  Planned:            'Aucune rotation planifiée dans ce service.',
  Settled:            'Aucune rotation terminée pour ce filtre.',
};

// ─── Service card ─────────────────────────────────────────────────────────────

function ServiceCard({ serviceId, serviceName, hospitalName }: {
  serviceId: number;
  serviceName: string;
  hospitalName: string;
}) {
  const [evalTarget, setEvalTarget] = useState<EvaluationTarget | null>(null);
  const [modalOpen, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 350);
  const [serviceOpen, setServiceOpen] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Null until the chef picks; autoState is the one-time opening choice made from the first
  // response's counts.
  const [chosenState, setChosenState] = useState<ServicePeriodState | null>(null);
  const [autoState, setAutoState] = useState<ServicePeriodState | null>(null);
  const state: ServicePeriodState = chosenState ?? autoState ?? 'Underway';

  const [page, setPage] = useState(1);

  // Null until the chef picks a year, which is not the same as "all years": it means "whatever the
  // server resolves", i.e. the year flagged current. The response names the year it used, so the
  // selector displays the real answer instead of guessing at one.
  const [yearChoice, setYearChoice] = useState<string | null>(null);

  const { data: years } = useGetWorklistAcademicYearsQuery();

  const searchTerm = debouncedSearch.trim().length >= MIN_SEARCH ? debouncedSearch.trim() : undefined;

  // Admin pause/resume/start mutations live in the admin API slice and don't invalidate this
  // employee-slice query, so refetch on mount/arg change to keep the chef worklist status live.
  const { data, isLoading, isFetching } = useGetServicePeriodsByServiceQuery(
    {
      serviceId,
      state,
      searchTerm,
      pageNumber: page,
      pageSize: PAGE_SIZE,
      // Sending neither is how the current year gets applied — the rule that an omitted year means
      // the current one, never all of them. ⚠ Narrowing a chef's live work by year is the change
      // that blanked worklists twice, and it is only safe because the response reports what the
      // filter held back (outsideYearCount); that notice is not decoration, it is the guard.
      academicYearId:
        yearChoice && yearChoice !== ALL_YEARS ? Number(yearChoice) : undefined,
      allYears: yearChoice === ALL_YEARS,
    },
    { refetchOnMountOrArgChange: true },
  );

  const counts = data?.counts;

  // Adjusting state during render rather than in an effect — React's own sanctioned form, and the
  // only one that is safe here. In an effect the sequence oscillates: switching slice changes the
  // query key, the new key has no data yet, so `counts` goes undefined and the slice falls back to
  // Underway, which restores the cached response and flips it again. Guarded on `autoState`, this
  // runs exactly once and never fights the chef's own choice.
  if (chosenState === null && autoState === null && counts) {
    setAutoState(firstNonEmptyState(counts));
  }

  // What the selector shows: the chef's own choice, else the year the server resolved.
  const yearValue = yearChoice ?? (data ? (data.academicYearId?.toString() ?? ALL_YEARS) : null);
  const yearLabel = years?.find((y) => String(y.id) === yearValue)?.label;
  const outsideYear = data?.outsideYearCount ?? 0;

  const selectYear = (next: string | null) => {
    setYearChoice(next ?? ALL_YEARS);
    setPage(1);
    setExpandedGroups(new Set());
  };

  const periods = useMemo(() => data?.page.items ?? [], [data]);
  const totalCount = data?.page.totalCount ?? 0;
  const totalPages = data?.page.totalPages ?? 1;

  const selectState = (next: ServicePeriodState) => {
    setChosenState(next);
    setPage(1);
    setExpandedGroups(new Set());
  };

  const openFor = (period: MyServicePeriodResponse) => {
    setEvalTarget({
      periodId:        period.id,
      studentFullName: period.studentFullName,
      studentCne:      period.studentCne,
      stageName:       period.stageName,
      startDate:       period.startDate,
      endDate:         period.endDate,
      hasEvaluation:   period.hasEvaluation,
      serviceId:       period.serviceId,
      assignmentId:    period.internshipAssignmentId,
    });
    openModal();
  };

  // The stage(s) this chef evaluates in this service — usually one, but a service can host
  // different rotations across windows, so show every distinct stage present.
  const stages = useMemo(() => distinctStages(periods), [periods]);

  const transferCounts = useMemo(() => {
    let incoming = 0;
    let outgoing = 0;
    for (const p of periods) {
      if (p.transfer?.direction === 'Incoming') incoming++;
      else if (p.transfer?.direction === 'Outgoing') outgoing++;
    }
    return { incoming, outgoing };
  }, [periods]);

  const windows = useMemo(() => buildWindows(periods), [periods]);

  // While searching, every rendered group already contains only matches — force them open.
  const searching = searchTerm !== undefined;
  const allGroupKeys = useMemo(
    () => windows.flatMap((w) => w.groups.map((g) => `${w.key}::${g.label}`)),
    [windows],
  );
  const allExpanded = allGroupKeys.length > 0 && allGroupKeys.every((k) => expandedGroups.has(k));
  const groupOpen = (key: string) => searching || expandedGroups.has(key);
  const toggleGroup = (key: string) =>
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const toggleAllGroups = () =>
    setExpandedGroups(allExpanded ? new Set() : new Set(allGroupKeys));

  const actionFor = (p: MyServicePeriodResponse) => {
    // Published, not opened. The chef is shown who is coming and when; the rotation is not his yet.
    if (p.state === 'Planned') {
      return (
        <Tooltip label="Rotation planifiée — elle deviendra active une fois ouverte par l'administration"
          withArrow multiline w={240}>
          <Text size="xs" c="dimmed" fs="italic">Pas encore démarrée</Text>
        </Tooltip>
      );
    }
    if (p.state === 'Underway') {
      // Suspended mid-rotation (e.g. an exam week) — frozen until the administration resumes it.
      if (p.isPaused) {
        return (
          <Tooltip
            label={p.pauseReason ? `En pause : ${p.pauseReason}` : 'Rotation suspendue par l\'administration'}
            withArrow multiline w={220}
          >
            <Badge variant="light" color="orange" size="sm" radius="sm"
              leftSection={<IconPlayerPause size={11} stroke={1.5} />}>
              En pause
            </Badge>
          </Tooltip>
        );
      }
      // Closing a period is an administrative act (done when the scheduled window ends).
      // The chef can only evaluate once it's closed — so no action here, just a hint.
      return (
        <Tooltip label="La période sera évaluable une fois clôturée par l'administration" withArrow multiline w={220}>
          <Text size="xs" c="dimmed" fs="italic">En attente de clôture</Text>
        </Tooltip>
      );
    }
    // A rotation cut short by a transfer is terminal: it is kept as history, never evaluated.
    if (p.isInterrupted) {
      return (
        <Tooltip label="Rotation interrompue par un transfert — conservée en historique" withArrow multiline w={240}>
          <Text size="xs" c="dimmed" fs="italic">Interrompue</Text>
        </Tooltip>
      );
    }
    if (p.state === 'AwaitingEvaluation') {
      return (
        <Button
          size="xs"
          variant="light"
          color="navy"
          leftSection={<IconClipboardList size={14} stroke={1.5} />}
          onClick={() => openFor(p)}
        >
          Évaluer
        </Button>
      );
    }
    return (
      <Button
        size="xs"
        variant="subtle"
        color="gray"
        leftSection={<IconPencil size={14} stroke={1.5} />}
        onClick={() => openFor(p)}
      >
        Modifier
      </Button>
    );
  };

  return (
    <>
      <Card padding="lg" radius="lg" withBorder shadow="sm">
        <Stack gap="md">
          <Group
            justify="space-between"
            align="center"
            wrap="nowrap"
            onClick={() => setServiceOpen((o) => !o)}
            style={{ cursor: 'pointer' }}
          >
            <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
              <ActionIcon
                variant="subtle"
                color="gray"
                radius="md"
                aria-label={serviceOpen ? 'Réduire le service' : 'Développer le service'}
                onClick={(e) => { e.stopPropagation(); setServiceOpen((o) => !o); }}
              >
                <IconChevronRight
                  size={18}
                  style={{ transform: serviceOpen ? 'rotate(90deg)' : 'none', transition: 'transform 150ms' }}
                />
              </ActionIcon>
              <ThemeIcon size={40} radius="md" variant="light" color="navy">
                <IconBuildingHospital size={20} stroke={1.5} />
              </ThemeIcon>
              <Stack gap={2} style={{ minWidth: 0 }}>
                <Text fw={700} size="md" truncate>{serviceName}</Text>
                <Text size="xs" c="dimmed" truncate>{hospitalName}</Text>
                {stages.length > 0 && (
                  <Group gap={4} wrap="nowrap" style={{ minWidth: 0 }}>
                    <IconStethoscope size={12} stroke={1.5} color="#0F4C81" style={{ flexShrink: 0 }} />
                    <Text size="xs" fw={600} c="navy.6" truncate>{stages.join(' · ')}</Text>
                  </Group>
                )}
              </Stack>
            </Group>
            <Group gap={6} justify="flex-end" style={{ flexWrap: 'wrap', maxWidth: '55%' }}>
              {counts && WORKLIST_STATES.filter((s) => counts[PERIOD_STATE_META[s].countKey] > 0).map((s) => (
                <Badge key={s} size="sm" variant="light" color={PERIOD_STATE_META[s].color} radius="sm">
                  {counts[PERIOD_STATE_META[s].countKey]} {PERIOD_STATE_META[s].label.toLowerCase()}
                </Badge>
              ))}
              {transferCounts.incoming > 0 && (
                <Badge size="sm" variant="light" color="teal" radius="sm">
                  {transferCounts.incoming} entrant{transferCounts.incoming > 1 ? 's' : ''}
                </Badge>
              )}
              {transferCounts.outgoing > 0 && (
                <Badge size="sm" variant="light" color="gray" radius="sm">
                  {transferCounts.outgoing} sortant{transferCounts.outgoing > 1 ? 's' : ''}
                </Badge>
              )}
            </Group>
          </Group>

          <Collapse in={serviceOpen}>
            <Stack gap="md">
              <Group gap="sm" wrap="wrap">
                <TextInput
                  placeholder="Rechercher un étudiant (nom, CNE, Apogée)…"
                  leftSection={<IconSearch size={16} stroke={1.5} />}
                  rightSection={isFetching ? <Loader size="xs" /> : null}
                  value={search}
                  onChange={(e) => { setSearch(e.currentTarget.value); setPage(1); }}
                  radius="md"
                  style={{ flex: 1, minWidth: rem(220) }}
                />
                <ScrollArea type="never">
                  <SegmentedControl
                    value={state}
                    onChange={(v) => selectState(v as ServicePeriodState)}
                    radius="md"
                    size="xs"
                    color="navy"
                    data={WORKLIST_STATES.map((s) => ({
                      value: s,
                      label: `${PERIOD_STATE_META[s].label}${
                        counts ? ` (${counts[PERIOD_STATE_META[s].countKey]})` : ''
                      }`,
                    }))}
                  />
                </ScrollArea>
                {/* On every slice, not just the archive: a chef planning next year's rotations and a
                    chef looking up last year's marks are asking the same question of different
                    years. Safe on the live slices only because outsideYearCount is shown below. */}
                <Select
                  size="xs"
                  radius="md"
                  w={rem(180)}
                  leftSection={<IconCalendarEvent size={14} stroke={1.5} />}
                  value={yearValue}
                  onChange={selectYear}
                  allowDeselect={false}
                  data={[
                    ...(years ?? []).map((y) => ({ value: String(y.id), label: y.label })),
                    { value: ALL_YEARS, label: 'Toutes les années' },
                  ]}
                />
                {allGroupKeys.length > 0 && (
                  <Button
                    variant="subtle"
                    color="navy"
                    size="xs"
                    radius="md"
                    disabled={searching}
                    onClick={toggleAllGroups}
                  >
                    {allExpanded ? 'Tout replier' : 'Tout déplier'}
                  </Button>
                )}
              </Group>

              {/* ⚠ The guard, not a decoration. Year scoping blanked chef worklists twice and each
                  time it was silent: rows the filter removed left nothing behind to say they
                  existed, so an empty screen and an empty service looked identical. The filter is
                  allowed on live work now precisely because it always says what it is holding
                  back, and the way out is one click away. */}
              {outsideYear > 0 && (
                <Group
                  gap="xs"
                  wrap="nowrap"
                  p="xs"
                  style={{
                    border: '1px solid var(--mantine-color-yellow-3)',
                    borderRadius: 'var(--mantine-radius-md)',
                    background: 'var(--mantine-color-yellow-0)',
                  }}
                >
                  <IconCalendarEvent size={16} stroke={1.5} color="#B45309" />
                  <Text size="xs" c="yellow.9" style={{ flex: 1 }}>
                    {outsideYear} rotation{outsideYear > 1 ? 's' : ''} de cette catégorie
                    {yearLabel ? ` en dehors de ${yearLabel}` : ' en dehors de cette année'}.
                  </Text>
                  <Button
                    size="compact-xs"
                    variant="light"
                    color="yellow"
                    onClick={() => selectYear(ALL_YEARS)}
                  >
                    Toutes les années
                  </Button>
                </Group>
              )}

              {isLoading ? (
                <Stack gap="xs">{[1, 2].map((i) => <Skeleton key={i} height={72} radius="md" />)}</Stack>
              ) : windows.length === 0 ? (
                <Center py="lg">
                  <Stack align="center" gap={4}>
                    <IconUsers size={28} stroke={1.5} color="#94A3B8" />
                    <Text size="sm" c="dimmed">
                      {searching ? 'Aucun étudiant ne correspond à votre recherche.' : emptyMessage[state]}
                    </Text>
                    {/* An empty slice is not an empty service. Say where the work actually is, or
                        this screen reads exactly like the bug it was built to fix. */}
                    {!searching && counts && counts[PERIOD_STATE_META[state].countKey] === 0 &&
                      WORKLIST_STATES.some((s) => counts[PERIOD_STATE_META[s].countKey] > 0) && (
                      <Group gap={6} mt={4}>
                        {WORKLIST_STATES.filter((s) => s !== state && counts[PERIOD_STATE_META[s].countKey] > 0)
                          .map((s) => (
                            <Button key={s} size="compact-xs" variant="light"
                              color={PERIOD_STATE_META[s].color} onClick={() => selectState(s)}>
                              {counts[PERIOD_STATE_META[s].countKey]} {PERIOD_STATE_META[s].label.toLowerCase()}
                            </Button>
                          ))}
                      </Group>
                    )}
                  </Stack>
                </Center>
              ) : (
                <Stack gap="md">
                  {windows.map((w) => (
                    <Paper key={w.key} withBorder radius="md" p="md" bg="gray.0">
                      <Stack gap="sm">
                        <Group justify="space-between" align="flex-start" wrap="nowrap">
                          <Group gap="xs" wrap="nowrap">
                            <ThemeIcon variant="light" color="navy" size={34} radius="md">
                              <IconCalendarEvent size={18} stroke={1.5} />
                            </ThemeIcon>
                            <Stack gap={2}>
                              <Text fw={600} size="sm">{fmtDate(w.startDate)} → {fmtDate(w.endDate)}</Text>
                              {w.stageName && (
                                <Group gap={6} wrap="nowrap">
                                  <Badge size="sm" variant="light" color="navy" radius="sm"
                                    leftSection={<IconStethoscope size={12} stroke={1.5} />}>
                                    {w.stageName}
                                  </Badge>
                                  {w.levelLabel && <Text size="xs" c="dimmed">{w.levelLabel}</Text>}
                                </Group>
                              )}
                              <Text size="xs" c="dimmed">
                                {w.total} étudiant{w.total > 1 ? 's' : ''} · {w.groups.length} groupe{w.groups.length > 1 ? 's' : ''}
                              </Text>
                            </Stack>
                          </Group>
                          <Group gap={6} justify="flex-end" style={{ flexWrap: 'wrap' }}>
                            {WORKLIST_STATES
                              .filter((s) => w.counts[s] > 0)
                              .map((s) => (
                                <Badge key={s} size="sm" variant="light" color={PERIOD_STATE_META[s].color} radius="sm">
                                  {w.counts[s]} {PERIOD_STATE_META[s].label.toLowerCase()}
                                </Badge>
                              ))}
                            {w.transferIn > 0 && (
                              <Badge size="sm" variant="light" color="teal" radius="sm">
                                {w.transferIn} entrant{w.transferIn > 1 ? 's' : ''}
                              </Badge>
                            )}
                            {w.transferOut > 0 && (
                              <Badge size="sm" variant="light" color="gray" radius="sm">
                                {w.transferOut} sortant{w.transferOut > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </Group>
                        </Group>

                        {w.groups.map((g) => {
                          const gkey = `${w.key}::${g.label}`;
                          const open = groupOpen(gkey);
                          return (
                            <Paper key={g.label} withBorder radius="md" bg="white">
                              <UnstyledButton
                                w="100%"
                                p="sm"
                                onClick={() => toggleGroup(gkey)}
                                disabled={searching}
                                style={{ borderRadius: 'var(--mantine-radius-md)' }}
                              >
                                <Group justify="space-between" wrap="nowrap">
                                  <Group gap={8} wrap="nowrap">
                                    <IconChevronRight
                                      size={15}
                                      color="var(--mantine-color-gray-5)"
                                      style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 150ms', flexShrink: 0 }}
                                    />
                                    <Badge size="sm" variant="filled" color="grape" radius="sm">Groupe {g.label}</Badge>
                                    <Text size="xs" c="dimmed">{g.rows.length} étudiant{g.rows.length > 1 ? 's' : ''}</Text>
                                  </Group>
                                  <Group gap={4} wrap="nowrap">
                                    {WORKLIST_STATES.map((s) => {
                                      const n = g.rows.filter((r) => !isTransfer(r) && r.state === s).length;
                                      return n > 0 ? (
                                        <Badge key={s} size="xs" variant="dot" color={PERIOD_STATE_META[s].color} radius="sm">
                                          {n}
                                        </Badge>
                                      ) : null;
                                    })}
                                    {(() => {
                                      const inc = g.rows.filter((r) => r.transfer?.direction === 'Incoming').length;
                                      return inc > 0 ? (
                                        <Badge size="xs" variant="dot" color="teal" radius="sm">{inc}</Badge>
                                      ) : null;
                                    })()}
                                    {(() => {
                                      const out = g.rows.filter((r) => r.transfer?.direction === 'Outgoing').length;
                                      return out > 0 ? (
                                        <Badge size="xs" variant="dot" color="gray" radius="sm">{out}</Badge>
                                      ) : null;
                                    })()}
                                  </Group>
                                </Group>
                              </UnstyledButton>
                              <Collapse in={open}>
                                <Box px="sm" pb="sm">
                                  <Table verticalSpacing="xs" fz="sm" highlightOnHover>
                                    <Table.Tbody>
                                      {g.rows.map((p) => {
                                        const t = p.transfer;
                                        if (t) {
                                          const incoming = t.direction === 'Incoming';
                                          const detail = `${incoming ? '←' : '→'} Groupe ${t.groupLabel}${t.serviceName ? ` · ${t.serviceName}` : ''}`;
                                          return (
                                            <Table.Tr key={`${p.id}-${p.internshipAssignmentId}-${p.startDate}`}>
                                              <Table.Td>
                                                <Stack gap={2}>
                                                  <Text
                                                    size="sm"
                                                    fw={500}
                                                    c={incoming ? undefined : 'dimmed'}
                                                    td={incoming ? undefined : 'line-through'}
                                                  >
                                                    {p.studentFullName}
                                                  </Text>
                                                  <Text size="xs" c="dimmed" ff="monospace">
                                                    CNE {p.studentCne} · {p.studentAppogee}
                                                  </Text>
                                                  <Text size="xs" fw={500} c={incoming ? 'teal.7' : 'gray.6'}>
                                                    {detail}
                                                  </Text>
                                                </Stack>
                                              </Table.Td>
                                              <Table.Td>
                                                <Tooltip
                                                  label={t.reason ? `Motif : ${t.reason}` : 'Aucun motif renseigné'}
                                                  multiline
                                                  w={240}
                                                  withArrow
                                                  disabled={!t.reason}
                                                >
                                                  <Badge size="sm" variant="light" color={incoming ? 'teal' : 'gray'} radius="sm">
                                                    {incoming ? 'Entrant' : 'Sortant'}
                                                  </Badge>
                                                </Tooltip>
                                              </Table.Td>
                                              <Table.Td align="right" w={rem(140)}>
                                                {t.date && <Text size="xs" c="dimmed">{fmtDate(t.date)}</Text>}
                                              </Table.Td>
                                            </Table.Tr>
                                          );
                                        }
                                        return (
                                          <Table.Tr key={p.id}>
                                            <Table.Td>
                                              <Stack gap={0}>
                                                <Text size="sm" fw={500}>{p.studentFullName}</Text>
                                                <Text size="xs" c="dimmed" ff="monospace">
                                                  CNE {p.studentCne} · {p.studentAppogee}
                                                </Text>
                                              </Stack>
                                            </Table.Td>
                                            <Table.Td>
                                              <Badge
                                                size="sm"
                                                variant="light"
                                                color={PERIOD_STATE_META[p.state].color}
                                                radius="sm"
                                                leftSection={p.state === 'Planned'
                                                  ? <IconClock size={11} stroke={1.5} />
                                                  : undefined}
                                              >
                                                {PERIOD_STATE_META[p.state].label}
                                              </Badge>
                                            </Table.Td>
                                            <Table.Td align="right" w={rem(140)}>
                                              {actionFor(p)}
                                            </Table.Td>
                                          </Table.Tr>
                                        );
                                      })}
                                    </Table.Tbody>
                                  </Table>
                                </Box>
                              </Collapse>
                            </Paper>
                          );
                        })}
                      </Stack>
                    </Paper>
                  ))}

                  {/* A slice bigger than one page is paged rather than truncated: the count says how
                      many rows are still reachable, so nothing is silently hidden. */}
                  {totalPages > 1 && (
                    <Group justify="space-between" wrap="wrap">
                      <Text size="xs" c="dimmed">
                        {totalCount} rotation{totalCount > 1 ? 's' : ''} · page {page} sur {totalPages}
                      </Text>
                      <Pagination
                        size="sm"
                        radius="md"
                        color="navy"
                        value={page}
                        total={totalPages}
                        onChange={(p) => { setPage(p); setExpandedGroups(new Set()); }}
                      />
                    </Group>
                  )}
                </Stack>
              )}
            </Stack>
          </Collapse>
        </Stack>
      </Card>

      <EvaluationModal target={evalTarget} opened={modalOpen} onClose={closeModal} />
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EmployeeServicesPage() {
  const { data: me, isLoading } = useGetCurrentEmployeeQuery();

  const services = me?.services.filter((s) => s.isChef) ?? [];

  return (
    <Container fluid>
      <Stack gap="xl">
        <Stack gap={4}>
          <Title order={2} fw={700}>Mes Services</Title>
          <Text size="sm" c="dimmed">
            Services dont vous êtes chef — rotations planifiées, en cours et évaluations en attente.
          </Text>
        </Stack>

        {isLoading ? (
          <Stack gap="md">
            {[1, 2].map((i) => <Skeleton key={i} height={200} radius="lg" />)}
          </Stack>
        ) : services.length === 0 ? (
          <Card padding="xl" radius="lg" withBorder shadow="sm">
            <Stack align="center" gap="sm">
              <ThemeIcon size={56} radius="xl" variant="light" color="gray">
                <IconBuildingHospital size={28} stroke={1.5} />
              </ThemeIcon>
              <Text fw={600} c="dimmed">Aucun service assigné</Text>
              <Text size="sm" c="dimmed" ta="center" maw={320}>
                Vous n'êtes actuellement chef d'aucun service. Contactez l'administrateur.
              </Text>
            </Stack>
          </Card>
        ) : (
          <Stack gap="lg">
            {services.map((s) => (
              <ServiceCard
                key={s.serviceId}
                serviceId={s.serviceId}
                serviceName={s.serviceName}
                hospitalName={s.hospitalName}
              />
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
