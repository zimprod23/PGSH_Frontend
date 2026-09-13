import {
  Alert, Badge, Button, Card, Group, Modal, ScrollArea, Stack, Table, Text, ThemeIcon, Tooltip,
} from '@mantine/core';
import {
  IconAlertTriangle, IconArrowBackUp, IconCheck, IconHistory, IconInfoCircle,
} from '@tabler/icons-react';
import { useState } from 'react';
import {
  useGetAffectationImportsQuery,
  useLazyPreviewAffectationImportReversalQuery,
  useReverseAffectationImportMutation,
} from '../api/adminApi';
import {
  REVERSAL_STATUS_LABEL,
  isReversalError,
  type AffectationImportReversalReport,
  type AffectationImportSummary,
} from '../types/affectationSheet.types';
import { useNotify } from '../../../common/hooks/useNotify';

interface Props {
  levelId: number | null;
  academicYearId: number | null;
}

/** ⚠ Une liste bornée a un mode d'échec que l'illimitée n'avait pas : sa dernière page ressemble à
 *  une sélection vide. Le nombre total est donc affiché dès qu'il dépasse la page. */
const PAGE_SIZE = 25;

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });

/**
 * **Ce qui a été téléversé, et comment le défaire.**
 *
 * ⚠ **Les imports annulés restent dans la liste.** Les cacher répondrait « il ne s'est rien passé » à
 * quelqu'un qui cherche pourquoi le plan d'une promotion a changé deux fois. La ligne dit lequel des
 * deux c'est, et `canBeReversed` dit si le bouton a encore un sens.
 *
 * ⚠ **Le nombre confirmé porte la moitié destructrice** — les affectations que l'import avait
 * *créées*, que l'annulation supprime entières. Rétablir une rotation se refait en renvoyant le
 * fichier ; une affectation supprimée, rien ne la remet.
 */
