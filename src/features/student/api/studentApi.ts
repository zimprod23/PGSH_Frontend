import { apiSlice } from '../../../app/apiSlice';
import type { PaginatedResponse } from '../../../common/types';
import type { StudentResponse, StudentHistoryResponse, StudentRegistrationResponse } from '../types/student.types';
import type { StageSummaryResponse, GetStagesQuery } from '../types/stage.types';

export const studentApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCurrentStudent: builder.query<StudentResponse, void>({
      query: () => '/students/me',
      providesTags: (result) =>
        result
          ? [{ type: 'Student' as const, id: result.id }, 'Student']
          : ['Student'],
    }),

    getStudentById: builder.query<StudentResponse, string>({
      query: (id) => `/students/${id}`,
      providesTags: (_result, _err, id) => [{ type: 'Student' as const, id }],
    }),

    getStudentHistory: builder.query<StudentHistoryResponse[], string>({
      query: (id) => `/students/${id}/history`,
      providesTags: (_result, _err, id) => [{ type: 'History' as const, id }],
    }),

    getStudentRegistrations: builder.query<StudentRegistrationResponse[], string>({
      query: (studentId) => `/students/${studentId}/registrations`,
      providesTags: (_result, _err, id) => [{ type: 'Registration' as const, id }],
    }),

    getStages: builder.query<PaginatedResponse<StageSummaryResponse>, GetStagesQuery>({
      query: (params) => ({
        url: '/stages',
        params,
      }),
      providesTags: ['Stage'],
    }),
  }),
});

export const {
  useGetCurrentStudentQuery,
  useGetStudentByIdQuery,
  useGetStudentHistoryQuery,
  useGetStudentRegistrationsQuery,
  useGetStagesQuery,
} = studentApiSlice;
