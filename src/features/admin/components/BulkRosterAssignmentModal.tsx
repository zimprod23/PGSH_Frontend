import {
  Alert,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Modal,
  MultiSelect,
  Pagination,
  Stack,
  Table,
  Text,
  Textarea,
  Title,
} from '@mantine/core';
import { IconAlertTriangle, IconUsersGroup } from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import {
  useApplyBulkRosterAssignmentMutation,
  useGetAcademicGroupOptionsQuery,
  usePreviewBulkRosterAssignmentMutation,
} from '../api/adminApi';
import type {
  BulkRosterAssignmentReport,
  BulkRosterAssignmentRowStatus,
} from '../types/admin.types';
import { useNotify } from '../../../common/hooks/useNotify';

/**
 * ⚠ Three families, and the middle one is not a refusal. « Déjà dans le groupe » is how most of a
 * re-sent list comes back — correcting a list and running it again is the normal use — so colouring
 * it red would make a successful second run read as a failure.
 */
const STATUS_META: Record<BulkRosterAssignmentRowStatus, { color: string; label: string }> = {
  WillJoin:           { color: 'teal',   label: 'Rejoint le groupe' },
  WillMove:           { color: 'blue',   label: 'Déplacé' },
  AlreadyThere:       { color: 'gray',   label: 'Déjà dans le groupe' },
  Underway:           { color: 'orange', label: 'Déjà engagé' },
  TargetMissingStage: { color: 'red',    label: 'Cohorte manquante' },
  WrongPromotion:     { color: 'red',    label: 'Autre promotion' },
  CursusEnded:        { color: 'red',    label: 'Cursus terminé' },
  NotFound:           { color: 'gray',   label: 'Introuvable' },
  WrongYear:          { color: 'gray',   label: 'Autre année' },
};

const ROWS_PER_PAGE = 25;

/**
 * Puts a named list of students into one roster — the composition step of a nominative placement.
 *
 * <p>A form circulates, a list of volunteers comes back, and those students are to make up the
 * roster that goes to a partner hospital. Which service that roster then goes to is the planning
 * grid's answer: a pinned cell on a service held in « Réservé ». This screen moves people and places
 * nobody.</p>
 *
 * ⚠ **Two steps, and the second carries the first's number.** The apply sends back
 * `applicableCount` exactly as the preview returned it; a registration created, transferred or
 * evaluated in between changes what the act does without changing anything on screen, and the server
 * refuses on the mismatch. A checkbox cannot catch that — which is why the button cannot be armed
 * without a preview, and why any edit to the selection drops the report.
 */
