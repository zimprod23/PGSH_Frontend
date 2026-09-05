import { Link } from 'react-router-dom';
import { Anchor, Badge, Group, Paper, Stack, Text, Tooltip } from '@mantine/core';
import { IconAlertTriangle, IconUsers } from '@tabler/icons-react';
import type {
  PlacementMatch, RosterHospitalPlacement, RosterPlacementResponse, RosterStagePlacementResponse,
} from '../../types/placement.types';

/**
 * Un roster, et où il se tient.
 *
 * ⚠ **Le badge de placement vient du serveur** (`RosterHospitalPlacementTest`), il n'est jamais
 * déduit ici du nombre de cellules. `Unplaced` en particulier n'est pas un détail : « toutes ses
 * cellules sont au HMIMV » est *vrai à vide* d'un roster que personne n'a réparti, et un écran qui
 * recalculerait le verdict rejouerait exactement le défaut que l'énumération existe pour empêcher.
 */

const PLACEMENT: Record<RosterHospitalPlacement, { color: string; label: string; hint: string }> = {
  Entire: {
    color: 'teal',
    label: 'Entièrement ici',
    hint: 'Toutes les cellules de ce roster sont dans cet hôpital — et il en tient au moins une.',
  },
  Partial: {
    color: 'yellow',
    label: 'En partie ici',
    hint: 'Une partie de sa rotation seulement est dans cet hôpital.',
  },
  Elsewhere: {
    color: 'gray',
    label: 'Ailleurs',
    hint: 'Ce roster est réparti, et aucune de ses cellules n’est dans cet hôpital.',
  },
  Unplaced: {
    color: 'gray',
    label: 'Non réparti',
    hint: 'Ce roster ne tient aucune cellule : rien n’a encore été réparti pour lui. '
        + 'Ce n’est pas la même chose que « il ne va pas là ».',
  },
};

function StageRow({ stage }: { stage: RosterStagePlacementResponse }) {
  return (
    <Group gap="xs" wrap="nowrap" align="flex-start">
      <Text size="xs" fw={500} w={170} truncate style={{ flexShrink: 0 }}>
        {stage.stageName}
      </Text>

      {stage.services.length === 0 ? (
        // Un stage sans cellule est listé, pas masqué : « reste à répartir pour ce groupe » est une
        // réponse utile, et le retirer le rendrait indiscernable d'un stage que le roster ne doit pas.
        <Text size="xs" c="dimmed" fs="italic">reste à répartir</Text>
      ) : (
        <Group gap={6}>
          {stage.services.map((s) => (
            <Tooltip key={s.serviceId} label={s.hospitalName} withArrow>
              <Badge
                size="sm"
                variant="light"
                color={stage.matches === true ? 'teal' : 'gray'}
                style={{ cursor: 'help', textTransform: 'none' }}
              >
                {s.serviceName}
                {s.periodNumbers.length > 0
                  && ` · ${s.periodNumbers.map((n) => `P${n}`).join(', ')}`}
              </Badge>
            </Tooltip>
          ))}
        </Group>
      )}
    </Group>
  );
}

interface Props {
  roster: RosterPlacementResponse;
  groupHref: string;
  /** Ce qui a été demandé, pour ne pas afficher un verdict qu'on n'a pas posé. */
  match: PlacementMatch;
  hasTarget: boolean;
}

export function RosterPlacementCard({ roster, groupHref, match, hasTarget }: Props) {
  const placement = roster.hospitalPlacement ? PLACEMENT[roster.hospitalPlacement] : null;

  // ⚠ Un roster de 1-2 étudiants n'est pas gratuit : `RotationArranger` pondère chaque service par
  // le nombre de cohortes de taille *moyenne* qu'il tient, et une cohorte est atomique — deux
  // étudiants consomment donc une place dimensionnée pour sept. Rien côté serveur ne le refuse ni ne
  // le signale, donc c'est ici que ça se dit, là où quelqu'un choisit un roster.
  const isTiny = roster.studentCount > 0 && roster.studentCount <= 2;

  return (
    <Paper withBorder radius="md" p="sm">
      <Group justify="space-between" wrap="wrap" gap="xs" mb={roster.stages.length ? 'sm' : 0}>
        <Group gap="xs" wrap="nowrap">
          <Anchor component={Link} to={groupHref} fw={600} size="sm">
            {roster.label}
          </Anchor>

          {roster.rotationGroup && (
            <Badge size="sm" variant="outline" color="navy">
              Partition {roster.rotationGroup}
            </Badge>
          )}

          {/* Un roster est un contenant : la liste dit toujours combien il en tient. Zéro est un
              état ordinaire entre le découpage et la répartition — orange, jamais rouge. */}
          <Tooltip
            label={isTiny
              ? 'Un roster de 1-2 étudiants occupe dans la file d’un service une place dimensionnée '
                + 'pour un roster moyen : il dépense une cohorte entière d’admission pour deux '
                + 'personnes. Préférez un roster partagé quand la contrainte se répète.'
              : `${roster.studentCount} étudiant(s) inscrit(s) dans ce roster`}
            withArrow
            multiline
            w={280}
          >
            <Badge
              size="sm"
              variant="light"
              color={roster.studentCount === 0 ? 'orange' : isTiny ? 'yellow' : 'gray'}
              leftSection={isTiny ? <IconAlertTriangle size={11} /> : <IconUsers size={11} />}
              style={{ cursor: 'help' }}
            >
              {roster.studentCount}
            </Badge>
          </Tooltip>
        </Group>

        <Group gap="xs">
          {hasTarget && (
            <Text size="xs" c="dimmed">
              {roster.matchedStageCount} / {roster.stageCount} stage(s)
              {match === 'Exclusively' ? ' entièrement' : ''} au lieu demandé
            </Text>
          )}

          {placement && (
            <Tooltip label={placement.hint} withArrow multiline w={280}>
              <Badge color={placement.color} variant="light" style={{ cursor: 'help' }}>
                {placement.label}
              </Badge>
            </Tooltip>
          )}
        </Group>
      </Group>

      {roster.stages.length === 0 ? (
        <Text size="xs" c="dimmed">Aucune cohorte : ce roster ne fait aucun stage cette année.</Text>
      ) : (
        <Stack gap={6}>
          {roster.stages.map((stage) => <StageRow key={stage.stageId} stage={stage} />)}
        </Stack>
      )}
    </Paper>
  );
}
