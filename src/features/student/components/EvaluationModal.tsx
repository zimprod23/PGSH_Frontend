import { Modal, Text } from '@mantine/core';

interface Props {
  opened: boolean;
  onClose: () => void;
}

// Placeholder — rebuilt in Phase 2
export function EvaluationModal({ opened, onClose }: Props) {
  return (
    <Modal opened={opened} onClose={onClose} title="Évaluation">
      <Text c="dimmed" size="sm">Fonctionnalité en cours de développement.</Text>
    </Modal>
  );
}
