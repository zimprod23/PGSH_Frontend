import { apiSlice } from '../../../app/apiSlice';
import type {
  PeriodObjective,
  ServiceEvaluationDetail,
  SubmitEvaluationRequest,
  UpdateEvaluationRequest,
} from '../types/evaluation.types';

/**
 * The evaluation endpoints, shared by the chef worklist and the admin stage record. Both call the
 * same routes — the backend decides who may act through `ExecutionAuthorizer` — so keeping one copy
 * here also keeps the cache tags consistent: a write invalidates whichever of the two screens is
 * open, whichever screen made it.
 */
export const evaluationsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getPeriodObjectives: builder.query<PeriodObjective[], string>({
      query: (periodId) => `/service-periods/${periodId}/objectives`,
      providesTags: (_r, _e, periodId) => [
        { type: 'Service' as const, id: `objectives-${periodId}` },
      ],
    }),

    getEvaluationByPeriod: builder.query<ServiceEvaluationDetail, string>({
      query: (periodId) => `/service-periods/${periodId}/evaluation`,
      providesTags: (_r, _e, periodId) => [
        { type: 'Service' as const, id: `eval-${periodId}` },
      ],
    }),

    submitEvaluation: builder.mutation<string, SubmitEvaluationRequest>({
      query: (arg) => ({
        url: '/service-evaluations',
        method: 'POST',
        body: { servicePeriodId: arg.servicePeriodId, ...evaluationBody(arg) },
      }),
      invalidatesTags: (_r, _e, arg) => evaluationTags(arg),
    }),

    updateEvaluation: builder.mutation<void, UpdateEvaluationRequest>({
      query: (arg) => ({
        url: `/service-evaluations/${arg.evaluationId}`,
        method: 'PUT',
        body: evaluationBody(arg),
      }),
      invalidatesTags: (_r, _e, arg) => evaluationTags(arg),
    }),
  }),
});

/** The marks themselves. `serviceId` / `assignmentId` are cache keys, not part of the contract. */
function evaluationBody({
  mode,
  totalScore,
  outcome,
  supervisorComment,
  objectiveScores,
}: SubmitEvaluationRequest | UpdateEvaluationRequest) {
  return { mode, totalScore, outcome, supervisorComment, objectiveScores };
}

/**
 * A mark change moves the period, the chef's worklist row and the whole stage roll-up (the note and
 * the verdict are recomputed from every period), so all three caches have to go — plus the
 * assignment list behind the Suivi counters.
 */
function evaluationTags({
  servicePeriodId,
  serviceId,
  assignmentId,
}: SubmitEvaluationRequest | UpdateEvaluationRequest) {
  const tags = [
    { type: 'Service' as const, id: `eval-${servicePeriodId}` },
    { type: 'Assignment' as const, id: 'LIST' },
  ];
  if (serviceId !== undefined) tags.push({ type: 'Service' as const, id: `periods-${serviceId}` });
  if (assignmentId) {
    tags.push({ type: 'Assignment' as const, id: `record-${assignmentId}` });
    tags.push({ type: 'Assignment' as const, id: `fiche-${assignmentId}` });
    tags.push({ type: 'Assignment' as const, id: assignmentId });
  }
  return tags;
}

export const {
  useGetPeriodObjectivesQuery,
  useGetEvaluationByPeriodQuery,
  useSubmitEvaluationMutation,
  useUpdateEvaluationMutation,
} = evaluationsApiSlice;
