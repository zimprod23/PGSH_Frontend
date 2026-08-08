import { Badge, type MantineSize } from '@mantine/core';
import { STAGE_STATE, type StageState } from '../utils/stageState';

interface Props {
  state: StageState;
  size?: MantineSize;
}

/** The one place a stage's state is rendered, so the six states read the same on every screen. */
export function StageStateBadge({ state, size = 'sm' }: Props) {
  const { label, color, Icon } = STAGE_STATE[state];

  return (
    <Badge
      variant="light"
      color={color}
      radius="xl"
      size={size}
      style={{ flexShrink: 0 }}
      leftSection={<Icon size={12} stroke={2} />}
    >
      {label}
    </Badge>
  );
}
