import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
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
import { usePagedFilters } from '../../../common/hooks/usePagedFilters';
import { skipToken } from '@reduxjs/toolkit/query';
import { ConfirmModal } from '../../../common/components/ConfirmModal';
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconArrowsExchange,
  IconArrowsTransferUp,
  IconPlaneDeparture,
  IconTrash,
  IconUserEdit,
  IconUsers,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useGetGroupByIdQuery,
  useGetAcademicGroupOptionsQuery,
  useGetInternshipAssignmentsQuery,
  useGetServicesQuery,
  useTransferStudentMutation,
  useChangeStudentGroupMutation,
  useSwapStudentGroupsMutation,
  useDelocalizeStudentMutation,
  useEmptyGroupMutation,
} from '../api/adminApi';
import type {
  AcademicGroupResponse,
  DelocalizationOutcome,
  GroupStudentResponse,
  TransferType,
} from '../types/admin.types';
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

// ─── Changement de groupe ─────────────────────────────────────────────────────

/**
 * The rosters a correction may target.
 *
 * ⚠ Same promotion only, and never « Non réparti ». Both are refused server-side — a roster of
 * another promotion runs stages this student does not owe, and the bucket carries no cohorte at all —
 * but an option that can only produce a refusal is one the admin has to try before learning it is not
 * one. The promotion is read off the current roster rather than passed in: `GroupDetailResponse`
 * carries no level, and the options list already knows.
 */
function siblingRosterOptions(groups: AcademicGroupResponse[], currentGroupId: number) {
  const promotionId = groups.find((g) => g.id === currentGroupId)?.levelId ?? null;

  return groups
    .filter((g) =>
      g.id !== currentGroupId
      && g.levelId !== null
      && (promotionId === null || g.levelId === promotionId))
    .map((g) => ({ value: String(g.id), label: `${g.label} — ${g.studentCount} étudiant(s)` }));
}

/** The sentence both modals show, because it is the whole difference from a transfert. */
function SilentActNotice() {
  return (
    <Alert
      variant="light"
      color="orange"
      radius="md"
      icon={<IconAlertTriangle size={16} stroke={1.5} />}
    >
      <Text size="xs">
        Ce n’est pas un transfert : aucune trace n’est conservée sur le dossier de l’étudiant. Ses
        affectations, ses cohortes et ses périodes sont réécrites sur le groupe d’arrivée, et tout se
        lira comme s’il y avait été réparti dès le départ. Le groupe d’origine ne sera plus indiqué
        nulle part — seul le journal des actions en gardera la trace.
      </Text>
      <Text size="xs" mt={6}>
        À utiliser pour <b>corriger</b> une répartition. Si l’étudiant a réellement commencé ses
        rotations dans son groupe actuel, l’action sera refusée : utilisez alors un transfert.
      </Text>
    </Alert>
  );
}

