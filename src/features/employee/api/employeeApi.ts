import { apiSlice } from '../../../app/apiSlice';
import type { PaginatedResponse } from '../../../common/types';
import type {
  EmployeeResponse,
  MyServicePeriodResponse,
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
        url: '/service-periods',
        params: { serviceId, isComplete, pageSize: 100 },
      }),
      providesTags: (_r, _e, { serviceId }) => [
        { type: 'Service' as const, id: `periods-${serviceId}` },
      ],
    }),

    submitEvaluation: builder.mutation<string, SubmitEvaluationRequest>({
      query: (body) => ({ url: '/service-evaluations', method: 'POST', body }),
      invalidatesTags: (_r, _e, { servicePeriodId }) => [
        { type: 'Service' as const, id: `periods-${servicePeriodId}` },
      ],
    }),

    getEvaluationByPeriod: builder.query<ServiceEvaluationDetail, string>({
      query: (periodId) => `/service-periods/${periodId}/evaluation`,
      providesTags: (_r, _e, periodId) => [
        { type: 'Service' as const, id: `eval-${periodId}` },
      ],
    }),

    updateEvaluation: builder.mutation<void, UpdateEvaluationRequest>({
      query: ({ evaluationId, servicePeriodId: _, ...body }) => ({
        url: `/service-evaluations/${evaluationId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_r, _e, { servicePeriodId }) => [
        { type: 'Service' as const, id: `eval-${servicePeriodId}` },
        { type: 'Service' as const, id: `periods-${servicePeriodId}` },
      ],
    }),
  }),
});

export const {
  useGetCurrentEmployeeQuery,
  useGetServicePeriodsByServiceQuery,
  useSubmitEvaluationMutation,
  useGetEvaluationByPeriodQuery,
  useUpdateEvaluationMutation,
} = employeeApiSlice;
