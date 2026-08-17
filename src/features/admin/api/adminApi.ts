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
  DelocalizeStudentRequest,
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
  ServiceOccupancyResponse,
  ServiceOccupantResponse,
  ServiceStageResponse,
  StageSummaryResponse,
  StageDetailResponse,
  UnpublishScheduleResult,
  AllowedServiceSummary,
  CreateStageRequest,
  UpdateStageRequest,
  GetStagesParams,
  CohortResponse,
  CnpnVersionResponse,
  CnpnTargetCriteria,
  CreateCnpnVersionRequest,
  UpdateCnpnVersionRequest,
  CnpnCloneResult,
  CnpnTargetPreview,
  CurriculumResponse,
  CurriculumComparisonResponse,
  CurriculumSeedReport,
  SaveCurriculumRequest,
  CopyCurriculumRequest,
  CreateCohortRequest,
  CreateRegistrationRequest,
  ServicePeriodResponse,
  GetServicePeriodsParams,
  AttendanceRecord,
  RecordAttendanceRequest,
  InternshipAssignmentSummaryResponse,
  GetAssignmentsParams,
  StudentStageRecordResponse,
  FicheDeValidationResponse,
  EmployeeSummaryResponse,
  EmployeeDetailResponse,
  CreateEmployeeRequest,
  UpdateEmployeeRequest,
  GetEmployeesParams,
  BulkCreateCohortsFromPartitionsRequest,
  BulkCohortsFromPartitionsResult,
  GenerateMacroPlanRequest,
  MacroPlanResult,
  RotationCycleRequest,
  RotationCyclePreview,
  RotationCycleResult,
  YearTimelineResponse,
  PauseKind,
  LevelRepartitionResponse,
  GeneratedAxisResponse,
  GenerateAxisWindowsRequest,
  PartitionStrategy,
  PartitionAssignmentResult,
  ClearRotationGroupsResult,
  PromotionPartitioning,
  HolidayCoverage,
  HolidayInput,
  SeedNationalHolidaysResult,
  DeleteHolidayResult,
  UpdateHolidayResult,
} from '../types/admin.types';

/**
 * Changing the calendar changes every working-day count already on screen — the coverage list, and any axis
 * laid out from it. Module-level so the tag list identity is stable.
 */
