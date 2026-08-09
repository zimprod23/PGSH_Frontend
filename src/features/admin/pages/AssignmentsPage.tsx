import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  Container,
  Divider,
  Drawer,
  Group,
  Modal,
  Pagination,
  rem,
  ScrollArea,
  SegmentedControl,
  Select,
  Skeleton,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import { useDisclosure, useMediaQuery, useDebouncedValue } from '@mantine/hooks';
import {
  IconArrowRight,
  IconBuildingHospital,
  IconCircleCheck,
  IconCircleX,
  IconClipboardCheck,
  IconEye,
  IconFileSpreadsheet,
  IconLayoutSidebar,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerStop,
  IconSearch,
  IconUsersGroup,
} from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import {
  useGetStagesQuery,
  useGetCohortOptionsByStageQuery,
  useGetCohortByIdQuery,
  useGetStageScheduleQuery,
  useGetInternshipAssignmentsQuery,
  useGetAssignmentStatusSummaryQuery,
  useStartAssignmentMutation,
  useValidateAssignmentMutation,
  useRejectAssignmentMutation,
  useStartStagePeriodsMutation,
  useCompleteStagePeriodsMutation,
  usePauseStagePeriodsMutation,
  useResumeStagePeriodsMutation,
  useValidateCohortAssignmentsMutation,
} from '../api/adminApi';
import type {
  CohortDetailResponse,
  CohortResponse,
  InternshipAssignmentSummaryResponse,
  InternshipStatus,
  PauseKind,
} from '../types/admin.types';
import { useNotify } from '../../../common/hooks/useNotify';
import { useListParams } from '../../../common/hooks/useListParams';
import { useAcademicYear } from '../contexts/AcademicYearContext';
import { ConfirmModal } from '../../../common/components/ConfirmModal';
import { StudentRecordModal } from '../components/StudentRecordModal';
import { EvaluationImportModal } from '../../evaluations/components/EvaluationImportModal';

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<InternshipStatus, { label: string; color: string }> = {
  Planned:   { label: 'Planifiée',  color: 'gray'   },
  Ongoing:   { label: 'En cours',   color: 'blue'   },
  Paused:    { label: 'En pause',   color: 'orange' },
  Completed: { label: 'Terminée',   color: 'teal'   },
  Evaluated: { label: 'Évaluée',    color: 'violet' },
  Validated: { label: 'Validée',    color: 'green'  },
  Rejected:  { label: 'Rejetée',    color: 'red'    },
};

const PAUSE_KIND_OPTIONS: { value: PauseKind; label: string }[] = [
  { value: 'Exam',    label: 'Examens'   },
  { value: 'Holiday', label: 'Vacances'  },
  { value: 'Other',   label: 'Autre'     },
];

function StatusBadge({ status }: { status: InternshipStatus }) {
  const cfg = STATUS_CFG[status] ?? { label: status, color: 'gray' };
  return <Badge variant="light" color={cfg.color} size="sm" radius="xl">{cfg.label}</Badge>;
}

// "2026-05-01" → "01/05"
const fmtDM = (iso: string) => { const [, m, d] = iso.split('-'); return `${d}/${m}`; };

// ─── Cohort sidebar card ──────────────────────────────────────────────────────

function CohortSidebarCard({
  cohort, selected, focused, onSelect, onFocus,
}: {
  cohort: CohortResponse;
  selected: boolean;
  focused: boolean;
  onSelect: () => void;
  onFocus: () => void;
}) {
  return (
    <Card
      padding="sm" radius="md" withBorder
      onClick={onFocus}
      style={{
        cursor: 'pointer',
        borderColor: focused ? '#0F4C81' : selected ? '#0EA5E940' : '#E2E8F0',
        background: focused ? '#EBF4FF' : selected ? '#F8FCFF' : '#FFFFFF',
        transition: 'all 120ms ease',
      }}
    >
      <Group gap="sm" wrap="nowrap" align="flex-start">
        <Checkbox
          checked={selected}
          onChange={onSelect}
          radius="sm"
          onClick={(e) => e.stopPropagation()}
          style={{ paddingTop: 2, flexShrink: 0 }}
        />
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Text size="xs" fw={600} truncate c={focused ? 'navy.7' : 'dark'}>
            {cohort.label}
          </Text>
          <Text size="xs" c="dimmed" truncate>{cohort.academicGroupLabel}</Text>
          <Group gap={6} wrap="nowrap">
            <Text size="xs" c="dimmed">{cohort.studentAssignmentCount} étud.</Text>
            {cohort.slotAssignmentCount > 0 && (
              <>
                <Text size="xs" c="dimmed">·</Text>
                <Text size="xs" c={cohort.isSchedulePublished ? 'teal.6' : 'violet.5'}>
                  {cohort.isSchedulePublished ? 'Publié' : `${cohort.slotAssignmentCount} créneaux`}
                </Text>
              </>
            )}
          </Group>
        </Stack>
      </Group>
    </Card>
  );
}

// ─── Sidebar content (shared between panel and drawer) ───────────────────────

