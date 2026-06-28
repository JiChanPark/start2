import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  BarChart3,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  HelpCircle,
  History,
  LogOut,
  MessageSquareText,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import type { AppData, MeetingNotice, MentorNote, MissionAssignment, Reflection, StudentProfile, User, WeeklyReport } from "../entities";
import { mockAiTutor } from "../features/ai/mockAiTutor";
import { cloudRepository } from "../shared/cloudStorage";
import { formatDate, todayKey } from "../shared/date";
import { repository } from "../shared/storage";

type View = "dashboard" | "students" | "student-detail" | "student-home" | "reflection" | "weekly-report" | "history";

interface CreateStudentInput {
  name: string;
  email: string;
  role: "GRAD_STUDENT" | "INTERN";
  affiliation: string;
  major: string;
  mentorName: string;
  internshipStartDate: string;
  internshipEndDate: string;
}

interface UpdateStudentInput extends CreateStudentInput {
  status: StudentProfile["status"];
}

const today = todayKey();

export function App() {
  const [data, setData] = useState<AppData>(() => repository.load());
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<View>("dashboard");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>("s-001");
  const [helpOpen, setHelpOpen] = useState(false);
  const [cloudSync, setCloudSync] = useState({
    enabled: cloudRepository.enabled,
    ready: !cloudRepository.enabled,
    label: cloudRepository.enabled ? "DB 연결 확인 중" : "로컬 저장 모드",
  });

  const currentStudent = data.students.find((student) => student.userId === currentUser?.id);
  const selectedStudent = data.students.find((student) => student.id === selectedStudentId) ?? data.students[0];

  useEffect(() => {
    let cancelled = false;

    if (!cloudRepository.enabled) return;

    cloudRepository
      .load()
      .then((remoteData) => {
        if (cancelled) return;
        if (remoteData) {
          repository.save(remoteData);
          setData(remoteData);
          setCloudSync({ enabled: true, ready: true, label: "공용 DB 동기화됨" });
          return;
        }
        setCloudSync({ enabled: true, ready: true, label: "공용 DB 초기화 준비됨" });
      })
      .catch(() => {
        if (!cancelled) {
          setCloudSync({ enabled: true, ready: false, label: "DB 연결 실패 - 로컬 저장 중" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!cloudSync.enabled || !cloudSync.ready) return;

    const handle = window.setTimeout(() => {
      cloudRepository
        .save(data)
        .then(() => setCloudSync((current) => ({ ...current, label: "공용 DB 저장 완료" })))
        .catch(() => setCloudSync((current) => ({ ...current, label: "DB 저장 실패 - 로컬 저장 유지" })));
    }, 650);

    return () => window.clearTimeout(handle);
  }, [data, cloudSync.enabled, cloudSync.ready]);

  const login = (userId: string) => {
    const user = data.users.find((item) => item.id === userId);
    if (!user) return;

    setCurrentUser(user);
    if (isStaffRole(user.role)) {
      setView("dashboard");
      setSelectedStudentId(data.students[0]?.id ?? null);
      return;
    }

    setView("student-home");
    setSelectedStudentId(data.students.find((student) => student.userId === user.id)?.id ?? null);
  };

  const updateAssignment = (id: string, patch: Partial<MissionAssignment>) => {
    setData(repository.updateAssignment(id, patch));
  };

  const saveReflection = (reflection: Reflection) => {
    setData(repository.upsertReflection(reflection));
  };

  const saveMentorNote = (note: MentorNote) => {
    setData(repository.upsertMentorNote(note));
  };

  const saveWeeklyReport = (report: WeeklyReport) => {
    setData(repository.upsertWeeklyReport(report));
  };

  const saveMeetingNotice = (notice: MeetingNotice) => {
    const exists = data.meetingNotices.some((item) => item.id === notice.id);
    const nextData: AppData = {
      ...data,
      meetingNotices: exists
        ? data.meetingNotices.map((item) => (item.id === notice.id ? notice : item))
        : [notice, ...data.meetingNotices],
    };
    repository.save(nextData);
    setData(nextData);
  };

  const deleteMeetingNotice = (id: string) => {
    const nextData: AppData = {
      ...data,
      meetingNotices: data.meetingNotices.filter((notice) => notice.id !== id),
    };
    repository.save(nextData);
    setData(nextData);
  };

  const assignMission = (studentId: string, missionId: string, assignedDate: string) => {
    const alreadyAssigned = data.assignments.some(
      (assignment) =>
        assignment.studentId === studentId &&
        assignment.missionId === missionId &&
        assignment.assignedDate === assignedDate,
    );
    if (alreadyAssigned) return;

    const nextData: AppData = {
      ...data,
      assignments: [
        ...data.assignments,
        {
          id: `a-${crypto.randomUUID()}`,
          studentId,
          missionId,
          assignedDate,
          status: "TODO",
          note: "",
          selfGoal: "",
          achievementRate: 0,
          selfEvaluation: "",
        },
      ],
    };
    repository.save(nextData);
    setData(nextData);
  };

  const createStudent = (input: CreateStudentInput) => {
    const userId = `u-${crypto.randomUUID()}`;
    const studentId = `s-${crypto.randomUUID()}`;
    const nextData: AppData = {
      ...data,
      users: [
        ...data.users,
        {
          id: userId,
          email: input.email,
          name: input.name,
          role: input.role,
        },
      ],
      students: [
        ...data.students,
        {
          id: studentId,
          userId,
          affiliation: input.affiliation,
          major: input.major,
          mentorName: input.mentorName,
          internshipStartDate: input.internshipStartDate,
          internshipEndDate: input.internshipEndDate,
          status: "ACTIVE",
        },
      ],
      assignments: [
        ...data.assignments,
        ...data.missions.map((mission) => ({
          id: `a-${crypto.randomUUID()}`,
          studentId,
          missionId: mission.id,
          assignedDate: today,
          status: "TODO" as const,
          note: "",
          selfGoal: "",
          achievementRate: 0,
          selfEvaluation: "",
        })),
      ],
    };
    repository.save(nextData);
    setData(nextData);
    setSelectedStudentId(studentId);
    setView("student-detail");
  };

  const updateStudent = (studentId: string, input: UpdateStudentInput) => {
    const student = data.students.find((item) => item.id === studentId);
    if (!student) return;

    const nextData: AppData = {
      ...data,
      users: data.users.map((user) =>
        user.id === student.userId
          ? { ...user, email: input.email, name: input.name, role: input.role }
          : user,
      ),
      students: data.students.map((item) =>
        item.id === studentId
          ? {
              ...item,
              affiliation: input.affiliation,
              major: input.major,
              mentorName: input.mentorName,
              internshipStartDate: input.internshipStartDate,
              internshipEndDate: input.internshipEndDate,
              status: input.status,
            }
          : item,
      ),
    };
    repository.save(nextData);
    setData(nextData);
  };

  const deleteStudent = (studentId: string) => {
    const student = data.students.find((item) => item.id === studentId);
    if (!student) return;

    const nextStudents = data.students.filter((item) => item.id !== studentId);
    const nextSelectedStudentId = selectedStudentId === studentId ? nextStudents[0]?.id ?? null : selectedStudentId;
    const nextData: AppData = {
      ...data,
      users: data.users.filter((user) => user.id !== student.userId),
      students: nextStudents,
      assignments: data.assignments.filter((assignment) => assignment.studentId !== studentId),
      reflections: data.reflections.filter((reflection) => reflection.studentId !== studentId),
      mentorNotes: data.mentorNotes.filter((note) => note.studentId !== studentId),
      weeklyReports: data.weeklyReports.filter((report) => report.studentId !== studentId),
    };
    repository.save(nextData);
    setData(nextData);
    setSelectedStudentId(nextSelectedStudentId);
    if (!nextSelectedStudentId) setView("students");
  };

  const exportData = () => {
    const csv = buildStudentExportCsv(data);
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `research-intern-students-${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importData = async (file: File) => {
    const text = await file.text();
    const imported = JSON.parse(text) as AppData;
    repository.save(imported);
    setData(repository.load());
  };

  if (!currentUser) {
    return <LoginScreen data={data} onLogin={login} />;
  }

  const isStaff = isStaffRole(currentUser.role);

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark">RI</div>
          <div>
            <strong>Intern Growth</strong>
            <span>Research MVP</span>
          </div>
        </div>

        <nav className="navList">
          {isStaff ? (
            <>
              <button className={view === "dashboard" ? "active" : ""} onClick={() => setView("dashboard")}>
                <BarChart3 size={18} /> 대시보드
              </button>
              <button className={view === "students" || view === "student-detail" ? "active" : ""} onClick={() => setView("students")}>
                <Users size={18} /> 학생 목록
              </button>
            </>
          ) : (
            <>
              <button className={view === "student-home" ? "active" : ""} onClick={() => setView("student-home")}>
                <ClipboardList size={18} /> 오늘 목표
              </button>
              <button className={view === "reflection" ? "active" : ""} onClick={() => setView("reflection")}>
                <BookOpenCheck size={18} /> 회고 작성
              </button>
              <button className={view === "weekly-report" ? "active" : ""} onClick={() => setView("weekly-report")}>
                <FileText size={18} /> 주간 보고서
              </button>
              <button className={view === "history" ? "active" : ""} onClick={() => setView("history")}>
                <History size={18} /> 나의 기록
              </button>
            </>
          )}
        </nav>

        <div className="sidebarFooter">
          <button className="ghostButton" onClick={() => setCurrentUser(null)}>
            <LogOut size={16} /> 로그아웃
          </button>
          {isStaff && (
            <DataPortabilityControls onExport={exportData} onImport={importData} />
          )}
          <span className={cloudSync.enabled && cloudSync.ready ? "cloudBadge connected" : "cloudBadge"}>
            {cloudSync.label}
          </span>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <p>{formatDate(today)}</p>
            <h1>{isStaff ? "관리자 화면" : `${currentUser.name}님의 인턴 기록`}</h1>
          </div>
          <span className="roleBadge">{getRoleLabel(currentUser.role)}</span>
          <button className="helpButton" onClick={() => setHelpOpen(true)} aria-label="도움말 열기">
            <HelpCircle size={18} /> 도움말
          </button>
        </header>

        {isStaff && view === "dashboard" && (
          <AdminDashboard
            data={data}
            currentUser={currentUser}
            onSaveMeetingNotice={saveMeetingNotice}
            onDeleteMeetingNotice={deleteMeetingNotice}
            onSelect={(id) => {
              setSelectedStudentId(id);
              setView("student-detail");
            }}
          />
        )}
        {isStaff && view === "students" && (
          <StudentList
            data={data}
            onCreateStudent={createStudent}
            onUpdateStudent={updateStudent}
            onDeleteStudent={deleteStudent}
            onSelect={(id) => {
              setSelectedStudentId(id);
              setView("student-detail");
            }}
          />
        )}
        {isStaff && view === "student-detail" && selectedStudent && currentUser && (
          <StudentDetail
            data={data}
            student={selectedStudent}
            currentUser={currentUser}
            onAssignMission={assignMission}
            onSaveMentorNote={saveMentorNote}
          />
        )}
        {!isStaff && currentStudent && view === "student-home" && (
          <StudentHome
            data={data}
            student={currentStudent}
            currentUser={currentUser}
            onUpdateAssignment={updateAssignment}
            onSaveMeetingNotice={saveMeetingNotice}
            onDeleteMeetingNotice={deleteMeetingNotice}
          />
        )}
        {!isStaff && currentStudent && view === "reflection" && (
          <ReflectionEditor data={data} student={currentStudent} onSave={saveReflection} />
        )}
        {!isStaff && currentStudent && view === "weekly-report" && (
          <WeeklyReportEditor data={data} student={currentStudent} onSave={saveWeeklyReport} />
        )}
        {!isStaff && currentStudent && view === "history" && <StudentHistory data={data} student={currentStudent} />}
      </main>
      {helpOpen && <HelpPanel role={currentUser.role} view={view} onClose={() => setHelpOpen(false)} />}
    </div>
  );
}

function LoginScreen({ data, onLogin }: { data: AppData; onLogin: (userId: string) => void }) {
  const users = [...data.users].sort((a, b) => getRoleOrder(a.role) - getRoleOrder(b.role));
  const [email, setEmail] = useState(users[0]?.email ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const demoPassword = "demo123";

  const submitLogin = () => {
    const user = users.find((item) => item.email.toLowerCase() === email.trim().toLowerCase());
    if (!user || password !== demoPassword) {
      setError("이메일 또는 비밀번호를 확인해 주세요. MVP 데모 비밀번호는 demo123입니다.");
      return;
    }
    setError("");
    onLogin(user.id);
  };

  return (
    <main className="loginScreen">
      <section className="loginPanel">
        <div className="loginCopy">
          <span className="eyebrow">Research Intern Growth MVP</span>
          <h1>연구 인턴의 성장을 기록하고 피드백하는 교육 플랫폼</h1>
          <p>미션, 일일 회고, 주간 보고서, 멘토/활용책임자 피드백을 한곳에서 관리합니다.</p>
        </div>
        <div className="loginBox">
          <h2>로그인</h2>
          <p className="loginHelp">역할별 권한을 확인할 수 있도록 이메일과 비밀번호 방식으로 바꿨습니다. 데모 비밀번호는 <b>demo123</b>입니다.</p>
          <div className="loginForm">
            <label>
              <span>이메일</span>
              <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="owner@lab.local" />
            </label>
            <label>
              <span>비밀번호</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") submitLogin();
                }}
                placeholder="demo123"
              />
            </label>
            {error && <p className="errorText">{error}</p>}
            <button className="primaryButton" onClick={submitLogin}>로그인</button>
          </div>
          <div className="accountList compactAccounts">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => {
                  setEmail(user.email);
                  setPassword(demoPassword);
                  setError("");
                }}
              >
                <span>{user.name}</span>
                <small>{getRoleLabel(user.role)} · {user.email}</small>
              </button>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function DataPortabilityControls({ onExport, onImport }: { onExport: () => void; onImport: (file: File) => void }) {
  return (
    <div className="dataTools">
      <button className="ghostButton" onClick={onExport}>
        CSV 내보내기
      </button>
      <label className="ghostButton importButton">
        JSON 가져오기
        <input
          type="file"
          accept="application/json"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onImport(file);
            event.currentTarget.value = "";
          }}
        />
      </label>
    </div>
  );
}

function HelpPanel({ role, view, onClose }: { role: User["role"]; view: View; onClose: () => void }) {
  const isStaff = isStaffRole(role);
  const screenTips = getScreenHelp(view);

  return (
    <div className="helpOverlay" role="dialog" aria-modal="true" aria-label="도움말">
      <aside className="helpPanel">
        <div className="helpHeader">
          <div>
            <span className="eyebrow">Guide</span>
            <h2>이 앱을 쓰는 방법</h2>
          </div>
          <button className="iconButton" onClick={onClose} aria-label="도움말 닫기">
            <X size={18} />
          </button>
        </div>

        <section className="helpSection">
          <h3>{isStaff ? `${getRoleLabel(role)} 빠른 흐름` : `${getRoleLabel(role)} 빠른 흐름`}</h3>
          <ol>
            {(isStaff ? [
              "대시보드에서 주의 사유가 있는 학생을 먼저 확인합니다.",
              "학생 상세에서 오늘 목표, 회고, 주간 보고서를 함께 봅니다.",
              "다음 행동이나 질문을 관리자 피드백으로 남깁니다.",
            ] : [
              "오늘 목표를 세우고 달성도와 배운 점을 남깁니다.",
              "회고에는 오늘 수행 내용, 내일 계획, 본 것, 배운 것, 남은 질문을 적습니다.",
              "주간 보고서에는 새 관심, 해보고 싶은 일, 건의사항을 정리합니다.",
            ]).map((item) => <li key={item}>{item}</li>)}
          </ol>
        </section>

        <section className="helpSection">
          <h3>현재 화면 팁</h3>
          <ul>
            {screenTips.map((tip) => <li key={tip}>{tip}</li>)}
          </ul>
        </section>

        <section className="helpSection calloutHelp">
          <h3>좋은 기록의 기준</h3>
          <p>짧아도 괜찮습니다. 다만 “무엇을 봤는지”, “무엇을 이해했는지”, “다음에 무엇을 해보고 싶은지”가 남으면 성장 기록으로 쓸 수 있습니다.</p>
        </section>
      </aside>
    </div>
  );
}

function MeetingNoticePanel({
  notices,
  currentUser,
  editable = false,
  onSave,
  onDelete,
}: {
  notices: MeetingNotice[];
  currentUser?: User;
  editable?: boolean;
  onSave?: (notice: MeetingNotice) => void;
  onDelete?: (id: string) => void;
}) {
  const upcomingNotices = [...notices].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return `${a.meetingDate} ${a.startTime}`.localeCompare(`${b.meetingDate} ${b.startTime}`);
  });
  const [form, setForm] = useState({
    title: "주간 인턴 성장 회의",
    meetingDate: today,
    startTime: "10:00",
    endTime: "10:40",
    location: "",
    agenda: "",
    pinned: true,
  });
  const canSave = Boolean(form.title.trim() && form.meetingDate && form.startTime && form.location.trim());
  const canManageAll = currentUser ? isStaffRole(currentUser.role) : false;

  return (
    <section className="panel meetingPanel">
      <SectionTitle icon={<CalendarDays size={18} />} title="주간 회의 일정 공유" />
      <div className="noticeGrid">
        <div className="noticeList">
          {upcomingNotices.length ? upcomingNotices.map((notice) => {
            const author = currentUser?.id === notice.createdBy ? currentUser : undefined;
            const canDelete = editable && (canManageAll || currentUser?.id === notice.createdBy);
            return (
              <article className={notice.pinned ? "noticeCard pinnedNotice" : "noticeCard"} key={notice.id}>
                <div>
                  <span className="noticeDate">{formatDate(notice.meetingDate)} · {notice.startTime} - {notice.endTime}</span>
                  <h3>{notice.title}</h3>
                  <p><b>장소:</b> {notice.location}</p>
                  <p>{notice.agenda}</p>
                  <small className="noticeMeta">{author ? `${author.name} 신청` : "공유된 일정"}</small>
                </div>
                {canDelete && (
                  <button className="secondaryButton" onClick={() => onDelete?.(notice.id)}>
                    삭제
                  </button>
                )}
              </article>
            );
          }) : <p className="empty">아직 공유된 주간 회의 일정이 없습니다.</p>}
        </div>

        {editable && currentUser && (
          <div className="noticeComposer">
            <strong>{canManageAll ? "새 회의 공지 작성" : "회의 일정 신청"}</strong>
            <input placeholder="회의 제목" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            <div className="noticeTimeGrid">
              <input type="date" value={form.meetingDate} onChange={(event) => setForm({ ...form, meetingDate: event.target.value })} />
              <input type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} />
              <input type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} />
            </div>
            <input placeholder="장소 예: 본관 3층 세미나실" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} />
            <textarea
              placeholder="안건 또는 준비할 내용"
              value={form.agenda}
              onChange={(event) => setForm({ ...form, agenda: event.target.value })}
              rows={4}
            />
            {canManageAll && (
              <label className="pinToggle">
                <input type="checkbox" checked={form.pinned} onChange={(event) => setForm({ ...form, pinned: event.target.checked })} />
                상단 고정 공유
              </label>
            )}
            <button
              className="primaryButton"
              disabled={!canSave}
              onClick={() => {
                onSave?.({
                  id: `meet-${crypto.randomUUID()}`,
                  title: form.title.trim(),
                  meetingDate: form.meetingDate,
                  startTime: form.startTime,
                  endTime: form.endTime,
                  location: form.location.trim(),
                  agenda: form.agenda.trim() || "회의 전까지 이번 주 목표 달성도와 질문을 정리해 주세요.",
                  createdBy: currentUser.id,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  pinned: canManageAll ? form.pinned : false,
                });
                setForm({
                  title: "주간 인턴 성장 회의",
                  meetingDate: today,
                  startTime: "10:00",
                  endTime: "10:40",
                  location: "",
                  agenda: "",
                  pinned: true,
                });
              }}
            >
              {canManageAll ? "회의 공지 공유" : "회의 일정 신청"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function AdminDashboard({
  data,
  currentUser,
  onSelect,
  onSaveMeetingNotice,
  onDeleteMeetingNotice,
}: {
  data: AppData;
  currentUser: User;
  onSelect: (id: string) => void;
  onSaveMeetingNotice: (notice: MeetingNotice) => void;
  onDeleteMeetingNotice: (id: string) => void;
}) {
  const todayAssignments = data.assignments.filter((item) => item.assignedDate === today);
  const completed = todayAssignments.filter((item) => item.status === "DONE").length;
  const reflectionCount = data.reflections.filter((item) => item.reflectionDate === today).length;
  const reportCount = data.weeklyReports.length;
  const completionRate = todayAssignments.length
    ? Math.round(todayAssignments.reduce((sum, item) => sum + (item.achievementRate ?? (item.status === "DONE" ? 100 : 0)), 0) / todayAssignments.length)
    : 0;

  return (
    <div className="stack">
      <MeetingNoticePanel
        notices={data.meetingNotices}
        currentUser={currentUser}
        editable
        onSave={onSaveMeetingNotice}
        onDelete={onDeleteMeetingNotice}
      />
      <section className="metricGrid">
        <Metric title="전체 학생" value={`${data.students.length}명`} />
        <Metric title="오늘 목표 달성도" value={`${completionRate}%`} />
        <Metric title="주간 보고서" value={`${reportCount}건`} />
      </section>
      <section className="panel">
        <SectionTitle icon={<BarChart3 size={18} />} title="성장 대시보드" />
        <div className="growthGrid">
          {data.students.map((student) => {
            const user = getUser(data, student);
            const snapshot = getGrowthSnapshot(data, student.id);
            return (
              <button className="growthCard" key={student.id} onClick={() => onSelect(student.id)}>
                <div>
                  <strong>{user.name}</strong>
                  <span>{getRoleLabel(user.role)} · {student.major}</span>
                </div>
                <ProgressBar value={snapshot.missionRate} />
                <dl>
                  <div><dt>미션</dt><dd>{snapshot.missionRate}%</dd></div>
                  <div><dt>회고</dt><dd>{snapshot.reflectionCount}건</dd></div>
                  <div><dt>보고서</dt><dd>{snapshot.weeklyReportCount}건</dd></div>
                  <div><dt>피드백</dt><dd>{snapshot.feedbackCount}건</dd></div>
                </dl>
                <small>{snapshot.latestInterest}</small>
              </button>
            );
          })}
        </div>
      </section>
      <section className="panel">
        <SectionTitle icon={<AlertTriangle size={18} />} title="주의 깊게 볼 학생" />
        <div className="studentRows">
          {data.students.map((student) => {
            const progress = getProgress(data, student.id);
            const user = getUser(data, student);
            const reasons = getRiskReasons(data, student.id);
            return (
              <button className="studentRow expanded" key={student.id} onClick={() => onSelect(student.id)}>
                <div>
                  <strong>{user.name}</strong>
                  <span>{student.major} · {student.affiliation}</span>
                  <small>{reasons.length ? reasons.join(" · ") : "오늘 흐름 양호"}</small>
                </div>
                <ProgressBar value={progress.rate} />
                <span className={reasons.length ? "riskBadge" : "okBadge"}>{progress.rate}%</span>
              </button>
            );
          })}
        </div>
      </section>
      <section className="panel">
        <SectionTitle icon={<BookOpenCheck size={18} />} title="오늘 회고 작성 현황" />
        <p className="sectionHint">오늘 회고 작성 학생: {reflectionCount}명</p>
      </section>
    </div>
  );
}

function StudentList({
  data,
  onSelect,
  onCreateStudent,
  onUpdateStudent,
  onDeleteStudent,
}: {
  data: AppData;
  onSelect: (id: string) => void;
  onCreateStudent: (input: CreateStudentInput) => void;
  onUpdateStudent: (studentId: string, input: UpdateStudentInput) => void;
  onDeleteStudent: (studentId: string) => void;
}) {
  const emptyForm: CreateStudentInput = {
    name: "",
    email: "",
    role: "INTERN",
    affiliation: "",
    major: "",
    mentorName: "오경희",
    internshipStartDate: today,
    internshipEndDate: today,
  };
  const [form, setForm] = useState<CreateStudentInput>(emptyForm);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<UpdateStudentInput>({ ...emptyForm, status: "ACTIVE" });
  const canCreate = Boolean(form.name.trim() && form.email.trim() && form.affiliation.trim() && form.major.trim());
  const canUpdate = Boolean(editForm.name.trim() && editForm.email.trim() && editForm.affiliation.trim() && editForm.major.trim());

  const startEdit = (student: StudentProfile) => {
    const user = getUser(data, student);
    setEditingStudentId(student.id);
    setEditForm({
      name: user.name,
      email: user.email,
      role: user.role === "GRAD_STUDENT" ? "GRAD_STUDENT" : "INTERN",
      affiliation: student.affiliation,
      major: student.major,
      mentorName: student.mentorName,
      internshipStartDate: student.internshipStartDate,
      internshipEndDate: student.internshipEndDate,
      status: student.status,
    });
  };

  return (
    <div className="stack">
      <section className="panel">
        <SectionTitle icon={<Users size={18} />} title="학생 추가" />
        <div className="studentForm">
          <input placeholder="이름" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <input placeholder="이메일" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as CreateStudentInput["role"] })}>
            <option value="GRAD_STUDENT">학연생</option>
            <option value="INTERN">인턴</option>
          </select>
          <input placeholder="소속" value={form.affiliation} onChange={(event) => setForm({ ...form, affiliation: event.target.value })} />
          <input placeholder="전공" value={form.major} onChange={(event) => setForm({ ...form, major: event.target.value })} />
          <input placeholder="멘토명" value={form.mentorName} onChange={(event) => setForm({ ...form, mentorName: event.target.value })} />
          <input type="date" value={form.internshipStartDate} onChange={(event) => setForm({ ...form, internshipStartDate: event.target.value })} />
          <input type="date" value={form.internshipEndDate} onChange={(event) => setForm({ ...form, internshipEndDate: event.target.value })} />
          <button
            className="primaryButton"
            disabled={!canCreate}
            onClick={() => {
              onCreateStudent(form);
              setForm(emptyForm);
            }}
          >
            <CheckCircle2 size={16} /> 학생 추가
          </button>
        </div>
      </section>

      {editingStudentId && (
        <section className="panel editStudentPanel">
          <SectionTitle icon={<Users size={18} />} title="학생 정보 수정" />
          <div className="studentForm editStudentForm">
            <input placeholder="이름" value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} />
            <input placeholder="이메일" value={editForm.email} onChange={(event) => setEditForm({ ...editForm, email: event.target.value })} />
            <select value={editForm.role} onChange={(event) => setEditForm({ ...editForm, role: event.target.value as UpdateStudentInput["role"] })}>
              <option value="GRAD_STUDENT">학연생</option>
              <option value="INTERN">인턴</option>
            </select>
            <select value={editForm.status} onChange={(event) => setEditForm({ ...editForm, status: event.target.value as StudentProfile["status"] })}>
              <option value="ACTIVE">진행 중</option>
              <option value="PAUSED">일시 중지</option>
              <option value="COMPLETED">수료</option>
            </select>
            <input placeholder="소속" value={editForm.affiliation} onChange={(event) => setEditForm({ ...editForm, affiliation: event.target.value })} />
            <input placeholder="전공" value={editForm.major} onChange={(event) => setEditForm({ ...editForm, major: event.target.value })} />
            <input placeholder="멘토명" value={editForm.mentorName} onChange={(event) => setEditForm({ ...editForm, mentorName: event.target.value })} />
            <input type="date" value={editForm.internshipStartDate} onChange={(event) => setEditForm({ ...editForm, internshipStartDate: event.target.value })} />
            <input type="date" value={editForm.internshipEndDate} onChange={(event) => setEditForm({ ...editForm, internshipEndDate: event.target.value })} />
            <div className="studentActionGroup formActions">
              <button
                className="primaryButton"
                disabled={!canUpdate}
                onClick={() => {
                  onUpdateStudent(editingStudentId, editForm);
                  setEditingStudentId(null);
                }}
              >
                저장
              </button>
              <button className="secondaryButton" onClick={() => setEditingStudentId(null)}>취소</button>
            </div>
          </div>
        </section>
      )}

      <section className="panel">
        <SectionTitle icon={<Users size={18} />} title="학생 목록" />
        <div className="studentRows">
          {data.students.map((student) => {
            const user = getUser(data, student);
            const progress = getProgress(data, student.id);
            const reasons = getRiskReasons(data, student.id);
            return (
              <article className="studentRow expanded managedStudentRow" key={student.id}>
                <button className="studentRowMain" onClick={() => onSelect(student.id)}>
                  <div>
                    <strong>{user.name}</strong>
                    <span>{student.mentorName} 멘토 · {student.internshipStartDate} 시작</span>
                    <small>{reasons.length ? reasons.join(" · ") : "오늘 흐름 양호"}</small>
                  </div>
                  <ProgressBar value={progress.rate} />
                  <span className="roleBadge">{student.status}</span>
                </button>
                <div className="studentActionGroup">
                  <button className="secondaryButton" onClick={() => startEdit(student)}>수정</button>
                  <button
                    className="dangerButton"
                    onClick={() => {
                      const confirmed = window.confirm(user.name + " 학생과 관련 기록을 삭제할까요? 이 작업은 되돌릴 수 없습니다.");
                      if (confirmed) onDeleteStudent(student.id);
                    }}
                  >
                    삭제
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function StudentDetail({
  data,
  student,
  currentUser,
  onAssignMission,
  onSaveMentorNote,
}: {
  data: AppData;
  student: StudentProfile;
  currentUser: User;
  onAssignMission: (studentId: string, missionId: string, assignedDate: string) => void;
  onSaveMentorNote: (note: MentorNote) => void;
}) {
  const user = getUser(data, student);
  const assignments = getTodayAssignments(data, student.id);
  const reflections = data.reflections.filter((item) => item.studentId === student.id);
  const dailyMentorNotes = data.mentorNotes.filter((item) => item.studentId === student.id && item.type === "DAILY_MENTOR");
  const weeklyOwnerNotes = data.mentorNotes.filter((item) => item.studentId === student.id && item.type === "WEEKLY_OWNER");
  const reports = data.weeklyReports.filter((item) => item.studentId === student.id);
  const [summary, setSummary] = useState("AI 요약을 생성하면 이 학생의 오늘 흐름을 간단히 정리합니다.");
  const [note, setNote] = useState("");
  const defaultFeedbackWeek = getWeekRange(today);
  const [feedbackWeekStartDate, setFeedbackWeekStartDate] = useState(defaultFeedbackWeek.start);
  const [feedbackWeekEndDate, setFeedbackWeekEndDate] = useState(defaultFeedbackWeek.end);
  const feedbackMode = currentUser.role === "OWNER" ? "WEEKLY_OWNER" : "DAILY_MENTOR";
  const [assignmentDate, setAssignmentDate] = useState(today);
  const [assignmentMissionId, setAssignmentMissionId] = useState(data.missions[0]?.id ?? "");
  const assignedForSelectedDate = data.assignments.filter(
    (assignment) => assignment.studentId === student.id && assignment.assignedDate === assignmentDate,
  );

  return (
    <div className="stack">
      <section className="profileHeader">
        <div>
          <h2>{user.name}</h2>
          <p>{student.affiliation} · {student.major} · {student.mentorName} 멘토</p>
        </div>
        <span className="roleBadge">{student.internshipStartDate} - {student.internshipEndDate}</span>
      </section>
      <section className="panel">
        <SectionTitle icon={<AlertTriangle size={18} />} title="오늘 주의 사유" />
        <div className="chipRow">
          {getRiskReasons(data, student.id).map((reason) => <span className="riskChip" key={reason}>{reason}</span>)}
          {!getRiskReasons(data, student.id).length && <span className="okChip">오늘 흐름 양호</span>}
        </div>
      </section>
      <section className="panel">
        <SectionTitle icon={<ClipboardList size={18} />} title="오늘 목표 달성 현황" />
        <MissionList data={data} assignments={assignments} readonly />
      </section>
      <section className="panel">
        <SectionTitle icon={<ClipboardList size={18} />} title="미션 배정 관리" />
        <div className="assignmentTool">
          <label>
            <span>배정일</span>
            <input type="date" value={assignmentDate} onChange={(event) => setAssignmentDate(event.target.value)} />
          </label>
          <label>
            <span>미션</span>
            <select value={assignmentMissionId} onChange={(event) => setAssignmentMissionId(event.target.value)}>
              {data.missions.map((mission) => (
                <option value={mission.id} key={mission.id}>{mission.title}</option>
              ))}
            </select>
          </label>
          <button
            className="primaryButton"
            disabled={!assignmentMissionId}
            onClick={() => onAssignMission(student.id, assignmentMissionId, assignmentDate)}
          >
            <CheckCircle2 size={16} /> 미션 배정
          </button>
        </div>
        <div className="assignedMissionList">
          {assignedForSelectedDate.length ? assignedForSelectedDate.map((assignment) => {
            const mission = data.missions.find((item) => item.id === assignment.missionId);
            return <span className="miniChip" key={assignment.id}>{mission?.title ?? "알 수 없는 미션"} · {assignment.status}</span>;
          }) : <p className="empty">선택한 날짜에 배정된 미션이 없습니다.</p>}
        </div>
      </section>
      <section className="panel">
        <SectionTitle icon={<MessageSquareText size={18} />} title={feedbackMode === "WEEKLY_OWNER" ? "활용책임자 주간 피드백" : "멘토 일일 피드백"} />
        <div className="noteComposer">
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={feedbackMode === "WEEKLY_OWNER" ? "이번 주 학생의 성장 방향, 운영 관찰, 다음 주 중점 사항을 적어주세요." : "오늘 학생에게 남길 다음 행동, 질문, 관찰 포인트를 적어주세요."}
          />
          <button
            className="primaryButton"
            disabled={!note.trim()}
            onClick={() => {
              onSaveMentorNote({
                id: `n-${crypto.randomUUID()}`,
                studentId: student.id,
                authorId: currentUser.id,
                type: feedbackMode,
                noteDate: today,
                weekStartDate: feedbackMode === "WEEKLY_OWNER" ? feedbackWeekStartDate : undefined,
                weekEndDate: feedbackMode === "WEEKLY_OWNER" ? feedbackWeekEndDate : undefined,
                content: note.trim(),
                createdAt: new Date().toISOString(),
              });
              setNote("");
            }}
          >
            <CheckCircle2 size={16} /> {feedbackMode === "WEEKLY_OWNER" ? "주간 피드백 저장" : "오늘 피드백 저장"}
          </button>
        </div>
        {feedbackMode === "WEEKLY_OWNER" && (
          <div className="dateRange compactRange">
            <label>
              <span>주 시작일</span>
              <input type="date" value={feedbackWeekStartDate} onChange={(event) => setFeedbackWeekStartDate(event.target.value)} />
            </label>
            <label>
              <span>주 종료일</span>
              <input type="date" value={feedbackWeekEndDate} onChange={(event) => setFeedbackWeekEndDate(event.target.value)} />
            </label>
          </div>
        )}
        <div className="noteList">
          <h3 className="subsectionTitle">멘토 일일 피드백</h3>
          {dailyMentorNotes.length ? dailyMentorNotes.map((item) => (
            <article className="noteCard" key={item.id}>
              <strong>{formatDate(item.noteDate)}</strong>
              <p>{item.content}</p>
            </article>
          )) : <p className="empty">아직 멘토 일일 피드백이 없습니다.</p>}
          <h3 className="subsectionTitle">활용책임자 주간 피드백</h3>
          {weeklyOwnerNotes.length ? weeklyOwnerNotes.map((item) => (
            <article className="noteCard" key={item.id}>
              <strong>{item.weekStartDate && item.weekEndDate ? `${formatDate(item.weekStartDate)} - ${formatDate(item.weekEndDate)}` : formatDate(item.noteDate)}</strong>
              <p>{item.content}</p>
            </article>
          )) : <p className="empty">아직 활용책임자 주간 피드백이 없습니다.</p>}
        </div>
      </section>
      <section className="panel">
        <SectionTitle icon={<FileText size={18} />} title="주간 보고서" />
        {reports.length ? reports.map((report) => (
          <article className="reportCard" key={report.id}>
            <strong>{formatDate(report.weekStartDate)} - {formatDate(report.weekEndDate)}</strong>
            <p>{report.summary}</p>
            <small>새 관심: {report.newInterests || "미작성"}</small>
          </article>
        )) : <p className="empty">아직 작성된 주간 보고서가 없습니다.</p>}
      </section>
      <section className="panel">
        <SectionTitle icon={<Sparkles size={18} />} title="관리자용 AI 진행 요약" />
        <p className="aiBox">{summary}</p>
        <button className="primaryButton" onClick={async () => setSummary(await mockAiTutor.summarizeProgress(assignments, reflections))}>
          <Sparkles size={16} /> mock AI 요약 생성
        </button>
      </section>
      <section className="panel">
        <SectionTitle icon={<BookOpenCheck size={18} />} title="회고 기록" />
        {reflections.length ? reflections.map((reflection) => (
          <article className="reflectionCard" key={reflection.id}>
            <strong>{formatDate(reflection.reflectionDate)}</strong>
            {reflection.todayWork && <p><b>오늘 수행:</b> {reflection.todayWork}</p>}
            {reflection.tomorrowPlan && <p><b>내일 계획:</b> {reflection.tomorrowPlan}</p>}
            <p>{reflection.observed}</p>
            <small>{reflection.aiFeedback}</small>
          </article>
        )) : <p className="empty">아직 작성된 회고가 없습니다.</p>}
      </section>
    </div>
  );
}

function StudentHome({
  data,
  student,
  currentUser,
  onUpdateAssignment,
  onSaveMeetingNotice,
  onDeleteMeetingNotice,
}: {
  data: AppData;
  student: StudentProfile;
  currentUser: User;
  onUpdateAssignment: (id: string, patch: Partial<MissionAssignment>) => void;
  onSaveMeetingNotice: (notice: MeetingNotice) => void;
  onDeleteMeetingNotice: (id: string) => void;
}) {
  const assignments = getTodayAssignments(data, student.id);
  return (
    <div className="stack">
      <MeetingNoticePanel
        notices={data.meetingNotices}
        currentUser={currentUser}
        editable
        onSave={onSaveMeetingNotice}
        onDelete={onDeleteMeetingNotice}
      />
      <section className="panel">
        <SectionTitle icon={<ClipboardList size={18} />} title="오늘의 자기주도 목표" />
        <p className="sectionHint">오늘 무엇을 해볼지 스스로 목표를 세우고, 마무리할 때 달성도와 자기평가를 남겨 주세요.</p>
        <MissionList data={data} assignments={assignments} onUpdateAssignment={onUpdateAssignment} />
      </section>
    </div>
  );
}

function ReflectionEditor({ data, student, onSave }: { data: AppData; student: StudentProfile; onSave: (reflection: Reflection) => void }) {
  const existing = data.reflections.find((item) => item.studentId === student.id && item.reflectionDate === today);
  const [form, setForm] = useState({
    todayWork: existing?.todayWork ?? "",
    tomorrowPlan: existing?.tomorrowPlan ?? "",
    observed: existing?.observed ?? "",
    learned: existing?.learned ?? "",
    importance: existing?.importance ?? "",
    question: existing?.question ?? "",
  });
  const [feedback, setFeedback] = useState(existing?.aiFeedback ?? "");
  const quality = analyzeReflection(form);
  const canSave = Object.values(form).some((value) => value.trim().length > 0);

  return (
    <section className="panel reflectionEditor">
      <SectionTitle icon={<BookOpenCheck size={18} />} title="오늘 회고 작성" />
      <div className="qualityPanel">
        <strong>회고 품질 점검</strong>
        <div className="chipRow">
          {quality.map((item) => (
            <span className={item.ok ? "okChip" : "riskChip"} key={item.label}>{item.label}</span>
          ))}
        </div>
      </div>
      <Field label="오늘 수행 내용" value={form.todayWork} onChange={(todayWork) => setForm({ ...form, todayWork })} />
      <Field label="내일 계획" value={form.tomorrowPlan} onChange={(tomorrowPlan) => setForm({ ...form, tomorrowPlan })} />
      <Field label="오늘 본 것" value={form.observed} onChange={(observed) => setForm({ ...form, observed })} />
      <Field label="오늘 배운 것" value={form.learned} onChange={(learned) => setForm({ ...form, learned })} />
      <Field label="왜 중요한가" value={form.importance} onChange={(importance) => setForm({ ...form, importance })} />
      <Field label="남은 질문" value={form.question} onChange={(question) => setForm({ ...form, question })} />
      {feedback && <p className="aiBox">{feedback}</p>}
      <div className="buttonRow">
        <button className="secondaryButton" onClick={async () => setFeedback(await mockAiTutor.generateReflectionFeedback(form))}>
          <Sparkles size={16} /> mock AI 피드백
        </button>
        <button
          className="primaryButton"
          disabled={!canSave}
          onClick={() => {
            const nextFeedback = feedback || "회고가 저장되었습니다. 다음에는 관찰과 질문을 더 연결해보세요.";
            setFeedback(nextFeedback);
            onSave({
              id: existing?.id ?? `r-${crypto.randomUUID()}`,
              studentId: student.id,
              reflectionDate: today,
              ...form,
              aiFeedback: nextFeedback,
              updatedAt: new Date().toISOString(),
            });
          }}
        >
          <CheckCircle2 size={16} /> 저장
        </button>
      </div>
    </section>
  );
}

function WeeklyReportEditor({ data, student, onSave }: { data: AppData; student: StudentProfile; onSave: (report: WeeklyReport) => void }) {
  const defaultRange = getWeekRange(today);
  const existing = data.weeklyReports.find((item) => item.studentId === student.id && item.weekStartDate === defaultRange.start);
  const [weekStartDate, setWeekStartDate] = useState(existing?.weekStartDate ?? defaultRange.start);
  const [weekEndDate, setWeekEndDate] = useState(existing?.weekEndDate ?? defaultRange.end);
  const [form, setForm] = useState({
    summary: existing?.summary ?? "",
    suggestions: existing?.suggestions ?? "",
    wantsToTry: existing?.wantsToTry ?? "",
    newInterests: existing?.newInterests ?? "",
    impressiveMaterials: existing?.impressiveMaterials ?? "",
    nextWeekPlan: existing?.nextWeekPlan ?? "",
  });

  const canSave = form.summary.trim().length > 0 || form.newInterests.trim().length > 0 || form.wantsToTry.trim().length > 0;

  return (
    <section className="panel">
      <SectionTitle icon={<FileText size={18} />} title="주간 보고서" />
      <p className="sectionHint">이번 주에 본 것, 새로 생긴 관심, 해보고 싶은 일, 건의사항을 간단히 남겨주세요.</p>
      <div className="dateRange">
        <label>
          <span>시작일</span>
          <input type="date" value={weekStartDate} onChange={(event) => setWeekStartDate(event.target.value)} />
        </label>
        <label>
          <span>종료일</span>
          <input type="date" value={weekEndDate} onChange={(event) => setWeekEndDate(event.target.value)} />
        </label>
      </div>
      <Field label="이번 주 요약" value={form.summary} onChange={(summary) => setForm({ ...form, summary })} />
      <Field label="건의사항" value={form.suggestions} onChange={(suggestions) => setForm({ ...form, suggestions })} />
      <Field label="해보고 싶은 일" value={form.wantsToTry} onChange={(wantsToTry) => setForm({ ...form, wantsToTry })} />
      <Field label="새로 관심이 생긴 부분" value={form.newInterests} onChange={(newInterests) => setForm({ ...form, newInterests })} />
      <Field label="인상 깊게 본 자료" value={form.impressiveMaterials} onChange={(impressiveMaterials) => setForm({ ...form, impressiveMaterials })} />
      <Field label="다음 주 계획" value={form.nextWeekPlan} onChange={(nextWeekPlan) => setForm({ ...form, nextWeekPlan })} />
      <div className="buttonRow">
        <button
          className="primaryButton"
          disabled={!canSave}
          onClick={() =>
            onSave({
              id: existing?.id ?? `w-${crypto.randomUUID()}`,
              studentId: student.id,
              weekStartDate,
              weekEndDate,
              ...form,
              updatedAt: new Date().toISOString(),
            })
          }
        >
          <CheckCircle2 size={16} /> 주간 보고서 저장
        </button>
      </div>
    </section>
  );
}

function StudentHistory({ data, student }: { data: AppData; student: StudentProfile }) {
  const assignments = data.assignments.filter((item) => item.studentId === student.id);
  const reflections = data.reflections.filter((item) => item.studentId === student.id);
  const dailyMentorNotes = data.mentorNotes.filter((item) => item.studentId === student.id && item.type === "DAILY_MENTOR");
  const weeklyOwnerNotes = data.mentorNotes.filter((item) => item.studentId === student.id && item.type === "WEEKLY_OWNER");
  const reports = data.weeklyReports.filter((item) => item.studentId === student.id);
  const [selectedDate, setSelectedDate] = useState(today);
  const selectedAssignments = assignments.filter((item) => item.assignedDate === selectedDate);
  const selectedReflection = reflections.find((item) => item.reflectionDate === selectedDate);
  const selectedReports = reports.filter((item) => item.weekStartDate <= selectedDate && item.weekEndDate >= selectedDate);
  const selectedDailyNotes = dailyMentorNotes.filter((item) => item.noteDate === selectedDate);
  const selectedWeeklyNotes = weeklyOwnerNotes.filter((item) => item.weekStartDate && item.weekEndDate ? item.weekStartDate <= selectedDate && item.weekEndDate >= selectedDate : item.noteDate === selectedDate);

  return (
    <div className="stack">
      <section className="panel">
        <SectionTitle icon={<History size={18} />} title="나의 진행 기록" />
        <div className="historyGrid">
          <Metric title="누적 미션" value={`${assignments.length}개`} />
          <Metric title="작성 회고" value={`${reflections.length}개`} />
          <Metric title="주간 보고서" value={`${reports.length}건`} />
        </div>
      </section>
      <section className="panel">
        <SectionTitle icon={<CalendarDays size={18} />} title="기록 달력" />
        <ActivityCalendar
          assignments={assignments}
          reflections={reflections}
          weeklyReports={reports}
          mentorNotes={[...dailyMentorNotes, ...weeklyOwnerNotes]}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
      </section>
      <section className="panel">
        <SectionTitle icon={<CalendarDays size={18} />} title={`${formatDate(selectedDate)} 기록`} />
        <DailyRecordPanel
          data={data}
          assignments={selectedAssignments}
          reflection={selectedReflection}
          weeklyReports={selectedReports}
          dailyMentorNotes={selectedDailyNotes}
          weeklyOwnerNotes={selectedWeeklyNotes}
        />
      </section>
      <section className="panel">
        <SectionTitle icon={<FileText size={18} />} title="주간 보고서 타임라인" />
        {reports.length ? reports.map((report) => (
          <article className="reportCard" key={report.id}>
            <strong>{formatDate(report.weekStartDate)} - {formatDate(report.weekEndDate)}</strong>
            <p>{report.summary}</p>
            <dl>
              <div><dt>건의사항</dt><dd>{report.suggestions || "미작성"}</dd></div>
              <div><dt>해보고 싶은 일</dt><dd>{report.wantsToTry || "미작성"}</dd></div>
              <div><dt>새 관심</dt><dd>{report.newInterests || "미작성"}</dd></div>
              <div><dt>인상 깊은 자료</dt><dd>{report.impressiveMaterials || "미작성"}</dd></div>
            </dl>
          </article>
        )) : <p className="empty">아직 주간 보고서가 없습니다.</p>}
      </section>
      <section className="panel">
        <SectionTitle icon={<BookOpenCheck size={18} />} title="회고 타임라인" />
        {reflections.length ? reflections.map((reflection) => (
          <article className="reflectionCard" key={reflection.id}>
            <strong>{formatDate(reflection.reflectionDate)}</strong>
            {reflection.todayWork && <p><b>오늘 수행:</b> {reflection.todayWork}</p>}
            {reflection.tomorrowPlan && <p><b>내일 계획:</b> {reflection.tomorrowPlan}</p>}
            <p>{reflection.learned}</p>
            <small>{reflection.question}</small>
          </article>
        )) : <p className="empty">아직 회고 기록이 없습니다.</p>}
      </section>
      <section className="panel">
        <SectionTitle icon={<MessageSquareText size={18} />} title="멘토 일일 피드백" />
        {dailyMentorNotes.length ? dailyMentorNotes.map((item) => (
          <article className="noteCard" key={item.id}>
            <strong>{formatDate(item.noteDate)}</strong>
            <p>{item.content}</p>
          </article>
        )) : <p className="empty">아직 멘토 일일 피드백이 없습니다.</p>}
      </section>
      <section className="panel">
        <SectionTitle icon={<MessageSquareText size={18} />} title="활용책임자 주간 피드백" />
        {weeklyOwnerNotes.length ? weeklyOwnerNotes.map((item) => (
          <article className="noteCard" key={item.id}>
            <strong>{item.weekStartDate && item.weekEndDate ? `${formatDate(item.weekStartDate)} - ${formatDate(item.weekEndDate)}` : formatDate(item.noteDate)}</strong>
            <p>{item.content}</p>
          </article>
        )) : <p className="empty">아직 활용책임자 주간 피드백이 없습니다.</p>}
      </section>
    </div>
  );
}

function DailyRecordPanel({
  data,
  assignments,
  reflection,
  weeklyReports,
  dailyMentorNotes,
  weeklyOwnerNotes,
}: {
  data: AppData;
  assignments: MissionAssignment[];
  reflection?: Reflection;
  weeklyReports: WeeklyReport[];
  dailyMentorNotes: MentorNote[];
  weeklyOwnerNotes: MentorNote[];
}) {
  const hasAnyRecord = assignments.length || reflection || weeklyReports.length || dailyMentorNotes.length || weeklyOwnerNotes.length;

  if (!hasAnyRecord) {
    return <p className="empty">선택한 날짜에 작성된 기록이 없습니다.</p>;
  }

  return (
    <div className="dailyRecordStack">
      {assignments.length > 0 && (
        <div className="dailyRecordGroup">
          <h3>미션</h3>
          {assignments.map((assignment) => {
            const mission = data.missions.find((item) => item.id === assignment.missionId);
            return (
              <article className="miniRecordCard" key={assignment.id}>
                <strong>{mission?.title ?? "목표"}</strong>
                <p><b>목표:</b> {assignment.selfGoal || "미작성"}</p>
                <p><b>달성도:</b> {assignment.achievementRate ?? (assignment.status === "DONE" ? 100 : 0)}%</p>
                <p><b>자기평가:</b> {assignment.selfEvaluation || assignment.note || "미작성"}</p>
              </article>
            );
          })}
        </div>
      )}
      {reflection && (
        <div className="dailyRecordGroup">
          <h3>회고</h3>
          <article className="miniRecordCard">
            {reflection.todayWork && <p><b>오늘 수행:</b> {reflection.todayWork}</p>}
            {reflection.tomorrowPlan && <p><b>내일 계획:</b> {reflection.tomorrowPlan}</p>}
            <p><b>배운 것:</b> {reflection.learned || "미작성"}</p>
            <p><b>남은 질문:</b> {reflection.question || "미작성"}</p>
          </article>
        </div>
      )}
      {weeklyReports.length > 0 && (
        <div className="dailyRecordGroup">
          <h3>주간 보고서</h3>
          {weeklyReports.map((report) => (
            <article className="miniRecordCard" key={report.id}>
              <strong>{formatDate(report.weekStartDate)} - {formatDate(report.weekEndDate)}</strong>
              <p>{report.summary}</p>
              <p><b>새 관심:</b> {report.newInterests || "미작성"}</p>
            </article>
          ))}
        </div>
      )}
      {dailyMentorNotes.length > 0 && (
        <div className="dailyRecordGroup">
          <h3>멘토 일일 피드백</h3>
          {dailyMentorNotes.map((note) => (
            <article className="miniRecordCard" key={note.id}>
              <p>{note.content}</p>
            </article>
          ))}
        </div>
      )}
      {weeklyOwnerNotes.length > 0 && (
        <div className="dailyRecordGroup">
          <h3>활용책임자 주간 피드백</h3>
          {weeklyOwnerNotes.map((note) => (
            <article className="miniRecordCard" key={note.id}>
              <strong>{note.weekStartDate && note.weekEndDate ? `${formatDate(note.weekStartDate)} - ${formatDate(note.weekEndDate)}` : formatDate(note.noteDate)}</strong>
              <p>{note.content}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityCalendar({
  assignments,
  reflections,
  weeklyReports,
  mentorNotes,
  selectedDate,
  onSelectDate,
}: {
  assignments: MissionAssignment[];
  reflections: Reflection[];
  weeklyReports: WeeklyReport[];
  mentorNotes: MentorNote[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
}) {
  const [calendarMonth, setCalendarMonth] = useState(today.slice(0, 7));
  const days = useMemo(() => buildCalendarDays(`${calendarMonth}-01`), [calendarMonth]);
  const reflectionDates = new Set(reflections.map((item) => item.reflectionDate));
  const assignmentDates = new Set(assignments.map((item) => item.assignedDate));
  const reportRanges = weeklyReports.map((item) => ({ start: item.weekStartDate, end: item.weekEndDate }));
  const noteDates = new Set(mentorNotes.filter((item) => item.type === "DAILY_MENTOR").map((item) => item.noteDate));
  const noteRanges = mentorNotes
    .filter((item) => item.type === "WEEKLY_OWNER" && item.weekStartDate && item.weekEndDate)
    .map((item) => ({ start: item.weekStartDate!, end: item.weekEndDate! }));

  return (
    <div className="calendar">
      <div className="calendarToolbar">
        <button className="secondaryButton" onClick={() => setCalendarMonth(shiftMonth(calendarMonth, -1))}>이전 달</button>
        <strong>{formatMonthTitle(calendarMonth)}</strong>
        <button className="secondaryButton" onClick={() => setCalendarMonth(shiftMonth(calendarMonth, 1))}>다음 달</button>
      </div>
      <div className="calendarHeader">
        {["일", "월", "화", "수", "목", "금", "토"].map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="calendarGrid">
        {days.map((day) => {
          const hasMission = assignmentDates.has(day.date);
          const hasReflection = reflectionDates.has(day.date);
          const hasReport = reportRanges.some((range) => range.start <= day.date && range.end >= day.date);
          const holiday = getKoreanHoliday(day.date);
          const hasNote = noteDates.has(day.date) || noteRanges.some((range) => range.start <= day.date && range.end >= day.date);
          return (
            <button
              className={`calendarDay ${day.inMonth ? "" : "mutedDay"} ${day.date === today ? "today" : ""} ${day.date === selectedDate ? "selectedDay" : ""} ${day.weekend} ${holiday ? "holidayDay" : ""}`}
              key={day.date}
              onClick={() => onSelectDate(day.date)}
            >
              <div>
                <strong>{day.label}</strong>
                {holiday && <small>{holiday}</small>}
              </div>
              <div className="calendarDots">
                {hasMission && <span className="dot missionDot" title="미션" />}
                {hasReflection && <span className="dot reflectionDot" title="회고" />}
                {hasReport && <span className="dot reportDot" title="주간 보고서" />}
                {hasNote && <span className="dot noteDot" title="피드백" />}
              </div>
            </button>
          );
        })}
      </div>
      <div className="legend">
        <span><i className="dot missionDot" /> 미션</span>
        <span><i className="dot reflectionDot" /> 회고</span>
        <span><i className="dot reportDot" /> 주간 보고서</span>
        <span><i className="dot noteDot" /> 피드백</span>
        <span className="holidayLegend">공휴일</span>
      </div>
    </div>
  );
}

function MissionList({ data, assignments, readonly = false, onUpdateAssignment }: { data: AppData; assignments: MissionAssignment[]; readonly?: boolean; onUpdateAssignment?: (id: string, patch: Partial<MissionAssignment>) => void }) {
  return (
    <div className="missionList">
      {assignments.map((assignment) => {
        const mission = data.missions.find((item) => item.id === assignment.missionId);
        if (!mission) return null;
        const achievementRate = assignment.achievementRate ?? (assignment.status === "DONE" ? 100 : 0);
        const selfEvaluation = assignment.selfEvaluation ?? assignment.note ?? "";
        const selfGoal = assignment.selfGoal ?? "";
        return (
          <article className="missionItem selfGoalItem" key={assignment.id}>
            <div>
              <span>{mission.category}</span>
              <h3>{mission.title}</h3>
              <p>{mission.description}</p>
              {readonly ? (
                <div className="selfReviewSummary">
                  <p><b>학생 목표:</b> {selfGoal || "아직 목표를 작성하지 않았습니다."}</p>
                  <p><b>자기평가:</b> {selfEvaluation || "아직 자기평가를 작성하지 않았습니다."}</p>
                  <div className="achievementInline">
                    <ProgressBar value={achievementRate} />
                    <strong>{achievementRate}%</strong>
                  </div>
                </div>
              ) : (
                <div className="selfGoalForm">
                  <label>
                    <span>오늘 내가 세운 목표</span>
                    <input
                      value={selfGoal}
                      placeholder="예: 세미나에서 이해 안 된 개념 2개를 질문으로 정리하기"
                      onChange={(event) => onUpdateAssignment?.(assignment.id, { selfGoal: event.target.value })}
                    />
                  </label>
                  <label>
                    <span>달성도: {achievementRate}%</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="10"
                      value={achievementRate}
                      onChange={(event) => {
                        const nextRate = Number(event.target.value);
                        onUpdateAssignment?.(assignment.id, {
                          achievementRate: nextRate,
                          status: nextRate >= 80 ? "DONE" : "TODO",
                          checkedAt: nextRate >= 80 ? new Date().toISOString() : undefined,
                        });
                      }}
                    />
                  </label>
                  <label>
                    <span>자기평가 / 배운 점</span>
                    <textarea
                      value={selfEvaluation}
                      placeholder="목표를 어느 정도 달성했는지, 막힌 점과 배운 점을 적어 주세요."
                      onChange={(event) => onUpdateAssignment?.(assignment.id, { selfEvaluation: event.target.value, note: event.target.value })}
                      rows={3}
                    />
                  </label>
                </div>
              )}
            </div>
            <div className="selfGoalStatus">
              <strong>{achievementRate}%</strong>
              <small>{assignment.status === "DONE" ? "목표 달성" : "진행 중"}</small>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={4} />
    </label>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <section className="metric">
      <span>{title}</span>
      <strong>{value}</strong>
    </section>
  );
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="sectionTitle">
      {icon}
      <h2>{title}</h2>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="progressTrack" aria-label={`진행률 ${value}%`}>
      <div style={{ width: `${value}%` }} />
    </div>
  );
}

function buildStudentExportCsv(data: AppData) {
  const headers = [
    "이름",
    "이메일",
    "역할",
    "상태",
    "소속",
    "전공",
    "멘토",
    "인턴 시작일",
    "인턴 종료일",
    "전체 목표 수",
    "완료 목표 수",
    "평균 달성도",
    "회고 수",
    "주간 보고서 수",
    "피드백 수",
    "최근 회고일",
    "최근 관심 분야",
  ];

  const rows = data.students.map((student) => {
    const user = getUser(data, student);
    const assignments = data.assignments.filter((assignment) => assignment.studentId === student.id);
    const completed = assignments.filter((assignment) => assignment.status === "DONE").length;
    const averageAchievement = assignments.length
      ? Math.round(assignments.reduce((sum, assignment) => sum + (assignment.achievementRate ?? (assignment.status === "DONE" ? 100 : 0)), 0) / assignments.length)
      : 0;
    const reflections = data.reflections.filter((reflection) => reflection.studentId === student.id);
    const latestReflection = [...reflections].sort((a, b) => b.reflectionDate.localeCompare(a.reflectionDate))[0];
    const reports = data.weeklyReports.filter((report) => report.studentId === student.id);
    const latestReport = [...reports].sort((a, b) => b.weekEndDate.localeCompare(a.weekEndDate))[0];
    const feedbackCount = data.mentorNotes.filter((note) => note.studentId === student.id).length;

    return [
      user.name,
      user.email,
      getRoleLabel(user.role),
      student.status,
      student.affiliation,
      student.major,
      student.mentorName,
      student.internshipStartDate,
      student.internshipEndDate,
      assignments.length,
      completed,
      averageAchievement + "%",
      reflections.length,
      reports.length,
      feedbackCount,
      latestReflection?.reflectionDate ?? "",
      latestReport?.newInterests ?? "",
    ];
  });

  return [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

function csvCell(value: string | number) {
  const text = String(value ?? "");
  return '"' + text.replace(/"/g, '""') + '"';
}

function getRoleLabel(role: User["role"]) {
  const labels: Record<User["role"], string> = {
    OWNER: "활용책임자",
    MENTOR: "멘토",
    GRAD_STUDENT: "학연생",
    INTERN: "인턴",
  };

  return labels[role];
}

function isStaffRole(role: User["role"]) {
  return role === "OWNER" || role === "MENTOR";
}

function getRoleOrder(role: User["role"]) {
  const order: Record<User["role"], number> = {
    OWNER: 0,
    MENTOR: 1,
    GRAD_STUDENT: 2,
    INTERN: 3,
  };

  return order[role];
}

function getUser(data: AppData, student: StudentProfile) {
  return data.users.find((user) => user.id === student.userId) ?? data.users[0];
}

function getTodayAssignments(data: AppData, studentId: string) {
  return data.assignments
    .filter((assignment) => assignment.studentId === studentId && assignment.assignedDate === today)
    .sort((a, b) => {
      const missionA = data.missions.find((mission) => mission.id === a.missionId)?.orderIndex ?? 0;
      const missionB = data.missions.find((mission) => mission.id === b.missionId)?.orderIndex ?? 0;
      return missionA - missionB;
    });
}

function getProgress(data: AppData, studentId: string) {
  const assignments = getTodayAssignments(data, studentId);
  const done = assignments.filter((assignment) => assignment.status === "DONE").length;
  const hasSelfAssessment = assignments.some((assignment) => typeof assignment.achievementRate === "number");
  const averageAchievement = assignments.length
    ? Math.round(assignments.reduce((sum, assignment) => sum + (assignment.achievementRate ?? (assignment.status === "DONE" ? 100 : 0)), 0) / assignments.length)
    : 0;
  return {
    done,
    total: assignments.length,
    rate: hasSelfAssessment ? averageAchievement : assignments.length ? Math.round((done / assignments.length) * 100) : 0,
  };
}

function getGrowthSnapshot(data: AppData, studentId: string) {
  const assignments = data.assignments.filter((assignment) => assignment.studentId === studentId);
  const done = assignments.filter((assignment) => assignment.status === "DONE").length;
  const reports = data.weeklyReports.filter((report) => report.studentId === studentId);
  const notes = data.mentorNotes.filter((note) => note.studentId === studentId);
  const latestReport = [...reports].sort((a, b) => b.weekEndDate.localeCompare(a.weekEndDate))[0];

  return {
    missionRate: assignments.length ? Math.round((done / assignments.length) * 100) : 0,
    reflectionCount: data.reflections.filter((reflection) => reflection.studentId === studentId).length,
    weeklyReportCount: reports.length,
    feedbackCount: notes.length,
    latestInterest: latestReport?.newInterests ? `최근 관심: ${latestReport.newInterests}` : "아직 새 관심 분야 기록 없음",
  };
}

function getRiskReasons(data: AppData, studentId: string) {
  const assignments = getTodayAssignments(data, studentId);
  const progress = getProgress(data, studentId);
  const reflection = data.reflections.find((item) => item.studentId === studentId && item.reflectionDate === today);
  const reports = data.weeklyReports.filter((item) => item.studentId === studentId);
  const reasons: string[] = [];

  if (progress.total === 0) reasons.push("오늘 목표 없음");
  if (progress.total > 0 && progress.rate < 60) reasons.push("목표 달성도 낮음");
  if (assignments.some((item) => !(item.selfGoal ?? "").trim())) reasons.push("자기 목표 미작성");
  if (!reflection) reasons.push("회고 미작성");
  if (!reports.length) reasons.push("주간 보고서 없음");
  if (reflection && !reflection.todayWork.trim()) reasons.push("오늘 수행 내용 없음");
  if (reflection && !reflection.tomorrowPlan.trim()) reasons.push("내일 계획 없음");
  if (assignments.some((item) => (item.selfEvaluation ?? item.note).trim().length < 8)) reasons.push("자기평가 보완 필요");
  if (reflection && reflection.question.trim().length < 8) reasons.push("질문 구체화 필요");

  return reasons;
}

function analyzeReflection(input: { todayWork: string; tomorrowPlan: string; observed: string; learned: string; importance: string; question: string }) {
  return [
    { label: input.todayWork.trim().length >= 12 ? "수행 내용 있음" : "수행 내용 필요", ok: input.todayWork.trim().length >= 12 },
    { label: input.tomorrowPlan.trim().length >= 12 ? "내일 계획 있음" : "내일 계획 필요", ok: input.tomorrowPlan.trim().length >= 12 },
    { label: input.observed.trim().length >= 18 ? "관찰 구체적" : "관찰 보강 필요", ok: input.observed.trim().length >= 18 },
    { label: input.learned.trim().length >= 18 ? "배움 정리됨" : "배움 보강 필요", ok: input.learned.trim().length >= 18 },
    { label: input.importance.trim().length >= 18 ? "중요성 연결됨" : "중요성 연결 필요", ok: input.importance.trim().length >= 18 },
    { label: input.question.trim().length >= 8 ? "질문 있음" : "질문 구체화 필요", ok: input.question.trim().length >= 8 },
  ];
}

function getScreenHelp(view: View) {
  const tips: Record<View, string[]> = {
    dashboard: [
      "완료율보다 주의 사유를 먼저 보세요.",
      "주간 보고서 없음, 회고 미작성 같은 항목은 피드백이 필요한 신호입니다.",
      "학생 행을 누르면 상세 기록으로 이동합니다.",
    ],
    students: [
      "학생별 멘토, 시작일, 진행률을 비교해 볼 수 있습니다.",
      "주의 사유가 있는 학생을 선택해 상세 기록을 확인하세요.",
      "MVP 단계에서는 학생 데이터가 데모 데이터로 제공됩니다.",
    ],
    "student-detail": [
      "오늘 목표, 회고, 주간 보고서를 한 화면에서 함께 확인합니다.",
      "관리자 피드백에는 학생이 다음에 해볼 행동을 구체적으로 적는 것이 좋습니다.",
      "mock AI 요약은 나중에 실제 AI API로 교체할 수 있는 자리입니다.",
    ],
    "student-home": [
      "완료 버튼을 누르기 전에 근거나 배운 점을 한 줄로 남겨주세요.",
      "미션 메모는 관리자가 학생의 이해 과정을 보는 단서가 됩니다.",
      "완료 여부는 언제든 다시 체크 해제할 수 있습니다.",
    ],
    reflection: [
      "회고는 길이보다 실행 흐름이 중요합니다.",
      "오늘 수행 내용과 내일 계획을 먼저 적고, 본 것과 배운 이유를 연결해보세요.",
      "mock AI 피드백은 회고를 조금 더 깊게 쓰기 위한 힌트입니다.",
    ],
    "weekly-report": [
      "주간 보고서는 한 주의 관심 변화와 다음 탐색 방향을 남기는 곳입니다.",
      "건의사항에는 교육 방식, 자료, 환경에 대한 의견을 적어도 됩니다.",
      "인상 깊게 본 자료는 논문, 세미나 슬라이드, 실험 기록 등 무엇이든 괜찮습니다.",
    ],
    history: [
      "달력의 점은 미션, 회고, 주간 보고서가 남은 날짜를 뜻합니다.",
      "주간 보고서 타임라인에서 관심사가 어떻게 변했는지 볼 수 있습니다.",
      "멘토 피드백은 다음 활동을 준비할 때 다시 확인하세요.",
    ],
  };

  return tips[view];
}

function getWeekRange(dateString: string) {
  const [year, month, dateValue] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, dateValue);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(year, month - 1, dateValue + mondayOffset);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  return {
    start: toDateKey(start),
    end: toDateKey(end),
  };
}

function buildCalendarDays(dateString: string) {
  const [year, month, dateValue] = dateString.split("-").map(Number);
  const current = new Date(year, month - 1, dateValue);
  const first = new Date(current.getFullYear(), current.getMonth(), 1);
  const calendarStart = new Date(first);
  calendarStart.setDate(first.getDate() - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(calendarStart);
    day.setDate(calendarStart.getDate() + index);
    return {
      date: toDateKey(day),
      label: String(day.getDate()),
      inMonth: day.getMonth() === current.getMonth(),
      weekend: day.getDay() === 0 ? "sunday" : day.getDay() === 6 ? "saturday" : "",
    };
  });
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftMonth(monthKey: string, offset: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthTitle(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return `${year}년 ${month}월`;
}

function getKoreanHoliday(date: string) {
  const holidays: Record<string, string> = {
    "2026-01-01": "신정",
    "2026-02-16": "설날 연휴",
    "2026-02-17": "설날",
    "2026-02-18": "설날 연휴",
    "2026-03-01": "삼일절",
    "2026-05-01": "근로자의 날",
    "2026-05-05": "어린이날",
    "2026-05-24": "부처님오신날",
    "2026-06-06": "현충일",
    "2026-07-17": "제헌절",
    "2026-08-15": "광복절",
    "2026-09-24": "추석 연휴",
    "2026-09-25": "추석",
    "2026-09-26": "추석 연휴",
    "2026-09-27": "추석 연휴",
    "2026-10-03": "개천절",
    "2026-10-09": "한글날",
    "2026-12-25": "성탄절",
  };

  return holidays[date];
}
