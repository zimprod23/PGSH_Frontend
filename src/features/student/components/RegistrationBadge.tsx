import { Badge } from '@mantine/core';
import type { RegistrationStatus } from '../../../common/types';

const CONFIG: Record<RegistrationStatus, { color: string; label: string }> = {
  Pending:   { color: 'warning', label: 'En attente'  },
  Active:    { color: 'sky',     label: 'En cours'    },
  Validated: { color: 'success', label: 'Validée'     },
  Failed:    { color: 'danger',  label: 'Échouée'     },
  Withdrawn: { color: 'gray',    label: 'Abandonnée'  },
};

interface Props {
  status: RegistrationStatus;
  size?: 'xs' | 'sm' | 'md';
  /**
   * Render for a dark/gradient background. The `light` variant paints a pale tint of its own colour,
   * which disappears completely on the blue header of `CurrentStageCard` — there the badge has to
   * carry its own contrast instead of borrowing the card's.
   */
  onDark?: boolean;
}

export function RegistrationBadge({ status, size = 'sm', onDark = false }: Props) {
  const { color, label } = CONFIG[status];

  if (onDark) {
    return (
      <Badge
        variant="white"
        radius="xl"
        size={size}
        styles={{ root: { color: 'var(--mantine-color-navy-8)' } }}
      >
        {label}
      </Badge>
    );
  }

  return (
    <Badge color={color} variant="light" radius="xl" size={size}>
      {label}
    </Badge>
  );
}
