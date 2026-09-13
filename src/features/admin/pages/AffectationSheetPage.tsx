import {
  Alert, Badge, Button, Card, Checkbox, Container, Divider, FileButton, Group, ScrollArea,
  Select, Stack, Table, Text, ThemeIcon, Title, Tooltip,
} from '@mantine/core';
import {
  IconAlertTriangle, IconCheck, IconDownload, IconFileSpreadsheet, IconInfoCircle,
  IconTableImport, IconUpload,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import {
  useApplyAffectationSheetMutation,
  useGetPromotionLevelsQuery,
  useLazyGetAffectationSheetTemplateQuery,
  usePreviewAffectationSheetMutation,
} from '../api/adminApi';
import {
  AFFECTATION_SHEET_STATUS_LABEL,
  isAffectationSheetError,
  type AffectationSheetReport,
} from '../types/affectationSheet.types';
import { AffectationImportsSection } from '../components/AffectationImportsSection';
import { SafePointBanner } from '../components/SafePointBanner';
import { useSafePointGate } from '../hooks/useSafePointGate';
import { useAcademicYear } from '../contexts/useAcademicYear';
import { useNotify } from '../../../common/hooks/useNotify';
import { downloadBlob } from '../../../common/utils/downloadBlob';
import { isReportedByErrorMiddleware, problemMessage } from '../../../common/utils/problemMessage';

/**
 * **Planifier une promotion depuis un tableur.**
 *
 * La faculté planifie dans Excel ; elle l'a toujours fait. Refuser d'en reprendre un n'empêcherait pas
 * le tableur, cela empêcherait seulement PGSH de savoir ce qui a été planifié. Trois gestes :
 * télécharger le canevas, le remplir, le renvoyer.
 *
 * ⚠ **C'est l'acte le plus destructeur de l'application.** Deux nombres sont confirmés séparément —
 * ce qui s'écrit et ce qui se détruit — parce qu'ils bougent pour des raisons différentes et que seule
 * la destruction est définitive. Une seule ligne fautive refuse le fichier entier : construire la
 * moitié d'une année est pire que n'en construire aucune.
 *
 * ⚠ **Ce qu'il écrit est hors grille.** Les périodes apparaissent dans le dossier de l'étudiant et sur
 * la page du service, mais pas dans le planning, et elles ne comptent pas dans la charge que la grille
 * affiche. Le rapport le dit à chaque fois — ce n'est pas un détail d'implémentation, c'est ce qui
 * distingue « la grille est vide » de « la grille ne le voit pas ».
 */
export default function AffectationSheetPage() {
  const notify = useNotify();
  const { currentYearId, currentYear } = useAcademicYear();
  const { data: levels = [] } = useGetPromotionLevelsQuery(undefined);

  const [levelId, setLevelId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<AffectationSheetReport | null>(null);
  const [applied, setApplied] = useState(false);
  const [confirmedDestruction, setConfirmedDestruction] = useState(false);

  const backup = useSafePointGate();

  const [fetchTemplate, { isFetching: downloading }] = useLazyGetAffectationSheetTemplateQuery();
  const [preview, { isLoading: previewing }] = usePreviewAffectationSheetMutation();
  const [apply, { isLoading: applying }] = useApplyAffectationSheetMutation();

  const level = levelId ? Number(levelId) : null;

  const levelOptions = useMemo(
    () => levels.map((l) => ({ value: String(l.id), label: l.label ?? `Niveau ${l.id}` })),
    [levels],
  );

  const reset = () => {
    setReport(null);
    setApplied(false);
    setConfirmedDestruction(false);
  };

  const handleDownload = async () => {
    if (level === null) return;
    try {
      downloadBlob(await fetchTemplate({
        levelId: level,
        academicYearId: currentYearId ?? undefined,
      }).unwrap());
    } catch (err) {
      // Un téléchargement n'a pas d'état vide à rendre, donc il a le droit de parler — mais
      // seulement là où `errorMiddleware` ne l'a pas déjà fait, sinon la phrase s'affiche deux fois.
      if (!isReportedByErrorMiddleware(err))
        notify.error(problemMessage(err) ?? "Le canevas n'a pas pu être téléchargé.");
    }
  };

  const handleFile = async (picked: File | null) => {
    setFile(picked);
    reset();
    if (!picked || level === null) return;
    try {
      setReport(await preview({
        file: picked,
        levelId: level,
        academicYearId: currentYearId ?? undefined,
      }).unwrap());
    } catch {
      // errorMiddleware a déjà affiché la phrase du serveur.
    }
  };

  const handleApply = async () => {
    if (!file || !report || level === null) return;
    try {
      const result = await apply({
        file,
        levelId: level,
        academicYearId: currentYearId ?? undefined,
        // Les deux nombres que l'opérateur a vus, jamais recalculés ici : c'est toute la garde.
        confirmedCount: report.affectations,
        confirmedDroppedPeriods: report.periodsToDrop,
      }).unwrap();

      setReport(result);
      setApplied(true);
      notify.success(
        `${result.affectations} affectation(s) écrite(s), ${result.periodsToWrite} période(s) créée(s)`
        + (result.periodsToDrop > 0 ? `, ${result.periodsToDrop} supprimée(s)` : '') + '.',
      );
    } catch {
      // errorMiddleware a déjà affiché la phrase du serveur.
    }
  };

  // ⚠ La case n'est exigée que lorsqu'il y a réellement quelque chose à détruire. Une confirmation
  // qui s'affiche à chaque fois n'est plus lue, ce qui la retire du seul cas où elle comptait.
  const destroys = (report?.periodsToDrop ?? 0) > 0;
  const canApply = !!report && report.canApply && !applied
    && (!destroys || confirmedDestruction) && !backup.blocked;

  const rows = report?.rows ?? [];

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        <Group gap="sm">
          <ThemeIcon variant="light" color="indigo" radius="md" size="lg">
            <IconTableImport size={20} />
          </ThemeIcon>
          <Stack gap={0}>
            <Title order={3}>Affectations par fichier</Title>
            <Text size="sm" c="dimmed">
              Qui sert quel stage, dans quel service, entre quelles dates — et PGSH en tire les
              cohortes, les affectations, les périodes et les délocalisations.
            </Text>
          </Stack>
        </Group>

        {/* ⚠ Seulement quand il y a réellement quelque chose à détruire : sur un canevas qui ne fait
            qu'ajouter, exiger un point de sauvegarde serait du bruit, et le bruit fait ignorer la
            fois où il compte. */}
        {destroys && !applied && (
          <SafePointBanner
            actLabel={`Avant affectations ${report?.levelLabel ?? ''}`.trim()}
            acknowledged={backup.acknowledged}
            onAcknowledge={backup.setAcknowledged}
          />
        )}

        <Card withBorder radius="lg" p="lg">
          <Stack gap="md">
            <Group gap="md" align="flex-end" wrap="wrap">
              <Select
                label="Promotion"
                placeholder="Choisir…"
                size="xs"
                w={260}
                searchable
                data={levelOptions}
                value={levelId}
                onChange={(v) => { setLevelId(v); setFile(null); reset(); }}
              />
              <Text size="xs" c="dimmed" pb={6}>
                Année&nbsp;: <b>{currentYear?.label ?? '…'}</b>
              </Text>

              {/* ⚠ Désactivé *et* motivé : un contrôle éteint sans raison se lit comme cassé. La
                  portée manquante est un état normal, pas une faute. */}
              <Tooltip label="Choisissez d'abord la promotion." disabled={level !== null}>
                <Button
                  size="xs"
                  variant="light"
                  leftSection={<IconDownload size={14} />}
                  disabled={level === null}
                  loading={downloading}
                  onClick={handleDownload}
                >
                  Télécharger le canevas
                </Button>
              </Tooltip>

              <FileButton onChange={handleFile} accept=".xlsx">
                {(props) => (
                  <Tooltip label="Choisissez d'abord la promotion." disabled={level !== null}>
                    <Button
                      {...props}
                      size="xs"
                      leftSection={<IconUpload size={14} />}
                      disabled={level === null}
                      loading={previewing}
                    >
                      Téléverser et simuler
                    </Button>
                  </Tooltip>
                )}
              </FileButton>

              {file && <Badge variant="light" leftSection={<IconFileSpreadsheet size={12} />}>{file.name}</Badge>}
            </Group>

            <Alert color="indigo" variant="light" radius="md" icon={<IconInfoCircle size={16} />}>
              <Text size="xs">
                Une ligne par <b>période</b>, pas par stage : un stage servi dans trois services fait
                trois lignes. Une ligne laissée <b>entièrement</b> en blanc veut dire « pas encore
                planifié » — elle est comptée et ignorée, donc vous pouvez ne remplir qu'une partie du
                fichier. En revanche une ligne <b>à moitié</b> remplie fait refuser le fichier entier.
                Le motif ne se remplit que pour un service hors faculté, et un service hors faculté
                l'exige.
              </Text>
            </Alert>
          </Stack>
        </Card>

        {report && (
          <Card withBorder radius="lg" p="lg">
            <Stack gap="md">
              <Group justify="space-between" wrap="wrap">
                <Text fw={600}>
                  {applied ? 'Appliqué' : 'Simulation'} — {report.levelLabel}, {report.yearLabel}
                </Text>
                <Text size="xs" c="dimmed">{report.totalRows} ligne(s) lues</Text>
              </Group>

              <Group gap="xs" wrap="wrap">
                <Badge variant="light" color="teal" size="lg">{report.willCreate} créée(s)</Badge>
                <Badge variant="light" color="orange" size="lg">{report.willReplace} réécrite(s)</Badge>
                <Badge variant="light" color="grape" size="lg">{report.willDelocalize} hors faculté</Badge>
                <Badge variant="light" color="gray" size="lg">{report.unchanged} inchangée(s)</Badge>
                <Badge variant="light" color="gray" size="lg">{report.notPlanned} non planifiée(s)</Badge>
                <Divider orientation="vertical" />
                <Badge variant="light" color="blue" size="lg">{report.periodsToWrite} période(s) écrites</Badge>
                {report.periodsToDrop > 0 && (
                  <Badge variant="light" color="red" size="lg">{report.periodsToDrop} supprimée(s)</Badge>
                )}
                {report.publishedPeriodsToDrop > 0 && (
                  <Badge variant="filled" color="red" size="lg">
                    dont {report.publishedPeriodsToDrop} venant de la grille
                  </Badge>
                )}
                {report.cohortsToCreate > 0 && (
                  <Badge variant="light" color="indigo" size="lg">{report.cohortsToCreate} cohorte(s) créées</Badge>
                )}
                {report.outsideCnpn > 0 && (
                  <Badge variant="light" color="yellow" size="lg">{report.outsideCnpn} hors CNPN</Badge>
                )}
              </Group>

              {report.notes.map((note) => (
                <Alert key={note} color="blue" variant="light" radius="md" icon={<IconInfoCircle size={16} />}>
                  <Text size="xs">{note}</Text>
                </Alert>
              ))}

              {report.errorCount > 0 && (
                <Alert color="red" variant="light" radius="md" icon={<IconAlertTriangle size={16} />}>
                  <Text size="xs">
                    <b>{report.errorCount} ligne(s) ne peuvent pas être appliquées.</b> Rien ne sera
                    écrit tant qu'elles ne sont pas corrigées : appliquer une partie du fichier
                    laisserait la promotion à moitié planifiée, ce qui se lit exactement comme
                    planifiée.
                  </Text>
                </Alert>
              )}

              {report.byStage.length > 0 && (
                <ScrollArea.Autosize mah={200}>
                  <Table fz="xs" withTableBorder={false} striped>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Stage</Table.Th>
                        <Table.Th ta="right">Lignes</Table.Th>
                        <Table.Th ta="right">Créées</Table.Th>
                        <Table.Th ta="right">Réécrites</Table.Th>
                        <Table.Th ta="right">Inchangées</Table.Th>
                        <Table.Th ta="right">Erreurs</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {report.byStage.map((s) => (
                        <Table.Tr key={s.stageName}>
                          <Table.Td>{s.stageName}</Table.Td>
                          <Table.Td ta="right">{s.rows}</Table.Td>
                          <Table.Td ta="right">{s.willCreate}</Table.Td>
                          <Table.Td ta="right">{s.willReplace}</Table.Td>
                          <Table.Td ta="right">{s.unchanged}</Table.Td>
                          <Table.Td ta="right">
                            {s.errors > 0 ? <Text c="red" fw={600} size="xs">{s.errors}</Text> : 0}
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea.Autosize>
              )}

              <Divider label="Lignes" labelPosition="left" />

              <ScrollArea.Autosize mah={340}>
                <Table striped highlightOnHover fz="xs" withTableBorder={false}>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Ligne</Table.Th>
                      <Table.Th>Identifiant</Table.Th>
                      <Table.Th>Étudiant</Table.Th>
                      <Table.Th>Stage</Table.Th>
                      <Table.Th>Service</Table.Th>
                      <Table.Th>Effet</Table.Th>
                      <Table.Th>Détail</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {rows.map((row) => (
                      <Table.Tr key={row.sheetRow}>
                        <Table.Td>{row.sheetRow}</Table.Td>
                        <Table.Td>{row.identifier ?? '—'}</Table.Td>
                        <Table.Td>{row.studentFullName ?? '—'}</Table.Td>
                        <Table.Td>{row.stageName ?? '—'}</Table.Td>
                        <Table.Td>{row.serviceName ?? '—'}</Table.Td>
                        <Table.Td>
                          <Group gap={4} wrap="nowrap">
                            <Badge
                              size="sm"
                              variant="light"
                              color={
                                isAffectationSheetError(row.status) ? 'red'
                                  : row.status === 'WillReplace' ? 'orange'
                                    : row.status === 'WillCreate' ? 'teal'
                                      : row.status === 'WillDelocalize' ? 'grape' : 'gray'
                              }
                            >
                              {AFFECTATION_SHEET_STATUS_LABEL[row.status]}
                            </Badge>
                            {row.outsideCnpn && (
                              <Badge size="sm" variant="outline" color="yellow">hors CNPN</Badge>
                            )}
                          </Group>
                        </Table.Td>
                        <Table.Td><Text size="xs" c="dimmed">{row.message}</Text></Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea.Autosize>

              {report.rowsTruncated && (
                <Text size="xs" c="dimmed">
                  Les lignes qui demandent un regard sont affichées en premier ; la liste est tronquée.
                </Text>
              )}

              {!applied && destroys && (
                <Checkbox
                  checked={confirmedDestruction}
                  onChange={(e) => setConfirmedDestruction(e.currentTarget.checked)}
                  label={
                    <Text size="sm">
                      Je confirme la suppression de <b>{report.periodsToDrop}</b> période(s)
                      {report.publishedPeriodsToDrop > 0 && (
                        <> — dont <b>{report.publishedPeriodsToDrop}</b> issues de la grille, que
                        republier ne rétablira pas</>
                      )}.
                    </Text>
                  }
                />
              )}

              <Group justify="flex-end">
                <Button
                  leftSection={<IconCheck size={16} />}
                  loading={applying}
                  disabled={!canApply}
                  onClick={handleApply}
                >
                  {applied ? 'Appliqué' : 'Appliquer'}
                </Button>
              </Group>
            </Stack>
          </Card>
        )}

        {/* ⚠ Sous le formulaire, pas ailleurs : « qu'est-ce que j'ai téléversé, et comment le
            défaire » est la question qu'on se pose immédiatement après avoir appliqué. */}
        <AffectationImportsSection levelId={level} academicYearId={currentYearId} />

        {applied && (
          <Alert color="teal" variant="light" radius="md" icon={<IconCheck size={16} />}>
            <Text size="xs">
              Les entrées de dossier s'écrivent après la transaction, une par une : sur une promotion
              entière elles peuvent continuer d'apparaître pendant plusieurs minutes. Ce n'est pas un
              blocage.
            </Text>
          </Alert>
        )}
      </Stack>
    </Container>
  );
}
