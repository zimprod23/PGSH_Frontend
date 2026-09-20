import { apiSlice } from '../../../app/apiSlice';
import { MAX_PAGE_SIZE } from '../../../common/constants/pagination';
import type { PaginatedResponse, BulkResponse, RegistrationStatus, AcademicProgram } from '../../../common/types';
import type {
  AssignStudentToGroupRequest,
  DeliberationReport,
  DeliberationScopeRequest,
  DeliberationTemplateRequest,
  DeliberationUploadRequest,
  GroupJoinReport,
  RecordOutcomeRequest,
  ReinscriptionReport,
  ReinscriptionRequest,
  ReinscriptionSheetReport,
  ReinscriptionSheetUploadRequest,
  ReopenYearReport,
  ReopenYearRequest,
} from '../types/yearClosure.types';
import { fileNameFromDisposition, type DownloadedFile } from '../../../common/utils/downloadBlob';
import type {
  AffectationImportReversalReport,
  AffectationImportSummary,
  AffectationSheetApplyRequest,
  AffectationSheetReport,
  AffectationSheetTemplateRequest,
  AffectationSheetUploadRequest,
} from '../types/affectationSheet.types';
import type {
  RegistrationHold,
  RegistrationHoldsRequest,
  ReleaseHoldRequest,
  ReleaseHoldReport,
} from '../types/registrationHold.types';
import type {
  StudentsExportRequest,
  StageAssignmentsExportRequest,
} from '../types/export.types';
import type {
  InscribeStudentRequest,
  InscriptionReport,
  InscriptionRowReport,
  InscriptionScopeRequest,
  InscriptionUploadRequest,
} from '../types/inscription.types';
import type { StudentSummaryResponse, GetStudentsQuery, UpdateStudentRequest } from '../../student/types/student.types';
import type { OccupancyReportRequest, OccupancyReportResponse } from '../types/occupancyReport.types';
import type { PromotionFitRequest, PromotionFitResponse } from '../types/promotionFit.types';
import type { AuditLogPage, AuditLogRequest } from '../types/audit.types';
import type {
  HospitalStageCoverageResponse,
  RosterPlacementsRequest,
  RosterPlacementsResponse,
} from '../types/placement.types';
import type {
  BackupPoint,
  CreateBackupPointRequest,
  RestorePlan,
  SafePointStatus,
} from '../types/backup.types';
import type { OutstandingStageResponse, StudentLevelDossierResponse } from '../types/dossier.types';
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
  ChangeStudentGroupRequest,
  SwapStudentGroupsRequest,
  GroupChangeReport,
  GroupSwapReport,
  RevalidationContextResponse,
  RevalidationContextParams,
  RevalidateStageRequest,
  ApplyBulkDelocalizationRequest,
  BulkDelocalizationReport,
  BulkRosterAssignmentReport,
  PreviewBulkRosterAssignmentRequest,
  ApplyBulkRosterAssignmentRequest,
  ServicePlacementMode,
  CancelDelocalizationRequest,
  DelocalizeStudentRequest,
  PreviewBulkDelocalizationRequest,
  AdminLevelResponse,
  CreateAcademicYearRequest,
  UpdateAcademicYearRequest,
  UpdatedAcademicYearReport,
  CurrentAcademicYearReport,
  DeletedAcademicYearReport,
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
  UnpublishStageArgs,
  UnpublishStageResult,
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
  CnpnEffectivityResponse,
  CreateCnpnEffectivityRequest,
  CnpnEffectivityApplyPreview,
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
  DeleteRotationCycleResult,
  RotationCycleConfiguration,
  YearTimelineResponse,
  LevelRepartitionResponse,
  GeneratedAxisResponse,
  GenerateAxisWindowsRequest,
  PartitionStrategy,
  PartitionAssignmentResult,
  ClearRotationGroupsResult,
  PromotionPartitioning,
  HolidayCoverage,
  HolidayInput,
  StagePauseCrossings,
  PromotionPause,
  PromotionPauseInput,
  PromotionPauseImpact,
  PromotionPauseDeclaredResult,
  PromotionPauseCorrectedResult,
  PromotionPauseRevokedResult,
  AxisRelayPreview,
  AxisRelayApplyRequest,
  AxisRelayResult,
  SeedNationalHolidaysResult,
  DeleteHolidayResult,
  UpdateHolidayResult,
} from '../types/admin.types';

/**
 * Changing the calendar changes every working-day count already on screen — the coverage list, and any axis
 * laid out from it. Module-level so the tag list identity is stable.
 */
const BACKUPS_CHANGED = [
  { type: 'Backup' as const, id: 'LIST' },
  { type: 'Backup' as const, id: 'STATUS' },
];

