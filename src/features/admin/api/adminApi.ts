import { apiSlice } from '../../../app/apiSlice';
import type { PaginatedResponse, BulkResponse, RegistrationStatus, AcademicProgram } from '../../../common/types';
import type { StudentSummaryResponse, GetStudentsQuery } from '../../student/types/student.types';
import type {
  AcademicYearResponse,
  AdminLevelResponse,
  CreateAcademicYearRequest,
  CreateLevelRequest,
  UpdateLevelRequest,
  AutoArrangeRequest,
  CenterSummaryResponse,
  CreateCenterRequest,
  HospitalSummaryResponse,
  CreateHospitalRequest,
  ServiceSummaryResponse,
  CreateServiceRequest,
  StageSummaryResponse,
  StageDetailResponse,
  CreateStageRequest,
  UpdateStageRequest,
  GetStagesParams,
  CohortResponse,
  CreateCohortRequest,
  CreateRegistrationRequest,
} from '../types/admin.types';

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
      providesTags: [{ type: 'Level', id: 'ACADEMIC_YEARS' }],
    }),

    createAcademicYear: builder.mutation<number, CreateAcademicYearRequest>({
      query: (body) => ({ url: '/academic-years', method: 'POST', body }),
      invalidatesTags: [{ type: 'Level', id: 'ACADEMIC_YEARS' }],
    }),

    getLevels: builder.query<AdminLevelResponse[], AcademicProgram | undefined>({
      query: (program) => ({
        url: '/levels',
        params: { academicProgram: program, pageSize: 100 },
      }),
      transformResponse: (res: PaginatedResponse<AdminLevelResponse>) => res.items,
      providesTags: [{ type: 'Level', id: 'LIST' }],
    }),

    createLevel: builder.mutation<number, CreateLevelRequest>({
      query: (body) => ({ url: '/levels', method: 'POST', body }),
      invalidatesTags: [{ type: 'Level', id: 'LIST' }],
    }),

    updateLevel: builder.mutation<void, { id: number } & UpdateLevelRequest>({
      query: ({ id, ...body }) => ({ url: `/levels/${id}`, method: 'PUT', body }),
      invalidatesTags: [{ type: 'Level', id: 'LIST' }],
    }),

    // ─── Infrastructure ──────────────────────────────────────────────────────
    getCenters: builder.query<PaginatedResponse<CenterSummaryResponse>, { searchTerm?: string; pageNumber?: number; pageSize?: number }>({
      query: (params) => ({ url: '/centers', params }),
      providesTags: [{ type: 'Center' as const, id: 'LIST' }],
    }),

    createCenter: builder.mutation<number, CreateCenterRequest>({
      query: (body) => ({ url: '/centers', method: 'POST', body }),
      invalidatesTags: [{ type: 'Center', id: 'LIST' }],
    }),

    updateCenter: builder.mutation<void, { id: number } & CreateCenterRequest>({
      query: ({ id, ...body }) => ({ url: `/centers/${id}`, method: 'PUT', body }),
      invalidatesTags: [{ type: 'Center', id: 'LIST' }],
    }),

    deleteCenter: builder.mutation<void, number>({
      query: (id) => ({ url: `/centers/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Center', id: 'LIST' }],
    }),

    getHospitals: builder.query<PaginatedResponse<HospitalSummaryResponse>, { centerId?: number; searchTerm?: string; pageNumber?: number; pageSize?: number }>({
      query: (params) => ({ url: '/hospitals', params }),
      providesTags: [{ type: 'Hospital' as const, id: 'LIST' }],
    }),

    createHospital: builder.mutation<number, CreateHospitalRequest>({
      query: (body) => ({ url: '/hospitals', method: 'POST', body }),
      invalidatesTags: [{ type: 'Hospital', id: 'LIST' }],
    }),

    updateHospital: builder.mutation<void, { id: number } & CreateHospitalRequest>({
      query: ({ id, ...body }) => ({ url: `/hospitals/${id}`, method: 'PUT', body }),
      invalidatesTags: [{ type: 'Hospital', id: 'LIST' }],
    }),

    deleteHospital: builder.mutation<void, number>({
      query: (id) => ({ url: `/hospitals/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Hospital', id: 'LIST' }],
    }),

    getServices: builder.query<PaginatedResponse<ServiceSummaryResponse>, { hospitalId?: number; searchTerm?: string; pageNumber?: number; pageSize?: number }>({
      query: (params) => ({ url: '/services', params }),
      providesTags: [{ type: 'Service' as const, id: 'LIST' }],
    }),

    createService: builder.mutation<number, CreateServiceRequest>({
      query: (body) => ({ url: '/services', method: 'POST', body }),
      invalidatesTags: [{ type: 'Service', id: 'LIST' }],
    }),

    updateService: builder.mutation<void, { id: number } & CreateServiceRequest>({
      query: ({ id, ...body }) => ({ url: `/services/${id}`, method: 'PUT', body }),
      invalidatesTags: [{ type: 'Service', id: 'LIST' }],
    }),

    deleteService: builder.mutation<void, number>({
      query: (id) => ({ url: `/services/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Service', id: 'LIST' }],
    }),

    // ─── Stages ──────────────────────────────────────────────────────────────
    getStages: builder.query<PaginatedResponse<StageSummaryResponse>, GetStagesParams>({
      query: (params) => ({ url: '/stages', params }),
      providesTags: (result) =>
        result
          ? [...result.items.map(({ id }) => ({ type: 'Stage' as const, id })), { type: 'Stage' as const, id: 'LIST' }]
          : [{ type: 'Stage' as const, id: 'LIST' }],
    }),

    getStageById: builder.query<StageDetailResponse, number>({
      query: (id) => `/stages/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Stage' as const, id }],
    }),

    createStage: builder.mutation<number, CreateStageRequest>({
      query: (body) => ({ url: '/stages', method: 'POST', body }),
      invalidatesTags: [{ type: 'Stage', id: 'LIST' }],
    }),

    updateStage: builder.mutation<void, { id: number } & UpdateStageRequest>({
      query: ({ id, ...body }) => ({ url: `/stages/${id}`, method: 'PUT', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Stage', id }, { type: 'Stage', id: 'LIST' }],
    }),

    deleteStage: builder.mutation<void, number>({
      query: (id) => ({ url: `/stages/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Stage', id: 'LIST' }],
    }),

    // ─── Cohorts ─────────────────────────────────────────────────────────────
    getCohortsByStage: builder.query<CohortResponse[], number>({
      query: (stageId) => `/stages/${stageId}/cohorts`,
      providesTags: (_r, _e, stageId) => [{ type: 'Stage' as const, id: `cohorts-${stageId}` }],
    }),

    createCohort: builder.mutation<number, CreateCohortRequest>({
      query: (body) => ({ url: '/cohorts', method: 'POST', body }),
      invalidatesTags: (_r, _e, { stageId }) => [{ type: 'Stage' as const, id: `cohorts-${stageId}` }],
    }),

    deleteCohort: builder.mutation<void, { cohortId: number; stageId: number }>({
      query: ({ cohortId }) => ({ url: `/cohorts/${cohortId}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { stageId }) => [{ type: 'Stage' as const, id: `cohorts-${stageId}` }],
    }),

    // ─── Groups ──────────────────────────────────────────────────────────────
    autoArrangeGroups: builder.mutation<BulkResponse<string, number>, AutoArrangeRequest>({
      query: (body) => ({ url: '/groups/auto-arrange', method: 'POST', body }),
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
  useGetCentersQuery,
  useCreateCenterMutation,
  useUpdateCenterMutation,
  useDeleteCenterMutation,
  useGetHospitalsQuery,
  useCreateHospitalMutation,
  useUpdateHospitalMutation,
  useDeleteHospitalMutation,
  useGetServicesQuery,
  useCreateServiceMutation,
  useUpdateServiceMutation,
  useDeleteServiceMutation,
  useGetStudentsQuery,
  useDeleteStudentMutation,
  useGetAcademicYearsQuery,
  useCreateAcademicYearMutation,
  useGetLevelsQuery,
  useCreateLevelMutation,
  useUpdateLevelMutation,
  useAutoArrangeGroupsMutation,
  useGetStagesQuery,
  useGetStageByIdQuery,
  useCreateStageMutation,
  useUpdateStageMutation,
  useDeleteStageMutation,
  useGetCohortsByStageQuery,
  useCreateCohortMutation,
  useDeleteCohortMutation,
  useCreateRegistrationMutation,
  useUpdateRegistrationMutation,
} = adminApiSlice;
