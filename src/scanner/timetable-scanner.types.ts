export type ScannedTimetableFile = {
  filename: string;
  contentType: string;
  sizeBytes: number;
};

export type ScannedTimetableTeacher = {
  teacherId: string;
  fullName: string;
};

export type ScannedTimetableClassGroup = {
  groupCode: string;
  gradeLevel: number;
  section: string;
};

export type ScannedTimetableSubject = {
  subjectCode: string;
  name: string;
};

export type ScannedTimetableSlot = {
  period: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export type ScannedTimetableAssignment = {
  teacherId: string;
  teacherName: string;
  subjectCode: string;
  subjectName: string;
  groupCode: string;
  gradeLevel: number;
  section: string;
  period: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export type ScannedTimetableResponse = {
  status: string;
  message: string;
  uploadedFile: ScannedTimetableFile;
  teachers: ScannedTimetableTeacher[];
  classGroups: ScannedTimetableClassGroup[];
  subjects: ScannedTimetableSubject[];
  slots: ScannedTimetableSlot[];
  assignments: ScannedTimetableAssignment[];
  warnings: string[];
};
