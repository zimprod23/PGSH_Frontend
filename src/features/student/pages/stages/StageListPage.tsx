import {
  Badge,
  Button,
  Card,
  Center,
  Container,
  Group,
  rem,
  SimpleGrid,
  Skeleton,
  Stack,
  Tabs,
  Text,
  ThemeIcon,
} from '@mantine/core';
import {
  IconStethoscope,
  IconClock,
  IconStar,
  IconBuildingHospital,
} from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetCurrentStudentQuery, useGetStagesQuery } from '../../api/studentApi';
import type { StageSummaryResponse } from '../../types/stage.types';
import { PATHS } from '../../../../routes/paths';

// ─── Stage card ───────────────────────────────────────────────────────────────

function StageCard({ stage }: { stage: StageSummaryResponse }) {
  const navigate = useNavigate();
  const weeks = Math.round(stage.durationInDays / 7);

  return (
    <Card padding="lg" radius="lg" withBorder shadow="sm">
      <Stack gap="sm">
        {/* Header row */}
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
            <ThemeIcon variant="light" color="navy" size={32} radius="md" style={{ flexShrink: 0 }}>
              <IconStethoscope size={16} stroke={1.5} />
            </ThemeIcon>
            <Text fw={600} size="sm" lineClamp={2} style={{ minWidth: 0 }}>
              {stage.name}
            </Text>
          </Group>
          <Badge variant="light" color="sky" radius="xl" size="sm" style={{ flexShrink: 0 }}>
            Planifié
          </Badge>
        </Group>

        {/* Level label */}
        {stage.levelLabel && (
          <Text size="xs" c="dimmed" lineClamp={1}>
            {stage.levelLabel}
          </Text>
        )}

        {/* Meta row */}
        <Group gap="lg">
          <Group gap={4}>
            <IconClock size={13} stroke={1.5} color="#94A3B8" />
            <Text size="xs" c="dimmed">{weeks} sem.</Text>
          </Group>
          <Group gap={4}>
            <IconStar size={13} stroke={1.5} color="#94A3B8" />
            <Text size="xs" c="dimmed">Coeff. {stage.coefficient}</Text>
          </Group>
        </Group>

        {/* Hospital placeholder */}
        <Group gap="xs">
          <IconBuildingHospital size={13} stroke={1.5} color="#94A3B8" />
          <Text size="xs" c="dimmed">
            Affectation à confirmer par la scolarité
          </Text>
        </Group>

        {/* Actions */}
        <Group gap="xs" mt={4}>
          <Button
            variant="outline"
            color="navy"
            size="xs"
            radius="md"
            style={{ flex: 1 }}
            onClick={() => navigate(`${PATHS.STUDENT.ROOT}/${PATHS.STUDENT.STAGES}/${stage.id}`)}
          >
            Détails
          </Button>
          <Button
            variant="filled"
            color="navy"
            size="xs"
            radius="md"
            style={{ flex: 1 }}
            disabled
          >
            Évaluation
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}

function StageCardSkeleton() {
  return (
    <Card padding="lg" radius="lg" withBorder shadow="sm">
      <Stack gap="sm">
        <Group justify="space-between">
          <Skeleton height={32} width={32} radius="md" />
          <Skeleton height={20} width={70} radius="xl" />
        </Group>
        <Skeleton height={16} width="80%" />
        <Skeleton height={12} width="50%" />
        <Group gap="lg">
          <Skeleton height={12} width={60} />
          <Skeleton height={12} width={60} />
        </Group>
        <Group gap="xs">
          <Skeleton height={30} radius="md" style={{ flex: 1 }} />
          <Skeleton height={30} radius="md" style={{ flex: 1 }} />
        </Group>
      </Stack>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Filter = 'all' | 'planned' | 'ongoing' | 'completed';

export default function StageListPage() {
  const [filter, setFilter] = useState<Filter>('all');

  const { data: student } = useGetCurrentStudentQuery();
  const levelId = student?.currentRegistration?.level.id;

  const { data: stagesPage, isLoading } = useGetStagesQuery(
    { levelId, pageSize: 50 },
    { skip: !levelId },
  );

  const stages = stagesPage?.items ?? [];

  // Curriculum stages fetched from /stages are all "Planifié" by definition —
  // "En cours" / "Terminés" will be populated once InternshipAssignment endpoints exist.
  const counts: Record<Filter, number> = {
    all:       stages.length,
    planned:   stages.length,
    ongoing:   0,
    completed: 0,
  };

  const displayed =
    filter === 'all' || filter === 'planned'
      ? stages
      : []; // ongoing / completed require InternshipAssignment data (Phase 5)

  return (
    <Container fluid>
      <Stack gap="xl">
        {/* Header */}
        <Stack gap={4}>
          <Text fw={700} size="xl">Mes Stages</Text>
          <Text size="sm" c="dimmed">
            Suivez vos stages passés, en cours et à venir.
          </Text>
        </Stack>

        {/* Filter tabs */}
        <Tabs
          value={filter}
          onChange={(v) => v && setFilter(v as Filter)}
          variant="pills"
        >
          <Tabs.List>
            <Tabs.Tab value="all">
              <Group gap={6}>
                <span>Tous</span>
                {!isLoading && <Badge size="xs" variant="light" color="navy" radius="xl">{counts.all}</Badge>}
              </Group>
            </Tabs.Tab>
            <Tabs.Tab value="ongoing">
              <Group gap={6}>
                <span>En cours</span>
                <Badge size="xs" variant="light" color="sky" radius="xl">{counts.ongoing}</Badge>
              </Group>
            </Tabs.Tab>
            <Tabs.Tab value="completed">
              <Group gap={6}>
                <span>Terminés</span>
                <Badge size="xs" variant="light" color="success" radius="xl">{counts.completed}</Badge>
              </Group>
            </Tabs.Tab>
            <Tabs.Tab value="planned">
              <Group gap={6}>
                <span>Planifiés</span>
                <Badge size="xs" variant="light" color="warning" radius="xl">{counts.planned}</Badge>
              </Group>
            </Tabs.Tab>
          </Tabs.List>
        </Tabs>

        {/* Stage grid */}
        {isLoading ? (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
            {Array.from({ length: 6 }).map((_, i) => (
              <StageCardSkeleton key={i} />
            ))}
          </SimpleGrid>
        ) : displayed.length === 0 ? (
          <Center py={80}>
            <Stack align="center" gap="md" maw={360}>
              <ThemeIcon size={64} radius="xl" variant="light" color="navy">
                <IconStethoscope style={{ width: rem(30), height: rem(30) }} stroke={1.5} />
              </ThemeIcon>
              <Stack align="center" gap={4}>
                <Text fw={600} ta="center">
                  {!levelId
                    ? 'Aucune inscription active'
                    : filter === 'ongoing'
                    ? 'Aucun stage en cours'
                    : filter === 'completed'
                    ? 'Aucun stage terminé'
                    : 'Aucun stage disponible'}
                </Text>
                <Text size="sm" c="dimmed" ta="center">
                  {!levelId
                    ? "Vos stages apparaîtront une fois votre inscription pour l'année en cours confirmée."
                    : filter === 'ongoing' || filter === 'completed'
                    ? "Ces données seront disponibles une fois vos affectations de stage confirmées."
                    : "Les stages de votre programme apparaîtront ici une fois votre niveau configuré."}
                </Text>
              </Stack>
            </Stack>
          </Center>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
            {displayed.map((stage) => (
              <StageCard key={stage.id} stage={stage} />
            ))}
          </SimpleGrid>
        )}
      </Stack>
    </Container>
  );
}
