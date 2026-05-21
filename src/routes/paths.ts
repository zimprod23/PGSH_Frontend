export const PATHS = {
  ROOT: '/',
  UNAUTHORIZED: '/unauthorized',

  STUDENT: {
    ROOT:      '/student',
    DASHBOARD: '',
    PROFILE:   'profile',
    STAGES:    'stages',
    HISTORY:   'history',
    DEMANDS:   'demands',
  },

  ADMIN: {
    ROOT:            '/admin',
    DASHBOARD:       '',
    STUDENTS:        'students',
    STUDENT_DETAIL:  'students/:id',
    REGISTRATIONS:   'registrations',
    ACADEMIC_YEARS:  'academic-years',
    GROUPS:          'groups',
    LEVELS:          'levels',
    STAGES:          'stages',
    STAGE_DETAIL:    'stages/:id',
    HOSPITALS:       'hospitals',
  },

  EMPLOYEE: '/employee',
  EMPLOYEE_PATHS: {
    ROOT: '/employee',
  },
} as const;
