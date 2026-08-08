import {
  IconActivityHeartbeat,
  IconCalendarClock,
  IconCircleCheck,
  IconCircleX,
  IconHourglassEmpty,
  IconHourglassHigh,
  type IconProps,
} from '@tabler/icons-react';
import type { ComponentType } from 'react';
import type { ParcoursStage } from '../types/parcours.types';

/**
 * What a stage actually is to the student, as opposed to where it sits in the admin workflow.
 *
 * `InternshipStatus` is workflow progress and `Result` is the academic outcome; the portal used to
 * read only the first and so kept calling a served, closed and marked stage "planifié". These six
 * states mirror the backend's `ParcoursTotals` buckets one-for-one — change one, change both.
 */
export type StageState =
  | 'unplanned'   // catalogue stage with no assignment yet
  | 'planned'     // assigned, not started
  | 'ongoing'
  | 'awaiting'    // rotations over, marks not all in
  | 'validated'
  | 'failed';

export interface StageStateConfig {
  label: string;
  /** Shorter wording for tab/segment labels, where the full one wraps. */
  shortLabel: string;
  color: string;
  Icon: ComponentType<IconProps>;
}

export const STAGE_STATE: Record<StageState, StageStateConfig> = {
  unplanned: { label: 'Non planifié',  shortLabel: 'Non planifiés', color: 'gray',   Icon: IconHourglassEmpty     },
  planned:   { label: 'Planifié',      shortLabel: 'Planifiés',     color: 'indigo', Icon: IconCalendarClock      },
  ongoing:   { label: 'En cours',      shortLabel: 'En cours',      color: 'blue',   Icon: IconActivityHeartbeat  },
  awaiting:  { label: 'En attente de note', shortLabel: 'En attente', color: 'orange', Icon: IconHourglassHigh    },
  validated: { label: 'Validé',        shortLabel: 'Validés',       color: 'teal',   Icon: IconCircleCheck        },
  failed:    { label: 'Non validé',    shortLabel: 'Non validés',   color: 'red',    Icon: IconCircleX            },
};

/** Mirrors `GetStudentParcoursQueryHandler.Tally`: the verdict outranks the workflow status. */
export function stageStateOf(stage: ParcoursStage): StageState {
  if (stage.result === 'Validé') return 'validated';
  if (stage.result === 'NonValidé') return 'failed';
  if (stage.status === 'Planned') return 'planned';
  if (stage.status === 'Ongoing') return 'ongoing';
  return 'awaiting';
}

/** A stage has left the "à venir" side of the parcours once it is under way or over. */
export const isFinished = (state: StageState) =>
  state === 'validated' || state === 'failed' || state === 'awaiting';

const DATE_RANGE = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
const DATE_RANGE_WITH_YEAR = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric', month: 'short', year: 'numeric',
});

/** "3 oct. → 28 nov. 2025", or null when nothing has been scheduled yet. */
export function formatRotationSpan(start: string | null, end: string | null): string | null {
  if (!start || !end) return null;
  return `${DATE_RANGE.format(new Date(start))} → ${DATE_RANGE_WITH_YEAR.format(new Date(end))}`;
}

/**
 * A score is only worth showing once every rotation is marked; before that `finalScore` is a running
 * mean of the periods graded so far and reads as a final note when it is not one.
 */
export const finalNoteOf = (stage: ParcoursStage): number | null =>
  stage.allPeriodsEvaluated && stage.finalScore !== null ? stage.finalScore : null;
