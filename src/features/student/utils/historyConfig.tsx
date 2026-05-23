import {
  IconUserPlus,
  IconCircleCheck,
  IconCircleX,
  IconAlertTriangle,
  IconRefresh,
  IconArrowsTransferUp,
  IconUsersGroup,
  IconInfoCircle,
} from '@tabler/icons-react';
import type { ComponentType } from 'react';
import type { HistoryType } from '../../../common/types';

export interface HistoryTypeConfig {
  icon: ComponentType<{ size?: number; stroke?: number }>;
  color: string;
  label: string;
}

export const HISTORY_CONFIG: Record<HistoryType, HistoryTypeConfig> = {
  Inscription:     { icon: IconUserPlus,            color: 'sky',     label: 'Inscription validée'   },
  ValidationStage: { icon: IconCircleCheck,         color: 'success', label: 'Stage validé'           },
  NonValidation:   { icon: IconCircleX,             color: 'danger',  label: 'Stage non validé'       },
  Fraud:           { icon: IconAlertTriangle,       color: 'danger',  label: 'Fraude signalée'        },
  Revalidation:    { icon: IconRefresh,             color: 'warning', label: 'Revalidation'           },
  GroupTransfer:   { icon: IconUsersGroup,          color: 'blue',    label: 'Changement de groupe'   },
  CohortTransfer:  { icon: IconArrowsTransferUp,    color: 'violet',  label: 'Changement de cohorte' },
  StatusChange:    { icon: IconInfoCircle,          color: 'gray',    label: 'Changement de statut'  },
};
