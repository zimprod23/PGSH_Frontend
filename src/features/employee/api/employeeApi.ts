import { apiSlice } from '../../../app/apiSlice';
import type { PaginatedResponse } from '../../../common/types';
import type {
  EmployeeResponse,
  MyServicePeriodResponse,
  PeriodObjective,
  ServiceEvaluationDetail,
  SubmitEvaluationRequest,
  UpdateEvaluationRequest,
} from '../types/employee.types';

export const employeeApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCurrentEmployee: builder.query<EmployeeResponse, void>({
      query: () => '/employees/me',
      providesTags: [{ type: 'User' as const, id: 'ME' }],
    }),

    getServicePeriodsByService: builder.query<
      PaginatedResponse<MyServicePeriodResponse>,
      { serviceId: number; isComplete?: boolean }
    >({
      query: ({ serviceId, isComplete }) => ({
        url: '/employees/me/service-periods',
        params: { serviceId, isComplete },
      }),
      providesTags: (_r, _e, { serviceId }) => [
        { type: 'Service' as const, id: `periods-${serviceId}` },
      ],
    }),

    submitEvaluation: builder.mutation<string, SubmitEvaluationRequest>({
      query: ({ serviceId: _sid, ...body }) => ({ url: '/service-evaluations', method: 'POST', body }),
      invalidatesTags: (_r, _e, { serviceId }) => [
        { type: 'Service' as const, id: `periods-${serviceId}` },
      ],
    }),

    getEvaluationByPeriod: builder.query<ServiceEvaluationDetail, string>({
      query: (periodId) => `/service-periods/${periodId}/evaluation`,
      providesTags: (_r, _e, periodId) => [
        { type: 'Service' as const, id: `eval-${periodId}` },
      ],
    }),

    getPeriodObjectives: builder.query<PeriodObjective[], string>({
      query: (periodId) => `/employees/me/service-periods/${periodId}/objectives`,
      providesTags: (_r, _e, periodId) => [
        { type: 'Service' as const, id: `objectives-${periodId}` },
      ],
    }),

    updateEvaluation: builder.mutation<void, UpdateEvaluationRequest>({
      query: ({ evaluationId, servicePeriodId: _, serviceId: _sid, ...body }) => ({
        url: `/service-evaluations/${evaluationId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_r, _e, { servicePeriodId, serviceId }) => [
        { type: 'Service' as const, id: `eval-${servicePeriodId}` },
        { type: 'Service' as const, id: `periods-${serviceId}` },
      ],
    }),
  }),
});

export const {
  useGetCurrentEmployeeQuery,
  useGetServicePeriodsByServiceQuery,
  useSubmitEvaluationMutation,
  useGetEvaluationByPeriodQuery,
  useGetPeriodObjectivesQuery,
  useUpdateEvaluationMutation,
} = employeeApiSlice;
