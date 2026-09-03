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
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconCheck,
  IconFileSpreadsheet,
  IconInfoCircle,
  IconTableImport,
  IconUpload,
} from '@tabler/icons-react';
import { useState } from 'react';
import {
  useApplyReinscriptionSheetMutation,
  usePreviewReinscriptionSheetMutation,
  useExportReinscriptionSheetReportMutation,
} from '../api/adminApi';
import {
  REINSCRIPTION_SHEET_ABSENCE_LABEL,
  REINSCRIPTION_SHEET_ERRORS,
  REINSCRIPTION_SHEET_NEEDS_ATTENTION,
  REINSCRIPTION_SHEET_STATUS_LABEL,
  type ReinscriptionSheetReport,
  type ReinscriptionSheetRowStatus,
} from '../types/yearClosure.types';
import { useNotify } from '../../../common/hooks/useNotify';
import { isReportedByErrorMiddleware, problemMessage } from '../../../common/utils/problemMessage';
import { downloadBlob } from '../../../common/utils/downloadBlob';
import { SafePointBanner } from './SafePointBanner';
import { useSafePointGate } from '../hooks/useSafePointGate';

interface Props {
  /** The year being closed. */
  fromYearId: number | null;
  fromYearLabel: string | undefined;
  /** Every year after it, newest last — the same list the derivation-driven rollover offers. */
  targetYears: { value: string; label: string }[];
}


/**
 * **Réinscription par fichier** — the rollover as the faculty actually hands it over.
 *
 * One spreadsheet, one line per student, naming the étape he was in and the étape he enters. Those
 * two facts carry the verdict with them, so this single act does what the déliberation and the
 * réinscription do between them: it records the decision on the year that is closing and creates the
 * registration for the year that is opening.
 *
 * ⚠ **It is not the déliberation canvas with different columns.** That one is a list of *exceptions*
 * and silence means « admis ». This one is the roll of who *is* coming back, so silence means
 * somebody is not — a graduate, an exclusion, an abandon.
 *
 * ⚠ **In a student's last year that absence is decidable, and only there.** He has defended, so the
 * year is recorded « Diplômé » — `Inferred`, so a real defence roll arriving later (`Declared`)
 * corrects it by itself. Everywhere else nothing is written and the students are named, because
 * abandon and exclusion are not distinguishable from a blank line.
 *
 * ⚠ **That is why this act asks for a confirmed count.** Every other write lands on a student the
 * file names; a graduation lands on one it does *not*, so a registration created between the
 * simulation and the apply would have its cursus ended by a confirmation nobody gave for it. The
 * number is sent back to the server, which refuses if it has changed.
 *
 * ⚠ **A level that has not moved is not always a redoublement.** In a final year it is the thesis
 * still being written, which is as ordinary as finishing — so no verdict is recorded there, and
 * `willRecordOutcome` is deliberately smaller than `willRegister`. Reading those lines as failures
 * would annul the year's stage record for the students concerned.
 *
 * The apply is all-or-nothing on the *errors* and idempotent on everything else: an unknown student
 * or a master's programme is skipped and counted, so the file can be re-sent once the missing
 * students have been inscribed.
 */
