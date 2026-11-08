import { describe, expect, it } from 'vitest';
import { diagnose, decideRecommendation, evaluateLlmGate, missingQuestions } from './scoring';
import { questions } from './questions';
import type { Answers, DiagnosisResult } from './types';

/** Все ответы выбираются по одному на вопрос — удобно для граничных сценариев. */
function answersOf(picks: Record<string, string>): Answers {
  return { ...picks };
}

function allScores(result: DiagnosisResult): number[] {
  return [result.readiness.value, result.ai.value, result.business.value];
}

const MINIMAL = answersOf({
  q1: 'q1-rare',
  q2: 'q2-min',
  q3: 'q3-var',
  q4: 'q4-structured',
  q5: 'q5-expert',
  q6: 'q6-all',
  q7: 'q7-single',
  q8: 'q8-minor',
  q9: 'q9-errors',
  q10: 'q10-constant',
});

const MAXIMAL = answersOf({
  q1: 'q1-daily-multiple',
  q2: 'q2-heavy',
  q3: 'q3-var',
  q4: 'q4-multi',
  q5: 'q5-context',
  q6: 'q6-decide',
  q7: 'q7-multi',
  q8: 'q8-critical',
  q9: 'q9-new',
  q10: 'q10-never',
});

/** Максимум готовности: стабильные правила и минимальная роль человека. */
const READINESS_MAX = answersOf({
  q3: 'q3-full',
  q5: 'q5-definite',
  q6: 'q6-launch',
  q10: 'q10-never',
});

/** Максимум применимости ИИ: нестабильные правила и смысловая интерпретация. */
const AI_MAX = answersOf({
  q3: 'q3-var',
  q4: 'q4-multi',
  q5: 'q5-context',
  q6: 'q6-decide',
});

/** Максимум бизнес-ценности: частая и трудоёмкая работа с новым результатом. */
const BUSINESS_MAX = answersOf({
  q1: 'q1-daily-multiple',
  q2: 'q2-heavy',
  q9: 'q9-new',
});

const CLASSIC = answersOf({
  q1: 'q1-daily',
  q2: 'q2-mid',
  q3: 'q3-full',
  q4: 'q4-structured',
  q5: 'q5-definite',
  q6: 'q6-launch',
  q7: 'q7-single',
  q8: 'q8-minor',
  q9: 'q9-time',
  q10: 'q10-never',
});

const HYBRID = answersOf({
  q1: 'q1-daily',
  q2: 'q2-high',
  q3: 'q3-full',
  q4: 'q4-text',
  q5: 'q5-context',
  q6: 'q6-launch',
  q7: 'q7-portable',
  q8: 'q8-moderate',
  q9: 'q9-cost',
  q10: 'q10-never',
});

describe('граничные значения', () => {
  it('все минимальные баллы дают 0–100 и низкую ценность', () => {
    const result = diagnose(MINIMAL);
    allScores(result).forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    });
    expect(result.business.value).toBeLessThan(40);
    expect(result.recommendation.kind).toBe('none');
  });

  it('максимальные ответы дают 100 по готовности', () => {
    expect(diagnose(READINESS_MAX).readiness.value).toBe(100);
  });

  it('максимальные ответы дают 100 по применимости ИИ', () => {
    expect(diagnose(AI_MAX).ai.value).toBe(100);
  });

  it('максимальные ответы дают 100 по бизнес-ценности', () => {
    expect(diagnose(BUSINESS_MAX).business.value).toBe(100);
  });

  it('ни один набор ответов не выводит метрики за диапазон 0–100', () => {
    // Перебираем все варианты каждого вопроса по отдельности и парами.
    for (const q of questions) {
      for (const option of q.options) {
        const result = diagnose({ [q.id]: option.id });
        allScores(result).forEach((v) => {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(100);
        });
      }
    }
  });

  it('пустые ответы не ломают расчёт', () => {
    const result = diagnose({});
    allScores(result).forEach((v) => {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    });
    expect(result.recommendation.kind).toBe('none');
    expect(result.humanControl.required).toBe(false);
    expect(result.architecture.length).toBeGreaterThan(0);
  });

  it('частичные ответы обрабатываются без исключений', () => {
    const result = diagnose({ q1: 'q1-daily', q5: 'q5-context' });
    allScores(result).forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    });
    expect(missingQuestions({ q1: 'q1-daily' })).toHaveLength(questions.length - 1);
  });
});