const CALENDAR_CHANGED = [
  { type: 'Calendar' as const, id: 'HOLIDAYS' },
  { type: 'Calendar' as const, id: 'AXIS' },
];

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

    /**
     * Levels that are a **promotion** — a year of study — and not « Retrait ».
     *
     * ⚠ « Retrait » (année 0) is a withdrawal marker the legacy import kept as a level so the
     * registrations and the stages already served that year would survive. It has no stage, no
     * cohorte and nobody to rotate, but being a level it was offered in every picker beside
     * « Troisième Année » — and one of its rosters ended up carrying a partition label. Use this for
     * any picker that chooses **a promotion to act on**; use `getLevels` where a level is *displayed*
     * as recorded history (the level catalogue, a student's dossier, a browse filter over existing
     * rosters), because a withdrawn registration still has to be able to name its level.
     */
    getPromotionLevels: builder.query<AdminLevelResponse[], AcademicProgram | undefined>({
      query: (program) => ({
        url: '/levels',
        params: { academicProgram: program, pageSize: 100, promotionsOnly: true },
      }),
      transformResponse: (res: PaginatedResponse<AdminLevelResponse>) => res.items,
      providesTags: [{ type: 'Level', id: 'LIST' }],
    }),

    // The published planning matrix. Not paginated by design — rows are the services of one level
    // (tens) and columns its periods (≤ ~10) — but the response carries the shape in `summary` so
    // the page can assert it instead of assuming it.
    getLevelRepartition: builder.query<
      LevelRepartitionResponse,
      { levelId: number; academicYearId?: number }
    >({
      query: ({ levelId, academicYearId }) => ({
        url: `/levels/${levelId}/repartition`,
        params: academicYearId ? { academicYearId } : undefined,
      }),
      // A coarse tag, not one per level: the planning mutations know only a stageId and cannot work
      // out which level's matrix they changed. Without this the page served a cached pre-arrange
      // matrix for up to 60s, and "Télécharger (.html)" exported that stale document to the faculty
      // site — the one failure this artefact must not have.
      providesTags: [{ type: 'Stage' as const, id: 'REPARTITION' }],
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

    // `admitsLevelId` narrows to the services that would actually take one promotion — those with a
    // quota for it, plus every unrestricted service, since those take all comers.
    getServices: builder.query<PaginatedResponse<ServiceSummaryResponse>, { hospitalId?: number; admitsLevelId?: number; searchTerm?: string; pageNumber?: number; pageSize?: number }>({
      query: (params) => ({ url: '/services', params }),
      providesTags: [{ type: 'Service' as const, id: 'LIST' }],
    }),

    createService: builder.mutation<number, CreateServiceRequest>({
      query: (body) => ({ url: '/services', method: 'POST', body }),
      // Service/LIST already reaches the schedule grid, which provides it. TIMELINE does not, and
      // its saturation flag now reads the quotas too — a stale one shows a plan as publishable
      // when it is not.
      invalidatesTags: [{ type: 'Service', id: 'LIST' }, { type: 'Stage', id: 'TIMELINE' }],
    }),

    updateService: builder.mutation<void, { id: number } & CreateServiceRequest>({
      query: ({ id, ...body }) => ({ url: `/services/${id}`, method: 'PUT', body }),
      // The occupancy verdict is computed *from* the quotas, so editing them changes every segment's
      // answer. Without this the page keeps showing the breach you just fixed.
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'Service', id: 'LIST' },
        { type: 'Service', id: `detail-${id}` },
        { type: 'Service', id: `occupancy-${id}` },
        { type: 'Service', id: `stages-${id}` },
        { type: 'Stage', id: 'TIMELINE' },
      ],
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

    addAllowedService: builder.mutation<void, { stageId: number; service: AllowedServiceSummary }>({
      query: ({ stageId, service }) => ({
        url: `/stages/${stageId}/allowed-services`,
        method: 'POST',
        body: { serviceId: service.id },
      }),
      // Optimistic: show the chip immediately, roll back only if the request fails.
      // The invalidation below still reconciles with server truth in the background.
      async onQueryStarted({ stageId, service }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          adminApiSlice.util.updateQueryData('getStageById', stageId, (draft) => {
            if (draft.allowedServices.some((s) => s.id === service.id)) return;
            draft.allowedServices.push(service);
            draft.allowedServices.sort(
              (a, b) => a.hospitalName.localeCompare(b.hospitalName) || a.name.localeCompare(b.name),
            );
          }),
        );
        try { await queryFulfilled; } catch { patch.undo(); }
      },
      invalidatesTags: (_r, _e, { stageId }) => [{ type: 'Stage' as const, id: stageId }],
    }),

    removeAllowedService: builder.mutation<void, { stageId: number; serviceId: number }>({
      query: ({ stageId, serviceId }) => ({
        url: `/stages/${stageId}/allowed-services/${serviceId}`,
        method: 'DELETE',
      }),
      async onQueryStarted({ stageId, serviceId }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          adminApiSlice.util.updateQueryData('getStageById', stageId, (draft) => {
            draft.allowedServices = draft.allowedServices.filter((s) => s.id !== serviceId);
          }),
        );
        try { await queryFulfilled; } catch { patch.undo(); }
      },
      invalidatesTags: (_r, _e, { stageId }) => [{ type: 'Stage' as const, id: stageId }],
    }),

    deleteStage: builder.mutation<void, number>({
      query: (id) => ({ url: `/stages/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Stage', id: 'LIST' }],
    }),

    // ─── Cohorts ─────────────────────────────────────────────────────────────
    // Scoped to an academic year and paged: a cohort exists per (stage, group) and groups are per
    // year, so "Chirurgie" has 681 of them across the imported history against 80 in the current year.
    // ─── CNPN / Curriculum ───────────────────────────────────────────────────
    // The recorded ministerial texts. Unpaginated on purpose: a programme gains one every several
    // years, so this is bounded by ministerial output rather than by the faculty's size.
    getCnpnVersions: builder.query<CnpnVersionResponse[], { program?: string } | void>({
      query: (arg) => ({ url: '/cnpn-versions', params: arg?.program ? { program: arg.program } : undefined }),
      providesTags: [{ type: 'Level' as const, id: 'CNPN_VERSIONS' }],
    }),

    createCnpnVersion: builder.mutation<number, CreateCnpnVersionRequest>({
      query: (body) => ({ url: '/cnpn-versions', method: 'POST', body }),
      invalidatesTags: [{ type: 'Level' as const, id: 'CNPN_VERSIONS' }],
    }),

    updateCnpnVersion: builder.mutation<void, { id: number } & UpdateCnpnVersionRequest>({
      query: ({ id, ...body }) => ({ url: `/cnpn-versions/${id}`, method: 'PUT', body }),
      invalidatesTags: [{ type: 'Level' as const, id: 'CNPN_VERSIONS' }],
    }),

    // Returns how many requirement sets the cascade took. Refused while any student is stamped —
    // the UI disables the control in that case, so this is the second line of defence.
    deleteCnpnVersion: builder.mutation<{ curriculaRemoved: number }, number>({
      query: (id) => ({ url: `/cnpn-versions/${id}`, method: 'DELETE' }),
      invalidatesTags: [
        { type: 'Level' as const, id: 'CNPN_VERSIONS' },
        { type: 'Level' as const, id: 'CURRICULUM_DIFF' },
      ],
    }),

    // « 1650.25 reprend 2174.18 » — every level at once. Invalidates the diff too: a text that just
    // gained six requirement sets compares differently against everything.
    cloneCnpnCurricula: builder.mutation<
      CnpnCloneResult,
      { cnpnVersionId: number; fromCnpnVersionId: number }
    >({
      query: ({ cnpnVersionId, fromCnpnVersionId }) => ({
        url: `/cnpn-versions/${cnpnVersionId}/clone-curricula`,
        method: 'POST',
        body: { fromCnpnVersionId },
      }),
      invalidatesTags: [
        { type: 'Level' as const, id: 'CNPN_VERSIONS' },
        { type: 'Level' as const, id: 'CURRICULUM_DIFF' },
      ],
    }),

    // Preview and apply take the same body on purpose: what the dry run showed is what the apply
    // writes. The preview is a POST because it carries a rule, not because it changes anything —
    // it is a mutation here only so it can be triggered on demand rather than on every keystroke.
    previewCnpnTarget: builder.mutation<
      CnpnTargetPreview,
      { cnpnVersionId: number } & CnpnTargetCriteria
    >({
      query: ({ cnpnVersionId, ...body }) => ({
        url: `/cnpn-versions/${cnpnVersionId}/target/preview`,
        method: 'POST',
        body,
      }),
    }),

    applyCnpnTarget: builder.mutation<
      CnpnTargetPreview,
      { cnpnVersionId: number } & CnpnTargetCriteria
    >({
      query: ({ cnpnVersionId, ...body }) => ({
        url: `/cnpn-versions/${cnpnVersionId}/target`,
        method: 'POST',
        body,
      }),
      // Stamping students changes the per-text counts and every student read.
      invalidatesTags: [
        { type: 'Level' as const, id: 'CNPN_VERSIONS' },
        { type: 'Student' as const, id: 'LIST' },
      ],
    }),

    getCurriculum: builder.query<CurriculumResponse, { levelId: number; cnpnVersionId: number }>({
      query: ({ levelId, cnpnVersionId }) => `/levels/${levelId}/curriculum/${cnpnVersionId}`,
      providesTags: (_r, _e, { levelId, cnpnVersionId }) => [
        { type: 'Level' as const, id: `curriculum-${levelId}-${cnpnVersionId}` },
      ],
    }),

    // What changed between two texts — the read behind manual revalidation, where a student is judged
    // against the CNPN they failed under but can only be re-planned against the one in force.
    compareCurricula: builder.query<
      CurriculumComparisonResponse,
      { levelId: number; fromCnpnVersionId: number; toCnpnVersionId: number }
    >({
      query: ({ levelId, ...params }) => ({ url: `/levels/${levelId}/curriculum/compare`, params }),
      providesTags: [{ type: 'Level' as const, id: 'CURRICULUM_DIFF' }],
    }),

    // PUT, not POST: the whole set for (level, CNPN) is submitted at once, so re-sending the same
    // set leaves the same requirements. The diff tag goes with it — every comparison now reads
    // differently.
    saveCurriculum: builder.mutation<number, SaveCurriculumRequest>({
      query: ({ levelId, cnpnVersionId, ...body }) => ({
        url: `/levels/${levelId}/curriculum/${cnpnVersionId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_r, _e, { levelId, cnpnVersionId }) => [
        { type: 'Level' as const, id: `curriculum-${levelId}-${cnpnVersionId}` },
        { type: 'Level' as const, id: 'CURRICULUM_DIFF' },
        { type: 'Level' as const, id: 'CNPN_VERSIONS' },
      ],
    }),

    copyCurriculum: builder.mutation<number, CopyCurriculumRequest>({
      query: ({ levelId, cnpnVersionId, fromCnpnVersionId }) => ({
        url: `/levels/${levelId}/curriculum/${cnpnVersionId}/copy`,
        method: 'POST',
        body: { fromCnpnVersionId },
      }),
      invalidatesTags: (_r, _e, { levelId, cnpnVersionId }) => [
        { type: 'Level' as const, id: `curriculum-${levelId}-${cnpnVersionId}` },
        { type: 'Level' as const, id: 'CURRICULUM_DIFF' },
        { type: 'Level' as const, id: 'CNPN_VERSIONS' },
      ],
    }),

    seedCurriculaFromHistory: builder.mutation<CurriculumSeedReport, { dryRun: boolean }>({
      query: (body) => ({ url: '/curricula/seed-from-history', method: 'POST', body }),
      invalidatesTags: [{ type: 'Level' as const, id: 'CURRICULUM_DIFF' }],
    }),

    getCohortsByStage: builder.query<
      PaginatedResponse<CohortResponse>,
      { stageId: number; academicYearId?: number; pageNumber?: number; pageSize?: number; searchTerm?: string }
    >({
      query: ({ stageId, ...params }) => ({ url: `/stages/${stageId}/cohorts`, params }),
      providesTags: (_r, _e, { stageId }) => [{ type: 'Stage' as const, id: `cohorts-${stageId}` }],
    }),

    /**
     * A stage's cohorts as a flat array, for screens that use them as a lookup rather than a list
     * (filters, dropdowns, assignment grids). Year-scoped and capped at one large page instead of
     * unbounded — pass academicYearId, or it falls back to every year the stage ever ran.
     */
    getCohortOptionsByStage: builder.query<CohortResponse[], { stageId: number; academicYearId?: number }>({
      query: ({ stageId, academicYearId }) => ({
        url: `/stages/${stageId}/cohorts`,
        params: { ...(academicYearId ? { academicYearId } : {}), pageNumber: 1, pageSize: 200 },
      }),
      transformResponse: (res: PaginatedResponse<CohortResponse>) => res.items,
      providesTags: (_r, _e, { stageId }) => [{ type: 'Stage' as const, id: `cohorts-${stageId}` }],
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

    assignAllStudentsByStage: builder.mutation<{ successCount: number; totalProcessed: number }, { stageId: number; partitionLabels?: string[]; academicYearId?: number }>({
      query: ({ stageId, partitionLabels, academicYearId }) => ({
        url: `/stages/${stageId}/assign-students`,
        method: 'POST',
        body: { partitionLabels: partitionLabels?.length ? partitionLabels : undefined, academicYearId },
      }),
      invalidatesTags: (_r, _e, { stageId }) => [
        { type: 'Assignment' as const, id: 'LIST' },
        { type: 'Stage' as const, id: `cohorts-${stageId}` },
      ],
    }),

    startCohortAssignments: builder.mutation<{ started: number }, { cohortId: number; periodNumbers?: number[] }>({
      query: ({ cohortId, periodNumbers }) => ({
        url: `/cohorts/${cohortId}/start-assignments`,
        method: 'POST',
        body: periodNumbers?.length ? { periodNumbers } : {},
      }),
      invalidatesTags: [{ type: 'Assignment' as const, id: 'LIST' }],
    }),

    completeCohortPeriods: builder.mutation<{ completed: number }, { cohortId: number; periodNumbers?: number[] }>({
      query: ({ cohortId, periodNumbers }) => ({
        url: `/cohorts/${cohortId}/complete-periods`,
        method: 'POST',
        body: periodNumbers?.length ? { periodNumbers } : {},
      }),
      invalidatesTags: [{ type: 'Assignment' as const, id: 'LIST' }],
    }),

    validateCohortAssignments: builder.mutation<{ validated: number }, number>({
      query: (id) => ({ url: `/cohorts/${id}/validate-assignments`, method: 'POST' }),
      invalidatesTags: [{ type: 'Assignment' as const, id: 'LIST' }],
    }),

    // Stage-level bulk start/close — one round-trip for the whole selection (replaces the
    // per-cohort loop). cohortIds scopes the selection; periodNumbers narrows to a window.
    startStagePeriods: builder.mutation<{ started: number }, { stageId: number; academicYearId?: number; cohortIds?: number[]; partitionLabels?: string[]; periodNumbers?: number[] }>({
      query: ({ stageId, ...body }) => ({ url: `/stages/${stageId}/schedule/start`, method: 'POST', body }),
      invalidatesTags: [{ type: 'Assignment' as const, id: 'LIST' }],
    }),

    completeStagePeriods: builder.mutation<{ completed: number }, { stageId: number; academicYearId?: number; cohortIds?: number[]; partitionLabels?: string[]; periodNumbers?: number[] }>({
      query: ({ stageId, ...body }) => ({ url: `/stages/${stageId}/schedule/complete`, method: 'POST', body }),
      invalidatesTags: [{ type: 'Assignment' as const, id: 'LIST' }],
    }),

    // Suspend / resume an in-flight rotation (e.g. an exam week). Resume shifts the rotation forward
    // by the paused days, so the timeline must refetch too.
    pauseStagePeriods: builder.mutation<{ paused: number }, { stageId: number; academicYearId?: number; kind?: PauseKind; reason?: string; cohortIds?: number[]; partitionLabels?: string[]; periodNumbers?: number[] }>({
      query: ({ stageId, ...body }) => ({ url: `/stages/${stageId}/schedule/pause`, method: 'POST', body }),
      invalidatesTags: [{ type: 'Assignment' as const, id: 'LIST' }, { type: 'Stage' as const, id: 'TIMELINE' }],
    }),

    resumeStagePeriods: builder.mutation<{ resumed: number }, { stageId: number; academicYearId?: number; cohortIds?: number[]; partitionLabels?: string[]; periodNumbers?: number[] }>({
      query: ({ stageId, ...body }) => ({ url: `/stages/${stageId}/schedule/resume`, method: 'POST', body }),
      invalidatesTags: [{ type: 'Assignment' as const, id: 'LIST' }, { type: 'Stage' as const, id: 'TIMELINE' }],
    }),

    getStageSchedule: builder.query<StageScheduleResponse, { stageId: number; academicYearId?: number }>({
      query: ({ stageId, academicYearId }) => ({
        url: `/stages/${stageId}/schedule`,
        params: academicYearId ? { academicYearId } : undefined,
      }),
      providesTags: (_r, _e, { stageId }) => [
        { type: 'Stage' as const, id: `schedule-${stageId}` },
        { type: 'Service' as const, id: 'LIST' },
      ],
    }),

    // stageId narrows the tree when drilling into one stage's détail/répartitions — a year holds
    // 1,684 cohorts, and building all of them to draw a single stage is what made this crawl.
    getYearTimeline: builder.query<YearTimelineResponse, { academicYearId: number; levelId?: number; stageId?: number }>({
      query: ({ academicYearId, levelId, stageId }) => ({
        url: `/academic-years/${academicYearId}/timeline`,
        params: { ...(levelId ? { levelId } : {}), ...(stageId ? { stageId } : {}) },
      }),
      providesTags: [{ type: 'Stage' as const, id: 'TIMELINE' }],
    }),

    createStageSlot: builder.mutation<number, { stageId: number } & CreateStageSlotRequest>({
      query: ({ stageId, ...body }) => ({ url: `/stages/${stageId}/slots`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { stageId }) => [
        { type: 'Stage' as const, id: `schedule-${stageId}` },
        { type: 'Stage' as const, id: 'REPARTITION' },
      ],
    }),

    updateStageSlot: builder.mutation<void, { stageId: number; slotId: number } & UpdateStageSlotRequest>({
      query: ({ stageId, slotId, ...body }) => ({ url: `/stages/${stageId}/slots/${slotId}`, method: 'PUT', body }),
      invalidatesTags: (_r, _e, { stageId }) => [
        { type: 'Stage' as const, id: `schedule-${stageId}` },
        { type: 'Stage' as const, id: 'REPARTITION' },
      ],
    }),

    deleteStageSlot: builder.mutation<void, { stageId: number; slotId: number }>({
      query: ({ stageId, slotId }) => ({ url: `/stages/${stageId}/slots/${slotId}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { stageId }) => [
        { type: 'Stage' as const, id: `schedule-${stageId}` },
        { type: 'Stage' as const, id: 'REPARTITION' },
      ],
    }),

    setCohortSlotAssignment: builder.mutation<number, { stageId: number; slotId: number; cohortId: number } & SetCohortSlotAssignmentRequest>({
      query: ({ stageId, slotId, cohortId, ...body }) => ({ url: `/stages/${stageId}/slots/${slotId}/cohorts/${cohortId}`, method: 'PUT', body }),
      invalidatesTags: (_r, _e, { stageId }) => [
        { type: 'Stage' as const, id: `schedule-${stageId}` },
        { type: 'Stage' as const, id: 'REPARTITION' },
      ],
    }),

    clearCohortSlotAssignment: builder.mutation<void, { stageId: number; slotId: number; cohortId: number }>({
      query: ({ stageId, slotId, cohortId }) => ({ url: `/stages/${stageId}/slots/${slotId}/cohorts/${cohortId}`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { stageId }) => [
        { type: 'Stage' as const, id: `schedule-${stageId}` },
        { type: 'Stage' as const, id: 'REPARTITION' },
      ],
    }),

    clearSlotAssignments: builder.mutation<{ cleared: number; skipped: number }, { stageId: number; slotId: number }>({
      query: ({ stageId, slotId }) => ({ url: `/stages/${stageId}/slots/${slotId}/cohorts`, method: 'DELETE' }),
      invalidatesTags: (_r, _e, { stageId }) => [
        { type: 'Stage' as const, id: `schedule-${stageId}` },
        { type: 'Stage' as const, id: 'REPARTITION' },
      ],
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
        { type: 'Stage' as const, id: 'REPARTITION' },
        { type: 'Stage' as const, id: 'TIMELINE' },
      ],
    }),

    // `force` is required once the rotation has begun: unpublishing deletes the ServicePeriods and
    // evaluations/attendance cascade from them. Without it the server refuses with Schedule.Underway
    // and names what would be lost, which is what the confirmation dialog shows.
    unpublishSchedule: builder.mutation<
      UnpublishScheduleResult,
      { cohortId: number; stageId: number; force?: boolean }
    >({
      query: ({ cohortId, force }) => ({
        url: `/cohorts/${cohortId}/publish-schedule`,
        method: 'DELETE',
        params: force ? { force: true } : undefined,
      }),
      invalidatesTags: (_r, _e, { cohortId, stageId }) => [
        { type: 'Assignment' as const, id: 'LIST' },
        { type: 'Stage' as const, id: `cohort-detail-${cohortId}` },
        { type: 'Stage' as const, id: `cohorts-${stageId}` },
        { type: 'Stage' as const, id: `schedule-${stageId}` },
        { type: 'Stage' as const, id: 'REPARTITION' },
      ],
    }),

    autoArrangeStageSchedule: builder.mutation<
      {
        assigned: number;
        saturatedServices: number;
        totalStudents: number;
        totalCapacity: number;
        /** Cells skipped because the group was already placed in an overlapping period of another stage. */
        groupConflicts: number;
      },
      { stageId: number; academicYearId?: number; partitionCount?: number; partitionLabels?: string[]; periodNumbers?: number[] }
    >({
      query: ({ stageId, ...body }) => ({
        url: `/stages/${stageId}/schedule/auto-arrange`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_r, _e, { stageId }) => [
        { type: 'Stage' as const, id: `schedule-${stageId}` },
        { type: 'Stage' as const, id: 'REPARTITION' },
        { type: 'Level' as const, id: 'GROUPS' },
      ],
    }),

    publishStageSchedule: builder.mutation<
      { publishedCohorts: number; periodsCreated: number; skippedCohorts: number },
      { stageId: number; academicYearId?: number; partitionLabels?: string[]; periodNumbers?: number[]; allowOverCapacity?: boolean }
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

    /**
     * Lays the block's axis out from one start date. A query, not a mutation — it writes nothing, and
     * caching it means changing the unit back and forth does not re-hit the server. Server-side because
     * the working-day count needs the holiday table.
     */
    generateAxisWindows: builder.query<GeneratedAxisResponse, GenerateAxisWindowsRequest>({
      query: (params) => ({ url: '/stages/axis-windows', params }),
      providesTags: [{ type: 'Calendar' as const, id: 'AXIS' }],
    }),

    previewRotationCycle: builder.mutation<
      RotationCyclePreview,
      { levelId: number } & RotationCycleRequest
    >({
      query: ({ levelId, ...body }) => ({
        url: `/levels/${levelId}/rotation-cycle/preview`,
        method: 'POST',
        body,
      }),
      // A dry run writes nothing, so it invalidates nothing.
    }),

    applyRotationCycle: builder.mutation<
      RotationCycleResult,
      { levelId: number } & RotationCycleRequest
    >({
      query: ({ levelId, ...body }) => ({
        url: `/levels/${levelId}/rotation-cycle`,
        method: 'POST',
        body,
      }),
      // Rewrites every slot of the block, so the grids, the timeline and the répartition all move.
      invalidatesTags: (_r, _e, { stages }) => [
        { type: 'Stage' as const, id: 'TIMELINE' },
        { type: 'Level' as const, id: 'REPARTITION' },
        ...stages.flatMap((s) => [
          { type: 'Stage' as const, id: `schedule-${s.stageId}` },
          { type: 'Stage' as const, id: `cohorts-${s.stageId}` },
        ]),
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
    getAcademicGroups: builder.query<
      PaginatedResponse<AcademicGroupResponse>,
      { academicYearId?: number; levelId?: number; studentId?: string; pageNumber?: number; pageSize?: number; searchTerm?: string }
    >({
      query: (params) => ({ url: '/groups', params }),
      providesTags: [{ type: 'Level' as const, id: 'GROUPS' }],
    }),

    /**
     * Groups as a flat array, for selectors that need the whole (year-scoped) list. Still goes
     * through the paged endpoint — it just asks for one large page rather than an unbounded one.
     */
    getAcademicGroupOptions: builder.query<AcademicGroupResponse[], { academicYearId?: number; levelId?: number; studentId?: string }>({
      query: (params) => ({ url: '/groups', params: { ...params, pageNumber: 1, pageSize: 200 } }),
      transformResponse: (res: PaginatedResponse<AcademicGroupResponse>) => res.items,
      providesTags: [{ type: 'Level' as const, id: 'GROUPS' }],
    }),

    createGroup: builder.mutation<number, { label: string; academicYearId: number; levelId?: number | null; geographicZone?: string; rotationGroup?: string | null }>({
      query: (body) => ({ url: '/groups', method: 'POST', body }),
      invalidatesTags: [{ type: 'Level' as const, id: 'GROUPS' }],
    }),

    getGroupById: builder.query<
      GroupDetailResponse,
      { id: number; pageNumber?: number; pageSize?: number; searchTerm?: string }
    >({
      query: ({ id, ...params }) => ({ url: `/groups/${id}`, params }),
      providesTags: (_r, _e, { id }) => [{ type: 'Level' as const, id: `group-${id}` }],
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
        { type: 'Assignment' as const, id: 'LIST' },
      ],
    }),

    delocalizeStudent: builder.mutation<void, DelocalizeStudentRequest>({
      query: (body) => ({ url: '/stages/delocalize', method: 'POST', body }),
      invalidatesTags: (_r, _e, { registrationId }) => [
        { type: 'Registration' as const, id: registrationId },
        { type: 'Level' as const, id: 'GROUPS' },
        { type: 'Assignment' as const, id: 'LIST' },
      ],
    }),

    autoArrangeGroups: builder.mutation<BulkResponse<string, number>, AutoArrangeRequest>({
      query: (body) => ({ url: '/groups/auto-arrange', method: 'POST', body }),
    }),

    /**
     * `strategy` and `reassign` both default to the historical behaviour, so a caller sending only
     * `partitionCount` is unaffected. ⚠ Without `reassign`, a promotion that already carries labels keeps
     * its *existing* partition count whatever is asked for — to change the count, clear first.
     */
    assignRotationGroups: builder.mutation<
      PartitionAssignmentResult,
      {
        academicYearId: number;
        partitionCount: number;
        levelId: number;
        strategy?: PartitionStrategy;
        reassign?: boolean;
      }
    >({
      // ⚠ `levelId` is required by the API: a partition divides one promotion. Sent year-wide it cut
      // every promotion of the year at once — each with its own partition count — and reached
      // « Non réparti », the roster that belongs to no promotion.
      query: ({ academicYearId, partitionCount, levelId, strategy, reassign }) => ({
        url: '/groups/assign-partitions',
        method: 'POST',
        params: { academicYearId, levelId },
        body: { partitionCount, strategy, reassign },
      }),
      invalidatesTags: [
        { type: 'Level' as const, id: 'GROUPS' },
        { type: 'Level' as const, id: 'PARTITIONING' },
        { type: 'Level' as const, id: 'REPARTITION' },
      ],
    }),

    /**
     * Un-partitions a promotion. Breaks no link — nothing points at a label — but the planned cells no
     * longer describe any partition, so an arrange is owed. Refused outright once a cell is published.
     */
    clearRotationGroups: builder.mutation<
      ClearRotationGroupsResult,
      { academicYearId: number; levelId: number }
    >({
      query: ({ academicYearId, levelId }) => ({
        url: '/groups/partitions',
        method: 'DELETE',
        params: { academicYearId, levelId },
      }),
      invalidatesTags: [
        { type: 'Level' as const, id: 'GROUPS' },
        { type: 'Level' as const, id: 'PARTITIONING' },
        { type: 'Level' as const, id: 'REPARTITION' },
      ],
    }),

    /**
     * How a promotion is divided, counted server-side.
     *
     * ⚠ The Plan macro tab used to derive the partitions, their sizes and « N groupes sans partition »
     * from `/groups` at `pageSize: 200`. A promotion adds ~100 rosters a year, so past 200 it would
     * have shown a partition smaller than it is and under-reported the very number that says a
     * gap-fill is owed. Raising the page size moves the cliff; the aggregate removes it.
     */
    getPromotionPartitioning: builder.query<
      PromotionPartitioning,
      { levelId: number; academicYearId?: number }
    >({
      query: (params) => ({ url: '/groups/partitioning', params }),
      providesTags: [{ type: 'Level' as const, id: 'PARTITIONING' }],
    }),

    getHolidayCoverage: builder.query<HolidayCoverage, { academicYearId?: number }>({
      query: ({ academicYearId }) => ({
        url: '/calendar/holidays',
        params: academicYearId != null ? { academicYearId } : undefined,
      }),
      providesTags: [{ type: 'Calendar' as const, id: 'HOLIDAYS' }],
    }),

    createHoliday: builder.mutation<number, HolidayInput>({
      query: (body) => ({ url: '/calendar/holidays', method: 'POST', body }),
      invalidatesTags: CALENDAR_CHANGED,
    }),

    updateHoliday: builder.mutation<UpdateHolidayResult, { id: number } & HolidayInput>({
      query: ({ id, ...body }) => ({ url: `/calendar/holidays/${id}`, method: 'PUT', body }),
      invalidatesTags: CALENDAR_CHANGED,
    }),

    deleteHoliday: builder.mutation<DeleteHolidayResult, number>({
      query: (id) => ({ url: `/calendar/holidays/${id}`, method: 'DELETE' }),
      invalidatesTags: CALENDAR_CHANGED,
    }),

    seedNationalHolidays: builder.mutation<SeedNationalHolidaysResult, { academicYearId?: number }>({
      query: ({ academicYearId }) => ({
        url: '/calendar/holidays/seed-national',
        method: 'POST',
        params: academicYearId != null ? { academicYearId } : undefined,
      }),
      invalidatesTags: CALENDAR_CHANGED,
    }),

    bulkCreateCohortsFromPartitions: builder.mutation<BulkCohortsFromPartitionsResult, BulkCreateCohortsFromPartitionsRequest>({
      query: (body) => ({ url: '/cohorts/from-partitions', method: 'POST', body }),
      invalidatesTags: (_r, _e, { mappings }) =>
        Array.from(new Set(mappings.map((m) => m.stageId))).map((id) => ({
          type: 'Stage' as const,
          id: `cohorts-${id}`,
        })),
    }),

    deleteAllStageCohorts: builder.mutation<{ deleted: number }, { stageId: number; academicYearId?: number }>({
      query: ({ stageId, academicYearId }) => ({
        url: `/stages/${stageId}/cohorts/all`,
        method: 'DELETE',
        params: academicYearId ? { academicYearId } : undefined,
      }),
      invalidatesTags: (_r, _e, { stageId }) => [{ type: 'Stage' as const, id: `cohorts-${stageId}` }],
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
    getAssignmentStatusSummary: builder.query<{ status: string; count: number }[], { cohortIds?: number[]; stageId?: number; periodNumbers?: number[] }>({
      query: ({ cohortIds, stageId, periodNumbers }) => ({ url: '/internship-assignments/status-summary', params: { cohortIds, stageId, periodNumbers } }),
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

    getStudentStageRecord: builder.query<StudentStageRecordResponse, string>({
      query: (id) => ({ url: `/internship-assignments/${id}/record` }),
      providesTags: (_r, _e, id) => [{ type: 'Assignment' as const, id: `record-${id}` }],
    }),

    getFicheDeValidation: builder.query<FicheDeValidationResponse, string>({
      query: (id) => ({ url: `/internship-assignments/${id}/fiche` }),
      providesTags: (_r, _e, id) => [{ type: 'Assignment' as const, id: `fiche-${id}` }],
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

    // ─── Service occupancy ───────────────────────────────────────────────────
    // ⚠ academicYearId is in the arg, not just in a client filter: the arg is the RTK Query cache
    // key, so this is what makes changing the navbar year refetch instead of showing last year's
    // load under this year's heading.
    getServiceOccupancy: builder.query<
      ServiceOccupancyResponse, { serviceId: number; academicYearId?: number }
    >({
      query: ({ serviceId, academicYearId }) => ({
        url: `/services/${serviceId}/occupancy`,
        params: academicYearId ? { academicYearId } : undefined,
      }),
      providesTags: (_r, _e, { serviceId }) => [{ type: 'Service' as const, id: `occupancy-${serviceId}` }],
    }),

    getServiceStages: builder.query<ServiceStageResponse[], number>({
      query: (serviceId) => `/services/${serviceId}/stages`,
      providesTags: (_r, _e, serviceId) => [{ type: 'Service' as const, id: `stages-${serviceId}` }],
    }),

    // The window comes from the caller: a timeline segment is cut at window boundaries and generally
    // coincides with no single StageSlot, so there is no période id to pass instead.
    getServiceOccupants: builder.query<
      PaginatedResponse<ServiceOccupantResponse>,
      { serviceId: number; startDate: string; endDate: string; levelId?: number; stageId?: number;
        pageNumber?: number; pageSize?: number; searchTerm?: string }
    >({
      query: ({ serviceId, ...params }) => ({ url: `/services/${serviceId}/occupants`, params }),
      providesTags: (_r, _e, { serviceId }) => [{ type: 'Service' as const, id: `occupants-${serviceId}` }],
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
  useGetPromotionLevelsQuery,
  useGetLevelRepartitionQuery,
  useCreateLevelMutation,
  useUpdateLevelMutation,
  useGetCnpnVersionsQuery,
  useCreateCnpnVersionMutation,
  useUpdateCnpnVersionMutation,
  useCloneCnpnCurriculaMutation,
  useDeleteCnpnVersionMutation,
  usePreviewCnpnTargetMutation,
  useApplyCnpnTargetMutation,
  useGetCurriculumQuery,
  useCompareCurriculaQuery,
  useSaveCurriculumMutation,
  useCopyCurriculumMutation,
  useSeedCurriculaFromHistoryMutation,
  useGetAcademicGroupsQuery,
  useGetAcademicGroupOptionsQuery,
  useGetCohortOptionsByStageQuery,
  useGetGroupByIdQuery,
  useCreateGroupMutation,
  useUpdateGroupMutation,
  useDeleteGroupMutation,
  useEmptyGroupMutation,
  useTransferStudentMutation,
  useDelocalizeStudentMutation,
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
  useStartStagePeriodsMutation,
  useCompleteStagePeriodsMutation,
  usePauseStagePeriodsMutation,
  useResumeStagePeriodsMutation,
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
  usePreviewRotationCycleMutation,
  useApplyRotationCycleMutation,
  useGenerateAxisWindowsQuery,
  useLazyGenerateAxisWindowsQuery,
  useClearRotationGroupsMutation,
  useGetPromotionPartitioningQuery,
  useGetHolidayCoverageQuery,
  useCreateHolidayMutation,
  useUpdateHolidayMutation,
  useDeleteHolidayMutation,
  useSeedNationalHolidaysMutation,
  useCreateRegistrationMutation,
  useUpdateRegistrationMutation,
  useGetServicePeriodsQuery,
  useGetAttendanceByPeriodQuery,
  useRecordAttendanceMutation,
  useGetAssignmentStatusSummaryQuery,
  useGetInternshipAssignmentsQuery,
  useGetStudentStageRecordQuery,
  useLazyGetFicheDeValidationQuery,
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
  useGetServiceOccupancyQuery,
  useGetServiceStagesQuery,
  useGetServiceOccupantsQuery,
  useAssignStaffMutation,
  useRemoveStaffMutation,
  useAssignChefMutation,
  useRemoveChefMutation,
} = adminApiSlice;
