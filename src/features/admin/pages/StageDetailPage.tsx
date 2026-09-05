import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Chip,
  Container,
  Divider,
  Group,
  Loader,
  Modal,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
  rem,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconChevronDown,
  IconChevronUp,
  IconCalendar,
  IconCalendarTime,
  IconCircleCheck,
  IconPlayerPlay,
  IconPlus,
  IconRefresh,
  IconRocket,
  IconRocketOff,
  IconStethoscope,
  IconTrash,
  IconUserPlus,
  IconUsersGroup,
  IconX,
} from '@tabler/icons-react';
import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useGetStageByIdQuery,
  useGetCohortOptionsByStageQuery,
  useCreateCohortMutation,
  useDeleteCohortMutation,
  useAssignStudentsToCohortMutation,
  useAssignAllStudentsByStageMutation,
  useStartCohortAssignmentsMutation,
  usePublishScheduleMutation,
  usePublishStageScheduleMutation,
  useUnpublishScheduleMutation,
  useUnpublishStageScheduleMutation,
  useGetAcademicYearsQuery,
  useGetAcademicGroupOptionsQuery,
  useGetServicesQuery,
  useAddAllowedServiceMutation,
  useRemoveAllowedServiceMutation,
  useSetAllowedServiceOrderMutation,
  useDeleteAllStageCohortsMutation,
} from '../api/adminApi';
import { ScheduleGridModal } from '../components/ScheduleGridModal';
import type { AllowedServiceSummary } from '../types/admin.types';
import { useNotify } from '../../../common/hooks/useNotify';
import { ConfirmModal } from '../../../common/components/ConfirmModal';
import { PATHS } from '../../../routes/paths';
import { useAcademicYear } from '../contexts/useAcademicYear';

