import { apiSlice } from '../../../app/apiSlice';
import type { PaginatedResponse } from '../../../common/types';
import type {
  EmployeeUserResponse,
  MyServiceResponse,
  MyServicePeriodResponse,
  SubmitEvaluationRequest,
} from '../types/employee.types';

export const employeeApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCurrentUser: builder.query<EmployeeUserResponse, void>({
      query: () => '/users/me',
      providesTags: [{ type: 'User' as const, id: 'ME' }],
    }),

    getMyServicesAsChef: builder.query<PaginatedResponse<MyServiceResponse>, string>({
      query: (serviceChefId) => ({
        url: '/services',
        params: { serviceChefId, pageSize: 50 },
      }),
      providesTags: [{ type: 'Service' as const, id: 'MY_SERVICES' }],
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
  }),
});

export const {
  useGetCurrentUserQuery,
  useGetMyServicesAsChefQuery,
  useGetServicePeriodsByServiceQuery,
  useSubmitEvaluationMutation,
} = employeeApiSlice;
