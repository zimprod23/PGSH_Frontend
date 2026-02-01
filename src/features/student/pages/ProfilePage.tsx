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
  IconCertificate,
  IconUserCircle,
  IconDownload,
  IconExternalLink,
  IconEdit,
  IconList,
  IconFileText,
} from "@tabler/icons-react";
import { useGetStudentProfileQuery } from "../api/studentApi";
import { useNavigate } from "react-router-dom";
import { type RegistrationSummary } from "../types/student.types";

// --- TYPES (SOLID: Interface Segregation) ---
interface InfoRowProps {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}

export default function ProfilePage() {
  const { data, isLoading, isError } = useGetStudentProfileQuery();
  const navigate = useNavigate();

  if (isLoading)
    return (
      <Group justify="center" py="xl">
        <Loader size="xl" variant="dots" />
      </Group>
    );

  const profile = data?.data;

  return (
    <>
      {profile && (
        <Stack gap="xl">
          {/* Header Section */}
          <ProfileHeader isPreview={isError} profileId={profile.cne} />

          <Grid gutter="xl">
            {/* Left Column: Hero Identity Card */}
            <Grid.Col span={{ base: 12, lg: 4 }}>
              <IdentityCard
                fullName={`${profile.firstName} ${profile.lastName}`}
                level={
                  profile.currentRegistration?.level.label ||
                  profile.academicProgram
                }
                currentRegistration={profile.currentRegistration}
              />
            </Grid.Col>

            {/* Right Column: Information Expansion */}
            <Grid.Col span={{ base: 12, lg: 8 }}>
              <Stack gap="lg">
                {/* Personal and Academic Details Side by Side */}
                <Grid gutter="lg">
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    {/* Personal Details Section */}
                    <SectionWrapper
                      title="Informations Personnelles"
                      icon={IconUserCircle}
                      color="blue"
                    >
                      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
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
                        {profile.cin && (
                          <InfoRow
                            icon={IconFingerprint}
                            label="CIN"
                            value={profile.cin}
                            color="green"
                          />
                        )}
                        <InfoRow
                          icon={IconUserCircle}
                          label="Genre"
                          value={profile.gender}
                          color="purple"
                        />
                        <InfoRow
                          icon={IconUserCircle}
                          label="État Civil"
                          value={profile.civilStatus}
                          color="orange"
                        />
                        <InfoRow
                          icon={IconUserCircle}
                          label="Statut Nationalité"
                          value={profile.nationalityStatus}
                          color="cyan"
                        />
                        {profile.dateOfBirth && (
                          <InfoRow
                            icon={IconCalendar}
                            label="Date de Naissance"
                            value={new Date(
                              profile.dateOfBirth,
                            ).toLocaleDateString("fr-FR")}
                            color="teal"
                          />
                        )}
                        {profile.placeOfBirth && (
                          <InfoRow
                            icon={IconMapPin}
                            label="Lieu de Naissance"
                            value={profile.placeOfBirth}
                            color="pink"
                          />
                        )}
                        {profile.fullAddress && (
                          <InfoRow
                            icon={IconMapPin}
                            label="Adresse Complète"
                            value={profile.fullAddress}
                            color="indigo"
                          />
                        )}
                      </SimpleGrid>
                    </SectionWrapper>
                  </Grid.Col>

                  <Grid.Col span={{ base: 12, md: 6 }}>
                    {/* Academic Details Section */}
                    <SectionWrapper
                      title="Cursus Académique"
                      icon={IconCertificate}
                      color="grape"
                    >
                      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                        <InfoRow
                          icon={IconSchool}
                          label="Programme Académique"
                          value={profile.academicProgram}
                          color="grape"
                        />
                        <InfoRow
                          icon={IconCertificate}
                          label="Série Bac"
                          value={profile.bacSeries}
                          color="violet"
                        />
                        <InfoRow
                          icon={IconCalendar}
                          label="Année Bac"
                          value={profile.bacYear}
                          color="orange"
                        />
                        <InfoRow
                          icon={IconCertificate}
                          label="Note d'Accès"
                          value={profile.accessGrade.toString()}
                          color="lime"
                        />
                        {profile.ranking && (
                          <InfoRow
                            icon={IconCertificate}
                            label="Classement"
                            value={profile.ranking.toString()}
                            color="yellow"
                          />
                        )}
                        <InfoRow
                          icon={IconFingerprint}
                          label="Code Apogée"
                          value={profile.appogee}
                          color="blue"
                        />
                      </SimpleGrid>
                    </SectionWrapper>
                  </Grid.Col>
                </Grid>

                {/* Quick Actions and Documents Side by Side */}
                <Grid gutter="lg">
                  <Grid.Col span={{ base: 12, md: 6 }}>
                    {/* Quick Actions Section */}
                    <SectionWrapper
                      title="Actions Rapides"
                      icon={IconEdit}
                      color="indigo"
                    >
                      <Stack gap="sm">
                        <IconLink
                          label="Modifier le Profil"
                          icon={<IconEdit size={16} />}
                          onClick={() => {
                            // TODO: Implement profile editing
                            console.log("Edit profile");
                          }}
                        />
                        <IconLink
                          label="Voir les Stages"
                          icon={<IconList size={16} />}
                          onClick={() => navigate("/student/stages")}
                        />
                        <IconLink
                          label="Historique des Demandes"
                          icon={<IconFileText size={16} />}
                          onClick={() => navigate("/student/demands")}
                        />
                        <QuickLink
                          label="Consulter l'Apogée"
                          href={`https://apogee.uiz.ac.ma`}
                          color="orange"
                        />
                      </Stack>
                    </SectionWrapper>
                  </Grid.Col>

                  <Grid.Col span={{ base: 12, md: 6 }}>
                    {/* Documents Section */}
                    <SectionWrapper
                      title="Documents"
                      icon={IconFileText}
                      color="teal"
                    >
                      <Stack gap="sm">
                        <DocumentItem
                          label="Carte d'Identité Nationale (CIN)"
                          isLocked={!profile.cin}
                          onDownload={() => {
                            // TODO: Implement CIN download
                            console.log("Download CIN");
                          }}
                        />
                        <DocumentItem
                          label="Diplôme du Baccalauréat"
                          onDownload={() => {
                            // TODO: Implement Bac diploma download
                            console.log("Download Bac Diploma");
                          }}
                        />
                        <DocumentItem
                          label="Relevé de Notes"
                          onDownload={() => {
                            // TODO: Implement transcript download
                            console.log("Download Transcript");
                          }}
                        />
                        <DocumentItem
                          label="Convention de Stage"
                          isLocked={true}
                          onDownload={() => {
                            // TODO: Implement convention download
                            console.log("Download Convention");
                          }}
                        />
                      </Stack>
                    </SectionWrapper>
                  </Grid.Col>
                </Grid>
              </Stack>
            </Grid.Col>
          </Grid>
        </Stack>
      )}
    </>
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
  currentRegistration,
}: {
  fullName: string;
  level: string;
  currentRegistration?: RegistrationSummary | null;
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

        {currentRegistration && (
          <>
            <Badge
              size="lg"
              color={
                currentRegistration.status === "Active" ? "green" : "orange"
              }
              variant="filled"
              radius="xl"
              px="lg"
              py="sm"
            >
              {currentRegistration.status}
            </Badge>
            <Text size="xs" c="dimmed" fw={600} tt="uppercase">
              {currentRegistration.academicYear}
            </Text>
          </>
        )}

        <Badge size="xl" fullWidth variant="light" h={45} radius="md">
          {level}
        </Badge>
      </Stack>
    </Paper>
  );
}

function SectionWrapper({ title, icon: Icon, color, children }: any) {
  return (
    <Paper withBorder p="xl" radius="lg" shadow="xs" h="100%">
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
  // href,
  icon,
  onClick,
}: {
  label: string;
  href?: string;
  icon: React.ReactNode;
  onClick?: () => void;
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
      onClick={onClick}
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
  onDownload,
}: {
  label: string;
  isLocked?: boolean;
  onDownload?: () => void;
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
        onClick={onDownload}
      >
        <IconDownload size={16} />
      </ActionIcon>
    </Group>
  );
}
