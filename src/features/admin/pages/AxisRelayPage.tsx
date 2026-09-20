import { useMemo, useState } from 'react';
import {
  Alert, Badge, Button, Card, Center, Checkbox, Group, Loader, Modal, Paper, ScrollArea,
  Select, SimpleGrid, Stack, Table, Text, Title, Tooltip,
} from '@mantine/core';
import {
  IconAlertTriangle, IconArrowBackUp, IconArrowForwardUp, IconCalendarStats,
  IconInfoCircle, IconLock,
} from '@tabler/icons-react';
import {
  useApplyAxisRelayMutation, useGetPromotionLevelsQuery, useLazyPreviewAxisRelayQuery,
} from '../api/adminApi';
import { useAcademicYear } from '../contexts/useAcademicYear';
import { problemMessage } from '../../../common/utils/problemMessage';
import { SafePointBanner } from '../components/SafePointBanner';
import { useSafePointGate } from '../hooks/useSafePointGate';
import type { AxisRelayColumn, AxisRelayPreview, ServiceCrossing } from '../types/admin.types';

/**
 * Reposer l'axe d'une promotion sur son calendrier.
 *
 * <p>Déclarer une semaine d'examens n'écrit aucune date — c'est la propriété qui la rend
 * révocable — donc une fenêtre posée après que la grille a été bâtie laisse les colonnes où elles
 * sont, plus courtes de ce qu'elle leur prend. Cet écran repose les colonnes sur le calendrier
 * courant et fait suivre les rotations déjà publiées.</p>
 *
 * <p>⚠ <b>Ce n'est pas une annulation, dans un sens comme dans l'autre.</b> L'axe est un calcul —
 * date d'ancrage + longueur de colonne + calendrier — et l'acte <b>écrase</b> ce qui est stocké par
 * ce que ce calcul rend aujourd'hui. Supprimez la fenêtre et le même calcul rend des dates
 * antérieures&nbsp;: on les réécrit, voilà tout. Il n'y a pas d'historique à rejouer.</p>
 *
 * <p>⚠ <b>Deux nombres se confirment, pas un.</b> Ce que l'acte réécrit dans la grille et ce qu'il
 * réécrit dans les dossiers bougent pour des raisons différentes : une rotation notée entre
 * l'aperçu et l'application change le second sans toucher au premier. Un seul compte en laisserait
 * passer la moitié, et une case à cocher les deux.</p>
 */

const dmy = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

/** ⚠ Nommé plutôt que déduit d'un `moved` seul : « ancrée » et « rien ne la poussait » diffèrent. */
function ColumnState({ column }: { column: AxisRelayColumn }) {
  if (column.anchored) {
    return (
      <Tooltip label="Déplacée à la main : le recalcul la laisse où elle est et enchaîne après elle." withArrow>
        <Badge size="sm" variant="light" color="grape" leftSection={<IconLock size={12} />}>
          Ancrée
        </Badge>
      </Tooltip>
    );
  }

  if (!column.moved) return <Text size="xs" c="dimmed">inchangée</Text>;

  const held = column.toStartDate === column.fromStartDate;

  return (
    <Badge size="sm" variant="light" color={held ? 'orange' : 'blue'}>
      {held ? 'Allongée' : 'Déplacée'}
    </Badge>
  );
}

