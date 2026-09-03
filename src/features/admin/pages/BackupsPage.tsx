import { useState } from 'react';
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Code,
  Container,
  Divider,
  Group,
  Modal,
  Pagination,
  ScrollArea,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconDatabaseExport,
  IconInfoCircle,
  IconListCheck,
  IconRotateClockwise,
  IconShieldCheck,
  IconTrash,
} from '@tabler/icons-react';
import {
  useCreateBackupPointMutation,
  useDeleteBackupPointMutation,
  useGetBackupPointsQuery,
  useGetSafePointStatusQuery,
  useLazyGetRestorePlanQuery,
  useVerifyBackupPointMutation,
} from '../api/adminApi';
import type {
  BackupKind,
  BackupPoint,
  BackupVerification,
  RestorePlan,
  SafePointState,
} from '../types/backup.types';
import { SafePointBanner } from '../components/SafePointBanner';
import { ConfirmModal } from '../../../common/components/ConfirmModal';

const KIND_LABEL: Record<BackupKind, string> = {
  Scheduled: 'Automatique',
  Named: 'Manuel',
  PreAct: 'Avant un acte',
};

const VERIFICATION_LABEL: Record<BackupVerification, { label: string; color: string }> = {
  // ⚠ Trois états, pas un booléen. Qu'un fichier existe ne prouve rien ; que `pg_restore -l` lise sa
  // table des matières prouve que l'archive n'est ni tronquée ni corrompue — c'est exactement la
  // panne qu'un `pg_dump` redirigé par un tube a produite ici une fois ; et seule une restauration
  // à blanc prouve les lignes.
  Never: { label: 'Jamais relue', color: 'gray' },
  Listed: { label: 'Archive relue', color: 'blue' },
  Restored: { label: 'Restaurée à blanc', color: 'teal' },
};

const STATE_HINT: Record<SafePointState, string> = {
  Unavailable: 'Rien n\'est sauvegardé pour le moment.',
  None: 'Aucun point de restauration n\'existe.',
  SchemaChanged: 'Le dernier point a été pris sous une autre migration.',
  Stale: 'Le dernier point commence à dater.',
  Fresh: 'Un retour en arrière récent est disponible.',
};

