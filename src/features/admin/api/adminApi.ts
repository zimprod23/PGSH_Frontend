import { apiSlice } from '../../../app/apiSlice';
import type { PaginatedResponse, BulkResponse, RegistrationStatus, AcademicProgram } from '../../../common/types';
import type { StudentSummaryResponse, GetStudentsQuery, UpdateStudentRequest } from '../../student/types/student.types';
import type {
  CohortDetailResponse,
  StageScheduleResponse,
  CreateStageSlotRequest,
  UpdateStageSlotRequest,
  SetCohortSlotAssignmentRequest,
  AcademicYearResponse,
  AcademicGroupResponse,
  GroupDetailResponse,
  TransferStudentRequest,
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
  ServiceDetailResponse,
  StageSummaryResponse,
  StageDetailResponse,
  CreateStageRequest,
  UpdateStageRequest,
  GetStagesParams,
  CohortResponse,
  CreateCohortRequest,
  CreateRegistrationRequest,
  ServicePeriodResponse,
  GetServicePeriodsParams,
  AttendanceRecord,
  RecordAttendanceRequest,
  InternshipAssignmentSummaryResponse,
  GetAssignmentsParams,
  EmployeeSummaryResponse,
  EmployeeDetailResponse,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  GetEmployeesParams,
  BulkCreateCohortsFromPartitionsRequest,
  BulkCohortsFromPartitionsResult,
  GenerateMacroPlanRequest,
  MacroPlanResult,
  YearTimelineResponse,
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

    updateStudent: builder.mutation<void, { id: string } & UpdateStudentRequest>({
      query: ({ id, ...body }) => ({ url: `/students/${id}`, method: 'PUT', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Student', id }, { type: 'Student', id: 'LIST' }],
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

    addAllowedService: builder.mutation<void, { stageId: number; serviceId: number }>({
      query: ({ stageId, serviceId }) => ({
        url: `/stages/${stageId}/allowed-services`,
        method: 'POST',
        body: { serviceId },
      }),
      invalidatesTags: (_r, _e, { stageId }) => [{ type: 'Stage' as const, id: stageId }],
    }),

    removeAllowedService: builder.mutation<void, { stageId: number; serviceId: number }>({
      query: ({ stageId, serviceId }) => ({
        url: `/stages/${stageId}/allowed-services/${serviceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_r, _e, { stageId }) => [{ type: 'Stage' as const, id: stageId }],
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

    getCohortById: builder.query<CohortDetailResponse, number>({
      query: (id) => `/cohorts/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Stage' as const, id: `cohort-detail-${id}` }],
    }),

    createCohort: builder.mutation<number, CreateCohortRequest>({
      query: (body) => ({ url: '/cohorts', method: 'POST', body }),
      invalidatesTags: (_r, _e, { stageId }) => [{ type: 'Stage' as const, id: `cohorts-${stageId}` }],
    }),

    deleteCohort: builder.mutation<void, { cohortId: number; stageId: number }>({
      query: ({ cohortId }) => ({ url: `/cohorts/${cohortId}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { stageId }) => [{ type: 'Stage' as const, id: `cohorts-${stageId}` }],
    }),

    assignStudentsToCohort: builder.mutation<{ successCount: number; totalProcessed: number }, { cohortId: number; stageId: number }>({
      query: ({ cohortId }) => ({ url: `/cohorts/${cohortId}/assign-students`, method: 'POST' }),
      invalidatesTags: (_r, _e, { stageId }) => [
        { type: 'Assignment' as const, id: 'LIST' },
        { type: 'Stage' as const, id: `cohorts-${stageId}` },
      ],
    }),

    assignAllStudentsByStage: builder.mutation<{ successCount: number; totalProcessed: number }, { stageId: number; partitionLabels?: string[] }>({
      query: ({ stageId, partitionLabels }) => ({
        url: `/stages/${stageId}/assign-students`,
        method: 'POST',
        body: partitionLabels?.length ? { partitionLabels } : {},
      }),
      invalidatesTags: (_r, _e, { stageId }) => [
        { type: 'Assignment' as const, id: 'LIST' },
        { type: 'Stage' as const, id: `cohorts-${stageId}` },
      ],
    }),

    startCohortAssignments: builder.mutation<{ started: number }, number>({
      query: (id) => ({ url: `/cohorts/${id}/start-assignments`, method: 'POST' }),
      invalidatesTags: [{ type: 'Assignment' as const, id: 'LIST' }],
    }),

    completeCohortPeriods: builder.mutation<{ completed: number }, number>({
      query: (id) => ({ url: `/cohorts/${id}/complete-periods`, method: 'POST' }),
      invalidatesTags: [{ type: 'Assignment' as const, id: 'LIST' }],
    }),

    validateCohortAssignments: builder.mutation<{ validated: number }, number>({
      query: (id) => ({ url: `/cohorts/${id}/validate-assignments`, method: 'POST' }),
      invalidatesTags: [{ type: 'Assignment' as const, id: 'LIST' }],
    }),

    getStageSchedule: builder.query<StageScheduleResponse, number>({
      query: (stageId) => `/stages/${stageId}/schedule`,
      providesTags: (_r, _e, stageId) => [
        { type: 'Stage' as const, id: `schedule-${stageId}` },
        { type: 'Service' as const, id: 'LIST' },
      ],
    }),

    getYearTimeline: builder.query<YearTimelineResponse, { academicYearId: number; levelId?: number }>({
      query: ({ academicYearId, levelId }) => ({
        url: `/academic-years/${academicYearId}/timeline`,
        params: levelId ? { levelId } : undefined,
      }),
      providesTags: [{ type: 'Stage' as const, id: 'TIMELINE' }],
    }),

    createStageSlot: builder.mutation<number, { stageId: number } & CreateStageSlotRequest>({
      query: ({ stageId, ...body }) => ({ url: `/stages/${stageId}/slots`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { stageId }) => [{ type: 'Stage' as const, id: `schedule-${stageId}` }],
    }),

    updateStageSlot: builder.mutation<void, { stageId: number; slotId: number } & UpdateStageSlotRequest>({
      query: ({ stageId, slotId, ...body }) => ({ url: `/stages/${stageId}/slots/${slotId}`, method: 'PUT', body }),
      invalidatesTags: (_r, _e, { stageId }) => [{ type: 'Stage' as const, id: `schedule-${stageId}` }],
    }),

    deleteStageSlot: builder.mutation<void, { stageId: number; slotId: number }>({
      query: ({ stageId, slotId }) => ({ url: `/stages/${stageId}/slots/${slotId}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { stageId }) => [{ type: 'Stage' as const, id: `schedule-${stageId}` }],
    }),

    setCohortSlotAssignment: builder.mutation<number, { stageId: number; slotId: number; cohortId: number } & SetCohortSlotAssignmentRequest>({
      query: ({ stageId, slotId, cohortId, ...body }) => ({ url: `/stages/${stageId}/slots/${slotId}/cohorts/${cohortId}`, method: 'PUT', body }),
      invalidatesTags: (_r, _e, { stageId }) => [{ type: 'Stage' as const, id: `schedule-${stageId}` }],
    }),

    clearCohortSlotAssignment: builder.mutation<void, { stageId: number; slotId: number; cohortId: number }>({
      query: ({ stageId, slotId, cohortId }) => ({ url: `/stages/${stageId}/slots/${slotId}/cohorts/${cohortId}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { stageId }) => [{ type: 'Stage' as const, id: `schedule-${stageId}` }],
    }),

    clearSlotAssignments: builder.mutation<{ cleared: number; skipped: number }, { stageId: number; slotId: number }>({
      query: ({ stageId, slotId }) => ({ url: `/stages/${stageId}/slots/${slotId}/cohorts`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { stageId }) => [{ type: 'Stage' as const, id: `schedule-${stageId}` }],
    }),

    publishSchedule: builder.mutation<void, { cohortId: number; stageId: number; allowOverCapacity?: boolean }>({
      query: ({ cohortId, allowOverCapacity }) => ({
        url: `/cohorts/${cohortId}/publish-schedule`,
        method: 'POST',
        body: { allowOverCapacity: allowOverCapacity ?? false },
      }),
      invalidatesTags: (_r, _e, { cohortId, stageId }) => [
        { type: 'Assignment' as const, id: 'LIST' },
        { type: 'Stage' as const, id: `cohort-detail-${cohortId}` },
        { type: 'Stage' as const, id: `cohorts-${stageId}` },
        { type: 'Stage' as const, id: `schedule-${stageId}` },
        { type: 'Stage' as const, id: 'TIMELINE' },
      ],
    }),

    unpublishSchedule: builder.mutation<{ removed: number }, { cohortId: number; stageId: number }>({
      query: ({ cohortId }) => ({ url: `/cohorts/${cohortId}/publish-schedule`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { cohortId, stageId }) => [
        { type: 'Assignment' as const, id: 'LIST' },
        { type: 'Stage' as const, id: `cohort-detail-${cohortId}` },
        { type: 'Stage' as const, id: `cohorts-${stageId}` },
        { type: 'Stage' as const, id: `schedule-${stageId}` },
      ],
    }),

    autoArrangeStageSchedule: builder.mutation<
      { assigned: number; saturatedServices: number; totalStudents: number; totalCapacity: number },
      { stageId: number; partitionCount?: number; partitionLabels?: string[]; periodNumbers?: number[] }
    >({
      query: ({ stageId, ...body }) => ({
        url: `/stages/${stageId}/schedule/auto-arrange`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_r, _e, { stageId }) => [
        { type: 'Stage' as const, id: `schedule-${stageId}` },
        { type: 'Level' as const, id: 'GROUPS' },
      ],
    }),

    publishStageSchedule: builder.mutation<
      { publishedCohorts: number; periodsCreated: number; skippedCohorts: number },
      { stageId: number; partitionLabels?: string[]; periodNumbers?: number[]; allowOverCapacity?: boolean }
    >({
      query: ({ stageId, ...body }) => ({
        url: `/stages/${stageId}/schedule/publish`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_r, _e, { stageId }) => [
        { type: 'Assignment' as const, id: 'LIST' },
        { type: 'Stage' as const, id: `cohorts-${stageId}` },
        { type: 'Stage' as const, id: `schedule-${stageId}` },
        { type: 'Stage' as const, id: 'TIMELINE' },
      ],
    }),

    generateMacroPlan: builder.mutation<MacroPlanResult, GenerateMacroPlanRequest>({
      query: (body) => ({ url: '/stages/macro-plan', method: 'POST', body }),
      invalidatesTags: (_r, _e, { plans }) => [
        { type: 'Level' as const, id: 'GROUPS' },
        { type: 'Assignment' as const, id: 'LIST' },
        { type: 'Stage' as const, id: 'TIMELINE' },
        ...Array.from(new Set(plans.map((p) => p.stageId))).flatMap((id) => [
          { type: 'Stage' as const, id: `cohorts-${id}` },
          { type: 'Stage' as const, id: `schedule-${id}` },
        ]),
      ],
    }),

    // ─── Groups ──────────────────────────────────────────────────────────────
    getAcademicGroups: builder.query<AcademicGroupResponse[], { academicYearId?: number; levelId?: number; studentId?: string }>({
      query: (params) => ({ url: '/groups', params }),
      providesTags: [{ type: 'Level' as const, id: 'GROUPS' }],
    }),

    createGroup: builder.mutation<number, { label: string; academicYearId: number; levelId?: number | null; geographicZone?: string; rotationGroup?: string | null }>({
      query: (body) => ({ url: '/groups', method: 'POST', body }),
      invalidatesTags: [{ type: 'Level' as const, id: 'GROUPS' }],
    }),

    getGroupById: builder.query<GroupDetailResponse, number>({
      query: (id) => `/groups/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Level' as const, id: `group-${id}` }],
    }),

    updateGroup: builder.mutation<void, { id: number; label: string; geographicZone?: string; rotationGroup?: string | null }>({
      query: ({ id, ...body }) => ({ url: `/groups/${id}`, method: 'PUT', body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'Level' as const, id: 'GROUPS' },
        { type: 'Level' as const, id: `group-${id}` },
      ],
    }),

    deleteGroup: builder.mutation<void, number>({
      query: (id) => ({ url: `/groups/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Level' as const, id: 'GROUPS' }],
    }),

    emptyGroup: builder.mutation<{ unassigned: number }, number>({
      query: (id) => ({ url: `/groups/${id}/students`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, id) => [
        { type: 'Level' as const, id: `group-${id}` },
        { type: 'Level' as const, id: 'GROUPS' },
      ],
    }),

    transferStudent: builder.mutation<void, TransferStudentRequest>({
      query: (body) => ({ url: '/groups/transfer-student', method: 'POST', body }),
      invalidatesTags: (_r, _e, { registrationId }) => [
        { type: 'Registration' as const, id: registrationId },
        { type: 'Level' as const, id: 'GROUPS' },
      ],
    }),

    autoArrangeGroups: builder.mutation<BulkResponse<string, number>, AutoArrangeRequest>({
      query: (body) => ({ url: '/groups/auto-arrange', method: 'POST', body }),
    }),

    assignRotationGroups: builder.mutation<{ labeled: number }, { academicYearId: number; partitionCount: number; levelId?: number }>({
      query: ({ academicYearId, partitionCount, levelId }) => ({
        url: '/groups/assign-partitions',
        method: 'POST',
        params: levelId != null ? { academicYearId, levelId } : { academicYearId },
        body: { partitionCount },
      }),
      invalidatesTags: [{ type: 'Level' as const, id: 'GROUPS' }],
    }),

    bulkCreateCohortsFromPartitions: builder.mutation<BulkCohortsFromPartitionsResult, BulkCreateCohortsFromPartitionsRequest>({
      query: (body) => ({ url: '/cohorts/from-partitions', method: 'POST', body }),
      invalidatesTags: (_r, _e, { mappings }) =>
        Array.from(new Set(mappings.map((m) => m.stageId))).map((id) => ({
          type: 'Stage' as const,
          id: `cohorts-${id}`,
        })),
    }),

    deleteAllStageCohorts: builder.mutation<{ deleted: number }, number>({
      query: (stageId) => ({ url: `/stages/${stageId}/cohorts/all`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, stageId) => [{ type: 'Stage' as const, id: `cohorts-${stageId}` }],
    }),

    deleteAllYearGroups: builder.mutation<{ deleted: number }, number>({
      query: (academicYearId) => ({ url: '/groups/all', method: 'DELETE', params: { academicYearId } }),
      invalidatesTags: [{ type: 'Level' as const, id: 'GROUPS' }],
    }),

    emptyAllYearGroups: builder.mutation<{ unassigned: number }, number>({
      query: (academicYearId) => ({ url: '/groups/all/students', method: 'DELETE', params: { academicYearId } }),
      invalidatesTags: [{ type: 'Level' as const, id: 'GROUPS' }],
    }),

    createRegistration: builder.mutation<string, CreateRegistrationRequest>({
      query: (body) => ({ url: '/registrations', method: 'POST', body }),
      invalidatesTags: (_r, _e, { studentId }) => [{ type: 'Registration' as const, id: studentId }],
    }),

    // ─── Internship Assignments ───────────────────────────────────────────────
    getAssignmentStatusSummary: builder.query<{ status: string; count: number }[], { cohortIds?: number[]; stageId?: number }>({
      query: ({ cohortIds, stageId }) => ({ url: '/internship-assignments/status-summary', params: { cohortIds, stageId } }),
      providesTags: [{ type: 'Assignment' as const, id: 'LIST' }],
    }),

    getInternshipAssignments: builder.query<PaginatedResponse<InternshipAssignmentSummaryResponse>, GetAssignmentsParams>({
      query: (params) => ({ url: '/internship-assignments', params }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: 'Assignment' as const, id })),
              { type: 'Assignment' as const, id: 'LIST' },
            ]
          : [{ type: 'Assignment' as const, id: 'LIST' }],
    }),

    startAssignment: builder.mutation<void, string>({
      query: (id) => ({ url: `/internship-assignments/${id}/start`, method: 'PUT' }),
      invalidatesTags: (_r, _e, id) => [{ type: 'Assignment' as const, id }],
    }),

    validateAssignment: builder.mutation<void, string>({
      query: (id) => ({ url: `/internship-assignments/${id}/validate`, method: 'PUT' }),
      invalidatesTags: (_r, _e, id) => [
        { type: 'Assignment' as const, id },
        { type: 'Assignment' as const, id: 'LIST' },
      ],
    }),

    rejectAssignment: builder.mutation<void, string>({
      query: (id) => ({ url: `/internship-assignments/${id}/reject`, method: 'PUT' }),
      invalidatesTags: (_r, _e, id) => [
        { type: 'Assignment' as const, id },
        { type: 'Assignment' as const, id: 'LIST' },
      ],
    }),

    completeServicePeriod: builder.mutation<void, string>({
      query: (id) => ({ url: `/service-periods/${id}/complete`, method: 'PUT' }),
      invalidatesTags: [{ type: 'Assignment' as const, id: 'LIST' }],
    }),

    // ─── Service Periods ─────────────────────────────────────────────────────
    getServicePeriods: builder.query<PaginatedResponse<ServicePeriodResponse>, GetServicePeriodsParams>({
      query: (params) => ({ url: '/service-periods', params }),
      providesTags: [{ type: 'Service' as const, id: 'PERIODS' }],
    }),

    getAttendanceByPeriod: builder.query<AttendanceRecord[], string>({
      query: (periodId) => `/service-periods/${periodId}/attendance`,
      providesTags: (_r, _e, periodId) => [{ type: 'Service' as const, id: `attendance-${periodId}` }],
    }),

    recordAttendance: builder.mutation<string, RecordAttendanceRequest>({
      query: (body) => ({ url: '/attendance', method: 'POST', body }),
      invalidatesTags: (_r, _e, { servicePeriodId }) => [
        { type: 'Service' as const, id: `attendance-${servicePeriodId}` },
      ],
    }),

    // ─── Employees ───────────────────────────────────────────────────────────
    getEmployees: builder.query<PaginatedResponse<EmployeeSummaryResponse>, GetEmployeesParams>({
      query: (params) => ({ url: '/employees', params }),
      providesTags: (result) =>
        result
          ? [...result.items.map(({ id }) => ({ type: 'Employee' as const, id })), { type: 'Employee' as const, id: 'LIST' }]
          : [{ type: 'Employee' as const, id: 'LIST' }],
    }),

    getEmployeeById: builder.query<EmployeeDetailResponse, string>({
      query: (id) => `/employees/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Employee' as const, id }],
    }),

    createEmployee: builder.mutation<string, CreateEmployeeRequest>({
      query: (body) => ({ url: '/employees', method: 'POST', body }),
      invalidatesTags: [{ type: 'Employee', id: 'LIST' }],
    }),

    updateEmployee: builder.mutation<void, { id: string } & UpdateEmployeeRequest>({
      query: ({ id, ...body }) => ({ url: `/employees/${id}`, method: 'PUT', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'Employee', id }, { type: 'Employee', id: 'LIST' }],
    }),

    deleteEmployee: builder.mutation<void, string>({
      query: (id) => ({ url: `/employees/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Employee', id: 'LIST' }],
    }),

    // ─── Service detail + staff management ───────────────────────────────────
    getServiceById: builder.query<ServiceDetailResponse, number>({
      query: (id) => `/services/${id}`,
      providesTags: (_r, _e, id) => [{ type: 'Service' as const, id: `detail-${id}` }],
    }),

    assignStaff: builder.mutation<void, { serviceId: number; employeeId: string }>({
      query: ({ serviceId, employeeId }) => ({ url: `/services/${serviceId}/staff`, method: 'POST', body: { employeeId } }),
      invalidatesTags: (_r, _e, { serviceId }) => [{ type: 'Service', id: `detail-${serviceId}` }, { type: 'Service', id: 'LIST' }],
    }),

    removeStaff: builder.mutation<void, { serviceId: number; employeeId: string }>({
      query: ({ serviceId, employeeId }) => ({ url: `/services/${serviceId}/staff/${employeeId}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { serviceId }) => [{ type: 'Service', id: `detail-${serviceId}` }, { type: 'Service', id: 'LIST' }],
    }),

    assignChef: builder.mutation<void, { serviceId: number; employeeId: string }>({
      query: ({ serviceId, employeeId }) => ({ url: `/services/${serviceId}/chef`, method: 'PUT', body: { employeeId } }),
      invalidatesTags: (_r, _e, { serviceId }) => [{ type: 'Service', id: `detail-${serviceId}` }, { type: 'Service', id: 'LIST' }],
    }),

    removeChef: builder.mutation<void, number>({
      query: (serviceId) => ({ url: `/services/${serviceId}/chef`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, serviceId) => [{ type: 'Service', id: `detail-${serviceId}` }, { type: 'Service', id: 'LIST' }],
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
  useGetAcademicGroupsQuery,
  useGetGroupByIdQuery,
  useCreateGroupMutation,
  useUpdateGroupMutation,
  useDeleteGroupMutation,
  useEmptyGroupMutation,
  useTransferStudentMutation,
  useAutoArrangeGroupsMutation,
  useAssignRotationGroupsMutation,
  useBulkCreateCohortsFromPartitionsMutation,
  useDeleteAllStageCohortsMutation,
  useDeleteAllYearGroupsMutation,
  useEmptyAllYearGroupsMutation,
  useGetStagesQuery,
  useGetStageByIdQuery,
  useCreateStageMutation,
  useUpdateStageMutation,
  useDeleteStageMutation,
  useAddAllowedServiceMutation,
  useRemoveAllowedServiceMutation,
  useGetCohortsByStageQuery,
  useGetCohortByIdQuery,
  useCreateCohortMutation,
  useDeleteCohortMutation,
  useAssignStudentsToCohortMutation,
  useAssignAllStudentsByStageMutation,
  useStartCohortAssignmentsMutation,
  useCompleteCohortPeriodsMutation,
  useValidateCohortAssignmentsMutation,
  useGetStageScheduleQuery,
  useGetYearTimelineQuery,
  useCreateStageSlotMutation,
  useUpdateStageSlotMutation,
  useDeleteStageSlotMutation,
  useSetCohortSlotAssignmentMutation,
  useClearCohortSlotAssignmentMutation,
  useClearSlotAssignmentsMutation,
  usePublishScheduleMutation,
  useUnpublishScheduleMutation,
  useAutoArrangeStageScheduleMutation,
  usePublishStageScheduleMutation,
  useGenerateMacroPlanMutation,
  useCreateRegistrationMutation,
  useUpdateRegistrationMutation,
  useGetServicePeriodsQuery,
  useGetAttendanceByPeriodQuery,
  useRecordAttendanceMutation,
  useGetAssignmentStatusSummaryQuery,
  useGetInternshipAssignmentsQuery,
  useStartAssignmentMutation,
  useValidateAssignmentMutation,
  useRejectAssignmentMutation,
  useCompleteServicePeriodMutation,
  useUpdateStudentMutation,
  useGetEmployeesQuery,
  useGetEmployeeByIdQuery,
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,
  useGetServiceByIdQuery,
  useAssignStaffMutation,
  useRemoveStaffMutation,
  useAssignChefMutation,
  useRemoveChefMutation,
} = adminApiSlice;
