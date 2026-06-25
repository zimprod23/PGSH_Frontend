import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Modal,
  SegmentedControl,
  Select,
  Skeleton,
  Stack,
  Switch,
  Table,
  Text,
  Textarea,
  Title,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { skipToken } from '@reduxjs/toolkit/query';
import { ConfirmModal } from '../../../common/components/ConfirmModal';
import {
  IconArrowLeft,
  IconArrowsTransferUp,
  IconTrash,
  IconUsers,
} from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useGetGroupByIdQuery,
  useGetAcademicGroupsQuery,
  useGetInternshipAssignmentsQuery,
  useTransferStudentMutation,
  useEmptyGroupMutation,
} from '../api/adminApi';
import type { GroupStudentResponse, TransferType } from '../types/admin.types';
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

  const { data: groups = [] } = useGetAcademicGroupsQuery(
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GroupDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const groupId  = Number(id);
  const navigate = useNavigate();
  const notify   = useNotify();

  const [transferTarget, setTransferTarget] = useState<GroupStudentResponse | null>(null);
  const [modalOpen,   { open: openModal,  close: closeModal  }] = useDisclosure(false);
  const [emptyOpen,   { open: openEmpty,  close: closeEmpty  }] = useDisclosure(false);

  const { data: group, isLoading } = useGetGroupByIdQuery(groupId);
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
          {!isLoading && (group?.students.length ?? 0) > 0 && (
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
            <Group justify="space-between">
              <Group gap="sm">
                <IconUsers size={18} stroke={1.5} color="#0F4C81" />
                <Text fw={600} size="sm">
                  {isLoading ? '…' : `${group?.students.length ?? 0} étudiant(s)`}
                </Text>
              </Group>
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
                ) : (group?.students ?? []).length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={5}>
                      <Text c="dimmed" size="sm" ta="center" py="md">
                        Aucun étudiant dans ce groupe.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  (group?.students ?? []).map((s) => (
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
                        <Tooltip label="Transférer" position="left">
                          <ActionIcon
                            variant="subtle" color="navy" size="sm" radius="md"
                            onClick={() => { setTransferTarget(s); openModal(); }}
                          >
                            <IconArrowsTransferUp size={14} stroke={1.5} />
                          </ActionIcon>
                        </Tooltip>
                      </Table.Td>
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
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
