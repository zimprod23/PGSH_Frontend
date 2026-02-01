import { apiSlice, type ApiResponse } from "../../../app/apiSlice";
import type { StudentHistory, Student } from "../types/student.types";

export const studentApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // 1. QUERY: Fetch data
    getStudentProfile: builder.query<ApiResponse<Student>, void>({
      query: () => "/students/me",
      providesTags: ["Student"],
    }),

    // 2. QUERY: Fetch history list
    getStudentHistory: builder.query<ApiResponse<StudentHistory[]>, string>({
      query: (id) => `/students/${id}/history`,
      providesTags: ["History"],
      transformResponse: (response: ApiResponse<StudentHistory[]>) => {
        if (!response?.data || response.data.length === 0) {
          return {
            success: true,
            data: [
              {
                id: "h1",
                eventType: "Inscription",
                createdAt: "2024-09-15T09:00:00Z",
                metadata: { details: "Inscription en Master 2" },
              },
              {
                id: "h2",
                eventType: "ValidationStage",
                createdAt: "2025-01-10T14:30:00Z",
                metadata: { company: "Tech Solutions", grade: "A" },
              },
              {
                id: "h3",
                eventType: "Revalidation",
                createdAt: "2026-01-20T11:00:00Z",
                metadata: { note: "Dossier académique mis à jour" },
              },
            ],
          };
        }
        return response;
      },
    }),

    // 3. MUTATION: Example of updating data
    // Added this so you have an example of how to export a mutation
    submitInternshipDemand: builder.mutation<ApiResponse<any>, any>({
      query: (demandData) => ({
        url: "/students/demands",
        method: "POST",
        body: demandData,
      }),
      invalidatesTags: ["History"], // Auto-refresh history after a new demand
    }),
  }),
});

// --- EXPORTS ---
// Rule: use + [EndpointName] + Query/Mutation
export const {
  useGetStudentProfileQuery,
  useGetStudentHistoryQuery,
  useSubmitInternshipDemandMutation, // This is your mutation hook
} = studentApiSlice;
