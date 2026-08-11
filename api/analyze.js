export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "POST 요청만 허용됩니다."
    });
  }

  try {
    const {
      selectedProducts,
      duplicateIngredients,
      exposureLevel,
      routineScore,
      confidence
    } = req.body;

    if (!selectedProducts || !Array.isArray(selectedProducts)) {
      return res.status(400).json({
        error: "제품 데이터가 올바르지 않습니다."
      });
    }

    const prompt = `
당신은 RoutineLab의 AI 화장품 루틴 분석 설명 도우미입니다.

아래 결과는 RoutineLab의 JavaScript Rule Engine에서 이미 계산되었습니다.

[선택 제품]
${JSON.stringify(selectedProducts, null, 2)}

[중복 성분]
${JSON.stringify(duplicateIngredients, null, 2)}

[Routine Score]
${routineScore} / 100

[Exposure Level]
${exposureLevel}

[Analysis Confidence]
${confidence}

규칙:
- 점수를 다시 계산하지 마세요.
- Exposure Level을 변경하지 마세요.
- 제공되지 않은 성분이나 농도를 추정하지 마세요.
- mg/day 등의 실제 노출량을 만들지 마세요.
- "안전하다", "위험하다"라고 단정하지 마세요.
- Exposure Level은 성분 위험도가 아니라 루틴 내 반복 정도입니다.
- 의료적 진단을 하지 마세요.
- 데이터가 부족하면 확인되지 않았다고 표현하세요.
- 쉬운 한국어로 설명하세요.

다음 형식으로 작성하세요.

[루틴 요약]

[확인된 중복 성분]

[확인이 필요한 부분]

[RoutineLab 제안]
`;

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-5",
          input: prompt
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(data);

      return res.status(response.status).json({
        error: data?.error?.message || "OpenAI API 요청 실패"
      });
    }

    let aiText = "";

    for (const outputItem of data.output || []) {
      if (outputItem.type === "message") {
        for (const contentItem of outputItem.content || []) {
          if (contentItem.type === "output_text") {
            aiText += contentItem.text;
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      insight: aiText
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      error: "AI 분석 중 오류가 발생했습니다."
    });
  }
}