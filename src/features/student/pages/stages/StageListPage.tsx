import {
  Stack,
  Title,
  Box,
  Card,
  Group,
  Text,
  ThemeIcon,
  Progress,
  Divider,
  Grid,
  Button,
  ActionIcon,
  Tooltip,
  Menu,
  rem,
  Badge,
  Paper,
  SimpleGrid,
  ScrollArea,
  Center,
} from "@mantine/core";
import {
  IconSchool,
  IconChevronRight,
  IconClipboardCheck,
  IconStethoscope,
  IconCalendarTime,
  IconCircleCheckFilled,
  IconTargetArrow,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import type { StudentStage } from "../../types";
import { useStageEvaluation } from "../../hooks/useStageEvaluation";
import { EvaluationModal } from "../../components/EvaluationModal";

// --- MOCK DATA ---
export const MOCK_STAGES: StudentStage[] = [
  {
    id: "stage-1",
    title: "Immersion Clinique I",
    academicYear: "2023-2024",
    status: "COMPLETED",
    startDate: "01/09/2023",
    endDate: "30/10/2023",
    objectives: [
      {
        id: "o1",
        label: "Hygiène et asepsie",
        score: 5,
        maxScore: 5,
        category: "SKILL",
      },
      {
        id: "o2",
        label: "Communication avec le patient",
        score: 4,
        maxScore: 5,
        category: "ATTITUDE",
      },
    ],
    validatedBy: "Dr. Lamine",
  },
  {
    id: "stage-2",
    title: "Secourisme & Soins Infirmiers",
    academicYear: "2023-2024",
    status: "COMPLETED",
    startDate: "15/01/2024",
    endDate: "15/02/2024",
    objectives: [
      {
        id: "o3",
        label: "Gestes d'urgence",
        score: 5,
        maxScore: 5,
        category: "SKILL",
      },
    ],
  },
  {
    id: "stage-4",
    title: "Sémiologie Chirurgicale",
    academicYear: "2024-2025",
    status: "IN_PROGRESS",
    startDate: "01/01/2026",
    endDate: "01/03/2026",
    objectives: [],
    rotations: [
      {
        id: "rot-urology",
        title: "Rotation Urologie",
        serviceName: "Urologie",
        period: "Janvier",
        status: "COMPLETED",
        objectives: [
          {
            id: "u1",
            label: "Sondage vésical",
            score: 4,
            maxScore: 5,
            category: "SKILL",
          },
        ],
        validatedBy: "Pr. Bensalah",
      },
      {
        id: "rot-ortho",
        title: "Rotation Orthopédie",
        serviceName: "Orthopédie",
        period: "Février",
        status: "IN_PROGRESS",
        objectives: [
          {
            id: "or1",
            label: "Examen locomoteur",
            score: 0,
            maxScore: 5,
            category: "SKILL",
          },
        ],
      },
    ],
  },
];

export default function StageListPage() {
  const { opened, selectedStage, handleOpenEvaluation, handleClose } =
    useStageEvaluation();

  const stagesByYear = MOCK_STAGES.reduce(
    (acc, stage) => {
      const year = stage.academicYear;
      if (!acc[year]) acc[year] = [];
      acc[year].push(stage);
      return acc;
    },
    {} as Record<string, StudentStage[]>,
  );

  const sortedYears = Object.keys(stagesByYear).sort((a, b) =>
    b.localeCompare(a),
  );

  return (
    <Stack gap="xl" p="md">
      {/* Dynamic Progress Header */}
      <Paper
        withBorder
        radius="lg"
        p="xl"
        shadow="sm"
        style={{
          background: "linear-gradient(135deg, #f8f9fa 0%, #e7f5ff 100%)",
          borderLeft: "6px solid #228be6",
        }}
      >
        <Group justify="space-between">
          <Box>
            <Title order={2} fw={900}>
              Mon Cursus Clinique
            </Title>
            <Text size="sm" c="dimmed" fw={500}>
              Tableau de bord de validation des stages
            </Text>
          </Box>
          <ThemeIcon
            size={54}
            radius="md"
            variant="gradient"
            gradient={{ from: "blue", to: "cyan" }}
          >
            <IconSchool size={30} />
          </ThemeIcon>
        </Group>

        <Grid mt="xl" align="center">
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Group justify="space-between" mb={8}>
              <Text size="xs" fw={800} c="blue">
                PROGRESSION GLOBALE
              </Text>
              <Text size="xs" fw={800} c="blue">
                66%
              </Text>
            </Group>
            <Progress value={66} size="xl" radius="xl" animated color="blue" />
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Group justify="flex-end">
              <Box ta="right">
                <Text size="xl" fw={900}>
                  02/03
                </Text>
                <Text size="xs" c="dimmed" fw={700}>
                  STAGES VALIDÉS
                </Text>
              </Box>
            </Group>
          </Grid.Col>
        </Grid>
      </Paper>

      {sortedYears.map((year) => (
        <YearSection
          key={year}
          year={year}
          stages={stagesByYear[year]}
          onOpenEval={handleOpenEvaluation}
        />
      ))}

      <EvaluationModal
        opened={opened}
        stage={selectedStage}
        onClose={handleClose}
      />
    </Stack>
  );
}

// --- SUB-COMPONENTS ---

interface YearSectionProps {
  year: string;
  stages: StudentStage[];
  onOpenEval: (s: StudentStage) => void;
}

function YearSection({ year, stages, onOpenEval }: YearSectionProps) {
  return (
    <Box mb="xl">
      <Divider
        mb="lg"
        label={
          <Badge size="lg" color="blue" variant="filled" radius="sm" px="xl">
            {year}
          </Badge>
        }
        labelPosition="left"
      />
      <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="lg">
        {stages.map((stage: StudentStage) => (
          <StageCard key={stage.id} stage={stage} onOpenEval={onOpenEval} />
        ))}
      </SimpleGrid>
    </Box>
  );
}

function StageCard({
  stage,
  onOpenEval,
}: {
  stage: StudentStage;
  onOpenEval: (s: StudentStage) => void;
}) {
  const navigate = useNavigate();
  const isInProgress = stage.status === "IN_PROGRESS";
  const hasRotations = !!(stage.rotations && stage.rotations.length > 0);

  return (
    <Card
      withBorder
      padding="lg"
      radius="md"
      shadow="xs"
      style={{
        display: "flex",
        flexDirection: "column",
        transition: "all 0.2s ease",
        borderBottom: isInProgress ? "3px solid #228be6" : "3px solid #40c057",
      }}
    >
      <Group justify="space-between" mb="md">
        <Badge
          color={isInProgress ? "blue" : "green"}
          variant="light"
          size="sm"
        >
          {isInProgress ? "En cours" : "Validé"}
        </Badge>
        <Group gap={4}>
          <IconCalendarTime size={14} color="gray" />
          <Text size="xs" c="dimmed" fw={600}>
            {stage.startDate}
          </Text>
        </Group>
      </Group>

      <Box h={65}>
        <Text fw={800} size="md" lineClamp={2} style={{ lineHeight: 1.3 }}>
          {stage.title}
        </Text>
        {hasRotations && (
          <Badge size="xs" variant="outline" mt={6} color="blue">
            {stage.rotations?.length} Services
          </Badge>
        )}
      </Box>

      <Group grow mt="xl" gap="xs">
        {hasRotations ? (
          <Menu shadow="md" width={220} radius="md" position="bottom-start">
            <Menu.Target>
              <Button
                variant="light"
                color="blue"
                fullWidth
                rightSection={<IconChevronRight size={14} />}
              >
                Détails
              </Button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Services de rotation</Menu.Label>
              {stage.rotations?.map((r) => (
                <Menu.Item
                  key={r.id}
                  leftSection={<IconStethoscope size={16} />}
                  onClick={() => navigate(`${stage.id}/rotation/${r.id}`)}
                >
                  <Group justify="space-between">
                    <Text size="sm">{r.serviceName}</Text>
                    {r.status === "COMPLETED" && (
                      <IconCircleCheckFilled size={14} color="teal" />
                    )}
                  </Group>
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        ) : (
          <Button
            variant="light"
            color="blue"
            onClick={() => navigate(stage.id)}
          >
            Détails
          </Button>
        )}

        <Tooltip label="Compétences">
          <ActionIcon
            size="lg"
            variant="filled"
            color="blue"
            onClick={() => onOpenEval(stage)}
          >
            <IconClipboardCheck size={20} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Card>
  );
}
