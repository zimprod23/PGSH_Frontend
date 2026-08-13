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
  IconBuildingHospital,
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
  useUnpublishScheduleMutation,
  useGetAcademicYearsQuery,
  useGetAcademicGroupOptionsQuery,
  useGetServicesQuery,
  useAddAllowedServiceMutation,
  useRemoveAllowedServiceMutation,
  useDeleteAllStageCohortsMutation,
} from '../api/adminApi';
import { ScheduleGridModal } from '../components/ScheduleGridModal';
import type { AllowedServiceSummary } from '../types/admin.types';
import { useNotify } from '../../../common/hooks/useNotify';
import { ConfirmModal } from '../../../common/components/ConfirmModal';
import { PATHS } from '../../../routes/paths';
import { useAcademicYear } from '../contexts/AcademicYearContext';

export default function StageDetailPage() {
  const { id } = useParams<{ id: string }>();
  const stageId = Number(id);
  const navigate = useNavigate();
  const notify = useNotify();

  // The academic year comes from the single global navbar selector — no page-local year dropdown.
  const { currentYearId } = useAcademicYear();

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
  const [unpublishSchedule]  = useUnpublishScheduleMutation();
  const [deleteAllCohorts, { isLoading: resettingCohorts }] = useDeleteAllStageCohortsMutation();

  const [assigningCohortId,   setAssigningCohortId]   = useState<number | null>(null);
  const [publishingCohortId,  setPublishingCohortId]  = useState<number | null>(null);
  const [unpublishingCohortId, setUnpublishingCohortId] = useState<number | null>(null);
  const [startingCohortId,    setStartingCohortId]    = useState<number | null>(null);
  const [publishingAll,       setPublishingAll]       = useState(false);
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
  const [unpublishOpen,       { open: openUnpublish,       close: closeUnpublish       }] = useDisclosure(false);
  const [unpublishAllOpen,    { open: openUnpublishAll,    close: closeUnpublishAll    }] = useDisclosure(false);
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
    try { await deleteCohort({ cohortId: deleteCohortTarget.id, stageId }).unwrap(); notify.success('Cohorte supprimée'); }
    catch { notify.error('Impossible de supprimer cette cohorte'); }
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

  const handleUnpublishRotationConfirm = async () => {
    if (!unpublishTarget) return;
    const { id: cohortId, label } = unpublishTarget;
    setUnpublishingCohortId(cohortId);
    try {
      const res = await unpublishSchedule({ cohortId, stageId }).unwrap();
      notify.success(`${res.removed} période(s) supprimée(s) pour "${label}"`);
    } catch {
      notify.error('Impossible de dépublier ce planning');
    } finally { setUnpublishingCohortId(null); }
    closeUnpublish();
    setUnpublishTarget(null);
  };

  const handlePublishAll = async () => {
    const targets = yearCohorts.filter((c) => c.slotAssignmentCount > 0 && !c.isSchedulePublished);
    if (targets.length === 0) { notify.info('Aucune cohorte avec un plan configuré non publié'); return; }
    setPublishingAll(true);
    let success = 0, failed = 0;
    for (const cohort of targets) {
      try { await publishSchedule({ cohortId: cohort.id, stageId }).unwrap(); success++; }
      catch { failed++; }
    }
    setPublishingAll(false);
    if (failed > 0) notify.error(`${failed} cohorte(s) en erreur lors de la publication`);
    else notify.success(`${success} planning(s) publié(s)`);
  };

  const handleUnpublishAllConfirm = async () => {
    const targets = yearCohorts.filter((c) => c.isSchedulePublished);
    closeUnpublishAll();
    setUnpublishingAll(true);
    let removed = 0, failed = 0;
    for (const cohort of targets) {
      try {
        const res = await unpublishSchedule({ cohortId: cohort.id, stageId }).unwrap();
        removed += res.removed;
      } catch { failed++; }
    }
    setUnpublishingAll(false);
    if (failed > 0) notify.error(`${failed} cohorte(s) en erreur lors de la dépublication`);
    else notify.success(`${removed} période(s) supprimée(s) sur ${targets.length} cohorte(s)`);
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
      notify.success(`${res.deleted} cohorte${res.deleted !== 1 ? 's' : ''} supprimée${res.deleted !== 1 ? 's' : ''}`);
    } catch {
      notify.error('Impossible de réinitialiser les cohortes — des affectations sont déjà en cours');
    }
  };

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
                        {stage?.allowedServices.map((svc) => (
                          <Group key={svc.id} gap="sm" justify="space-between" wrap="nowrap">
                            <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
                              <ThemeIcon size={24} radius="sm" variant="light" color="teal">
                                <IconBuildingHospital size={13} stroke={1.5} />
                              </ThemeIcon>
                              <Stack gap={0} style={{ minWidth: 0 }}>
                                <Text size="xs" fw={500} truncate>{svc.name}</Text>
                                <Text size="xs" c="dimmed" truncate>{svc.hospitalName}</Text>
                              </Stack>
                            </Group>
                            <ActionIcon
                              size="xs" variant="subtle" color="red" radius="sm"
                              loading={removingService}
                              onClick={() => handleRemoveService(svc.id)}
                            >
                              <IconX size={12} stroke={1.5} />
                            </ActionIcon>
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
                        if (svc) handleAddService({ id: svc.id, name: svc.name, hospitalName: svc.hospitalName });
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
                            onClick={handlePublishAll}
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
        message={`Supprimer la cohorte "${deleteCohortTarget?.label}" ?`}
        confirmLabel="Supprimer"
        onConfirm={handleDeleteCohortConfirm}
      />
      <ConfirmModal
        opened={unpublishOpen}
        onClose={() => { closeUnpublish(); setUnpublishTarget(null); }}
        title="Dépublier le planning"
        message={`Dépublier le planning de "${unpublishTarget?.label}" ? Toutes les périodes de service générées seront supprimées.`}
        confirmLabel="Dépublier"
        onConfirm={handleUnpublishRotationConfirm}
        loading={!!unpublishingCohortId}
      />
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
            ? `Supprimer toutes les cohortes (${yearCohorts.length}) de ce stage, y compris les plannings publiés et les périodes de service ? Cette action est irréversible.`
            : `Supprimer toutes les cohortes (${yearCohorts.length}) de ce stage ? Cette action est irréversible.`
        }
        confirmLabel="Réinitialiser"
        onConfirm={handleResetAllCohortsConfirm}
        loading={resettingCohorts}
      />
    </Container>
  );
}