const CALENDAR_CHANGED = [
  { type: 'Calendar' as const, id: 'HOLIDAYS' },
  { type: 'Calendar' as const, id: 'AXIS' },
  // ⚠ The axis is laid on the promotion's calendar, so a window declared here changes the columns the
  // rotation-cycle screen last generated. Invalidating only 'HOLIDAYS' would leave a cached axis on
  // screen that no longer steps over the exam week it is now supposed to.
  { type: 'Calendar' as const, id: 'PAUSES' },
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

    updateAcademicYear: builder.mutation<UpdatedAcademicYearReport, UpdateAcademicYearRequest>({
      query: ({ id, ...body }) => ({ url: `/academic-years/${id}`, method: 'PUT', body }),
      invalidatesTags: [{ type: 'Level', id: 'ACADEMIC_YEARS' }],
    }),

    // Moving the current year moves what every unscoped screen shows, so this invalidates broadly
    // rather than just the year list — a stale Stage or Group list after it is a screen quietly
    // showing another promotion.
    setCurrentAcademicYear: builder.mutation<CurrentAcademicYearReport, number>({
      query: (id) => ({ url: `/academic-years/${id}/current`, method: 'POST' }),
      invalidatesTags: [{ type: 'Level', id: 'ACADEMIC_YEARS' }, 'Level', 'Stage', 'Registration', 'Assignment'],
    }),

    deleteAcademicYear: builder.mutation<DeletedAcademicYearReport, number>({
      query: (id) => ({ url: `/academic-years/${id}`, method: 'DELETE' }),
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
      // answer. Without this the page keeps showing the breach you just fixed. The same holds for
      // `allowsOverCapacity`: it decides `forceable` on every saturation of the planning grid, which
      // is reached through Service/LIST — the tag `getStageSchedule` also provides.
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
      invalidatesTags: [
        { type: 'Stage' as const, id: 'LIST' },
        // ⚠ The other direction of the same coupling. `CurriculumStage` quotes the stage's name and
        // is compared against its coefficient and duration, so a catalogue edit changes what every
        // recorded set reads — and creating a stage is what makes it *requirable* at all, which is
        // the list the CNPN editor's picker is built from.
        { type: 'Level' as const, id: 'CURRICULUM' },
        { type: 'Level' as const, id: 'CURRICULUM_DIFF' },
      ],
    }),

    updateStage: builder.mutation<void, { id: number } & UpdateStageRequest>({
      query: ({ id, ...body }) => ({ url: `/stages/${id}`, method: 'PUT', body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'Stage' as const, id },
        { type: 'Stage' as const, id: 'LIST' },
        // ⚠ The other direction of the same coupling. `CurriculumStage` quotes the stage's name and
        // is compared against its coefficient and duration, so a catalogue edit changes what every
        // recorded set reads — and creating a stage is what makes it *requirable* at all, which is
        // the list the CNPN editor's picker is built from.
        { type: 'Level' as const, id: 'CURRICULUM' },
        { type: 'Level' as const, id: 'CURRICULUM_DIFF' },
      ],
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
            // Appended, never sorted into place: the server ranks a newly authorised service last,
            // and the list is shown in rotation order. Re-sorting by name here would show a position
            // the arranger does not walk — the exact drift this ordering was built to remove.
            draft.allowedServices.push({
              ...service,
              rank: draft.allowedServices.length + 1,
            });
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

    /**
     * Authors the order the stage's services are walked in when a rotation is arranged.
     *
     * ⚠ A PUT of the WHOLE list, never a move: the server refuses a partial one rather than
     * completing it, because a short list is far likelier to be a stale page than an intention to
     * leave a service last — and this order decides which run of group numbers each service gets.
     */
    /**
     * Holds an authorised service for named rosters, or gives it back to the rotation.
     *
     * ⚠ It rewrites nothing already placed — the next arrange is the act that reads it, exactly like
     * the order. And it is not a pin: a service reserved and never pinned simply stands empty, which
     * is visible on the grid and is a state somebody can correct.
     */
    setAllowedServicePlacementMode: builder.mutation<
      void, { stageId: number; serviceId: number; placementMode: ServicePlacementMode }
    >({
      query: ({ stageId, serviceId, placementMode }) => ({
        url: `/stages/${stageId}/allowed-services/${serviceId}/placement-mode`,
        method: 'PUT',
        body: { placementMode },
      }),
      invalidatesTags: (_r, _e, { stageId }) => [
        { type: 'Stage' as const, id: stageId },
        { type: 'Stage' as const, id: `schedule-${stageId}` },
      ],
    }),

    setAllowedServiceOrder: builder.mutation<void, { stageId: number; serviceIds: number[] }>({
      query: ({ stageId, serviceIds }) => ({
        url: `/stages/${stageId}/allowed-services/order`,
        method: 'PUT',
        body: { serviceIds },
      }),
      async onQueryStarted({ stageId, serviceIds }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          adminApiSlice.util.updateQueryData('getStageById', stageId, (draft) => {
            const byId = new Map(draft.allowedServices.map((s) => [s.id, s]));
            const reordered = serviceIds
              .map((id, index) => {
                const service = byId.get(id);
                return service ? { ...service, rank: index + 1 } : undefined;
              })
              .filter((s): s is NonNullable<typeof s> => s !== undefined);

            // Only when the optimistic list is complete. A partial one is exactly what the server
            // refuses, so painting it would show an order that is about to be rolled back.
            if (reordered.length === draft.allowedServices.length) draft.allowedServices = reordered;
          }),
        );
        try { await queryFulfilled; } catch { patch.undo(); }
      },
      invalidatesTags: (_r, _e, { stageId }) => [{ type: 'Stage' as const, id: stageId }],
    }),

    deleteStage: builder.mutation<void, number>({
      query: (id) => ({ url: `/stages/${id}`, method: 'DELETE' }),
      invalidatesTags: [
        { type: 'Stage' as const, id: 'LIST' },
        // ⚠ The other direction of the same coupling. `CurriculumStage` quotes the stage's name and
        // is compared against its coefficient and duration, so a catalogue edit changes what every
        // recorded set reads — and creating a stage is what makes it *requirable* at all, which is
        // the list the CNPN editor's picker is built from.
        { type: 'Level' as const, id: 'CURRICULUM' },
        { type: 'Level' as const, id: 'CURRICULUM_DIFF' },
      ],
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

    // ─── CNPN effectivity ────────────────────────────────────────────────────
    // Unpaginated and bounded by construction: one row per (text, level), so a seven-year programme
    // with five recorded texts tops out at thirty-five.
    getCnpnEffectivities: builder.query<
      CnpnEffectivityResponse[],
      { cnpnVersionId?: number; program?: string } | void
    >({
      query: (arg) => ({
        url: '/cnpn-effectivity',
        params: {
          ...(arg?.cnpnVersionId ? { cnpnVersionId: arg.cnpnVersionId } : {}),
          ...(arg?.program ? { program: arg.program } : {}),
        },
      }),
      providesTags: [{ type: 'Level' as const, id: 'CNPN_EFFECTIVITY' }],
    }),

    createCnpnEffectivity: builder.mutation<
      number,
      { cnpnVersionId: number } & CreateCnpnEffectivityRequest
    >({
      query: ({ cnpnVersionId, ...body }) => ({
        url: `/cnpn-versions/${cnpnVersionId}/effectivity`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Level' as const, id: 'CNPN_EFFECTIVITY' }],
    }),

    // Prospective only: the registrations the rule already stamped keep their text, and the response
    // says how many there were so the confirmation can name the number.
    deleteCnpnEffectivity: builder.mutation<{ registrationsGoverned: number }, number>({
      query: (id) => ({ url: `/cnpn-effectivity/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Level' as const, id: 'CNPN_EFFECTIVITY' }],
    }),

    // A rule authored *before* the réinscription needs neither of these — it is read as each
    // registration is created. These are for the other order.
    previewCnpnEffectivity: builder.query<CnpnEffectivityApplyPreview, number>({
      query: (id) => `/cnpn-effectivity/${id}/apply/preview`,
    }),

    applyCnpnEffectivity: builder.mutation<
      CnpnEffectivityApplyPreview,
      { id: number; confirmedMoveCount: number }
    >({
      query: ({ id, confirmedMoveCount }) => ({
        url: `/cnpn-effectivity/${id}/apply`,
        method: 'POST',
        body: { confirmedMoveCount },
      }),
      // Re-stamping moves students between texts, so the per-text counts and every student read change.
      invalidatesTags: [
        { type: 'Level' as const, id: 'CNPN_EFFECTIVITY' },
        { type: 'Level' as const, id: 'CNPN_VERSIONS' },
        { type: 'Student' as const, id: 'LIST' },
      ],
    }),

    getCurriculum: builder.query<CurriculumResponse, { levelId: number; cnpnVersionId: number }>({
      query: ({ levelId, cnpnVersionId }) => `/levels/${levelId}/curriculum/${cnpnVersionId}`,
      providesTags: (_r, _e, { levelId, cnpnVersionId }) => [
        { type: 'Level' as const, id: `curriculum-${levelId}-${cnpnVersionId}` },
        // Coarse companion: a stage renamed or reweighted in the catalogue changes every recorded
        // set that mentions it, and no caller knows which (level, texte) pairs those are.
        { type: 'Level' as const, id: 'CURRICULUM' },
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
        // ⚠ Each stage row carries `textFigures` — every text's own coefficient and duration — and
        // that is what decides whether the row shows a « un texte dit autre chose » marker. Without
        // this the marker survived the very edit that resolved it: align the text with the
        // catalogue, go back to Stages, and the warning was still there off a stale page.
        { type: 'Stage' as const, id: 'LIST' },
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
        // Same reason as `saveCurriculum`: a cloned set gives the catalogue rows new figures to disagree with.
        { type: 'Stage' as const, id: 'LIST' },
      ],
    }),

    seedCurriculaFromHistory: builder.mutation<CurriculumSeedReport, { dryRun: boolean }>({
      query: (body) => ({ url: '/curricula/seed-from-history', method: 'POST', body }),
      invalidatesTags: [
        { type: 'Level' as const, id: 'CURRICULUM_DIFF' },
        { type: 'Level' as const, id: 'CURRICULUM' },
        { type: 'Stage' as const, id: 'LIST' },
      ],
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
        params: { ...(academicYearId ? { academicYearId } : {}), pageNumber: 1, pageSize: MAX_PAGE_SIZE },
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

    // Returns what it took away rather than 204: a destructive act nobody is shown a number for is
    // one nobody agreed to. Refused outright once the rotation has begun.
    deleteCohort: builder.mutation<
      { affectationsRemoved: number; periodsRemoved: number },
      { cohortId: number; stageId: number }
    >({
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

    // ⚠ A POST that writes nothing, like calendar/promotion-pauses/preview: the selection is the same
    // body « Démarrer » posts, and arrays of cohortes on a query string is where binding stops being a
    // sentence. Invalidated by Assignment/LIST so starting a batch refreshes what is left to start.
    previewStageStart: builder.query<StagePauseCrossings, { stageId: number; academicYearId?: number; cohortIds?: number[]; partitionLabels?: string[]; periodNumbers?: number[] }>({
      query: ({ stageId, ...body }) => ({ url: `/stages/${stageId}/schedule/start/preview`, method: 'POST', body }),
      providesTags: [{ type: 'Assignment' as const, id: 'LIST' }],
    }),

    completeStagePeriods: builder.mutation<{ completed: number }, { stageId: number; academicYearId?: number; cohortIds?: number[]; partitionLabels?: string[]; periodNumbers?: number[] }>({
      query: ({ stageId, ...body }) => ({ url: `/stages/${stageId}/schedule/complete`, method: 'POST', body }),
      invalidatesTags: [{ type: 'Assignment' as const, id: 'LIST' }],
    }),

    // ⚠ Paged, and the partition is filtered server-side. A promotion is ~105 cohortes over ten
    // columns: a thousand cells in one payload and a thousand cell components mounted at once, which
    // is what made the grid take seconds to open *and* seconds to close — closing does no server work
    // at all, so that half of the cost was never on the wire. Filtering client-side would answer
    // « aucune cohorte » for anyone sitting on page 3.
    getStageSchedule: builder.query<
      StageScheduleResponse,
      { stageId: number; academicYearId?: number; rotationGroup?: string | null; pageNumber?: number; pageSize?: number }
    >({
      query: ({ stageId, academicYearId, rotationGroup, pageNumber, pageSize }) => ({
        url: `/stages/${stageId}/schedule`,
        params: {
          ...(academicYearId ? { academicYearId } : {}),
          ...(rotationGroup ? { rotationGroup } : {}),
          ...(pageNumber ? { pageNumber } : {}),
          ...(pageSize ? { pageSize } : {}),
        },
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
        /**
         * Cells left exactly as they were because a human had pinned them. ⚠ Say this number: an
         * arrange that deliberately writes fewer cells than asked reads, unreported, as one that
         * half failed — and its silent absence used to mean the placement had been destroyed.
         */
        pinnedCellsKept: number;
        /**
         * Authorised services withheld from the rotation because they are held for named rosters.
         * ⚠ Their capacity left the ceiling with them, so « il manque N places » is measured against
         * a smaller number on purpose.
         */
        reservedServices: number;
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
     * Undoes a whole stage's publication in ONE request.
     *
     * ⚠ It used to be a client-side loop — one request per cohorte, awaited in sequence, each
     * invalidating the stage tag so the page refetched a 134-row list after every one. The lag was
     * the refetch storm, not the deletion; and since `errorMiddleware` toasts every rejected
     * mutation, a stage with rotations underway answered with one red toast per cohorte.
     *
     * ⚠ There is no `force`, deliberately. A cohorte whose rotation has begun is skipped and
     * counted; undoing it is the per-cohorte « Dépublier », which names what that one costs and asks
     * twice. A bulk sweep must never become the way round it.
     */
    unpublishStageSchedule: builder.mutation<UnpublishStageResult, UnpublishStageArgs>({
      query: ({ stageId, ...body }) => ({
        url: `/stages/${stageId}/schedule/unpublish`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_r, _e, { stageId }) => [
        { type: 'Assignment' as const, id: 'LIST' },
        { type: 'Stage' as const, id: `cohorts-${stageId}` },
        { type: 'Stage' as const, id: `schedule-${stageId}` },
        { type: 'Stage' as const, id: 'TIMELINE' },
        { type: 'Stage' as const, id: 'REPARTITION' },
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

    /**
     * The block this promotion is laid out on right now, so reopening the screen restores the
     * configuration instead of an empty form. Read from the axis on disk rather than from the last
     * request, so a window corrected afterwards shows through.
     */
    getRotationCycle: builder.query<
      RotationCycleConfiguration,
      { levelId: number; academicYearId?: number }
    >({
      query: ({ levelId, academicYearId }) => ({
        url: `/levels/${levelId}/rotation-cycle`,
        params: academicYearId != null ? { academicYearId } : undefined,
      }),
      providesTags: (_r, _e, { levelId }) => [{ type: 'Stage' as const, id: `cycle-${levelId}` }],
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

    /**
     * Removing the block, scoped to the stages that make it up — a promotion can hold several (the new
     * CNPN's 3rd year is two semesters), so a removal keyed on the level alone would take the other
     * one with it.
     */
    deleteRotationCycle: builder.mutation<
      DeleteRotationCycleResult,
      { levelId: number; stageIds: number[]; academicYearId?: number }
    >({
      query: ({ levelId, stageIds, academicYearId }) => ({
        url: `/levels/${levelId}/rotation-cycle`,
        method: 'DELETE',
        params: { stageIds, ...(academicYearId != null ? { academicYearId } : {}) },
      }),
      invalidatesTags: (_r, _e, { levelId, stageIds }) => [
        { type: 'Stage' as const, id: 'TIMELINE' },
        { type: 'Stage' as const, id: `cycle-${levelId}` },
        { type: 'Level' as const, id: 'REPARTITION' },
        ...stageIds.flatMap((id) => [
          { type: 'Stage' as const, id: `schedule-${id}` },
          { type: 'Stage' as const, id: `cohorts-${id}` },
        ]),
      ],
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
      invalidatesTags: (_r, _e, { levelId, stages }) => [
        { type: 'Stage' as const, id: 'TIMELINE' },
        { type: 'Stage' as const, id: `cycle-${levelId}` },
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
      query: (params) => ({ url: '/groups', params: { ...params, pageNumber: 1, pageSize: MAX_PAGE_SIZE } }),
      transformResponse: (res: PaginatedResponse<AcademicGroupResponse>) => res.items,
      providesTags: [{ type: 'Level' as const, id: 'GROUPS' }],
    }),

    /**
     * ⚠ A **mutation** although it writes nothing: the selection is a body — whole rosters, named
     * students and a pasted list — and not a query string. Nothing is invalidated, because nothing
     * changed.
     */
    previewBulkRosterAssignment: builder.mutation<
      BulkRosterAssignmentReport, PreviewBulkRosterAssignmentRequest
    >({
      query: (body) => ({ url: '/groups/assign/bulk/preview', method: 'POST', body }),
    }),

    /**
     * ⚠ `confirmedCount` is the number the **preview** returned, sent back rather than re-derived.
     * A registration created, transferred or evaluated in between changes what the act does without
     * changing anything the operator saw; the server refuses on a mismatch.
     */
    applyBulkRosterAssignment: builder.mutation<
      BulkRosterAssignmentReport, ApplyBulkRosterAssignmentRequest
    >({
      query: (body) => ({ url: '/groups/assign/bulk', method: 'POST', body }),
      // Every roster the act touches changes size, and a student who joined from nowhere has just
      // received his affectations — so the assignment list is stale too.
      //
      // ⚠ The sources come from the **report**, not from the request: a selection can name a whole
      // promotion, so the client never knew which rosters it was emptying. `sourceGroupIds` is
      // measured server-side over every row, before the display cap.
      invalidatesTags: (report, _e, { targetGroupId }) => [
        { type: 'Level' as const, id: 'GROUPS' },
        { type: 'Level' as const, id: `group-${targetGroupId}` },
        ...(report?.sourceGroupIds ?? []).map((id) => ({ type: 'Level' as const, id: `group-${id}` })),
        { type: 'Assignment' as const, id: 'LIST' },
      ],
    }),

    createGroup: builder.mutation<number, { label: string; academicYearId: number; levelId?: number | null; geographicZone?: string; rotationGroup?: string | null; purpose?: string | null }>({
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

    updateGroup: builder.mutation<void, { id: number; label: string; geographicZone?: string; rotationGroup?: string | null; purpose?: string | null }>({
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

    // ⚠ dropAffectations is the caller having read the refusal that named the count — never a
    // default. An affectation hangs off the cohorte, not off the roster pointer, so emptying without
    // it would leave every one of them behind against a roster displaying 0 étudiants.
    emptyGroup: builder.mutation<
      { unassigned: number; affectationsRemoved: number; periodsRemoved: number },
      { id: number; dropAffectations?: boolean }
    >({
      query: ({ id, dropAffectations }) => ({
        url: `/groups/${id}/students`,
        method: 'DELETE',
        params: dropAffectations ? { dropAffectations: true } : undefined,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: 'Level' as const, id: `group-${id}` },
        { type: 'Level' as const, id: 'GROUPS' },
        { type: 'Stage' as const, id: 'LIST' },
      ],
    }),

    /**
     * What re-opening a stage would mean, before anything is written.
     *
     * ⚠ The duration it proposes comes from the text governing **this registration**, never from the
     * catalogue. MED3 Chirurgie reads 30 jours ouvrables in the catalogue since it was aligned on
     * arrêté 1650.25, while the students still owing it are governed by 2174.18, which states 66 —
     * and a revalidation is by construction a student on an older text, so the catalogue is wrong
     * for exactly this population.
     *
     * `canOpen` is decided by the same rules the command applies, so the dialog cannot offer an act
     * that would then be refused.
     */
    getRevalidationContext: builder.query<RevalidationContextResponse, RevalidationContextParams>({
      query: ({ registrationId, stageId, from }) => ({
        url: `/registrations/${registrationId}/revalidation-context`,
        params: from ? { stageId, from } : { stageId },
      }),
      providesTags: (_r, _e, { registrationId }) => [
        { type: 'Registration' as const, id: `reval-${registrationId}` },
      ],
    }),

    revalidateStage: builder.mutation<string, RevalidateStageRequest>({
      query: (body) => ({ url: '/stages/revalidate', method: 'POST', body }),
      invalidatesTags: (_r, _e, { registrationId }) => [
        { type: 'Registration' as const, id: registrationId },
        { type: 'Registration' as const, id: `reval-${registrationId}` },
        { type: 'Assignment' as const, id: 'LIST' },
      ],
    }),

    // ⚠ The body is spelled out rather than spread: `sourceGroupId` exists for the cache alone and
    // the endpoint binds a command that has no such field. Same shape as changeStudentGroup.
    transferStudent: builder.mutation<void, TransferStudentRequest>({
      query: ({ registrationId, targetGroupId, reason, type, stageId, reschedule }) => ({
        url: '/groups/transfer-student',
        method: 'POST',
        body: { registrationId, targetGroupId, reason, type, stageId, reschedule },
      }),
      // Both roster *detail* pages go stale, and `GROUPS` does not reach them: getGroupById provides
      // `group-<id>`, a different tag from the list's. The same defect as changeStudentGroup, on the
      // act beside it — measured in the browser 2026-09-08, the source page still listing 12 students
      // where 11 remained.
      invalidatesTags: (_r, _e, { registrationId, targetGroupId, sourceGroupId }) => [
        { type: 'Registration' as const, id: registrationId },
        { type: 'Level' as const, id: 'GROUPS' },
        { type: 'Level' as const, id: `group-${targetGroupId}` },
        ...(sourceGroupId ? [{ type: 'Level' as const, id: `group-${sourceGroupId}` }] : []),
        { type: 'Assignment' as const, id: 'LIST' },
      ],
    }),

    // « Changement de groupe » — a correction, not a transfer. It writes no history row, so the
    // student's dossier and parcours are untouched; what has to be refreshed is everything that reads
    // the roster or the plan.
    changeStudentGroup: builder.mutation<GroupChangeReport, ChangeStudentGroupRequest>({
      query: ({ registrationId, targetGroupId }) => ({
        url: '/groups/change-student-group',
        method: 'POST',
        body: { registrationId, targetGroupId },
      }),
      // ⚠ Both group *detail* pages have to be named, and `GROUPS` is not enough: getGroupById
      // provides `group-<id>`, a different tag from the list's. Measured in the browser 2026-09-06 —
      // the POST returned 200, the student had moved in the database, and the page the act was
      // launched from went on listing him, which reads as a button that did nothing.
      invalidatesTags: (_r, _e, { registrationId, studentId, targetGroupId, sourceGroupId }) => [
        { type: 'Registration' as const, id: registrationId },
        ...(studentId ? [{ type: 'Registration' as const, id: studentId }] : []),
        { type: 'Level' as const, id: 'GROUPS' },
        { type: 'Level' as const, id: `group-${targetGroupId}` },
        ...(sourceGroupId ? [{ type: 'Level' as const, id: `group-${sourceGroupId}` }] : []),
        { type: 'Assignment' as const, id: 'LIST' },
      ],
    }),

    swapStudentGroups: builder.mutation<GroupSwapReport, SwapStudentGroupsRequest>({
      query: ({ firstRegistrationId, secondRegistrationId }) => ({
        url: '/groups/swap-students',
        method: 'POST',
        body: { firstRegistrationId, secondRegistrationId },
      }),
      invalidatesTags: (
        _r, _e, { firstRegistrationId, secondRegistrationId, firstGroupId, secondGroupId },
      ) => [
        { type: 'Registration' as const, id: firstRegistrationId },
        { type: 'Registration' as const, id: secondRegistrationId },
        { type: 'Level' as const, id: 'GROUPS' },
        ...(firstGroupId ? [{ type: 'Level' as const, id: `group-${firstGroupId}` }] : []),
        ...(secondGroupId ? [{ type: 'Level' as const, id: `group-${secondGroupId}` }] : []),
        { type: 'Assignment' as const, id: 'LIST' },
      ],
    }),

    // ⚠ **No `group-<id>` on either of these, and that is correct**: a délocalisation leaves the
    // student in his cohorte and in his roster — the two roster detail pages read the same rows
    // before and after. What moves is **where he stands**: a délocalisé stops occupying the service
    // he left, so it is the stage's grid and the services' occupancy that go stale.
    // See `docs/delocalization.md`.
    //
    // ⚠ The outbound act had forgotten the grid while its own undo remembered it — so sending a
    // promotion away left the saturation the operator was reading exactly as it was, which is the
    // client-side twin of the defect the server fixed in session 48.
    delocalizeStudent: builder.mutation<void, DelocalizeStudentRequest>({
      query: (body) => ({ url: '/stages/delocalize', method: 'POST', body }),
      invalidatesTags: (_r, _e, { registrationId, stageId }) => [
        { type: 'Registration' as const, id: registrationId },
        { type: 'Assignment' as const, id: 'LIST' },
        { type: 'Stage' as const, id: `schedule-${stageId}` },
        { type: 'Service' as const, id: 'LIST' },
      ],
    }),

    cancelDelocalization: builder.mutation<void, CancelDelocalizationRequest>({
      query: (body) => ({ url: '/stages/delocalize/cancel', method: 'POST', body }),
      invalidatesTags: (_r, _e, { registrationId, stageId }) => [
        { type: 'Registration' as const, id: registrationId },
        { type: 'Assignment' as const, id: 'LIST' },
        { type: 'Stage' as const, id: `schedule-${stageId}` },
        { type: 'Service' as const, id: 'LIST' },
      ],
    }),

    /**
     * ⚠ A **mutation** although it writes nothing: the selection is a body — whole rosters, named
     * students and a pasted list — and not a query string. Nothing is invalidated, because nothing
     * changed.
     */
    previewBulkDelocalization: builder.mutation<
      BulkDelocalizationReport, PreviewBulkDelocalizationRequest
    >({
      query: (body) => ({ url: '/stages/delocalize/bulk/preview', method: 'POST', body }),
    }),

    /**
     * ⚠ `confirmedCount` is the number the **preview** returned, sent back rather than re-derived.
     * A registration created, transferred into the roster or evaluated in between changes what the
     * act does without changing anything the operator saw; the server refuses on a mismatch.
     */
    applyBulkDelocalization: builder.mutation<
      BulkDelocalizationReport, ApplyBulkDelocalizationRequest
    >({
      query: (body) => ({ url: '/stages/delocalize/bulk', method: 'POST', body }),
      // ⚠ The service list too: the load of every service the promotion was standing in has just
      // changed, and the grid's saturation is drawn from it.
      invalidatesTags: (_r, _e, { stageId }) => [
        { type: 'Level' as const, id: 'GROUPS' },
        { type: 'Assignment' as const, id: 'LIST' },
        { type: 'Stage' as const, id: `schedule-${stageId}` },
        { type: 'Service' as const, id: 'LIST' },
      ],
    }),

    // ⚠ This invalidated **nothing**, and it is the act that makes rosters exist. Measured in the
    // browser 2026-09-10: after « Lancer la répartition » the Groupes tab read « Aucun groupe pour
    // cette année. Lancez d'abord la répartition automatique » while the base held the twelve it had
    // just created — and because « Vider » and « Supprimer » are rendered only when the list is
    // non-empty, the screen advised replaying the act *and* withdrew the means of undoing it.
    //
    // Only the list: the rosters are new, so no `group-<id>` entry can be cached for them yet.
    autoArrangeGroups: builder.mutation<BulkResponse<string, number>, AutoArrangeRequest>({
      query: (body) => ({ url: '/groups/auto-arrange', method: 'POST', body }),
      invalidatesTags: [{ type: 'Level' as const, id: 'GROUPS' }],
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

    /**
     * « Quel groupe va deja la ou cet etudiant doit aller ? »
     *
     * The cheapest answer to a nominative placement request is « un roster y va deja » — the student
     * is then one transfer away, no cell is pinned and no roster of two is invented. That answer was
     * unreachable until this read: nothing could be asked which roster is at a given hospital, so
     * the only route was to read every stage's planning grid by eye.
     *
     * Paged, and scoped by the promotion the server resolves — the summary beside it is what says
     * whether an empty result means « personne n'y va » or « rien n'est encore reparti ».
     */
    getRosterPlacements: builder.query<RosterPlacementsResponse, RosterPlacementsRequest>({
      query: (params) => ({ url: '/groups/placements', params }),
      // Cells are what this read is about, so it must follow an arrange or a publish as well as a
      // roster change: Assignment/LIST is what the schedule mutations invalidate.
      providesTags: [
        { type: 'Level' as const, id: 'PLACEMENTS' },
        { type: 'Assignment' as const, id: 'LIST' },
      ],
    }),

    /**
     * « Cet hopital peut-il accueillir toute la rotation de cette promotion ? » — posee AVANT la
     * promesse, jamais decouverte a la sixieme cellule.
     *
     * Deliberately not year-scoped: stages, services, hospitals and the allowed-services list are
     * year-invariant catalogue, so there is no year for this answer to be wrong about.
     */
    getHospitalStageCoverage: builder.query<
      HospitalStageCoverageResponse,
      { hospitalId: number; levelId: number }
    >({
      query: ({ hospitalId, levelId }) => ({
        url: `/hospitals/${hospitalId}/stage-coverage`,
        params: { levelId },
      }),
      providesTags: (_r, _e, { hospitalId, levelId }) => [
        { type: 'Hospital' as const, id: `coverage-${hospitalId}-${levelId}` },
        // The verdict is read off Stage.AllowedServices, so authoring that list must refresh it.
        { type: 'Stage' as const, id: 'LIST' },
      ],
    }),

    /**
     * « Qui a fait ca, et quand ? » — la premiere lecture capable d'ouvrir `AuditLogs`.
     *
     * Trente-cinq commandes y ecrivaient et rien ne pouvait le relire : la table etait en ecriture
     * seule, consultable seulement en interrogeant la base a la main.
     *
     * ⚠ Volontairement **hors** de l'annee de la barre du haut : une entree d'audit est datee d'une
     * horloge, pas d'une annee academique — le geste qui touche 2026-2027 a pu etre fait en juillet.
     * C'est la seule lecture de ce dossier ou l'absence d'annee n'est pas un defaut.
     */
    getAuditLog: builder.query<AuditLogPage, AuditLogRequest>({
      query: (params) => ({ url: '/audit-log', params }),
      providesTags: [{ type: 'Audit' as const, id: 'LIST' }],
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

    /**
     * The windows one year's promotions have declared. Scoped by year server-side — an omitted year is
     * the current one, never all of them.
     */
    getPromotionPauses: builder.query<
      PaginatedResponse<PromotionPause>,
      { academicYearId?: number; levelId?: number; pageNumber?: number; pageSize?: number }
    >({
      query: (params) => ({ url: '/calendar/promotion-pauses', params }),
      providesTags: [{ type: 'Calendar' as const, id: 'PAUSES' }],
    }),

    /**
     * The dry run. A mutation rather than a query because the window is posted as a body, not because
     * it writes — it writes nothing, and it returns the numbers the declaration will report.
     */
    previewPromotionPause: builder.mutation<
      PromotionPauseImpact,
      PromotionPauseInput & { excludingPauseId?: number }
    >({
      query: (body) => ({ url: '/calendar/promotion-pauses/preview', method: 'POST', body }),
    }),

    declarePromotionPause: builder.mutation<PromotionPauseDeclaredResult, PromotionPauseInput>({
      query: (body) => ({ url: '/calendar/promotion-pauses', method: 'POST', body }),
      invalidatesTags: CALENDAR_CHANGED,
    }),

    correctPromotionPause: builder.mutation<
      PromotionPauseCorrectedResult,
      { id: number } & Omit<PromotionPauseInput, 'levelId' | 'academicYearId'>
    >({
      query: ({ id, ...body }) => ({
        url: `/calendar/promotion-pauses/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: CALENDAR_CHANGED,
    }),

    revokePromotionPause: builder.mutation<PromotionPauseRevokedResult, number>({
      query: (id) => ({ url: `/calendar/promotion-pauses/${id}`, method: 'DELETE' }),
      invalidatesTags: CALENDAR_CHANGED,
    }),

    /**
     * Ce qu'un recalcul d'axe ferait de cette promotion. N'écrit rien, donc n'invalide rien.
     *
     * ⚠ Une query et non une mutation : c'est une lecture, et la garder en cache est ce qui permet
     * de la relire après avoir fermé la fenêtre de confirmation sans la recalculer.
     * `providesTags` la range avec le calendrier, parce que déclarer ou supprimer une suspension
     * change exactement ce qu'elle répond.
     */
    previewAxisRelay: builder.query<
      AxisRelayPreview,
      { levelId: number; academicYearId?: number; fromPeriodNumber?: number }
    >({
      query: ({ levelId, ...params }) => ({ url: `/levels/${levelId}/axis-relay/preview`, params }),
      providesTags: [{ type: 'Calendar' as const, id: 'AXIS' }],
    }),

    applyAxisRelay: builder.mutation<AxisRelayResult, AxisRelayApplyRequest>({
      query: ({ levelId, ...body }) => ({
        url: `/levels/${levelId}/axis-relay`,
        method: 'POST',
        body,
      }),
      /**
       * Il réécrit les dates des créneaux **et** celles des périodes publiées : la grille, l'axe, la
       * répartition, le calendrier et le dossier de chaque étudiant touché sont périmés d'un coup.
       * Et le journal, qui vient d'en gagner une entrée.
       */
      invalidatesTags: [
        { type: 'Calendar' as const, id: 'AXIS' },
        { type: 'Calendar' as const, id: 'PAUSES' },
        { type: 'Stage' as const, id: 'TIMELINE' },
        { type: 'Stage' as const, id: 'REPARTITION' },
        { type: 'Assignment' as const, id: 'LIST' },
        { type: 'History' as const, id: 'LIST' },
        { type: 'Audit' as const, id: 'LIST' },
      ],
    }),

    bulkCreateCohortsFromPartitions: builder.mutation<BulkCohortsFromPartitionsResult, BulkCreateCohortsFromPartitionsRequest>({
      query: (body) => ({ url: '/cohorts/from-partitions', method: 'POST', body }),
      invalidatesTags: (_r, _e, { mappings }) =>
        Array.from(new Set(mappings.map((m) => m.stageId))).map((id) => ({
          type: 'Stage' as const,
          id: `cohorts-${id}`,
        })),
    }),

    deleteAllStageCohorts: builder.mutation<
      { cohortsRemoved: number; affectationsRemoved: number; periodsRemoved: number },
      { stageId: number; academicYearId?: number }
    >({
      query: ({ stageId, academicYearId }) => ({
        url: `/stages/${stageId}/cohorts/all`,
        method: 'DELETE',
        params: academicYearId ? { academicYearId } : undefined,
      }),
      invalidatesTags: (_r, _e, { stageId }) => [{ type: 'Stage' as const, id: `cohorts-${stageId}` }],
    }),

    // `levelId` narrows the act to the promotion on screen, exactly as `emptyAllYearGroups` does —
    // rosters are keyed (année, promotion, numéro) and this was the last roster act that jumped
    // straight to the year, so it refused over other promotions' students.
    deleteAllYearGroups: builder.mutation<
      { deleted: number },
      { academicYearId: number; levelId?: number }
    >({
      query: ({ academicYearId, levelId }) => ({
        url: '/groups/all',
        method: 'DELETE',
        params: { academicYearId, ...(levelId ? { levelId } : {}) },
      }),
      invalidatesTags: [{ type: 'Level' as const, id: 'GROUPS' }],
    }),

    // `levelId` narrows the act to the promotion on screen. Omitted, it stays year-wide — and the
    // caller must mean it, because a year holds several promotions' planning.
    emptyAllYearGroups: builder.mutation<{ unassigned: number }, { academicYearId: number; levelId?: number }>({
      query: ({ academicYearId, levelId }) => ({
        url: '/groups/all/students',
        method: 'DELETE',
        params: { academicYearId, ...(levelId ? { levelId } : {}) },
      }),
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

    /**
     * Every service's year at once — the question no single service page can answer.
     *
     * ⚠ Tagged on `Service`/`LIST` **and** on the planning tags, because that is what actually moves
     * it: arranging a stage or publishing a promotion changes every number here, while editing a
     * service's own capacity changes one row. Both have to invalidate it, or the report keeps
     * printing the load from before the arrange that was run to fix it.
     */
    getOccupancyReport: builder.query<OccupancyReportResponse, OccupancyReportRequest>({
      query: (params) => ({ url: '/services/occupancy-report', params }),
      providesTags: [{ type: 'Service' as const, id: 'occupancy-report' }],
    }),

    /**
     * « Cette promotion tient-elle ? » — the capacity read that needs no plan.
     *
     * ⚠ Tagged on `Service` and on `Stage`, and deliberately **not** on the planning tags: nothing
     * here is computed from cells, so arranging or publishing changes not one number. What moves it
     * is the catalogue — a service's capacity or quota, a stage's allowed services, a duration — and
     * the roll, which is why `Registration` is in the list too.
     */
    getPromotionFit: builder.query<PromotionFitResponse, PromotionFitRequest>({
      query: (params) => ({ url: '/services/promotion-fit', params }),
      providesTags: [
        { type: 'Service' as const, id: 'promotion-fit' },
        { type: 'Stage' as const, id: 'LIST' },
      ],
    }),

    /**
     * What a student owes at ONE level, folded across every registration he holds there — the
     * question a repeating student's several registrations make impossible to read one at a time.
     */
    getStudentLevelDossier: builder.query<
      StudentLevelDossierResponse, { studentId: string; levelId: number }
    >({
      query: ({ studentId, levelId }) => `/students/${studentId}/levels/${levelId}/dossier`,
      providesTags: (_r, _e, { studentId, levelId }) => [
        { type: 'Registration' as const, id: `dossier-${studentId}-${levelId}` },
      ],
    }),

    /**
     * What `FinalYearGuard` reads before letting somebody *begin* a final year — cursus-wide, across
     * every level, which is exactly what the per-level dossier is not.
     */
    getOutstandingStages: builder.query<OutstandingStageResponse[], string>({
      query: (studentId) => `/students/${studentId}/outstanding-stages`,
      providesTags: (_r, _e, studentId) => [
        { type: 'Registration' as const, id: `outstanding-${studentId}` },
      ],
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

    // ─── Clôture de l'année ───────────────────────────────────────────────────
    // Three routes in the order they are used: download a canvas, upload it for a dry run, upload it
    // again to apply. The scope is the *year*; `levelId` narrows it to one promotion.

    getDeliberationTemplate: builder.query<Blob, DeliberationTemplateRequest>({
      query: ({ levelId, academicYearId, mode }) => ({
        url: '/deliberation/template',
        params: { levelId, academicYearId, mode },
        responseHandler: (response) => response.blob(),
        cache: 'no-cache',
      }),
    }),

    // A dry run writes nothing, so it must invalidate nothing.
    previewDeliberation: builder.mutation<DeliberationReport, DeliberationUploadRequest>({
      query: (arg) => ({
        url: '/deliberation/preview',
        method: 'POST',
        params: deliberationParams(arg),
        body: fileBody(arg.file),
      }),
    }),

    applyDeliberation: builder.mutation<DeliberationReport, DeliberationUploadRequest>({
      query: (arg) => ({
        url: '/deliberation',
        method: 'POST',
        params: { ...deliberationParams(arg), confirmedDefaultCount: arg.confirmedDefaultCount },
        body: fileBody(arg.file),
      }),
      // A verdict lands on every registration of the year: every student card, every registration
      // list and the assignment views that read the status are stale at once.
      invalidatesTags: [
        { type: 'Registration' as const, id: 'LIST' },
        { type: 'Student' as const, id: 'LIST' },
        { type: 'Assignment' as const, id: 'LIST' },
      ],
    }),

    previewReinscription: builder.query<ReinscriptionReport, ReinscriptionRequest>({
      query: (params) => ({ url: '/reinscription/preview', params }),
    }),

    applyReinscription: builder.mutation<ReinscriptionReport, ReinscriptionRequest>({
      query: (body) => ({ url: '/reinscription', method: 'POST', body }),
      invalidatesTags: [
        { type: 'Registration' as const, id: 'LIST' },
        { type: 'Student' as const, id: 'LIST' },
        { type: 'Level' as const, id: 'GROUPS' },
      ],
    }),

    // ─── Réinscription par fichier ────────────────────────────────────────────
    // The rollover as the faculty actually hands it over: one spreadsheet stating, per student, the
    // étape he was in and the étape he enters. It closes the year and opens the next in one act,
    // where the two routes above are the same job split across a PV and a derivation.
    //
    // ⚠ No template route. The other three canvases are documents PGSH hands out and gets back;
    // this one is the faculty's own, and generating a rival version invites the two to drift.

    // A dry run writes nothing, so it must invalidate nothing.
    previewReinscriptionSheet: builder.mutation<ReinscriptionSheetReport, ReinscriptionSheetUploadRequest>({
      query: ({ file, ...params }) => ({
        url: '/reinscription/sheet/preview',
        method: 'POST',
        params,
        body: fileBody(file),
      }),
    }),

    applyReinscriptionSheet: builder.mutation<ReinscriptionSheetReport, ReinscriptionSheetUploadRequest>({
      query: ({ file, ...params }) => ({
        url: '/reinscription/sheet',
        method: 'POST',
        params,
        body: fileBody(file),
      }),
      // It writes on both sides of the year boundary — a verdict onto every registration of the year
      // closing, and a new registration for every student of the year opening — so the student list,
      // the registration lists and the rosters the répartition reads from are all stale at once.
      invalidatesTags: [
        { type: 'Registration' as const, id: 'LIST' },
        { type: 'Student' as const, id: 'LIST' },
        { type: 'Assignment' as const, id: 'LIST' },
        { type: 'Level' as const, id: 'GROUPS' },
      ],
    }),

    // The same upload, as the three-sheet document scolarité works from.
    //
    // ⚠ It writes nothing, so it is deliberately usable *before* the confirmation and on a roll the
    // apply would refuse — « donne-moi la liste des erreurs » is the request, and a refusal that only
    // names the first offending line cannot answer it. It invalidates nothing for the same reason.
    //
    // ⚠ A mutation rather than a lazy query, unlike the other two exports: it carries a file, so it
    // has to be a POST. The `response.ok` branch is the same and matters for the same reason — read
    // unconditionally, `.blob()` turns a problem-details refusal into an opaque Blob and the user
    // gets « une erreur » where the server had written a sentence.
    // ─── Le canevas des affectations ────────────────────────────────────────
    //
    // ⚠ Trois routes pour l'aller, trois pour le retour, et la même forme des deux côtés : on lit ce
    // qui existe, on simule, on applique avec le nombre qu'on a vu. Rien ici ne recalcule ce que le
    // serveur a annoncé — le rapport de l'aperçu *est* le plan que l'application exécute.

    getAffectationSheetTemplate: builder.query<DownloadedFile, AffectationSheetTemplateRequest>({
      query: (params) => ({
        url: '/affectations/sheet/template',
        params,
        // ⚠ Le nom vient de Content-Disposition, jamais reconstruit ici : le serveur nomme le
        // document d'après la portée qu'il a réellement résolue, année comprise.
        responseHandler: async (response) => {
          if (!response.ok) return response.json().catch(() => undefined);
          return {
            blob: await response.blob(),
            fileName: fileNameFromDisposition(
              response.headers.get('content-disposition'), 'affectations.xlsx'),
          };
        },
        cache: 'no-cache',
      }),
    }),

    // Un essai à blanc n'écrit rien, donc il n'invalide rien.
    previewAffectationSheet: builder.mutation<AffectationSheetReport, AffectationSheetUploadRequest>({
      query: ({ file, ...params }) => ({
        url: '/affectations/sheet/preview',
        method: 'POST',
        params,
        body: fileBody(file),
      }),
    }),

    applyAffectationSheet: builder.mutation<AffectationSheetReport, AffectationSheetApplyRequest>({
      query: ({ file, ...params }) => ({
        url: '/affectations/sheet',
        method: 'POST',
        params,
        body: fileBody(file),
      }),
      // Il écrit des cohortes, des affectations et des périodes : la liste des affectations, les
      // cohortes d'un stage et le dossier de chaque étudiant touché sont périmés d'un coup. Et la
      // liste des imports, qui vient d'en gagner un.
      invalidatesTags: [
        { type: 'Assignment' as const, id: 'LIST' },
        { type: 'Stage' as const, id: 'REPARTITION' },
        { type: 'Stage' as const, id: 'TIMELINE' },
        { type: 'History' as const, id: 'LIST' },
        { type: 'Stage' as const, id: 'IMPORTS' },
      ],
    }),

    getAffectationImports: builder.query<
      PaginatedResponse<AffectationImportSummary>,
      { levelId?: number; academicYearId?: number; pageNumber?: number; pageSize?: number }
    >({
      query: (params) => ({ url: '/affectations/imports', params }),
      providesTags: [{ type: 'Stage' as const, id: 'IMPORTS' }],
    }),

    previewAffectationImportReversal: builder.query<AffectationImportReversalReport, string>({
      query: (id) => ({ url: `/affectations/imports/${id}/reversal` }),
    }),

    reverseAffectationImport: builder.mutation<
      AffectationImportReversalReport, { id: string; confirmedCount: number }
    >({
      query: ({ id, confirmedCount }) => ({
        url: `/affectations/imports/${id}/reversal`,
        method: 'POST',
        params: { confirmedCount },
      }),
      // Elle supprime des affectations et en rétablit d'autres — les mêmes lectures que l'aller.
      invalidatesTags: [
        { type: 'Assignment' as const, id: 'LIST' },
        { type: 'Stage' as const, id: 'REPARTITION' },
        { type: 'Stage' as const, id: 'TIMELINE' },
        { type: 'History' as const, id: 'LIST' },
        { type: 'Stage' as const, id: 'IMPORTS' },
      ],
    }),

    exportReinscriptionSheetReport: builder.mutation<DownloadedFile, ReinscriptionSheetUploadRequest>({
      query: ({ file, ...params }) => ({
        url: '/reinscription/sheet/export',
        method: 'POST',
        params,
        body: fileBody(file),
        responseHandler: async (response) => {
          if (!response.ok) return response.json().catch(() => undefined);
          return {
            blob: await response.blob(),
            fileName: fileNameFromDisposition(
              response.headers.get('content-disposition'), 'reinscription.xlsx'),
          };
        },
      }),
    }),

    // ─── Signalements ─────────────────────────────────────────────────────────
    // Registrations PGSH created but will not plan until somebody settles them. The réinscription
    // roll raises them by the thousand; they come off one at a time, because each is a different
    // question — is the évaluation keyed in, did this student really defend, is he coming back late.
    //
    // ⚠ There is deliberately no bulk release. It would undo in one click the only thing that made a
    // 1 267-row inference safe to record.

    /**
     * L'état du dernier point de sauvegarde — lu par la page « Sauvegardes » **et** par la
     * confirmation de chaque acte en masse.
     *
     * ⚠ `refetchOnMountOrArgChange` : la question posée est « à quand remonte la dernière
     * sauvegarde ? ». Une réponse mise en cache une heure plus tôt répond à une autre question, et
     * c'est celle qu'on lirait juste avant d'appliquer une réinscription.
     */
    getSafePointStatus: builder.query<SafePointStatus, void>({
      query: () => ({ url: '/backups/safe-point' }),
      providesTags: [{ type: 'Backup' as const, id: 'STATUS' }],
      keepUnusedDataFor: 30,
    }),

    getBackupPoints: builder.query<PaginatedResponse<BackupPoint>, { pageNumber?: number; pageSize?: number }>({
      query: (params) => ({ url: '/backups', params }),
      providesTags: [{ type: 'Backup' as const, id: 'LIST' }],
    }),

    createBackupPoint: builder.mutation<BackupPoint, CreateBackupPointRequest>({
      query: (body) => ({ url: '/backups', method: 'POST', body }),
      invalidatesTags: BACKUPS_CHANGED,
    }),

    verifyBackupPoint: builder.mutation<BackupPoint, string>({
      query: (id) => ({ url: `/backups/${id}/verify`, method: 'POST' }),
      invalidatesTags: BACKUPS_CHANGED,
    }),

    deleteBackupPoint: builder.mutation<void, string>({
      query: (id) => ({ url: `/backups/${id}`, method: 'DELETE' }),
      invalidatesTags: BACKUPS_CHANGED,
    }),

    /** Ce que la restauration effacerait, ce qu'elle rétablirait, et la commande qui la fait. */
    getRestorePlan: builder.query<RestorePlan, string>({
      query: (id) => ({ url: `/backups/${id}/restore-plan` }),
      providesTags: (_r, _e, id) => [{ type: 'Backup' as const, id }],
    }),

    getRegistrationHolds: builder.query<PaginatedResponse<RegistrationHold>, RegistrationHoldsRequest>({
      query: (params) => ({ url: '/registrations/holds', params }),
      providesTags: [{ type: 'Registration' as const, id: 'HOLDS' }],
    }),

    releaseRegistrationHold: builder.mutation<ReleaseHoldReport, ReleaseHoldRequest>({
      query: ({ holdId, releaseNote }) => ({
        url: `/registrations/holds/${holdId}/release`,
        method: 'POST',
        body: { releaseNote },
      }),
      // Releasing puts a student back into the population every planning screen reads, so the roster
      // and affectation lists are stale the moment it succeeds — not only the worklist itself.
      invalidatesTags: [
        { type: 'Registration' as const, id: 'HOLDS' },
        { type: 'Registration' as const, id: 'LIST' },
        { type: 'Level' as const, id: 'GROUPS' },
      ],
    }),

    // ─── Inscription — the third act ──────────────────────────────────────────
    // The people the two acts above structurally cannot see: they start from a registration the
    // student already holds, and nobody here has one. ⚠ This is the only act that creates *people*.

    getInscriptionTemplate: builder.query<Blob, InscriptionScopeRequest>({
      query: ({ levelId, academicYearId }) => ({
        url: '/inscription/template',
        params: { levelId, academicYearId },
        responseHandler: (response) => response.blob(),
        cache: 'no-cache',
      }),
    }),

    // A dry run writes nothing, so it must invalidate nothing.
    previewInscription: builder.mutation<InscriptionReport, InscriptionUploadRequest>({
      query: ({ levelId, academicYearId, file }) => ({
        url: '/inscription/preview',
        method: 'POST',
        params: { levelId, academicYearId },
        body: fileBody(file),
      }),
    }),

    applyInscription: builder.mutation<InscriptionReport, InscriptionUploadRequest>({
      query: ({ levelId, academicYearId, file, confirmedStudentCount }) => ({
        url: '/inscription',
        method: 'POST',
        params: { levelId, academicYearId, confirmedStudentCount },
        body: fileBody(file),
      }),
      // Students and registrations are created outright, and the newcomers land in « Non réparti »,
      // so the roster lists change too.
      invalidatesTags: [
        { type: 'Student' as const, id: 'LIST' },
        { type: 'Registration' as const, id: 'LIST' },
        { type: 'Level' as const, id: 'GROUPS' },
      ],
    }),

    // The single-row way in: a JSON body, no file, no preview, no count to confirm — the request is
    // the row. Every bulk import owes one, or fixing one person means re-sending the promotion.
    inscribeStudent: builder.mutation<InscriptionRowReport, InscribeStudentRequest>({
      query: (body) => ({ url: '/inscription/student', method: 'POST', body }),
      invalidatesTags: [
        { type: 'Student' as const, id: 'LIST' },
        { type: 'Registration' as const, id: 'LIST' },
        { type: 'Level' as const, id: 'GROUPS' },
      ],
    }),

    // ─── Exports (.xlsx) ──────────────────────────────────────────────────────
    // Two documents that leave the system. Both are `GET`s returning a file, so they are declared as
    // *lazy* queries: a download is an act the user asks for, not state a page subscribes to.
    //
    // ⚠ `responseHandler` branches on `response.ok`, and that is not a nicety. RTK runs the handler
    // for failures too, so reading `.blob()` unconditionally turns a problem-details refusal into an
    // opaque Blob and `problemMessage` finds nothing — the user gets « une erreur » where the server
    // had written « L'export porterait sur 42 000 lignes… ». The existing template endpoints above
    // still have that shape; it is worth the same fix when they are next touched.
    //
    // ⚠ The file name is read off `Content-Disposition`, never rebuilt here: the server names the
    // file after the scope it actually *resolved*, which is not always the one the page asked for.

    getStudentsExport: builder.query<DownloadedFile, StudentsExportRequest>({
      query: (params) => ({
        url: '/students/export',
        params,
        cache: 'no-cache',
        responseHandler: async (response) => {
          if (!response.ok) return response.json().catch(() => undefined);
          return {
            blob: await response.blob(),
            fileName: fileNameFromDisposition(
              response.headers.get('content-disposition'), 'etudiants.xlsx'),
          };
        },
      }),
    }),

    getStageAssignmentsExport: builder.query<DownloadedFile, StageAssignmentsExportRequest>({
      query: (params) => ({
        url: '/stages/assignments/export',
        params,
        cache: 'no-cache',
        responseHandler: async (response) => {
          if (!response.ok) return response.json().catch(() => undefined);
          return {
            blob: await response.blob(),
            fileName: fileNameFromDisposition(
              response.headers.get('content-disposition'), 'stages.xlsx'),
          };
        },
      }),
    }),

    // ─── One student at a time ────────────────────────────────────────────────

    recordRegistrationOutcome: builder.mutation<void, RecordOutcomeRequest>({
      query: ({ registrationId, outcome, motif }) => ({
        url: `/registrations/${registrationId}/outcome`,
        method: 'POST',
        body: { outcome, motif },
      }),
      invalidatesTags: (_r, _e, { studentId }) => [
        { type: 'Registration' as const, id: studentId },
        { type: 'History' as const, id: studentId },
      ],
    }),

    reopenRegistrationYear: builder.mutation<ReopenYearReport, ReopenYearRequest>({
      query: ({ registrationId, reason }) => ({
        url: `/registrations/${registrationId}/outcome/reopen`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: (_r, _e, { studentId }) => [
        { type: 'Registration' as const, id: studentId },
        { type: 'History' as const, id: studentId },
      ],
    }),

    // Joining is not transferring: this is the registration that has no roster at all, and it also
    // creates the cohorts and the rotations still ahead of the group.
    assignStudentToGroup: builder.mutation<GroupJoinReport, AssignStudentToGroupRequest>({
      query: ({ registrationId, academicGroupId, reason }) => ({
        url: '/groups/assign-student',
        method: 'POST',
        body: { registrationId, academicGroupId, reason },
      }),
      // ⚠ No source: joining is precisely the registration that was in no roster. Only the target's
      // detail page goes stale, and `GROUPS` does not refresh it — getGroupById provides its own tag.
      invalidatesTags: (_r, _e, { registrationId, studentId, academicGroupId }) => [
        { type: 'Registration' as const, id: registrationId },
        ...(studentId ? [{ type: 'Registration' as const, id: studentId }] : []),
        { type: 'Level' as const, id: 'GROUPS' },
        { type: 'Level' as const, id: `group-${academicGroupId}` },
        { type: 'Assignment' as const, id: 'LIST' },
      ],
    }),
  }),
});

function deliberationParams({ levelId, academicYearId, defaultUnlistedToAdmis }: DeliberationScopeRequest) {
  return { levelId, academicYearId, defaultUnlistedToAdmis };
}

function fileBody(file: File) {
  const form = new FormData();
  form.append('file', file);
  return form;
}

export const {
  useGetRevalidationContextQuery,
  useRevalidateStageMutation,
  useLazyGetInscriptionTemplateQuery,
  usePreviewInscriptionMutation,
  useApplyInscriptionMutation,
  useInscribeStudentMutation,
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
  useGetOccupancyReportQuery,
  useGetPromotionFitQuery,
  useGetStudentLevelDossierQuery,
  useGetOutstandingStagesQuery,
  useGetAcademicYearsQuery,
  useCreateAcademicYearMutation,
  useUpdateAcademicYearMutation,
  useSetCurrentAcademicYearMutation,
  useDeleteAcademicYearMutation,
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
  useGetCnpnEffectivitiesQuery,
  useCreateCnpnEffectivityMutation,
  useDeleteCnpnEffectivityMutation,
  useLazyPreviewCnpnEffectivityQuery,
  useApplyCnpnEffectivityMutation,
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
  useChangeStudentGroupMutation,
  useSwapStudentGroupsMutation,
  useDelocalizeStudentMutation,
  useCancelDelocalizationMutation,
  usePreviewBulkDelocalizationMutation,
  usePreviewBulkRosterAssignmentMutation,
  useApplyBulkRosterAssignmentMutation,
  useSetAllowedServicePlacementModeMutation,
  useApplyBulkDelocalizationMutation,
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
  useSetAllowedServiceOrderMutation,
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
  usePreviewStageStartQuery,
  useCompleteStagePeriodsMutation,
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
  useUnpublishStageScheduleMutation,
  useAutoArrangeStageScheduleMutation,
  usePublishStageScheduleMutation,
  useGenerateMacroPlanMutation,
  useGetRotationCycleQuery,
  usePreviewRotationCycleMutation,
  useApplyRotationCycleMutation,
  useDeleteRotationCycleMutation,
  useGenerateAxisWindowsQuery,
  useLazyGenerateAxisWindowsQuery,
  useClearRotationGroupsMutation,
  useGetPromotionPartitioningQuery,
  useGetHolidayCoverageQuery,
  useCreateHolidayMutation,
  useUpdateHolidayMutation,
  useDeleteHolidayMutation,
  useSeedNationalHolidaysMutation,
  useGetPromotionPausesQuery,
  usePreviewPromotionPauseMutation,
  useDeclarePromotionPauseMutation,
  useCorrectPromotionPauseMutation,
  useRevokePromotionPauseMutation,
  useLazyPreviewAxisRelayQuery,
  useApplyAxisRelayMutation,
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
  useLazyGetDeliberationTemplateQuery,
  usePreviewDeliberationMutation,
  useApplyDeliberationMutation,
  useLazyPreviewReinscriptionQuery,
  useApplyReinscriptionMutation,
  usePreviewReinscriptionSheetMutation,
  useApplyReinscriptionSheetMutation,
  useExportReinscriptionSheetReportMutation,
  useLazyGetAffectationSheetTemplateQuery,
  usePreviewAffectationSheetMutation,
  useApplyAffectationSheetMutation,
  useGetAffectationImportsQuery,
  useLazyPreviewAffectationImportReversalQuery,
  useReverseAffectationImportMutation,
  useGetSafePointStatusQuery,
  useGetBackupPointsQuery,
  useCreateBackupPointMutation,
  useVerifyBackupPointMutation,
  useDeleteBackupPointMutation,
  useLazyGetRestorePlanQuery,
  useGetRegistrationHoldsQuery,
  useReleaseRegistrationHoldMutation,
  useRecordRegistrationOutcomeMutation,
  useReopenRegistrationYearMutation,
  useAssignStudentToGroupMutation,
  useGetAuditLogQuery,
  useGetRosterPlacementsQuery,
  useGetHospitalStageCoverageQuery,
  useLazyGetStudentsExportQuery,
  useLazyGetStageAssignmentsExportQuery,
} = adminApiSlice;
