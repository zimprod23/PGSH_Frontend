import { apiSlice } from '../../../app/apiSlice';
import type { AcademicYearResponse } from '../../admin/types/admin.types';
import type { ChefWorklistResponse, EmployeeResponse, ServicePeriodState } from '../types/employee.types';

// Recording and amending an evaluation is shared with the admin stage record — those endpoints live
// in features/evaluations/api/evaluationsApi.ts.
export const employeeApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCurrentEmployee: builder.query<EmployeeResponse, void>({
      query: () => '/employees/me',
      providesTags: [{ type: 'User' as const, id: 'ME' }],
    }),

    /**
     * One slice of the chef worklist for one service. ⚠ Every narrowing argument is sent to the
     * server — slice, year, search, page. The page used to come back whole and be filtered in the
     * browser, which is both what crashed the page (3 220 rows mounted at once) and what made the
     * search lie: filtering the rows you happen to hold answers "no such student" for anyone on
     * another page.
     */
    getServicePeriodsByService: builder.query<
      ChefWorklistResponse,
      {
        serviceId: number;
        state: ServicePeriodState;
        /** Omitted = the year flagged current, which the response names back. */
        academicYearId?: number;
        /** The explicit "every year" — it wins over academicYearId. */
        allYears?: boolean;
        searchTerm?: string;
        pageNumber?: number;
        pageSize?: number;
      }
    >({
      query: ({ serviceId, state, academicYearId, allYears, searchTerm, pageNumber, pageSize }) => ({
        url: '/employees/me/service-periods',
        params: {
          serviceId, state, academicYearId, allYears: allYears || undefined,
          searchTerm, pageNumber, pageSize,
        },
      }),
      providesTags: (_r, _e, { serviceId }) => [
        { type: 'Service' as const, id: `periods-${serviceId}` },
      ],
    }),

    // The years the chef can narrow to. Injected here rather than imported from the admin slice so
    // the employee feature keeps its own surface; both inject into the same apiSlice, so the cache
    // tag is shared.
    getWorklistAcademicYears: builder.query<AcademicYearResponse[], void>({
      query: () => '/academic-years',
      providesTags: [{ type: 'Level' as const, id: 'ACADEMIC_YEARS' }],
    }),
  }),
});

export const {
  useGetCurrentEmployeeQuery,
  useGetServicePeriodsByServiceQuery,
  useGetWorklistAcademicYearsQuery,
} = employeeApiSlice;