function ColumnTable({ columns }: { columns: AxisRelayColumn[] }) {
  return (
    <Table.ScrollContainer minWidth={760}>
      <Table striped highlightOnHover verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Colonne</Table.Th>
            <Table.Th>Aujourd’hui</Table.Th>
            <Table.Th>Après</Table.Th>
            <Table.Th ta="center">Jours ouvrables</Table.Th>
            <Table.Th>État</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {columns.map((c) => (
            <Table.Tr key={c.periodNumber}>
              <Table.Td><Text size="sm" fw={600}>P{c.periodNumber}</Text></Table.Td>
              <Table.Td>
                <Text size="sm" c="dimmed">{dmy(c.fromStartDate)} → {dmy(c.fromEndDate)}</Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm" fw={c.moved ? 600 : 400}>
                  {dmy(c.toStartDate)} → {dmy(c.toEndDate)}
                </Text>
              </Table.Td>
              <Table.Td ta="center">
                {/* ⚠ Les deux nombres, pas seulement celui d'après : « 22 » ne dit pas qu'il en
                    manquait cinq, et c'est le manque qui justifie l'acte. */}
                <Text size="sm" c={c.fromWorkingDays === c.toWorkingDays ? 'dimmed' : 'orange.7'}>
                  {c.fromWorkingDays} → {c.toWorkingDays}
                </Text>
              </Table.Td>
              <Table.Td><ColumnState column={c} /></Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

function CrossingTable({ rows }: { rows: ServiceCrossing[] }) {
  return (
    <Table.ScrollContainer minWidth={820}>
      <Table striped verticalSpacing="xs">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Service</Table.Th>
            <Table.Th ta="center">Pic</Table.Th>
            <Table.Th ta="center">Jours à ce niveau</Table.Th>
            <Table.Th>Croise</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((r) => (
            <Table.Tr key={r.serviceId}>
              <Table.Td>
                <Text size="sm" fw={500}>{r.serviceName}</Text>
                <Text size="xs" c="dimmed">{r.hospitalName}</Text>
              </Table.Td>
              <Table.Td ta="center">
                <Text size="sm" fw={r.increase > 0 ? 700 : 400} c={r.increase > 0 ? 'orange.7' : undefined}>
                  {r.peakBefore} → {r.peakAfter}
                </Text>
              </Table.Td>
              <Table.Td ta="center">
                {/* ⚠ La moitié que le pic seul ne dit pas : un service peut porter autant de monde
                    et le porter bien plus longtemps. */}
                <Text size="sm" c={r.staysBusyLonger ? 'orange.7' : 'dimmed'} fw={r.staysBusyLonger ? 600 : 400}>
                  {r.busiestDaysBefore} → {r.busiestDaysAfter} j
                </Text>
              </Table.Td>
              <Table.Td>
                <Group gap={4} wrap="wrap">
                  {r.otherPromotions.length === 0
                    ? <Text size="xs" c="dimmed">—</Text>
                    : r.otherPromotions.map((p) => (
                        <Badge key={p} size="xs" variant="light" color="navy">{p}</Badge>
                      ))}
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

export default function AxisRelayPage() {
  const { currentYear, currentYearId } = useAcademicYear();
  const { data: levels } = useGetPromotionLevelsQuery(undefined);

  const [levelId, setLevelId] = useState<string | null>(null);

  /**
   * La promotion que l'aperçu affiché décrit — pas celle que le Select montre.
   *
   * ⚠ La requête est *lazy* : changer de promotion ne la relance pas, donc `data` continuerait de
   * décrire l'ancienne sous le nom de la nouvelle. C'est §1i pris par l'autre bout — `currentData`
   * ne sauve rien ici, puisque l'argument ne change qu'au clic. Un tableau de dates est une phrase
   * fausse, pas une donnée en retard : on le retire jusqu'au prochain calcul.
   */
  const [previewedLevelId, setPreviewedLevelId] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const [runPreview, { data, isFetching, error, isError }] = useLazyPreviewAxisRelayQuery();
  const [apply, { isLoading: applying }] = useApplyAxisRelayMutation();
  const backup = useSafePointGate();

  // Rien n'est montré tant que ce qui est affiché ne décrit pas la promotion choisie.
  const preview = data && data.levelId === previewedLevelId && String(data.levelId) === levelId
    ? data
    : undefined;

  const levelOptions = useMemo(
    () => (levels ?? []).map((l) => ({ value: String(l.id), label: l.label ?? `Niveau ${l.id}` })),
    [levels],
  );

  const ready = currentYearId !== null && levelId !== null;

  async function onPreview() {
    if (!ready) return;
    setDone(null);
    const asked = Number(levelId);
    await runPreview({ levelId: asked, academicYearId: currentYearId! });
    setPreviewedLevelId(asked);
  }

  function onLevelChange(value: string | null) {
    setLevelId(value);
    setPreviewedLevelId(null);   // ⚠ §1i : l'aperçu ne décrit plus la promotion nommée à l'écran.
    setDone(null);
  }

  async function onApply(p: AxisRelayPreview) {
    try {
      // ⚠ Les deux comptes viennent de l'aperçu affiché, jamais d'un recompte local : le serveur
      // recalcule les siens dans la transaction et refuse s'ils ont bougé depuis. C'est ce qui
      // attrape une rotation notée entre l'écran et le clic.
      const result = await apply({
        levelId: p.levelId,
        academicYearId: p.academicYearId,
        confirmedSlotCount: p.slotsAffected,
        confirmedPeriodCount: p.periodsAffected,
      }).unwrap();

      setConfirmOpen(false);
      setUnderstood(false);
      setDone(
        `${result.slotsRelaid} colonne(s) reposée(s), ${result.periodsMoved} rotation(s) déplacée(s), `
        + `${result.periodsExtended} allongée(s), ${result.periodsShortened} raccourcie(s). `
        + `L’axe se termine le ${dmy(result.axisEndsOn)}.`,
      );
      await onPreview();
    } catch {
      // errorMiddleware montre la phrase du refus ; la fenêtre reste ouverte pour la relire.
    }
  }

  // ⚠ `problemMessage`, jamais un `detailOf` maison : un refus métier met sa phrase dans `detail`,
  // un échec du pipeline de validation y met la phrase générique et les vraies dans `errors[]`.
  // Quatre fichiers avaient chacun réécrit la moitié inutile.
  const refusal = problemMessage(error);

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Recalcul de l’axe</Title>
        <Text c="dimmed" size="sm">
          Reposer les colonnes d’une promotion sur son calendrier, et faire suivre les rotations
          publiées.
        </Text>
      </div>

      <Alert color="blue" variant="light" icon={<IconInfoCircle size={18} />}>
        <Text size="sm">
          Déclarer une semaine d’examens n’écrit <strong>aucune date</strong> — c’est ce qui la rend
          révocable. Une fenêtre posée après que la grille a été bâtie laisse donc les colonnes où
          elles sont, plus courtes de ce qu’elle leur prend&nbsp;; cet écran les repose.
          <br />
          Ce n’est pas une annulation&nbsp;: l’axe est un <strong>calcul</strong>, et l’acte écrase
          les dates stockées par ce que ce calcul rend aujourd’hui. Supprimez la fenêtre, relancez,
          et les dates d’origine reviennent d’elles-mêmes.
        </Text>
      </Alert>

      <Paper withBorder p="md" radius="md">
        <Group align="flex-end" gap="md" wrap="wrap">
          <Stack gap={2}>
            <Text size="sm" fw={500}>Année universitaire</Text>
            <Badge size="lg" variant="light" color="navy">{currentYear?.label ?? '—'}</Badge>
          </Stack>

          <Select
            label="Promotion"
            placeholder="Choisir"
            data={levelOptions}
            value={levelId}
            onChange={onLevelChange}
            searchable
            w={280}
          />

          <Button
            onClick={onPreview}
            disabled={!ready}
            loading={isFetching}
            leftSection={<IconCalendarStats size={16} />}
          >
            Calculer l’aperçu
          </Button>
        </Group>
      </Paper>

      {!currentYearId && (
        <Alert color="gray" variant="light">
          Choisissez une année universitaire dans la barre du haut.
        </Alert>
      )}

      {done && <Alert color="teal" variant="light">{done}</Alert>}

      {isError && (
        <Alert color={refusal ? 'orange' : 'red'} variant="light" icon={<IconAlertTriangle size={18} />}>
          {refusal ?? 'L’aperçu n’a pas pu être calculé.'}
        </Alert>
      )}

      {isFetching && !preview && <Center h={200}><Loader color="navy" /></Center>}

      {preview && !isError && (
        <Stack gap="lg" style={{ opacity: isFetching ? 0.6 : 1, transition: 'opacity 150ms' }}>
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
            <Card withBorder radius="md" padding="sm">
              <Text size="xs" c="dimmed">
                {preview.isRollingBack ? 'Jours rendus' : 'Jours rattrapés'}
              </Text>
              <Group gap={6} align="baseline">
                {preview.isRollingBack
                  ? <IconArrowBackUp size={18} />
                  : <IconArrowForwardUp size={18} />}
                <Text fw={700} size="xl" c={preview.isRollingBack ? 'blue.7' : 'teal.7'}>
                  {Math.abs(preview.workingDaysChanged)}
                </Text>
              </Group>
              <Text size="xs" c="dimmed">jours ouvrables, par étudiant</Text>
            </Card>

            <Card withBorder radius="md" padding="sm">
              <Text size="xs" c="dimmed">L’année se terminera le</Text>
              <Text fw={700} size="xl">{dmy(preview.axisEndsOn)}</Text>
              <Text size="xs" c="dimmed">
                dernière colonne de l’axe
              </Text>
            </Card>

            <Card withBorder radius="md" padding="sm">
              <Text size="xs" c="dimmed">Grille</Text>
              <Text fw={700} size="xl">{preview.slotsAffected}</Text>
              <Text size="xs" c="dimmed">
                créneau(x) sur {preview.columnsMoved} colonne(s)
              </Text>
            </Card>

            <Card withBorder radius="md" padding="sm">
              <Text size="xs" c="dimmed">Dossiers</Text>
              <Text fw={700} size="xl">{preview.periodsAffected}</Text>
              <Text size="xs" c="dimmed">
                {preview.periodsToMove} déplacée(s) · {preview.periodsToExtend} allongée(s)
                {preview.periodsToShorten > 0 && ` · ${preview.periodsToShorten} raccourcie(s)`}
              </Text>
            </Card>
          </SimpleGrid>

          {/* ⚠ Une rotation que l'acte ne rattrapera pas est une information, pas un échec : une
              note est un fait. Mais elle se dit, sinon « N rotations déplacées » laisse croire que
              tout le monde a été rattrapé. */}
          {preview.periodsBlocked > 0 && (
            <Alert color="orange" variant="light" icon={<IconAlertTriangle size={18} />}>
              <Text size="sm">
                <strong>{preview.periodsBlocked} rotation(s)</strong> ne seront pas rattrapées&nbsp;:
                elles sont closes, notées, pointées ou interrompues, et leurs dates sont un compte
                rendu de ce qui a eu lieu. L’acte les laisse et pousse le reste.
              </Text>
            </Alert>
          )}

          {preview.warnings.map((w) => (
            <Alert key={w} color="yellow" variant="light" icon={<IconInfoCircle size={16} />}>
              <Text size="xs">{w}</Text>
            </Alert>
          ))}

          <Paper withBorder p="md" radius="md">
            <Group justify="space-between" mb="sm" wrap="wrap">
              <Text fw={600}>Colonnes</Text>
              <Text size="xs" c="dimmed">
                Colonnes de <strong>{preview.columnLength}</strong> jours ouvrables
                {' '}({preview.columnsAgreeingOnLength}/{preview.columnCount} d’accord)
                {' · '}recalcul à partir de P{preview.fromPeriodNumber}
                {preview.columnsAnchored > 0 && ` · ${preview.columnsAnchored} ancrée(s)`}
              </Text>
            </Group>
            <ColumnTable columns={preview.columns} />
          </Paper>

          <Paper withBorder p="md" radius="md">
            <Group justify="space-between" mb="sm" wrap="wrap">
              {/* ⚠ Pas « croisement » : une ligne dont la colonne « Croise » est vide n'en est pas
                  un — c'est le service qui tient sa *propre* promotion plus longtemps. Les deux
                  méritent d'être vus, et un titre qui promet l'un en montrant l'autre se lit comme
                  un défaut. */}
              <Text fw={600}>Charge des services après recalcul</Text>
              <Text size="xs" c="dimmed">
                {preview.crossings.servicesExamined} service(s) examiné(s)
              </Text>
            </Group>

            {preview.crossings.listed.length === 0 ? (
              <Text size="sm" c="dimmed">
                Aucun service ne portera plus de monde, ni ne restera chargé plus longtemps
                qu’aujourd’hui.
              </Text>
            ) : (
              <Stack gap="sm">
                <Text size="xs" c="dimmed">
                  {preview.crossings.servicesWherePeakRises} service(s) porteront davantage de monde
                  à leur heure de pointe
                  {preview.crossings.servicesWhereBusyLasts > 0 && (
                    <>
                      {' ; '}
                      <strong>{preview.crossings.servicesWhereBusyLasts}</strong> n’en porteront pas
                      plus mais resteront à leur charge de pointe plus longtemps
                    </>
                  )}
                  . Ce n’est pas un refus — le dépassement est le fonctionnement de la faculté.
                  {' '}La colonne « Croise » nomme les autres promotions présentes au pic&nbsp;;
                  vide, le service tient simplement la sienne plus longtemps.
                </Text>
                <CrossingTable rows={preview.crossings.listed} />
              </Stack>
            )}
          </Paper>

          {/* ⚠ §1g-bis — l'acte réécrit les dates de milliers de rotations : le point de reprise
              s'offre depuis l'écran, parce qu'une sauvegarde qu'il faut penser à prendre dans un
              terminal saute le jour où elle sert. Il ne bloque pas : sans retour exploitable, c'est
              la case qui garde le bouton. */}
          <SafePointBanner
            actLabel="Avant un recalcul d'axe"
            acknowledged={backup.acknowledged}
            onAcknowledge={backup.setAcknowledged}
          />

          <Group justify="flex-end">
            <Button
              color="orange"
              disabled={backup.blocked}
              onClick={() => { setUnderstood(false); setConfirmOpen(true); }}
              leftSection={<IconCalendarStats size={16} />}
            >
              Appliquer le recalcul
            </Button>
          </Group>

          <Modal
            opened={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            title="Appliquer le recalcul de l’axe"
            size="lg"
          >
            <Stack gap="md">
              <Text size="sm">
                Cet acte réécrira les dates de <strong>{preview.slotsAffected} créneau(x)</strong> de
                la grille et de <strong>{preview.periodsAffected} rotation(s)</strong> dans les
                dossiers des étudiants. Tout atterrit, ou rien.
              </Text>

              <ScrollArea.Autosize mah={180}>
                <Table verticalSpacing={4} withRowBorders={false}>
                  <Table.Tbody>
                    {preview.columns.filter((c) => c.moved).map((c) => (
                      <Table.Tr key={c.periodNumber}>
                        <Table.Td><Text size="xs" fw={600}>P{c.periodNumber}</Text></Table.Td>
                        <Table.Td><Text size="xs" c="dimmed">{dmy(c.fromStartDate)} → {dmy(c.fromEndDate)}</Text></Table.Td>
                        <Table.Td><Text size="xs">{dmy(c.toStartDate)} → {dmy(c.toEndDate)}</Text></Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea.Autosize>

              <Alert color="orange" variant="light">
                <Text size="xs">
                  L’année universitaire de cette promotion se terminera le{' '}
                  <strong>{dmy(preview.axisEndsOn)}</strong>.
                  {preview.periodsBlocked > 0 && (
                    <> {preview.periodsBlocked} rotation(s) ne seront pas rattrapées.</>
                  )}
                </Text>
              </Alert>

              <Checkbox
                checked={understood}
                onChange={(e) => setUnderstood(e.currentTarget.checked)}
                label={
                  `J’ai lu les deux nombres : ${preview.slotsAffected} créneaux et `
                  + `${preview.periodsAffected} rotations.`
                }
              />

              <Group justify="flex-end">
                <Button variant="default" onClick={() => setConfirmOpen(false)}>Annuler</Button>
                <Button
                  color="orange"
                  disabled={!understood}
                  loading={applying}
                  onClick={() => onApply(preview)}
                >
                  Appliquer
                </Button>
              </Group>
            </Stack>
          </Modal>
        </Stack>
      )}
    </Stack>
  );
}
