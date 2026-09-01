import { Group, Text, Tooltip, Stack } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import type { StageTextFigure } from '../types/admin.types';

type Figure = 'coefficient' | 'durationInDays';

interface Props {
  /** What the catalogue row itself states — the value the edit form writes back. */
  value: number;
  /** Which of the two duplicated figures this cell shows. */
  figure: Figure;
  /** What each CNPN's requirement set states of the same stage. Empty when none mentions it. */
  textFigures: StageTextFigure[];
  monospace?: boolean;
}

const format = (figure: Figure, value: number) =>
  figure === 'durationInDays' ? `${value}j` : String(value);

/**
 * The catalogue's figure, and — when a CNPN states a different one — what each text says.
 *
 * ⚠ `Stage.coefficient` / `Stage.durationInDays` are duplicated by every text's `CurriculumStage`.
 * They agreed only for as long as no text had reweighted a stage; arrêté 1650.25 is the first that
 * does. Neither figure is wrong: a 5ᵉ année student revalidating a 3ᵉ année credit is still
 * governed by 2174.18, which is why the catalogue alignment recorded the old numbers there before
 * overwriting these. What was wrong is this cell rendering the catalogue number unqualified — a
 * figure no CNPN necessarily states, with nothing on screen saying another text disagreed.
 *
 * Silent when every text agrees, and silent when no text mentions the stage at all: a marker that
 * fires whatever the data says is noise, and noise is dismissed — which puts the real one out of
 * sight. « Aucun texte ne le mentionne » is also not « un texte dit 0 », so absence draws nothing.
 */
export function StageCatalogueFigure({ value, figure, textFigures, monospace }: Props) {
  const disagreeing = textFigures.filter((t) => t[figure] !== value);

  const body = (
    <Text size="sm" c="dimmed" ff={monospace ? 'monospace' : undefined}>
      {format(figure, value)}
    </Text>
  );

  if (disagreeing.length === 0) return body;

  return (
    <Tooltip
      withArrow
      multiline
      w={300}
      label={
        <Stack gap={2}>
          <Text size="xs" fw={600}>
            Valeur du catalogue : {format(figure, value)}
          </Text>
          <Text size="xs">Ce que dit chaque CNPN de ce stage :</Text>
          {textFigures.map((t) => (
            <Text key={t.cnpnVersionId} size="xs">
              • {t.cnpnCode} ({t.levelLabel}) : {format(figure, t[figure])}
            </Text>
          ))}
          <Text size="xs" c="dimmed">
            Aucune des deux n'est fausse : un étudiant qui revalide un stage sous l'ancien texte
            reste régi par ses chiffres. Le catalogue n'est pas la référence d'un texte donné.
          </Text>
        </Stack>
      }
    >
      <Group gap={4} wrap="nowrap" style={{ cursor: 'help' }}>
        {body}
        <IconAlertTriangle size={13} stroke={1.8} color="var(--mantine-color-orange-6)" />
      </Group>
    </Tooltip>
  );
}
