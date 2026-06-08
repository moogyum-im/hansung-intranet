export async function POST(request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: 'ANTHROPIC_API_KEY 환경변수 없음' }, { status: 500 });

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: '요청 파싱 오류' }, { status: 400 });
  }

  const { siteName, progressRate, laborPlan, laborActual, plantingAnalysis } = body;
  if (!laborPlan || !laborActual) {
    return Response.json({ error: '분석에 필요한 공수 데이터가 없습니다.' }, { status: 400 });
  }

  // 과투입 비율 계산
  const overRatio = laborActual.ratio; // 100% = 계획 대비 정상, >100% = 과투입
  const laborDiff = laborActual.total - (laborActual.plannedSoFar || 0);

  // 공수가 많은 상위 수목 5개 추출
  const topItems = [...(plantingAnalysis || [])]
    .sort((a, b) => (b.planned?.skilled || 0) - (a.planned?.skilled || 0))
    .slice(0, 5);

  const prompt = `당신은 한국 조경공사 현장의 원가 분석 전문가입니다.
아래 데이터를 바탕으로 공수 과투입 여부를 분석하고, 원인과 개선 방향을 제시해주세요.

[현장 정보]
- 현장명: ${siteName}
- 현재 공정률: ${progressRate}%

[계획 공수 (표준품셈 기준)]
- 조경공 + 보통인부 합계: ${laborPlan.total}인
- 굴착기: ${laborPlan.excavator}일
- 크레인: ${laborPlan.crane}일

[실제 누계 공수 (최신 일보 기준)]
- 노무 누계: ${laborActual.total}인
- 굴착기 누계: ${laborActual.excavator}일
- 크레인 누계: ${laborActual.crane}일
- 현 공정률 기준 예상 공수: ${laborActual.plannedSoFar ?? 'N/A'}인
- 공수 투입 비율: ${overRatio != null ? overRatio + '%' : 'N/A'} (100% 기준 정상)

[공수 과투입 현황]
- 계획 대비 초과 인원: ${laborDiff > 0 ? '+' + Math.round(laborDiff * 10) / 10 : Math.round(laborDiff * 10) / 10}인

[계획 공수 상위 수목 항목]
${topItems.map(it =>
  `- ${it.species_name} (${it.spec}): 수량 ${it.quantity}${it.unit}, 계획 조경공 ${it.planned?.skilled}인, 보통인부 ${it.planned?.unskilled}인`
).join('\n')}

위 데이터를 분석하여 다음 항목을 포함한 텍스트를 작성해주세요:
1. 전체 공수 투입 현황 요약 (과투입 or 정상 여부 판단)
2. 과투입이 발생했다면 주요 원인 추정
3. 굴착기·크레인 장비 효율 평가
4. 향후 잔여 공사에 대한 공수 관리 권고사항

분석은 실무자가 바로 활용할 수 있도록 간결하게 한국어로 작성해주세요. 마크다운 형식(##, -, **) 사용 가능.`;

  let aiRes;
  try {
    aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-8',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
  } catch (e) {
    return Response.json({ error: `Anthropic API 연결 오류: ${e.message}` }, { status: 500 });
  }

  if (!aiRes.ok) {
    const errText = await aiRes.text();
    return Response.json({ error: `AI 오류 (${aiRes.status}): ${errText.slice(0, 300)}` }, { status: 500 });
  }

  const aiData = await aiRes.json();
  const analysis = aiData.content?.[0]?.text || '';

  return Response.json({ analysis });
}
