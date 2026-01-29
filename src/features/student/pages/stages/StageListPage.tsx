import {
  Stack,
  Title,
  Text,
  Grid,
  Card,
  Badge,
  Group,
  Progress,
  Button,
  ThemeIcon,
  Box,
  Divider,
} from "@mantine/core";
import { IconChevronRight, IconSchool } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import type { StudentStage } from "../../types";

// --- HELPERS ---
const getStatusColor = (status: StudentStage["status"]) => {
  const mapping = {
    COMPLETED: "green",
    IN_PROGRESS: "blue",
    UPCOMING: "gray",
  };
  return mapping[status];
};

// --- MOCK DATA ---
const MOCK_YEAR_1: StudentStage[] = [
  {
    id: "1",
    title: "Immersion Clinique I",
    academicYear: "2023-2024",
    status: "COMPLETED",
    startDate: "01/09/23",
    endDate: "30/10/23",
  },
  {
    id: "2",
    title: "Secourisme & Soins Infirmiers",
    academicYear: "2023-2024",
    status: "COMPLETED",
    startDate: "15/01/24",
    endDate: "15/02/24",
  },
];

const MOCK_YEAR_2: StudentStage[] = [
  {
    id: "3",
    title: "Sémiologie Médicale",
    academicYear: "2024-2025",
    status: "COMPLETED",
    startDate: "10/10/24",
    endDate: "10/12/24",
  },
  {
    id: "4",
    title: "Sémiologie Chirurgicale",
    academicYear: "2024-2025",
    status: "IN_PROGRESS",
    startDate: "01/01/26",
    endDate: "01/03/26",
  },
];

// --- MAIN COMPONENT ---
export default function StageListPage() {
  const navigate = useNavigate();

  const handleSelectStage = (id: string) => {
    // Use the path from your config
    navigate(`${id}`); // Relative navigation works best here
  };

  const totalStages = 10;
  const completedStages = 3;
  const progressPercent = (completedStages / totalStages) * 100;

  return (
    <Stack gap="xl">
      <Card withBorder radius="lg" p="xl" bg="blue.0" shadow="sm">
        <Group justify="space-between" mb="xs">
          <Box>
            <Title order={3}>Cursus Professionnel</Title>
            <Text size="sm" c="dimmed">
              Progression académique des stages cliniques
            </Text>
          </Box>
          <ThemeIcon size={44} radius="md" variant="light" color="blue">
            <IconSchool size={26} />
          </ThemeIcon>
        </Group>

        <Group justify="space-between" mb={5} mt="md">
          <Text size="xs" fw={700}>
            {completedStages} / {totalStages} Stages Validés
          </Text>
          <Text size="xs" fw={700}>
            {progressPercent}%
          </Text>
        </Group>
        <Progress
          value={progressPercent}
          size="xl"
          radius="xl"
          striped
          animated
          color="blue"
        />
      </Card>

      <Title order={2} fw={800} style={{ letterSpacing: "-0.5px" }}>
        Mes Stages
      </Title>

      <Stack gap="xl">
        <YearSection
          year="1ère Année : Immersion"
          stages={MOCK_YEAR_1}
          onSelect={(id) => handleSelectStage(id)}
        />
        <YearSection
          year="2ème Année : Sémiologie"
          stages={MOCK_YEAR_2}
          onSelect={(id) => handleSelectStage(id)}
        />
      </Stack>
    </Stack>
  );
}

// --- SUB-COMPONENT (SRP) ---
interface YearSectionProps {
  year: string;
  stages: StudentStage[];
  onSelect: (id: string) => void;
}

function YearSection({ year, stages, onSelect }: YearSectionProps) {
  return (
    <Box>
      <Divider
        label={
          <Text fw={700} c="blue">
            {year}
          </Text>
        }
        labelPosition="left"
        mb="lg"
      />
      <Grid gutter="md">
        {stages.map((stage) => (
          <Grid.Col key={stage.id} span={{ base: 12, md: 6, lg: 4 }}>
            <Card
              withBorder
              padding="lg"
              radius="md"
              shadow="xs"
              style={{ transition: "transform 0.2s" }}
            >
              <Group justify="space-between" mb="xs">
                <Badge color={getStatusColor(stage.status)} variant="light">
                  {stage.status === "IN_PROGRESS"
                    ? "En cours"
                    : stage.status === "COMPLETED"
                    ? "Validé"
                    : "À venir"}
                </Badge>
                <Text size="xs" c="dimmed">
                  {stage.startDate}
                </Text>
              </Group>

              <Text fw={700} size="md" mb="xl" style={{ height: "40px" }}>
                {stage.title}
              </Text>

              <Button
                variant="light"
                rightSection={<IconChevronRight size={14} />}
                fullWidth
                onClick={() => onSelect(stage.id)}
                radius="md"
              >
                Détails du stage
              </Button>
            </Card>
          </Grid.Col>
        ))}
      </Grid>
    </Box>
  );
}