function SidebarContent({
  cohorts,
  cohortsLoading,
  selectedIds,
  focusedId,
  planGroups,
  rotationGroups,
  isGrouped,
  groupingMode,
  onGroupingModeChange,
  onToggleSelect,
  onFocus,
  onSelectGroup,
  onSelectAll,
  onClearAll,
}: {
  cohorts: CohortResponse[];
  cohortsLoading: boolean;
  selectedIds: number[];
  focusedId: number | null;
  planGroups: Record<string, CohortResponse[]>;
  rotationGroups: Record<string, CohortResponse[]>;
  isGrouped: boolean;
  groupingMode: 'status' | 'rotation';
  onGroupingModeChange: (mode: 'status' | 'rotation') => void;
  onToggleSelect: (id: number) => void;
  onFocus: (id: number) => void;
  onSelectGroup: (group: CohortResponse[]) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}) {
  const allChecked = selectedIds.length === cohorts.length && cohorts.length > 0;
  const someChecked = selectedIds.length > 0;
  const hasRotations = Object.keys(rotationGroups).length > 1;

  const activeGroups = groupingMode === 'rotation' ? rotationGroups : planGroups;
  const showGrouped = groupingMode === 'rotation' ? hasRotations : isGrouped;

  return (
    <Stack gap={0}>
      <Box px="md" py="sm" style={{ borderBottom: '1px solid #E2E8F0' }}>
        <Group justify="space-between" align="center">
          <Text size="xs" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: '0.6px' }}>
            Cohortes ({cohorts.length})
          </Text>
          <Group gap={4}>
            <Button size="xs" variant="subtle" color="navy" px="xs"
              disabled={allChecked || cohortsLoading}
              onClick={onSelectAll}>
              Tout
            </Button>
            <Button size="xs" variant="subtle" color="gray" px="xs"
              disabled={!someChecked}
              onClick={onClearAll}>
              Aucun
            </Button>
          </Group>
        </Group>
        {someChecked && (
          <Text size="xs" c="navy.6" fw={500} mt={4}>
            {selectedIds.length} sélectionnée(s)
          </Text>
        )}
        {hasRotations && (
          <SegmentedControl
            mt="xs"
            size="xs"
            fullWidth
            value={groupingMode}
            onChange={(v) => onGroupingModeChange(v as 'status' | 'rotation')}
            data={[
              { label: 'Par statut', value: 'status' },
              { label: 'Par rotation', value: 'rotation' },
            ]}
          />
        )}
      </Box>

      <Box p="sm">
        {cohortsLoading ? (
          <Stack gap="xs">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} height={70} radius="md" />)}
          </Stack>
        ) : cohorts.length === 0 ? (
          <Text size="xs" c="dimmed" ta="center" py="md">
            Aucune cohorte pour ce stage.
          </Text>
        ) : showGrouped ? (
          Object.entries(activeGroups).map(([groupKey, group]) => (
            <Box key={groupKey} mb="md">
              <Group justify="space-between" align="center" mb={4}>
                <Text size="xs" fw={600} c="dimmed">{groupKey}</Text>
                <Button size="xs" variant="subtle" color="navy" px={4} py={2} h="auto"
                  onClick={() => onSelectGroup(group)}>
                  {group.every((c) => selectedIds.includes(c.id)) ? 'Désél.' : 'Sél.'}
                </Button>
              </Group>
              <Stack gap="xs">
                {group.map((c) => (
                  <CohortSidebarCard key={c.id} cohort={c}
                    selected={selectedIds.includes(c.id)}
                    focused={focusedId === c.id}
                    onSelect={() => onToggleSelect(c.id)}
                    onFocus={() => onFocus(c.id)}
                  />
                ))}
              </Stack>
              <Divider mt="xs" />
            </Box>
          ))
        ) : (
          <Stack gap="xs">
            {cohorts.map((c) => (
              <CohortSidebarCard key={c.id} cohort={c}
                selected={selectedIds.includes(c.id)}
                focused={focusedId === c.id}
                onSelect={() => onToggleSelect(c.id)}
                onFocus={() => onFocus(c.id)}
              />
            ))}
          </Stack>
        )}
      </Box>
    </Stack>
  );
}

// ─── Cohort rotation mini-card ────────────────────────────────────────────────

