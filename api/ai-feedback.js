const fallbackReflection =
  "AI API 키가 아직 연결되지 않았습니다. 회고에는 오늘 수행한 일, 내일 계획, 관찰-배움-중요성의 연결, 다음 질문을 더 구체화해 보세요.";

const fallbackSummary =
  "AI API 키가 아직 연결되지 않았습니다. 목표 달성도, 회고 작성 여부, 최근 질문과 관심사를 기준으로 멘토가 다음 행동을 제안해 주세요.";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const body = request.body || {};
  const type = body.type === "summary" ? "summary" : "reflection";

  if (!apiKey) {
    response.status(200).json({
      text: type === "summary" ? fallbackSummary : fallbackReflection,
      mock: true,
    });
    return;
  }

  const prompt =
    type === "summary"
      ? buildSummaryPrompt(body)
      : buildReflectionPrompt(body);

  try {
    const aiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: prompt,
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      response.status(502).json({ error: errorText });
      return;
    }

    const result = await aiResponse.json();
    const text =
      result.output_text ||
      result.output?.flatMap((item) => item.content || [])
        ?.map((content) => content.text)
        ?.filter(Boolean)
        ?.join("\n") ||
      (type === "summary" ? fallbackSummary : fallbackReflection);

    response.status(200).json({ text, mock: false });
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : "AI request failed" });
  }
}

function buildReflectionPrompt(body) {
  return [
    "너는 국가연구소 인턴 교육을 돕는 연구 멘토 AI다.",
    "학생의 일일 회고를 읽고 한국어로 3문장 이내의 구체적 피드백을 제공해라.",
    "칭찬 1개, 보완 질문 1개, 내일 행동 제안 1개를 포함해라.",
    "",
    `오늘 수행 내용: ${body.todayWork || ""}`,
    `내일 계획: ${body.tomorrowPlan || ""}`,
    `관찰한 것: ${body.observed || ""}`,
    `배운 것: ${body.learned || ""}`,
    `중요하다고 느낀 이유: ${body.importance || ""}`,
    `남은 질문: ${body.question || ""}`,
  ].join("\n");
}

function buildSummaryPrompt(body) {
  return [
    "너는 국가연구소 인턴 교육 플랫폼의 성장 요약 AI다.",
    "관리자나 멘토가 바로 읽을 수 있게 한국어로 짧은 성장 요약을 작성해라.",
    "목표 달성도, 회고 품질, 다음 피드백 포인트를 포함하고 5문장 이내로 써라.",
    "",
    `목표 데이터 JSON: ${JSON.stringify(body.assignments || [])}`,
    `회고 데이터 JSON: ${JSON.stringify(body.reflections || [])}`,
  ].join("\n");
}