function ChangeGroupModal({ student, academicYearId, currentGroupId, opened, onClose }: {
  student: GroupStudentResponse | null;
  academicYearId: number;
  currentGroupId: number;
  opened: boolean;
  onClose: () => void;
}) {
  const notify = useNotify();
  const [targetGroupId, setTargetGroupId] = useState<string | null>(null);
  const [understood, setUnderstood]       = useState(false);
  const [change, { isLoading }]           = useChangeStudentGroupMutation();

  const { data: groups = [] } = useGetAcademicGroupOptionsQuery(
    academicYearId ? { academicYearId } : {}
  );

  const groupOptions = useMemo(
    () => siblingRosterOptions(groups, currentGroupId),
    [groups, currentGroupId],
  );

  const reset = () => {
    setTargetGroupId(null);
    setUnderstood(false);
  };

  const handleChange = async () => {
    if (!student || !targetGroupId || !understood) return;
    try {
      const report = await change({
        registrationId: student.registrationId,
        targetGroupId:  Number(targetGroupId),
        studentId:      student.studentId,
        sourceGroupId:  currentGroupId,
      }).unwrap();

      // The origin roster is named here because this is the last place it exists: the act deliberately
      // writes it nowhere on the student's file.
      notify.success(
        `${report.studentName} — ${report.fromGroupLabel} → ${report.toGroupLabel}`
        + ` · ${report.affectationsMoved} affectation(s) déplacée(s)`
        + (report.affectationsCreated > 0 ? `, ${report.affectationsCreated} créée(s)` : '')
        + ` · ${report.periodsCreated} période(s) reconstruite(s)`
        + (report.adHocPeriodsKept > 0 ? ` · ${report.adHocPeriodsKept} hors grille conservée(s)` : ''),
      );
      reset();
      onClose();
    } catch {
      // errorMiddleware already toasts the server's own sentence — and here it is the sentence that
      // matters, since every refusal names what to do instead.
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Changer de groupe — ${student?.fullName ?? ''}`}
      radius="lg"
      size="md"
    >
      <Stack gap="md">
        <SilentActNotice />

        <Select
          label="Groupe d’arrivée"
          placeholder={groupOptions.length ? 'Choisir un groupe' : 'Aucun autre groupe de cette promotion'}
          data={groupOptions}
          value={targetGroupId}
          onChange={setTargetGroupId}
          disabled={!groupOptions.length}
          searchable
          required
        />

        <Checkbox
          checked={understood}
          onChange={(e) => setUnderstood(e.currentTarget.checked)}
          label="Je comprends que ce changement ne laissera aucune trace sur le dossier de l’étudiant"
        />

        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={onClose}>Annuler</Button>
          <Button
            color="orange"
            loading={isLoading}
            disabled={!targetGroupId || !understood}
            leftSection={<IconUserEdit size={16} stroke={1.5} />}
            onClick={handleChange}
          >
            Changer de groupe
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

/**
 * Échanger deux étudiants — two changements in one act.
 *
 * ⚠ It exists because moving one student alone leaves one roster short and the other over. The
 * partner is picked from a roster rather than from the whole promotion: « échange-le avec quelqu’un
 * du groupe 12 » is the way the question is actually asked, and it keeps the list bounded.
 */
function SwapModal({ student, academicYearId, currentGroupId, opened, onClose }: {
  student: GroupStudentResponse | null;
  academicYearId: number;
  currentGroupId: number;
  opened: boolean;
  onClose: () => void;
}) {
  const notify = useNotify();
  const [partnerGroupId, setPartnerGroupId] = useState<string | null>(null);
  const [partnerId, setPartnerId]           = useState<string | null>(null);
  const [search, setSearch]                 = useState('');
  const [debouncedSearch]                   = useDebouncedValue(search, 350);
  const [understood, setUnderstood]         = useState(false);
  const [swap, { isLoading }]               = useSwapStudentGroupsMutation();

  const { data: groups = [] } = useGetAcademicGroupOptionsQuery(
    academicYearId ? { academicYearId } : {}
  );

  const groupOptions = useMemo(
    () => siblingRosterOptions(groups, currentGroupId),
    [groups, currentGroupId],
  );

  // A roster holds six or seven students, so one page is the whole list; the debounced search is
  // there for the admin who knows the name and not the group.
  const { data: partnerGroup, isFetching } = useGetGroupByIdQuery(
    partnerGroupId
      ? {
          id: Number(partnerGroupId),
          pageSize: 50,
          searchTerm: debouncedSearch.length >= 2 ? debouncedSearch : undefined,
        }
      : skipToken,
  );

  const partnerOptions = (partnerGroup?.students.items ?? [])
    .map((s) => ({ value: s.registrationId, label: `${s.fullName} — ${s.cne}` }));

  const reset = () => {
    setPartnerGroupId(null);
    setPartnerId(null);
    setSearch('');
    setUnderstood(false);
  };

  const handleSwap = async () => {
    if (!student || !partnerId || !understood) return;
    try {
      const report = await swap({
        firstRegistrationId:  student.registrationId,
        secondRegistrationId: partnerId,
        firstGroupId:         currentGroupId,
        secondGroupId:        Number(partnerGroupId),
      }).unwrap();

      notify.success(
        `${report.first.studentName} → ${report.first.toGroupLabel}`
        + ` · ${report.second.studentName} → ${report.second.toGroupLabel}`,
      );
      reset();
      onClose();
    } catch {
      // errorMiddleware toasts the server's sentence; a refusal on either half moved nobody.
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Échanger — ${student?.fullName ?? ''}`}
      radius="lg"
      size="md"
    >
      <Stack gap="md">
        <SilentActNotice />

        <Select
          label="Groupe du second étudiant"
          placeholder={groupOptions.length ? 'Choisir un groupe' : 'Aucun autre groupe de cette promotion'}
          data={groupOptions}
          value={partnerGroupId}
          onChange={(v) => { setPartnerGroupId(v); setPartnerId(null); setSearch(''); }}
          disabled={!groupOptions.length}
          searchable
          required
        />

        <Select
          label="Étudiant à échanger"
          placeholder={partnerGroupId ? 'Choisir un étudiant' : 'Choisissez d’abord un groupe'}
          data={partnerOptions}
          value={partnerId}
          onChange={setPartnerId}
          disabled={!partnerGroupId}
          searchable
          searchValue={search}
          onSearchChange={setSearch}
          rightSection={isFetching ? <Loader size={14} /> : null}
          nothingFoundMessage={isFetching ? 'Recherche…' : 'Aucun étudiant'}
          required
        />

        <Checkbox
          checked={understood}
          onChange={(e) => setUnderstood(e.currentTarget.checked)}
          label="Je comprends que cet échange ne laissera aucune trace sur les deux dossiers"
        />

        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={onClose}>Annuler</Button>
          <Button
            color="orange"
            loading={isLoading}
            disabled={!partnerId || !understood}
            leftSection={<IconArrowsExchange size={16} stroke={1.5} />}
            onClick={handleSwap}
          >
            Échanger
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
  const [changeTarget,   setChangeTarget]   = useState<GroupStudentResponse | null>(null);
  const [swapTarget,     setSwapTarget]     = useState<GroupStudentResponse | null>(null);
  const [modalOpen,   { open: openModal,  close: closeModal  }] = useDisclosure(false);
  const [delocOpen,   { open: openDeloc,  close: closeDeloc  }] = useDisclosure(false);
  const [changeOpen,  { open: openChange, close: closeChange }] = useDisclosure(false);
  const [swapOpen,    { open: openSwap,   close: closeSwap   }] = useDisclosure(false);
  const [emptyOpen,   { open: openEmpty,  close: closeEmpty  }] = useDisclosure(false);
  // What emptying would strand, when the server refuses because the roster still holds affectations.
  // Confirming a second time re-sends with dropAffectations.
  const [emptyWarning, setEmptyWarning] = useState<string | null>(null);

  // The roster is paged: "Non réparti" holds 4,725 students for 2025-2026, and rendering that in one
  // table is what took the browser down. Search is debounced per the project rule — the input stays
  // instant while only the settled term reaches the server.
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 350);
  const [page, setPage] = usePagedFilters(debouncedSearch);

  const { data: group, isLoading, isFetching } = useGetGroupByIdQuery({
    id: groupId,
    pageNumber: page,
    pageSize: 25,
    searchTerm: debouncedSearch.length >= 2 ? debouncedSearch : undefined,
  });

  const [emptyGroup, { isLoading: emptying }] = useEmptyGroupMutation();

  const handleEmpty = async () => {
    const dropAffectations = emptyWarning !== null;
    try {
      const res = await emptyGroup({ id: groupId, dropAffectations }).unwrap();
      notify.success(
        `${res.unassigned} étudiant(s) désassigné(s)`
        + (res.affectationsRemoved > 0
          ? ` — ${res.affectationsRemoved} affectation(s) et ${res.periodsRemoved} période(s) supprimée(s)`
          : ''),
      );
    } catch (error) {
      const problem = error as { data?: { detail?: string; title?: string } };
      const detail = problem.data?.detail;
      if (!dropAffectations && problem.data?.title === 'AcademicGroups.RosterHasAffectations' && detail) {
        setEmptyWarning(detail);
        return;   // modal stays open, now naming what would be left behind
      }
      // No notify.error here: errorMiddleware already toasts every rejected mutation in the server's
      // own words. Adding one printed the identical sentence twice — verified on the running stack.
    }
    closeEmptyDialog();
  };

  const closeEmptyDialog = () => {
    closeEmpty();
    setEmptyWarning(null);
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
                          <Tooltip
                            label="Changer de groupe (correction, sans trace)"
                            position="left"
                          >
                            <ActionIcon
                              variant="subtle" color="orange" size="sm" radius="md"
                              onClick={() => { setChangeTarget(s); openChange(); }}
                            >
                              <IconUserEdit size={14} stroke={1.5} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip
                            label="Échanger avec un étudiant d'un autre groupe (sans trace)"
                            position="left"
                          >
                            <ActionIcon
                              variant="subtle" color="orange" size="sm" radius="md"
                              onClick={() => { setSwapTarget(s); openSwap(); }}
                            >
                              <IconArrowsExchange size={14} stroke={1.5} />
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

      <ChangeGroupModal
        student={changeTarget}
        academicYearId={group?.academicYearId ?? 0}
        currentGroupId={groupId}
        opened={changeOpen}
        onClose={() => { closeChange(); setChangeTarget(null); }}
      />

      <SwapModal
        student={swapTarget}
        academicYearId={group?.academicYearId ?? 0}
        currentGroupId={groupId}
        opened={swapOpen}
        onClose={() => { closeSwap(); setSwapTarget(null); }}
      />

      <DelocalizeModal
        student={delocTarget}
        opened={delocOpen}
        onClose={() => { closeDeloc(); setDelocTarget(null); }}
      />

      <ConfirmModal
        opened={emptyOpen}
        onClose={closeEmptyDialog}
        title="Vider le groupe"
        message={
          emptyWarning
            ?? `Vider le groupe "${group?.label}" ? Tous les étudiants seront désassignés et pourront être répartis à nouveau.`
        }
        confirmLabel={emptyWarning ? 'Vider et supprimer les affectations' : 'Vider'}
        confirmColor="red"
        onConfirm={handleEmpty}
        loading={emptying}
      />
    </Container>
  );
}
