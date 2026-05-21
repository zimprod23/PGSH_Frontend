import { apiSlice } from '../../../app/apiSlice';
import type { StudentResponse, StudentHistoryResponse } from '../types/student.types';

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
  }),
});

export const {
  useGetCurrentStudentQuery,
  useGetStudentByIdQuery,
  useGetStudentHistoryQuery,
} = studentApiSlice;
