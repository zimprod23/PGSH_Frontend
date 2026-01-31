import {
  Modal,
  Text,
  Progress,
  Group,
  Stack,
  Badge,
  Divider,
  ScrollArea,
  Box,
  ThemeIcon,
  Center,
  Paper,
} from "@mantine/core";
import {
  IconTargetArrow,
  IconAward,
  IconCheck,
  IconStethoscope,
  IconListCheck,
} from "@tabler/icons-react";
import type { StudentStage } from "../types";

interface EvaluationModalProps {
  opened: boolean;
  onClose: () => void;
  stage: StudentStage | null;
}

export function EvaluationModal({
  opened,
  onClose,
  stage,
}: EvaluationModalProps) {
  if (!stage) return null;

  const hasRotations = !!(stage.rotations && stage.rotations.length > 0);

  // Helper to calculate total progress for the header
  const allObjectives = hasRotations
    ? stage.rotations!.flatMap((r) => r.objectives)
    : stage.objectives || [];

  const totalScore = allObjectives.reduce((sum, obj) => sum + obj.score, 0);
  const maxPossible = allObjectives.reduce((sum, obj) => sum + obj.maxScore, 0);
  const percentage = maxPossible > 0 ? (totalScore / maxPossible) * 100 : 0;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <ThemeIcon color="blue" variant="light" radius="xl">
            <IconTargetArrow size={18} />
          </ThemeIcon>
          <Box>
            <Text fw={800} size="md" style={{ lineHeight: 1.2 }}>
              Objectifs de Stage
            </Text>
            <Text size="xs" c="dimmed">
              {stage.title}
            </Text>
          </Box>
        </Group>
      }
      size="lg"
      radius="md"
    >
      <Stack gap="md">
        {/* Global Progress Header */}
        <Paper
          p="md"
          radius="md"
          bg="blue.0"
          withBorder
          style={{ borderColor: "var(--mantine-color-blue-2)" }}
        >
          <Group justify="space-between" mb="xs">
            <Text size="sm" fw={700} c="blue.9">
              Validation Totale
            </Text>
            <Badge variant="filled" color="blue">
              {totalScore} / {maxPossible}
            </Badge>
          </Group>
          <Progress
            value={percentage}
            color="blue"
            size="xl"
            radius="xl"
            striped
            animated
          />
        </Paper>

        <ScrollArea.Autosize mah={500} type="hover" pr="md">
          <Stack gap="xl">
            {hasRotations ? (
              // Case 1: Display Grouped by Rotation
              stage.rotations?.map((rotation) => (
                <Box key={rotation.id}>
                  <Group mb="xs" gap="xs">
                    <IconStethoscope
                      size={16}
                      color="var(--mantine-color-blue-6)"
                    />
                    <Text
                      fw={800}
                      size="sm"
                      c="blue.7"
                      style={{
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      Rotation: {rotation.serviceName}
                    </Text>
                    <Divider style={{ flex: 1 }} />
                  </Group>

                  <Stack gap="xs">
                    {rotation.objectives.map((obj) => (
                      <ObjectiveItem key={obj.id} objective={obj} />
                    ))}
                  </Stack>
                </Box>
              ))
            ) : (
              // Case 2: Standard Display (No Rotations)
              <Box>
                <Group mb="xs" gap="xs">
                  <IconListCheck
                    size={16}
                    color="var(--mantine-color-gray-6)"
                  />
                  <Text fw={800} size="sm" c="dimmed">
                    OBJECTIFS GÉNÉRAUX
                  </Text>
                  <Divider style={{ flex: 1 }} />
                </Group>
                <Stack gap="xs">
                  {stage.objectives?.map((obj) => (
                    <ObjectiveItem key={obj.id} objective={obj} />
                  ))}
                </Stack>
              </Box>
            )}

            {(hasRotations
              ? stage.rotations?.length === 0
              : stage.objectives?.length === 0) && (
              <Center py="xl">
                <Text c="dimmed" size="sm">
                  Aucun objectif listé pour ce stage.
                </Text>
              </Center>
            )}
          </Stack>
        </ScrollArea.Autosize>
      </Stack>
    </Modal>
  );
}

// Sub-component for individual objective rows to keep code clean & performant
function ObjectiveItem({ objective }: { objective: any }) {
  const isPerfect = objective.score === objective.maxScore;

  return (
    <Paper
      withBorder
      p="sm"
      radius="md"
      bg="white"
      style={{ transition: "border-color 0.2s" }}
    >
      <Group justify="space-between" wrap="nowrap">
        <Box style={{ flex: 1 }}>
          <Text fw={700} size="sm">
            {objective.label}
          </Text>
          <Badge size="xs" variant="light" color="gray" mt={4}>
            {objective.category}
          </Badge>
        </Box>
        <Group gap="xs" wrap="nowrap">
          <Box ta="right">
            <Text fw={800} size="md" c={objective.score > 0 ? "blue" : "gray"}>
              {objective.score}/{objective.maxScore}
            </Text>
          </Box>
          {isPerfect ? (
            <IconAward size={20} color="var(--mantine-color-orange-5)" />
          ) : (
            <IconCheck
              size={20}
              color={
                objective.score > 0
                  ? "var(--mantine-color-teal-6)"
                  : "var(--mantine-color-gray-3)"
              }
            />
          )}
        </Group>
      </Group>
    </Paper>
  );
}
