import {
  Alert,
  Badge,
  Button,
  Divider,
  FileButton,
  Group,
  Modal,
  Paper,
  ScrollArea,
  SegmentedControl,
  Select,
  Stack,
  Table,
  Text,
  ThemeIcon,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconCheck,
  IconDownload,
  IconFileSpreadsheet,
  IconUpload,
} from '@tabler/icons-react';
import { useState } from 'react';
import {
  useApplyEvaluationImportMutation,
  useLazyGetEvaluationImportTemplateQuery,
  usePreviewEvaluationImportMutation,
} from '../api/evaluationsApi';
import {
  IMPORT_ROW_OK,
  IMPORT_STATUS_LABEL,
  type EvaluationImportMode,
  type EvaluationImportReport,
  type EvaluationImportScope,
} from '../types/import.types';
import { useNotify } from '../../../common/hooks/useNotify';

interface Props {
  stageId: number;
  stageName?: string;
  /** Period numbers the stage actually has — a per-period import can only target one of these. */
  periodNumbers: number[];
  opened: boolean;
  onClose: () => void;
}

/**
 * Bulk entry of a stage's marks from a spreadsheet, in three steps: download a pre-filled template,
 * upload it for a dry run, apply what the dry run showed.
 *
 * The dry run is not optional. Marks are the highest-consequence data in the system, and an import
 * that silently applies two hundred rows where eight were mis-keyed is worse than no import at all —
 * so nothing is written until the report below has been read, and one bad row refuses the whole file.
 */