export function ReinscriptionSheetSection({ fromYearId, fromYearLabel, targetYears }: Props) {
  const notify = useNotify();
  const [exportReport, { isLoading: exporting }] = useExportReinscriptionSheetReportMutation();

  const [toYearId, setToYearId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<ReinscriptionSheetReport | null>(null);
  const [applied, setApplied] = useState(false);
  const [confirmedGraduations, setConfirmedGraduations] = useState(false);

  // ⚠ Le rouleau applique 6 813 inscriptions, 7 232 décisions et 1 327 signalements d'un clic, et il
  // est conçu pour être rejoué. Rien ne le défait ligne à ligne.
  const backup = useSafePointGate();

  const [preview, { isLoading: previewing }] = usePreviewReinscriptionSheetMutation();
  const [apply, { isLoading: applying }] = useApplyReinscriptionSheetMutation();

  const request = {
    fromAcademicYearId: fromYearId ?? 0,
    toAcademicYearId: Number(toYearId),
  };

  const ready = fromYearId !== null && !!toYearId;

  const reset = () => {
    setReport(null);
    setApplied(false);
    setConfirmedGraduations(false);
  };

  const handleFile = async (picked: File | null) => {
    setFile(picked);
    reset();
    if (!picked || !ready) return;
    try {
      setReport(await preview({ ...request, file: picked }).unwrap());
    } catch (err: unknown) {
      notify.error(problemMessage(err) ?? 'Fichier illisible.');
    }
  };

  const handleApply = async () => {
    if (!file || !report) return;
    try {
      const result = await apply({
        ...request,
        file,
        // The number the operator was shown, not one re-derived here — that is the whole guard.
        confirmedGraduationCount: report.willGraduate,
      }).unwrap();

      setReport(result);
      setApplied(true);
      notify.success(
        `${result.willRegister} inscription(s) créée(s) pour ${result.toYearLabel}, `
        + `${result.willRecordOutcome} décision(s) et ${result.willGraduate} diplôme(s) `
        + `enregistré(s) sur ${result.fromYearLabel}.`,
      );
    } catch (err: unknown) {
      notify.error(problemMessage(err) ?? 'La réinscription a été refusée.');
    }
  };

  async function handleExport() {
    if (!file || !fromYearId || !toYearId) return;

    try {
      // ⚠ The file name comes off Content-Disposition, never rebuilt here: the server names the
      // document after the scope it actually resolved.
      downloadBlob(await exportReport({
        file,
        fromAcademicYearId: fromYearId,
        toAcademicYearId: Number(toYearId),
      }).unwrap());
    } catch (err) {
      // A download has no empty state to render, so it is one of the few controls allowed to speak
      // — but only where `errorMiddleware` did not already (CLAUDE.md §1e), or the same sentence is
      // printed twice.
      if (!isReportedByErrorMiddleware(err))
        notify.error(problemMessage(err) ?? "Le rapport n'a pas pu être exporté.");
    }
  }

  return (
    <Card withBorder radius="lg" p="lg">
      <Stack gap="md">
        <Group gap="sm">
          <ThemeIcon variant="light" color="indigo" radius="md"><IconTableImport size={18} /></ThemeIcon>
          <Stack gap={0}>
            <Text fw={600}>Réinscription par fichier</Text>
            <Text size="xs" c="dimmed">
              Le fichier de la faculté : une ligne par étudiant, son étape actuelle et son étape de
              l'an prochain. Clôture {fromYearLabel ?? '…'} et ouvre l'année suivante en un seul geste.
            </Text>
          </Stack>
        </Group>

        <Alert color="indigo" variant="light" radius="md" icon={<IconInfoCircle size={16} />}>
          <Text size="xs">
            Colonnes attendues : <b>Code</b> (numéro Apogée), <b>NOM</b>, <b>PRENOM</b>, puis les deux
            colonnes <b>Etape</b> — l'année en cours, puis l'année de destination. Les étudiants que le
            fichier ne nomme pas ne sont pas touchés : ici, le silence n'est pas une décision. Les
            filières que PGSH ne gère pas (masters) sont ignorées et comptées.
          </Text>
        </Alert>

        <Group gap="md" align="flex-end" wrap="wrap">
          <Select
            label="Année de destination"
            placeholder="Choisir…"
            size="xs"
            w={220}
            data={targetYears}
            value={toYearId}
            onChange={(v) => { setToYearId(v); reset(); }}
          />

          <FileButton onChange={handleFile} accept=".xlsx">
            {(props) => (
              <Button
                {...props}
                size="xs" color="indigo" radius="md"
                leftSection={<IconUpload size={14} stroke={1.5} />}
                loading={previewing}
                disabled={!ready}
              >
                {file ? 'Changer de fichier' : 'Déposer le fichier'}
              </Button>
            )}
          </FileButton>

          {file && (
            <Group gap={6}>
              <IconFileSpreadsheet size={14} />
              <Text size="xs" c="dimmed">{file.name}</Text>
            </Group>
          )}

          {/*
            ⚠ Offered as soon as a file is loaded — before the confirmation, and on a roll the apply
            would refuse. « Donne-moi la liste » is the request, and the on-screen report is capped
            at 1 000 rows while the 2026-2027 roll needs ~1 450 walked through one at a time. The
            export writes nothing, so there is no reason to gate it behind a valid file; a refused
            roll is exactly when the full list of what is wrong is most wanted.
          */}
          {file && (
            <Button
              size="xs" variant="light" color="navy" radius="md"
              leftSection={<IconFileSpreadsheet size={14} stroke={1.5} />}
              loading={exporting}
              onClick={handleExport}
            >
              Exporter le rapport
            </Button>
          )}

          {report && !applied && report.canApply && (
            <Button
              size="xs" color="indigo" radius="md"
              leftSection={<IconCheck size={14} stroke={1.5} />}
              loading={applying}
              disabled={
                (report.willRegister === 0 && report.willGraduate === 0)
                || (report.willGraduate > 0 && !confirmedGraduations)
                || backup.blocked
              }
              onClick={handleApply}
            >
              Appliquer — {report.willRegister} inscription(s)
              {report.willGraduate > 0 && `, ${report.willGraduate} diplôme(s)`}
            </Button>
          )}
        </Group>

        {targetYears.length === 0 && (
          <Alert color="orange" variant="light" radius="md" icon={<IconAlertTriangle size={16} />}>
            Aucune année postérieure n'existe. Créez l'année universitaire suivante avant de
            réinscrire.
          </Alert>
        )}

        {report && !applied && (
          <SafePointBanner
            actLabel="Avant réinscription"
            acknowledged={backup.acknowledged}
            onAcknowledge={backup.setAcknowledged}
          />
        )}

        {report && (
          <SheetSummary
            report={report}
            applied={applied}
            confirmed={confirmedGraduations}
            onConfirm={setConfirmedGraduations}
          />
        )}
      </Stack>
    </Card>
  );
}

// ─── Report ───────────────────────────────────────────────────────────────────

function SheetSummary({
  report,
  applied,
  confirmed,
  onConfirm,
}: {
  report: ReinscriptionSheetReport;
  applied: boolean;
  confirmed: boolean;
  onConfirm: (value: boolean) => void;
}) {
  const attention = report.rows.filter((r) =>
    REINSCRIPTION_SHEET_NEEDS_ATTENTION.includes(r.status),
  );

  const isError = (status: ReinscriptionSheetRowStatus) =>
    REINSCRIPTION_SHEET_ERRORS.includes(status);

  return (
    <Stack gap="sm">
      <Divider />

      <Group gap="xs" wrap="wrap">
        <Badge color="indigo" variant="light" radius="sm">
          {report.totalRows} ligne(s) dans le fichier
        </Badge>
        <Badge color="teal" variant="light" radius="sm">
          {report.willRegister} à réinscrire en {report.toYearLabel}
        </Badge>
        <Badge color="navy" variant="light" radius="sm">
          {report.willRecordOutcome} décision(s) sur {report.fromYearLabel}
        </Badge>
        {report.willGraduate > 0 && (
          <Badge color="grape" variant="light" radius="sm">
            {report.willGraduate} diplômé(s) déduit(s)
          </Badge>
        )}
        {report.outsideScope > 0 && (
          <Badge color="gray" variant="light" radius="sm">
            {report.outsideScope} hors périmètre (masters)
          </Badge>
        )}
        {report.alreadyRegistered > 0 && (
          <Badge color="gray" variant="light" radius="sm">
            {report.alreadyRegistered} déjà inscrit(s)
          </Badge>
        )}
        {report.createdStudents > 0 && (
          <Badge color="blue" variant="light" radius="sm">
            {report.createdStudents} étudiant(s) créé(s)
          </Badge>
        )}
        {report.withoutSourceRegistration > 0 && (
          <Badge color="orange" variant="light" radius="sm">
            {report.withoutSourceRegistration} sans inscription source
          </Badge>
        )}
        {report.willRegisterHeld > 0 && (
          <Badge color="orange" variant="light" radius="sm">
            {report.willRegisterHeld} réinscrit(s) signalé(s)
          </Badge>
        )}
        {report.absenteesHeld > 0 && (
          <Badge color="orange" variant="light" radius="sm">
            {report.absenteesHeld} absent(s) gelé(s)
          </Badge>
        )}
        {report.errorCount > 0 && (
          <Badge color="red" variant="light" radius="sm">{report.errorCount} erreur(s)</Badge>
        )}
      </Group>

      {/*
        The two numbers differ on purpose, and the difference is the thesis years. Stated rather than
        left for somebody to notice: an operator who expects one verdict per registration would
        otherwise read the gap as rows silently dropped.
      */}
      {report.willRegister > report.willRecordOutcome && (
        <Alert color="grape" variant="light" radius="md" icon={<IconInfoCircle size={16} />}>
          <Text size="xs">
            {report.willRegister - report.willRecordOutcome} étudiant(s) sont réinscrits{' '}
            <b>sans qu'aucune décision ne soit portée</b> sur {report.fromYearLabel}. Pour la plupart,
            ce sont des étudiants de <b>dernière année</b> : cette année-là ne se passe ni ne se
            redouble — il n'y a pas de déliberation. L'étudiant valide et revalide ses stages un par
            un, passe les <b>examens cliniques</b> une fois qu'ils sont terminés, et il est réinscrit
            chaque année jusqu'à ce que tout soit acquis. <b>Il ne refait jamais les stages déjà
            validés.</b> Enregistrer un redoublement pour eux annulerait justement les stages de
            l'année. Les autres changent de filière, ou n'ont pas d'inscription source.
          </Text>
        </Alert>
      )}

      {report.notCovered > 0 && (
        <Alert color="blue" variant="light" radius="md" icon={<IconInfoCircle size={16} />}>
          <Text size="xs">
            {report.notCovered} inscription(s) de {report.fromYearLabel} ne figurent pas dans ce
            fichier — ce sont les étudiants qui ne se réinscrivent pas. Sur ce total :{' '}
            <b>{report.willGraduate}</b> sont en dernière année de leur CNPN et seront enregistrés{' '}
            <b>Diplômé</b> ; <b>{report.absentNeedingAttention}</b> ne le sont pas et restent
            inchangés ; <b>{report.absentAlreadyDecided}</b> portent déjà une décision.
          </Text>
          <Text size="xs" mt={6}>
            <b>Toutes les {report.absenteesHeld} sont gelées</b>, y compris les diplômés déduits :
            elles n'entrent dans aucun groupe et ne reçoivent aucune affectation de stage tant que le
            signalement n'est pas levé. La soutenance est une <b>déduction</b> de PGSH, lue sur une
            case vide — pas une déclaration de la faculté —, et rien ne doit être fait sur cette base
            avant qu'un humain l'ait confirmée. Les signalements se lèvent un étudiant à la fois
            depuis la page <b>Signalements</b>.
          </Text>
        </Alert>
      )}

      {/*
        The students the file names and PGSH had never seen. ⚠ Created rather than skipped — skipping
        left them in a downloaded spreadsheet and nowhere anybody works — and flagged *without*
        freezing, because a thin dossier is not a reason to keep a student out of a rotation.
      */}
      {report.createdStudents > 0 && (
        <Alert color="blue" variant="light" radius="md" icon={<IconInfoCircle size={16} />}>
          <Text size="xs">
            <b>{report.createdStudents} étudiant(s) sont créés</b> : le fichier les nomme et PGSH ne
            les connaissait pas. Ils sont créés à partir du <b>numéro Apogée et du nom</b> — tout ce
            que le fichier donne — puis signalés « <b>dossier à compléter</b> ». Ce signalement{' '}
            <b>ne gèle pas</b> : ils entrent dans les groupes et la planification comme les autres.
            Complétez leur fiche (CNE, e-mail réel, date de naissance) depuis leur page étudiant, puis
            levez le signalement.
            {report.generatedEmails > 0 && (
              <>
                {' '}⚠ <b>{report.generatedEmails} adresse(s) e-mail sont générées</b> — une adresse
                sert d'identifiant de connexion. Elles sont attribuées contre les adresses déjà en
                base et figurent sur chaque ligne du rapport exporté.
              </>
            )}
          </Text>
        </Alert>
      )}

      {/*
        ⚠ Created and frozen, not refused. The faculty's roll outranks our stage record — which for
        most of these rows is simply not keyed in yet. Refusing them dropped 182 of the 651
        7ᵉ année Médecine it named as coming back, before the « entrer » fix narrowed the gate to
        genuine entrants; the live roll now holds 60. What replaces the refusal is a signalement: the
        student exists, and he takes no part in the répartition until somebody clears him.
      */}
      {report.willRegisterHeld > 0 && (
        <Alert color="orange" variant="light" radius="md" icon={<IconAlertTriangle size={16} />}>
          <Text size="xs">
            <b>{report.willRegisterHeld} étudiant(s) sont réinscrits puis signalés</b> : le fichier les
            envoie en dernière année de leur CNPN alors qu'un stage antérieur est encore non validé.
            L'inscription est <b>créée</b> — c'est la réinscription elle-même qui lui permet de
            revalider —, mais elle est <b>gelée</b> : il ne peut pas commencer les stages de sa
            dernière année avant d'avoir soldé les précédents. Dans la plupart des cas le stage a été
            fait et seule l'évaluation manque : saisissez-la, puis levez le signalement.
          </Text>
        </Alert>
      )}

      {/*
        ⚠ The one write of this act that lands on students the file does not name. A boolean would
        not do on its own — the number travels to the server, which refuses if it has moved since.
      */}
      {report.willGraduate > 0 && !applied && (
        <Alert color="grape" variant="light" radius="md" icon={<IconAlertTriangle size={16} />}>
          <Text size="sm" fw={600} mb={4}>
            {report.willGraduate} étudiant(s) seront enregistrés « Diplômé » sans être nommés dans le
            fichier
          </Text>
          <Text size="xs" mb="xs">
            Ils sont absents du fichier <b>et</b> en dernière année de leur propre CNPN. Or on
            réinscrit un étudiant de dernière année tant qu'il lui reste un stage à valider ou les
            examens cliniques à passer : s'il n'est pas réinscrit, c'est qu'il a terminé. La décision
            est enregistrée comme <b>déduite</b>, pas déclarée — si vous déposez plus tard la liste
            des soutenances, elle la corrigera d'elle-même. Les étudiants absents qui ne sont
            <b>pas</b> en dernière année ne sont pas touchés : rien dans le fichier ne distingue un
            abandon d'une exclusion.
          </Text>
          <Checkbox
            size="xs"
            color="grape"
            checked={confirmed}
            onChange={(e) => onConfirm(e.currentTarget.checked)}
            label={`Je confirme la fin de cursus de ces ${report.willGraduate} étudiant(s).`}
          />
        </Alert>
      )}

      {report.absentees.length > 0 && (
        <ScrollArea.Autosize mah={240}>
          <Table striped highlightOnHover fz="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Absent du fichier</Table.Th>
                <Table.Th>Apogée</Table.Th>
                <Table.Th>Niveau</Table.Th>
                <Table.Th>État</Table.Th>
                <Table.Th>Message</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {report.absentees.map((a) => (
                <Table.Tr key={a.studentId}>
                  <Table.Td>{a.studentFullName}</Table.Td>
                  <Table.Td>{a.appogee ?? '—'}</Table.Td>
                  <Table.Td>{a.levelLabel}</Table.Td>
                  <Table.Td>
                    <Badge size="xs" variant="light" color="orange">
                      {REINSCRIPTION_SHEET_ABSENCE_LABEL[a.outcome]}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{a.message}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea.Autosize>
      )}

      {report.absenteesTruncated && (
        <Text size="xs" c="dimmed">
          Seuls les {report.absentees.length} premiers absents à examiner sont affichés ; le compteur
          ci-dessus est exact.
        </Text>
      )}

      {report.byLevel.length > 0 && (
        <ScrollArea.Autosize mah={240}>
          <Table striped highlightOnHover withTableBorder={false} fz="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Étape actuelle</Table.Th>
                <Table.Th ta="right">Lignes</Table.Th>
                <Table.Th ta="right">Réinscrits</Table.Th>
                <Table.Th ta="right">À examiner</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {report.byLevel.map((b) => (
                <Table.Tr key={b.fromLevelLabel}>
                  <Table.Td>{b.fromLevelLabel}</Table.Td>
                  <Table.Td ta="right">{b.listed}</Table.Td>
                  <Table.Td ta="right">{b.willRegister}</Table.Td>
                  <Table.Td ta="right">{b.needsAttention || '—'}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea.Autosize>
      )}

      {attention.length > 0 && (
        <ScrollArea.Autosize mah={280}>
          <Table striped highlightOnHover fz="xs">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Ligne</Table.Th>
                <Table.Th>Code</Table.Th>
                <Table.Th>Étudiant</Table.Th>
                <Table.Th>Étape</Table.Th>
                <Table.Th>État</Table.Th>
                <Table.Th>Message</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {attention.map((row) => (
                <Table.Tr key={row.sheetRow}>
                  <Table.Td>{row.sheetRow}</Table.Td>
                  <Table.Td>{row.code ?? '—'}</Table.Td>
                  <Table.Td>{row.studentFullName ?? '—'}</Table.Td>
                  <Table.Td>
                    {row.fromLevelLabel ?? '—'}
                    {row.toLevelLabel ? ` → ${row.toLevelLabel}` : ''}
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      size="xs"
                      variant="light"
                      color={isError(row.status) ? 'red' : 'orange'}
                    >
                      {REINSCRIPTION_SHEET_STATUS_LABEL[row.status]}
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
          <Text size="xs">
            {report.errorCount} ligne(s) ne peuvent pas être appliquées. La réinscription est appliquée
            en totalité ou pas du tout : corrigez le fichier et redéposez-le. Une étape qui contredit
            l'inscription enregistrée porterait une décision sur le mauvais étudiant, et cela ne se
            rattrape pas.
          </Text>
        </Alert>
      )}

      {applied && (
        <Alert color="teal" variant="light" radius="md" icon={<IconCheck size={16} />}>
          <Text size="xs">
            Appliqué. {report.willRegister} inscription(s) créée(s) en {report.toYearLabel}
            {report.willGraduate > 0 && `, ${report.willGraduate} diplôme(s) enregistré(s)`}. Les
            étudiants réinscrits sont dans le groupe « Non réparti » : la répartition est l'étape
            suivante.
          </Text>
        </Alert>
      )}
    </Stack>
  );
}
