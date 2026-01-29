import {
  Title,
  Text,
  Stack,
  Divider,
  Grid,
  Paper,
  Group,
  Avatar,
  Badge,
  Loader,
  ThemeIcon,
  SimpleGrid,
  Box,
  Button,
  ActionIcon,
} from "@mantine/core";
import {
  IconMail,
  IconFingerprint,
  IconSchool,
  IconCalendar,
  IconMapPin,
  IconPhone,
  IconCertificate,
  IconUserCircle,
  IconDownload,
  IconExternalLink,
} from "@tabler/icons-react";
import { useGetStudentProfileQuery } from "../api/studentApi";

// --- TYPES (SOLID: Interface Segregation) ---
interface InfoRowProps {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}

// --- MOCK DATA ---
const MOCK_PROFILE = {
  firstName: "Yassine",
  lastName: "Benkirane",
  email: "y.benkirane@uiz.ac.ma",
  cne: "G134055221",
  currentLevel: "Master 2 - Génie Logiciel",
  academicYear: 2026,
  phone: "+212 600-000000",
  location: "Agadir, Maroc",
};

export default function ProfilePage() {
  const { data, isLoading, isError } = useGetStudentProfileQuery();

  if (isLoading)
    return (
      <Group justify="center" py="xl">
        <Loader size="xl" variant="dots" />
      </Group>
    );

  const profile = data?.data ?? MOCK_PROFILE;

  return (
    <Stack gap="xl">
      {/* Header Section */}
      <ProfileHeader isPreview={isError} profileId={profile.cne} />

      <Grid gutter="xl">
        {/* Left Column: Hero Identity Card */}
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <IdentityCard
            fullName={`${profile.firstName} ${profile.lastName}`}
            level={profile.currentLevel}
          />
        </Grid.Col>

        {/* Right Column: Information Expansion */}
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <Stack gap="lg">
            {/* Personal Details Section */}
            <SectionWrapper
              title="Informations Personnelles"
              icon={IconUserCircle}
              color="blue"
            >
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl">
                <InfoRow
                  icon={IconFingerprint}
                  label="CNE / Matricule"
                  value={profile.cne}
                  color="blue"
                />
                <InfoRow
                  icon={IconMail}
                  label="Email Institutionnel"
                  value={profile.email}
                  color="red"
                />
                <InfoRow
                  icon={IconPhone}
                  label="Téléphone"
                  value={profile.phone}
                  color="green"
                />
                <InfoRow
                  icon={IconMapPin}
                  label="Localisation"
                  value={profile.location}
                  color="cyan"
                />
              </SimpleGrid>
            </SectionWrapper>

            {/* Academic Details Section */}
            <SectionWrapper
              title="Cursus Académique"
              icon={IconCertificate}
              color="grape"
            >
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl">
                <InfoRow
                  icon={IconSchool}
                  label="Diplôme / Filière"
                  value={profile.currentLevel}
                  color="grape"
                />
                <InfoRow
                  icon={IconCalendar}
                  label="Année Universitaire"
                  value={profile.academicYear.toString()}
                  color="orange"
                />
              </SimpleGrid>
            </SectionWrapper>
          </Stack>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}

// --- SUB-COMPONENTS (SRP: Each component has one job) ---

function ProfileHeader({
  isPreview,
  profileId,
}: {
  isPreview: boolean;
  profileId: string;
}) {
  return (
    <Group justify="space-between" align="flex-end">
      <Stack gap={0}>
        <Title
          order={1}
          fw={900}
          style={{ letterSpacing: "-1px", fontSize: "2.2rem" }}
        >
          Dossier Étudiant
        </Title>
        <Text c="dimmed" size="sm" fw={500}>
          ID Dossier:{" "}
          <Box component="span" c="blue.6" fw={700}>
            {profileId}
          </Box>
        </Text>
      </Stack>
      {isPreview && (
        <Badge color="orange" variant="filled" size="lg" radius="sm">
          MODE APERÇU
        </Badge>
      )}
    </Group>
  );
}

function IdentityCard({
  fullName,
  level,
}: {
  fullName: string;
  level: string;
}) {
  return (
    <Paper
      withBorder
      radius="lg"
      p={0}
      style={{ overflow: "hidden" }}
      shadow="sm"
    >
      <Box h={120} bg="linear-gradient(45deg, #139BFE, #149945)" />

      <Stack align="center" mt="-60px" p="xl" pb="2.5rem">
        <Avatar
          size={120}
          radius={120}
          color="blue"
          variant="filled"
          style={{
            border: "4px solid white",
            boxShadow: "var(--mantine-shadow-md)",
          }}
        >
          {fullName
            .split(" ")
            .map((n) => n[0])
            .join("")}
        </Avatar>

        <Stack gap={4} align="center" mt="sm">
          <Title order={3} fw={800}>
            {fullName}
          </Title>
          <Text size="sm" c="dimmed" fw={500}>
            Étudiant Régulier
          </Text>
        </Stack>

        <Divider w="100%" my="md" />

        <Badge size="xl" fullWidth variant="light" h={45} radius="md">
          {level}
        </Badge>
      </Stack>
    </Paper>
  );
}

function SectionWrapper({ title, icon: Icon, color, children }: any) {
  return (
    <Paper withBorder p="xl" radius="lg" shadow="xs">
      <Group mb="xl">
        <ThemeIcon variant="light" color={color} size="xl" radius="md">
          <Icon size={24} />
        </ThemeIcon>
        <Title order={4} fw={700}>
          {title}
        </Title>
      </Group>
      {children}
    </Paper>
  );
}

function InfoRow({ icon: Icon, label, value, color }: InfoRowProps) {
  return (
    <Group wrap="nowrap" align="flex-start">
      <ThemeIcon variant="transparent" color={color} size="sm" mt={3}>
        <Icon size={20} />
      </ThemeIcon>
      <div>
        <Text
          size="xs"
          c="dimmed"
          fw={700}
          style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}
        >
          {label}
        </Text>
        <Text size="md" fw={600} c="gray.8">
          {value}
        </Text>
      </div>
    </Group>
  );
}

function QuickLink({
  label,
  href,
  color,
}: {
  label: string;
  href: string;
  color: string;
}) {
  return (
    <Button
      component="a"
      href={href}
      target="_blank"
      variant="light"
      color={color}
      fullWidth
      justify="space-between"
      rightSection={<IconExternalLink size={14} />}
    >
      {label}
    </Button>
  );
}

function IconLink({
  label,
  href,
  icon,
}: {
  label: string;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <Group
      justify="space-between"
      p="xs"
      style={{
        borderRadius: "8px",
        cursor: "pointer",
        border: "1px solid transparent",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8f9fa")}
      onMouseLeave={(e) =>
        (e.currentTarget.style.backgroundColor = "transparent")
      }
    >
      <Text size="sm" fw={500}>
        {label}
      </Text>
      {icon}
    </Group>
  );
}

function DocumentItem({
  label,
  isLocked = false,
}: {
  label: string;
  isLocked?: boolean;
}) {
  return (
    <Group justify="space-between" wrap="nowrap">
      <Text size="xs" fw={500} c={isLocked ? "dimmed" : "black"}>
        {label}
      </Text>
      <ActionIcon
        variant="subtle"
        color={isLocked ? "gray" : "blue"}
        disabled={isLocked}
      >
        <IconDownload size={16} />
      </ActionIcon>
    </Group>
  );
}
