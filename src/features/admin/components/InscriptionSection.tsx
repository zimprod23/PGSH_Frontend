import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Divider,
  FileButton,
  Group,
  ScrollArea,
  Select,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconCheck,
  IconDownload,
  IconFileSpreadsheet,
  IconInfoCircle,
  IconMail,
  IconSchool,
  IconUpload,
  IconUserPlus,
} from '@tabler/icons-react';
import { useState } from 'react';
import {
  useApplyInscriptionMutation,
  useLazyGetInscriptionTemplateQuery,
  usePreviewInscriptionMutation,
} from '../api/adminApi';
import {
  INSCRIPTION_ACTION_IS_ERROR,
  INSCRIPTION_ACTION_LABEL,
  type InscriptionReport,
} from '../types/inscription.types';
import type { AdminLevelResponse } from '../types/admin.types';
import { useNotify } from '../../../common/hooks/useNotify';
import { InscribeStudentModal } from './InscribeStudentModal';
import { problemMessage } from '../../../common/utils/problemMessage';

interface Props {
  levels: AdminLevelResponse[];
  academicYearId: number | null;
  yearLabel: string | undefined;
}

/**
 * **3 · Inscription** — the people the two acts above structurally cannot see.
 *
 * The déliberation reads the closing year's registrations and writes verdicts onto them; the
 * réinscription reads those verdicts and creates the next year's. Both begin from a registration the
 * student already holds, which is exactly why neither reaches the September intake, a transfer
 * arriving from another faculty, a returner, or a réorientation.
 *
 * ⚠ **This is the only act in PGSH that creates *people*, and there is no undo.** A student row is an
 * identity — a CNE, a numéro Apogée, and an address a Keycloak login is matched against. So the
 * simulation is mandatory and the number of creations is confirmed by *value*, not by a checkbox: the
 * count is echoed back to the server, which refuses if it has changed since. A row added to the file
 * between the two is exactly what a checkbox would wave through.
 *
 * ⚠ **`levelId` is required, and it is the guard rather than a filter.** The déliberation may leave
 * it out because a CNE identifies one registration within a year whatever the level; nobody here holds
 * a registration the promotion could be read from instead.
 */
