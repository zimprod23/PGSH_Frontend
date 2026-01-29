import {
  Tabs,
  Title,
  Group,
  Badge,
  Paper,
  Stack,
  SimpleGrid,
  RingProgress,
  Text,
  Box,
  List,
  ThemeIcon,
  Divider,
  Avatar,
  Tooltip,
  Table,
  Progress,
  Button,
  ActionIcon,
} from "@mantine/core";
import {
  IconInfoCircle,
  IconChartBar,
  IconCheck,
  IconMapPin,
  IconAlertCircle,
  IconCalendarExclamation,
  IconPlus,
  IconExternalLink,
  IconTimeline,
  IconUsers,
  IconBadge,
  IconClock,
  IconStethoscope,
} from "@tabler/icons-react";

export default function StageDetailsPage() {
  return (
    <Stack gap="lg">
      {/* Header Section */}
      <Group justify="space-between" align="flex-start">
        <Box>
          <Title order={2} fw={800} style={{ letterSpacing: "-0.5px" }}>
            Pédiatrie - CHU Agadir
          </Title>
          <Text c="dimmed" size="sm">
            3ème Année de Médecine • Semestre 1 • Année 2025-2026
          </Text>
        </Box>
        <Badge size="xl" variant="filled" color="teal" radius="sm">
          Validé
        </Badge>
      </Group>

      <Tabs defaultValue="service" variant="outline" radius="md">
        <Tabs.List>
          <Tabs.Tab value="service" leftSection={<IconInfoCircle size={16} />}>
            Service & Localisation
          </Tabs.Tab>
          <Tabs.Tab value="evaluation" leftSection={<IconChartBar size={16} />}>
            Évaluation & Absences
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="service" pt="xl">
          <ServiceAndLocationSection />
        </Tabs.Panel>

        <Tabs.Panel value="evaluation" pt="xl">
          <EvaluationAndAbsenceSection />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}

// --- 1. Combined Service & Location Section ---
function ServiceAndLocationSection() {
  const chefDeService = {
    name: "Pr. Ait Ahmed",
    role: "Chef de Service",
    specialty: "Pédiatrie Néonatale & Réanimation",
    img: "https://i.pravatar.cc/150?u=1",
  };

  const staff = [
    {
      name: "Dr. Belamine",
      role: "Encadrant",
      img: "https://i.pravatar.cc/150?u=2",
      color: "blue",
    },
    {
      name: "Dr. Sofia",
      role: "Interne P1",
      img: "https://i.pravatar.cc/150?u=3",
      color: "blue",
    },
    {
      name: "Mme. Fatimi",
      role: "Infirmière Major",
      img: "https://i.pravatar.cc/150?u=9",
      color: "teal",
    },
    {
      name: "Mr. Driss",
      role: "Infirmier",
      img: "https://i.pravatar.cc/150?u=10",
      color: "teal",
    },
  ];

  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
      {/* LEFT COLUMN: TEAM & PRESENTATION */}
      <Stack gap="lg">
        <Paper withBorder p="lg" radius="md" shadow="sm">
          <Group justify="space-between" mb="lg">
            <Group gap="sm">
              <ThemeIcon variant="light" color="blue" size="md">
                <IconUsers size={18} />
              </ThemeIcon>
              <Title order={4}>Équipe Médicale</Title>
            </Group>
            <Badge variant="dot">8 Membres</Badge>
          </Group>

          {/* Chef de Service Highlight */}
          <Paper
            withBorder
            p="md"
            radius="md"
            bg="gray.0"
            mb="xl"
            style={{ borderLeft: "4px solid var(--mantine-color-blue-6)" }}
          >
            <Group wrap="nowrap">
              <Avatar src={chefDeService.img} size={70} radius="md" />
              <Box>
                <Badge
                  color="blue"
                  variant="filled"
                  size="xs"
                  mb={4}
                  leftSection={<IconBadge size={10} />}
                >
                  Chef de Service
                </Badge>
                <Text fw={800} size="lg" style={{ lineHeight: 1.2 }}>
                  {chefDeService.name}
                </Text>
                <Text size="xs" c="dimmed" fw={600} mb={2}>
                  {chefDeService.role}
                </Text>
                <Text size="xs" c="blue.7" fw={700}>
                  {chefDeService.specialty}
                </Text>
              </Box>
            </Group>
          </Paper>

          <Divider
            my="md"
            label="Staff Médical & Paramédical"
            labelPosition="center"
          />

          {/* Staff Grid */}
          <SimpleGrid cols={2} spacing="md" mt="md">
            {staff.map((person) => (
              <Paper
                key={person.name}
                withBorder
                p="xs"
                radius="sm"
                shadow="none"
              >
                <Group wrap="nowrap" gap="sm">
                  <Avatar src={person.img} radius="xl" size="sm" />
                  <Box style={{ overflow: "hidden" }}>
                    <Text size="xs" fw={700} truncate>
                      {person.name}
                    </Text>
                    <Text
                      size="9px"
                      c={person.color}
                      fw={800}
                      style={{ textTransform: "uppercase" }}
                    >
                      {person.role}
                    </Text>
                  </Box>
                </Group>
              </Paper>
            ))}
          </SimpleGrid>
        </Paper>

        <Paper withBorder p="lg" radius="md">
          <Title order={4} mb="sm">
            À propos du Service
          </Title>
          <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
            Le service prend en charge les pathologies pédiatriques aiguës et
            chroniques. Il est reconnu pour son unité de néonatalogie de niveau
            III. Les étudiants sont intégrés aux activités quotidiennes de soins
            et de garde.
          </Text>
        </Paper>
      </Stack>

      {/* RIGHT COLUMN: LOCATION & RULES */}
      <Stack gap="lg">
        {/* Location Card */}
        <Paper withBorder p="lg" radius="md" shadow="sm">
          <Group justify="space-between" mb="md">
            <Group gap="xs">
              <ThemeIcon variant="light" color="red">
                <IconMapPin size={18} />
              </ThemeIcon>
              <Title order={4}>Localisation</Title>
            </Group>
            <Button
              variant="subtle"
              size="xs"
              rightSection={<IconExternalLink size={14} />}
              component="a"
              href="https://maps.google.com"
              target="_blank"
            >
              Itinéraire
            </Button>
          </Group>

          <Box
            h={200}
            bg="gray.1"
            mb="md"
            style={{
              borderRadius: "8px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid var(--mantine-color-gray-2)",
            }}
          >
            <IconMapPin size={40} color="var(--mantine-color-red-6)" />
            <Text fw={700} size="sm" mt="sm">
              CHU Souss Massa
            </Text>
            <Text size="xs" c="dimmed">
              Bâtiment Mère-Enfant • 2ème Étage
            </Text>
          </Box>

          <Group gap="xs" p="xs" bg="gray.0" style={{ borderRadius: "4px" }}>
            <IconClock size={16} color="gray" />
            <Text size="xs" fw={500}>
              Accès: Entrée principale via Avenue des Facultés
            </Text>
          </Group>
        </Paper>

        {/* Rules Card */}
        <Paper
          withBorder
          p="lg"
          radius="md"
          bg="blue.0"
          style={{ borderColor: "var(--mantine-color-blue-2)" }}
        >
          <Group mb="md">
            <ThemeIcon color="blue" variant="filled" radius="xl">
              <IconStethoscope size={18} />
            </ThemeIcon>
            <Text fw={700}>Règles du Service</Text>
          </Group>
          <List
            spacing="sm"
            size="sm"
            icon={
              <ThemeIcon color="blue" size={20} radius="xl">
                <IconCheck size={12} />
              </ThemeIcon>
            }
          >
            <List.Item>
              <Text size="sm">
                <b>Contre-visite:</b> Obligatoire à 16h30.
              </Text>
            </List.Item>
            <List.Item>
              <Text size="sm">
                <b>Gardes:</b> Présence requise jusqu'à 08h00 le lendemain.
              </Text>
            </List.Item>
            <List.Item>
              <Text size="sm">
                <b>Tenue:</b> Blouse blanche, badge, et chaussures fermées.
              </Text>
            </List.Item>
          </List>
        </Paper>
      </Stack>
    </SimpleGrid>
  );
}

