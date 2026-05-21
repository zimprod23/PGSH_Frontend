import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Divider,
  Grid,
  Group,
  Modal,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Tabs,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
  rem,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconUser,
  IconSchool,
  IconClipboardList,
  IconAlertTriangle,
  IconHash,
  IconCalendar,
  IconMail,
  IconId,
  IconMapPin,
  IconHome,
  IconUserCircle,
  IconHeart,
  IconFlag,
  IconCertificate,
  IconStar,
  IconTrophy,
  IconPlus,
} from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGetStudentByIdQuery, useGetStudentRegistrationsQuery } from '../../../student/api/studentApi';
import { useUpdateRegistrationMutation, useCreateRegistrationMutation, useGetAcademicYearsQuery, useGetLevelsQuery } from '../../api/adminApi';
import type { AcademicProgram, RegistrationStatus } from '../../../../common/types';
import { ProfileFieldCell } from '../../../student/components/ProfileFieldCell';
import { RegistrationBadge } from '../../../student/components/RegistrationBadge';
import { useNotify } from '../../../../common/hooks/useNotify';
import type { StudentRegistrationResponse } from '../../../student/types/student.types';
import {
  formatProgram, formatLevel, formatBacSeries,
  formatGender, formatCivilStatus, formatNationality,
  formatDate, initials,
} from '../../../student/utils/format';

// ─── Status select options ────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: RegistrationStatus; label: string }[] = [
  { value: 'Pending',   label: 'En attente'  },
  { value: 'Active',    label: 'En cours'    },
  { value: 'Validated', label: 'Validée'     },
  { value: 'Failed',    label: 'Échouée'     },
  { value: 'Withdrawn', label: 'Abandonnée'  },
];

// ─── Registration card with inline status edit ────────────────────────────────

function RegistrationCard({
  reg,
  studentId,
}: {
  reg: StudentRegistrationResponse;
  studentId: string;
}) {
  const notify = useNotify();
  const [updateRegistration, { isLoading }] = useUpdateRegistrationMutation();

  const handleStatusChange = async (newStatus: string | null) => {
    if (!newStatus || newStatus === reg.status) return;
    try {
      await updateRegistration({
        registrationId: reg.id,
        studentId,
        status:         newStatus as RegistrationStatus,
        academicYearId: reg.academicYearId,
        levelId:        reg.levelId,
        failureDescription: reg.failureDescription ?? undefined,
      }).unwrap();
      notify.success(`Statut mis à jour : ${STATUS_OPTIONS.find(o => o.value === newStatus)?.label}`);
    } catch {
      notify.error('Impossible de mettre à jour le statut.');
    }
  };

  return (
    <Box
      p="md"
      style={{
        border: '1px solid #E2E8F0',
        borderRadius: rem(8),
        background: '#fff',
        borderLeft: `3px solid ${reg.status === 'Validated' ? '#10B981' : reg.status === 'Failed' ? '#EF4444' : '#0F4C81'}`,
      }}
    >
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
        {/* Left: year + level */}
        <Stack gap={4}>
          <Group gap="xs">
            <Text fw={700} size="sm">{reg.academicYear}</Text>
            {reg.hasFailures && (
              <Tooltip label={reg.failureDescription ?? 'Échec signalé'} position="top">
                <ThemeIcon size={18} radius="xl" variant="light" color="danger">
                  <IconAlertTriangle size={11} stroke={1.5} />
                </ThemeIcon>
              </Tooltip>
            )}
          </Group>
          <Text size="xs" c="dimmed">{reg.levelLabel ?? `Niveau ID: ${reg.levelId}`}</Text>
          <Text size="xs" c="dimmed" ff="monospace" style={{ opacity: 0.6 }}>
            {reg.id.slice(0, 8)}…
          </Text>
        </Stack>

        {/* Right: status select */}
        <Group gap="xs" align="center">
          <RegistrationBadge status={reg.status} />
          <Select
            value={reg.status}
            onChange={handleStatusChange}
            data={STATUS_OPTIONS}
            size="xs"
            radius="md"
            w={130}
            disabled={isLoading}
            styles={{ input: { fontSize: rem(12) } }}
          />
        </Group>
      </Group>

      {reg.failureDescription && (
        <Text size="xs" c="danger" mt="xs">
          Motif : {reg.failureDescription}
        </Text>
      )}
    </Box>
  );
}