function CohortPlanMiniCard({ cohortId }: { cohortId: number }) {
  const { data: detail } = useGetCohortByIdQuery(cohortId);
  if (!detail?.slotAssignments.length) return null;
  return (
    <Card padding="sm" radius="lg" withBorder shadow="xs">
      <Stack gap="xs">
        <Text size="xs" fw={600} c="dimmed" truncate>{detail.label}</Text>
        <ScrollArea type="never">
          <Group gap="xs" align="center" wrap="nowrap">
            {detail.slotAssignments.map((t: CohortDetailResponse['slotAssignments'][number], i: number) => (
              <Group key={t.assignmentId} gap="xs" wrap="nowrap" align="center">
                {i > 0 && <IconArrowRight size={12} stroke={1.5} color="#94A3B8" style={{ flexShrink: 0 }} />}
                <Card padding="xs" radius="md" withBorder style={{ background: '#F8FAFC', flexShrink: 0 }}>
                  <Stack gap={2}>
                    <Group gap={4} wrap="nowrap">
                      <IconBuildingHospital size={10} stroke={1.5} color="#94A3B8" />
                      <Text size="xs" fw={600} style={{ whiteSpace: 'nowrap', maxWidth: 120 }} truncate>
                        {t.serviceName}
                      </Text>
                    </Group>
                    <Text size="xs" c="dimmed" ff="monospace" style={{ whiteSpace: 'nowrap' }}>
                      {t.startDate} → {t.endDate}
                    </Text>
                  </Stack>
                </Card>
              </Group>
            ))}
          </Group>
        </ScrollArea>
      </Stack>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

type AssignmentFilters = { stage: string | null; status: string | null };
/** Module-level so its identity is stable — useListParams memoises on it. */
const ASSIGNMENT_FILTERS: AssignmentFilters = { stage: null, status: null };

export default function AssignmentsPage() {
  const notify = useNotify();
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Stage, status filter, search and page live in the URL: picking a stage, opening a record and
  // coming back must not drop you on an unfiltered list of every stage again.
  const { search, setSearch, filters, setFilter, page, setPage } =
    useListParams<AssignmentFilters>(ASSIGNMENT_FILTERS);
  const stageId = filters.stage;
  const statusFilter = filters.status as InternshipStatus | null;
  const setStageId = (v: string | null) => setFilter('stage', v);

  const [selectedIds,   setSelectedIds]   = useState<number[]>([]);
  const [selectedPeriods, setSelectedPeriods] = useState<number[]>([]);
  const [focusedId,     setFocusedId]     = useState<number | null>(null);
  const [debouncedSearch] = useDebouncedValue(search, 350);
  const [groupingMode,  setGroupingMode]  = useState<'status' | 'rotation'>('status');
  const [drawerOpen,    { open: openDrawer, close: closeDrawer }] = useDisclosure(false);

  const [target,       setTarget]       = useState<InternshipAssignmentSummaryResponse | null>(null);
  const [recordId,     setRecordId]     = useState<string | null>(null);
  const [validateOpen, { open: openValidate, close: closeValidate }] = useDisclosure(false);
  const [rejectOpen,   { open: openReject,   close: closeReject   }] = useDisclosure(false);
  const [importOpen,   { open: openImport,   close: closeImport   }] = useDisclosure(false);

  // ── Data ───────────────────────────────────────────────────────────────────
  const { currentYearId } = useAcademicYear();

  const { data: stagesPage } = useGetStagesQuery({ pageSize: 100 });
  const stages = stagesPage?.items ?? [];

  // Year-scoped: a stage accumulates a cohort per (group, year), so the unscoped list returned every
  // year it has ever run — 681 rows for "Chirurgie" on the imported data.
  const { data: cohorts = [], isLoading: cohortsLoading } = useGetCohortOptionsByStageQuery(
    { stageId: Number(stageId), academicYearId: currentYearId ?? undefined }, { skip: !stageId }
  );

  // Stage periods (P1, P2…) — used to scope bulk start/close to a chosen window.
  const { data: schedule } = useGetStageScheduleQuery(
    { stageId: Number(stageId), academicYearId: currentYearId ?? undefined },
    { skip: !stageId },
  );
  const scheduleSlots = schedule?.slots ?? [];
  const slots = [...scheduleSlots].sort((a, b) => a.periodNumber - b.periodNumber);
  const allPeriodNumbers = slots.map((s) => s.periodNumber);
  // Empty selection means "all periods" — the chips render fully selected by default.
  const effectivePeriods = selectedPeriods.length ? selectedPeriods : allPeriodNumbers;
  const periodArg = selectedPeriods.length ? selectedPeriods : undefined;
  const isAllPeriods = selectedPeriods.length === 0 || selectedPeriods.length >= allPeriodNumbers.length;

  // Which periods each cohort actually occupies, read off the schedule grid (cells aligned to slots).
  const cohortPeriods = new Map<number, Set<number>>();
  schedule?.cohorts.forEach((row) => {
    const set = new Set<number>();
    row.cells.forEach((cell, i) => { if (cell && scheduleSlots[i]) set.add(scheduleSlots[i].periodNumber); });
    cohortPeriods.set(row.cohortId, set);
  });

  // Filter cohorts by the globally-selected academic year, then by the selected periods
  // (a cohort shows only if it runs in at least one targeted period). All periods → no period filter.
  const yearCohorts = currentYearId
    ? cohorts.filter((c) => c.academicYearId === currentYearId)
    : cohorts;
  const visibleCohorts = isAllPeriods
    ? yearCohorts
    : yearCohorts.filter((c) => {
        const occupied = cohortPeriods.get(c.id);
        return occupied ? [...occupied].some((pn) => selectedPeriods.includes(pn)) : false;
      });

  // Block start/close when none of the checked cohorts actually runs in the chosen period(s)
  // — e.g. trying to act on partition B in a window where only A has a rotation.
  const selectionHasTargetPeriod = cohortPeriods.size === 0
    || selectedIds.some((id) => {
        const occupied = cohortPeriods.get(id);
        return occupied ? [...occupied].some((pn) => effectivePeriods.includes(pn)) : false;
      });

  // Clear selections when the year or stage changes. Changing the stage already resets the page (it
  // goes through setFilter); a year change from the navbar does not, so it is reset here.
  useEffect(() => {
    setSelectedIds([]);
    setFocusedId(null);
    setSelectedPeriods([]);
    setPage(1);
  }, [currentYearId, stageId, setPage]);

  // Pagination reset on a new search term or stage is handled by useListParams' setters.

  const planGroups = visibleCohorts.reduce<Record<string, CohortResponse[]>>((acc, c) => {
    const key = c.isSchedulePublished ? 'Publié' : c.slotAssignmentCount > 0 ? 'Configuré' : 'Sans planning';
    (acc[key] ??= []).push(c);
    return acc;
  }, {});
  const isGrouped = Object.keys(planGroups).some((k) => !k.startsWith('Sans'));

  const rotationGroups = visibleCohorts.reduce<Record<string, CohortResponse[]>>((acc, c) => {
    const key = c.rotationGroup ?? 'Sans rotation';
    (acc[key] ??= []).push(c);
    return acc;
  }, {});

  const cohortDetail = useGetCohortByIdQuery(focusedId!, { skip: !focusedId }).data;

  // Plan detection — works for single and multi-selection
  const selectedCohortObjects = visibleCohorts.filter((c) => selectedIds.includes(c.id));
  const cohortIdsWithAssignments = selectedCohortObjects.filter((c) => c.slotAssignmentCount > 0).map((c) => c.id);
  // When exactly one cohort is selected (or focused), use it for schedule display
  const effectiveSingleId =
    selectedIds.length === 1
      ? selectedIds[0]
      : selectedIds.length === 0 && focusedId
      ? focusedId
      : null;

  // Load detail for the single effective cohort (focused or single-checked)
  const singleDetail = useGetCohortByIdQuery(effectiveSingleId!, { skip: !effectiveSingleId }).data;

  const queryIds = selectedIds.length > 0 ? selectedIds : focusedId ? [focusedId] : [];

  const { data: result, isLoading: assignmentsLoading } = useGetInternshipAssignmentsQuery(
    {
      cohortIds: queryIds.length > 0 ? queryIds : undefined,
      status: statusFilter ?? undefined,
      search: debouncedSearch.trim() || undefined,
      pageNumber: page,
      pageSize: PAGE_SIZE,
    },
    { skip: queryIds.length === 0 }
  );

  const { data: statusSummary = [] } = useGetAssignmentStatusSummaryQuery(
    { cohortIds: queryIds.length > 0 ? queryIds : undefined, periodNumbers: periodArg },
    { skip: queryIds.length === 0 }
  );

  const assignments = result?.items ?? [];
  const totalPages  = result?.totalPages ?? 1;

  const byStatus = Object.fromEntries(
    (Object.keys(STATUS_CFG) as InternshipStatus[]).map((s) => [
      s, statusSummary.find((x) => x.status === s)?.count ?? 0,
    ])
  ) as Record<InternshipStatus, number>;

  // ── Mutations ──────────────────────────────────────────────────────────────
  const [startOne,       { isLoading: startingOne      }] = useStartAssignmentMutation();
  const [validateOne,    { isLoading: validatingOne    }] = useValidateAssignmentMutation();
  const [rejectOne,      { isLoading: rejectingOne     }] = useRejectAssignmentMutation();
  const [startStage,     { isLoading: startingStage    }] = useStartStagePeriodsMutation();
  const [completeStage,  { isLoading: completingStage  }] = useCompleteStagePeriodsMutation();
  const [pauseStage,     { isLoading: pausingStage     }] = usePauseStagePeriodsMutation();
  const [resumeStage,    { isLoading: resumingStage    }] = useResumeStagePeriodsMutation();
  const [validateCohort, { isLoading: validatingCohort }] = useValidateCohortAssignmentsMutation();
  const bulkLoading = startingStage || completingStage || pausingStage || resumingStage || validatingCohort;

  // Pause modal (exam week etc.) — captures a reason kind + free text before suspending.
  const [pauseOpen, { open: openPause, close: closePause }] = useDisclosure(false);
  const [pauseKind, setPauseKind] = useState<PauseKind>('Exam');
  const [pauseReason, setPauseReason] = useState('');

  // ── Helpers ────────────────────────────────────────────────────────────────
  // Validate still loops (cohort-scoped); start/close act on the whole selection in one round-trip.
  const runForSelected = async <T,>(label: string, fn: (id: number) => Promise<T>, countKey: keyof T) => {
    let total = 0;
    for (const id of selectedIds) {
      try { const res = await fn(id); total += (res as Record<string, number>)[countKey as string] ?? 0; }
      catch { /* skip */ }
    }
    notify.success(`${total} opération(s) — ${label}`);
  };

  const handleBulkStart = async () => {
    if (!stageId) return;
    try {
      const res = await startStage({
        stageId: Number(stageId), academicYearId: currentYearId ?? undefined,
        cohortIds: selectedIds, periodNumbers: periodArg,
      }).unwrap();
      notify.success(`${res.started} période(s) démarrée(s)`);
    } catch { notify.error('Impossible de démarrer'); }
  };
  const handleBulkComplete = async () => {
    if (!stageId) return;
    try {
      const res = await completeStage({
        stageId: Number(stageId), academicYearId: currentYearId ?? undefined,
        cohortIds: selectedIds, periodNumbers: periodArg,
      }).unwrap();
      notify.success(`${res.completed} période(s) clôturée(s)`);
    } catch { notify.error('Impossible de clôturer'); }
  };
  const handleBulkValidate = () => runForSelected('validation', (id) => validateCohort(id).unwrap(),  'validated');
  const handleBulkPause = async () => {
    if (!stageId) return;
    try {
      const res = await pauseStage({
        stageId: Number(stageId), academicYearId: currentYearId ?? undefined,
        kind: pauseKind, reason: pauseReason.trim() || undefined,
        cohortIds: selectedIds, periodNumbers: periodArg,
      }).unwrap();
      notify.success(`${res.paused} rotation(s) en pause`);
      setPauseReason('');
      closePause();
    } catch { notify.error('Impossible de mettre en pause'); }
  };
  const handleBulkResume = async () => {
    if (!stageId) return;
    try {
      const res = await resumeStage({
        stageId: Number(stageId), academicYearId: currentYearId ?? undefined,
        cohortIds: selectedIds, periodNumbers: periodArg,
      }).unwrap();
      notify.success(`${res.resumed} rotation(s) reprise(s)`);
    } catch { notify.error('Impossible de reprendre'); }
  };

  const handleStartOne = async (a: InternshipAssignmentSummaryResponse) => {
    try { await startOne(a.id).unwrap(); notify.success(`${a.studentFullName} — démarrée`); }
    catch { notify.error('Impossible de démarrer'); }
  };
  const handleValidateOne = async () => {
    if (!target) return;
    try { await validateOne(target.id).unwrap(); notify.success(`${target.studentFullName} — validé`); closeValidate(); }
    catch { notify.error('Impossible de valider'); }
  };
  const handleRejectOne = async () => {
    if (!target) return;
    try { await rejectOne(target.id).unwrap(); notify.success(`${target.studentFullName} — rejeté`); closeReject(); }
    catch { notify.error('Impossible de rejeter'); }
  };

  const someChecked = selectedIds.length > 0;
  const hasContent  = queryIds.length > 0;

  const toggleSelect = (id: number) =>
    setSelectedIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const selectGroup = (group: CohortResponse[]) => {
    const ids = group.map((c) => c.id);
    const allIn = ids.every((id) => selectedIds.includes(id));
    setSelectedIds((p) => allIn ? p.filter((id) => !ids.includes(id)) : [...new Set([...p, ...ids])]);
  };

  const setFocus = (id: number) => {
    setFocusedId(id);
    setFilter('status', null);
    if (isMobile) closeDrawer();
  };

  const handleStageChange = (v: string | null) => {
    setStageId(v);
    setSelectedIds([]);
    setFocusedId(null);
    setSelectedPeriods([]);
    setFilter('status', null);
  };

  const stageOptions  = stages.map((s) => ({ value: String(s.id), label: s.name }));
  // 'Paused' is a per-period count bucket, not a persisted assignment status — filtering by it
  // would return nothing, so it's excluded from the status filter (it still shows in the card).
  const statusOptions = (Object.entries(STATUS_CFG) as [InternshipStatus, { label: string }][])
    .filter(([value]) => value !== 'Paused')
    .map(([value, { label }]) => ({ value, label }));

  const showCohortColumn = selectedIds.length > 1;
  const contentTitle = showCohortColumn
    ? `${selectedIds.length} cohortes`
    : effectiveSingleId ? (singleDetail?.label ?? cohortDetail?.label ?? '…') : null;

  const sidebarProps = {
    cohorts: visibleCohorts, cohortsLoading, selectedIds, focusedId, planGroups, rotationGroups, isGrouped,
    groupingMode, onGroupingModeChange: setGroupingMode,
    onToggleSelect: toggleSelect,
    onFocus: setFocus,
    onSelectGroup: selectGroup,
    onSelectAll: () => setSelectedIds(visibleCohorts.map((c) => c.id)),
    onClearAll:  () => setSelectedIds([]),
  };

  return (
    <Container fluid p={0}>
      <Stack gap={0}>

        {/* ── Header ────────────────────────────────────────────────── */}
        <Box
          px={{ base: 'md', sm: 'xl' }}
          pt={{ base: 'md', sm: 'xl' }}
          pb="md"
          style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}
        >
          <Group justify="space-between" align="flex-end" wrap="wrap" gap="sm">
            <Stack gap={2}>
              <Title order={2} fw={700} size="h3">Affectations</Title>
              <Text size="sm" c="dimmed" visibleFrom="sm">
                Gérez le cycle de vie des affectations par cohorte.
              </Text>
            </Stack>
            <Group gap="sm" align="flex-end" wrap="nowrap">
              {stageId && (
                <Button
                  size={isMobile ? 'sm' : 'md'} variant="light" color="navy" radius="md"
                  leftSection={<IconFileSpreadsheet size={16} stroke={1.5} />}
                  onClick={openImport}
                >
                  Importer les notes
                </Button>
              )}
              {isMobile && stageId && (
                <Button
                  size="sm" variant="light" color="navy" radius="md"
                  leftSection={<IconLayoutSidebar size={14} stroke={1.5} />}
                  onClick={openDrawer}
                >
                  Cohortes {someChecked && `(${selectedIds.length})`}
                </Button>
              )}
              <Select
                label="Stage" placeholder="Sélectionner un stage"
                data={stageOptions} value={stageId}
                onChange={handleStageChange}
                searchable clearable
                w={{ base: 200, sm: 280 }}
                size={isMobile ? 'sm' : 'md'}
              />
            </Group>
          </Group>
        </Box>

        {!stageId ? (
          <Stack align="center" justify="center" py="xl" gap="sm" px="md">
            <IconClipboardCheck size={56} stroke={1} color="#CBD5E1" />
            <Text c="dimmed" size="sm" ta="center">Sélectionnez un stage pour commencer.</Text>
          </Stack>
        ) : (
          <Group gap={0} align="flex-start">

            {/* ── Desktop sidebar ──────────────────────────────────── */}
            <Box
              visibleFrom="sm"
              style={{
                width: rem(260), flexShrink: 0,
                borderRight: '1px solid #E2E8F0',
                background: '#FAFBFC',
                position: 'sticky',
                top: rem(60),
                maxHeight: 'calc(100vh - 60px)',
                overflowY: 'auto',
              }}
            >
              <SidebarContent {...sidebarProps} />
            </Box>

            {/* ── Mobile drawer ─────────────────────────────────────── */}
            <Drawer
              opened={drawerOpen}
              onClose={closeDrawer}
              title={<Text fw={700} size="sm">Cohortes</Text>}
              position="left"
              size="xs"
              padding={0}
              hiddenFrom="sm"
            >
              <Box style={{ height: 'calc(100vh - 60px)', overflowY: 'auto' }}>
                <SidebarContent {...sidebarProps} />
              </Box>
            </Drawer>

            {/* ── Main area ─────────────────────────────────────────── */}
            <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>

              {/* Period filter bar — only when the selected year actually has cohorts to scope. */}
              {slots.length > 0 && yearCohorts.length > 0 && (
                <Box
                  px={{ base: 'md', sm: 'xl' }} py="sm"
                  style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}
                >
                  <Group gap={6} wrap="wrap" align="center">
                    <Text size="xs" fw={600} c="navy.7">Période(s) :</Text>
                    <Chip.Group
                      multiple
                      value={effectivePeriods.map(String)}
                      onChange={(v) => setSelectedPeriods(v.map(Number))}
                    >
                      {slots.map((s) => (
                        <Chip key={s.id} value={String(s.periodNumber)} size="xs" variant="outline" color="navy" radius="sm">
                          P{s.periodNumber} · {fmtDM(s.startDate)}→{fmtDM(s.endDate)}
                        </Chip>
                      ))}
                    </Chip.Group>
                    <Text size="xs" c="dimmed">
                      {isAllPeriods ? '(toutes les périodes)' : `${selectedPeriods.length} / ${allPeriodNumbers.length} période(s)`}
                    </Text>
                  </Group>
                </Box>
              )}

              {/* Bulk actions bar */}
              {someChecked && (
                <Box
                  px={{ base: 'md', sm: 'xl' }} py="sm"
                  style={{ background: '#EBF4FF', borderBottom: '1px solid #BFDBFE' }}
                >
                    <ScrollArea type="never">
                      <Group gap="sm" wrap="nowrap" align="center" style={{ minWidth: 0 }}>
                        <Text size="xs" fw={600} c="navy.7" style={{ flexShrink: 0 }}>
                          {selectedIds.length} cohorte(s){selectedPeriods.length ? ` · ${selectedPeriods.length} période(s)` : ''} :
                        </Text>
                        <Button size="xs" color="blue" variant="light" radius="md" style={{ flexShrink: 0 }}
                          leftSection={<IconPlayerPlay size={12} stroke={1.5} />}
                          loading={startingStage} disabled={bulkLoading || !selectionHasTargetPeriod}
                          onClick={handleBulkStart}>
                          Démarrer
                        </Button>
                        <Button size="xs" color="teal" variant="light" radius="md" style={{ flexShrink: 0 }}
                          leftSection={<IconPlayerStop size={12} stroke={1.5} />}
                          loading={completingStage} disabled={bulkLoading || !selectionHasTargetPeriod}
                          onClick={handleBulkComplete}>
                          Clôturer
                        </Button>
                        <Button size="xs" color="orange" variant="light" radius="md" style={{ flexShrink: 0 }}
                          leftSection={<IconPlayerPause size={12} stroke={1.5} />}
                          disabled={bulkLoading || !selectionHasTargetPeriod}
                          onClick={openPause}>
                          Pause
                        </Button>
                        <Button size="xs" color="orange" variant="subtle" radius="md" style={{ flexShrink: 0 }}
                          leftSection={<IconPlayerPlay size={12} stroke={1.5} />}
                          loading={resumingStage} disabled={bulkLoading || !selectionHasTargetPeriod}
                          onClick={handleBulkResume}>
                          Reprendre
                        </Button>
                        {!selectionHasTargetPeriod && (
                          <Text size="xs" c="dimmed" fs="italic" style={{ flexShrink: 0 }}>
                            aucune rotation dans la période choisie
                          </Text>
                        )}
                        <Button size="xs" color="green" variant="light" radius="md" style={{ flexShrink: 0 }}
                          leftSection={<IconCircleCheck size={12} stroke={1.5} />}
                          loading={validatingCohort} disabled={bulkLoading}
                          onClick={handleBulkValidate}>
                          Valider
                        </Button>
                      </Group>
                    </ScrollArea>
                </Box>
              )}

              {/* Content */}
              {!hasContent ? (
                <Stack align="center" justify="center" py="xl" gap="sm" px="md">
                  <IconUsersGroup size={48} stroke={1} color="#CBD5E1" />
                  <Text c="dimmed" size="sm" ta="center">
                    {isMobile
                      ? 'Ouvrez le panneau des cohortes pour sélectionner.'
                      : 'Cliquez sur une cohorte pour voir ses affectations.'}
                  </Text>
                </Stack>
              ) : (
                <Stack gap="md" p={{ base: 'md', sm: 'xl' }}>

                    {/* Info row */}
                    <Group gap="md" align="flex-start" wrap="wrap">

                      {/* Status summary card */}
                      <Card padding="md" radius="lg" withBorder shadow="xs" style={{ minWidth: 200, flex: '0 0 auto' }}>
                        <Stack gap="sm">
                          <Group gap="sm" wrap="nowrap">
                            <ThemeIcon size={28} radius="md" variant="light" color="navy">
                              <IconUsersGroup size={15} stroke={1.5} />
                            </ThemeIcon>
                            <Stack gap={0} style={{ minWidth: 0 }}>
                              <Text fw={700} size="sm" truncate>{contentTitle ?? '…'}</Text>
                              {effectiveSingleId && !showCohortColumn && (
                                <Text size="xs" c="dimmed" truncate>{(singleDetail ?? cohortDetail)?.academicGroupLabel}</Text>
                              )}
                            </Stack>
                          </Group>
                          <Divider />
                          <Stack gap={4}>
                            {(Object.entries(byStatus) as [InternshipStatus, number][])
                              .filter(([, n]) => n > 0)
                              .map(([status, count]) => (
                                <Group key={status} justify="space-between">
                                  <StatusBadge status={status} />
                                  <Text size="sm" fw={700}>{count}</Text>
                                </Group>
                              ))}
                            {statusSummary.length === 0 && !assignmentsLoading && (
                              <Text size="xs" c="dimmed" ta="center">Aucun étudiant affecté</Text>
                            )}
                          </Stack>
                        </Stack>
                      </Card>

                      {/* Schedule detail (single cohort — focused or single-checked) */}
                      {effectiveSingleId && !showCohortColumn && (singleDetail ?? cohortDetail)?.slotAssignments.length ? (
                        <Card padding="md" radius="lg" withBorder shadow="xs" style={{ flex: 1, minWidth: 0 }}>
                          <Stack gap="sm">
                            <Text size="xs" fw={700} tt="uppercase" c="dimmed" style={{ letterSpacing: '0.6px' }}>
                              Planning des rotations
                            </Text>
                            <ScrollArea type="never">
                              <Group gap="xs" align="center" wrap="nowrap">
                                {(singleDetail ?? cohortDetail)!.slotAssignments.map((t, i) => (
                                  <Group key={t.assignmentId} gap="xs" wrap="nowrap" align="center">
                                    {i > 0 && <IconArrowRight size={12} stroke={1.5} color="#94A3B8" style={{ flexShrink: 0 }} />}
                                    <Card padding="xs" radius="md" withBorder style={{ background: '#F8FAFC', flexShrink: 0 }}>
                                      <Stack gap={2}>
                                        <Group gap={4} wrap="nowrap">
                                          <IconBuildingHospital size={10} stroke={1.5} color="#94A3B8" />
                                          <Text size="xs" fw={600} style={{ whiteSpace: 'nowrap', maxWidth: 120 }} truncate>
                                            {t.serviceName}
                                          </Text>
                                        </Group>
                                        <Text size="xs" c="dimmed" ff="monospace" style={{ whiteSpace: 'nowrap' }}>
                                          {t.startDate} → {t.endDate}
                                        </Text>
                                      </Stack>
                                    </Card>
                                  </Group>
                                ))}
                              </Group>
                            </ScrollArea>
                          </Stack>
                        </Card>
                      ) : null}

                      {/* Schedule detail (multi-select: one card per cohort with assignments) */}
                      {showCohortColumn && cohortIdsWithAssignments.length > 0 && (
                        <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
                          {cohortIdsWithAssignments.map((id) => (
                            <CohortPlanMiniCard key={id} cohortId={id} />
                          ))}
                        </Stack>
                      )}
                    </Group>

                    {/* Assignments table */}
                    <Card padding="md" radius="lg" withBorder shadow="sm">
                      <Stack gap="md">
                        <Group justify="space-between" wrap="wrap" gap="sm">
                          <Text size="sm" fw={600}>
                            Affectations
                            {result && (
                              <Text span c="dimmed" fw={400} ml={6} size="sm">
                                ({result.totalCount})
                              </Text>
                            )}
                          </Text>
                          <Group gap="xs" wrap="nowrap">
                            <TextInput
                              placeholder="Rechercher (nom, apogée, CNE)"
                              leftSection={<IconSearch size={14} stroke={1.5} />}
                              value={search}
                              onChange={(e) => setSearch(e.currentTarget.value)}
                              size="xs" w={220}
                            />
                            <Select
                              placeholder="Tous les statuts"
                              data={statusOptions}
                              value={statusFilter}
                              onChange={(v) => setFilter('status', v)}
                              clearable size="xs" w={160}
                            />
                          </Group>
                        </Group>

                        <ScrollArea type="always">
                          <Table striped highlightOnHover verticalSpacing="sm" style={{ minWidth: 480 }}>
                            <Table.Thead>
                              <Table.Tr>
                                <Table.Th style={{ minWidth: 160 }}>Étudiant</Table.Th>
                                {showCohortColumn && <Table.Th style={{ minWidth: 120 }}>Cohorte</Table.Th>}
                                <Table.Th style={{ minWidth: 100 }}>Statut</Table.Th>
                                <Table.Th style={{ minWidth: 80 }}>Note</Table.Th>
                                <Table.Th style={{ minWidth: 80 }}>Résultat</Table.Th>
                                <Table.Th w={70} />
                              </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                              {assignmentsLoading ? (
                                Array.from({ length: 6 }).map((_, i) => (
                                  <Table.Tr key={i}>
                                    {[160, ...(showCohortColumn ? [120] : []), 100, 80, 80, 60].map((w, j) => (
                                      <Table.Td key={j}><Skeleton height={14} width={w} radius="sm" /></Table.Td>
                                    ))}
                                  </Table.Tr>
                                ))
                              ) : assignments.length === 0 ? (
                                <Table.Tr>
                                  <Table.Td colSpan={showCohortColumn ? 6 : 5}>
                                    <Stack align="center" py="xl" gap="xs">
                                      <IconClipboardCheck size={32} stroke={1} color="#CBD5E1" />
                                      <Text c="dimmed" size="sm">
                                        {statusFilter ? 'Aucune affectation avec ce statut.' : 'Aucun étudiant affecté.'}
                                      </Text>
                                    </Stack>
                                  </Table.Td>
                                </Table.Tr>
                              ) : (
                                assignments.map((a) => (
                                  <Table.Tr key={a.id}>
                                    <Table.Td>
                                      <Text
                                        size="sm" fw={500} c="navy.7"
                                        style={{ cursor: 'pointer' }}
                                        td="underline"
                                        onClick={() => setRecordId(a.id)}
                                      >
                                        {a.studentFullName}
                                      </Text>
                                    </Table.Td>
                                    {showCohortColumn && (
                                      <Table.Td>
                                        <Text size="xs" c="dimmed">{a.cohortLabel}</Text>
                                      </Table.Td>
                                    )}
                                    <Table.Td>
                                      <Group gap={4} wrap="nowrap">
                                        <StatusBadge status={a.status} />
                                        {a.isPaused && <StatusBadge status="Paused" />}
                                      </Group>
                                    </Table.Td>
                                    <Table.Td>
                                      {a.finalScore !== null
                                        ? <Text size="sm" fw={600} c="navy.6" ff="monospace">{a.finalScore.toFixed(2)}</Text>
                                        : <Text size="xs" c="dimmed">—</Text>}
                                    </Table.Td>
                                    <Table.Td>
                                      <Text size="xs" fw={500}
                                        c={a.result === 'Validé' ? 'green' : a.result === 'NonValidé' ? 'red' : 'dimmed'}>
                                        {a.result ?? '—'}
                                      </Text>
                                    </Table.Td>
                                    <Table.Td>
                                      <Group gap={4} wrap="nowrap" justify="flex-end">
                                        <Tooltip label="Voir le dossier" position="top">
                                          <ActionIcon variant="subtle" color="gray" size="sm"
                                            onClick={() => setRecordId(a.id)}>
                                            <IconEye size={14} stroke={1.5} />
                                          </ActionIcon>
                                        </Tooltip>
                                        {a.status === 'Planned' && (
                                          <Tooltip label="Démarrer" position="top">
                                            <ActionIcon variant="subtle" color="blue" size="sm"
                                              loading={startingOne} onClick={() => handleStartOne(a)}>
                                              <IconPlayerPlay size={14} stroke={1.5} />
                                            </ActionIcon>
                                          </Tooltip>
                                        )}
                                        {a.status === 'Evaluated' && (
                                          <>
                                            <Tooltip label="Valider" position="top">
                                              <ActionIcon variant="subtle" color="green" size="sm"
                                                onClick={() => { setTarget(a); openValidate(); }}>
                                                <IconCircleCheck size={14} stroke={1.5} />
                                              </ActionIcon>
                                            </Tooltip>
                                            <Tooltip label="Rejeter" position="top">
                                              <ActionIcon variant="subtle" color="red" size="sm"
                                                onClick={() => { setTarget(a); openReject(); }}>
                                                <IconCircleX size={14} stroke={1.5} />
                                              </ActionIcon>
                                            </Tooltip>
                                          </>
                                        )}
                                      </Group>
                                    </Table.Td>
                                  </Table.Tr>
                                ))
                              )}
                            </Table.Tbody>
                          </Table>
                        </ScrollArea>

                        {totalPages > 1 && (
                          <Group justify="center">
                            <Pagination value={page} onChange={setPage} total={totalPages} size="sm" color="navy" />
                          </Group>
                        )}
                      </Stack>
                    </Card>
                </Stack>
              )}
            </Stack>
          </Group>
        )}
      </Stack>

      <StudentRecordModal
        assignmentId={recordId}
        opened={recordId !== null}
        onClose={() => setRecordId(null)}
      />

      {stageId && (
        <EvaluationImportModal
          stageId={Number(stageId)}
          stageName={stages.find((s) => String(s.id) === stageId)?.name}
          periodNumbers={allPeriodNumbers}
          academicYearId={currentYearId ?? undefined}
          opened={importOpen}
          onClose={closeImport}
        />
      )}

      <ConfirmModal opened={validateOpen} onClose={closeValidate}
        title="Valider le stage"
        message={`Confirmer la validation du stage de ${target?.studentFullName ?? ''} ?`}
        confirmLabel="Valider" confirmColor="green"
        onConfirm={handleValidateOne} loading={validatingOne}
      />
      <ConfirmModal opened={rejectOpen} onClose={closeReject}
        title="Rejeter le stage"
        message={`Rejeter le stage de ${target?.studentFullName ?? ''} ?`}
        confirmLabel="Rejeter" confirmColor="red"
        onConfirm={handleRejectOne} loading={rejectingOne}
      />

      <Modal opened={pauseOpen} onClose={closePause} title="Mettre la rotation en pause" radius="lg" size="sm">
        <Stack gap="md">
          <Text size="xs" c="dimmed">
            Suspend les rotations en cours de la sélection ({selectedIds.length} cohorte(s)
            {selectedPeriods.length ? ` · ${selectedPeriods.length} période(s)` : ''}). À la reprise,
            les jours d'interruption sont reportés sur la fin de la période et décalent la suite du planning.
          </Text>
          <Select
            label="Motif"
            data={PAUSE_KIND_OPTIONS}
            value={pauseKind}
            onChange={(v) => setPauseKind((v as PauseKind) ?? 'Exam')}
            allowDeselect={false}
          />
          <Textarea
            label="Précision (optionnel)"
            placeholder="Ex. examens du 1er semestre…"
            value={pauseReason}
            onChange={(e) => setPauseReason(e.currentTarget.value)}
            minRows={2} maxRows={4} autosize
          />
          <Group justify="flex-end">
            <Button variant="subtle" color="gray" onClick={closePause}>Annuler</Button>
            <Button color="orange" loading={pausingStage}
              leftSection={<IconPlayerPause size={16} stroke={1.5} />}
              onClick={handleBulkPause}>
              Mettre en pause
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
