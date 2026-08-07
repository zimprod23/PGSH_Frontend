import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Group,
  Loader,
  Modal,
  ScrollArea,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconCalendarStats,
  IconCircleCheck,
  IconCircleX,
  IconClipboardCheck,
  IconFileCertificate,
  IconPencil,
  IconPrinter,
} from '@tabler/icons-react';
import { useState } from 'react';
import {
  useGetStudentStageRecordQuery,
  useLazyGetFicheDeValidationQuery,
} from '../api/adminApi';
import type {
  FicheDeValidationResponse,
  ServiceEvaluationResponse,
  StagePeriodRecord,
  StudentStageRecordResponse,
} from '../types/admin.types';
import { EvaluationModal } from '../../evaluations/components/EvaluationModal';
import type { EvaluationTarget } from '../../evaluations/types/evaluation.types';
import { useNotify } from '../../../common/hooks/useNotify';

const fmt = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso));

const MODE_LABEL: Record<ServiceEvaluationResponse['mode'], string> = {
  Numeric: 'Note chiffrée',
  ValidatePeriod: 'Validation globale',
  ValidateObjectives: 'Validation par objectif',
};

/**
 * Whether an administrator may record or correct this rotation's mark, and why not when they may
 * not — the backend refuses each of these cases, so the button says so instead of firing a request
 * that comes back as a toast.
 */
function evaluability(p: StagePeriodRecord, record: StudentStageRecordResponse) {
  if (record.status === 'Validated' || record.status === 'Rejected')
    return { allowed: false, reason: 'Le stage est ratifié — les notes ne sont plus modifiables.' };
  if (p.isInterrupted)
    return { allowed: false, reason: 'Rotation interrompue par un transfert — elle n\'est pas évaluée.' };
  if (!p.isComplete)
    return { allowed: false, reason: 'La période doit être clôturée avant d\'être évaluée.' };
  return { allowed: true, reason: null };
}

function PeriodStateBadge({ p }: { p: StagePeriodRecord }) {
  if (p.isInterrupted) return <Badge size="sm" color="gray" variant="light">Interrompu (transfert)</Badge>;
  if (p.isDelocalized) return <Badge size="sm" color="grape" variant="light">Délocalisé</Badge>;
  if (p.isComplete) return <Badge size="sm" color="teal" variant="light">Clôturé</Badge>;
  if (p.isStarted) return <Badge size="sm" color="blue" variant="light">En cours</Badge>;
  return <Badge size="sm" color="gray" variant="light">Planifié</Badge>;
}

