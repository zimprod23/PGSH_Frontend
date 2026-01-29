// Single Responsibility: Separate Profile from Stage logic
export interface StudentProfile {
  id: string;
  firstName: string;
  lastName: string;
  academicYear: number;
  hospital?: string;
}

export interface Demand {
  id: string;
  dateSubmitted: string;
  hospitalRequested: string;
  status: DemandStatus;
}

export type DemandStatus = "Pending" | "Approved" | "Rejected";

export interface InternshipDemand {
  id: string;
  submittedAt: string;
  hospitalName: string;
  specialty: string;
  status: DemandStatus;
}

export interface StageObjective {
  id: string;
  title: string;
  description: string;
  isAchieved: boolean;
  evaluationNote?: string; // Feedback from supervisor
}

export interface InternshipStage {
  id: string;
  startDate: string;
  endDate: string;
  department: string;
  objectives: StageObjective[];
}

export interface StudentHistory {
  id: string;
  eventType:
    | "ValidationStage"
    | "Inscription"
    | "NonValidation"
    | "Fraud"
    | "Revalidation";
  createdAt: string;
  metadata: any; // Or a more specific union type if you know the metadata shapes
}

export interface StudentProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  cne: string;
  currentLevel: string;
  location: string;
  phone: string;
  academicYear: number;
}

export interface UpdateProfileRequest {
  firstName: string;
  lastName: string;
  // Add other fields you permit students to edit
}

export interface StudentDemand {
  id: string;
  type: string; // e.g., "Attestation", "Convention", or Custom string
  title: string;
  body: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  attachmentUrl?: string;
  response?: {
    message?: string;
    fileUrl?: string;
    respondedAt: string;
  };
}

export interface StageObjective {
  id: string;
  label: string; // e.g., "Savoir-faire: Pose de perfusion"
  rating: number; // 1-5
  maxRating: number;
}

export interface StageService {
  name: string;
  team: string[];
  rules: string;
  objectives: string[]; // Generic service objectives
  location: {
    lat: number;
    lng: number;
    address: string;
  };
}

export interface StudentStage {
  id: string;
  title: string;
  academicYear: string;
  status: "COMPLETED" | "IN_PROGRESS" | "UPCOMING";
  startDate: string;
  endDate: string;
  mark?: number;
  totalMark?: number;
  objectives?: StageObjective[];
  service?: StageService;
}