export default function BackupsPage() {
  const [page, setPage] = useState(1);

  const { data: status } = useGetSafePointStatusQuery();
  const { data, isFetching } = useGetBackupPointsQuery({ pageNumber: page, pageSize: 25 });

  const [createPoint, { isLoading: isCreating }] = useCreateBackupPointMutation();
  const [verifyPoint, { isLoading: isVerifying }] = useVerifyBackupPointMutation();
  const [deletePoint, { isLoading: isDeleting }] = useDeleteBackupPointMutation();
  const [loadPlan, { data: plan, isFetching: isPlanning }] = useLazyGetRestorePlanQuery();

  const [label, setLabel] = useState('');
  const [note, setNote] = useState('');
  const [toDelete, setToDelete] = useState<BackupPoint | null>(null);
  const [planOpen, setPlanOpen] = useState(false);

  const points = data?.items ?? [];
  const newestId = points[0]?.id;

  const openPlan = async (point: BackupPoint) => {
    setPlanOpen(true);
    await loadPlan(point.id);
  };

  return (
    <Container size="xl" py="lg">
      <Group justify="space-between" align="flex-start" mb="md">
        <div>
          <Title order={2}>Sauvegardes</Title>
          <Text size="sm" c="dimmed">
            Points de restauration de la base. {status ? STATE_HINT[status.state] : ''}
          </Text>
        </div>
        <ThemeIcon size="xl" radius="md" variant="light" color="indigo">
          <IconDatabaseExport size={22} />
        </ThemeIcon>
      </Group>

      <Stack gap="md">
        <SafePointBanner actLabel="Point manuel" />

        {status && (
          <Card withBorder radius="md" padding="md">
            <Group gap="xl" wrap="wrap">
              <Fact label="Dossier" value={status.location} mono />
              <Fact label="Migration en cours" value={status.runningMigration ?? 'inconnue'} mono />
              <Fact label="Version du code" value={status.runningGitSha?.slice(0, 7) ?? 'inconnue'} mono />
              <Fact
                label="Prochaine sauvegarde automatique"
                value={
                  status.nextScheduledAtUtc
                    ? new Date(status.nextScheduledAtUtc).toLocaleString('fr-FR')
                    : 'aucune planification active'
                }
              />
              <Fact label="Points conservés" value={String(status.totalPoints)} />
            </Group>

            {/*
              ⚠ Une lacune énoncée plutôt que supposée réglée. Restaurer la base sans le realm laisse
              SyncUserMiddleware apparier un `sub` Keycloak contre des `User` qui n'existent plus — et
              son repli est l'adresse e-mail, c'est-à-dire le compte de quelqu'un d'autre.
            */}
            {!status.keycloakRealmCovered && (
              <Alert color="orange" variant="light" radius="md" mt="md" icon={<IconAlertTriangle size={16} />}>
                Le realm Keycloak n'est <b>pas</b> sauvegardé avec la base : il vit dans son propre
                volume. Une restauration de la base seule laisse les comptes et la base en désaccord —
                sauvegardez le volume Keycloak séparément avant toute restauration.
              </Alert>
            )}
          </Card>
        )}

        <Card withBorder radius="md" padding="md">
          <Title order={4} mb="sm">Créer un point de sauvegarde</Title>
          <Group align="flex-end" wrap="wrap" gap="sm">
            <TextInput
              label="Libellé"
              placeholder="Avant clôture 2025-2026"
              value={label}
              onChange={(e) => setLabel(e.currentTarget.value)}
              style={{ minWidth: 280 }}
            />
            <Textarea
              label="Note (facultatif)"
              placeholder="Ce que ce point précède"
              value={note}
              onChange={(e) => setNote(e.currentTarget.value)}
              autosize
              minRows={1}
              style={{ minWidth: 320 }}
            />
            <Button
              loading={isCreating}
              // Pré-vol : le validateur serveur exige un libellé, donc le bouton l'exige aussi.
              disabled={label.trim().length === 0}
              onClick={async () => {
                await createPoint({ label: label.trim(), note: note.trim() || undefined }).unwrap()
                  .then(() => { setLabel(''); setNote(''); })
                  .catch(() => {});
              }}
            >
              Créer le point
            </Button>
          </Group>
          <Text size="xs" c="dimmed" mt="xs">
            Un <Code>pg_dump -Fc</Code> plus un manifeste : la migration appliquée, la version du code et
            les effectifs des tables au moment de la prise. C'est le manifeste qui rend la restauration
            vérifiable — un fichier seul ne dit pas sous quel schéma il a été écrit.
          </Text>
        </Card>

        <Card withBorder radius="md" padding="md">
          <Group justify="space-between" mb="sm">
            <Title order={4}>Points disponibles</Title>
            <Text size="sm" c="dimmed">
              {data ? `${points.length} affiché(s) sur ${data.totalCount}` : ''}
              {isFetching ? ' — actualisation…' : ''}
            </Text>
          </Group>

          {points.length === 0 && !isFetching ? (
            <Alert color="red" variant="light" radius="md" icon={<IconAlertTriangle size={16} />}>
              Aucun point de restauration. Les actes en masse — déliberation, réinscription,
              application d'un bloc de rotation — écrivent une promotion entière et ne se défont pas.
            </Alert>
          ) : (
            <ScrollArea>
              <Table striped highlightOnHover verticalSpacing="sm" miw={1000}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Libellé</Table.Th>
                    <Table.Th>Prise le</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Taille</Table.Th>
                    <Table.Th>Schéma</Table.Th>
                    <Table.Th>Relecture</Table.Th>
                    <Table.Th>Par</Table.Th>
                    <Table.Th />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {points.map((point) => (
                    <Table.Tr key={point.id}>
                      <Table.Td>
                        <Text size="sm" fw={500}>{point.label}</Text>
                        <Text size="xs" c="dimmed" ff="monospace">{point.id}</Text>
                        {point.note && <Text size="xs" c="dimmed">{point.note}</Text>}
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{new Date(point.takenAtUtc).toLocaleString('fr-FR')}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light" color={point.kind === 'Scheduled' ? 'gray' : 'indigo'}>
                          {KIND_LABEL[point.kind]}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{formatSize(point.sizeBytes)}</Table.Td>
                      <Table.Td>
                        {point.schemaMatchesRunning ? (
                          <Badge variant="light" color="teal" leftSection={<IconShieldCheck size={12} />}>
                            Compatible
                          </Badge>
                        ) : (
                          <Tooltip
                            label={`Pris sous « ${point.lastMigration ?? 'migration inconnue'} »`}
                            withArrow
                          >
                            <Badge variant="light" color="orange">Autre migration</Badge>
                          </Tooltip>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light" color={VERIFICATION_LABEL[point.verification].color}>
                          {VERIFICATION_LABEL[point.verification].label}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c={point.takenBy ? undefined : 'dimmed'}>
                          {point.takenBy ?? 'planificateur'}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4} justify="flex-end" wrap="nowrap">
                          <Tooltip label="Relire l'archive (pg_restore -l)" withArrow>
                            <ActionIcon
                              variant="subtle"
                              loading={isVerifying}
                              onClick={() => { void verifyPoint(point.id).unwrap().catch(() => {}); }}
                            >
                              <IconListCheck size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Plan de restauration" withArrow>
                            <ActionIcon variant="subtle" onClick={() => { void openPlan(point); }}>
                              <IconRotateClockwise size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip
                            label={
                              point.id === newestId
                                ? 'Le point le plus récent ne se supprime pas : c\'est celui que lisent les confirmations'
                                : 'Supprimer ce point'
                            }
                            withArrow
                          >
                            {/* Pré-vol : le serveur refuse le plus récent, le bouton le dit avant le clic. */}
                            <ActionIcon
                              variant="subtle"
                              color="red"
                              disabled={point.id === newestId}
                              onClick={() => setToDelete(point)}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          )}

          {data && data.totalPages > 1 && (
            <Group justify="center" mt="md">
              <Pagination value={page} onChange={setPage} total={data.totalPages} />
            </Group>
          )}
        </Card>
      </Stack>

      <RestorePlanModal
        opened={planOpen}
        onClose={() => setPlanOpen(false)}
        plan={plan}
        loading={isPlanning}
      />

      <ConfirmModal
        opened={toDelete !== null}
        onClose={() => setToDelete(null)}
        title="Supprimer ce point de sauvegarde ?"
        message={`« ${toDelete?.label ?? ''} » sera définitivement supprimé, archive et manifeste. `
          + 'Les autres points ne sont pas touchés.'}
        confirmLabel="Supprimer"
        loading={isDeleting}
        onConfirm={async () => {
          if (!toDelete) return;
          await deletePoint(toDelete.id).unwrap().catch(() => {});
          setToDelete(null);
        }}
      />
    </Container>
  );
}

/**
 * ⚠ **Il n'y a pas de bouton « Restaurer ».** Un processus ne peut pas remplacer la base dont il se
 * sert : la restauration supprime et recrée des objets que l'API tient ouverts. Ce qui est rendu ici,
 * c'est ce que le retour en arrière **coûte**, en nombres, plus la commande exacte à exécuter la
 * pile arrêtée.
 */
function RestorePlanModal({
  opened,
  onClose,
  plan,
  loading,
}: {
  opened: boolean;
  onClose: () => void;
  plan?: RestorePlan;
  loading: boolean;
}) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Plan de restauration"
      size="xl"
      radius="lg"
      transitionProps={{ duration: 0 }}
    >
      {loading || !plan ? (
        <Text size="sm" c="dimmed">Lecture du manifeste…</Text>
      ) : (
        <Stack gap="md">
          <Alert color="indigo" variant="light" radius="md" icon={<IconInfoCircle size={16} />}>
            Point « {plan.point.label} » du{' '}
            {new Date(plan.point.takenAtUtc).toLocaleString('fr-FR')}.
          </Alert>

          {!plan.schemaMatchesRunning && (
            <Alert color="orange" variant="light" radius="md" icon={<IconAlertTriangle size={16} />}>
              <Text size="sm">
                Ce point a été pris sous la migration{' '}
                <b>{plan.point.lastMigration ?? 'inconnue'}</b>, la base tourne sous{' '}
                <b>{plan.runningMigration ?? 'inconnue'}</b>. Restauré tel quel, il donne une base que
                le code en place ne sait pas lire.
              </Text>
              {plan.schemaStepCommand ? (
                <Code block mt="xs">{plan.schemaStepCommand}</Code>
              ) : (
                <Text size="sm" mt="xs">
                  ⚠ Ce point ne dit pas sous quelle migration il a été pris : aucune étape de schéma ne
                  peut être proposée sans deviner.
                </Text>
              )}
            </Alert>
          )}

          <div>
            <Text size="sm" fw={600} mb={4}>Ce que la restauration ferait</Text>
            <Text size="sm" c="dimmed" mb="xs">
              {plan.totalRowsDiscarded == null
                ? 'Ce point ne porte aucun effectif comparable — l\'ampleur ne peut pas être chiffrée.'
                : `${plan.totalRowsDiscarded.toLocaleString('fr-FR')} ligne(s) écrite(s) depuis seraient `
                  + `effacées, ${(plan.totalRowsRestored ?? 0).toLocaleString('fr-FR')} rétablie(s).`}
            </Text>

            <ScrollArea.Autosize mah={280}>
              <Table striped verticalSpacing="xs">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Table</Table.Th>
                    <Table.Th ta="right">Au point</Table.Th>
                    <Table.Th ta="right">Aujourd'hui</Table.Th>
                    <Table.Th ta="right">Effacées</Table.Th>
                    <Table.Th ta="right">Rétablies</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {plan.impact.map((line) => (
                    <Table.Tr key={line.table}>
                      <Table.Td>{line.table}</Table.Td>
                      <Table.Td ta="right">{formatCount(line.atSafePoint)}</Table.Td>
                      <Table.Td ta="right">{formatCount(line.now)}</Table.Td>
                      <Table.Td ta="right" c={line.discarded ? 'red' : undefined}>
                        {formatCount(line.discarded)}
                      </Table.Td>
                      <Table.Td ta="right" c={line.restored ? 'teal' : undefined}>
                        {formatCount(line.restored)}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea.Autosize>
          </div>

          <Divider />

          <div>
            <Text size="sm" fw={600} mb={4}>Commande à exécuter</Text>
            <Text size="xs" c="dimmed" mb="xs">
              À lancer dans un terminal, <b>l'AppHost arrêté</b> : une restauration ne peut pas
              remplacer une base en cours d'utilisation.
            </Text>
            <Code block>{plan.restoreCommand}</Code>
          </div>
        </Stack>
      )}
    </Modal>
  );
}

function Fact({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <Text size="xs" c="dimmed">{label}</Text>
      <Text size="sm" ff={mono ? 'monospace' : undefined}>{value}</Text>
    </div>
  );
}

/** ⚠ `null` n'est pas 0 : le point ne dit rien de cette table. */
function formatCount(value: number | null): string {
  return value == null ? '—' : value.toLocaleString('fr-FR');
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
}