// ─── Create registration modal ────────────────────────────────────────────────

const STATUS_CREATE_OPTIONS: { value: RegistrationStatus; label: string }[] = [
  { value: 'Pending',   label: 'En attente'  },
  { value: 'Active',    label: 'En cours'    },
  { value: 'Validated', label: 'Validée'     },
];

function CreateRegistrationModal({
  opened,
  onClose,
  studentId,
  academicProgram,
}: {
  opened: boolean;
  onClose: () => void;
  studentId: string;
  academicProgram: AcademicProgram | string;
}) {
  const notify = useNotify();
  const [yearId,   setYearId]   = useState<string | null>(null);
  const [levelId,  setLevelId]  = useState<string | null>(null);
  const [status,   setStatus]   = useState<string>('Pending');

  const { data: years  = [] } = useGetAcademicYearsQuery();
  const { data: levels = [] } = useGetLevelsQuery(academicProgram as AcademicProgram);
  const [createRegistration, { isLoading }] = useCreateRegistrationMutation();

  const handleSubmit = async () => {
    if (!yearId || !levelId) {
      notify.warning('Veuillez sélectionner une année et un niveau.');
      return;
    }
    try {
      await createRegistration({
        studentId,
        academicYearId: Number(yearId),
        levelId:        Number(levelId),
        status:         status as RegistrationStatus,
      }).unwrap();
      notify.success('Inscription créée avec succès.');
      setYearId(null);
      setLevelId(null);
      setStatus('Pending');
      onClose();
    } catch {
      notify.error("Impossible de créer l'inscription.");
    }
  };

  const yearOptions  = years.map(y  => ({ value: String(y.id),  label: y.isCurrent ? `${y.label} (en cours)` : y.label }));
  const levelOptions = levels.map(l => ({ value: String(l.id),  label: l.label ?? `Année ${l.year}` }));

  return (
    <Modal opened={opened} onClose={onClose} title="Nouvelle inscription" radius="lg" size="sm">
      <Stack gap="md">
        <Select
          label="Année académique"
          placeholder="Sélectionner une année"
          data={yearOptions}
          value={yearId}
          onChange={setYearId}
          radius="md"
          required
        />
        <Select
          label="Niveau"
          placeholder="Sélectionner un niveau"
          data={levelOptions}
          value={levelId}
          onChange={setLevelId}
          radius="md"
          required
        />
        <Select
          label="Statut initial"
          data={STATUS_CREATE_OPTIONS}
          value={status}
          onChange={(v) => v && setStatus(v)}
          radius="md"
        />
        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={onClose} radius="md">Annuler</Button>
          <Button color="navy" radius="md" loading={isLoading} onClick={handleSubmit}>
            Créer
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// ─── Registrations tab ────────────────────────────────────────────────────────

function RegistrationsTab({
  studentId,
  onAdd,
}: {
  studentId: string;
  onAdd: () => void;
}) {
  const { data: registrations = [], isLoading } = useGetStudentRegistrationsQuery(studentId);

  return (
    <Stack gap="md">
      <Group justify="flex-end">
        <Button
          leftSection={<IconPlus size={15} stroke={1.5} />}
          color="navy"
          variant="light"
          size="xs"
          radius="md"
          onClick={onAdd}
        >
          Ajouter une inscription
        </Button>
      </Group>

      {isLoading ? (
        <Stack gap="sm">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={80} radius="md" />)}
        </Stack>
      ) : registrations.length === 0 ? (
        <Stack align="center" py="xl" gap="xs">
          <ThemeIcon size={48} radius="xl" variant="light" color="navy">
            <IconClipboardList size={22} stroke={1.5} />
          </ThemeIcon>
          <Text c="dimmed" size="sm">Aucune inscription trouvée</Text>
        </Stack>
      ) : (
        registrations.map((reg) => (
          <RegistrationCard key={reg.id} reg={reg} studentId={studentId} />
        ))
      )}
    </Stack>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminStudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: student, isLoading } = useGetStudentByIdQuery(id ?? '', { skip: !id });
  const [modalOpen, setModalOpen]   = useState(false);

  const initStr    = student ? initials(student.firstName, student.lastName) : '';
  const levelLabel = student?.currentRegistration
    ? formatLevel(student.currentRegistration.level.year, student.currentRegistration.level.academicProgram)
    : student ? formatProgram(student.academicProgram) : '';

  return (
    <Container fluid>
      <Stack gap="xl">
        {/* Back + title */}
        <Group gap="sm">
          <ActionIcon variant="subtle" color="gray" radius="md" onClick={() => navigate(-1)}>
            <IconArrowLeft size={18} stroke={1.5} />
          </ActionIcon>
          <Stack gap={2}>
            {isLoading
              ? <Skeleton height={24} width={200} />
              : <Title order={2} fw={700}>{student?.firstName} {student?.lastName}</Title>
            }
            <Text size="sm" c="dimmed">Dossier étudiant — Administration</Text>
          </Stack>
        </Group>

        <Grid gutter="lg" align="flex-start">
          {/* Left: compact ID card */}
          <Grid.Col span={{ base: 12, sm: 4, md: 3 }}>
            <Card padding={0} radius="lg" withBorder shadow="sm" style={{ overflow: 'hidden' }}>
              {/* Gradient strip */}
              <Box
                style={{
                  background: 'linear-gradient(135deg, #0F4C81 0%, #0EA5E9 100%)',
                  paddingTop: rem(28),
                  paddingBottom: rem(40),
                  display: 'flex',
                  justifyContent: 'center',
                }}
              />

              <Stack align="center" px="lg" pb="lg" mt={rem(-32)}>
                {isLoading ? (
                  <Skeleton circle height={64} />
                ) : (
                  <Avatar
                    size={64} radius="xl"
                    style={{
                      background: 'linear-gradient(135deg, #0F4C81 0%, #0EA5E9 100%)',
                      color: '#fff', fontWeight: 800, fontSize: rem(22),
                      border: '3px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                    }}
                  >
                    {initStr}
                  </Avatar>
                )}

                {isLoading ? (
                  <Stack align="center" gap="xs">
                    <Skeleton height={16} width={140} />
                    <Skeleton height={12} width={90} />
                  </Stack>
                ) : student && (
                  <Stack align="center" gap={4}>
                    <Text fw={700} size="sm">{student.firstName} {student.lastName}</Text>
                    <Badge variant="light" color="navy" radius="xl" size="xs">{levelLabel}</Badge>
                  </Stack>
                )}
              </Stack>

              <Divider />

              {/* Key identifiers — what admin uses most */}
              <Stack gap={0} p="md">
                {[
                  { label: 'CNE',    value: student?.cne,     mono: true },
                  { label: 'Apogée', value: student?.appogee, mono: true },
                  { label: 'CIN',    value: student?.cin ?? '—', mono: true },
                  { label: 'Filière', value: student ? formatProgram(student.academicProgram) : '—', mono: false },
                ].map(({ label, value, mono }) => (
                  <Box key={label} py="xs" style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={600} style={{ letterSpacing: '0.4px' }}>
                      {label}
                    </Text>
                    <Text size="sm" fw={500} ff={mono ? 'monospace' : undefined} c={value === '—' ? 'dimmed' : undefined}>
                      {isLoading ? <Skeleton height={14} width={80} mt={2} /> : value}
                    </Text>
                  </Box>
                ))}
              </Stack>

              <Divider />

              <Group justify="space-around" p="md">
                <Stack align="center" gap={2}>
                  <Text fw={700} size="lg">{student?.accessGrade.toFixed(2) ?? '—'}</Text>
                  <Text size="xs" c="dimmed">Note accès</Text>
                </Stack>
                <Divider orientation="vertical" />
                <Stack align="center" gap={2}>
                  <Text fw={700} size="lg">{student?.ranking ? `#${student.ranking}` : '—'}</Text>
                  <Text size="xs" c="dimmed">Classement</Text>
                </Stack>
              </Group>
            </Card>
          </Grid.Col>

          {/* Right: management tabs */}
          <Grid.Col span={{ base: 12, sm: 8, md: 9 }}>
            <Card padding="lg" radius="lg" withBorder shadow="sm">
              {/* Inscriptions is the primary admin tab */}
              <Tabs defaultValue="registrations" variant="outline">
                <Tabs.List mb="lg">
                  <Tabs.Tab value="registrations" leftSection={<IconClipboardList size={14} stroke={1.5} />}>
                    Inscriptions
                  </Tabs.Tab>
                  <Tabs.Tab value="personal" leftSection={<IconUser size={14} stroke={1.5} />}>
                    Informations
                  </Tabs.Tab>
                  <Tabs.Tab value="academic" leftSection={<IconSchool size={14} stroke={1.5} />}>
                    Cursus
                  </Tabs.Tab>
                </Tabs.List>

                {/* Inscriptions — primary admin concern */}
                <Tabs.Panel value="registrations">
                  {id && (
                    <RegistrationsTab
                      studentId={id}
                      onAdd={() => setModalOpen(true)}
                    />
                  )}
                </Tabs.Panel>

                {/* Personal info */}
                <Tabs.Panel value="personal">
                  {isLoading || !student ? (
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                      {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} height={72} radius="md" />)}
                    </SimpleGrid>
                  ) : (
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                      <ProfileFieldCell icon={IconMail}       iconColor="sky"     label="Email"            value={student.email} />
                      <ProfileFieldCell icon={IconId}         iconColor="navy"    label="CIN"              value={student.cin ?? '—'}                          mono />
                      <ProfileFieldCell icon={IconCalendar}   iconColor="success" label="Date de naissance" value={student.dateOfBirth ? formatDate(student.dateOfBirth) : '—'} />
                      <ProfileFieldCell icon={IconMapPin}     iconColor="warning" label="Lieu de naissance" value={student.placeOfBirth ?? '—'} />
                      <ProfileFieldCell icon={IconHome}       iconColor="sky"     label="Adresse"           value={student.fullAddress ?? '—'} />
                      <ProfileFieldCell icon={IconUserCircle} iconColor="navy"    label="Genre"             value={formatGender(student.gender)} />
                      <ProfileFieldCell icon={IconHeart}      iconColor="danger"  label="Statut civil"      value={formatCivilStatus(student.civilStatus)} />
                      <ProfileFieldCell icon={IconFlag}       iconColor="success" label="Nationalité"       value={formatNationality(student.nationalityStatus)} />
                    </SimpleGrid>
                  )}
                </Tabs.Panel>

                {/* Academic info */}
                <Tabs.Panel value="academic">
                  {isLoading || !student ? (
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                      {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} height={72} radius="md" />)}
                    </SimpleGrid>
                  ) : (
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                      <ProfileFieldCell icon={IconSchool}      iconColor="navy"    label="Filière"       value={formatProgram(student.academicProgram)} />
                      <ProfileFieldCell icon={IconUserCircle}  iconColor="sky"     label="Année actuelle" value={student.currentRegistration ? `${student.currentRegistration.level.year}ème année` : '—'} />
                      <ProfileFieldCell icon={IconHash}        iconColor="sky"     label="CNE"           value={student.cne}      mono />
                      <ProfileFieldCell icon={IconHash}        iconColor="warning" label="Apogée"        value={student.appogee}  mono />
                      <ProfileFieldCell icon={IconCertificate} iconColor="success" label="Série bac"     value={formatBacSeries(student.bacSeries)} />
                      <ProfileFieldCell icon={IconCalendar}    iconColor="navy"    label="Année bac"     value={student.bacYear} />
                      <ProfileFieldCell icon={IconStar}        iconColor="warning" label="Note d'accès"  value={`${student.accessGrade.toFixed(2)} / 20`} />
                      <ProfileFieldCell icon={IconTrophy}      iconColor="success" label="Classement"    value={student.ranking ? `#${student.ranking}` : '—'} />
                    </SimpleGrid>
                  )}
                </Tabs.Panel>
              </Tabs>
            </Card>
          </Grid.Col>
        </Grid>
      </Stack>

      {student && id && (
        <CreateRegistrationModal
          opened={modalOpen}
          onClose={() => setModalOpen(false)}
          studentId={id}
          academicProgram={student.academicProgram}
        />
      )}
    </Container>
  );
}