function EvaluationDetail({ evaluation }: { evaluation: ServiceEvaluationResponse }) {
  const hasObjectives = evaluation.objectiveScores.length > 0;
  return (
    <Stack gap={6} mt={4}>
      <Group gap={6}>
        <Text size="xs" c="dimmed">Mode :</Text>
        <Text size="xs" fw={500}>{MODE_LABEL[evaluation.mode]}</Text>
      </Group>

      {hasObjectives && (
        <Table withTableBorder withColumnBorders verticalSpacing={4} fz="xs">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Objectif</Table.Th>
              <Table.Th w={70}>Poids</Table.Th>
              <Table.Th w={90}>Résultat</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {evaluation.objectiveScores.map((o) => (
              <Table.Tr key={o.id}>
                <Table.Td>
                  {o.objectiveLabel}
                  {o.isMandatory && <Text span c="red" ml={4}>*</Text>}
                </Table.Td>
                <Table.Td>{o.weight}</Table.Td>
                <Table.Td>
                  {o.score !== null
                    ? <Text ff="monospace" fw={600}>{o.score}</Text>
                    : o.outcome
                      ? <Text c={o.outcome === 'Validated' ? 'green' : 'red'}>{o.outcome === 'Validated' ? 'Validé' : 'Non validé'}</Text>
                      : <Text c="dimmed">—</Text>}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      {evaluation.mode === 'ValidatePeriod' && (
        <Text size="xs" c={evaluation.outcome === 'Validated' ? 'green' : 'red'} fw={500}>
          {evaluation.outcome === 'Validated' ? 'Période validée' : 'Période non validée'}
        </Text>
      )}

      {evaluation.supervisorComment && (
        <Text size="xs" c="dimmed" fs="italic">« {evaluation.supervisorComment} »</Text>
      )}
    </Stack>
  );
}

function AttendanceSummary({ p }: { p: StagePeriodRecord }) {
  const total = p.attendance.length;
  if (total === 0) return <Text size="xs" c="dimmed">Aucun pointage</Text>;
  return (
    <Group gap={6}>
      <Badge size="xs" variant="light" color="teal">{p.presentCount} présent{p.presentCount > 1 ? 's' : ''}</Badge>
      {p.absentCount > 0 && <Badge size="xs" variant="light" color="red">{p.absentCount} absent{p.absentCount > 1 ? 's' : ''}</Badge>}
      {p.justifiedAbsentCount > 0 && <Badge size="xs" variant="light" color="orange">{p.justifiedAbsentCount} justifié{p.justifiedAbsentCount > 1 ? 's' : ''}</Badge>}
      {p.lateCount > 0 && <Badge size="xs" variant="light" color="yellow">{p.lateCount} retard{p.lateCount > 1 ? 's' : ''}</Badge>}
    </Group>
  );
}

// Opens a self-contained printable window for the fiche. Header/footer bands are intentionally left
// empty — the official attestation template is configured later.
function printFiche(f: FicheDeValidationResponse) {
  const rows = f.periods
    .map((per) => {
      const objs = per.objectives.length
        ? per.objectives.map((o) => `${escapeHtml(o.label)} : <b>${o.mark}</b>`).join(' &nbsp;·&nbsp; ')
        : '<span class="muted">Validation globale</span>';
      return `<tr>
        <td>${escapeHtml(per.serviceName)}<div class="muted">${escapeHtml(per.hospitalName)}</div></td>
        <td>${fmt(per.startDate)} → ${fmt(per.endDate)}</td>
        <td class="mark">${per.mark}</td>
        <td>${objs}</td>
      </tr>`;
    })
    .join('');

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
    <title>Fiche de validation — ${escapeHtml(f.studentFullName)}</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color: #1e293b; margin: 0; padding: 0; }
      .page { padding: 24px 32px; max-width: 800px; margin: 0 auto; }
      .band { height: 90px; border: 1px dashed #cbd5e1; border-radius: 8px; display: flex; align-items: center;
              justify-content: center; color: #94a3b8; font-size: 12px; margin: 8px 0; }
      h1 { font-size: 18px; margin: 16px 0 4px; text-align: center; }
      .sub { text-align: center; color: #64748b; font-size: 13px; margin-bottom: 16px; }
      .info { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; font-size: 13px; margin: 12px 0 20px; }
      .info b { color: #334155; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; vertical-align: top; }
      th { background: #f8fafc; }
      td.mark { font-family: monospace; font-weight: 700; text-align: center; }
      .muted { color: #94a3b8; font-size: 11px; }
      .final { margin-top: 18px; text-align: right; font-size: 15px; }
      .final b { font-size: 20px; }
      @media print { .band { border-color: #cbd5e1; } }
    </style></head>
    <body><div class="page">
      <div class="band">En-tête (à configurer)</div>
      <h1>Fiche de validation de stage</h1>
      <div class="sub">${escapeHtml(f.stageName)}${f.levelLabel ? ` — ${escapeHtml(f.levelLabel)}` : ''}</div>
      <div class="info">
        <div><b>Étudiant :</b> ${escapeHtml(f.studentFullName)}</div>
        <div><b>Apogée :</b> ${escapeHtml(f.studentAppogee)}</div>
        <div><b>CNE :</b> ${escapeHtml(f.studentCne)}</div>
        <div><b>Groupe :</b> ${escapeHtml(f.groupLabel ?? f.cohortLabel)}</div>
      </div>
      <table>
        <thead><tr><th>Service</th><th>Période</th><th>Note</th><th>Objectifs</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="final">Note finale : <b>${f.finalMark.toFixed(2)}</b> / 20 &nbsp; — &nbsp; <b style="color:#16a34a">Validé</b></div>
      <div class="band">Pied de page / signatures (à configurer)</div>
    </div>
    <script>window.onload = () => { window.print(); };</script>
    </body></html>`;

  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  return true;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

interface Props {
  assignmentId: string | null;
  opened: boolean;
  onClose: () => void;
}

export function StudentRecordModal({ assignmentId, opened, onClose }: Props) {
  const notify = useNotify();
  const { data: record, isFetching, isError } = useGetStudentStageRecordQuery(assignmentId!, {
    skip: !assignmentId || !opened,
  });
  const [fetchFiche, { isFetching: ficheLoading }] = useLazyGetFicheDeValidationQuery();
  const [evalTarget, setEvalTarget] = useState<EvaluationTarget | null>(null);

  // The fiche needs both halves: passing marks AND the administration's ratification. Mirrors the
  // gate in GetFicheDeValidationQueryHandler so the button never offers a document the server refuses.
  const marksPassed  = record?.result === 'Validé';
  const isRatified   = record?.status === 'Validated';
  const canPrintFiche = marksPassed && isRatified;
  const ficheHint = canPrintFiche
    ? 'Imprimer la fiche de validation'
    : marksPassed
      ? 'Fiche disponible une fois le stage ratifié par la scolarité'
      : 'Fiche disponible une fois le stage validé';

  const openEvaluation = (p: StagePeriodRecord, r: StudentStageRecordResponse) =>
    setEvalTarget({
      periodId:        p.periodId,
      studentFullName: r.studentFullName,
      studentCne:      r.studentCne,
      stageName:       r.stageName,
      startDate:       p.startDate,
      endDate:         p.endDate,
      hasEvaluation:   p.evaluation !== null,
      serviceId:       p.serviceId,
      assignmentId:    r.assignmentId,
    });

  const handlePrint = async () => {
    if (!assignmentId) return;
    try {
      const fiche = await fetchFiche(assignmentId).unwrap();
      if (!printFiche(fiche)) notify.error('Autorisez les fenêtres pop-up pour imprimer la fiche.');
    } catch {
      notify.error('La fiche n\'est disponible qu\'une fois le stage validé.');
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="xl"
      radius="lg"
      title={
        <Group gap="sm">
          <ThemeIcon variant="light" color="navy" radius="md"><IconCalendarStats size={18} /></ThemeIcon>
          <Text fw={600}>Dossier de stage</Text>
        </Group>
      }
    >
      {isFetching ? (
        <Group justify="center" py="xl"><Loader /></Group>
      ) : isError || !record ? (
        <Alert color="red" icon={<IconAlertTriangle size={16} />}>Impossible de charger le dossier.</Alert>
      ) : (
        <Stack gap="md">
          {/* Header */}
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <Stack gap={2}>
              <Text fw={600} size="lg">{record.studentFullName}</Text>
              <Text size="xs" c="dimmed" ff="monospace">CNE {record.studentCne} · Apogée {record.studentAppogee}</Text>
              <Text size="xs" c="dimmed">
                {record.stageName}{record.levelLabel ? ` · ${record.levelLabel}` : ''} · {record.groupLabel ?? record.cohortLabel}
              </Text>
            </Stack>
            <Stack gap={4} align="flex-end">
              <Group gap={6}>
                <Text size="xs" c="dimmed">Note finale</Text>
                <Text fw={700} ff="monospace" c="navy.6">
                  {record.finalScore !== null ? record.finalScore.toFixed(2) : '—'}
                </Text>
              </Group>
              {record.result && (
                <Badge
                  color={record.result === 'Validé' ? 'green' : record.result === 'NonValidé' ? 'red' : 'gray'}
                  variant="light"
                  leftSection={record.result === 'Validé' ? <IconCircleCheck size={12} /> : record.result === 'NonValidé' ? <IconCircleX size={12} /> : undefined}
                >
                  {record.result}
                </Badge>
              )}
              {!record.allPeriodsEvaluated && (
                <Text size="xs" c="orange">Évaluation en attente ({record.periods.filter((p) => p.evaluation).length}/{record.periods.filter((p) => !p.isInterrupted).length} périodes)</Text>
              )}
            </Stack>
          </Group>

          <Button
            leftSection={ficheLoading ? <Loader size={14} color="white" /> : <IconPrinter size={16} />}
            onClick={handlePrint}
            disabled={!canPrintFiche || ficheLoading}
            variant="light"
            color="green"
            size="xs"
            style={{ alignSelf: 'flex-start' }}
          >
            {ficheHint}
          </Button>

          <Divider label="Périodes" labelPosition="left" />

          <ScrollArea.Autosize mah={460}>
            <Stack gap="sm">
              {record.periods.map((p) => (
                <Card key={p.periodId} withBorder radius="md" padding="sm">
                  <Group justify="space-between" align="flex-start" wrap="nowrap">
                    <Stack gap={2} style={{ minWidth: 0 }}>
                      <Group gap={8}>
                        <ThemeIcon variant="light" color="gray" size="sm" radius="sm"><IconFileCertificate size={13} /></ThemeIcon>
                        <Text size="sm" fw={600}>{p.serviceName}</Text>
                        <PeriodStateBadge p={p} />
                      </Group>
                      <Text size="xs" c="dimmed">{p.hospitalName} · {fmt(p.startDate)} → {fmt(p.endDate)}</Text>
                      <AttendanceSummary p={p} />
                    </Stack>
                    <Stack gap={6} align="flex-end">
                      {p.mark !== null ? (
                        <Group gap={4}>
                          <Text fw={700} ff="monospace">{p.mark}</Text>
                          {p.validated !== null && (
                            p.validated
                              ? <IconCircleCheck size={16} color="var(--mantine-color-green-6)" />
                              : <IconCircleX size={16} color="var(--mantine-color-red-6)" />
                          )}
                        </Group>
                      ) : p.isInterrupted ? (
                        <Text size="xs" c="dimmed">—</Text>
                      ) : (
                        <Text size="xs" c="orange">Non évaluée</Text>
                      )}
                      {(() => {
                        const { allowed, reason } = evaluability(p, record);
                        return (
                          <Tooltip label={reason} disabled={allowed} withArrow multiline w={230}>
                            <Box>
                              <Button
                                size="compact-xs"
                                variant="light"
                                color={p.evaluation ? 'gray' : 'navy'}
                                disabled={!allowed}
                                leftSection={p.evaluation
                                  ? <IconPencil size={13} stroke={1.5} />
                                  : <IconClipboardCheck size={13} stroke={1.5} />}
                                onClick={() => openEvaluation(p, record)}
                              >
                                {p.evaluation ? 'Modifier' : 'Évaluer'}
                              </Button>
                            </Box>
                          </Tooltip>
                        );
                      })()}
                    </Stack>
                  </Group>

                  {p.evaluation && (
                    <Box mt={8}><Divider mb={6} /><EvaluationDetail evaluation={p.evaluation} /></Box>
                  )}
                </Card>
              ))}
            </Stack>
          </ScrollArea.Autosize>
        </Stack>
      )}

      <EvaluationModal
        target={evalTarget}
        opened={evalTarget !== null}
        onClose={() => setEvalTarget(null)}
      />
    </Modal>
  );
}