export function EvaluationImportModal({ stageId, stageName, periodNumbers, opened, onClose }: Props) {
  const notify = useNotify();

  const [scope, setScope] = useState<EvaluationImportScope>('WholeStage');
  const [mode, setMode] = useState<EvaluationImportMode>('Numeric');
  const [periodNumber, setPeriodNumber] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<EvaluationImportReport | null>(null);
  const [applied, setApplied] = useState(false);

  const [preview, { isLoading: previewing }] = usePreviewEvaluationImportMutation();
  const [apply, { isLoading: applying }] = useApplyEvaluationImportMutation();
  const [fetchTemplate, { isFetching: templateLoading }] = useLazyGetEvaluationImportTemplateQuery();

  // A per-period import with no period chosen is a request the server is bound to refuse.
  const periodMissing = scope === 'SinglePeriod' && periodNumber === null;
  const request = {
    stageId,
    scope,
    mode,
    periodNumber: scope === 'SinglePeriod' ? Number(periodNumber) : undefined,
  };

  const resetReport = () => {
    setReport(null);
    setApplied(false);
  };

  const changeScope = (value: EvaluationImportScope) => {
    setScope(value);
    resetReport();
  };

  const handleDownload = async () => {
    try {
      const blob = await fetchTemplate(request).unwrap();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `notes-stage-${stageId}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      notify.error('Impossible de générer le modèle.');
    }
  };

  const handleFile = async (picked: File | null) => {
    setFile(picked);
    resetReport();
    if (!picked) return;
    try {
      setReport(await preview({ ...request, file: picked }).unwrap());
    } catch (err: unknown) {
      notify.error(detailOf(err) ?? 'Fichier illisible.');
    }
  };

  const handleApply = async () => {
    if (!file) return;
    try {
      const result = await apply({ ...request, file }).unwrap();
      setReport(result);
      setApplied(true);
      notify.success(`${result.periodCount} note(s) enregistrée(s).`);
    } catch (err: unknown) {
      notify.error(detailOf(err) ?? "L'import a été refusé.");
    }
  };

  const close = () => {
    setFile(null);
    resetReport();
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={close}
      size="xl"
      radius="lg"
      title={
        <Group gap="sm">
          <ThemeIcon variant="light" color="navy" radius="md"><IconFileSpreadsheet size={18} /></ThemeIcon>
          <Stack gap={0}>
            <Text fw={600}>Importer les notes</Text>
            {stageName && <Text size="xs" c="dimmed">{stageName}</Text>}
          </Stack>
        </Group>
      }
    >
      <Stack gap="md">
        <Paper withBorder radius="md" p="md">
          <Stack gap="sm">
            <Group gap="xl" align="flex-start" wrap="wrap">
              <Stack gap={4}>
                <Text size="xs" fw={600} c="navy.7">Portée</Text>
                <SegmentedControl
                  size="xs" radius="md" color="navy"
                  value={scope}
                  onChange={(v) => changeScope(v as EvaluationImportScope)}
                  data={[
                    { value: 'WholeStage',   label: 'Tout le stage' },
                    { value: 'SinglePeriod', label: 'Une période' },
                  ]}
                />
              </Stack>

              {scope === 'SinglePeriod' && (
                <Select
                  label="Période"
                  size="xs"
                  w={140}
                  placeholder="P…"
                  data={periodNumbers.map((n) => ({ value: String(n), label: `P${n}` }))}
                  value={periodNumber}
                  onChange={(v) => { setPeriodNumber(v); resetReport(); }}
                  error={periodMissing ? 'Requis' : undefined}
                />
              )}

              <Stack gap={4}>
                <Text size="xs" fw={600} c="navy.7">Type de note</Text>
                <SegmentedControl
                  size="xs" radius="md" color="navy"
                  value={mode}
                  onChange={(v) => { setMode(v as EvaluationImportMode); resetReport(); }}
                  data={[
                    { value: 'Numeric',        label: 'Note (0–20)' },
                    { value: 'ValidatePeriod', label: 'Validé / Non validé' },
                  ]}
                />
              </Stack>
            </Group>

            <Text size="xs" c="dimmed">
              {scope === 'WholeStage'
                ? 'La valeur saisie pour un étudiant est appliquée à chacune de ses rotations de ce stage.'
                : 'Seule la rotation choisie est notée.'}
              {' '}
              {mode === 'Numeric'
                ? 'Remplissez la colonne « Note ».'
                : 'Remplissez la colonne « Résultat » (Validé / Non validé).'}
            </Text>

            <Group gap="sm">
              <Button
                size="xs" variant="light" color="navy" radius="md"
                leftSection={<IconDownload size={14} stroke={1.5} />}
                loading={templateLoading}
                disabled={periodMissing}
                onClick={handleDownload}
              >
                Télécharger le modèle
              </Button>

              <FileButton onChange={handleFile} accept=".xlsx">
                {(props) => (
                  <Button
                    {...props}
                    size="xs" color="navy" radius="md"
                    leftSection={<IconUpload size={14} stroke={1.5} />}
                    loading={previewing}
                    disabled={periodMissing}
                  >
                    {file ? 'Changer de fichier' : 'Choisir un fichier'}
                  </Button>
                )}
              </FileButton>

              {file && <Text size="xs" c="dimmed">{file.name}</Text>}
            </Group>
          </Stack>
        </Paper>

        {report && (
          <>
            <Divider
              label={applied ? 'Import effectué' : 'Aperçu — rien n’est encore enregistré'}
              labelPosition="left"
            />

            <Group gap="xs" wrap="wrap">
              <Badge variant="light" color="gray">{report.totalRows} ligne(s)</Badge>
              <Badge variant="light" color="teal">{report.willCreate} nouvelle(s)</Badge>
              <Badge variant="light" color="orange">{report.willOverwrite} remplacée(s)</Badge>
              <Badge variant="light" color="navy">{report.periodCount} rotation(s)</Badge>
              {report.errorCount > 0 && (
                <Badge variant="filled" color="red">{report.errorCount} en erreur</Badge>
              )}
            </Group>

            {!applied && report.errorCount > 0 && (
              <Alert color="red" icon={<IconAlertTriangle size={16} />}>
                Un import de notes est appliqué en totalité ou pas du tout. Corrigez les lignes
                ci-dessous dans le fichier, puis rechargez-le.
              </Alert>
            )}

            {!applied && report.willOverwrite > 0 && report.errorCount === 0 && (
              <Alert color="orange" icon={<IconAlertTriangle size={16} />}>
                {report.willOverwrite} étudiant(s) ont déjà une note enregistrée : elle sera remplacée.
              </Alert>
            )}

            <ScrollArea.Autosize mah={340}>
              <Table striped highlightOnHover verticalSpacing={4} fz="xs" stickyHeader>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th w={60}>Ligne</Table.Th>
                    <Table.Th>Étudiant</Table.Th>
                    <Table.Th w={130}>Identifiant</Table.Th>
                    <Table.Th w={130}>État</Table.Th>
                    <Table.Th>Détail</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {report.rows.map((row) => {
                    const ok = IMPORT_ROW_OK.includes(row.status);
                    return (
                      <Table.Tr key={row.sheetRow}>
                        <Table.Td ff="monospace">{row.sheetRow}</Table.Td>
                        <Table.Td>{row.studentFullName ?? <Text c="dimmed">—</Text>}</Table.Td>
                        <Table.Td ff="monospace" c="dimmed">{row.cne ?? row.appogee ?? '—'}</Table.Td>
                        <Table.Td>
                          <Badge
                            size="xs"
                            variant="light"
                            color={!ok ? 'red' : row.status === 'WillOverwrite' ? 'orange' : 'teal'}
                          >
                            {IMPORT_STATUS_LABEL[row.status]}
                          </Badge>
                        </Table.Td>
                        <Table.Td c={ok ? 'dimmed' : 'red'}>{row.message}</Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </ScrollArea.Autosize>
          </>
        )}

        <Group justify="flex-end" pt="sm" style={{ borderTop: '1px solid #E2E8F0' }}>
          <Button variant="subtle" color="gray" onClick={close}>
            {applied ? 'Fermer' : 'Annuler'}
          </Button>
          {!applied && (
            <Button
              color="navy"
              loading={applying}
              disabled={!report?.canApply}
              leftSection={<IconCheck size={16} stroke={1.5} />}
              onClick={handleApply}
            >
              Appliquer {report?.canApply ? `(${report.periodCount} note(s))` : ''}
            </Button>
          )}
        </Group>
      </Stack>
    </Modal>
  );
}

const detailOf = (err: unknown) => (err as { data?: { detail?: string } })?.data?.detail;
