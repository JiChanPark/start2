import type { MissionAssignment, Reflection } from "../../entities";

export interface ReflectionInput {
  todayWork: string;
  tomorrowPlan: string;
  observed: string;
  learned: string;
  importance: string;
  question: string;
}

export interface AiTutorService {
  generateReflectionFeedback(input: ReflectionInput): Promise<string>;
  summarizeProgress(assignments: MissionAssignment[], reflections: Reflection[]): Promise<string>;
}

const scoreText = (value: string, target: number) => value.trim().length >= target;

async function requestAi<T extends object>(payload: T) {
  const response = await fetch("/api/ai-feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error("AI request failed");
  const result = (await response.json()) as { text?: string };
  if (!result.text) throw new Error("AI response is empty");
  return result.text;
}

export const mockAiTutor: AiTutorService = {
  async generateReflectionFeedback(input) {
    try {
      return await requestAi({ type: "reflection", ...input });
    } catch {
      // Local fallback keeps the MVP usable before the Vercel OpenAI key is configured.
    }

    const checks = {
      work: scoreText(input.todayWork, 16),
      plan: scoreText(input.tomorrowPlan, 16),
      observed: scoreText(input.observed, 18),
      learned: scoreText(input.learned, 18),
      importance: scoreText(input.importance, 18),
      question: scoreText(input.question, 8),
    };
    const score = Object.values(checks).filter(Boolean).length;

    if (score >= 5) {
      return "좋은 회고입니다. 오늘 수행한 일과 내일 계획이 연결되어 있고, 관찰-배움-중요성-질문 흐름도 갖춰져 있습니다. 다음 회고에서는 지금 질문을 검증 가능한 작은 실험이나 자료 탐색 계획으로 바꿔 보세요.";
    }

    const suggestions: string[] = [];
    if (!checks.work) suggestions.push("오늘 실제로 수행한 일을 결과물이나 본 자료 중심으로 한 줄 더 구체화해 주세요");
    if (!checks.plan) suggestions.push("내일 계획은 '무엇을 확인할지'와 '어떤 산출물을 만들지'로 나누면 좋습니다");
    if (!checks.importance) suggestions.push("배운 내용이 연구소 업무나 본인의 진학 준비와 왜 연결되는지 적어 보세요");
    if (!checks.question) suggestions.push("멘토가 답하기 쉬운 형태의 구체 질문을 하나 남겨 주세요");

    return "보완하면 더 좋은 회고가 됩니다. " + suggestions.join(". ") + ".";
  },
  async summarizeProgress(assignments, reflections) {
    try {
      return await requestAi({ type: "summary", assignments, reflections });
    } catch {
      // Local fallback keeps the MVP usable before the Vercel OpenAI key is configured.
    }

    const completed = assignments.filter((item) => item.status === "DONE").length;
    const rate = assignments.length ? Math.round((completed / assignments.length) * 100) : 0;
    const latestReflection = reflections[0];

    if (!assignments.length) {
      return "오늘 배정된 미션이 없습니다. 학생에게 관찰 과제나 자료 읽기 과제를 하나 배정하면 회고 품질을 판단하기 쉬워집니다.";
    }

    if (!latestReflection) {
      return "오늘 목표 달성도는 " + rate + "%입니다. 아직 회고가 없어 배움의 방향은 확인하기 어렵습니다. 오늘 수행 내용과 내일 계획을 먼저 작성하도록 안내해 주세요.";
    }

    if (rate >= 80) {
      return "오늘 목표 달성도는 " + rate + "%로 안정적입니다. 회고도 작성되어 있으니, 다음 피드백은 학생의 질문을 연구 질문이나 다음 실험 계획으로 확장하는 데 초점을 두면 좋겠습니다.";
    }

    return "오늘 목표 달성도는 " + rate + "%입니다. 완료 여부 자체보다 미완료 사유와 내일 이어갈 행동을 확인하는 피드백이 필요합니다. 회고의 질문을 중심으로 짧은 멘토 코멘트를 남겨 주세요.";
  },
};
