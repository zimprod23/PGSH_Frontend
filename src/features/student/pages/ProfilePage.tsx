import {
  Avatar,
  Badge,
  Box,
  Card,
  Center,
  Container,
  Divider,
  Grid,
  Group,
  SimpleGrid,
  Skeleton,
  Stack,
  Tabs,
  Text,
  ThemeIcon,
  rem,
} from '@mantine/core';
import {
  IconUser,
  IconMail,
  IconId,
  IconCalendar,
  IconMapPin,
  IconHome,
  IconHeart,
  IconFlag,
  IconSchool,
  IconHash,
  IconCertificate,
  IconStar,
  IconTrophy,
  IconFileText,
  IconUserCircle,
} from '@tabler/icons-react';
import { useGetCurrentStudentQuery } from '../api/studentApi';
import { ProfileFieldCell } from '../components/ProfileFieldCell';
import {
  formatProgram,
  formatLevel,
  formatBacSeries,
  formatGender,
  formatCivilStatus,
  formatNationality,
  formatDate,
  initials,
} from '../utils/format';

// ─── Left panel ──────────────────────────────────────────────────────────────

function LeftPanelSkeleton() {
  return (
    <Card padding={0} radius="lg" withBorder shadow="sm" style={{ overflow: 'hidden' }}>
      <Skeleton height={120} radius={0} />
      <Stack align="center" p="lg" gap="sm">
        <Skeleton circle height={72} mt={-36} style={{ border: '3px solid white' }} />
        <Skeleton height={20} width={160} />
        <Skeleton height={14} width={100} />
        <Skeleton height={24} width={140} radius="xl" />
      </Stack>
      <Divider />
      <Group justify="space-around" p="md">
        <Skeleton height={40} width={70} />
        <Skeleton height={40} width={70} />
      </Group>
    </Card>
  );
}

interface LeftPanelProps {
  student: {
    firstName: string;
    lastName: string;
    cne: string;
    academicProgram: string;
    accessGrade: number;
    ranking: number | null;
    currentRegistration: { level: { year: number; academicProgram: string } } | null;
  };
}

function LeftPanel({ student }: LeftPanelProps) {
  const initStr = initials(student.firstName, student.lastName);
  const levelLabel = student.currentRegistration
    ? formatLevel(
        student.currentRegistration.level.year,
        student.currentRegistration.level.academicProgram,
      )
    : formatProgram(student.academicProgram);

  return (
    <Card padding={0} radius="lg" withBorder shadow="sm" style={{ overflow: 'hidden' }}>
      {/* Gradient header with avatar */}
      <Box
        style={{
          background: 'linear-gradient(135deg, #0F4C81 0%, #0EA5E9 100%)',
          paddingTop: rem(32),
          paddingBottom: rem(44),
          display: 'flex',
          justifyContent: 'center',
        }}
      />
      <Stack align="center" px="lg" pb="lg" mt={rem(-36)}>
        <Avatar
          size={72}
          radius="xl"
          style={{
            background: 'linear-gradient(135deg, #0F4C81 0%, #0EA5E9 100%)',
            color: '#fff',
            fontWeight: 800,
            fontSize: rem(24),
            border: '3px solid #fff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          }}
        >
          {initStr}
        </Avatar>

        <Stack align="center" gap={4}>
          <Text fw={700} size="md">
            {student.firstName} {student.lastName}
          </Text>
          <Text size="xs" c="dimmed" ff="monospace">
            CNE · {student.cne}
          </Text>
          <Badge variant="light" color="navy" radius="xl" size="sm" mt={4}>
            {levelLabel}
          </Badge>
        </Stack>
      </Stack>

      <Divider />

      {/* Stats */}
      <Group justify="space-around" p="md">
        <Stack align="center" gap={2}>
          <Text fw={700} size="lg">—</Text>
          <Text size="xs" c="dimmed">Stages</Text>
        </Stack>
        <Divider orientation="vertical" />
        <Stack align="center" gap={2}>
          <Text fw={700} size="lg">{student.accessGrade.toFixed(2)}</Text>
          <Text size="xs" c="dimmed">Note d'accès</Text>
        </Stack>
      </Group>
    </Card>
  );
}

// ─── Tab: Informations personnelles ──────────────────────────────────────────

function PersonalInfoTab({ student }: {
  student: {
    email: string;
    cin: string | null;
    gender: string;
    civilStatus: string;
    nationalityStatus: string;
    dateOfBirth: string | null;
    placeOfBirth: string | null;
    fullAddress: string | null;
  };
}) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
      <ProfileFieldCell icon={IconMail}     iconColor="sky"     label="Email"            value={student.email} />
      <ProfileFieldCell icon={IconId}       iconColor="navy"    label="CIN"              value={student.cin ?? '—'}          mono />
      <ProfileFieldCell icon={IconCalendar} iconColor="success" label="Date de naissance" value={student.dateOfBirth ? formatDate(student.dateOfBirth) : '—'} />
      <ProfileFieldCell icon={IconMapPin}   iconColor="warning" label="Lieu de naissance" value={student.placeOfBirth ?? '—'} />
      <ProfileFieldCell icon={IconHome}     iconColor="sky"     label="Adresse"           value={student.fullAddress ?? '—'} />
      <ProfileFieldCell icon={IconUserCircle} iconColor="navy"  label="Genre"             value={formatGender(student.gender)} />
      <ProfileFieldCell icon={IconHeart}    iconColor="danger"  label="Statut civil"      value={formatCivilStatus(student.civilStatus)} />
      <ProfileFieldCell icon={IconFlag}     iconColor="success" label="Nationalité"       value={formatNationality(student.nationalityStatus)} />
    </SimpleGrid>
  );
}

