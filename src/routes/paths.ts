export const PATHS = {
  ROOT: '/',
  UNAUTHORIZED: '/unauthorized',
  NO_PROFILE:   '/no-profile',

  STUDENT: {
    ROOT:           '/student',
    DASHBOARD:      '',
    PROFILE:        'profile',
    STAGES:         'stages',
    HISTORY:        'history',
    DEMANDS:        'demands',
    SERVICE_DETAIL: 'services/:serviceId',
  },

  ADMIN: {
    ROOT:            '/admin',
    DASHBOARD:       '',
    STUDENTS:        'students',
    STUDENT_DETAIL:  'students/:id',
    REGISTRATIONS:   'registrations',
    ACADEMIC_YEARS:  'academic-years',
    GROUPS:          'groups',
    GROUP_DETAIL:    'groups/:id',
    LEVELS:          'levels',
    STAGES:          'stages',
    STAGE_DETAIL:    'stages/:id',
    HOSPITALS:       'hospitals',
    EMPLOYEES:       'employees',
    ATTENDANCE:      'attendance',
    ASSIGNMENTS:     'assignments',
  },

  EMPLOYEE: {
    ROOT:        '/employee',
    PROFILE:     'profile',
    SERVICES:    'services',
    ATTENDANCE:  'attendance',
    EVALUATIONS: 'evaluations',
  },
} as const;
