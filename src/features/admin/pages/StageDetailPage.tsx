import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Checkbox,
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
  IconArrowLeft,
  IconCalendar,
  IconCalendarTime,
  IconCircleCheck,
  IconPlayerPlay,
  IconRocket,
  IconRocketOff,
  IconStethoscope,
  IconTrash,
  IconUsersGroup,
  IconPlus,
  IconUserPlus,
} from '@tabler/icons-react';
import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useGetStageByIdQuery,
  useGetCohortsByStageQuery,
  useCreateCohortMutation,
  useDeleteCohortMutation,
  useAssignStudentsToCohortMutation,
  useAssignAllStudentsByStageMutation,
  useStartCohortAssignmentsMutation,
  usePublishScheduleMutation,
  useUnpublishScheduleMutation,
  useGetAcademicYearsQuery,
  useGetAcademicGroupsQuery,
} from '../api/adminApi';
import { ScheduleGridModal } from '../components/ScheduleGridModal';
import { useNotify } from '../../../common/hooks/useNotify';
import { PATHS } from '../../../routes/paths';

export default function StageDetailPage() {
  const { id } = useParams<{ id: string }>();
  const stageId = Number(id);
  const navigate = useNavigate();
  const notify = useNotify();

  const { data: stage, isLoading: stageLoading } = useGetStageByIdQuery(stageId);
  const { data: cohorts = [], isLoading: cohortsLoading } = useGetCohortsByStageQuery(stageId);

  const [createCohort]  = useCreateCohortMutation();
  const [deleteCohort]  = useDeleteCohortMutation();
  const [assignStudents] = useAssignStudentsToCohortMutation();
  const [assignAll, { isLoading: assigningAll }] = useAssignAllStudentsByStageMutation();
  const [startAssignments]   = useStartCohortAssignmentsMutation();
  const [publishSchedule]    = usePublishScheduleMutation();
  const [unpublishSchedule]  = useUnpublishScheduleMutation();

  const [assigningCohortId,   setAssigningCohortId]   = useState<number | null>(null);
  const [publishingCohortId,  setPublishingCohortId]  = useState<number | null>(null);
  const [unpublishingCohortId, setUnpublishingCohortId] = useState<number | null>(null);
  const [startingCohortId,    setStartingCohortId]    = useState<number | null>(null);
  const [publishingAll,       setPublishingAll]       = useState(false);
  const [unpublishingAll,     setUnpublishingAll]     = useState(false);

  // Academic-year filter for the cohort list
  const [filterYearId, setFilterYearId] = useState<number | null>(null);

  const uniqueYears = useMemo(() => {
    const seen = new Map<number, string>();
    for (const c of cohorts) seen.set(c.academicYearId, c.academicYearLabel);
    return [...seen.entries()].map(([value, label]) => ({ value, label }));
  }, [cohorts]);

  const filteredCohorts = useMemo(
    () => (filterYearId ? cohorts.filter((c) => c.academicYearId === filterYearId) : cohorts),
    [cohorts, filterYearId]
  );

  const extractErrorCode = (err: unknown): string | null => {
    const data = (err as { data?: { extensions?: { errors?: Array<{ code: string }> } } })?.data;
    return data?.extensions?.errors?.[0]?.code ?? null;
  };

  const [rotationOpen, { open: openRotation, close: closeRotation }] = useDisclosure(false);
  const [modalOpen, { open, close }] = useDisclosure(false);
  const [selectedYear,    setSelectedYear]    = useState<string | null>(null);
  const [checkedGroupIds, setCheckedGroupIds] = useState<number[]>([]);
  const [isCreating,      setIsCreating]      = useState(false);

  const { data: years = [] } = useGetAcademicYearsQuery();
  const { data: groups = [], isFetching: loadingGroups } = useGetAcademicGroupsQuery(
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
      setSelectedYear(null);
      setCheckedGroupIds([]);
      close();
    } else {
      notify.warning(`${success} créée(s), ${fail} échouée(s)`);
    }
  };

  const handleAssignAll = async () => {
    try {
      const res = await assignAll(stageId).unwrap();
      if (res.successCount === 0) notify.info('Tous les étudiants sont déjà affectés.');
      else notify.success(`${res.successCount} étudiant(s) affecté(s) à toutes les cohortes`);
    } catch { notify.error('Erreur lors de l\'affectation globale'); }
  };

  const handleAssignStudents = async (cohortId: number, label: string) => {
    setAssigningCohortId(cohortId);
    try {
      const res = await assignStudents(cohortId).unwrap();
      if (res.successCount === 0) notify.info(`Tous les étudiants de "${label}" sont déjà affectés.`);
      else notify.success(`${res.successCount} étudiant(s) affecté(s) à "${label}"`);
    } catch { notify.error('Impossible d\'affecter les étudiants'); }
    finally { setAssigningCohortId(null); }
  };

  const handleDeleteCohort = async (cohortId: number, label: string) => {
    if (!window.confirm(`Supprimer la cohorte "${label}" ?`)) return;
    try { await deleteCohort({ cohortId, stageId }).unwrap(); notify.success('Cohorte supprimée'); }
    catch { notify.error('Impossible de supprimer cette cohorte'); }
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

  const handleUnpublishRotation = async (cohortId: number, label: string) => {
    if (!window.confirm(`Dépublier le planning de "${label}" ? Toutes les périodes de service générées seront supprimées.`)) return;
    setUnpublishingCohortId(cohortId);
    try {
      const res = await unpublishSchedule({ cohortId, stageId }).unwrap();
      notify.success(`${res.removed} période(s) supprimée(s) pour "${label}"`);
    } catch {
      notify.error('Impossible de dépublier ce planning');
    } finally { setUnpublishingCohortId(null); }
  };

  const handlePublishAll = async () => {
    const targets = cohorts.filter((c) => c.slotAssignmentCount > 0 && !c.isSchedulePublished);
    if (targets.length === 0) { notify.info('Toutes les cohortes configurées sont déjà publiées'); return; }
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

  const handleUnpublishAll = async () => {
    const targets = cohorts.filter((c) => c.isSchedulePublished);
    if (targets.length === 0) return;
    if (!window.confirm(`Dépublier tous les plannings publiés (${targets.length} cohorte(s)) ?`)) return;
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
      const res = await startAssignments(cohortId).unwrap();
      notify.success(`${res.started} affectation(s) démarrée(s) pour "${label}"`);
    } catch { notify.error('Impossible de démarrer les affectations — vérifiez que le plan est publié'); }
    finally { setStartingCohortId(null); }
  };

  const hasUnpublishedPlans = cohorts.some((c) => c.slotAssignmentCount > 0 && !c.isSchedulePublished);
  const hasPublishedRotations = cohorts.some((c) => c.isSchedulePublished);

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
                    <Badge variant="light" color="navy" radius="xl" size="sm">{cohorts.length}</Badge>
                  )}
                </Group>
                <Group gap="xs" wrap="wrap">
                  {cohorts.length > 0 && (
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
                            onClick={handleUnpublishAll}
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
                </Group>
              </Group>

              {/* Year filter */}
              {uniqueYears.length > 1 && (
                <Select
                  placeholder="Toutes les années"
                  data={uniqueYears.map((y) => ({ value: String(y.value), label: y.label }))}
                  value={filterYearId ? String(filterYearId) : null}
                  onChange={(v) => setFilterYearId(v ? Number(v) : null)}
                  clearable
                  radius="md"
                  size="xs"
                />
              )}

              <Divider />

              {cohortsLoading ? (
                <Stack gap="xs">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={68} radius="md" />)}</Stack>
              ) : filteredCohorts.length === 0 ? (
                <Stack align="center" py="xl" gap="xs">
                  <IconUsersGroup size={32} stroke={1.5} color="#94A3B8" />
                  <Text c="dimmed" size="sm">
                    {cohorts.length === 0 ? 'Aucune cohorte pour ce stage' : 'Aucune cohorte pour cette année'}
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
                              onClick={() => handleUnpublishRotation(cohort.id, cohort.label)}
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
                            onClick={() => handleDeleteCohort(cohort.id, cohort.label)}
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
      />

      <Modal opened={modalOpen} onClose={close} title="Créer des cohortes" radius="lg" size="md">
        <Stack gap="md">
          <Select
            label="Année académique"
            placeholder="Choisir une année"
            data={yearOptions}
            value={selectedYear}
            onChange={(v) => { setSelectedYear(v); setCheckedGroupIds([]); }}
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
    </Container>
  );
}
