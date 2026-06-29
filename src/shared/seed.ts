import type { AppData } from "../entities";
import { todayKey } from "./date";

const today = todayKey();
const currentWeek = getSeedWeekRange(today);

export const seedData: AppData = {
  users: [
    { id: "u-owner", email: "owner@lab.local", name: "박지찬", role: "OWNER" },
    { id: "u-mentor", email: "mentor@lab.local", name: "오경희", role: "MENTOR" },
    { id: "u-001", email: "minseo@lab.local", name: "김민서", role: "GRAD_STUDENT" },
    { id: "u-002", email: "jiho@lab.local", name: "이지호", role: "GRAD_STUDENT" },
    { id: "u-003", email: "sua@lab.local", name: "박수아", role: "INTERN" },
    { id: "u-004", email: "hyun@lab.local", name: "최도현", role: "INTERN" },
  ],
  students: [
    {
      id: "s-001",
      userId: "u-001",
      affiliation: "서울대학교",
      major: "생명정보학",
      mentorName: "정연구",
      internshipStartDate: "2026-06-01",
      internshipEndDate: "2026-08-28",
      status: "ACTIVE",
    },
    {
      id: "s-002",
      userId: "u-002",
      affiliation: "카이스트",
      major: "기계공학",
      mentorName: "정연구",
      internshipStartDate: "2026-06-10",
      internshipEndDate: "2026-08-30",
      status: "ACTIVE",
    },
    {
      id: "s-003",
      userId: "u-003",
      affiliation: "연세대학교",
      major: "컴퓨터과학",
      mentorName: "한멘토",
      internshipStartDate: "2026-06-15",
      internshipEndDate: "2026-09-05",
      status: "ACTIVE",
    },
    {
      id: "s-004",
      userId: "u-004",
      affiliation: "고려대학교",
      major: "화학공학",
      mentorName: "한멘토",
      internshipStartDate: "2026-06-20",
      internshipEndDate: "2026-09-12",
      status: "ACTIVE",
    },
  ],
  missions: [
    {
      id: "m-001",
      title: "연구실 안전 수칙 확인",
      description: "실험실 출입, 장비 사용, 비상 대응 절차를 확인하고 핵심 내용을 정리합니다.",
      category: "안전",
      orderIndex: 1,
    },
    {
      id: "m-002",
      title: "오늘의 세미나 관찰",
      description: "세미나에서 다뤄진 연구 질문, 방법론, 한계를 각각 하나씩 기록합니다.",
      category: "관찰",
      orderIndex: 2,
    },
    {
      id: "m-003",
      title: "논문 이해하고, 아이디어 생각하기",
      description: "지정 논문을 읽고 핵심 주장, 연구 방법, 한계를 이해한 뒤 내가 떠올린 후속 아이디어나 질문을 정리합니다.",
      category: "아이디어",
      orderIndex: 3,
    },
    {
      id: "m-004",
      title: "멘토에게 질문 1개 준비",
      description: "오늘 활동에서 이해되지 않은 점이나 더 깊게 알고 싶은 질문을 작성합니다.",
      category: "질문",
      orderIndex: 4,
    },
  ],
  assignments: [
    { id: "a-001", studentId: "s-001", missionId: "m-001", assignedDate: today, status: "DONE", note: "비상 샤워 위치와 보호구 보관 위치를 확인함", checkedAt: new Date().toISOString() },
    { id: "a-002", studentId: "s-001", missionId: "m-002", assignedDate: today, status: "TODO", note: "" },
    { id: "a-003", studentId: "s-001", missionId: "m-003", assignedDate: today, status: "TODO", note: "" },
    { id: "a-004", studentId: "s-002", missionId: "m-001", assignedDate: today, status: "DONE", note: "안전교육 자료 확인", checkedAt: new Date().toISOString() },
    { id: "a-005", studentId: "s-002", missionId: "m-004", assignedDate: today, status: "DONE", note: "장비 캘리브레이션 기준을 질문으로 정리", checkedAt: new Date().toISOString() },
    { id: "a-006", studentId: "s-003", missionId: "m-002", assignedDate: today, status: "TODO", note: "" },
    { id: "a-007", studentId: "s-003", missionId: "m-003", assignedDate: today, status: "TODO", note: "" },
    { id: "a-008", studentId: "s-004", missionId: "m-001", assignedDate: today, status: "DONE", note: "출입 절차 확인", checkedAt: new Date().toISOString() },
    { id: "a-009", studentId: "s-004", missionId: "m-002", assignedDate: today, status: "DONE", note: "세미나 질문 2개 기록", checkedAt: new Date().toISOString() },
    { id: "a-010", studentId: "s-004", missionId: "m-004", assignedDate: today, status: "TODO", note: "" },
  ],
  reflections: [
    {
      id: "r-001",
      studentId: "s-001",
      reflectionDate: today,
      todayWork: "연구실 안전 수칙을 확인하고 세미나에서 연구 질문과 실험 설계의 관계를 메모했다.",
      tomorrowPlan: "세미나에서 나온 가설 하나를 골라 변수, 비교 기준, 예상 한계로 나누어 정리한다.",
      observed: "세미나에서 연구 질문이 실험 설계보다 먼저 명확해져야 한다는 점을 보았다.",
      learned: "좋은 실험은 장비보다 가설과 비교 기준에서 시작된다는 점을 배웠다.",
      importance: "같은 데이터를 얻어도 질문이 다르면 해석이 달라지기 때문에 중요하다.",
      question: "가설이 너무 넓을 때 연구실에서는 어떤 기준으로 좁히는가?",
      aiFeedback: "관찰과 중요성 연결이 좋습니다. 다음 회고에서는 실제 사례 하나를 더 붙이면 더 깊어집니다.",
      updatedAt: new Date().toISOString(),
    },
  ],
  mentorNotes: [
    {
      id: "n-001",
      studentId: "s-001",
      authorId: "u-mentor",
      type: "DAILY_MENTOR",
      noteDate: today,
      content: "내일은 세미나에서 나온 연구 질문을 하나 골라 변수와 비교 기준으로 나누어 보도록 안내.",
      createdAt: new Date().toISOString(),
    },
    {
      id: "n-002",
      studentId: "s-001",
      authorId: "u-owner",
      type: "WEEKLY_OWNER",
      noteDate: today,
      weekStartDate: currentWeek.start,
      weekEndDate: currentWeek.end,
      content: "이번 주는 연구 질문을 이해하는 단계에 집중하고, 다음 주에는 관심 주제를 하나 골라 작은 탐색 과제로 이어가면 좋겠습니다.",
      createdAt: new Date().toISOString(),
    },
  ],
  weeklyReports: [
    {
      id: "w-001",
      studentId: "s-001",
      weekStartDate: currentWeek.start,
      weekEndDate: currentWeek.end,
      summary: "이번 주에는 연구 질문이 실험 설계의 방향을 정한다는 점을 여러 활동에서 확인했다.",
      suggestions: "처음 보는 장비나 용어가 많아서, 초반 학생용 용어집이 있으면 적응이 더 빠를 것 같다.",
      wantsToTry: "다음 주에는 세미나에서 나온 가설 하나를 직접 변수와 비교 기준으로 나누어 보고 싶다.",
      newInterests: "연구 질문을 좁히는 과정과 데이터 해석 기준에 새로 관심이 생겼다.",
      impressiveMaterials: "세미나에서 본 실험 설계 비교표가 인상 깊었다. 같은 데이터도 기준에 따라 해석이 달라지는 점이 잘 보였다.",
      nextWeekPlan: "논문 초록을 읽을 때 연구 목적, 비교 기준, 한계를 따로 표시해볼 계획이다.",
      updatedAt: new Date().toISOString(),
    },
  ],
  meetingNotices: [
    {
      id: "meet-001",
      title: "주간 인턴 성장 회의",
      meetingDate: currentWeek.end,
      startTime: "10:00",
      endTime: "10:40",
      location: "본관 3층 세미나실",
      agenda: "이번 주 관찰 내용, 새로 생긴 관심 분야, 다음 주 자기주도 목표를 함께 공유합니다.",
      createdBy: "u-owner",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pinned: true,
    },
  ],
  presentationFiles: [],
  signupRequests: [],
};

function getSeedWeekRange(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const weekday = date.getDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  const start = new Date(year, month - 1, day + mondayOffset);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  return {
    start: toSeedDateKey(start),
    end: toSeedDateKey(end),
  };
}

function toSeedDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
