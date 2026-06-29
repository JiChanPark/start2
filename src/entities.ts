export type Role = "OWNER" | "MENTOR" | "GRAD_STUDENT" | "INTERN";
export type MissionStatus = "TODO" | "DONE" | "SKIPPED";
export type StudentStatus = "ACTIVE" | "COMPLETED" | "PAUSED";

export interface User {
  id: string;
  loginId?: string;
  email: string;
  name: string;
  role: Role;
  passwordHash?: string;
}

export interface StudentProfile {
  id: string;
  userId: string;
  affiliation: string;
  major: string;
  mentorName: string;
  internshipStartDate: string;
  internshipEndDate: string;
  status: StudentStatus;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  category: string;
  orderIndex: number;
}

export interface MissionAssignment {
  id: string;
  studentId: string;
  missionId: string;
  assignedDate: string;
  status: MissionStatus;
  note: string;
  selfGoal?: string;
  achievementRate?: number;
  selfEvaluation?: string;
  checkedAt?: string;
  createdBy?: string;
}

export interface Reflection {
  id: string;
  studentId: string;
  reflectionDate: string;
  todayWork: string;
  tomorrowPlan: string;
  observed: string;
  learned: string;
  importance: string;
  question: string;
  aiFeedback: string;
  updatedAt: string;
}

export interface MentorNote {
  id: string;
  studentId: string;
  authorId: string;
  type: "DAILY_MENTOR" | "WEEKLY_OWNER";
  noteDate: string;
  weekStartDate?: string;
  weekEndDate?: string;
  content: string;
  createdAt: string;
}

export interface WeeklyReport {
  id: string;
  studentId: string;
  weekStartDate: string;
  weekEndDate: string;
  summary: string;
  suggestions: string;
  wantsToTry: string;
  newInterests: string;
  impressiveMaterials: string;
  nextWeekPlan: string;
  updatedAt: string;
}

export interface MeetingNotice {
  id: string;
  title: string;
  meetingDate: string;
  startTime: string;
  endTime: string;
  location: string;
  agenda: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  pinned: boolean;
}

export interface PresentationFile {
  id: string;
  studentId: string;
  title: string;
  description: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileDataUrl: string;
  uploadedAt: string;
}

export interface SignupRequest {
  id: string;
  loginId: string;
  email: string;
  name: string;
  role: Exclude<Role, "OWNER">;
  affiliation: string;
  major: string;
  mentorName: string;
  internshipStartDate: string;
  internshipEndDate: string;
  passwordHash: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface AppData {
  users: User[];
  students: StudentProfile[];
  missions: Mission[];
  assignments: MissionAssignment[];
  reflections: Reflection[];
  mentorNotes: MentorNote[];
  weeklyReports: WeeklyReport[];
  meetingNotices: MeetingNotice[];
  presentationFiles: PresentationFile[];
  signupRequests: SignupRequest[];
}

export interface AuthSession {
  accessToken: string;
  refreshToken?: string;
  userId: string;
  email: string;
}
