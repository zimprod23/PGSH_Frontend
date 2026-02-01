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

export interface Level {
  label: string;
  year: number;
  academicProgram: number;
}

export interface RegistrationSummary {
  id: string;
  academicYear: string;
  status: string;
  level: Level;
}

export interface Student {
  id: string; // Guid in C#
  email: string;
  firstName: string;
  lastName: string;
  cin?: string | null; // CIN in C#
  gender: string;
  civilStatus: string;
  nationalityStatus: string;
  dateOfBirth?: string | null; // DateOnly in C#
  placeOfBirth?: string | null;
  fullAddress?: string | null;
  cne: string;
  appogee: string;
  academicProgram: string;
  bacSeries: string;
  bacYear: string;
  accessGrade: number; // decimal in C#
  ranking?: number | null; // int? in C#
  currentRegistration?: RegistrationSummary | null;
}
