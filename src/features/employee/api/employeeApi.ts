import { apiSlice } from '../../../app/apiSlice';
import type { PaginatedResponse } from '../../../common/types';
import type { EmployeeResponse, MyServicePeriodResponse } from '../types/employee.types';

// Recording and amending an evaluation is shared with the admin stage record — those endpoints live
// in features/evaluations/api/evaluationsApi.ts.
export const employeeApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCurrentEmployee: builder.query<EmployeeResponse, void>({
      query: () => '/employees/me',
      providesTags: [{ type: 'User' as const, id: 'ME' }],
    }),

    getServicePeriodsByService: builder.query<
      PaginatedResponse<MyServicePeriodResponse>,
      { serviceId: number; isComplete?: boolean; academicYearId?: number }
    >({
      query: ({ serviceId, isComplete, academicYearId }) => ({
        url: '/employees/me/service-periods',
        params: { serviceId, isComplete, academicYearId },
      }),
      providesTags: (_r, _e, { serviceId }) => [
        { type: 'Service' as const, id: `periods-${serviceId}` },
      ],
    }),
  }),
});

export const {
  useGetCurrentEmployeeQuery,
  useGetServicePeriodsByServiceQuery,
} = employeeApiSlice;
