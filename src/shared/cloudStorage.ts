import type {
  AppData,
  MeetingNotice,
  MentorNote,
  Mission,
  MissionAssignment,
  PresentationFile,
  Reflection,
  StudentProfile,
  User,
  WeeklyReport,
} from "../entities";
import { authClient } from "./supabaseAuth";
import { normalizeAppData } from "./storage";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const APP_STATE_ID = import.meta.env.VITE_APP_STATE_ID ?? "default";

interface CloudStateRow {
  id: string;
  data: AppData;
  updated_at?: string;
}

const enabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

function authHeaders() {
  const token = authClient.getSession()?.accessToken ?? SUPABASE_ANON_KEY ?? "";
  return {
    apikey: SUPABASE_ANON_KEY ?? "",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function endpoint(table: string, query = "") {
  return `${SUPABASE_URL}/rest/v1/${table}${query}`;
}

async function rest<T>(table: string, query = "", init?: RequestInit): Promise<T> {
  const response = await fetch(endpoint(table, query), {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`${table} request failed: ${response.status}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function upsertRows(table: string, rows: unknown[]) {
  if (!rows.length) return Promise.resolve();
  return rest(table, "?on_conflict=id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify(rows),
  });
}

async function loadNormalized(): Promise<AppData | null> {
  const users = await rest<UserRow[]>("profiles", "?select=*");

  const [students, missions, assignments, reflections, mentorNotes, weeklyReports, meetingNotices, presentationFiles] = await Promise.all([
    rest<StudentRow[]>("student_profiles", "?select=*"),
    rest<MissionRow[]>("missions", "?select=*"),
    rest<AssignmentRow[]>("mission_assignments", "?select=*"),
    rest<ReflectionRow[]>("reflections", "?select=*"),
    rest<MentorNoteRow[]>("mentor_notes", "?select=*"),
    rest<WeeklyReportRow[]>("weekly_reports", "?select=*"),
    rest<MeetingNoticeRow[]>("meeting_notices", "?select=*"),
    rest<PresentationFileRow[]>("presentation_files", "?select=*"),
  ]);

  if (!users.length || !students.length) return null;

  return normalizeAppData({
    users: users.map(fromUserRow),
    students: students.map(fromStudentRow),
    missions: missions.map(fromMissionRow),
    assignments: assignments.map(fromAssignmentRow),
    reflections: reflections.map(fromReflectionRow),
    mentorNotes: mentorNotes.map(fromMentorNoteRow),
    weeklyReports: weeklyReports.map(fromWeeklyReportRow),
    meetingNotices: meetingNotices.map(fromMeetingNoticeRow),
    presentationFiles: presentationFiles.map(fromPresentationFileRow),
  });
}

async function saveNormalized(data: AppData) {
  await upsertRows("profiles", data.users.map(toUserRow));
  await upsertRows("student_profiles", data.students.map(toStudentRow));
  await upsertRows("missions", data.missions.map(toMissionRow));
  await upsertRows("mission_assignments", data.assignments.map(toAssignmentRow));
  await upsertRows("reflections", data.reflections.map(toReflectionRow));
  await upsertRows("mentor_notes", data.mentorNotes.map(toMentorNoteRow));
  await upsertRows("weekly_reports", data.weeklyReports.map(toWeeklyReportRow));
  await upsertRows("meeting_notices", data.meetingNotices.map(toMeetingNoticeRow));
  await upsertRows("presentation_files", data.presentationFiles.map(toPresentationFileRow));
}

async function loadAppState(): Promise<AppData | null> {
  const rows = await rest<CloudStateRow[]>(
    "app_state",
    `?id=eq.${encodeURIComponent(APP_STATE_ID)}&select=id,data,updated_at`,
  );
  return rows[0]?.data ? normalizeAppData(rows[0].data) : null;
}

async function saveAppState(data: AppData): Promise<void> {
  await rest("app_state", "?on_conflict=id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify({
      id: APP_STATE_ID,
      data,
      updated_at: new Date().toISOString(),
    }),
  });
}

export const cloudRepository = {
  enabled,

  async load(): Promise<AppData | null> {
    if (!enabled) return null;

    try {
      const normalized = await loadNormalized();
      if (normalized) return normalized;
    } catch {
      // Projects that have not run db/normalized-schema.sql yet can still use the legacy app_state table.
    }

    return loadAppState();
  },

  async save(data: AppData): Promise<void> {
    if (!enabled) return;

    try {
      await saveNormalized(data);
    } catch {
      await saveAppState(data);
    }
  },
};

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: User["role"];
}

interface StudentRow {
  id: string;
  user_id: string;
  affiliation: string;
  major: string;
  mentor_name: string;
  internship_start_date: string;
  internship_end_date: string;
  status: StudentProfile["status"];
}

interface MissionRow {
  id: string;
  title: string;
  description: string;
  category: string;
  order_index: number;
}

interface AssignmentRow {
  id: string;
  student_id: string;
  mission_id: string;
  assigned_date: string;
  status: MissionAssignment["status"];
  note: string;
  self_goal: string;
  achievement_rate: number;
  self_evaluation: string;
  checked_at?: string;
  created_by?: string;
}

interface ReflectionRow {
  id: string;
  student_id: string;
  reflection_date: string;
  today_work: string;
  tomorrow_plan: string;
  observed: string;
  learned: string;
  importance: string;
  question: string;
  ai_feedback: string;
  updated_at: string;
}

interface MentorNoteRow {
  id: string;
  student_id: string;
  author_id: string;
  type: MentorNote["type"];
  note_date: string;
  week_start_date?: string;
  week_end_date?: string;
  content: string;
  created_at: string;
}

interface WeeklyReportRow {
  id: string;
  student_id: string;
  week_start_date: string;
  week_end_date: string;
  summary: string;
  suggestions: string;
  wants_to_try: string;
  new_interests: string;
  impressive_materials: string;
  next_week_plan: string;
  updated_at: string;
}

interface MeetingNoticeRow {
  id: string;
  title: string;
  meeting_date: string;
  start_time: string;
  end_time: string;
  location: string;
  agenda: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  pinned: boolean;
}

interface PresentationFileRow {
  id: string;
  student_id: string;
  title: string;
  description: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_data_url: string;
  uploaded_at: string;
}

const fromUserRow = (row: UserRow): User => ({ id: row.id, email: row.email, name: row.name, role: row.role });
const toUserRow = (user: User): UserRow => ({ id: user.id, email: user.email, name: user.name, role: user.role });

const fromStudentRow = (row: StudentRow): StudentProfile => ({
  id: row.id,
  userId: row.user_id,
  affiliation: row.affiliation,
  major: row.major,
  mentorName: row.mentor_name,
  internshipStartDate: row.internship_start_date,
  internshipEndDate: row.internship_end_date,
  status: row.status,
});
const toStudentRow = (student: StudentProfile): StudentRow => ({
  id: student.id,
  user_id: student.userId,
  affiliation: student.affiliation,
  major: student.major,
  mentor_name: student.mentorName,
  internship_start_date: student.internshipStartDate,
  internship_end_date: student.internshipEndDate,
  status: student.status,
});

const fromMissionRow = (row: MissionRow): Mission => ({
  id: row.id,
  title: row.title,
  description: row.description,
  category: row.category,
  orderIndex: row.order_index,
});
const toMissionRow = (mission: Mission): MissionRow => ({
  id: mission.id,
  title: mission.title,
  description: mission.description,
  category: mission.category,
  order_index: mission.orderIndex,
});

const fromAssignmentRow = (row: AssignmentRow): MissionAssignment => ({
  id: row.id,
  studentId: row.student_id,
  missionId: row.mission_id,
  assignedDate: row.assigned_date,
  status: row.status,
  note: row.note,
  selfGoal: row.self_goal,
  achievementRate: row.achievement_rate,
  selfEvaluation: row.self_evaluation,
  checkedAt: row.checked_at,
  createdBy: row.created_by,
});
const toAssignmentRow = (assignment: MissionAssignment): AssignmentRow => ({
  id: assignment.id,
  student_id: assignment.studentId,
  mission_id: assignment.missionId,
  assigned_date: assignment.assignedDate,
  status: assignment.status,
  note: assignment.note,
  self_goal: assignment.selfGoal ?? "",
  achievement_rate: assignment.achievementRate ?? 0,
  self_evaluation: assignment.selfEvaluation ?? "",
  checked_at: assignment.checkedAt,
  created_by: assignment.createdBy,
});

const fromReflectionRow = (row: ReflectionRow): Reflection => ({
  id: row.id,
  studentId: row.student_id,
  reflectionDate: row.reflection_date,
  todayWork: row.today_work,
  tomorrowPlan: row.tomorrow_plan,
  observed: row.observed,
  learned: row.learned,
  importance: row.importance,
  question: row.question,
  aiFeedback: row.ai_feedback,
  updatedAt: row.updated_at,
});
const toReflectionRow = (reflection: Reflection): ReflectionRow => ({
  id: reflection.id,
  student_id: reflection.studentId,
  reflection_date: reflection.reflectionDate,
  today_work: reflection.todayWork,
  tomorrow_plan: reflection.tomorrowPlan,
  observed: reflection.observed,
  learned: reflection.learned,
  importance: reflection.importance,
  question: reflection.question,
  ai_feedback: reflection.aiFeedback,
  updated_at: reflection.updatedAt,
});

const fromMentorNoteRow = (row: MentorNoteRow): MentorNote => ({
  id: row.id,
  studentId: row.student_id,
  authorId: row.author_id,
  type: row.type,
  noteDate: row.note_date,
  weekStartDate: row.week_start_date,
  weekEndDate: row.week_end_date,
  content: row.content,
  createdAt: row.created_at,
});
const toMentorNoteRow = (note: MentorNote): MentorNoteRow => ({
  id: note.id,
  student_id: note.studentId,
  author_id: note.authorId,
  type: note.type,
  note_date: note.noteDate,
  week_start_date: note.weekStartDate,
  week_end_date: note.weekEndDate,
  content: note.content,
  created_at: note.createdAt,
});

const fromWeeklyReportRow = (row: WeeklyReportRow): WeeklyReport => ({
  id: row.id,
  studentId: row.student_id,
  weekStartDate: row.week_start_date,
  weekEndDate: row.week_end_date,
  summary: row.summary,
  suggestions: row.suggestions,
  wantsToTry: row.wants_to_try,
  newInterests: row.new_interests,
  impressiveMaterials: row.impressive_materials,
  nextWeekPlan: row.next_week_plan,
  updatedAt: row.updated_at,
});
const toWeeklyReportRow = (report: WeeklyReport): WeeklyReportRow => ({
  id: report.id,
  student_id: report.studentId,
  week_start_date: report.weekStartDate,
  week_end_date: report.weekEndDate,
  summary: report.summary,
  suggestions: report.suggestions,
  wants_to_try: report.wantsToTry,
  new_interests: report.newInterests,
  impressive_materials: report.impressiveMaterials,
  next_week_plan: report.nextWeekPlan,
  updated_at: report.updatedAt,
});

const fromMeetingNoticeRow = (row: MeetingNoticeRow): MeetingNotice => ({
  id: row.id,
  title: row.title,
  meetingDate: row.meeting_date,
  startTime: row.start_time,
  endTime: row.end_time,
  location: row.location,
  agenda: row.agenda,
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  pinned: row.pinned,
});
const toMeetingNoticeRow = (notice: MeetingNotice): MeetingNoticeRow => ({
  id: notice.id,
  title: notice.title,
  meeting_date: notice.meetingDate,
  start_time: notice.startTime,
  end_time: notice.endTime,
  location: notice.location,
  agenda: notice.agenda,
  created_by: notice.createdBy,
  created_at: notice.createdAt,
  updated_at: notice.updatedAt,
  pinned: notice.pinned,
});

const fromPresentationFileRow = (row: PresentationFileRow): PresentationFile => ({
  id: row.id,
  studentId: row.student_id,
  title: row.title,
  description: row.description,
  fileName: row.file_name,
  fileType: row.file_type,
  fileSize: row.file_size,
  fileDataUrl: row.file_data_url,
  uploadedAt: row.uploaded_at,
});
const toPresentationFileRow = (file: PresentationFile): PresentationFileRow => ({
  id: file.id,
  student_id: file.studentId,
  title: file.title,
  description: file.description,
  file_name: file.fileName,
  file_type: file.fileType,
  file_size: file.fileSize,
  file_data_url: file.fileDataUrl,
  uploaded_at: file.uploadedAt,
});
