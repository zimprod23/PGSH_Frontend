import { notifications } from '@mantine/notifications';
import { createElement } from 'react';
import {
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconInfoCircle,
} from '@tabler/icons-react';

// ─── Shared notification style ────────────────────────────────────────────────

export const notifStyles = (accentColor: string) => ({
  root: {
    backgroundColor: '#ffffff',
    border: '1px solid #E2E8F0',
    borderLeft: `3px solid ${accentColor}`,
    borderRadius: '10px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  },
  title: {
    fontWeight: 600 as const,
    fontSize: '13px',
    color: '#0F172A',
    marginBottom: '2px',
  },
  description: {
    fontSize: '12.5px',
    color: '#475569',
    lineHeight: '1.5',
  },
});

const icon = (Component: React.ComponentType<{ size: number }>) =>
  createElement(Component, { size: 16 });

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useNotify = () => ({
  success: (message: string, title = 'Succès') =>
    notifications.show({
      title,
      message,
      color:     'teal',
      icon:      icon(IconCheck),
      autoClose: 3000,
      position:  'top-right',
      styles:    notifStyles('#10B981'),
    }),

  error: (message: string, title = 'Erreur') =>
    notifications.show({
      title,
      message,
      color:     'red',
      icon:      icon(IconX),
      autoClose: 6000,
      position:  'top-right',
      styles:    notifStyles('#EF4444'),
    }),

  warning: (message: string, title = 'Attention') =>
    notifications.show({
      title,
      message,
      color:     'orange',
      icon:      icon(IconAlertTriangle),
      autoClose: 5000,
      position:  'top-right',
      styles:    notifStyles('#F59E0B'),
    }),

  info: (message: string, title = 'Information') =>
    notifications.show({
      title,
      message,
      color:     'blue',
      icon:      icon(IconInfoCircle),
      autoClose: 4000,
      position:  'top-right',
      styles:    notifStyles('#0EA5E9'),
    }),
});
