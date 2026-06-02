import { Button, Group, Modal, Stack, Text } from '@mantine/core';

interface Props {
  opened: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor?: string;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}

export function ConfirmModal({
  opened, onClose, title, message, confirmLabel, confirmColor = 'red', onConfirm, loading = false,
}: Props) {
  return (
    <Modal opened={opened} onClose={onClose} title={title} radius="lg" size="sm">
      <Stack gap="md">
        <Text size="sm" c="dimmed">{message}</Text>
        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button color={confirmColor} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