export function AffectationImportsSection({ levelId, academicYearId }: Props) {
  const notify = useNotify();

  // ⚠ `currentData`, jamais `data` : ce panneau **nomme** son sujet (« sur cette promotion »), donc
  // pendant le changement de promotion `data` afficherait les téléversements de la précédente sous le
  // nom de la nouvelle — une phrase fausse, pas une donnée en retard. Voir CLAUDE.md §1i.
  const { currentData: data, isFetching } = useGetAffectationImportsQuery(
    { levelId: levelId ?? undefined, academicYearId: academicYearId ?? undefined, pageSize: PAGE_SIZE },
    { skip: levelId === null, refetchOnMountOrArgChange: true },
  );

  const [loadPreview, { isFetching: previewing }] = useLazyPreviewAffectationImportReversalQuery();
  const [reverse, { isLoading: reversing }] = useReverseAffectationImportMutation();

  const [target, setTarget] = useState<AffectationImportSummary | null>(null);
  const [report, setReport] = useState<AffectationImportReversalReport | null>(null);

  const close = () => { setTarget(null); setReport(null); };

  const openReversal = async (row: AffectationImportSummary) => {
    setTarget(row);
    setReport(null);
    try {
      setReport(await loadPreview(row.id).unwrap());
    } catch {
      // errorMiddleware a déjà affiché la phrase du serveur.
      setTarget(null);
    }
  };

  const confirmReversal = async () => {
    if (!target || !report) return;
    try {
      const result = await reverse({
        id: target.id,
        // Le nombre que l'opérateur a vu, jamais recalculé ici : c'est toute la garde.
        confirmedCount: report.affectationsToRemove,
      }).unwrap();

      notify.success(
        `${result.affectationsToRemove} affectation(s) supprimée(s), `
        + `${result.periodsToRestore} période(s) rétablie(s).`,
      );
      close();
    } catch {
      // errorMiddleware a déjà affiché la phrase du serveur.
    }
  };

  const rows = data?.items ?? [];
  const total = data?.totalCount ?? 0;

  return (
    <Card withBorder radius="lg" p="lg">
      <Stack gap="md">
        <Group gap="sm">
          <ThemeIcon variant="light" color="grape" radius="md"><IconHistory size={18} /></ThemeIcon>
          <Stack gap={0}>
            <Group gap="xs">
              <Text fw={600}>Téléversements précédents</Text>
              {total > rows.length && (
                <Badge size="sm" variant="light" color="gray">
                  {rows.length} sur {total}
                </Badge>
              )}
            </Group>
            <Text size="xs" c="dimmed">
              Ce qui a été appliqué sur cette promotion, du plus récent au plus ancien — et le moyen
              de le défaire.
            </Text>
          </Stack>
        </Group>

        {levelId === null ? (
          <Text size="sm" c="dimmed">Choisissez une promotion pour voir ses téléversements.</Text>
        ) : rows.length === 0 && !isFetching ? (
          <Text size="sm" c="dimmed">
            Aucun téléversement sur cette promotion. C'est l'état normal d'une promotion planifiée
            depuis la grille.
          </Text>
        ) : (
          <ScrollArea.Autosize mah={320}>
            <Table striped highlightOnHover withTableBorder={false} fz="xs">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Fichier</Table.Th>
                  <Table.Th>Appliqué le</Table.Th>
                  <Table.Th>Par</Table.Th>
                  <Table.Th ta="right">Affectations</Table.Th>
                  <Table.Th ta="right">Périodes remplacées</Table.Th>
                  <Table.Th>État</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {rows.map((row) => (
                  <Table.Tr key={row.id}>
                    <Table.Td>{row.fileName ?? <Text c="dimmed">—</Text>}</Table.Td>
                    <Table.Td>{dateTime(row.appliedAtUtc)}</Table.Td>
                    <Table.Td>{row.appliedByName ?? <Text c="dimmed">—</Text>}</Table.Td>
                    <Table.Td ta="right">{row.affectationCount}</Table.Td>
                    <Table.Td ta="right">{row.replacedPeriodCount}</Table.Td>
                    <Table.Td>
                      {row.status === 'Reversed' ? (
                        <Tooltip label={row.reversedAtUtc ? `Annulé le ${dateTime(row.reversedAtUtc)}` : ''}>
                          <Badge size="sm" variant="light" color="gray">Annulé</Badge>
                        </Tooltip>
                      ) : (
                        <Badge size="sm" variant="light" color="teal">Appliqué</Badge>
                      )}
                    </Table.Td>
                    <Table.Td ta="right">
                      {row.canBeReversed && (
                        <Button
                          size="compact-xs"
                          variant="light"
                          color="orange"
                          leftSection={<IconArrowBackUp size={14} />}
                          loading={previewing && target?.id === row.id}
                          onClick={() => openReversal(row)}
                        >
                          Annuler
                        </Button>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea.Autosize>
        )}
      </Stack>

      <Modal
        opened={target !== null && report !== null}
        onClose={close}
        title="Annuler ce téléversement"
        size="xl"
        radius="lg"
      >
        {report && (
          <Stack gap="md">
            <Text size="sm">
              Téléversement du <b>{dateTime(report.appliedAtUtc)}</b> sur{' '}
              <b>{report.levelLabel}</b> — {report.yearLabel}.
            </Text>

            <Group gap="xs" wrap="wrap">
              <Badge variant="light" color="red" size="lg">
                {report.affectationsToRemove} affectation(s) supprimée(s)
              </Badge>
              <Badge variant="light" color="teal" size="lg">
                {report.affectationsToRestore} rotation(s) rétablie(s)
              </Badge>
              <Badge variant="light" color="blue" size="lg">
                {report.periodsToRestore} période(s) remises
              </Badge>
              {report.publishedPeriodsToRestore > 0 && (
                <Badge variant="light" color="indigo" size="lg">
                  dont {report.publishedPeriodsToRestore} avec leur cellule
                </Badge>
              )}
              {report.alreadyGone > 0 && (
                <Badge variant="light" color="gray" size="lg">
                  {report.alreadyGone} déjà disparue(s)
                </Badge>
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
                  <b>{report.errorCount} affectation(s) ont changé depuis l'import.</b> L'annulation
                  est refusée en entier : la défaire écraserait ce qui a été fait depuis. Traitez ces
                  lignes à la main, puis rouvrez cette fenêtre.
                </Text>
              </Alert>
            )}

            {report.rows.length > 0 && (
              <ScrollArea.Autosize mah={260}>
                <Table striped fz="xs" withTableBorder={false}>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Étudiant</Table.Th>
                      <Table.Th>Apogée</Table.Th>
                      <Table.Th>Stage</Table.Th>
                      <Table.Th>Effet</Table.Th>
                      <Table.Th>Détail</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {report.rows.map((row) => (
                      <Table.Tr key={`${row.registrationId}-${row.stageName}`}>
                        <Table.Td>{row.studentFullName}</Table.Td>
                        <Table.Td>{row.appogee ?? '—'}</Table.Td>
                        <Table.Td>{row.stageName}</Table.Td>
                        <Table.Td>
                          <Badge
                            size="sm"
                            variant="light"
                            color={isReversalError(row.status) ? 'red'
                              : row.status === 'AlreadyGone' ? 'gray' : 'teal'}
                          >
                            {REVERSAL_STATUS_LABEL[row.status]}
                          </Badge>
                        </Table.Td>
                        <Table.Td><Text size="xs" c="dimmed">{row.message}</Text></Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea.Autosize>
            )}

            {report.rowsTruncated && (
              <Text size="xs" c="dimmed">
                Les lignes qui demandent un regard sont affichées en premier ; la liste est tronquée.
              </Text>
            )}

            <Group justify="flex-end">
              <Button variant="default" onClick={close}>Fermer</Button>
              <Button
                color="orange"
                leftSection={<IconCheck size={16} />}
                loading={reversing}
                disabled={!report.canApply}
                onClick={confirmReversal}
              >
                Annuler le téléversement
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Card>
  );
}
