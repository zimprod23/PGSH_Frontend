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
}

export function RegistrationBadge({ status, size = 'sm' }: Props) {
  const { color, label } = CONFIG[status];
  return (
    <Badge color={color} variant="light" radius="xl" size={size}>
      {label}
    </Badge>
  );
}