describe('сценарии рекомендаций', () => {
  it('формализованный процесс без смысловой обработки → классическая автоматизация', () => {
    const result = diagnose(CLASSIC);
    expect(result.readiness.value).toBeGreaterThanOrEqual(70);
    expect(result.ai.value).toBeLessThan(40);
    expect(result.recommendation.kind).toBe('classic');
    expect(result.recommendation.llmRecommended).toBe(false);
  });

  it('текст и контекст при высокой готовности → гибрид с ИИ', () => {
    const result = diagnose(HYBRID);
    expect(result.recommendation.kind).toBe('hybrid');
    expect(result.recommendation.llmRecommended).toBe(true);
  });

  it('низкая готовность и высокая потребность в ИИ → участие человека', () => {
    const decision = decideRecommendation(30, 80, 70, { justified: true, reasons: ['контекст'] });
    expect(decision.kind).toBe('partial');
  });

  it('низкая готовность без смысловой обработки → сначала оптимизация', () => {
    const decision = decideRecommendation(20, 10, 80, { justified: false, reasons: [] });
    expect(decision.kind).toBe('optimize');
  });

  it('низкая бизнес-ценность отменяет автоматизацию даже при хорошей технике', () => {
    const decision = decideRecommendation(100, 100, 20, { justified: true, reasons: ['контекст'] });
    expect(decision.kind).toBe('none');
  });
});

describe('гейт LLM', () => {
  it('распознавание документов не считается поводом для LLM', () => {
    const gate = evaluateLlmGate(
      answersOf({ q3: 'q3-full', q4: 'q4-images', q5: 'q5-definite', q6: 'q6-launch' }),
    );
    expect(gate.justified).toBe(false);
    expect(gate.blockedReason).toBeTruthy();
  });

  it('структурированные данные с правилами не требуют LLM', () => {
    const gate = evaluateLlmGate(answersOf({ q4: 'q4-structured', q5: 'q5-definite' }));
    expect(gate.justified).toBe(false);
  });

  it('интерпретация контекста обосновывает LLM', () => {
    const gate = evaluateLlmGate(answersOf({ q4: 'q4-text', q5: 'q5-context' }));
    expect(gate.justified).toBe(true);
    expect(gate.reasons.length).toBeGreaterThan(0);
  });

  it('высокий AI Applicability без смысловой задачи не даёт рекомендацию LLM', () => {
    const result = diagnose(
      answersOf({
        q1: 'q1-daily',
        q2: 'q2-mid',
        q3: 'q3-main',
        q4: 'q4-images',
        q5: 'q5-known',
        q6: 'q6-check',
        q7: 'q7-portable',
        q8: 'q8-minor',
        q9: 'q9-time',
        q10: 'q10-rare',
      }),
    );
    expect(result.ai.value).toBeGreaterThanOrEqual(40);
    expect(result.recommendation.llmRecommended).toBe(false);
    expect(result.contradictions.length).toBeGreaterThan(0);
  });
});

describe('риск и сложность', () => {
  it('критический риск требует обязательного контроля человека', () => {
    const result = diagnose({ ...CLASSIC, q8: 'q8-critical' });
    expect(result.risk).toBe('critical');
    expect(result.humanControl.required).toBe(true);
    expect(result.architecture.some((c) => c.title.includes('подтверждения'))).toBe(true);
    expect(result.nextSteps.join(' ')).toMatch(/подтвержд/i);
  });

  it('незначительная цена ошибки не требует обязательного контроля', () => {
    const result = diagnose({ ...CLASSIC, q8: 'q8-minor' });
    expect(result.humanControl.required).toBe(false);
  });

  it('бумажный документооборот даёт высокую сложность', () => {
    const result = diagnose({ ...CLASSIC, q7: 'q7-paper' });
    expect(result.complexity).toBe('high');
    expect(result.architecture.some((c) => c.role === 'Интеграция')).toBe(true);
  });

  it('одна программа даёт низкую сложность', () => {
    expect(diagnose({ ...CLASSIC, q7: 'q7-single' }).complexity).toBe('low');
  });
});

describe('архитектура под ответы', () => {
  it('состав блоков различается для разных ответов', () => {
    const classic = diagnose(CLASSIC).architecture.map((c) => c.title).join('|');
    const hybrid = diagnose(HYBRID).architecture.map((c) => c.title).join('|');
    expect(classic).not.toBe(hybrid);
  });

  it('LLM-слой появляется только при обоснованной потребности', () => {
    const withLlm = diagnose(HYBRID).architecture.some((c) => c.title.includes('LLM'));
    const withoutLlm = diagnose(CLASSIC).architecture.some((c) => c.title.includes('LLM'));
    expect(withLlm).toBe(true);
    expect(withoutLlm).toBe(false);
  });
});

describe('конфигурация вопросов', () => {
  it('содержит ровно 10 вопросов с уникальными id и вариантами', () => {
    expect(questions).toHaveLength(10);
    const ids = new Set(questions.map((q) => q.id));
    expect(ids.size).toBe(10);
    questions.forEach((q) => {
      expect(q.options.length).toBeGreaterThan(1);
      const optionIds = new Set(q.options.map((o) => o.id));
      expect(optionIds.size).toBe(q.options.length);
    });
  });

  it('каждый вариант ответа ссылается на существующий вопрос', () => {
    const allIds = new Set(questions.flatMap((q) => q.options.map((o) => o.id)));
    Object.values(MAXIMAL).forEach((optionId) => {
      if (optionId) expect(allIds.has(optionId)).toBe(true);
    });
  });
});