export function BulkRosterAssignmentModal({
  opened,
  onClose,
  targetGroupId,
  targetGroupLabel,
  academicYearId,
  levelId,
}: {
  opened: boolean;
  onClose: () => void;
  targetGroupId: number;
  targetGroupLabel: string;
  academicYearId: number;
  /**
   * The target roster's promotion. ⚠ The source picker is scoped to it: a roster is keyed (année,
   * niveau, numéro), so a student of any other promotion comes back « Autre promotion » — a refusal
   * the admin would otherwise have to try before learning it was one.
   */
  levelId: number | null;
}) {
  const notify = useNotify();

  const [groupIds, setGroupIds]       = useState<string[]>([]);
  const [identifiers, setIdentifiers] = useState('');
  const [reason, setReason]           = useState('');
  const [report, setReport]           = useState<BulkRosterAssignmentReport | null>(null);
  const [page, setPage]               = useState(1);

  const [preview, { isLoading: previewing }] = usePreviewBulkRosterAssignmentMutation();
  const [apply,   { isLoading: applying }]   = useApplyBulkRosterAssignmentMutation();

  const { data: groups = [] } = useGetAcademicGroupOptionsQuery({
    academicYearId,
    levelId: levelId ?? undefined,
  });

  /**
   * ⚠ The target itself is not offered as a source. Selecting it would resolve every one of its own
   * members as « Déjà dans le groupe » — a full page of rows saying nothing happened, which reads as
   * a broken selection rather than as a tautology.
   */
  const groupOptions = useMemo(
    () => groups
      .filter((g) => g.levelId !== null && g.id !== targetGroupId)
      .map((g) => ({ value: String(g.id), label: `${g.label} — ${g.studentCount} étudiant(s)` })),
    [groups, targetGroupId],
  );

  const identifierList = useMemo(
    () => identifiers.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean),
    [identifiers],
  );

  const hasTargets = groupIds.length > 0 || identifierList.length > 0;

  // Any change to what is being asked invalidates the number the apply would send back.
  const resetReport = () => { setReport(null); setPage(1); };

  const targets = () => ({
    academicGroupIds: groupIds.length ? groupIds.map(Number) : undefined,
    identifiers:      identifierList.length ? identifierList : undefined,
  });

  const handlePreview = async () => {
    if (!hasTargets) return;
    try {
      const result = await preview({ targetGroupId, academicYearId, targets: targets() }).unwrap();
      setReport(result);
      setPage(1);
    } catch {
      // errorMiddleware shows the server's sentence — « ce groupe n'appartient à aucune promotion »,
      // typically.
      setReport(null);
    }
  };

  const handleApply = async () => {
    if (!report) return;
    try {
      const result = await apply({
        targetGroupId,
        academicYearId,
        targets: targets(),
        confirmedCount: report.applicableCount,
        reason: reason.trim() || undefined,
      }).unwrap();

      notify.success(
        `${result.applicableCount} étudiant(s) dans « ${result.targetGroupLabel} » — `
        + `${result.joinCount} rattaché(s), ${result.moveCount} déplacé(s)`,
      );
      setReport(null);
      onClose();
    } catch {
      // A count mismatch lands here, and its sentence names both numbers. Re-previewing is the fix,
      // so the report is dropped rather than left arming a button whose number is now wrong.
      setReport(null);
    }
  };

  const rows = report?.rows ?? [];
  const totalPages = Math.max(1, Math.ceil(rows.length / ROWS_PER_PAGE));
  const pageRows = rows.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Affectation nominative — ${targetGroupLabel}`}
      radius="lg"
      size="xl"
      transitionProps={{ duration: 0 }}
    >
      <Stack gap="md">
        <Text size="xs" c="dimmed">
          Les étudiants nommés rejoignent ce groupe. Ceux qui n’en ont aucun y sont rattachés et
          reçoivent ses affectations&nbsp;; ceux qui viennent d’un autre groupe y sont déplacés
          <b> sans trace</b>, comme si la répartition les y avait mis dès le départ. Le service où le
          groupe se rend se décide ensuite, sur la grille du stage.
        </Text>

        <MultiSelect
          label="Groupes d’origine"
          description="Les groupes de la même promotion. Le groupe cible n’est pas proposé."
          placeholder={groupIds.length ? undefined : 'Choisir un ou plusieurs groupes'}
          data={groupOptions}
          value={groupIds}
          onChange={(v) => { setGroupIds(v); resetReport(); }}
          searchable
          clearable
        />

        <Textarea
          label="Étudiants nommés (CNE ou Apogée)"
          description="Un par ligne, ou séparés par des virgules — la liste collée depuis le formulaire."
          placeholder="R130896&#10;AP2200A"
          value={identifiers}
          onChange={(e) => { const v = e.currentTarget.value; setIdentifiers(v); resetReport(); }}
          minRows={3}
          maxRows={10}
          autosize
        />

        <Group>
          <Button
            variant="light"
            color="navy"
            loading={previewing}
            disabled={!hasTargets}
            onClick={handlePreview}
          >
            Aperçu
          </Button>
          {!hasTargets && (
            <Text size="xs" c="dimmed">Choisissez un groupe ou collez une liste.</Text>
          )}
        </Group>

        {report && (
          <>
            <Divider />

            {/* ⚠ Every count comes from the server and is measured before the row cap. A number
                counted from the rows on screen would read low the moment a promotion is selected. */}
            <Card withBorder radius="md" padding="sm">
              <Group gap="lg" wrap="wrap">
                <Stat label="Seront affectés" value={report.applicableCount} color="teal" />
                <Stat label="Rattachés" value={report.joinCount} color="teal" />
                <Stat label="Déplacés" value={report.moveCount} color="blue" />
                <Stat label="Déjà dans le groupe" value={report.alreadyThereCount} color="gray" />
                <Stat label="Refusés" value={report.refusedCount} color={report.refusedCount ? 'red' : 'gray'} />
              </Group>
              <Text size="xs" c="dimmed" mt="xs">
                {report.targetGroupLabel} · {report.academicYearLabel}
              </Text>
            </Card>

            {report.isEmpty && (
              <Alert color="gray" variant="light">
                <Text size="sm">
                  Cette sélection ne désigne aucun étudiant. Vérifiez que les groupes appartiennent
                  bien à {report.academicYearLabel} et que les identifiants collés sont ceux de cette
                  année.
                </Text>
              </Alert>
            )}

            {/* ⚠ Said out loud, because « 0 à affecter » has two causes and only one is a mistake:
                une liste déjà appliquée, et une liste que rien ne peut appliquer. */}
            {!report.isEmpty && report.applicableCount === 0 && report.alreadyThereCount > 0 && (
              <Alert color="blue" variant="light">
                <Text size="sm">
                  Tous les étudiants désignés sont déjà dans « {report.targetGroupLabel} » : cette
                  liste a déjà été appliquée, il n’y a rien à faire.
                </Text>
              </Alert>
            )}

            {report.refusedCount > 0 && (
              <Alert color="orange" variant="light" icon={<IconAlertTriangle size={16} />}>
                <Text size="sm">
                  {report.refusedCount} étudiant(s) ne peuvent pas être affectés et sont listés
                  ci-dessous&nbsp;: les autres le seront quand même. Un étudiant dont une rotation a
                  commencé se déplace par un <b>transfert</b>, qui garde la trace du déplacement.
                </Text>
              </Alert>
            )}

            {rows.length > 0 && (
              <>
                <Table striped highlightOnHover withTableBorder>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Étudiant</Table.Th>
                      <Table.Th>Groupe actuel</Table.Th>
                      <Table.Th>Identifiant</Table.Th>
                      <Table.Th>État</Table.Th>
                      <Table.Th>Détail</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {pageRows.map((r, i) => (
                      <Table.Tr key={r.registrationId ?? `${r.sourceIdentifier}-${i}`}>
                        <Table.Td><Text size="sm">{r.studentName}</Text></Table.Td>
                        <Table.Td>
                          <Text size="sm" c="dimmed">{r.currentGroupLabel ?? 'Sans groupe'}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" ff="monospace" c="dimmed">
                            {r.cne ?? r.appogee ?? r.sourceIdentifier ?? '—'}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge size="sm" variant="light" radius="xl" color={STATUS_META[r.status].color}>
                            {STATUS_META[r.status].label}
                          </Badge>
                        </Table.Td>
                        <Table.Td><Text size="xs" c="dimmed">{r.message}</Text></Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>

                <Group justify="space-between">
                  {/* Says what the list is not showing. A capped list's last page looks exactly
                      like a complete one, and the refusals are the rows kept. */}
                  <Text size="xs" c="dimmed">
                    {rows.length} ligne(s) affichée(s)
                    {report.rowsTruncated && ` sur ${report.totalRowCount} — les refus sont tous listés`}
                  </Text>
                  {totalPages > 1 && (
                    <Pagination value={page} onChange={setPage} total={totalPages} size="sm" radius="md" />
                  )}
                </Group>
              </>
            )}

            <Textarea
              label="Motif (facultatif)"
              description="Porté au dossier des étudiants rattachés — « volontaires Kénitra », par exemple."
              placeholder="Volontaires Kénitra (GST) — formulaire du 12/09"
              value={reason}
              onChange={(e) => { const v = e.currentTarget.value; setReason(v); }}
              minRows={2}
              autosize
            />
          </>
        )}

        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={onClose}>Fermer</Button>
          <Button
            color="teal"
            loading={applying}
            disabled={!report || report.applicableCount === 0}
            leftSection={<IconUsersGroup size={16} stroke={1.5} />}
            onClick={handleApply}
          >
            {report ? `Affecter ${report.applicableCount} étudiant(s)` : 'Affecter'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Stack gap={0}>
      <Title order={3} c={value > 0 ? color : 'dimmed'}>{value}</Title>
      <Text size="xs" c="dimmed">{label}</Text>
    </Stack>
  );
}
