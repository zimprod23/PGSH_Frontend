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
  TextInput,
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
  IconPencil,
} from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGetStudentByIdQuery, useGetStudentRegistrationsQuery } from '../../../student/api/studentApi';
import { useUpdateRegistrationMutation, useCreateRegistrationMutation, useGetAcademicYearsQuery, useGetLevelsQuery, useUpdateStudentMutation } from '../../api/adminApi';
import type { AcademicProgram, RegistrationStatus } from '../../../../common/types';
import type { StudentResponse } from '../../../student/types/student.types';
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

// ─── Edit student modal ───────────────────────────────────────────────────────

const PROGRAM_OPTIONS: { value: AcademicProgram; label: string }[] = [
  { value: 'Medecine',  label: 'Médecine'   },
  { value: 'Pharmacie', label: 'Pharmacie'  },
  { value: 'Master',    label: 'Master'     },
  { value: 'Doctorat',  label: 'Doctorat'   },
];
const BAC_OPTIONS = [
  { value: 'BacFrançais', label: 'Bac Français'   },
  { value: 'BacMission',  label: 'Bac Mission'    },
  { value: 'MathA',       label: 'Math A'         },
  { value: 'MathB',       label: 'Math B'         },
  { value: 'Physique',    label: 'Physique'        },
  { value: 'SVT',         label: 'SVT'            },
  { value: 'Etrangaire',  label: 'Étranger'       },
];
const CIVIL_OPTIONS     = [{ value: 'Civil',     label: 'Civil'    }, { value: 'Militaire', label: 'Militaire' }];
const NATIONAL_OPTIONS  = [{ value: 'Marocaine', label: 'Marocaine' }, { value: 'Etrangaire', label: 'Étrangère' }];
const GENDER_OPTIONS    = [{ value: 'Male', label: 'Homme' }, { value: 'Female', label: 'Femme' }];

type StudentForm = {
  firstName: string; lastName: string; email: string; cin: string;
  cne: string; appogee: string; accessGrade: number | ''; ranking: number | '';
  academicProgram: AcademicProgram; bacSeries: string; bacYear: string;
  gender: string; civilStatus: string; nationalityStatus: string;
  dateOfBirth: string; placeOfBirth: string; fullAddress: string;
};

function validateStudent(form: StudentForm): Partial<Record<keyof StudentForm, string>> {
  const errs: Partial<Record<keyof StudentForm, string>> = {};
  if (!form.email.trim()) {
    errs.email = 'Email requis';
  } else if (!form.email.trim().endsWith('@um5.ac.ma')) {
    errs.email = 'Doit se terminer par @um5.ac.ma';
  }
  if (!form.firstName.trim()) errs.firstName = 'Prénom requis';
  if (!form.lastName.trim())  errs.lastName  = 'Nom requis';
  if (!form.cne.trim()) {
    errs.cne = 'CNE requis';
  } else if (!/^[A-Z]\d{6,12}$/.test(form.cne.trim())) {
    errs.cne = 'Format : lettre majuscule + 6 à 12 chiffres';
  }
  if (!form.appogee.trim()) {
    errs.appogee = 'Apogée requis';
  } else if (!/^\d+$/.test(form.appogee.trim())) {
    errs.appogee = 'Numérique uniquement';
  }
  if (form.accessGrade === '' || Number(form.accessGrade) < 10) {
    errs.accessGrade = 'Note d\'accès ≥ 10';
  }
  if (form.bacYear.trim() && !/^\d{4}$/.test(form.bacYear.trim())) {
    errs.bacYear = '4 chiffres requis';
  }
  return errs;
}

