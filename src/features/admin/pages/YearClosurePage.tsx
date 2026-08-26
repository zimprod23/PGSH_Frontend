import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Container,
  Divider,
  FileButton,
  Group,
  ScrollArea,
  SegmentedControl,
  Select,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconArrowRight,
  IconCheck,
  IconDownload,
  IconFileSpreadsheet,
  IconGavel,
  IconInfoCircle,
  IconUpload,
  IconUserPlus,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import {
  useApplyDeliberationMutation,
  useApplyReinscriptionMutation,
  useGetPromotionLevelsQuery,
  useLazyGetDeliberationTemplateQuery,
  useLazyPreviewReinscriptionQuery,
  usePreviewDeliberationMutation,
} from '../api/adminApi';
import {
  DELIBERATION_ROW_OK,
  DELIBERATION_STATUS_LABEL,
  REINSCRIPTION_ACTION_LABEL,
  type DeliberationReport,
  type DeliberationTemplateMode,
  type ReinscriptionReport,
} from '../types/yearClosure.types';
import { useAcademicYear } from '../contexts/AcademicYearContext';
import { useNotify } from '../../../common/hooks/useNotify';

/**
 * Closing an academic year, in the two acts it really has.
 *
 * **1 · Déliberation (juillet).** PGSH covers stages — no exam, no TP, no jury — so it cannot compute
 * who cleared the year; the faculty states it. The canvas is a list of *exceptions*: only the students
 * the year went badly for, and everyone the file does not name is admis, or diplômé where the year is
 * the last of their own CNPN. One file for every promotion of the year, because a CNE identifies one
 * registration within a year whatever the level.
 *
 * **2 · Réinscription (septembre).** Reads those verdicts and creates the next year's registrations.
 * A separate act on purpose: the two are two months apart, not every admis comes back, and next year's
 * `AcademicYear` row does not exist in July. It is also idempotent, so it is re-run after the odd
 * verdicts are corrected — while the déliberation is all-or-nothing, its file not being stored.
 *
 * ⚠ The whole risk of an exceptions file is the student nobody named, so the apply will not run until
 * the number admitted by silence has been confirmed — and it is sent back to the server, which refuses
 * if it has since changed. A late registration between the simulation and the apply is exactly the case
 * a checkbox would wave through.
 */
