import {
  Timeline,
  Text,
  Paper,
  Stack,
  Title,
  Badge,
  Group,
  ThemeIcon,
  Grid,
  Card,
  Divider,
  Loader,
  Box,
} from "@mantine/core";
import {
  IconCheck,
  IconFileDescription,
  IconHistory,
  IconClock,
  IconBriefcase,
  IconCircleCheck,
} from "@tabler/icons-react";
import type { StudentHistory } from "../types";
import { useGetStudentHistoryQuery } from "../api/studentApi";

// --- SOLID: Config uses the exact keys from your StudentHistory interface ---
const EVENT_MAPPING: Record<string, { color: string; icon: any }> = {
  Stage: { color: "teal", icon: IconBriefcase },
  Inscription: { color: "blue", icon: IconFileDescription },
  Demande: { color: "orange", icon: IconClock },
  ValidationStage: { color: "green", icon: IconCircleCheck },
  Default: { color: "gray", icon: IconHistory },
};

// --- MOCK DATA: Aligned with your actual interface ---
const MOCK_HISTORY: StudentHistory[] = [
  {
    id: "1",
    eventType: "Inscription",
    createdAt: "2026-01-28T10:00:00Z",
    metadata: { details: "Convention de Stage PFE" },
  },
  {
    id: "2",
    eventType: "NonValidation",
    createdAt: "2025-09-15T09:00:00Z",
    metadata: { details: "Stage d'été - OCP Group", status: "Validé" },
  },
  {
    id: "3",
    eventType: "Inscription",
    createdAt: "2025-09-05T08:30:00Z",
    metadata: { details: "Réinscription Master 2" },
  },
];

export default function HistoryPage() {
  // FIX 1: Pass 'me' or a dummy string if the endpoint requires an argument
  const { data, isLoading, isError } = useGetStudentHistoryQuery("me");

  if (isLoading)
    return (
      <Group justify="center" py="xl">
        <Loader size="xl" variant="dots" />
      </Group>
    );

  // FIX 2: Ensure type safety for the list
  const historyItems: StudentHistory[] = data?.data ?? MOCK_HISTORY;

  return (
    <Stack gap="xl">
      <Group justify="space-between" align="flex-end">
        <Box>
          <Title order={2} fw={800}>
            Parcours & Historique
          </Title>
          <Text c="dimmed" size="sm">
            Suivi chronologique de vos activités académiques
          </Text>
        </Box>
        {isError && (
          <Badge color="orange" variant="outline">
            Aperçu Local
          </Badge>
        )}
      </Group>

      <Divider />

      <Grid gutter="xl">
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper withBorder p="xl" radius="lg" shadow="xs">
            <Timeline active={0} bulletSize={34} lineWidth={2}>
              {historyItems.map((item) => {
                const config =
                  EVENT_MAPPING[item.eventType] || EVENT_MAPPING.Default;
                // Simple date formatting
                const formattedDate = new Date(
                  item.createdAt
                ).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });

                return (
                  <Timeline.Item
                    key={item.id}
                    bullet={
                      <ThemeIcon color={config.color} radius="xl" size={28}>
                        <config.icon size={16} />
                      </ThemeIcon>
                    }
                    title={
                      <Group justify="space-between" wrap="nowrap">
                        <Text fw={700}>{item.eventType}</Text>
                        <Text size="xs" c="dimmed">
                          {formattedDate}
                        </Text>
                      </Group>
                    }
                  >
                    <Text size="sm" fw={500} mt={4}>
                      {item.metadata?.details || "Aucun détail supplémentaire"}
                    </Text>
                    {item.metadata?.status && (
                      <Badge
                        color={config.color}
                        variant="light"
                        size="xs"
                        mt={4}
                      >
                        {item.metadata.status}
                      </Badge>
                    )}
                  </Timeline.Item>
                );
              })}
            </Timeline>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <Stack gap="md">
            <Card withBorder radius="lg" p="lg">
              <Text fw={700} mb="xs">
                Statistiques
              </Text>
              <Stack gap="xs">
                <SummaryRow
                  label="Événements"
                  value={historyItems.length.toString()}
                  color="blue"
                />
                <SummaryRow
                  label="Dernière activité"
                  value="Aujourd'hui"
                  color="orange"
                />
              </Stack>
            </Card>
          </Stack>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}

function SummaryRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <Group justify="space-between">
      <Text size="sm" c="dimmed">
        {label}
      </Text>
      <Badge color={color} variant="filled" radius="sm">
        {value}
      </Badge>
    </Group>
  );
}