function EditStudentModal({ opened, onClose, student }: { opened: boolean; onClose: () => void; student: StudentResponse }) {
  const notify = useNotify();
  const [updateStudent, { isLoading }] = useUpdateStudentMutation();
  const [errors, setErrors] = useState<Partial<Record<keyof StudentForm, string>>>({});

  const [form, setForm] = useState<StudentForm>({
    firstName: student.firstName, lastName: student.lastName,
    email: student.email, cin: student.cin ?? '',
    cne: student.cne, appogee: student.appogee,
    accessGrade: student.accessGrade, ranking: student.ranking ?? ('' as number | ''),
    academicProgram: student.academicProgram as AcademicProgram,
    bacSeries: student.bacSeries, bacYear: student.bacYear,
    gender: student.gender as string,
    civilStatus: student.civilStatus,
    nationalityStatus: student.nationalityStatus,
    dateOfBirth: student.dateOfBirth ?? '', placeOfBirth: student.placeOfBirth ?? '',
    fullAddress: student.fullAddress ?? '',
  });

  useEffect(() => {
    if (opened) {
      setErrors({});
      setForm({
        firstName: student.firstName, lastName: student.lastName,
        email: student.email, cin: student.cin ?? '',
        cne: student.cne, appogee: student.appogee,
        accessGrade: student.accessGrade, ranking: student.ranking ?? '',
        academicProgram: student.academicProgram as AcademicProgram,
        bacSeries: student.bacSeries, bacYear: student.bacYear,
        gender: student.gender as string,
        civilStatus: student.civilStatus,
        nationalityStatus: student.nationalityStatus,
        dateOfBirth: student.dateOfBirth ?? '', placeOfBirth: student.placeOfBirth ?? '',
        fullAddress: student.fullAddress ?? '',
      });
    }
  }, [opened, student]);

  const field = <K extends keyof typeof form>(k: K, v: typeof form[K]) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    const errs = validateStudent(form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    try {
      await updateStudent({
        id: student.id,
        email: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        cin: form.cin.trim() || undefined,
        cne: form.cne.trim(),
        appogee: form.appogee.trim(),
        accessGrade: Number(form.accessGrade),
        academicProgram: form.academicProgram,
        bacSeries: form.bacSeries,
        bacYear: form.bacYear.trim(),
        gender: form.gender as 'Male' | 'Female',
        civilStatus: form.civilStatus as 'Civil' | 'Militaire',
        nationalityStatus: form.nationalityStatus as 'Marocaine' | 'Etrangaire',
        dateOfBirth: form.dateOfBirth || undefined,
        placeOfBirth: form.placeOfBirth.trim() || undefined,
        fullAddress: form.fullAddress.trim() || undefined,
        ranking: form.ranking !== '' ? Number(form.ranking) : undefined,
      }).unwrap();
      notify.success('Profil étudiant mis à jour');
      onClose();
    } catch {
      notify.error('Erreur lors de la mise à jour');
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Modifier l'étudiant" radius="lg" size="lg">
      <Stack gap="md">
        <Group grow>
          <TextInput label="Prénom" value={form.firstName} onChange={(e) => field('firstName', e.target.value)} radius="md" required error={errors.firstName} />
          <TextInput label="Nom" value={form.lastName} onChange={(e) => field('lastName', e.target.value)} radius="md" required error={errors.lastName} />
        </Group>
        <TextInput label="Email" type="email" value={form.email} onChange={(e) => field('email', e.target.value)} radius="md" required error={errors.email} />
        <Group grow>
          <TextInput label="CNE" value={form.cne} onChange={(e) => field('cne', e.target.value)} radius="md" required ff="monospace" error={errors.cne} />
          <TextInput label="Apogée" value={form.appogee} onChange={(e) => field('appogee', e.target.value)} radius="md" required ff="monospace" error={errors.appogee} />
        </Group>
        <Group grow>
          <TextInput label="CIN" value={form.cin} onChange={(e) => field('cin', e.target.value)} radius="md" ff="monospace" />
          <TextInput label="Classement" type="number" value={String(form.ranking)} onChange={(e) => field('ranking', e.target.value ? Number(e.target.value) : '')} radius="md" />
        </Group>
        <Group grow>
          <Select label="Filière" data={PROGRAM_OPTIONS} value={form.academicProgram} onChange={(v) => field('academicProgram', (v ?? 'Medecine') as AcademicProgram)} radius="md" required />
          <TextInput label="Note d'accès" type="number" value={String(form.accessGrade)} onChange={(e) => field('accessGrade', Number(e.target.value))} radius="md" required error={errors.accessGrade} />
        </Group>
        <Group grow>
          <Select label="Série Bac" data={BAC_OPTIONS} value={form.bacSeries} onChange={(v) => field('bacSeries', v ?? 'SVT')} radius="md" />
          <TextInput label="Année Bac" value={form.bacYear} onChange={(e) => field('bacYear', e.target.value)} radius="md" error={errors.bacYear} />
        </Group>
        <Group grow>
          <Select label="Genre" data={GENDER_OPTIONS} value={form.gender} onChange={(v) => field('gender', v ?? 'Male')} radius="md" />
          <Select label="Statut civil" data={CIVIL_OPTIONS} value={form.civilStatus} onChange={(v) => field('civilStatus', v ?? 'Civil')} radius="md" />
        </Group>
        <Group grow>
          <Select label="Nationalité" data={NATIONAL_OPTIONS} value={form.nationalityStatus} onChange={(v) => field('nationalityStatus', v ?? 'Marocaine')} radius="md" />
          <TextInput label="Date de naissance" type="date" value={form.dateOfBirth} onChange={(e) => field('dateOfBirth', e.target.value)} radius="md" />
        </Group>
        <Group grow>
          <TextInput label="Lieu de naissance" value={form.placeOfBirth} onChange={(e) => field('placeOfBirth', e.target.value)} radius="md" />
          <TextInput label="Adresse complète" value={form.fullAddress} onChange={(e) => field('fullAddress', e.target.value)} radius="md" />
        </Group>
        <Group justify="flex-end" pt="xs">
          <Button variant="subtle" color="gray" radius="md" onClick={onClose}>Annuler</Button>
          <Button color="navy" radius="md" loading={isLoading} onClick={handleSave}>Enregistrer</Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminStudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: student, isLoading } = useGetStudentByIdQuery(id ?? '', { skip: !id });
  const [modalOpen, setModalOpen]   = useState(false);
  const [editOpen,  setEditOpen]    = useState(false);

  const initStr    = student ? initials(student.firstName, student.lastName) : '';
  const levelLabel = student?.currentRegistration
    ? formatLevel(student.currentRegistration.level.year, student.currentRegistration.level.academicProgram)
    : student ? formatProgram(student.academicProgram) : '';

  return (
    <Container fluid>
      <Stack gap="xl">
        {/* Back + title */}
        <Group gap="sm" justify="space-between">
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
          {student && (
            <Button
              leftSection={<IconPencil size={15} stroke={1.5} />}
              variant="light" color="navy" radius="md" size="sm"
              onClick={() => setEditOpen(true)}
            >
              Modifier
            </Button>
          )}
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

      {student && (
        <EditStudentModal
          opened={editOpen}
          onClose={() => setEditOpen(false)}
          student={student}
        />
      )}
    </Container>
  );
}
