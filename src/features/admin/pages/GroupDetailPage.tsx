import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Loader,
  Modal,
  Pagination,
  SegmentedControl,
  Select,
  Skeleton,
  Stack,
  Switch,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import { skipToken } from '@reduxjs/toolkit/query';
import { ConfirmModal } from '../../../common/components/ConfirmModal';
import {
  IconArrowLeft,
  IconArrowsTransferUp,
  IconPlaneDeparture,
  IconTrash,
  IconUsers,
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useGetGroupByIdQuery,
  useGetAcademicGroupOptionsQuery,
  useGetInternshipAssignmentsQuery,
  useGetServicesQuery,
  useTransferStudentMutation,
  useDelocalizeStudentMutation,
  useEmptyGroupMutation,
} from '../api/adminApi';
import type { DelocalizationOutcome, GroupStudentResponse, TransferType } from '../types/admin.types';
import { useNotify } from '../../../common/hooks/useNotify';
import { RegistrationBadge } from '../../student/components/RegistrationBadge';

import { PATHS } from '../../../routes/paths';

// ─── Transfer modal ───────────────────────────────────────────────────────────

function TransferModal({ student, academicYearId, currentGroupId, opened, onClose }: {
  student: GroupStudentResponse | null;
  academicYearId: number;
  currentGroupId: number;
  opened: boolean;
  onClose: () => void;
}) {
  const notify = useNotify();
  const [type, setType]                   = useState<TransferType>('Temporary');
  const [targetGroupId, setTargetGroupId] = useState<string | null>(null);
  const [stageId, setStageId]             = useState<string | null>(null);
  const [reschedule, setReschedule]       = useState(false);
  const [reason, setReason]               = useState('');
  const [transfer, { isLoading }]         = useTransferStudentMutation();

  const { data: groups = [] } = useGetAcademicGroupOptionsQuery(
    academicYearId ? { academicYearId } : {}
  );

  // A temporary transfer moves one stage only, so list this student's still-movable assignments.
  const { data: assignments } = useGetInternshipAssignmentsQuery(
    student ? { registrationId: student.registrationId, pageSize: 200 } : skipToken
  );

  const stageOptions = (assignments?.items ?? [])
    .filter((a) => a.status === 'Planned' || a.status === 'Ongoing')
    .map((a) => ({ value: String(a.stageId), label: a.stageName }));

  // Exclude the student's own group — you can't transfer someone into the group they're already in.
  const groupOptions = groups
    .filter((g) => g.id !== currentGroupId)
    .map((g) => ({ value: String(g.id), label: g.label }));

  const stageMissing = type === 'Temporary' && !stageId;
  const canSubmit = !!targetGroupId && !!reason.trim() && !stageMissing;

  const reset = () => {
    setType('Temporary');
    setTargetGroupId(null);
    setStageId(null);
    setReschedule(false);
    setReason('');
  };

  const handleTransfer = async () => {
    if (!student || !canSubmit) return;
    try {
      await transfer({
        registrationId: student.registrationId,
        targetGroupId:  Number(targetGroupId),
        reason:         reason.trim(),
        type,
        stageId:        type === 'Temporary' ? Number(stageId) : undefined,
        reschedule,
      }).unwrap();
      notify.success(`${student.fullName} transféré(e)`);
      reset();
      onClose();
    } catch {
      notify.error('Impossible de transférer cet étudiant');
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Transférer — ${student?.fullName ?? ''}`}
      radius="lg"
      size="sm"
    >
      <Stack gap="md">
        <SegmentedControl
          fullWidth
          value={type}
          onChange={(v) => setType(v as TransferType)}
          data={[
            { value: 'Temporary', label: 'Temporaire (1 stage)' },
            { value: 'Definitive', label: 'Définitif (année)' },
          ]}
        />
        <Text size="xs" c="dimmed">
          {type === 'Temporary'
            ? "L'étudiant rejoint le groupe cible pour un seul stage, puis revient automatiquement à son groupe d'origine une fois le stage terminé."
            : "Changement de groupe permanent pour le reste de l'année : tous les stages à venir suivront le nouveau groupe."}
        </Text>

        {type === 'Temporary' && (
          <Select
            label="Stage concerné"
            placeholder={stageOptions.length ? 'Choisir un stage' : 'Aucun stage en cours'}
            data={stageOptions}
            value={stageId}
            onChange={setStageId}
            disabled={!stageOptions.length}
            searchable
            required
          />
        )}

        <Select
          label="Groupe cible"
          placeholder="Choisir un groupe"
          data={groupOptions}
          value={targetGroupId}
          onChange={setTargetGroupId}
          searchable
          required
        />
        <Textarea
          label="Motif du transfert"
          placeholder="Raison du changement de groupe…"
          value={reason}
          onChange={(e) => setReason(e.currentTarget.value)}
          minRows={2}
          maxRows={4}
          autosize
          required
        />
        <Switch
          checked={reschedule}
          onChange={(e) => setReschedule(e.currentTarget.checked)}
          label="Transfert en cours de stage"
          description="Cas exceptionnel : réaffecte immédiatement la rotation en cours vers le service du groupe cible (la période en cours est clôturée à la date du transfert et conservée dans l'historique). Le groupe cible doit avoir une répartition planifiée pour les périodes concernées."
        />
        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={onClose}>Annuler</Button>
          <Button
            color="navy"
            loading={isLoading}
            disabled={!canSubmit}
            leftSection={<IconArrowsTransferUp size={16} stroke={1.5} />}
            onClick={handleTransfer}
          >
            Transférer
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// ─── Delocalization modal ───────────────────────────────────────────────────────

function DelocalizeModal({ student, opened, onClose }: {
  student: GroupStudentResponse | null;
  opened: boolean;
  onClose: () => void;
}) {
  const notify = useNotify();
  const [stageId, setStageId]               = useState<string | null>(null);
  const [service, setService]               = useState<{ value: string; label: string } | null>(null);
  const [serviceSearch, setServiceSearch]   = useState('');
  const [debouncedServiceSearch]            = useDebouncedValue(serviceSearch, 300);
  const [range, setRange]                   = useState<[string | null, string | null]>([null, null]);
  const [reason, setReason]                 = useState('');
  const [outcome, setOutcome]               = useState<'none' | DelocalizationOutcome>('none');
  const [fiche, setFiche]                   = useState('');
  const [delocalize, { isLoading }]         = useDelocalizeStudentMutation();

  // Délocalisation is a whole-stage move out of faculty, so only stages not yet started qualify.
  const { data: assignments } = useGetInternshipAssignmentsQuery(
    student ? { registrationId: student.registrationId, pageSize: 200 } : skipToken
  );
  const stageOptions = (assignments?.items ?? [])
    .filter((a) => a.status === 'Planned')
    .map((a) => ({ value: String(a.stageId), label: a.stageName }));

  const { data: servicesPage, isFetching: servicesFetching } = useGetServicesQuery(
    { searchTerm: debouncedServiceSearch || undefined, pageSize: 20 },
    { skip: debouncedServiceSearch.length < 2 },
  );
  const serviceData = useMemo(() => {
    const opts = (servicesPage?.items ?? [])
      .map((s) => ({ value: String(s.id), label: `${s.name} — ${s.hospitalName}` }));
    if (service && !opts.some((o) => o.value === service.value)) opts.unshift(service);
    return opts;
  }, [servicesPage, service]);

  const [startDate, endDate] = range;
  const datesValid = !!startDate && !!endDate && endDate >= startDate;
  const ficheMissing = outcome !== 'none' && !fiche.trim();
  const canSubmit =
    !!stageId && !!service && datesValid && !!reason.trim() && !ficheMissing;

  const reset = () => {
    setStageId(null);
    setService(null);
    setServiceSearch('');
    setRange([null, null]);
    setReason('');
    setOutcome('none');
    setFiche('');
  };

  const handleDelocalize = async () => {
    if (!student || !canSubmit || !service || !startDate || !endDate) return;
    try {
      await delocalize({
        registrationId: student.registrationId,
        stageId:        Number(stageId),
        serviceId:      Number(service.value),
        startDate,
        endDate,
        reason:         reason.trim(),
        outcome:        outcome === 'none' ? undefined : outcome,
        ficheReference: outcome === 'none' ? undefined : fiche.trim(),
      }).unwrap();
      notify.success(`${student.fullName} — stage délocalisé enregistré`);
      reset();
      onClose();
    } catch {
      notify.error('Impossible d’enregistrer la délocalisation');
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Délocaliser un stage — ${student?.fullName ?? ''}`}
      radius="lg"
      size="sm"
    >
      <Stack gap="md">
        <Text size="xs" c="dimmed">
          L’étudiant effectue la totalité du stage hors faculté (ville d’origine, étranger…). La faculté
          n’a aucun contrôle sur le déroulement ; la période est enregistrée comme terminée et la
          validation est saisie à partir de la fiche papier rapportée par l’étudiant.
        </Text>

        <Select
          label="Stage concerné"
          placeholder={stageOptions.length ? 'Choisir un stage' : 'Aucun stage planifié'}
          data={stageOptions}
          value={stageId}
          onChange={setStageId}
          disabled={!stageOptions.length}
          searchable
          required
        />

        <Select
          label="Service externe (hors faculté)"
          placeholder="Rechercher un service (min. 2 car.)…"
          data={serviceData}
          value={service?.value ?? null}
          searchable
          searchValue={serviceSearch}
          onSearchChange={setServiceSearch}
          onChange={(val, opt) => setService(val ? { value: val, label: opt.label } : null)}
          rightSection={servicesFetching ? <Loader size={14} /> : null}
          nothingFoundMessage={serviceSearch.length < 2 ? 'Tapez pour rechercher…' : 'Aucun service'}
          required
        />
        <Text size="xs" c="dimmed">
          Ajoutez d’abord l’hôpital / service externe dans « Infrastructures » s’il n’existe pas encore.
        </Text>

        <DatePickerInput
          type="range"
          label="Période du stage (début → fin)"
          placeholder="Sélectionnez les dates"
          value={range}
          onChange={setRange}
          allowSingleDateInRange
          numberOfColumns={2}
          popoverProps={{ withinPortal: true }}
          required
        />

        <Textarea
          label="Motif de la délocalisation"
          placeholder="Raison (ville d’origine, convention, etc.)…"
          value={reason}
          onChange={(e) => setReason(e.currentTarget.value)}
          minRows={2}
          maxRows={4}
          autosize
          required
        />

        <SegmentedControl
          fullWidth
          value={outcome}
          onChange={(v) => setOutcome(v as 'none' | DelocalizationOutcome)}
          data={[
            { value: 'none',         label: 'Validation plus tard' },
            { value: 'Validated',    label: 'Validé' },
            { value: 'NotValidated', label: 'Non validé' },
          ]}
        />
        {outcome !== 'none' && (
          <TextInput
            label="Référence de la fiche de validation"
            placeholder="N° / lien / note de la fiche papier"
            value={fiche}
            onChange={(e) => setFiche(e.currentTarget.value)}
            required
          />
        )}

        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={onClose}>Annuler</Button>
          <Button
            color="navy"
            loading={isLoading}
            disabled={!canSubmit}
            leftSection={<IconPlaneDeparture size={16} stroke={1.5} />}
            onClick={handleDelocalize}
          >
            Enregistrer
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GroupDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const groupId  = Number(id);
  const navigate = useNavigate();
  const notify   = useNotify();

  const [transferTarget, setTransferTarget] = useState<GroupStudentResponse | null>(null);
  const [delocTarget,    setDelocTarget]    = useState<GroupStudentResponse | null>(null);
  const [modalOpen,   { open: openModal,  close: closeModal  }] = useDisclosure(false);
  const [delocOpen,   { open: openDeloc,  close: closeDeloc  }] = useDisclosure(false);
  const [emptyOpen,   { open: openEmpty,  close: closeEmpty  }] = useDisclosure(false);

  // The roster is paged: "Non réparti" holds 4,725 students for 2025-2026, and rendering that in one
  // table is what took the browser down. Search is debounced per the project rule — the input stays
  // instant while only the settled term reaches the server.
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 350);
  useEffect(() => setPage(1), [debouncedSearch]);

  const { data: group, isLoading, isFetching } = useGetGroupByIdQuery({
    id: groupId,
    pageNumber: page,
    pageSize: 25,
    searchTerm: debouncedSearch.length >= 2 ? debouncedSearch : undefined,
  });

  const [emptyGroup, { isLoading: emptying }] = useEmptyGroupMutation();

  const handleEmpty = async () => {
    try {
      const res = await emptyGroup(groupId).unwrap();
      notify.success(`${res.unassigned} étudiant(s) désassigné(s)`);
    } catch {
      notify.error('Impossible de vider ce groupe');
    }
    closeEmpty();
  };

  return (
    <Container fluid>
      <Stack gap="xl">
        {/* Header */}
        <Group gap="sm" justify="space-between">
          <Group gap="sm">
            <ActionIcon variant="subtle" color="gray" radius="md"
              onClick={() => navigate(`${PATHS.ADMIN.ROOT}/groups`)}>
              <IconArrowLeft size={18} stroke={1.5} />
            </ActionIcon>
            {isLoading ? (
              <Skeleton height={28} width={240} radius="sm" />
            ) : (
              <Stack gap={2}>
                <Title order={2} fw={700}>{group?.label}</Title>
                <Text size="xs" c="dimmed">{group?.academicYearLabel}</Text>
              </Stack>
            )}
          </Group>
          {!isLoading && (group?.studentCount ?? 0) > 0 && (
            <Tooltip label="Désassigner tous les étudiants du groupe" position="left">
              <Button
                variant="light"
                color="red"
                size="sm"
                loading={emptying}
                leftSection={<IconTrash size={14} stroke={1.5} />}
                onClick={openEmpty}
              >
                Vider le groupe
              </Button>
            </Tooltip>
          )}
        </Group>

        {/* Students */}
        <Card padding="lg" radius="lg" withBorder shadow="sm">
          <Stack gap="md">
            <Group justify="space-between" wrap="nowrap">
              <Group gap="sm" wrap="nowrap">
                <IconUsers size={18} stroke={1.5} color="#0F4C81" />
                <Text fw={600} size="sm">
                  {isLoading ? '…' : `${group?.studentCount ?? 0} étudiant(s)`}
                </Text>
                {/* isFetching, not isLoading: the table must not unmount while a page or search settles. */}
                {isFetching && !isLoading && <Loader size="xs" />}
              </Group>
              <TextInput
                placeholder="Rechercher (nom, CNE, Apogée, e-mail)…"
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
                w={320}
                size="sm"
              />
            </Group>

            <Table striped highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Nom</Table.Th>
                  <Table.Th>CNE</Table.Th>
                  <Table.Th>Email</Table.Th>
                  <Table.Th>Inscription</Table.Th>
                  <Table.Th w={60} />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <Table.Tr key={i}>
                      {[160, 100, 180, 90, 40].map((w, j) => (
                        <Table.Td key={j}><Skeleton height={14} width={w} radius="sm" /></Table.Td>
                      ))}
                    </Table.Tr>
                  ))
                ) : (group?.students.items ?? []).length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={5}>
                      <Text c="dimmed" size="sm" ta="center" py="md">
                        Aucun étudiant dans ce groupe.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  (group?.students.items ?? []).map((s) => (
                    <Table.Tr key={s.registrationId}>
                      <Table.Td>
                        <Group gap="xs" wrap="nowrap">
                          <Text size="sm" fw={500}>{s.fullName}</Text>
                          {s.loanedToGroup && (
                            <Tooltip
                              label={`En prêt temporaire vers ${s.loanedToGroup}${s.loanedStage ? ` pour le stage ${s.loanedStage}` : ''} — revient automatiquement à la fin du stage`}
                              multiline
                              w={240}
                            >
                              <Badge
                                variant="light"
                                color="grape"
                                size="sm"
                                radius="sm"
                                leftSection={<IconArrowsTransferUp size={11} stroke={1.5} />}
                              >
                                Prêt → {s.loanedToGroup}
                                {s.loanedStage ? ` · ${s.loanedStage}` : ''}
                              </Badge>
                            </Tooltip>
                          )}
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light" color="gray" size="sm" radius="md" ff="monospace">
                          {s.cne}
                        </Badge>
                      </Table.Td>
                      <Table.Td><Text size="xs" c="dimmed">{s.email}</Text></Table.Td>
                      <Table.Td>
                        <RegistrationBadge status={s.registrationStatus} />
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4} wrap="nowrap" justify="flex-end">
                          <Tooltip label="Transférer" position="left">
                            <ActionIcon
                              variant="subtle" color="navy" size="sm" radius="md"
                              onClick={() => { setTransferTarget(s); openModal(); }}
                            >
                              <IconArrowsTransferUp size={14} stroke={1.5} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Délocaliser un stage (hors faculté)" position="left">
                            <ActionIcon
                              variant="subtle" color="teal" size="sm" radius="md"
                              onClick={() => { setDelocTarget(s); openDeloc(); }}
                            >
                              <IconPlaneDeparture size={14} stroke={1.5} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>

            {(group?.students.totalPages ?? 0) > 1 && (
              <Group justify="space-between" wrap="nowrap">
                <Text size="xs" c="dimmed">
                  {group!.students.totalCount} résultat(s) — page {group!.students.pageNumber} / {group!.students.totalPages}
                </Text>
                <Pagination
                  value={page}
                  onChange={setPage}
                  total={group?.students.totalPages ?? 1}
                  size="sm"
                  radius="md"
                  withEdges
                />
              </Group>
            )}
          </Stack>
        </Card>

        {/* Incoming temporary loans — students from other groups doing one stage here */}
        {!isLoading && (group?.incomingLoans.length ?? 0) > 0 && (
          <Card padding="lg" radius="lg" withBorder shadow="sm">
            <Stack gap="md">
              <Group gap="sm">
                <IconArrowsTransferUp size={18} stroke={1.5} color="#9C36B5" />
                <Text fw={600} size="sm">
                  {group?.incomingLoans.length} prêt(s) entrant(s)
                </Text>
              </Group>
              <Table verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Nom</Table.Th>
                    <Table.Th>CNE</Table.Th>
                    <Table.Th>Groupe d'origine</Table.Th>
                    <Table.Th>Stage</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {(group?.incomingLoans ?? []).map((l) => (
                    <Table.Tr key={`${l.studentId}-${l.stage}`}>
                      <Table.Td><Text size="sm" fw={500}>{l.fullName}</Text></Table.Td>
                      <Table.Td>
                        <Badge variant="light" color="gray" size="sm" radius="md" ff="monospace">
                          {l.cne}
                        </Badge>
                      </Table.Td>
                      <Table.Td><Text size="sm">{l.fromGroup}</Text></Table.Td>
                      <Table.Td>
                        <Badge variant="light" color="grape" size="sm" radius="sm">{l.stage}</Badge>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Stack>
          </Card>
        )}
      </Stack>

      <TransferModal
        student={transferTarget}
        academicYearId={group?.academicYearId ?? 0}
        currentGroupId={groupId}
        opened={modalOpen}
        onClose={() => { closeModal(); setTransferTarget(null); }}
      />

      <DelocalizeModal
        student={delocTarget}
        opened={delocOpen}
        onClose={() => { closeDeloc(); setDelocTarget(null); }}
      />

      <ConfirmModal
        opened={emptyOpen}
        onClose={closeEmpty}
        title="Vider le groupe"
        message={`Vider le groupe "${group?.label}" ? Tous les étudiants seront désassignés et pourront être répartis à nouveau.`}
        confirmLabel="Vider"
        confirmColor="red"
        onConfirm={handleEmpty}
        loading={emptying}
      />
    </Container>
  );
}
