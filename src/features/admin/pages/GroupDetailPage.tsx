import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Modal,
  Select,
  Skeleton,
  Stack,
  Table,
  Text,
  Textarea,
  Title,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconArrowLeft,
  IconArrowsTransferUp,
  IconUsers,
} from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useGetGroupByIdQuery,
  useGetAcademicGroupsQuery,
  useTransferStudentMutation,
} from '../api/adminApi';
import type { GroupStudentResponse } from '../types/admin.types';
import { useNotify } from '../../../common/hooks/useNotify';
import { RegistrationBadge } from '../../student/components/RegistrationBadge';
import { PATHS } from '../../../routes/paths';

// ─── Transfer modal ───────────────────────────────────────────────────────────

function TransferModal({ student, currentGroupYearId, opened, onClose }: {
  student: GroupStudentResponse | null;
  currentGroupYearId: number;
  opened: boolean;
  onClose: () => void;
}) {
  const notify = useNotify();
  const [targetGroupId, setTargetGroupId] = useState<string | null>(null);
  const [reason, setReason]               = useState('');
  const [transfer, { isLoading }]         = useTransferStudentMutation();

  const { data: groups = [] } = useGetAcademicGroupsQuery(
    currentGroupYearId ? { academicYearId: currentGroupYearId } : {}
  );

  const groupOptions = groups
    .filter((g) => String(g.id) !== String(currentGroupYearId))
    .map((g) => ({ value: String(g.id), label: g.label }));

  const handleTransfer = async () => {
    if (!student || !targetGroupId) return;
    try {
      await transfer({
        registrationId: student.registrationId,
        targetGroupId:  Number(targetGroupId),
        reason:         reason.trim() || undefined,
      }).unwrap();
      notify.success(`${student.fullName} transféré(e)`);
      setTargetGroupId(null);
      setReason('');
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
          label="Motif du transfert (optionnel)"
          placeholder="Raison du changement de groupe…"
          value={reason}
          onChange={(e) => setReason(e.currentTarget.value)}
          minRows={2}
          maxRows={4}
          autosize
        />
        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={onClose}>Annuler</Button>
          <Button
            color="navy"
            loading={isLoading}
            disabled={!targetGroupId}
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

  const [transferTarget, setTransferTarget] = useState<GroupStudentResponse | null>(null);
  const [modalOpen, { open: openModal, close: closeModal }] = useDisclosure(false);

  const { data: group, isLoading } = useGetGroupByIdQuery(groupId);

  return (
    <Container fluid>
      <Stack gap="xl">
        {/* Header */}
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
                      <Table.Td><Text size="sm" fw={500}>{s.fullName}</Text></Table.Td>
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
      </Stack>

      <TransferModal
        student={transferTarget}
        currentGroupYearId={group?.academicYearId ?? 0}
        opened={modalOpen}
        onClose={() => { closeModal(); setTransferTarget(null); }}
      />
    </Container>
  );
}
