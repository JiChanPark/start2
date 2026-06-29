import type { AppData, MentorNote, MissionAssignment, Reflection, WeeklyReport } from "../entities";
import { seedData } from "./seed";

const STORAGE_KEY = "research-intern-mvp:data";

export interface AppRepository {
  load(): AppData;
  save(data: AppData): void;
  reset(): AppData;
  updateAssignment(id: string, patch: Partial<MissionAssignment>): AppData;
  upsertReflection(reflection: Reflection): AppData;
  upsertMentorNote(note: MentorNote): AppData;
  upsertWeeklyReport(report: WeeklyReport): AppData;
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
export const normalizeAppData = (data: AppData): AppData => ({
  ...data,
  users: normalizeUsers(data.users ?? []),
  missions: normalizeMissions(data.missions ?? []),
  mentorNotes: (data.mentorNotes ?? []).map((note) => ({
    ...note,
    type: note.type ?? "DAILY_MENTOR",
  })),
  weeklyReports: data.weeklyReports ?? [],
  meetingNotices: data.meetingNotices ?? seedData.meetingNotices ?? [],
  presentationFiles: data.presentationFiles ?? [],
  assignments: (data.assignments ?? []).map((assignment) => ({
    ...assignment,
    note: assignment.note ?? "",
    selfGoal: assignment.selfGoal ?? "",
    achievementRate: assignment.achievementRate ?? (assignment.status === "DONE" ? 100 : 0),
    selfEvaluation: assignment.selfEvaluation ?? assignment.note ?? "",
  })),
  reflections: (data.reflections ?? []).map((reflection) => ({
    ...reflection,
    todayWork: reflection.todayWork ?? "",
    tomorrowPlan: reflection.tomorrowPlan ?? "",
  })),
});

function normalizeMissions(missions: AppData["missions"]) {
  return missions.map((mission) => {
    if (mission.id !== "m-003") return mission;

    return {
      ...mission,
      title: "논문 이해하고, 아이디어 생각하기",
      description: "지정 논문을 읽고 핵심 주장, 연구 방법, 한계를 이해한 뒤 내가 떠올린 후속 아이디어나 질문을 정리합니다.",
      category: "아이디어",
    };
  });
}

function normalizeUsers(users: AppData["users"]) {
  const normalized = users.map((user) => {
    const legacyRole = user.role as string;
    if (user.id === "u-admin") {
      return { ...user, id: "u-owner", email: "owner@lab.local", name: "박지찬", role: "OWNER" as const };
    }
    if (user.id === "u-owner") {
      return { ...user, name: "박지찬", role: "OWNER" as const };
    }
    if (user.id === "u-mentor") {
      return { ...user, name: "오경희", role: "MENTOR" as const };
    }
    if (user.id === "u-001" || user.id === "u-002") {
      return { ...user, role: "GRAD_STUDENT" as const };
    }
    if (user.id === "u-003" || user.id === "u-004") {
      return { ...user, role: "INTERN" as const };
    }
    return {
      ...user,
      role: legacyRole === "ADMIN" ? "OWNER" as const : legacyRole === "STUDENT" ? "INTERN" as const : user.role,
    };
  });
  const existingIds = new Set(normalized.map((user) => user.id));
  const missingDemoUsers = seedData.users.filter((user) => !existingIds.has(user.id));
  return [...normalized, ...missingDemoUsers];
}

export const repository: AppRepository = {
  load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seedData));
      return clone(seedData);
    }
    const data = normalizeAppData(JSON.parse(raw) as AppData);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data;
  },
  save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },
  reset() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedData));
    return clone(seedData);
  },
  updateAssignment(id, patch) {
    const data = this.load();
    data.assignments = data.assignments.map((assignment) =>
      assignment.id === id ? { ...assignment, ...patch } : assignment,
    );
    this.save(data);
    return data;
  },
  upsertReflection(reflection) {
    const data = this.load();
    const exists = data.reflections.some((item) => item.id === reflection.id);
    data.reflections = exists
      ? data.reflections.map((item) => (item.id === reflection.id ? reflection : item))
      : [reflection, ...data.reflections];
    this.save(data);
    return data;
  },
  upsertMentorNote(note) {
    const data = this.load();
    const exists = data.mentorNotes.some((item) => item.id === note.id);
    data.mentorNotes = exists
      ? data.mentorNotes.map((item) => (item.id === note.id ? note : item))
      : [note, ...data.mentorNotes];
    this.save(data);
    return data;
  },
  upsertWeeklyReport(report) {
    const data = this.load();
    const exists = data.weeklyReports.some((item) => item.id === report.id);
    data.weeklyReports = exists
      ? data.weeklyReports.map((item) => (item.id === report.id ? report : item))
      : [report, ...data.weeklyReports];
    this.save(data);
    return data;
  },
};
