import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Container,
  Divider,
  Group,
  Modal,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
  rem,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconArrowLeft,
  IconCalendar,
  IconCircleCheck,
  IconStethoscope,
  IconTrash,
  IconUsersGroup,
  IconPlus,
} from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useGetStageByIdQuery,
  useGetCohortsByStageQuery,
  useCreateCohortMutation,
  useDeleteCohortMutation,
} from '../api/adminApi';
import { useNotify } from '../../../common/hooks/useNotify';
import { PATHS } from '../../../routes/paths';

export default function StageDetailPage() {
  const { id } = useParams<{ id: string }>();
  const stageId = Number(id);
  const navigate = useNavigate();
  const notify = useNotify();

  const { data: stage, isLoading: stageLoading } = useGetStageByIdQuery(stageId);
  const { data: cohorts = [], isLoading: cohortsLoading } = useGetCohortsByStageQuery(stageId);
  const [createCohort, { isLoading: creating }] = useCreateCohortMutation();
  const [deleteCohort] = useDeleteCohortMutation();

  const [modalOpen, { open, close }] = useDisclosure(false);
  const [cohortLabel, setCohortLabel] = useState('');

  const handleCreateCohort = async () => {
    if (!cohortLabel.trim()) return;
    try {
      await createCohort({ stageId, label: cohortLabel.trim() }).unwrap();
      notify.success('Cohorte créée');
      setCohortLabel('');
      close();
    } catch {
      notify.error('Impossible de créer la cohorte');
    }
  };

  const handleDeleteCohort = async (cohortId: number, label: string) => {
    if (!window.confirm(`Supprimer la cohorte "${label}" ?`)) return;
    try {
      await deleteCohort({ cohortId, stageId }).unwrap();
      notify.success('Cohorte supprimée');
    } catch {
      notify.error('Impossible de supprimer cette cohorte');
    }
  };

  return (
    <Container fluid>
      <Stack gap="xl">
        {/* ── Header ─────────────────────────────────────────────────── */}
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
          {/* ── Stage info ─────────────────────────────────────────── */}
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

            {/* ── Objectives ─────────────────────────────────────── */}
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
                          <Badge variant="light" color="navy" radius="xl" size="xs">
                            {obj.weight} pts
                          </Badge>
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

          {/* ── Cohorts ────────────────────────────────────────────── */}
          <Card padding="lg" radius="lg" withBorder shadow="sm">
            <Stack gap="md">
              <Group justify="space-between">
                <Group gap="sm">
                  <Text fw={600} size="sm" c="dimmed" tt="uppercase" style={{ letterSpacing: rem(0.8) }}>
                    Cohortes
                  </Text>
                  {!cohortsLoading && (
                    <Badge variant="light" color="navy" radius="xl" size="sm">{cohorts.length}</Badge>
                  )}
                </Group>
                <Button
                  size="xs" color="navy" radius="md" variant="light"
                  leftSection={<IconPlus size={12} stroke={1.5} />}
                  onClick={open}
                >
                  Nouvelle cohorte
                </Button>
              </Group>

              <Divider />

              {cohortsLoading ? (
                <Stack gap="xs">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={60} radius="md" />)}</Stack>
              ) : cohorts.length === 0 ? (
                <Stack align="center" py="xl" gap="xs">
                  <IconUsersGroup size={32} stroke={1.5} color="#94A3B8" />
                  <Text c="dimmed" size="sm">Aucune cohorte pour ce stage</Text>
                </Stack>
              ) : (
                cohorts.map((cohort) => (
                  <Card key={cohort.id} padding="md" radius="md" withBorder>
                    <Group justify="space-between" wrap="nowrap">
                      <Stack gap={2}>
                        <Text size="sm" fw={600}>{cohort.label}</Text>
                        <Group gap="xs">
                          <Text size="xs" c="dimmed">
                            {cohort.studentAssignmentCount} étudiant{cohort.studentAssignmentCount !== 1 ? 's' : ''}
                          </Text>
                          {cohort.rotationTemplateCount > 0 && (
                            <>
                              <Text size="xs" c="dimmed">·</Text>
                              <Text size="xs" c="dimmed">
                                {cohort.rotationTemplateCount} rotation{cohort.rotationTemplateCount !== 1 ? 's' : ''}
                              </Text>
                            </>
                          )}
                        </Group>
                      </Stack>
                      <Tooltip label="Supprimer" position="left">
                        <ActionIcon
                          variant="subtle" color="red" size="sm" radius="md"
                          onClick={() => handleDeleteCohort(cohort.id, cohort.label)}
                        >
                          <IconTrash size={rem(14)} stroke={1.5} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Card>
                ))
              )}
            </Stack>
          </Card>
        </SimpleGrid>
      </Stack>

      <Modal opened={modalOpen} onClose={close} title="Nouvelle cohorte" radius="lg" size="sm">
        <Stack gap="md">
          <TextInput
            label="Libellé"
            placeholder="ex: Cohorte 2025-A"
            value={cohortLabel}
            onChange={(e) => setCohortLabel(e.currentTarget.value)}
            radius="md"
            required
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateCohort(); }}
          />
          <Group justify="flex-end">
            <Button variant="subtle" color="gray" radius="md" onClick={close}>Annuler</Button>
            <Button
              color="navy" radius="md" loading={creating}
              disabled={!cohortLabel.trim()}
              onClick={handleCreateCohort}
            >
              Créer
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
