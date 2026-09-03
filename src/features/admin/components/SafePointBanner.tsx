import { useState } from 'react';
import { Alert, Button, Group, Stack, Text, TextInput } from '@mantine/core';
import {
  IconAlertTriangle,
  IconDatabaseExport,
  IconDeviceFloppy,
  IconPlugConnectedX,
  IconShieldCheck,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { PATHS } from '../../../routes/paths';
import {
  useCreateBackupPointMutation,
  useGetSafePointStatusQuery,
} from '../api/adminApi';
import type { SafePointState, SafePointStatus } from '../types/backup.types';

/**
 * « Y a-t-il un retour en arrière pour ce que je m'apprête à faire ? »
 *
 * Posé sur la confirmation de chaque acte qui écrit une promotion et ne se défait pas :
 * déliberation, réinscription, application/suppression d'un bloc de rotation, dépublication forcée.
 *
 * ⚠ **Le bouton « Créer un point » est la fonctionnalité, pas la bannière.** Une sauvegarde que
 * quelqu'un doit penser à prendre dans un terminal est une *procédure*, et les procédures sautent
 * précisément le jour où elles servent. Accessible depuis l'acte lui-même, elle devient un effet de
 * bord de l'acte.
 *
 * ⚠ **Elle ne bloque pas.** Le jour où Docker ne répond pas, personne ne doit se retrouver dans
 * l'impossibilité de clôturer une année ; c'est la case à cocher qui porte la décision — même forme
 * que `ConfirmedDefaultCount` : on confirme ce qui ne se défait pas.
 */
export function SafePointBanner({
  actLabel,
  acknowledged,
  onAcknowledge,
}: {
  /** Ce qui va être écrit, pour nommer le point : « Avant réinscription 2026-2027 ». */
  actLabel: string;
  /** Présent = l'appelant veut la case à cocher (acte irréversible). Absent = information seule. */
  acknowledged?: boolean;
  onAcknowledge?: (value: boolean) => void;
}) {
  const { data: status, isLoading, refetch } = useGetSafePointStatusQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  const [createPoint, { isLoading: isCreating }] = useCreateBackupPointMutation();
  const [label, setLabel] = useState(actLabel);

  if (isLoading || !status) return null;

  const take = async () => {
    await createPoint({ label: label.trim() || actLabel, kind: 'PreAct' }).unwrap().catch(() => {});
    await refetch();
  };

  const tone = TONE[status.state];

  return (
    <Alert color={tone.color} variant="light" radius="md" icon={tone.icon} title={tone.title}>
      <Stack gap="xs">
        <Text size="sm">{describe(status)}</Text>

        {status.state !== 'Fresh' && (
          <Group gap="xs" align="flex-end" wrap="wrap">
            <TextInput
              size="xs"
              label="Libellé du point"
              value={label}
              onChange={(e) => setLabel(e.currentTarget.value)}
              style={{ minWidth: 260 }}
            />
            <Button
              size="xs"
              leftSection={<IconDeviceFloppy size={14} />}
              loading={isCreating}
              onClick={take}
            >
              Créer un point maintenant
            </Button>
            <Button
              size="xs"
              variant="subtle"
              component={Link}
              to={`${PATHS.ADMIN.ROOT}/${PATHS.ADMIN.BACKUPS}`}
              leftSection={<IconDatabaseExport size={14} />}
            >
              Voir les sauvegardes
            </Button>
          </Group>
        )}

        {onAcknowledge && !status.hasUsableUndo && (
          <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={acknowledged ?? false}
              onChange={(e) => onAcknowledge(e.currentTarget.checked)}
              style={{ marginTop: 3 }}
            />
            <Text size="sm">
              Je continue sans point de sauvegarde exploitable, en sachant que cet acte ne se défait pas.
            </Text>
          </label>
        )}
      </Stack>
    </Alert>
  );
}

const TONE: Record<SafePointState, { color: string; title: string; icon: React.ReactNode }> = {
  Unavailable: {
    color: 'red',
    title: 'Service de sauvegarde indisponible',
    icon: <IconPlugConnectedX size={16} />,
  },
  None: {
    color: 'red',
    title: 'Aucune sauvegarde',
    icon: <IconAlertTriangle size={16} />,
  },
  SchemaChanged: {
    color: 'orange',
    title: 'Sauvegarde prise sous un autre schéma',
    icon: <IconAlertTriangle size={16} />,
  },
  Stale: {
    color: 'yellow',
    title: 'Dernière sauvegarde ancienne',
    icon: <IconAlertTriangle size={16} />,
  },
  Fresh: {
    color: 'teal',
    title: 'Point de sauvegarde récent',
    icon: <IconShieldCheck size={16} />,
  },
};

/**
 * ⚠ Quatre phrases distinctes, pas une phrase paramétrée. « Le service ne répond pas » et « il n'y a
 * aucune sauvegarde » appellent des gestes opposés — réparer le runner, ou prendre un point — et une
 * formulation commune est exactement l'écran vide qui les confond.
 */
function describe(status: SafePointStatus): string {
  switch (status.state) {
    case 'Unavailable':
      return `Rien n'est sauvegardé pour l'instant : ${status.unavailableReason ?? 'raison inconnue'}. `
        + 'Tant que ce n\'est pas réglé, cet acte n\'aura aucun retour en arrière.';

    case 'None':
      return 'La base ne dispose d\'aucun point de restauration. Cet acte écrit des lignes que rien ne '
        + 'permettra de remettre en place.';

    case 'SchemaChanged':
      return `Le dernier point (${status.latest?.label ?? '—'}, ${age(status.ageMinutes)}) a été pris sous `
        + `la migration « ${status.latest?.lastMigration ?? 'inconnue'} », alors que la base tourne sous `
        + `« ${status.runningMigration ?? 'inconnue'} ». Le restaurer exige d'abord une étape de schéma : `
        + 'ce n\'est pas un retour en arrière immédiat.';

    case 'Stale':
      return `Dernier point : « ${status.latest?.label}, ${age(status.ageMinutes)} ». La restauration `
        + 'fonctionne et coûte tout ce qui a été saisi depuis.';

    case 'Fresh':
      return `Dernier point : « ${status.latest?.label} », ${age(status.ageMinutes)}, même schéma. `
        + 'Un retour en arrière est possible.';
  }
}

function age(minutes: number | null): string {
  if (minutes == null) return 'date inconnue';
  if (minutes < 1) return 'à l\'instant';
  if (minutes < 60) return `il y a ${Math.round(minutes)} min`;
  if (minutes < 60 * 48) return `il y a ${Math.round(minutes / 60)} h`;
  return `il y a ${Math.round(minutes / (60 * 24))} j`;
}
