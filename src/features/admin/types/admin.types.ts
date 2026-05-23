import type { AcademicProgram, RegistrationStatus } from '../../../common/types';

export interface AcademicYearResponse {
  id: number;
  label: string;
  startDate: string;   // YYYY-MM-DD
  endDate: string;     // YYYY-MM-DD
  isCurrent: boolean;
}

export interface AdminLevelResponse {
  id: number;
  label: string | null;
  year: number;
  academicProgram: AcademicProgram;
}

export interface CreateAcademicYearRequest {
  label: string;
  startDate: string;   // YYYY-MM-DD
  endDate: string;     // YYYY-MM-DD
  isCurrent: boolean;
}

export interface CreateLevelRequest {
  label: string;
  year: number;
  academicProgram: AcademicProgram;
}

export interface UpdateLevelRequest {
  label: string;
  year: number;
  academicProgram: AcademicProgram;
}

// ─── Infrastructure ───────────────────────────────────────────────────────────

export interface CenterSummaryResponse {
  id: number;
  name: string;
  centerType: string;
  city: string | null;
  x: string | null;
  y: string | null;
}

export interface CreateCenterRequest {
  name: string;
  centerType: string;
  city?: string;
  localizationX?: string;
  localizationY?: string;
  localizationZ?: string;
}

export interface HospitalSummaryResponse {
  id: number;
  name: string;
  centerId: number;
  centerName: string;
  hospitalType: string;
  city: string;
  email: string | null;
}

export interface CreateHospitalRequest {
  centerId: number;
  name: string;
  hospitalType: string;
  city: string;
  description?: string;
  email?: string;
}

export interface ServiceSummaryResponse {
  id: number;
  name: string;
  serviceType: string;
  specialty: string | null;
  capacity: number;
  hospitalId: number;
  hospitalName: string;
  serviceChefName: string | null;
  staffCount: number;
}

export interface CreateServiceRequest {
  hospitalId: number;
  name: string;
  serviceType: string;
  specialty?: string;
  capacity: number;
  description: string;
}

// ─── Stages ─────────────────────────────────────────────────────────────────

export interface StageSummaryResponse {
  id: number;
  name: string;
  coefficient: number;
  durationInDays: number;
  levelLabel: string | null;
}

export interface StageObjectiveResponse {
  label: string;
  description: string | null;
  weight: number;
  isMandatory: boolean;
}

export interface StageDetailResponse {
  id: number;
  name: string;
  coefficient: number;
  description: string | null;
  durationInDays: number;
  levelResponse: AdminLevelResponse | null;
  stageObjectiveResponse: StageObjectiveResponse[];
}

export interface StageObjectiveRequest {
  label: string;
  description?: string;
  weight: number;
  isMandatory: boolean;
}

export interface CreateStageRequest {
  name: string;
  coefficient: number;
  description?: string;
  durationInDays: number;
  levelId: number;
  objectives: StageObjectiveRequest[];
}

export interface UpdateStageRequest {
  name: string;
  coefficient: number;
  description?: string;
  durationInDays: number;
  levelId: number;
  objectives: StageObjectiveRequest[];
}

export interface GetStagesParams {
  searchTerm?: string;
  levelId?: number;
  pageNumber?: number;
  pageSize?: number;
}

// ─── Cohorts ─────────────────────────────────────────────────────────────────

export interface CohortResponse {
  id: number;
  stageId: number;
  stageName: string;
  academicGroupId: number;
  academicGroupLabel: string;
  label: string;
  studentAssignmentCount: number;
  slotAssignmentCount: number;
  isSchedulePublished: boolean;
  academicYearId: number;
  academicYearLabel: string;
}

export interface CohortSlotDetail {
  assignmentId: number;
  stageSlotId: number;
  periodNumber: number;
  periodLabel: string | null;
  startDate: string;    // YYYY-MM-DD
  endDate: string;      // YYYY-MM-DD
  serviceId: number;
  serviceName: string;
  hospitalName: string;
}

export interface CohortDetailResponse {
  id: number;
  stageId: number;
  stageName: string;
  academicGroupId: number;
  academicGroupLabel: string;
  label: string;
  studentAssignmentCount: number;
  isSchedulePublished: boolean;
  slotAssignments: CohortSlotDetail[];
}

// ─── Stage Schedule Grid ──────────────────────────────────────────────────────

export interface StageSlotResponse {
  id: number;
  periodNumber: number;
  label: string | null;
  startDate: string;    // YYYY-MM-DD
  endDate: string;      // YYYY-MM-DD
}

export interface SlotCellResponse {
  assignmentId: number;
  stageSlotId: number;
  serviceId: number;
  serviceName: string;
  hospitalName: string;
  serviceCapacity: number;
  occupiedSeats: number;
}

export interface CohortScheduleRow {
  cohortId: number;
  cohortLabel: string;
  academicGroupId: number;
  academicGroupLabel: string;
  studentCount: number;
  isSchedulePublished: boolean;
  cells: (SlotCellResponse | null)[];
}

export interface StageScheduleResponse {
  stageId: number;
  slots: StageSlotResponse[];
  cohorts: CohortScheduleRow[];
}

export interface CreateStageSlotRequest {
  periodNumber: number;
  label?: string;
  startDate: string;    // YYYY-MM-DD
  endDate: string;      // YYYY-MM-DD
}

