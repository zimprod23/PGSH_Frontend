import { useMemo } from 'react';
import {
  Alert, Badge, Card, Center, Group, Loader, Pagination, Paper, Select, Stack, Table, Text,
  Title, Tooltip,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconHistory, IconInfoCircle, IconUserQuestion } from '@tabler/icons-react';
import { useGetAuditLogQuery } from '../api/adminApi';
import { useListParams } from '../../../common/hooks/useListParams';
import { problemMessage } from '../../../common/utils/problemMessage';
import {
  auditActionLabel, isDestructiveAction, isUnlabelledAction, readMetadata,
} from '../components/audit/auditActions';
import type { AuditLogEntry } from '../types/audit.types';

/**
 * « Journal des actions » — qui a fait quoi, et quand.
 *
 * <p>Trente-cinq commandes écrivaient dans <code>AuditLogs</code> depuis des mois et <b>rien ne
 * pouvait le relire</b> : ni route, ni écran. La table était en écriture seule, donc la trace
 * n'était consultable qu'en interrogeant la base à la main. Le 02/09/2026 la question s'est posée
 * pour de vrai — 66 rosters étaient apparus sur la 7ᵉ MED et personne ne pouvait dire d'où.</p>
 *
 * <p>⚠ <b>Cette page ignore délibérément l'année de la barre du haut.</b> Une entrée d'audit est
 * datée d'une horloge, pas d'une année académique : le geste qui touche 2026-2027 a très bien pu
 * être fait en juillet. C'est la seule lecture de ce dossier où l'absence d'année n'est pas un
 * défaut — le filtre est une plage de dates.</p>
 */

type Filters = {
  action: string | null;
  from: string | null;
  to: string | null;
};

/** Au niveau du module : `useListParams` mémorise sur son identité. */
const FILTERS: Filters = { action: '', from: '', to: '' };

const PAGE_SIZE = 50;

/**
 * Le jour choisi (`YYYY-MM-DD`), traduit en instant UTC — début de cette journée-là **dans le fuseau
 * du lecteur**, décalé de `plusDays`.
 *
 * ⚠ **C'est ici que « une journée » est définie, et c'est voulu.** Le serveur ne reçoit que des
 * instants : il ne suppose aucun fuseau, ce qu'il ne saurait pas faire correctement. « Au 3 inclus »
 * s'écrit donc « < début du 4 local ». Sans cette traduction, une entrée du 02/09 à 22:16 UTC —
 * affichée « 03/09 00:16 » ici — disparaissait d'un filtre portant sur le 3.
 *
 * `new Date(y, m - 1, d)` construit minuit **local** ; `toISOString()` le rend en UTC.
 */
function dayStartUtc(day: string, plusDays = 0): string | undefined {
  const [y, m, d] = day.split('-').map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return undefined;

  return new Date(y, m - 1, d + plusDays).toISOString();
}

const stamp = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

function Author({ entry }: { entry: AuditLogEntry }) {
  if (entry.performedBy) return <Text size="sm">{entry.performedBy}</Text>;

  // ⚠ « Inconnu » et « personne » sont deux faits différents, et un blanc les confondrait. Il n'y a
  // aucune clé étrangère derrière l'identifiant : le compte peut avoir été supprimé, ou la base
  // restaurée sans son royaume Keycloak. L'identifiant brut reste la seule chose vraie.
  const unresolved = entry.performedByUserId !== null;

  return (
    <Tooltip
      label={unresolved
        ? `Auteur non résolu — identifiant ${entry.performedByUserId}. Le compte a peut-être été `
          + 'supprimé, ou la base restaurée sans son royaume Keycloak.'
        : 'Aucun auteur enregistré : acte effectué hors d’une session utilisateur (tâche planifiée, '
          + 'script de maintenance).'}
      withArrow
      multiline
      w={300}
    >
      <Group gap={4} style={{ cursor: 'help' }}>
        <IconUserQuestion size={14} opacity={0.6} />
        <Text size="sm" c="dimmed" fs="italic">
          {unresolved ? 'non résolu' : 'système'}
        </Text>
      </Group>
    </Tooltip>
  );
}

