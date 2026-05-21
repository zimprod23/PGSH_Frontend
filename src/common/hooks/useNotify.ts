import { notifications } from '@mantine/notifications';
import { createElement } from 'react';
import {
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconInfoCircle,
} from '@tabler/icons-react';

const icon = (Component: React.ComponentType<{ size: number }>) =>
  createElement(Component, { size: 18 });

export const useNotify = () => ({
  success: (message: string, title = 'Succès') =>
    notifications.show({
      title,
      message,
      color:     'green',
      icon:      icon(IconCheck),
      autoClose: 3000,
      position:  'top-right',
    }),

  error: (message: string, title = 'Erreur') =>
    notifications.show({
      title,
      message,
      color:     'red',
      icon:      icon(IconX),
      autoClose: 6000,
      position:  'top-right',
    }),

  warning: (message: string, title = 'Attention') =>
    notifications.show({
      title,
      message,
      color:     'yellow',
      icon:      icon(IconAlertTriangle),
      autoClose: 5000,
      position:  'top-right',
    }),

  info: (message: string, title = 'Information') =>
    notifications.show({
      title,
      message,
      color:     'sky',
      icon:      icon(IconInfoCircle),
      autoClose: 4000,
      position:  'top-right',
    }),
});