export function InscriptionSection({ levels, academicYearId, yearLabel }: Props) {
  const notify = useNotify();

  const [levelId, setLevelId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<InscriptionReport | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [applied, setApplied] = useState(false);
  const [singleOpen, setSingleOpen] = useState(false);

  const [fetchTemplate, { isFetching: templateLoading }] = useLazyGetInscriptionTemplateQuery();
  const [preview, { isLoading: previewing }] = usePreviewInscriptionMutation();
  const [apply, { isLoading: applying }] = useApplyInscriptionMutation();

  const level = levels.find((l) => String(l.id) === levelId) ?? null;
  const scope = { levelId: Number(levelId), academicYearId: academicYearId ?? undefined };

  // Pre-flight: never let a click through that the server is bound to refuse.
  const ready = !!levelId && academicYearId !== null;
  const canApply = !!report && report.canApply && (!report.willCreateStudents || confirmed) && !applied;

  const resetReport = () => {
    setReport(null);
    setConfirmed(false);
    setApplied(false);
  };

  const handleDownload = async () => {
    if (!ready) return;
    try {
      const blob = await fetchTemplate(scope).unwrap();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `inscription-${level?.label ?? `niveau${levelId}`}-${yearLabel ?? 'annee'}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      notify.error(problemMessage(err) ?? 'Impossible de générer le canevas.');
    }
  };

  const handleFile = async (picked: File | null) => {
    setFile(picked);
    resetReport();
    if (!picked || !ready) return;
    try {
      setReport(await preview({ ...scope, file: picked }).unwrap());
    } catch (err: unknown) {
      notify.error(problemMessage(err) ?? 'Fichier illisible.');
    }
  };

  const handleApply = async () => {
    if (!file || !report) return;
    try {
      const result = await apply({
        ...scope,
        file,
        // ⚠ The number the operator was shown, not one recomputed here. That is the whole point.
        confirmedStudentCount: report.willCreateStudents,
      }).unwrap();

      setReport(result);
      setApplied(true);
      notify.success(
        `${result.willRegister} inscription(s) — ${result.willCreateStudents} étudiant(s) créé(s).`,
      );
    } catch (err: unknown) {
      notify.error(problemMessage(err) ?? "L'inscription a été refusée.");
    }
  };

  return (
    <Card withBorder radius="lg" p="lg">
      <Stack gap="md">
        <Group gap="sm" justify="space-between" wrap="nowrap">
          <Group gap="sm">
            <ThemeIcon variant="light" color="grape" radius="md"><IconSchool size={18} /></ThemeIcon>
            <Stack gap={0}>
              <Text fw={600}>3 · Inscription</Text>
              <Text size="xs" c="dimmed">
                Les nouveaux, les transferts, les retours et les réorientations — que la réinscription
                ne peut pas reporter.
              </Text>
            </Stack>
          </Group>

          <Button
            size="xs" variant="light" color="grape" radius="md"
            leftSection={<IconUserPlus size={14} stroke={1.5} />}
            disabled={academicYearId === null}
            onClick={() => setSingleOpen(true)}
          >
            Un seul étudiant
          </Button>
        </Group>

        <Alert color="blue" variant="light" radius="md" icon={<IconInfoCircle size={16} />}>
          La déliberation et la réinscription partent toutes deux d'une inscription que l'étudiant
          possède déjà : elles ne voient donc <b>pas</b> les nouveaux 1ᵉʳ année, ni un étudiant
          transféré d'une autre faculté, ni celui qui revient après une interruption. C'est ce que
          cette étape fait. Un <b>redoublant</b> n'est pas concerné — il est reporté par la
          réinscription depuis sa décision.
        </Alert>

        <Group gap="xl" align="flex-end" wrap="wrap">
          <Select
            label="Promotion"
            description="Obligatoire — personne ici n'a d'inscription d'où la déduire"
            placeholder="Choisir la promotion…"
            size="xs"
            w={260}
            searchable
            data={levels.map((l) => ({ value: String(l.id), label: l.label ?? `Niveau ${l.id}` }))}
            value={levelId}
            onChange={(v) => { setLevelId(v); setFile(null); resetReport(); }}
          />

          <Button
            size="xs" variant="light" color="grape" radius="md"
            leftSection={<IconDownload size={14} stroke={1.5} />}
            loading={templateLoading}
            disabled={!ready}
            onClick={handleDownload}
          >
            Télécharger le canevas
          </Button>

          <FileButton onChange={handleFile} accept=".xlsx">
            {(props) => (
              <Button
                {...props}
                size="xs" color="grape" radius="md"
                leftSection={<IconUpload size={14} stroke={1.5} />}
                loading={previewing}
                disabled={!ready}
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

        {!levelId && (
          <Text size="xs" c="dimmed">
            Choisissez d'abord la promotion : le canevas en dépend, et au-dessus de la 1ʳᵉ année il
            réclame la provenance de chaque étudiant.
          </Text>
        )}

        {level && level.year > 1 && (
          <Alert color="orange" variant="light" radius="md" icon={<IconAlertTriangle size={16} />}>
            <b>{level.label ?? `Niveau ${level.id}`} n'est pas une 1ʳᵉ année.</b> Un étudiant inconnu
            de la faculté qui y entre a suivi les années précédentes ailleurs : l'établissement
            d'origine, la dernière année qui y a été suivie et la référence d'équivalence sont
            <b> obligatoires</b>, et les trois vont ensemble. Sans elles son dossier s'ouvrirait au
            milieu d'un cursus sans rien qui dise que les années du dessous ont été reconnues.
          </Alert>
        )}

        {report && <InscriptionSummary report={report} applied={applied} />}

        {report && report.willCreateStudents > 0 && !applied && (
          <Checkbox
            color="grape"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.currentTarget.checked)}
            label={
              <Text size="sm">
                Je confirme la création de <b>{report.willCreateStudents}</b> étudiant(s) dans la base.
                {report.generatedEmails > 0 && (
                  <> Dont <b>{report.generatedEmails}</b> avec une adresse générée par PGSH.</>
                )}
              </Text>
            }
          />
        )}

        {report && !applied && (
          <Group justify="flex-end">
            <Tooltip label={applyReason(report, confirmed)} disabled={canApply} withArrow>
              <div>
                <Button
                  color="grape" radius="md"
                  leftSection={<IconCheck size={16} stroke={1.5} />}
                  loading={applying}
                  disabled={!canApply}
                  onClick={handleApply}
                >
                  Inscrire {report.willRegister} étudiant(s)
                </Button>
              </div>
            </Tooltip>
          </Group>
        )}

        {applied && (
          <Alert color="teal" variant="light" radius="md" icon={<IconCheck size={16} />}>
            Inscriptions créées, sans groupe : elles rejoignent « Non réparti », d'où la répartition
            automatique les prendra.
          </Alert>
        )}
      </Stack>

      <InscribeStudentModal
        key={singleOpen ? 'open' : 'closed'}
        opened={singleOpen}
        onClose={() => setSingleOpen(false)}
        levels={levels}
        academicYearId={academicYearId}
        initialLevelId={levelId}
      />
    </Card>
  );
}

// ─── The report ───────────────────────────────────────────────────────────────

function InscriptionSummary({ report, applied }: { report: InscriptionReport; applied: boolean }) {
  const badRows = report.rows.filter((r) => INSCRIPTION_ACTION_IS_ERROR(r.action));
  const generated = report.rows.filter((r) => r.generatedEmail);

  return (
    <Stack gap="sm">
      <Divider />

      <Group gap="xs" wrap="wrap">
        <Badge color="grape" variant="light" radius="sm">
          {report.totalRows} ligne(s) dans le fichier
        </Badge>
        <Badge color="red" variant={report.willCreateStudents ? 'filled' : 'light'} radius="sm">
          {applied ? `${report.willCreateStudents} étudiant(s) créé(s)` : `${report.willCreateStudents} étudiant(s) à créer`}
        </Badge>
        {report.newEntrants > 0 && (
          <Badge color="navy" variant="light" radius="sm">{report.newEntrants} nouveaux</Badge>
        )}
        {report.transfersIn > 0 && (
          <Badge color="teal" variant="light" radius="sm">{report.transfersIn} transferts</Badge>
        )}
        {report.returning > 0 && (
          <Badge color="cyan" variant="light" radius="sm">{report.returning} retours</Badge>
        )}
        {report.programmeChanges > 0 && (
          <Badge color="violet" variant="light" radius="sm">
            {report.programmeChanges} réorientation(s)
          </Badge>
        )}
        {report.alreadyRegistered > 0 && (
          <Badge color="gray" variant="light" radius="sm">
            {report.alreadyRegistered} déjà inscrit(s), ignoré(s)
          </Badge>
        )}
        {report.originsRecorded > 0 && (
          <Badge color="orange" variant="light" radius="sm">
            {report.originsRecorded} équivalence(s)
          </Badge>
        )}
        {report.errorCount > 0 && (
          <Badge color="red" variant="light" radius="sm">{report.errorCount} erreur(s)</Badge>
        )}
      </Group>

      {/* ⚠ An address is a login: SyncUserMiddleware matches a Keycloak subject on it. Never buried. */}
      {report.generatedEmails > 0 && (
        <Alert color="yellow" variant="light" radius="md" icon={<IconMail size={16} />}>
          <Text size="sm" fw={600} mb={4}>
            {report.generatedEmails} adresse(s) générée(s) par PGSH
          </Text>
          <Text size="xs" mb={generated.length ? 8 : 0}>
            Le fichier ne portait pas d'adresse pour ces étudiants. Une adresse est un
            <b> identifiant de connexion</b> : c'est par elle que le compte Keycloak sera rattaché.
            Renseignez la colonne E-mail si l'étudiant en a déjà une.
          </Text>
          {generated.length > 0 && (
            <ScrollArea.Autosize mah={140}>
              <Table fz="xs" withTableBorder={false}>
                <Table.Tbody>
                  {generated.map((row) => (
                    <Table.Tr key={row.sheetRow}>
                      <Table.Td w={60}>L{row.sheetRow}</Table.Td>
                      <Table.Td>{row.studentFullName}</Table.Td>
                      <Table.Td><Text ff="monospace" size="xs">{row.generatedEmail}</Text></Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea.Autosize>
          )}
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
                <Table.Th>Cas</Table.Th>
                <Table.Th>Message</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {badRows.map((row) => (
                <Table.Tr key={row.sheetRow}>
                  <Table.Td>{row.sheetRow}</Table.Td>
                  <Table.Td>{row.cne ?? row.appogee ?? '—'}</Table.Td>
                  <Table.Td>{row.studentFullName}</Table.Td>
                  <Table.Td>
                    <Badge size="xs" color="red" variant="light">
                      {INSCRIPTION_ACTION_LABEL[row.action]}
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
          portent sur le fichier entier, et les lignes en erreur viennent en premier.
        </Text>
      )}

      {!applied && report.errorCount > 0 && (
        <Alert color="red" variant="light" radius="md" icon={<IconAlertTriangle size={16} />}>
          L'import est appliqué en totalité ou pas du tout : corrigez le fichier et redéposez-le.
          Aucun étudiant n'a été créé.
        </Alert>
      )}
    </Stack>
  );
}

/** Why the apply button is off. A disabled control with no reason is a dead end. */
function applyReason(report: InscriptionReport, confirmed: boolean) {
  if (report.errorCount > 0) return 'Corrigez les lignes en erreur.';
  if (report.willRegister === 0) return 'Aucune inscription à créer : tout le monde est déjà inscrit.';
  if (report.willCreateStudents > 0 && !confirmed) return 'Confirmez le nombre d’étudiants à créer.';
  return '';
}