export interface UpdateStageSlotRequest {
  label?: string;
  startDate: string;    // YYYY-MM-DD
  endDate: string;      // YYYY-MM-DD
}

export interface SetCohortSlotAssignmentRequest {
  serviceId: number;
}

export interface CreateCohortRequest {
  stageId: number;
  academicGroupId: number;
  label: string;
}

export interface AcademicGroupResponse {
  id: number;
  label: string;
  groupNumber: number;
  academicYearId: number;
  academicYearLabel: string;
}

export interface GroupDetailResponse {
  id: number;
  label: string;
  groupNumber: number;
  geographicZone: string | null;
  academicYearId: number;
  academicYearLabel: string;
  students: GroupStudentResponse[];
}

export interface GroupStudentResponse {
  registrationId: string;
  studentId: string;
  fullName: string;
  cne: string;
  email: string;
  registrationStatus: RegistrationStatus;
}

export interface TransferStudentRequest {
  registrationId: string;
  targetGroupId: number;
  reason?: string;
}

// ─── Service Periods ─────────────────────────────────────────────────────────

export interface ServicePeriodResponse {
  id: string;
  internshipAssignmentId: string;
  studentFullName: string;
  serviceId: number;
  serviceName: string;
  hospitalName: string;
  startDate: string;   // YYYY-MM-DD
  endDate: string;     // YYYY-MM-DD
  isComplete: boolean;
  hasEvaluation: boolean;
}

export interface GetServicePeriodsParams {
  assignmentId?: string;
  serviceId?: number;
  cohortId?: number;
  isComplete?: boolean;
  pageNumber?: number;
  pageSize?: number;
}

// ─── Internship Assignments ───────────────────────────────────────────────────

export type InternshipStatus =
  | 'Planned'
  | 'Ongoing'
  | 'Completed'
  | 'Evaluated'
  | 'Validated'
  | 'Rejected';

export type StageAssignmentResult = 'NonÉvalué' | 'Validé' | 'NonValidé';

export interface InternshipAssignmentSummaryResponse {
  id: string;
  registrationId: string;
  studentFullName: string;
  cohortId: number;
  cohortLabel: string;
  stageId: number;
  status: InternshipStatus;
  finalScore: number | null;
  result: StageAssignmentResult | null;
}

export interface GetAssignmentsParams {
  cohortIds?: number[];
  registrationId?: string;
  stageId?: number;
  status?: InternshipStatus;
  pageNumber?: number;
  pageSize?: number;
}

export interface AttendanceRecord {
  id: string;
  date: string;        // YYYY-MM-DD
  status: AttendanceStatus;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'JustifiedAbsent' | 'Late';

export interface RecordAttendanceRequest {
  servicePeriodId: string;
  date: string;        // YYYY-MM-DD
  status: AttendanceStatus;
}

// ─── Groups ──────────────────────────────────────────────────────────────────

export interface AutoArrangeRequest {
  levelId: number;
  academicYearId: number;
  groupSize: number;
}

export interface CreateRegistrationRequest {
  studentId: string;
  academicYearId: number;
  levelId: number;
  status?: RegistrationStatus;
}

// ─── Employees ────────────────────────────────────────────────────────────────

export type Grade    = 'MC' | 'PES' | 'PH' | 'Nurse' | 'Administrator';
export type Position = 'ServiceChef' | 'Normal';
export type WorkPlace = 'Hospital' | 'Fmpr';

export interface EmployeeSummaryResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  ppr: string | null;
  grade: Grade;
  position: Position | null;
  workPlace: WorkPlace | null;
}

export interface EmployeeServiceSummary {
  serviceId: number;
  serviceName: string;
  hospitalName: string;
  isChef: boolean;
}

export interface EmployeeDetailResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  cin: string | null;
  gender: string;
  dateOfBirth: string | null;
  placeOfBirth: string | null;
  fullAddress: string | null;
  grade: Grade;
  position: Position | null;
  workPlace: WorkPlace | null;
  ppr: string | null;
  label: string | null;
  pvSignatureDate: string | null;
  services: EmployeeServiceSummary[];
}

export interface CreateEmployeeRequest {
  email: string;
  firstName: string;
  lastName: string;
  cin?: string;
  ppr?: string;
  label?: string;
  grade: Grade;
  position?: Position;
  workPlace?: WorkPlace;
  gender: string;
  dateOfBirth?: string;
  placeOfBirth?: string;
  fullAddress?: string;
  pvSignatureDate?: string;
}

export type UpdateEmployeeRequest = CreateEmployeeRequest;

export interface GetEmployeesParams {
  searchTerm?: string;
  grade?: Grade;
  position?: Position;
  serviceId?: number;
  hospitalId?: number;
  pageNumber?: number;
  pageSize?: number;
}

// ─── Service detail (staff management) ───────────────────────────────────────

export interface ServiceChefSummary {
  id: string;
  firstName: string;
  lastName: string;
  ppr: string | null;
  grade: string;
}

export interface StaffMemberResponse {
  id: string;
  firstName: string;
  lastName: string;
  ppr: string | null;
  grade: string;
  position: string;
}

export interface ServiceDetailResponse {
  id: number;
  name: string;
  description: string;
  serviceType: string;
  capacity: number;
  hospitalId: number;
  hospitalName: string;
  serviceChef: ServiceChefSummary | null;
  staff: StaffMemberResponse[];
}

