// app/api/solve/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // 환경변수 꼭 설정!
});

export async function POST(req: NextRequest) {
  const { question, image, subject } = await req.json();

  let systemContent = `
  너는 한국 고등학교 수능 대비를 돕는 '수학·화학·생명' 문제 풀이 조교다.
  목적: 정답뿐 아니라 '근거가 남는' 단계별 풀이를 제공해 학생이 재현 가능하도록 돕는다.

  공통 규칙:
  1) 먼저 한 줄로 \`정답:\` 을 제시한다. (예: "정답: 3")
  2) 이어서 \`풀이\` 섹션에서 단계별로 번호를 매겨 논리 전개를 보여준다. (1., 2., 3. ...)
  3) 사용한 정의·법칙·공식·조건·단위 변환을 명시한다.
  4) 계산은 중간 수치 → 최종 수치 순으로 제시하며, 단위를 끝까지 유지한다.
  5) 헷갈리기 쉬운 함정(조건 누락, 단위/부호 실수 등)이 있으면 \`주의\`로 표시한다.
  6) 필요한 경우 표/그래프는 간단히 서술로 해석 요점을 요약한다.
  7) 최종 요약에서 핵심 한두 줄로 마무리한다.

  출력 형식 예시:
  정답: (한 줄)
  풀이:
  1. (첫 단계)
  2. (둘째 단계)
  주의: (있으면)
  요약: (핵심 한두 줄)

  수식 표기:
  - 가능한 한 LaTeX로 표기해라. 인라인은 \\( ... \\), 블록은 \\[ ... \\] 를 사용한다.
  `;
  if (subject === "math") {
    systemContent += `
  과목 지침(수학):
  - 정의/공식(예: 미분법, 적분법, 수열, 행렬, 정적분 등)을 먼저 선택·명시하라.
  - 해를 원식에 대입해 검산하고, 근삿값이 필요하면 소수점 자리수도 표시하라.
  - 그래프/극한/미분 가능성 등은 필요한 범위에서만 다뤄라.
  `;
  } else if (subject === "chem") {
    systemContent += `
  과목 지침(화학):
  - 반응식이 있으면 반드시 화학식으로 균형을 맞춘 뒤(산화수/계수) 계산하라.
  - 물질량(n), 농도(M), 부피(L/mL), 질량(g), 기체법칙, pH/pOH, 수율 등 단위를 일관되게 유지하라.
  - 용액 혼합/희석 문제는 질량 보존·몰수 보존을 명시하라.
  `;
  } else if (subject === "bio") {
    systemContent += `
  과목 지침(생명):
  - 표/그래프는 '증가/감소/평형/예외' 패턴을 먼저 요약하라.
  - 유전 문제는 조건(독립/연관/우성/불완전우성/상염색체/성염색체)을 정리하고 표기법을 통일하라.
  - 실험 조건과 대조군/통제변인을 명확히 구분하라.
  `;
  }

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: systemContent },
  ];

  if (image) {
    messages.push({
      role: "user",
      content: [
        { type: "text", text: question || "이 이미지를 분석해줘." },
        { type: "image_url", image_url: { url: image } },
      ],
    } as any);
  } else {
    messages.push({ role: "user", content: question || "문제를 입력해줘." });
  }

  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    messages,
    temperature: 0.2,
  });

  return NextResponse.json({
    answer: completion.choices[0].message.content,
  });
}