export default function YearClosurePage() {
  const notify = useNotify();
  const { years, currentYearId } = useAcademicYear();

  const [levelId, setLevelId] = useState<string | null>(null);
  const [mode, setMode] = useState<DeliberationTemplateMode>('Exceptions');
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<DeliberationReport | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [applied, setApplied] = useState(false);

  const [targetYearId, setTargetYearId] = useState<string | null>(null);
  const [rollover, setRollover] = useState<ReinscriptionReport | null>(null);
  const [rolloverApplied, setRolloverApplied] = useState(false);

  const { data: levels = [] } = useGetPromotionLevelsQuery(undefined);

  const [fetchTemplate, { isFetching: templateLoading }] = useLazyGetDeliberationTemplateQuery();
  const [preview, { isLoading: previewing }] = usePreviewDeliberationMutation();
  const [apply, { isLoading: applying }] = useApplyDeliberationMutation();
  const [previewRollover, { isFetching: rolloverPreviewing }] = useLazyPreviewReinscriptionQuery();
  const [applyRollover, { isLoading: rolloverApplying }] = useApplyReinscriptionMutation();

  const defaultsOn = mode === 'Exceptions';
  const scope = {
    levelId: levelId ? Number(levelId) : undefined,
    academicYearId: currentYearId ?? undefined,
    defaultUnlistedToAdmis: defaultsOn,
  };

  const closingYear = years.find((y) => y.id === currentYearId);

  // A rollover can only go forward, so the picker never offers the year being closed or an earlier one.
  const targetYears = useMemo(
    () =>
      years
        .filter((y) => !closingYear || y.startDate > closingYear.startDate)
        .map((y) => ({ value: String(y.id), label: y.label })),
    [years, closingYear],
  );

  const resetReport = () => {
    setReport(null);
    setConfirmed(false);
    setApplied(false);
  };

  const handleDownload = async () => {
    try {
      const blob = await fetchTemplate({ ...scope, mode }).unwrap();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // The mode is part of the name. Both canvases cover the same promotion and the same year, so
      // without it downloading one silently overwrites the other in the browser's folder — and an
      // exceptions sheet mistaken for a full one is a file that admits the whole promotion.
      const kind = mode === 'Exceptions' ? 'exceptions' : 'complet';
      link.download =
        `deliberation-${kind}-${closingYear?.label ?? 'annee'}${levelId ? `-niveau${levelId}` : ''}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      notify.error(detailOf(err) ?? 'Impossible de générer le canevas.');
    }
  };

  const handleFile = async (picked: File | null) => {
    setFile(picked);
    resetReport();
    if (!picked) return;
    try {
      setReport(await preview({ ...scope, file: picked }).unwrap());
    } catch (err: unknown) {
      notify.error(detailOf(err) ?? 'Fichier illisible.');
    }
  };

  const handleApply = async () => {
    if (!file || !report) return;
    try {
      const result = await apply({
        ...scope,
        file,
        confirmedDefaultCount: report.defaultedCount,
      }).unwrap();

      setReport(result);
      setApplied(true);
      notify.success(
        `${result.willRecord + result.willReplace + result.defaultedCount} décision(s) enregistrée(s).`,
      );
    } catch (err: unknown) {
      notify.error(detailOf(err) ?? 'La clôture a été refusée.');
    }
  };

  const rolloverRequest = {
    fromAcademicYearId: currentYearId ?? 0,
    toAcademicYearId: Number(targetYearId),
    levelId: levelId ? Number(levelId) : undefined,
  };

  const handleRolloverPreview = async () => {
    try {
      setRolloverApplied(false);
      setRollover(await previewRollover(rolloverRequest).unwrap());
    } catch (err: unknown) {
      notify.error(detailOf(err) ?? 'Simulation impossible.');
    }
  };

  const handleRolloverApply = async () => {
    try {
      const result = await applyRollover(rolloverRequest).unwrap();
      setRollover(result);
      setRolloverApplied(true);
      notify.success(`${result.willRegister} inscription(s) créée(s) pour ${result.toYearLabel}.`);
    } catch (err: unknown) {
      notify.error(detailOf(err) ?? 'La réinscription a été refusée.');
    }
  };

  // Pre-flight: never let a click through that the server is bound to refuse.
  const yearMissing = currentYearId === null;
  const canApply = !!report && report.canApply && (!report.defaultedCount || confirmed) && !applied;
  const rolloverReady = !yearMissing && !!targetYearId;

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        <Stack gap={4}>
          <Title order={2}>Clôture de l'année</Title>
          <Text size="sm" c="dimmed">
            Enregistrer les décisions du jury pour {closingYear?.label ?? '…'}, puis créer les
            inscriptions de l'année suivante.
          </Text>
        </Stack>

        {yearMissing && (
          <Alert color="orange" icon={<IconAlertTriangle size={16} />} radius="md">
            Aucune année universitaire sélectionnée.
          </Alert>
        )}

        {/* ── 1 · Déliberation ───────────────────────────────────────────── */}
        <Card withBorder radius="lg" p="lg">
          <Stack gap="md">
            <Group gap="sm">
              <ThemeIcon variant="light" color="navy" radius="md"><IconGavel size={18} /></ThemeIcon>
              <Stack gap={0}>
                <Text fw={600}>1 · Déliberation</Text>
                <Text size="xs" c="dimmed">
                  Les décisions du PV, pour {closingYear?.label ?? '…'}.
                </Text>
              </Stack>
            </Group>

            <Group gap="xl" align="flex-end" wrap="wrap">
              <Stack gap={4}>
                <Text size="xs" fw={600} c="navy.7">Type de canevas</Text>
                <SegmentedControl
                  size="xs" radius="md" color="navy"
                  value={mode}
                  onChange={(v) => { setMode(v as DeliberationTemplateMode); resetReport(); }}
                  data={[
                    { value: 'Exceptions', label: 'Exceptions seulement' },
                    { value: 'Full',       label: 'Liste complète' },
                  ]}
                />
              </Stack>

              <Select
                label="Promotion"
                description="Toutes par défaut"
                placeholder="Toutes les promotions"
                size="xs"
                w={220}
                clearable
                searchable
                data={levels.map((l) => ({ value: String(l.id), label: l.label ?? `Niveau ${l.id}` }))}
                value={levelId}
                onChange={(v) => { setLevelId(v); resetReport(); }}
              />

              <Button
                size="xs" variant="light" color="navy" radius="md"
                leftSection={<IconDownload size={14} stroke={1.5} />}
                loading={templateLoading}
                disabled={yearMissing}
                onClick={handleDownload}
              >
                Télécharger le canevas
              </Button>

              <FileButton onChange={handleFile} accept=".xlsx">
                {(props) => (
                  <Button
                    {...props}
                    size="xs" color="navy" radius="md"
                    leftSection={<IconUpload size={14} stroke={1.5} />}
                    loading={previewing}
                    disabled={yearMissing}
                  >
                    {file ? 'Changer de fichier' : 'Déposer le fichier rempli'}
                  </Button>
                )}
              </FileButton>

              {file && (
                <Group gap={6}>
                  <IconFileSpreadsheet size={14} />
                  <Text size="xs" c="dimmed">{file.name}</Text>
                </Group>
              )}
            </Group>

            <Alert
              color={defaultsOn ? 'orange' : 'blue'}
              variant="light"
              radius="md"
              icon={defaultsOn ? <IconAlertTriangle size={16} /> : <IconInfoCircle size={16} />}
            >
              {defaultsOn ? (
                <>
                  Ne saisissez que les <b>exceptions</b> — redoublants, exclus, abandons. Tout étudiant
                  absent du fichier sera enregistré <b>Admis</b>.{' '}
                  <b>Sauf en dernière année</b> : y rester (thèse non soutenue) est aussi courant que la
                  terminer, et PGSH n'a aucune trace d'une soutenance — rien n'y est donc enregistré sans
                  décision explicite, et c'est à vous d'y nommer les diplômés. Un étudiant portant déjà
                  une décision n'est jamais modifié par défaut : nommez-le dans le fichier pour la changer.
                </>
              ) : (
                <>
                  Une ligne par étudiant, décision obligatoire. Un étudiant absent du fichier garde son
                  statut actuel.
                </>
              )}
            </Alert>

            {report && <DeliberationSummary report={report} applied={applied} />}

            {report && report.defaultedCount > 0 && !applied && (
              <Checkbox
                color="navy"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.currentTarget.checked)}
                label={
                  <Text size="sm">
                    Je confirme que les <b>{report.defaultedCount}</b> étudiant(s) non listés sont admis.
                    {report.finalYearUndecidedCount > 0 && (
                      <> Les <b>{report.finalYearUndecidedCount}</b> en dernière année restent sans décision.</>
                    )}
                  </Text>
                }
              />
            )}

            {report && !applied && (
              <Group justify="flex-end">
                <Tooltip
                  label={applyReason(report, confirmed)}
                  disabled={canApply}
                  withArrow
                >
                  <div>
                    <Button
                      color="navy" radius="md"
                      leftSection={<IconCheck size={16} stroke={1.5} />}
                      loading={applying}
                      disabled={!canApply}
                      onClick={handleApply}
                    >
                      Enregistrer les décisions
                    </Button>
                  </div>
                </Tooltip>
              </Group>
            )}

            {applied && (
              <Alert color="teal" variant="light" radius="md" icon={<IconCheck size={16} />}>
                Année clôturée. La réinscription ci-dessous peut être lancée maintenant ou en septembre.
              </Alert>
            )}
          </Stack>
        </Card>

        {/* ── 2 · Réinscription ──────────────────────────────────────────── */}
        <Card withBorder radius="lg" p="lg">
          <Stack gap="md">
            <Group gap="sm">
              <ThemeIcon variant="light" color="teal" radius="md"><IconUserPlus size={18} /></ThemeIcon>
              <Stack gap={0}>
                <Text fw={600}>2 · Réinscription</Text>
                <Text size="xs" c="dimmed">
                  Admis → niveau supérieur. Redoublant → même niveau. Diplômé, exclu, abandon → rien.
                </Text>
              </Stack>
            </Group>

            <Group gap="md" align="flex-end" wrap="wrap">
              <Select
                label="Année de destination"
                placeholder="Choisir…"
                size="xs"
                w={220}
                data={targetYears}
                value={targetYearId}
                onChange={(v) => { setTargetYearId(v); setRollover(null); setRolloverApplied(false); }}
              />

              <Button
                size="xs" variant="light" color="teal" radius="md"
                leftSection={<IconArrowRight size={14} stroke={1.5} />}
                loading={rolloverPreviewing}
                disabled={!rolloverReady}
                onClick={handleRolloverPreview}
              >
                Simuler
              </Button>

              {rollover && !rolloverApplied && (
                <Button
                  size="xs" color="teal" radius="md"
                  leftSection={<IconCheck size={14} stroke={1.5} />}
                  loading={rolloverApplying}
                  disabled={rollover.willRegister === 0}
                  onClick={handleRolloverApply}
                >
                  Créer {rollover.willRegister} inscription(s)
                </Button>
              )}
            </Group>

            {targetYears.length === 0 && (
              <Alert color="orange" variant="light" radius="md" icon={<IconAlertTriangle size={16} />}>
                Aucune année postérieure n'existe. Créez l'année universitaire suivante avant de
                réinscrire.
              </Alert>
            )}

            {rollover && <ReinscriptionSummary report={rollover} applied={rolloverApplied} />}
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}

// ─── Déliberation report ──────────────────────────────────────────────────────

function DeliberationSummary({ report, applied }: { report: DeliberationReport; applied: boolean }) {
  const badRows = report.rows.filter((r) => !DELIBERATION_ROW_OK.includes(r.status));

  return (
    <Stack gap="sm">
      <Divider />

      <Group gap="xs" wrap="wrap">
        <Badge color="navy" variant="light" radius="sm">
          {report.totalRows} ligne(s) dans le fichier
        </Badge>
        {report.defaultedCount > 0 && (
          <Badge color="orange" variant="light" radius="sm">
            {report.defaultedCount} admis par défaut
          </Badge>
        )}
        {report.finalYearUndecidedCount > 0 && (
          <Badge color="grape" variant="light" radius="sm">
            {report.finalYearUndecidedCount} en dernière année, sans décision
          </Badge>
        )}
        {report.alreadyDecidedCount > 0 && (
          <Badge color="gray" variant="light" radius="sm">
            {report.alreadyDecidedCount} déjà décidé(s), inchangé(s)
          </Badge>
        )}
        {report.notAPromotionCount > 0 && (
          <Badge color="gray" variant="light" radius="sm">
            {report.notAPromotionCount} hors promotion
          </Badge>
        )}
        {report.errorCount > 0 && (
          <Badge color="red" variant="light" radius="sm">{report.errorCount} erreur(s)</Badge>
        )}
        {report.contradictionCount > 0 && (
          <Badge color="yellow" variant="light" radius="sm">
            {report.contradictionCount} avec un stage non validé
          </Badge>
        )}
      </Group>

      {report.byLevel.length > 0 && (
        <ScrollArea.Autosize mah={220}>
          <Table striped highlightOnHover withTableBorder={false} fz="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Promotion</Table.Th>
                <Table.Th ta="right">Inscrits</Table.Th>
                <Table.Th ta="right">Dans le fichier</Table.Th>
                <Table.Th ta="right">Admis par défaut</Table.Th>
                <Table.Th ta="right">Dernière année</Table.Th>
                <Table.Th ta="right">Inchangés</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {report.byLevel.map((b) => (
                <Table.Tr key={b.levelId}>
                  <Table.Td>{b.levelLabel}</Table.Td>
                  <Table.Td ta="right">{b.registrations}</Table.Td>
                  <Table.Td ta="right">{b.listed}</Table.Td>
                  <Table.Td ta="right">{b.willPromote}</Table.Td>
                  <Table.Td ta="right">{b.finalYearUndecided || '—'}</Table.Td>
                  <Table.Td ta="right">{b.alreadyDecided || '—'}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea.Autosize>
      )}

      {report.finalYearUndecidedCount > 0 && (
        <Alert color="grape" variant="light" radius="md" icon={<IconInfoCircle size={16} />}>
          <Text size="sm" fw={600} mb={4}>
            {report.finalYearUndecidedCount} étudiant(s) en dernière année — aucune décision enregistrée
          </Text>
          <Text size="xs">
            Rester en dernière année est aussi courant que la terminer, et PGSH n'a aucune trace d'une
            soutenance : « admis » et « diplômé » y sont deux décisions ordinaires et aucune n'est
            déductible. Ils restent en cours. Pour prononcer les diplômes, déposez la liste des
            soutenances — un fichier nommant ces étudiants « Diplômé ».
          </Text>
        </Alert>
      )}

      {badRows.length > 0 && (
        <ScrollArea.Autosize mah={260}>
          <Table striped highlightOnHover fz="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Ligne</Table.Th>
                <Table.Th>CNE</Table.Th>
                <Table.Th>Étudiant</Table.Th>
                <Table.Th>État</Table.Th>
                <Table.Th>Message</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {badRows.map((row) => (
                <Table.Tr key={row.sheetRow}>
                  <Table.Td>{row.sheetRow}</Table.Td>
                  <Table.Td>{row.cne ?? '—'}</Table.Td>
                  <Table.Td>{row.studentFullName ?? '—'}</Table.Td>
                  <Table.Td>
                    <Badge size="xs" color="red" variant="light">
                      {DELIBERATION_STATUS_LABEL[row.status]}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{row.message}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea.Autosize>
      )}

      {report.rowsTruncated && (
        <Text size="xs" c="dimmed">
          Seules les {report.rows.length} premières lignes sont affichées ; les compteurs ci-dessus
          portent sur le fichier entier.
        </Text>
      )}

      {!applied && report.errorCount > 0 && (
        <Alert color="red" variant="light" radius="md" icon={<IconAlertTriangle size={16} />}>
          L'import est appliqué en totalité ou pas du tout : corrigez le fichier et redéposez-le. Une
          promotion à moitié clôturée ne serait reconstituable par personne — le fichier n'est pas
          conservé.
        </Alert>
      )}
    </Stack>
  );
}

/** Why the apply button is off. A disabled control with no reason is a dead end. */
function applyReason(report: DeliberationReport, confirmed: boolean) {
  if (report.errorCount > 0) return 'Corrigez les lignes en erreur.';
  if (report.defaultedCount > 0 && !confirmed) return 'Confirmez les admissions par défaut.';
  return '';
}

// ─── Réinscription report ─────────────────────────────────────────────────────

function ReinscriptionSummary({ report, applied }: { report: ReinscriptionReport; applied: boolean }) {
  const attention = report.rows.filter(
    (r) => r.action === 'NoOutcome' || r.action === 'NextLevelMissing',
  );

  return (
    <Stack gap="sm">
      <Divider />

      <Group gap="xs" wrap="wrap">
        <Badge color="teal" variant="light" radius="sm">
          {applied ? `${report.willRegister} créée(s)` : `${report.willRegister} à créer`}
        </Badge>
        <Badge color="gray" variant="light" radius="sm">
          {report.skipped} ignoré(s) sur {report.totalConsidered}
        </Badge>
        {report.needsAttention > 0 && (
          <Badge color="orange" variant="light" radius="sm">
            {report.needsAttention} à traiter
          </Badge>
        )}
      </Group>

      {Object.keys(report.byTargetLevel).length > 0 && (
        <Group gap="xs" wrap="wrap">
          {Object.entries(report.byTargetLevel).map(([label, count]) => (
            <Badge key={label} variant="outline" color="navy" radius="sm">
              {label} : {count}
            </Badge>
          ))}
        </Group>
      )}

      {attention.length > 0 && (
        <>
          <Alert color="orange" variant="light" radius="md" icon={<IconInfoCircle size={16} />}>
            Ces étudiants ne sont pas bloquants — la réinscription est <b>idempotente</b> : corrigez
            leur décision, puis relancez. Rien ne sera créé deux fois.
          </Alert>
          <ScrollArea.Autosize mah={260}>
            <Table striped highlightOnHover fz="xs">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Étudiant</Table.Th>
                  <Table.Th>CNE</Table.Th>
                  <Table.Th>Promotion</Table.Th>
                  <Table.Th>Cas</Table.Th>
                  <Table.Th>Message</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {attention.map((row) => (
                  <Table.Tr key={row.studentId}>
                    <Table.Td>{row.studentFullName}</Table.Td>
                    <Table.Td>{row.cne ?? '—'}</Table.Td>
                    <Table.Td>{row.fromLevelLabel}</Table.Td>
                    <Table.Td>
                      <Badge size="xs" color="orange" variant="light">
                        {REINSCRIPTION_ACTION_LABEL[row.action]}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{row.message}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea.Autosize>
        </>
      )}

      {applied && (
        <Alert color="teal" variant="light" radius="md" icon={<IconCheck size={16} />}>
          Les inscriptions de {report.toYearLabel} sont créées, sans groupe : elles rejoignent
          « Non réparti », d'où la répartition automatique les prendra.
        </Alert>
      )}
    </Stack>
  );
}

const detailOf = (err: unknown) => (err as { data?: { detail?: string } })?.data?.detail;