function Criteria({ entry }: { entry: AuditLogEntry }) {
  const parsed = readMetadata(entry.metadata);

  if (parsed === null) return <Text size="xs" c="dimmed">—</Text>;

  // Une métadonnée illisible reste une entrée : on montre le texte brut plutôt que de la faire
  // disparaître. Les commandes les plus anciennes construisent leur JSON à la main.
  if (typeof parsed === 'string') {
    return <Text size="xs" c="dimmed" style={{ wordBreak: 'break-all' }}>{parsed}</Text>;
  }

  return (
    <Group gap={4}>
      {parsed.map(({ key, value, full, truncated }) => {
        const chip = (
          <Badge size="xs" variant="light" color="gray" style={{ textTransform: 'none' }}>
            {key} : {value}
          </Badge>
        );

        // Une valeur longue est coupée dans la puce et entière dans l'infobulle : la colonne doit
        // rester lisible sans jamais perdre ce qui a été demandé à l'acte.
        return truncated ? (
          <Tooltip key={key} label={full} withArrow multiline w={420} style={{ cursor: 'help' }}>
            {chip}
          </Tooltip>
        ) : (
          <div key={key}>{chip}</div>
        );
      })}
    </Group>
  );
}

export default function AuditLogPage() {
  const { filters, setFilter, page, setPage } = useListParams<Filters>(FILTERS);

  const action = filters.action ?? '';
  const from = filters.from ?? '';
  const to = filters.to ?? '';

  const { data, isFetching, isError, error } = useGetAuditLogQuery(
    {
      action: action || undefined,
      from: from ? dayStartUtc(from) : undefined,
      // « Au 3 inclus » = « avant le début du 4 » : la borne haute est exclusive côté serveur, et
      // l'inclusivité que l'étiquette annonce vit ici, avec la notion de journée.
      to: to ? dayStartUtc(to, 1) : undefined,
      pageNumber: page,
      pageSize: PAGE_SIZE,
    },
    // Un journal est « ce qui vient de se passer » : le relire au montage est le comportement
    // attendu, sinon revenir dessus après avoir découpé une promotion ne montre pas l'acte.
    { refetchOnMountOrArgChange: true },
  );

  const actionOptions = useMemo(
    () => (data?.actions ?? []).map((a) => ({
      value: a.action,
      label: `${auditActionLabel(a.action)} (${a.count})`,
    })),
    [data],
  );

  // Le code HTTP, quand la rejection en porte un : une 404 sur cette lecture veut dire « la route
  // n'existe pas dans cette API », ce qui appelle un geste (redémarrer) et non une réessai.
  const status = (error as { status?: number } | undefined)?.status;

  const entries = data?.entries;
  const shown = entries?.items.length ?? 0;
  const total = entries?.totalCount ?? 0;
  const firstOnPage = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const isFiltered = Boolean(action || from || to);

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Journal des actions</Title>
        <Text c="dimmed" size="sm">
          Qui a fait quoi, et quand. Les actes qui réécrivent une promotion entière — un découpage,
          une déliberation, un rouleau de réinscription, l’application d’un axe — laissent une ligne
          ici, avec leur auteur et les critères qui leur ont été donnés.
        </Text>
      </div>

      <Alert color="blue" variant="light" icon={<IconInfoCircle size={18} />} p="sm">
        <Text size="xs">
          Le journal est daté d’une <strong>horloge</strong>, pas d’une année universitaire&nbsp;:
          l’année de la barre du haut ne s’y applique pas, et le geste qui touche 2026-2027 a pu être
          fait en juillet. ⚠ Seuls les actes <strong>réalisés</strong> y figurent&nbsp;— une action
          refusée n’écrit rien, pour que le registre reste la liste de ce qui a eu lieu.
        </Text>
      </Alert>

      <Paper withBorder p="md" radius="md">
        <Group align="flex-end" gap="md" wrap="wrap">
          <Select
            label="Type d’acte"
            placeholder="Tous"
            data={actionOptions}
            value={action || null}
            onChange={(v) => setFilter('action', v ?? '')}
            searchable
            clearable
            w={320}
          />

          <DatePickerInput
            label="Du"
            placeholder="Début"
            value={from || null}
            onChange={(v) => setFilter('from', v ?? '')}
            valueFormat="DD/MM/YYYY"
            clearable
            w={165}
          />

          {/* La borne haute est inclusive côté serveur : « du 2 au 2 » rend bien la journée du 2. */}
          <DatePickerInput
            label="Au (inclus)"
            placeholder="Fin"
            value={to || null}
            onChange={(v) => setFilter('to', v ?? '')}
            valueFormat="DD/MM/YYYY"
            clearable
            w={165}
          />
        </Group>
      </Paper>

      {isError ? (
        // ⚠ Sans cette branche la page rendait `null` : filtres, puis un vide absolu, ce qui se lit
        // comme un écran cassé. `errorMiddleware` ne comble pas le trou — il laisse volontairement
        // passer les 404 sur une lecture, « ceci n'existe pas encore » étant un état que l'écran
        // rend lui-même (CLAUDE.md §1e). Rencontré pour de vrai le 04/09/2026, l'API tournant
        // encore sans la route.
        <Alert
          color={status === 404 ? 'orange' : 'red'}
          variant="light"
          title={status === 404
            ? 'Le journal n’est pas servi par cette API'
            : 'Le journal n’a pas pu être lu'}
        >
          <Text size="sm">
            {status === 404
              ? 'La route du journal n’existe pas dans le processus API en cours d’exécution — '
                + 'il est plus ancien que cette page. Redémarrez l’AppHost. (Les autres écrans '
                + 'continuent de fonctionner, ce n’est pas une panne d’authentification.)'
              : problemMessage(error)
                ?? 'Le service n’a pas répondu. Réessayez, ou vérifiez que l’API est démarrée.'}
          </Text>
        </Alert>
      ) : isFetching && !data ? (
        <Center h={200}><Loader color="navy" /></Center>
      ) : entries ? (
        <>
          <Group justify="space-between" wrap="wrap" gap="xs">
            <Text size="sm" c="dimmed">
              {/* Une liste bornée dit ce qu'elle montre : sa dernière page ressemble sinon à une
                  sélection vide. */}
              {total === 0
                ? `0 entrée${isFiltered ? ' pour ce filtre' : ''}`
                : `${firstOnPage}–${firstOnPage + shown - 1} sur ${total} entrée(s)`}
              {isFiltered && ` · ${data.totalEntries} au total dans le journal`}
            </Text>
            {isFetching && <Loader size="xs" color="navy" />}
          </Group>

          {total === 0 ? (
            // ⚠ « Rien ne correspond au filtre » et « le journal est vide » appellent des gestes
            // opposés, et un zéro nu se lit comme le premier. `totalEntries` est ce qui les sépare.
            <Card withBorder radius="md" p="xl">
              <Center>
                <Stack align="center" gap="xs" maw={520}>
                  <IconHistory size={32} opacity={0.4} />
                  <Text fw={500}>
                    {data.totalEntries === 0
                      ? 'Le journal est vide'
                      : 'Aucune entrée pour ce filtre'}
                  </Text>
                  <Text size="sm" c="dimmed" ta="center">
                    {data.totalEntries === 0
                      ? 'Aucun acte enregistré pour l’instant. Les actes le sont à mesure qu’ils sont '
                        + 'effectués — un découpage de promotion, une déliberation, une sauvegarde.'
                      : `Le journal contient ${data.totalEntries} entrée(s), mais aucune ne `
                        + 'correspond à ce type d’acte ou à cette plage de dates.'}
                  </Text>
                </Stack>
              </Center>
            </Card>
          ) : (
            <Paper withBorder radius="md" style={{ overflowX: 'auto' }}>
              <Table striped highlightOnHover verticalSpacing="sm" miw={860}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th w={150}>Date</Table.Th>
                    <Table.Th w={230}>Acte</Table.Th>
                    <Table.Th w={170}>Objet</Table.Th>
                    <Table.Th w={170}>Auteur</Table.Th>
                    <Table.Th>Critères</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {entries.items.map((entry) => (
                    <Table.Tr key={entry.id}>
                      <Table.Td><Text size="sm">{stamp(entry.createdAt)}</Text></Table.Td>

                      <Table.Td>
                        <Tooltip
                          label={isUnlabelledAction(entry.action)
                            ? 'Aucun libellé français pour ce code : il est affiché tel quel plutôt '
                              + 'que masqué — un acte que l’écran ne sait pas nommer reste un acte.'
                            : entry.action}
                          withArrow
                          multiline
                          w={300}
                        >
                          <Badge
                            variant="light"
                            color={isDestructiveAction(entry.action) ? 'red' : 'navy'}
                            style={{ cursor: 'help', textTransform: 'none' }}
                          >
                            {auditActionLabel(entry.action)}
                          </Badge>
                        </Tooltip>
                      </Table.Td>

                      <Table.Td>
                        <Text size="xs" c="dimmed">
                          {entry.entityType}
                          {entry.entityId && ` #${entry.entityId}`}
                        </Text>
                      </Table.Td>

                      <Table.Td><Author entry={entry} /></Table.Td>
                      <Table.Td><Criteria entry={entry} /></Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Paper>
          )}

          {entries.totalPages > 1 && (
            <Group justify="center">
              <Pagination value={page} onChange={setPage} total={entries.totalPages} color="navy" />
            </Group>
          )}
        </>
      ) : null}
    </Stack>
  );
}
