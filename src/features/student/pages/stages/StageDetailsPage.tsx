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
  Table,
  Progress,
  Button,
  rem,
  Center,
} from "@mantine/core";
import {
  IconInfoCircle,
  IconChartBar,
  IconCheck,
  IconMapPin,
  IconAlertCircle,
  IconPlus,
  IconExternalLink,
  IconUsers,
  IconBadge,
  IconStethoscope,
  IconUserStar,
  IconShieldCheck,
} from "@tabler/icons-react";

export default function StageDetailsPage() {
  return (
    <Stack gap="xl">
      {/* --- HEADER SECTION --- */}
      <Paper
        p="xl"
        radius="lg"
        style={{
          color: "white",
          position: "relative",
          overflow: "hidden",
          backgroundImage: "linear-gradient(135deg, #1c7ed6 0%, #0b7285 100%)",
          boxShadow: "0 4px 15px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Group justify="space-between" align="center">
          <Box>
            <Group gap="xs" mb={4}>
              <IconStethoscope size={18} stroke={2.5} />
              <Text
                size="xs"
                fw={700}
                style={{
                  opacity: 0.9,
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                }}
              >
                Fiche de Stage Hospitalier
              </Text>
            </Group>
            <Title
              order={1}
              fw={900}
              style={{ letterSpacing: "-1px", fontSize: rem(30) }}
            >
              Pédiatrie — CHU Agadir
            </Title>
            <Text size="sm" fw={500} style={{ opacity: 0.85 }}>
              3ème Année de Médecine • Semestre 1 • 2025-2026
            </Text>
          </Box>

          <Badge
            size="xl"
            variant="white"
            color="blue"
            radius="md"
            p="md"
            h={45}
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
          >
            <Group gap={6}>
              <IconShieldCheck size={18} />
              VALIDÉ
            </Group>
          </Badge>
        </Group>
      </Paper>

      {/* --- TABS NAVIGATION --- */}
      <Tabs defaultValue="service" variant="pills" radius="xl" color="blue">
        <Tabs.List
          bg="gray.1"
          p={4}
          style={{ borderRadius: "50px", width: "fit-content" }}
        >
          <Tabs.Tab value="service" leftSection={<IconInfoCircle size={16} />}>
            Service & Localisation
          </Tabs.Tab>
          <Tabs.Tab value="evaluation" leftSection={<IconChartBar size={16} />}>
            Évaluation & Absences
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="service" pt="lg">
          <ServiceAndLocationSection />
        </Tabs.Panel>

        <Tabs.Panel value="evaluation" pt="lg">
          <EvaluationAndAbsenceSection />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}

// --- 1. SERVICE & LOCATION SECTION ---
function ServiceAndLocationSection() {
  const staff = [
    {
      name: "Pr. Ait Ahmed",
      role: "Chef de Service",
      specialty: "Néonatalogie & Réanimation",
      img: "https://i.pravatar.cc/150?u=1",
      type: "head",
    },
    {
      name: "Dr. Belamine",
      role: "Maître Assistant",
      specialty: "Pédiatrie Générale",
      img: "https://i.pravatar.cc/150?u=2",
      type: "senior",
    },
    {
      name: "Dr. Sofia",
      role: "Résidente P3",
      specialty: "Urgences Pédiatriques",
      img: "https://i.pravatar.cc/150?u=3",
      type: "senior",
    },
    {
      name: "Mme. Fatimi",
      role: "Infirmière Major",
      specialty: "Coordination de Soins",
      img: "https://i.pravatar.cc/150?u=9",
      type: "para",
    },
  ];

  return (
    <SimpleGrid cols={{ base: 1, md: 5 }} spacing="xl">
      {/* Left Column: Team (3/5 width) */}
      <Box style={{ gridColumn: "span 3" }}>
        <Paper withBorder p="xl" radius="md" shadow="xs">
          <Group justify="space-between" mb="xl">
            <Group gap="sm">
              <ThemeIcon variant="light" color="blue" radius="md" size="lg">
                <IconUsers size={22} />
              </ThemeIcon>
              <Title order={3} fw={800}>
                Équipe Médicale
              </Title>
            </Group>
            <Badge variant="outline" color="blue">
              {staff.length} Responsables
            </Badge>
          </Group>

          <Stack gap="md">
            {staff.map((person) => (
              <Paper
                key={person.name}
                p="md"
                radius="md"
                withBorder
                style={{
                  borderLeft:
                    person.type === "head"
                      ? "4px solid #1c7ed6"
                      : "1px solid #e9ecef",
                  backgroundColor:
                    person.type === "head"
                      ? "var(--mantine-color-blue-0)"
                      : "white",
                  transition: "transform 0.2s ease",
                }}
              >
                <Group justify="space-between" wrap="nowrap">
                  <Group gap="md">
                    <Avatar src={person.img} size="lg" radius="md" />
                    <Box>
                      <Group gap={6}>
                        <Text
                          fw={800}
                          size="md"
                          c={person.type === "head" ? "blue.9" : "gray.9"}
                        >
                          {person.name}
                        </Text>
                        {person.type === "head" && (
                          <IconUserStar size={16} color="#1c7ed6" />
                        )}
                      </Group>
                      <Text size="xs" c="dimmed" fw={600}>
                        {person.specialty}
                      </Text>
                    </Box>
                  </Group>
                  <Badge
                    variant={person.type === "para" ? "light" : "filled"}
                    color={person.type === "para" ? "teal" : "blue"}
                    radius="sm"
                    size="sm"
                  >
                    {person.role}
                  </Badge>
                </Group>
              </Paper>
            ))}
          </Stack>
        </Paper>
      </Box>

      {/* Right Column: Location & Rules (2/5 width) */}
      <Stack gap="lg" style={{ gridColumn: "span 2" }}>
        <Paper withBorder p="xl" radius="md" shadow="xs">
          <Title
            order={4}
            mb="md"
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <IconMapPin size={20} color="var(--mantine-color-red-6)" />{" "}
            Localisation
          </Title>

          <Paper
            h={150}
            bg="gray.0"
            radius="md"
            withBorder
            style={{ overflow: "hidden" }}
          >
            <Center h="100%" style={{ flexDirection: "column" }}>
              <IconMapPin size={32} color="var(--mantine-color-red-6)" />
              <Text fw={700} size="sm" mt={5}>
                Bâtiment Mère-Enfant
              </Text>
              <Text size="xs" c="dimmed">
                2ème Étage, Aile Nord
              </Text>
            </Center>
          </Paper>

          <Button
            fullWidth
            mt="md"
            variant="light"
            color="blue"
            component="a"
            href="https://maps.google.com"
            target="_blank"
            rightSection={<IconExternalLink size={14} />}
          >
            Itinéraire Google Maps
          </Button>
        </Paper>

        <Paper
          withBorder
          p="xl"
          radius="md"
          bg="blue.0"
          style={{ borderLeft: "6px solid #1c7ed6" }}
        >
          <Group mb="md">
            <IconBadge size={22} color="#1c7ed6" />
            <Text fw={800} size="lg">
              Règles du Service
            </Text>
          </Group>
          <List
            spacing="xs"
            size="sm"
            center
            icon={<IconCheck size={14} color="green" />}
          >
            <List.Item>
              <Text size="sm">
                Contre-visite obligatoire à <b>16:30</b>
              </Text>
            </List.Item>
            <List.Item>
              <Text size="sm">Tenue blanche et badge visibles</Text>
            </List.Item>
            <List.Item>
              <Text size="sm">Gardes de 24h avec repos encadré</Text>
            </List.Item>
          </List>
        </Paper>
      </Stack>
    </SimpleGrid>
  );
}

// --- 2. EVALUATION & ABSENCE SECTION ---
function EvaluationAndAbsenceSection() {
  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
      <Paper withBorder p="xl" radius="md" shadow="xs">
        <Title order={3} mb="xl">
          Performance Clinique
        </Title>
        <Group justify="center" mb="xl">
          <RingProgress
            size={180}
            thickness={16}
            roundCaps
            sections={[{ value: 85, color: "blue" }]}
            label={
              <Center style={{ flexDirection: "column" }}>
                <Text size="2.2rem" fw={900} style={{ lineHeight: 1 }}>
                  17
                </Text>
                <Text size="xs" c="dimmed" fw={800}>
                  SUR 20
                </Text>
              </Center>
            }
          />
        </Group>
        <Stack gap="md">
          <StatProgress
            label="Anamnèse et Interrogatoire"
            value={90}
            color="blue"
          />
          <StatProgress label="Examen Clinique" value={75} color="cyan" />
          <StatProgress
            label="Raisonnement Diagnostique"
            value={70}
            color="indigo"
          />
        </Stack>
      </Paper>

      <Paper withBorder p="xl" radius="md" shadow="xs">
        <Group justify="space-between" mb="xl">
          <Title order={3}>Registre de Présence</Title>
          <Button
            variant="light"
            color="blue"
            size="xs"
            leftSection={<IconPlus size={14} />}
          >
            Justifier Absence
          </Button>
        </Group>

        <Table variant="vertical" withRowBorders verticalSpacing="sm">
          <Table.Tbody>
            <Table.Tr>
              <Table.Td fw={700}>14 Janvier</Table.Td>
              <Table.Td>
                <Badge variant="dot" color="gray">
                  Service
                </Badge>
              </Table.Td>
              <Table.Td>
                <Text size="xs" c="green" fw={700}>
                  PRÉSENT
                </Text>
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Td fw={700}>20 Janvier</Table.Td>
              <Table.Td>
                <Badge variant="dot" color="red">
                  Garde
                </Badge>
              </Table.Td>
              <Table.Td>
                <Text size="xs" c="red" fw={700}>
                  ABSENT (NON JUST.)
                </Text>
              </Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>

        <Paper
          p="md"
          mt="xl"
          bg="red.0"
          radius="md"
          style={{ border: "1px dashed var(--mantine-color-red-4)" }}
        >
          <Group wrap="nowrap" gap="sm" align="flex-start">
            <IconAlertCircle color="var(--mantine-color-red-7)" size={20} />
            <Text size="xs" fw={600} c="red.9" style={{ lineHeight: 1.4 }}>
              Attention : Une absence non justifiée a été détectée. Cela
              entraîne un malus automatique sur la note d'assiduité finale.
            </Text>
          </Group>
        </Paper>
      </Paper>
    </SimpleGrid>
  );
}

// --- HELPER COMPONENTS ---
function StatProgress({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Box>
      <Group justify="space-between" mb={6}>
        <Text size="sm" fw={700}>
          {label}
        </Text>
        <Text size="sm" fw={800} c={color}>
          {value}%
        </Text>
      </Group>
      <Progress value={value} color={color} size="lg" radius="xl" />
    </Box>
  );
}
