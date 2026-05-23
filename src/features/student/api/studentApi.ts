import { apiSlice } from '../../../app/apiSlice';
import type { PaginatedResponse } from '../../../common/types';
import type {
  StudentResponse, StudentHistoryResponse, StudentRegistrationResponse,
  InternshipAssignmentSummary, InternshipAssignmentDetail,
  AttendanceRecord, ServiceEvaluationDetail,
} from '../types/student.types';
import type { StageSummaryResponse, StageResponse, GetStagesQuery } from '../types/stage.types';

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
      query: (params) => ({ url: '/stages', params }),
      providesTags: ['Stage'],
    }),

    getStageById: builder.query<StageResponse, number>({
      query: (id) => `/stages/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Stage' as const, id }],
    }),

    getMyAssignments: builder.query<
      PaginatedResponse<InternshipAssignmentSummary>,
      { registrationId: string; stageId?: number; pageSize?: number }
    >({
      query: ({ registrationId, stageId, pageSize = 50 }) => ({
        url: '/internship-assignments',
        params: { registrationId, stageId, pageSize },
      }),
      providesTags: (_r, _e, { registrationId }) => [
        { type: 'Registration' as const, id: `assignments-${registrationId}` },
      ],
    }),

    getAssignmentById: builder.query<InternshipAssignmentDetail, string>({
      query: (id) => `/internship-assignments/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Registration' as const, id: `assignment-${id}` }],
    }),

    getAttendanceByPeriod: builder.query<AttendanceRecord[], string>({
      query: (periodId) => `/service-periods/${periodId}/attendance`,
      providesTags: (_r, _e, id) => [{ type: 'Registration' as const, id: `attendance-${id}` }],
    }),

    getEvaluationByPeriod: builder.query<ServiceEvaluationDetail, string>({
      query: (periodId) => `/service-periods/${periodId}/evaluation`,
      providesTags: (_r, _e, id) => [{ type: 'Registration' as const, id: `eval-${id}` }],
    }),
  }),
});

export const {
  useGetCurrentStudentQuery,
  useGetStudentByIdQuery,
  useGetStudentHistoryQuery,
  useGetStudentRegistrationsQuery,
  useGetStagesQuery,
  useGetStageByIdQuery,
  useGetMyAssignmentsQuery,
  useGetAssignmentByIdQuery,
  useGetAttendanceByPeriodQuery,
  useGetEvaluationByPeriodQuery,
} = studentApiSlice;
