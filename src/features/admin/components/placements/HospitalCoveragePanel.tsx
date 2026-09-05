import { Alert, Badge, Group, Paper, Stack, Text, ThemeIcon, Tooltip } from '@mantine/core';
import {
  IconAlertTriangle, IconCheck, IconHelpCircle, IconMapPinOff,
} from '@tabler/icons-react';
import type {
  HospitalStageCoverageResponse, StageCoverageResponse,
} from '../../types/placement.types';

/**
 * La faisabilité, posée **avant** la promesse.
 *
 * « Cet étudiant fait tous ses stages à l'hôpital militaire » ne peut se tenir que si l'hôpital
 * offre un service autorisé pour *chaque* stage de la promotion. Mesuré sur le catalogue :
 * le HMIMV couvre les 6 stages de la 6ᵉ année, et **6 des 7** de la 5ᵉ — Santé Publique n'autorise
 * qu'un seul service et il est ailleurs. Sans ce panneau, cette ligne se découvre à la sixième
 * cellule, après avoir dit oui.
 *
 * ⚠ Les trois verdicts viennent du serveur (`StageHospitalCoverageTest`) et ne sont jamais
 * recalculés ici — une règle écrite des deux côtés d'une frontière réseau est deux règles.
 */

/** Ce que chaque verdict veut dire, et surtout : quel geste il appelle. */
const VERDICTS = {
  Covered: {
    color: 'teal',
    Icon: IconCheck,
    label: 'Couvert',
    hint: 'Au moins un service autorisé de ce stage est dans cet hôpital.',
  },
  NotAtThisHospital: {
    color: 'red',
    Icon: IconMapPinOff,
    label: 'Pas ici',
    hint: 'Ce stage autorise des services, et aucun n’est dans cet hôpital. '
        + 'Changez d’hôpital pour ce stage, ou autorisez-y un service.',
  },
  NoServicesAuthored: {
    color: 'yellow',
    Icon: IconHelpCircle,
    label: 'Liste non saisie',
    hint: 'Ce stage n’autorise aucun service. Une liste vide n’est pas appliquée : le stage est '
        + 'donc ouvert à tous les services, y compris ceux d’ici. Ce n’est pas un refus — '
        + 'c’est une liste que personne n’a renseignée.',
  },
} as const;

function StageLine({ stage }: { stage: StageCoverageResponse }) {
  const verdict = VERDICTS[stage.coverage];

  return (
    <Group justify="space-between" wrap="nowrap" gap="sm" align="flex-start">
      <Stack gap={2} style={{ minWidth: 0 }}>
        <Text size="sm" fw={500} truncate>{stage.stageName}</Text>
        {stage.servicesAtHospital.length > 0 ? (
          <Group gap={4}>
            {stage.servicesAtHospital.map((s) => (
              <Badge key={s.serviceId} size="xs" variant="light" color="gray">{s.name}</Badge>
            ))}
          </Group>
        ) : (
          <Text size="xs" c="dimmed">
            {stage.allowedServiceCount === 0
              ? 'aucun service autorisé, tous hôpitaux confondus'
              : `${stage.allowedServiceCount} service(s) autorisé(s), tous ailleurs`}
          </Text>
        )}
      </Stack>

      <Tooltip label={verdict.hint} multiline w={300} withArrow position="left">
        <Badge
          color={verdict.color}
          variant="light"
          leftSection={<verdict.Icon size={12} />}
          style={{ flexShrink: 0, cursor: 'help' }}
        >
          {verdict.label}
        </Badge>
      </Tooltip>
    </Group>
  );
}

export function HospitalCoveragePanel({ coverage }: { coverage: HospitalStageCoverageResponse }) {
  const { stageCount, coveredStageCount, unauthoredStageCount } = coverage;
  const blocked = coverage.stages.filter((s) => s.coverage === 'NotAtThisHospital');

  // ⚠ « Entièrement couvert » ne peut pas se dire d'une promotion dont un stage n'a aucune liste :
  // ce stage est ouvert à tout, donc il n'empêche rien, mais rien ne dit non plus qu'il est prévu
  // ici. Trois états, trois phrases — pas une phrase paramétrée.
  const verdict = blocked.length > 0
    ? {
      color: 'red' as const,
      Icon: IconAlertTriangle,
      title: `« Tout à cet hôpital » est impossible pour cette promotion`,
      body: `${blocked.length} stage(s) sur ${stageCount} n’ont aucun service autorisé ici : `
          + `${blocked.map((s) => s.stageName).join(', ')}. Le reste peut y aller.`,
    }
    : unauthoredStageCount > 0
      ? {
        color: 'yellow' as const,
        Icon: IconHelpCircle,
        title: 'Possible, mais tout n’est pas dit',
        body: `Aucun stage n’est bloqué. ${unauthoredStageCount} stage(s) n’autorisent aucun `
            + 'service — ils sont donc ouverts à tous, ici compris, mais personne n’a saisi leur '
            + 'liste : rien ne dit qu’ils sont prévus dans cet hôpital.',
      }
      : {
        color: 'teal' as const,
        Icon: IconCheck,
        title: 'Toute la rotation peut se faire ici',
        body: `Les ${stageCount} stages de la promotion ont au moins un service autorisé dans cet `
            + 'hôpital.',
      };

  return (
    <Paper withBorder radius="md" p="md">
      <Group justify="space-between" align="flex-start" mb="sm" wrap="wrap" gap="xs">
        <div>
          <Text fw={600}>Faisabilité — {coverage.hospitalName}</Text>
          <Text size="xs" c="dimmed">
            {coverage.levelLabel} · {coveredStageCount} stage(s) couvert(s) sur {stageCount}
          </Text>
        </div>
        <ThemeIcon color={verdict.color} variant="light" size="lg" radius="xl">
          <verdict.Icon size={18} />
        </ThemeIcon>
      </Group>

      <Alert color={verdict.color} variant="light" title={verdict.title} p="sm">
        <Text size="xs">{verdict.body}</Text>
      </Alert>

      <Stack gap="xs" mt="md">
        {coverage.stages.map((stage) => <StageLine key={stage.stageId} stage={stage} />)}
      </Stack>
    </Paper>
  );
}
