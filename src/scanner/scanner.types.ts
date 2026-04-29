export type ScannedPlanillaFile = {
  filename: string;
  contentType: string;
  sizeBytes: number;
};

export type ScannedPlanillaMetadata = {
  gradeLevel: number | null;
  groupCode: string | null;
  subjectName: string | null;
  teacherName: string | null;
};

export type ScannedPlanillaRow = {
  order: number;
  studentName: string | null;
  nationalId: string | null;
  cells: Record<string, string>;
};

export type ScannedPlanillaResponse = {
  status: string;
  templateKey: string;
  message: string;
  uploadedFile: ScannedPlanillaFile;
  metadata: ScannedPlanillaMetadata;
  rows: ScannedPlanillaRow[];
};
