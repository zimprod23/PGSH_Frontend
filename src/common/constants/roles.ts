export const Roles = {
  Student:    'Student',
  Scolarite:  'Scolarite',
  Secretaire: 'Secretaire',
  Professor:  'Professor',
  Employee:   'Employee',
  SuperUser:  'SuperUser',
} as const;

export type UserRole = typeof Roles[keyof typeof Roles];