// ─── Tab: Cursus académique ───────────────────────────────────────────────────

function AcademicRecordTab({ student }: {
  student: {
    academicProgram: string;
    cne: string;
    appogee: string;
    bacSeries: string;
    bacYear: string;
    accessGrade: number;
    ranking: number | null;
    currentRegistration: { level: { year: number; academicProgram: string } } | null;
  };
}) {
  const year = student.currentRegistration?.level.year;

  return (
    <Stack gap="md">
      <Group justify="flex-end">
        <Badge variant="light" color="success" radius="xl" size="sm">
          À jour
        </Badge>
      </Group>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
        <ProfileFieldCell icon={IconSchool}      iconColor="navy"    label="Filière"       value={formatProgram(student.academicProgram)} />
        <ProfileFieldCell icon={IconUserCircle}  iconColor="sky"     label="Année"         value={year ? `${year}ème année` : '—'} />
        <ProfileFieldCell icon={IconHash}        iconColor="sky"     label="CNE"           value={student.cne}      mono />
        <ProfileFieldCell icon={IconHash}        iconColor="warning" label="Apogée"        value={student.appogee}  mono />
        <ProfileFieldCell icon={IconCertificate} iconColor="success" label="Série bac"     value={formatBacSeries(student.bacSeries)} />
        <ProfileFieldCell icon={IconCalendar}    iconColor="navy"    label="Année bac"     value={student.bacYear} />
        <ProfileFieldCell icon={IconStar}        iconColor="warning" label="Note d'accès"  value={`${student.accessGrade.toFixed(2)} / 20`} />
        <ProfileFieldCell icon={IconTrophy}      iconColor="success" label="Classement"    value={student.ranking ? `#${student.ranking}` : '—'} />
      </SimpleGrid>
    </Stack>
  );
}

// ─── Tab: Documents ──────────────────────────────────────────────────────────

function DocumentsTab() {
  return (
    <Center py={60}>
      <Stack align="center" gap="md">
        <ThemeIcon size={64} radius="xl" variant="light" color="navy">
          <IconFileText style={{ width: rem(30), height: rem(30) }} stroke={1.5} />
        </ThemeIcon>
        <Stack align="center" gap={4}>
          <Text fw={600}>Documents</Text>
          <Text size="sm" c="dimmed" ta="center" maw={320}>
            La gestion des documents sera disponible prochainement.
          </Text>
        </Stack>
      </Stack>
    </Center>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { data: student, isLoading } = useGetCurrentStudentQuery();

  return (
    <Container fluid>
      <Stack gap="lg">
        <Stack gap={2}>
          <Text fw={700} size="xl">Mon Profil</Text>
          <Text size="sm" c="dimmed">
            Gérez vos informations personnelles, votre cursus et vos documents.
          </Text>
        </Stack>

        <Grid gutter="lg" align="flex-start">
          {/* Left panel */}
          <Grid.Col span={{ base: 12, sm: 4, md: 3 }}>
            {isLoading || !student ? (
              <LeftPanelSkeleton />
            ) : (
              <LeftPanel student={student} />
            )}
          </Grid.Col>

          {/* Right panel — tabs */}
          <Grid.Col span={{ base: 12, sm: 8, md: 9 }}>
            <Card padding="lg" radius="lg" withBorder shadow="sm">
              <Tabs defaultValue="personal" variant="outline">
                <Tabs.List mb="lg">
                  <Tabs.Tab value="personal"  leftSection={<IconUser size={14} stroke={1.5} />}>
                    Informations personnelles
                  </Tabs.Tab>
                  <Tabs.Tab value="academic"  leftSection={<IconSchool size={14} stroke={1.5} />}>
                    Cursus académique
                  </Tabs.Tab>
                  <Tabs.Tab value="documents" leftSection={<IconFileText size={14} stroke={1.5} />}>
                    Documents
                  </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="personal">
                  {isLoading || !student ? (
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} height={72} radius="md" />
                      ))}
                    </SimpleGrid>
                  ) : (
                    <PersonalInfoTab student={student} />
                  )}
                </Tabs.Panel>

                <Tabs.Panel value="academic">
                  {isLoading || !student ? (
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} height={72} radius="md" />
                      ))}
                    </SimpleGrid>
                  ) : (
                    <AcademicRecordTab student={student} />
                  )}
                </Tabs.Panel>

                <Tabs.Panel value="documents">
                  <DocumentsTab />
                </Tabs.Panel>
              </Tabs>
            </Card>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}