// --- 2. Evaluation & Absence Registry Section ---
function EvaluationAndAbsenceSection() {
  const objectives = [
    { label: "Anamnèse et interrogatoire", rating: 18, max: 20, color: "teal" },
    { label: "Examen clinique", rating: 15, max: 20, color: "teal" },
    { label: "Raisonnement diagnostique", rating: 14, max: 20, color: "blue" },
    { label: "Assiduité et Ponctualité", rating: 12, max: 20, color: "orange" },
  ];

  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
      {/* Detailed Marks */}
      <Stack gap="md">
        <Paper withBorder p="xl" radius="md">
          <Group justify="space-between" mb="xl">
            <Box>
              <Title order={3}>Note Globale</Title>
              <Text c="dimmed" size="sm">
                Validé par le jury de service
              </Text>
            </Box>
            <RingProgress
              size={120}
              roundCaps
              thickness={12}
              sections={[{ value: 85, color: "teal" }]}
              label={
                <Text ta="center" fw={700} size="xl">
                  17/20
                </Text>
              }
            />
          </Group>

          <Stack gap="md">
            {objectives.map((obj, index) => (
              <Box key={index}>
                <Group justify="space-between" mb={4}>
                  <Text size="sm" fw={600}>
                    {obj.label}
                  </Text>
                  <Text size="sm" fw={700}>
                    {obj.rating}/{obj.max}
                  </Text>
                </Group>
                <Progress
                  value={(obj.rating / obj.max) * 100}
                  color={obj.color}
                  size="sm"
                  radius="xl"
                />
              </Box>
            ))}
          </Stack>
        </Paper>
      </Stack>

      {/* Absence Management */}
      <Stack gap="md">
        <Paper withBorder p="lg" radius="md">
          <Group justify="space-between" mb="md">
            <Group gap="xs">
              <IconCalendarExclamation size={20} color="orange" />
              <Title order={4}>Registre des Absences</Title>
            </Group>
            <Button
              size="xs"
              variant="light"
              leftSection={<IconPlus size={14} />}
            >
              Déclarer
            </Button>
          </Group>

          <Table verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Date</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              <Table.Tr>
                <Table.Td>
                  <Text size="sm">14/01/2026</Text>
                </Table.Td>
                <Table.Td>
                  <Badge size="xs" variant="light" color="gray">
                    Garde
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Badge color="green" size="xs">
                    Justifié
                  </Badge>
                </Table.Td>
              </Table.Tr>
              <Table.Tr>
                <Table.Td>
                  <Text size="sm">20/01/2026</Text>
                </Table.Td>
                <Table.Td>
                  <Badge size="xs" variant="light" color="red">
                    Cours
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Badge color="red" size="xs">
                    Non Justifié
                  </Badge>
                </Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>

          <Box
            mt="xl"
            p="md"
            bg="orange.0"
            style={{
              borderRadius: "8px",
              border: "1px dashed var(--mantine-color-orange-4)",
            }}
          >
            <Group gap="xs">
              <IconAlertCircle size={16} color="orange" />
              <Text size="xs" fw={700} c="orange.9">
                Attention: L'absence non justifiée a entraîné un malus de -2
                points sur la note d'assiduité.
              </Text>
            </Group>
          </Box>
        </Paper>
      </Stack>
    </SimpleGrid>
  );
}