export default function StageDetailPage() {
  const { id } = useParams<{ id: string }>();
  const stageId = Number(id);
  const navigate = useNavigate();
  const notify = useNotify();

  // The academic year comes from the single global navbar selector — no page-local year dropdown.
  const { currentYearId, currentYear } = useAcademicYear();

  const { data: stage, isLoading: stageLoading } = useGetStageByIdQuery(stageId);

  // Scoped to the selected year on the server. Unscoped this returned a cohort for every (group,
  // year) the stage ever ran — 681 rows for "Chirurgie" — which is what made opening this page,
  // and the cohort/period screen behind it, grind to a halt.
  const { data: cohorts = [], isLoading: cohortsLoading } = useGetCohortOptionsByStageQuery(
    { stageId, academicYearId: currentYearId ?? undefined },
  );

  const [createCohort]  = useCreateCohortMutation();
  const [deleteCohort]  = useDeleteCohortMutation();
  const [assignStudents] = useAssignStudentsToCohortMutation();
  const [assignAll, { isLoading: assigningAll }] = useAssignAllStudentsByStageMutation();
  const [startAssignments]   = useStartCohortAssignmentsMutation();
  const [publishSchedule]    = usePublishScheduleMutation();
  const [publishStageSchedule] = usePublishStageScheduleMutation();
  const [unpublishSchedule]  = useUnpublishScheduleMutation();
  const [unpublishStageSchedule] = useUnpublishStageScheduleMutation();
  const [deleteAllCohorts, { isLoading: resettingCohorts }] = useDeleteAllStageCohortsMutation();

  const [assigningCohortId,   setAssigningCohortId]   = useState<number | null>(null);
  const [publishingCohortId,  setPublishingCohortId]  = useState<number | null>(null);
  const [unpublishingCohortId, setUnpublishingCohortId] = useState<number | null>(null);
  const [startingCohortId,    setStartingCohortId]    = useState<number | null>(null);
  const [publishingAll,       setPublishingAll]       = useState(false);
  const [publishAllOverCapacity, setPublishAllOverCapacity] = useState(false);
  const [unpublishingAll,     setUnpublishingAll]     = useState(false);

  const [activePartition, setActivePartition] = useState<string | null>(null);

  // Already the selected year's cohorts — the query is scoped server-side. Kept as a named value
  // because it is the effective scope for counts, action buttons, empty-states and every bulk
  // operation on this page.
  const yearCohorts = cohorts;

  // Partitions (rotation groups) are drawn only from the selected year's cohorts.
  const partitions = useMemo(() => {
    const labels = yearCohorts.map((c) => c.rotationGroup).filter((g): g is string => g !== null);
    return [...new Set(labels)].sort();
  }, [yearCohorts]);

  const filteredCohorts = useMemo(
    () => (activePartition ? yearCohorts.filter((c) => c.rotationGroup === activePartition) : yearCohorts),
    [yearCohorts, activePartition],
  );

  // A partition selected in a previous year may not exist in the new one — drop it.
  useEffect(() => {
    if (activePartition && !partitions.includes(activePartition)) setActivePartition(null);
  }, [partitions, activePartition]);

  const extractErrorCode = (err: unknown): string | null => {
    const data = (err as { data?: { extensions?: { errors?: Array<{ code: string }> } } })?.data;
    return data?.extensions?.errors?.[0]?.code ?? null;
  };

  const [rotationOpen, { open: openRotation, close: closeRotation }] = useDisclosure(false);
  const [modalOpen, { open, close }] = useDisclosure(false);

  // Confirm modals state
  const [deleteCohortTarget,  setDeleteCohortTarget]  = useState<{ id: number; label: string } | null>(null);
  const [deleteCohortOpen,    { open: openDeleteCohort,    close: closeDeleteCohort    }] = useDisclosure(false);
  const [unpublishTarget,     setUnpublishTarget]     = useState<{ id: number; label: string } | null>(null);
  // Non-null once the server has refused: holds its description of what unpublishing would destroy.
  const [unpublishWarning,    setUnpublishWarning]    = useState<string | null>(null);
  const [unpublishOpen,       { open: openUnpublish,       close: closeUnpublish       }] = useDisclosure(false);
  const [unpublishAllOpen,    { open: openUnpublishAll,    close: closeUnpublishAll    }] = useDisclosure(false);
  const [publishAllOpen,      { open: openPublishAll,      close: closePublishAll      }] = useDisclosure(false);
  const [resetCohortsOpen,    { open: openResetCohorts,    close: closeResetCohorts    }] = useDisclosure(false);

  // Allowed services
  const [serviceSearch, setServiceSearch] = useState('');
  // admitsLevelId keeps out the services whose quotas exclude this stage's promotion — the server
  // refuses those outright, so offering them would only produce an error toast. Unrestricted
  // services still come back: they take every promotion.
  const { data: servicesPage } = useGetServicesQuery(
    { searchTerm: serviceSearch, admitsLevelId: stage?.levelResponse?.id, pageSize: 20 },
    { skip: serviceSearch.length < 2 || stage?.levelResponse?.id === undefined },
  );
  const [addAllowedService,    { isLoading: addingService    }] = useAddAllowedServiceMutation();
  const [removeAllowedService, { isLoading: removingService  }] = useRemoveAllowedServiceMutation();
  const allowedIds = new Set(stage?.allowedServices.map((s) => s.id) ?? []);

  const handleAddService = async (service: AllowedServiceSummary) => {
    setServiceSearch('');
    try { await addAllowedService({ stageId, service }).unwrap(); }
    catch (err: unknown) {
      // The server names the promotions the service does take; that is far more useful than a
      // generic failure, so it is surfaced when present.
      const detail = (err as { data?: { detail?: string } })?.data?.detail;
      notify.error(detail ?? 'Impossible d\'ajouter ce service');
    }
  };
  const handleRemoveService = async (serviceId: number) => {
    try { await removeAllowedService({ stageId, serviceId }).unwrap(); }
    catch { notify.error('Impossible de retirer ce service'); }
  };

  // ── Rotation order ───────────────────────────────────────────────────────
  // ⚠ This is a planning input, not a display preference. RotationArranger emits each service's
  // block of the queue consecutively and the first période takes phase 0, so the service placed
  // first receives the first run of group numbers. It is what lets a nominative placement fall out
  // of the plan instead of being a cell edited by hand on the grid afterwards — an edit the printed
  // répartition shows, because a range cannot merge across the hole it leaves.
  const [setAllowedServiceOrder, { isLoading: reordering }] = useSetAllowedServiceOrderMutation();

  const moveService = async (index: number, direction: -1 | 1) => {
    const services = stage?.allowedServices ?? [];
    const target = index + direction;
    if (target < 0 || target >= services.length) return;

    // The whole list is sent, in the order wanted: the server refuses a partial one rather than
    // completing it, so there is nothing to gain by sending a move.
    const ids = services.map((s) => s.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];

    try { await setAllowedServiceOrder({ stageId, serviceIds: ids }).unwrap(); }
    catch (err: unknown) {
      const detail = (err as { data?: { detail?: string } })?.data?.detail;
      notify.error(detail ?? 'Impossible de réordonner les services');
    }
  };
  // The cohort-creation modal keeps its own year — provisioning next year's cohorts while looking at
  // this one is legitimate — but it opens on the navbar's year and follows it, so the common case
  // needs no second choice and the two pickers can't silently disagree.
  const [yearOverride,    setYearOverride]    = useState<string | null>(null);
  const selectedYear = yearOverride ?? (currentYearId != null ? String(currentYearId) : null);
  const [checkedGroupIds, setCheckedGroupIds] = useState<number[]>([]);
  const [isCreating,      setIsCreating]      = useState(false);

  const { data: years = [] } = useGetAcademicYearsQuery();
  const { data: groups = [], isFetching: loadingGroups } = useGetAcademicGroupOptionsQuery(
    {
      academicYearId: selectedYear ? Number(selectedYear) : undefined,
      levelId: stage?.levelResponse?.id,
    },
    { skip: !selectedYear }
  );

  const usedGroupIds    = new Set(cohorts.map((c) => c.academicGroupId));
  const availableGroups = groups.filter((g) => !usedGroupIds.has(g.id));
  const yearOptions     = years.map((y) => ({ value: String(y.id), label: y.label }));
  const allGroupIds     = availableGroups.map((g) => g.id);
  const allChecked      = checkedGroupIds.length === availableGroups.length && availableGroups.length > 0;
  const someChecked     = checkedGroupIds.length > 0;

  const toggleGroup = (gId: number) =>
    setCheckedGroupIds((prev) =>
      prev.includes(gId) ? prev.filter((x) => x !== gId) : [...prev, gId]
    );

  const handleCreateCohorts = async () => {
    if (!someChecked || !stage) return;
    setIsCreating(true);
    let success = 0, fail = 0;
    for (const groupId of checkedGroupIds) {
      const group = groups.find((g) => g.id === groupId);
      if (!group) continue;
      try {
        await createCohort({ stageId, academicGroupId: groupId, label: `${stage.name} — ${group.label}` }).unwrap();
        success++;
      } catch { fail++; }
    }
    setIsCreating(false);
    if (fail === 0) {
      notify.success(`${success} cohorte${success > 1 ? 's créées' : ' créée'}`);
      setYearOverride(null);   // back to following the navbar
      setCheckedGroupIds([]);
      close();
    } else {
      notify.warning(`${success} créée(s), ${fail} échouée(s)`);
    }
  };

  const handleAssignAll = async () => {
    try {
      const res = await assignAll({ stageId, academicYearId: currentYearId ?? undefined }).unwrap();
      if (res.successCount === 0) notify.info('Tous les étudiants sont déjà affectés.');
      else notify.success(`${res.successCount} étudiant(s) affecté(s) à toutes les cohortes`);
    } catch { notify.error('Erreur lors de l\'affectation globale'); }
  };

  const handleAssignStudents = async (cohortId: number, label: string) => {
    setAssigningCohortId(cohortId);
    try {
      const res = await assignStudents({ cohortId, stageId }).unwrap();
      if (res.successCount === 0) notify.info(`Tous les étudiants de "${label}" sont déjà affectés.`);
      else notify.success(`${res.successCount} étudiant(s) affecté(s) à "${label}"`);
    } catch { notify.error('Impossible d\'affecter les étudiants'); }
    finally { setAssigningCohortId(null); }
  };

  const handleDeleteCohortConfirm = async () => {
    if (!deleteCohortTarget) return;
    try {
      const res = await deleteCohort({ cohortId: deleteCohortTarget.id, stageId }).unwrap();
      notify.success(
        res.affectationsRemoved > 0
          ? `Cohorte supprimée — ${res.affectationsRemoved} affectation(s) et ${res.periodsRemoved} période(s) avec elle`
          : 'Cohorte supprimée',
      );
    } catch {
      // errorMiddleware toasts the refusal, which names the cohorte, its counts and what to do
      // first. A notify.error beside it printed the identical sentence twice.
    }
    closeDeleteCohort();
    setDeleteCohortTarget(null);
  };

  const handlePublishRotation = async (cohortId: number) => {
    setPublishingCohortId(cohortId);
    try {
      await publishSchedule({ cohortId, stageId }).unwrap();
      notify.success('Planning publié — périodes de service générées');
    } catch (err) {
      if (extractErrorCode(err) === 'Schedule.AlreadyPublished')
        notify.info('Le planning de cette cohorte est déjà publié');
      else if (extractErrorCode(err) === 'Schedule.NotConfigured')
        notify.warning('Aucune affectation de créneau configurée — ouvrez la grille de planning');
      else
        notify.error('Erreur lors de la publication du planning');
    } finally { setPublishingCohortId(null); }
  };

  // Two passes, deliberately. The first asks without `force`; if the rotation has begun the server
  // refuses and says what would be lost — periods started, marks entered, days of attendance — and
  // that sentence becomes the second confirmation. Deleting a chef's evaluations must be something
  // the admin agreed to after reading the count, not a side effect of the ordinary "Dépublier".
  const handleUnpublishRotationConfirm = async () => {
    if (!unpublishTarget) return;
    const { id: cohortId, label } = unpublishTarget;
    const force = unpublishWarning !== null;
    setUnpublishingCohortId(cohortId);
    try {
      const res = await unpublishSchedule({ cohortId, stageId, force }).unwrap();
      notify.success(
        `${res.periodsRemoved} période(s) supprimée(s) pour "${label}"`
        + (res.adHocPeriodsKept > 0
          ? ` — ${res.adHocPeriodsKept} période(s) hors planning conservée(s)`
          : ''),
      );
    } catch (error) {
      const problem = error as { data?: { detail?: string; title?: string } };
      const detail = problem.data?.detail;
      if (!force && problem.data?.title === 'Schedule.Underway' && detail) {
        setUnpublishWarning(detail);
        setUnpublishingCohortId(null);
        return;   // modal stays open, now showing what the deletion would cost
      }
      notify.error(detail ?? 'Impossible de dépublier ce planning');
    } finally { setUnpublishingCohortId(null); }
    closeUnpublishDialog();
  };

  const closeUnpublishDialog = () => {
    closeUnpublish();
    setUnpublishTarget(null);
    setUnpublishWarning(null);
  };

  /**
   * ⚠ One request for the whole stage, never one per cohorte.
   *
   * This used to loop: a hundred sequential publishes, each rebuilding the service occupancy from
   * scratch, and — since `errorMiddleware` toasts every rejected mutation — one red toast per
   * cohorte when the plan was over capacity. Dozens of them, arriving one at a time as the loop
   * ground on, none of which said how many cells were actually in trouble. `PublishStageSchedule`
   * is the same act expressed once: it checks every cell first, refuses with a single sentence
   * naming the count and the heaviest breaches, and writes nothing when it refuses.
   */
  const handlePublishAll = async () => {
    const publishable = yearCohorts.filter((c) => c.slotAssignmentCount > 0 && !c.isSchedulePublished);
    if (publishable.length === 0) { notify.info('Aucune cohorte avec un plan configuré non publié'); return; }

    closePublishAll();
    setPublishingAll(true);
    try {
      const res = await publishStageSchedule({
        stageId,
        academicYearId: currentYearId ?? undefined,
        allowOverCapacity: publishAllOverCapacity,
      }).unwrap();
      notify.success(
        `${res.publishedCohorts} planning(s) publié(s) — ${res.periodsCreated} période(s)`
        + (res.skippedCohorts > 0 ? `, ${res.skippedCohorts} cohorte(s) ignorée(s)` : ''),
      );
    } catch {
      // errorMiddleware toasts the server's own sentence — once, and it names the numbers.
    } finally {
      setPublishingAll(false);
    }
  };

  // ⚠ ONE request, not one per cohorte. The loop this replaces awaited a request per cohorte — 134
  // on the 3ᵉ MED — and each one invalidated the stage tag, so the page refetched a 134-row list
  // after every single one. That refetch storm was the lag, and since errorMiddleware toasts every
  // rejected mutation, a stage with rotations underway answered with one red toast per cohorte.
  const handleUnpublishAllConfirm = async () => {
    closeUnpublishAll();
    setUnpublishingAll(true);
    try {
      const res = await unpublishStageSchedule({ stageId, academicYearId: currentYearId ?? undefined }).unwrap();

      // The server never forces in bulk, so a cohorte underway is skipped and counted — the message
      // has to say so, or « 0 dépubliée » reads as a button that did nothing.
      if (res.cohortsUnpublished === 0 && res.cohortsSkippedUnderway === 0) {
        notify.info('Aucune répartition publiée à dépublier pour cette année.');
      } else {
        const parts = [
          `${res.periodsRemoved} période(s) supprimée(s) sur ${res.cohortsUnpublished} cohorte(s)`,
        ];
        if (res.cohortsSkippedUnderway > 0) {
          // The heaviest are NAMED, not just counted: « 4 cohortes conservées » tells the operator
          // there is work left without saying where it is, and the per-cohorte « Dépublier » is the
          // act that has to be aimed at one of them.
          const named = res.heaviestSkipped.map((c) => c.label).join(', ');
          parts.push(
            `${res.cohortsSkippedUnderway} cohorte(s) déjà engagée(s) conservée(s) — ` +
            `${res.periodsUnderway} période(s), ${res.evaluationsAtRisk} évaluation(s), ` +
            `${res.attendanceDaysAtRisk} jour(s) de présence` +
            (named ? ` (dont ${named})` : '') +
            '. Dépubliez-les une par une pour voir ce que chacune coûte.',
          );
        }
        if (res.adHocPeriodsKept > 0) {
          parts.push(`${res.adHocPeriodsKept} période(s) hors grille conservée(s).`);
        }
        // ⚠ warning, not info: something was deliberately NOT done and the operator has to act on it.
        // notify.info auto-closes in 4 s, which is not long enough to read this.
        if (res.cohortsSkippedUnderway > 0) notify.warning(parts.join(' · '));
        else notify.success(parts.join(' · '));
      }
    } catch (err: unknown) {
      const detail = (err as { data?: { detail?: string } })?.data?.detail;
      notify.error(detail ?? 'Impossible de dépublier les répartitions de ce stage');
    } finally {
      setUnpublishingAll(false);
    }
  };

  const handleStartAssignments = async (cohortId: number, label: string) => {
    setStartingCohortId(cohortId);
    try {
      const res = await startAssignments({ cohortId }).unwrap();
      notify.success(`${res.started} affectation(s) démarrée(s) pour "${label}"`);
    } catch { notify.error('Impossible de démarrer les affectations — vérifiez que le plan est publié'); }
    finally { setStartingCohortId(null); }
  };

  const handleResetAllCohortsConfirm = async () => {
    closeResetCohorts();
    try {
      const res = await deleteAllCohorts({ stageId, academicYearId: currentYearId ?? undefined }).unwrap();
      notify.success(
        `${res.cohortsRemoved} cohorte${res.cohortsRemoved !== 1 ? 's' : ''} supprimée${res.cohortsRemoved !== 1 ? 's' : ''}`
        + (res.affectationsRemoved > 0
          ? ` — ${res.affectationsRemoved} affectation(s) et ${res.periodsRemoved} période(s) avec elles`
          : ''),
      );
    } catch {
      // errorMiddleware toasts the refusal — « Psychiatrie est engagé en 2025-2026 : 60 cohorte(s)… »
    }
  };

  // ⚠ Named, never « l'année en cours ». The reset targets the year selected in the navbar, which is
  // routinely a past one — the refusal we saw on the real base read « engagé en 2025-2026 » while the
  // dialog above it had said « l'année en cours ». A destructive confirmation must name what it hits.
  const yearLabel = currentYear?.label ?? "l'année sélectionnée";

  const hasUnpublishedPlans = yearCohorts.some((c) => c.slotAssignmentCount > 0 && !c.isSchedulePublished);
  const hasPublishedRotations = yearCohorts.some((c) => c.isSchedulePublished);

  return (
    <Container fluid>
      <Stack gap="xl">
        {/* ── Header ───────────────────────────────────────────────────── */}
        <Group gap="sm">
          <ActionIcon variant="subtle" color="gray" radius="md" onClick={() => navigate(`${PATHS.ADMIN.ROOT}/stages`)}>
            <IconArrowLeft size={18} stroke={1.5} />
          </ActionIcon>
          {stageLoading ? (
            <Skeleton height={28} width={200} radius="sm" />
          ) : (
            <Stack gap={2}>
              <Title order={2} fw={700}>{stage?.name}</Title>
              {stage?.levelResponse && (
                <Badge variant="light" color="navy" radius="xl" size="sm">
                  {stage.levelResponse.label ?? `Année ${stage.levelResponse.year}`}
                </Badge>
              )}
            </Stack>
          )}
        </Group>

        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
          {/* ── Stage info ──────────────────────────────────────────────── */}
          <Stack gap="md">
            <Card padding="lg" radius="lg" withBorder shadow="sm">
              <Stack gap="md">
                <Text fw={600} size="sm" c="dimmed" tt="uppercase" style={{ letterSpacing: rem(0.8) }}>
                  Informations
                </Text>
                <SimpleGrid cols={2} spacing="md">
                  {[
                    { label: 'Durée',       value: stage ? `${stage.durationInDays} jours` : '—', icon: IconCalendar },
                    { label: 'Coefficient', value: stage ? String(stage.coefficient) : '—',        icon: IconStethoscope },
                  ].map(({ label, value, icon: Icon }) => (
                    <Card key={label} padding="md" radius="md" withBorder>
                      <Group gap="sm" wrap="nowrap">
                        <ThemeIcon size={32} radius="md" variant="light" color="navy">
                          <Icon size={16} stroke={1.5} />
                        </ThemeIcon>
                        <Stack gap={0}>
                          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>{label}</Text>
                          {stageLoading ? <Skeleton height={14} width={60} radius="sm" mt={2} /> : (
                            <Text size="sm" fw={600}>{value}</Text>
                          )}
                        </Stack>
                      </Group>
                    </Card>
                  ))}
                </SimpleGrid>

                {stage?.description && (
                  <>
                    <Divider />
                    <Text size="sm" c="dimmed">{stage.description}</Text>
                  </>
                )}
              </Stack>
            </Card>

            {/* ── Objectives ─────────────────────────────────────────── */}
            <Card padding="lg" radius="lg" withBorder shadow="sm">
              <Stack gap="md">
                <Group justify="space-between">
                  <Text fw={600} size="sm" c="dimmed" tt="uppercase" style={{ letterSpacing: rem(0.8) }}>
                    Critères d'évaluation
                  </Text>
                  {stage && (
                    <Badge variant="light" color="navy" radius="xl" size="sm">
                      {stage.stageObjectiveResponse.length}
                    </Badge>
                  )}
                </Group>

                {stageLoading ? (
                  <Stack gap="xs">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={44} radius="md" />)}</Stack>
                ) : stage?.stageObjectiveResponse.length === 0 ? (
                  <Text size="sm" c="dimmed">Aucun critère défini</Text>
                ) : (
                  stage?.stageObjectiveResponse.map((obj, i) => (
                    <Card key={i} padding="sm" radius="md" withBorder>
                      <Group justify="space-between" wrap="nowrap">
                        <Group gap="sm" wrap="nowrap">
                          <ThemeIcon size={24} radius="sm" variant="light" color={obj.isMandatory ? 'navy' : 'gray'}>
                            <IconCircleCheck size={14} stroke={1.5} />
                          </ThemeIcon>
                          <Stack gap={0}>
                            <Text size="sm" fw={500}>{obj.label}</Text>
                            {obj.description && <Text size="xs" c="dimmed">{obj.description}</Text>}
                          </Stack>
                        </Group>
                        <Stack gap={2} align="flex-end">
                          <Badge variant="light" color="navy" radius="xl" size="xs">{obj.weight} pts</Badge>
                          {obj.isMandatory && (
                            <Badge variant="light" color="warning" radius="xl" size="xs">Obligatoire</Badge>
                          )}
                        </Stack>
                      </Group>
                    </Card>
                  ))
                )}
              </Stack>
            </Card>

            {/* ── Allowed services ───────────────────────────────────── */}
            <Card padding="lg" radius="lg" withBorder shadow="sm">
              <Stack gap="md">
                <Group justify="space-between">
                  <Text fw={600} size="sm" c="dimmed" tt="uppercase" style={{ letterSpacing: rem(0.8) }}>
                    Services autorisés
                  </Text>
                  {stage && (
                    <Badge variant="light" color={stage.allowedServices.length > 0 ? 'teal' : 'orange'} radius="xl" size="sm">
                      {stage.allowedServices.length === 0 ? 'Aucun' : stage.allowedServices.length}
                    </Badge>
                  )}
                </Group>

                {stageLoading ? (
                  <Stack gap="xs">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} height={36} radius="md" />)}</Stack>
                ) : (
                  <>
                    {stage?.allowedServices.length === 0 ? (
                      // An empty list is NOT "all services allowed" — RotationArranger refuses with
                      // Schedule.NoAllowedServices, so planning this stage is impossible until one
                      // is added. Saying "aucune restriction" here sent admins to a grid whose
                      // "Répartition auto." could only ever be disabled.
                      <Alert color="orange" variant="light" icon={<IconAlertTriangle size={16} />} p="xs">
                        <Text size="xs">
                          Aucun service n’est autorisé pour ce stage — la répartition automatique est
                          impossible tant qu’aucun n’est ajouté.
                        </Text>
                      </Alert>
                    ) : (
                      <Stack gap="xs">
                        {/* The list is in ROTATION order, which is what the arranger walks — not
                            alphabetical, which is what it used to show. The sentence is not
                            decoration: being first here decides which groups land where, and
                            nothing else on the screen says so. */}
                        <Text size="xs" c="dimmed">
                          Ordre de rotation : le 1ᵉʳ service reçoit les premiers groupes de la 1ʳᵉ
                          période. Réordonnez pour placer une promotion sans retoucher la grille.
                        </Text>

                        {stage?.allowedServices.map((svc, index) => (
                          <Group key={svc.id} gap="sm" justify="space-between" wrap="nowrap">
                            <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                              <ThemeIcon
                                size={24} radius="sm"
                                variant={index === 0 ? 'filled' : 'light'} color="teal"
                              >
                                {/* The position, not a decorative icon: it is the number that
                                    decides the placement. */}
                                <Text size="xs" fw={700}>{index + 1}</Text>
                              </ThemeIcon>
                              <Stack gap={0} style={{ minWidth: 0 }}>
                                <Text size="xs" fw={500} truncate>{svc.name}</Text>
                                <Text size="xs" c="dimmed" truncate>{svc.hospitalName}</Text>
                              </Stack>
                            </Group>
                            <Group gap={2} wrap="nowrap">
                              <ActionIcon
                                size="xs" variant="subtle" color="gray" radius="sm"
                                aria-label={`Monter ${svc.name}`}
                                disabled={index === 0 || reordering}
                                onClick={() => moveService(index, -1)}
                              >
                                <IconChevronUp size={13} stroke={1.5} />
                              </ActionIcon>
                              <ActionIcon
                                size="xs" variant="subtle" color="gray" radius="sm"
                                aria-label={`Descendre ${svc.name}`}
                                disabled={index === (stage?.allowedServices.length ?? 0) - 1 || reordering}
                                onClick={() => moveService(index, 1)}
                              >
                                <IconChevronDown size={13} stroke={1.5} />
                              </ActionIcon>
                              <ActionIcon
                                size="xs" variant="subtle" color="red" radius="sm"
                                aria-label={`Retirer ${svc.name}`}
                                loading={removingService}
                                onClick={() => handleRemoveService(svc.id)}
                              >
                                <IconX size={12} stroke={1.5} />
                              </ActionIcon>
                            </Group>
                          </Group>
                        ))}
                      </Stack>
                    )}

                    {/* Add service search */}
                    <Select
                      placeholder="Ajouter un service… (min. 2 car.)"
                      searchable
                      clearable
                      size="xs"
                      radius="md"
                      value={null}
                      searchValue={serviceSearch}
                      onSearchChange={setServiceSearch}
                      data={(servicesPage?.items ?? [])
                        .filter((s) => !allowedIds.has(s.id))
                        .map((s) => ({
                          value: String(s.id),
                          label: `${s.name} — ${s.hospitalName}`,
                        }))}
                      nothingFoundMessage={serviceSearch.length < 2 ? 'Tapez pour rechercher…' : 'Aucun service trouvé'}
                      onChange={(v) => {
                        if (!v) return;
                        const svc = (servicesPage?.items ?? []).find((s) => s.id === Number(v));
                        // rank 0 is the optimistic placeholder; the server ranks it last and the refetch says where.
                        if (svc) handleAddService({ id: svc.id, name: svc.name, hospitalName: svc.hospitalName, rank: 0 });
                      }}
                      disabled={addingService}
                      leftSection={<IconPlus size={12} stroke={1.5} />}
                    />
                  </>
                )}
              </Stack>
            </Card>
          </Stack>

          {/* ── Cohorts ─────────────────────────────────────────────────── */}
          <Card padding="lg" radius="lg" withBorder shadow="sm">
            <Stack gap="md">
              {/* Header row */}
              <Group justify="space-between" wrap="wrap" gap="xs">
                <Group gap="sm">
                  <Text fw={600} size="sm" c="dimmed" tt="uppercase" style={{ letterSpacing: rem(0.8) }}>
                    Cohortes
                  </Text>
                  {!cohortsLoading && (
                    <Badge variant="light" color="navy" radius="xl" size="sm">{yearCohorts.length}</Badge>
                  )}
                </Group>
                <Group gap="xs" wrap="wrap">
                  {yearCohorts.length > 0 && (
                    <>
                      <Tooltip label="Affecter tous les étudiants à toutes les cohortes" position="top">
                        <Button
                          size="xs" color="teal" radius="md" variant="light"
                          leftSection={<IconUsersGroup size={12} stroke={1.5} />}
                          loading={assigningAll}
                          onClick={handleAssignAll}
                        >
                          Tout affecter
                        </Button>
                      </Tooltip>
                      <Tooltip label="Configurer la grille de planning des rotations" position="top">
                        <Button
                          size="xs" color="violet" radius="md" variant="light"
                          leftSection={<IconCalendarTime size={12} stroke={1.5} />}
                          onClick={openRotation}
                        >
                          Grille de planning
                        </Button>
                      </Tooltip>
                      {hasUnpublishedPlans && (
                        <Tooltip label="Publier les plans de toutes les cohortes non encore publiées" position="top">
                          <Button
                            size="xs" color="orange" radius="md" variant="light"
                            leftSection={<IconRocket size={12} stroke={1.5} />}
                            loading={publishingAll}
                            onClick={() => { setPublishAllOverCapacity(false); openPublishAll(); }}
                          >
                            Publier toutes
                          </Button>
                        </Tooltip>
                      )}
                      {hasPublishedRotations && (
                        <Tooltip label="Supprimer toutes les périodes de service générées par les plans publiés" position="top">
                          <Button
                            size="xs" color="red" radius="md" variant="light"
                            leftSection={<IconRocketOff size={12} stroke={1.5} />}
                            loading={unpublishingAll}
                            onClick={openUnpublishAll}
                          >
                            Dépublier toutes
                          </Button>
                        </Tooltip>
                      )}
                    </>
                  )}
                  <Button
                    size="xs" color="navy" radius="md" variant="light"
                    leftSection={<IconPlus size={12} stroke={1.5} />}
                    onClick={open}
                  >
                    Nouvelle cohorte
                  </Button>
                  {yearCohorts.length > 0 && (
                    <Tooltip label="Supprimer toutes les cohortes de ce stage (bloqué si des affectations ont déjà démarré)" position="top">
                      <Button
                        size="xs" color="red" radius="md" variant="subtle"
                        leftSection={<IconRefresh size={12} stroke={1.5} />}
                        loading={resettingCohorts}
                        onClick={openResetCohorts}
                      >
                        Réinitialiser
                      </Button>
                    </Tooltip>
                  )}
                </Group>
              </Group>

              {/* Partition filter */}
              {partitions.length > 0 && (
                <Chip.Group
                  value={activePartition ?? ''}
                  onChange={(v) => setActivePartition(!v || v === activePartition ? null : (v as string))}
                >
                  <Group gap="xs" wrap="wrap">
                    <Chip value="" size="xs" radius="sm" color="violet" variant="light">Toutes</Chip>
                    {partitions.map((p) => (
                      <Chip key={p} value={p} size="xs" radius="sm" color="violet" variant="light">
                        Partition {p}
                      </Chip>
                    ))}
                  </Group>
                </Chip.Group>
              )}

              <Divider />

              {cohortsLoading ? (
                <Stack gap="xs">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={68} radius="md" />)}</Stack>
              ) : filteredCohorts.length === 0 ? (
                <Stack align="center" py="xl" gap="xs">
                  <IconUsersGroup size={32} stroke={1.5} color="#94A3B8" />
                  <Text c="dimmed" size="sm">
                    {cohorts.length === 0
                      ? 'Aucune cohorte pour ce stage'
                      : activePartition
                      ? `Aucune cohorte pour la partition ${activePartition}`
                      : 'Aucune cohorte pour cette année'}
                  </Text>
                </Stack>
              ) : (
                filteredCohorts.map((cohort) => (
                  <Card key={cohort.id} padding="md" radius="md" withBorder
                    style={{ borderLeft: cohort.isSchedulePublished ? '3px solid #51cf66' : undefined }}>
                    <Group justify="space-between" wrap="nowrap" gap="xs">
                      <Stack gap={4}>
                        <Text size="sm" fw={600}>{cohort.label}</Text>
                        <Group gap="xs" wrap="wrap">
                          <Badge variant="outline" color="gray" radius="xl" size="xs">
                            {cohort.academicYearLabel}
                          </Badge>
                          {cohort.rotationGroup && (
                            <Badge variant="dot" color="violet" radius="xl" size="xs">
                              {cohort.rotationGroup}
                            </Badge>
                          )}
                          <Text size="xs" c="dimmed">
                            {cohort.studentAssignmentCount} étudiant{cohort.studentAssignmentCount !== 1 ? 's' : ''}
                          </Text>
                          {cohort.isSchedulePublished ? (
                            <>
                              <Text size="xs" c="dimmed">·</Text>
                              <Badge variant="light" color="green" radius="xl" size="xs">Publié</Badge>
                            </>
                          ) : cohort.slotAssignmentCount > 0 ? (
                            <>
                              <Text size="xs" c="dimmed">·</Text>
                              <Badge variant="light" color="violet" radius="xl" size="xs">
                                {cohort.slotAssignmentCount} créneau{cohort.slotAssignmentCount > 1 ? 'x' : ''}
                              </Badge>
                            </>
                          ) : null}
                        </Group>
                      </Stack>
                      <Group gap={4} wrap="nowrap">
                        <Tooltip label="Affecter les étudiants du groupe" position="left">
                          <ActionIcon
                            variant="subtle" color="navy" size="sm" radius="md"
                            loading={assigningCohortId === cohort.id}
                            onClick={() => handleAssignStudents(cohort.id, cohort.label)}
                          >
                            <IconUserPlus size={rem(14)} stroke={1.5} />
                          </ActionIcon>
                        </Tooltip>
                        {cohort.slotAssignmentCount > 0 && !cohort.isSchedulePublished && (
                          <Tooltip label="Publier le planning" position="left">
                            <ActionIcon
                              variant="subtle" color="violet" size="sm" radius="md"
                              loading={publishingCohortId === cohort.id}
                              onClick={() => handlePublishRotation(cohort.id)}
                            >
                              <IconRocket size={rem(14)} stroke={1.5} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                        {cohort.isSchedulePublished && (
                          <Tooltip label="Dépublier (supprime les périodes de service générées)" position="left">
                            <ActionIcon
                              variant="subtle" color="red" size="sm" radius="md"
                              loading={unpublishingCohortId === cohort.id}
                              onClick={() => { setUnpublishTarget({ id: cohort.id, label: cohort.label }); openUnpublish(); }}
                            >
                              <IconRocketOff size={rem(14)} stroke={1.5} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                        <Tooltip label="Démarrer les affectations" position="left">
                          <ActionIcon
                            variant="subtle" color="teal" size="sm" radius="md"
                            loading={startingCohortId === cohort.id}
                            onClick={() => handleStartAssignments(cohort.id, cohort.label)}
                          >
                            <IconPlayerPlay size={rem(14)} stroke={1.5} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Supprimer" position="left">
                          <ActionIcon
                            variant="subtle" color="red" size="sm" radius="md"
                            onClick={() => { setDeleteCohortTarget({ id: cohort.id, label: cohort.label }); openDeleteCohort(); }}
                          >
                            <IconTrash size={rem(14)} stroke={1.5} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Group>
                  </Card>
                ))
              )}
            </Stack>
          </Card>
        </SimpleGrid>
      </Stack>

      <ScheduleGridModal
        opened={rotationOpen}
        onClose={closeRotation}
        stageId={stageId}
        academicYearId={currentYearId ?? undefined}
        allowedServiceIds={stage?.allowedServices.map((s) => s.id) ?? []}
      />

      <Modal opened={modalOpen} onClose={close} title="Créer des cohortes" radius="lg" size="md">
        <Stack gap="md">
          <Select
            label="Année académique"
            placeholder="Choisir une année"
            data={yearOptions}
            value={selectedYear}
            onChange={(v) => { setYearOverride(v); setCheckedGroupIds([]); }}
            required
          />

          {selectedYear && (
            <>
              <Divider
                label={
                  <Group gap="xs">
                    <Text size="xs" c="dimmed">Groupes</Text>
                    {loadingGroups && <Loader size={12} color="navy" />}
                  </Group>
                }
                labelPosition="left"
              />

              {!loadingGroups && availableGroups.length === 0 ? (
                <Text size="sm" c="dimmed" ta="center" py="sm">
                  {groups.length === 0
                    ? 'Aucun groupe compatible avec le niveau de ce stage pour cette année.'
                    : 'Tous les groupes de cette année ont déjà une cohorte pour ce stage.'}
                </Text>
              ) : (
                <Stack gap="xs">
                  <Group justify="flex-end" gap="xs">
                    <Button size="xs" variant="subtle" color="navy"
                      onClick={() => setCheckedGroupIds(allGroupIds)}
                      disabled={allChecked || loadingGroups}>
                      Tout cocher
                    </Button>
                    <Button size="xs" variant="subtle" color="gray"
                      onClick={() => setCheckedGroupIds([])}
                      disabled={!someChecked}>
                      Tout désélectionner
                    </Button>
                  </Group>

                  {loadingGroups
                    ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={36} radius="md" />)
                    : groups.map((g) => {
                        const alreadyUsed = usedGroupIds.has(g.id);
                        return (
                          <Checkbox
                            key={g.id}
                            label={
                              <Group gap="xs" wrap="nowrap">
                                <Text size="sm" c={alreadyUsed ? 'dimmed' : undefined}>{g.label}</Text>
                                {alreadyUsed && (
                                  <Badge size="xs" variant="light" color="gray" radius="xl">Cohorte existante</Badge>
                                )}
                              </Group>
                            }
                            checked={checkedGroupIds.includes(g.id)}
                            onChange={() => !alreadyUsed && toggleGroup(g.id)}
                            disabled={alreadyUsed}
                            radius="sm"
                          />
                        );
                      })
                  }
                </Stack>
              )}
            </>
          )}

          <Group justify="space-between" pt="sm" style={{ borderTop: '1px solid #E2E8F0' }}>
            <Text size="xs" c="dimmed">
              {someChecked
                ? `${checkedGroupIds.length} groupe${checkedGroupIds.length > 1 ? 's' : ''} sélectionné${checkedGroupIds.length > 1 ? 's' : ''}`
                : 'Aucun groupe sélectionné'}
            </Text>
            <Group gap="xs">
              <Button variant="subtle" color="gray" onClick={close}>Annuler</Button>
              <Button color="navy" loading={isCreating} disabled={!someChecked} onClick={handleCreateCohorts}>
                Créer {someChecked ? `(${checkedGroupIds.length})` : ''}
              </Button>
            </Group>
          </Group>
        </Stack>
      </Modal>

      <ConfirmModal
        opened={deleteCohortOpen}
        onClose={() => { closeDeleteCohort(); setDeleteCohortTarget(null); }}
        title="Supprimer la cohorte"
        message={`Supprimer la cohorte "${deleteCohortTarget?.label}" ? Les affectations et les périodes construites dessus partent avec elle. Refusé si la rotation a démarré.`}
        confirmLabel="Supprimer"
        onConfirm={handleDeleteCohortConfirm}
      />
      <ConfirmModal
        opened={unpublishOpen}
        onClose={closeUnpublishDialog}
        title={unpublishWarning ? 'Cette répartition est engagée' : 'Dépublier le planning'}
        message={unpublishWarning
          ?? `Dépublier le planning de "${unpublishTarget?.label}" ? Toutes les périodes de service générées seront supprimées. Les périodes hors planning (historique importé, délocalisations, rattrapages) sont conservées.`}
        confirmLabel={unpublishWarning ? 'Supprimer quand même' : 'Dépublier'}
        onConfirm={handleUnpublishRotationConfirm}
        loading={!!unpublishingCohortId}
      />
      <ConfirmModal
        opened={publishAllOpen}
        onClose={closePublishAll}
        title="Publier les plannings"
        message={`Générer les périodes de service de ${yearCohorts.filter((c) => c.slotAssignmentCount > 0 && !c.isSchedulePublished).length} cohorte(s) configurée(s) ?`}
        confirmLabel="Publier"
        confirmColor="teal"
        onConfirm={handlePublishAll}
        loading={publishingAll}
      >
        <Checkbox
          checked={publishAllOverCapacity}
          onChange={(e) => setPublishAllOverCapacity(e.currentTarget.checked)}
          label="Autoriser le dépassement d'effectif"
          /* Same wording as the grid's, and the same limit: it lifts the numbers, never a service
             that does not admit the promotion. A checkbox promising a power it lacks is worse than
             no checkbox — the admin ticks it, gets the same refusal, and blames the screen. */
          description="Publie malgré tout lorsqu'un service dépasse sa capacité totale ou le quota d'une promotion. Ne force pas un service qui n'accueille pas cette promotion."
          color="orange"
        />
      </ConfirmModal>
      <ConfirmModal
        opened={unpublishAllOpen}
        onClose={closeUnpublishAll}
        title="Dépublier tous les plannings"
        message={`Dépublier tous les plannings publiés (${yearCohorts.filter((c) => c.isSchedulePublished).length} cohorte(s)) ?`}
        confirmLabel="Dépublier tout"
        onConfirm={handleUnpublishAllConfirm}
        loading={unpublishingAll}
      />
      <ConfirmModal
        opened={resetCohortsOpen}
        onClose={closeResetCohorts}
        title="Réinitialiser les cohortes"
        message={
          yearCohorts.some((c) => c.isSchedulePublished)
            ? `Supprimer toutes les cohortes (${yearCohorts.length}) de ce stage pour ${yearLabel}, y compris les plannings publiés et les périodes de service ? Cette action est irréversible, et refusée si une rotation a démarré.`
            : `Supprimer toutes les cohortes (${yearCohorts.length}) de ce stage pour ${yearLabel} ? Cette action est irréversible.`
        }
        confirmLabel="Réinitialiser"
        onConfirm={handleResetAllCohortsConfirm}
        loading={resettingCohorts}
      />
    </Container>
  );
}
