import { apiSlice } from '../../../app/apiSlice';
import type { PaginatedResponse, RegistrationStatus, AcademicProgram } from '../../../common/types';
import type { StudentSummaryResponse, GetStudentsQuery } from '../../student/types/student.types';
import type { AcademicYearResponse, AdminLevelResponse, CreateRegistrationRequest } from '../types/admin.types';

export const adminApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getStudents: builder.query<PaginatedResponse<StudentSummaryResponse>, GetStudentsQuery>({
      query: (params) => ({ url: '/students', params }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: 'Student' as const, id })),
              { type: 'Student' as const, id: 'LIST' },
            ]
          : [{ type: 'Student' as const, id: 'LIST' }],
    }),

    deleteStudent: builder.mutation<void, string>({
      query: (id) => ({ url: `/students/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Student', id: 'LIST' }],
    }),

    getAcademicYears: builder.query<AcademicYearResponse[], void>({
      query: () => '/academic-years',
      providesTags: ['Level'],
    }),

    getLevels: builder.query<AdminLevelResponse[], AcademicProgram | undefined>({
      query: (program) => ({
        url: '/levels',
        params: { academicProgram: program, pageSize: 50 },
      }),
      transformResponse: (res: PaginatedResponse<AdminLevelResponse>) => res.items,
      providesTags: ['Level'],
    }),

    createRegistration: builder.mutation<string, CreateRegistrationRequest>({
      query: (body) => ({ url: '/registrations', method: 'POST', body }),
      invalidatesTags: (_r, _e, { studentId }) => [{ type: 'Registration' as const, id: studentId }],
    }),

    updateRegistration: builder.mutation<void, {
      registrationId: string;
      studentId: string;
      status: RegistrationStatus;
      academicYearId: number;
      levelId: number;
      failureDescription?: string;
    }>({
      query: ({ registrationId, studentId, status, academicYearId, levelId, failureDescription }) => ({
        url: `/registrations/${registrationId}`,
        method: 'PUT',
        body: { studentId, status, academicYearId, levelId, failureDescription },
      }),
      invalidatesTags: (_r, _e, { studentId }) => [{ type: 'Registration' as const, id: studentId }],
    }),
  }),
});

export const {
  useGetStudentsQuery,
  useDeleteStudentMutation,
  useGetAcademicYearsQuery,
  useGetLevelsQuery,
  useCreateRegistrationMutation,
  useUpdateRegistrationMutation,
} = adminApiSlice;
