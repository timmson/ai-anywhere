/**
 * Scoring engine диагностики. Чистые функции, без зависимости от React.
 *
 * Вход — карта ответов (questionId -> optionId), выход — готовый к показу
 * результат. Все числа считаются из весов в `questions.ts`, тексты — из
 * `rules.ts`, поэтому диагностическую модель можно менять, не трогая движок.
 */

import type {
  Answers,
  ArchitectureComponent,
  Band,
  Complexity,
  Contradiction,
  DiagnosisResult,
  Metric,
  RecommendationKind,
  Risk,
  ScoreDetail,
} from './types';
import { questions } from './questions';
import {
  ARCHITECTURE_LIBRARY,
  BAND_THRESHOLDS,
  COMPLEXITY_LABEL,
  COMPLEXITY_NOTE,
  HUMAN_CONTROL_LABEL,
  METRIC_PRESENTATION,
  RECOMMENDATIONS,
  RISK_LABEL,
  RISK_NOTE,
  questionShortLabels,
} from './rules';

const questionById = new Map(questions.map((q) => [q.id, q]));

const METRIC_QUESTIONS: Record<Metric, string[]> = {
  readiness: ['q3', 'q5', 'q6', 'q10'],
  ai: ['q3', 'q4', 'q5', 'q6'],
  business: ['q1', 'q2', 'q9'],
};

/**
 * Максимум метрики = сумма максимально возможных весов её вопросов.
 * Считается из конфигурации, поэтому диапазон 0–100 остаётся корректным
 * после любой правки весов.
 */
function maxPoints(metric: Metric): number {
  return METRIC_QUESTIONS[metric].reduce((sum, qid) => {
    const q = questionById.get(qid);
    if (!q) return sum;
    const best = Math.max(...q.options.map((o) => o.weights?.[metric] ?? 0), 0);
    return sum + best;
  }, 0);
}

/** Ответ на вопрос в виде optionId либо undefined, если ответа нет. */
function getAnswer(answers: Answers, qid: string): string | undefined {
  return answers[qid];
}

function bandOf(metric: Metric, value: number): Band {
  const thresholds = BAND_THRESHOLDS[metric];
  if (value >= thresholds.high) return 'high';
  if (value >= thresholds.medium) return 'medium';
  return 'low';
}

/**
 * Считает метрику и формирует объяснение из тех ответов, которые реально
 * на неё повлияли (вклад > 0), в порядке убывания вклада.
 */
function scoreMetric(metric: Metric, answers: Answers): ScoreDetail {
  const max = maxPoints(metric);
  const ids = METRIC_QUESTIONS[metric];

  const contributions = ids.map((qid) => {
    const q = questionById.get(qid);
    const optionId = answers[qid];
    const option = optionId === undefined ? undefined : q?.options.find((o) => o.id === optionId);
    const earned = option?.weights?.[metric] ?? 0;
    const best = Math.max(...(q?.options.map((o) => o.weights?.[metric] ?? 0) ?? [0]), 0);
    return {
      qid,
      label: option?.label ?? 'нет ответа',
      earned,
      share: best > 0 ? earned / best : 0,
    };
  });

  const points = contributions.reduce((sum, c) => sum + c.earned, 0);
  const raw = max > 0 ? (points / max) * 100 : 0;
  const value = Math.max(0, Math.min(100, Math.round(raw)));
  const band = bandOf(metric, value);

  const presentation = METRIC_PRESENTATION[metric];
  const influenced = contributions
    .filter((c) => c.earned > 0)
    .sort((a, b) => b.share - a.share || b.earned - a.earned)
    .slice(0, 3)
    .map((c) => `${questionShortLabels[c.qid as keyof typeof questionShortLabels]}: «${c.label}»`);

  const explanation =
    influenced.length > 0
      ? [presentation[`${band}Note` as keyof typeof presentation] as string, ...influenced]
      : [
          presentation[`${band}Note` as keyof typeof presentation] as string,
          'Ни один из ответов не добавил баллов этому показателю.',
        ];

  return { value, band, label: presentation[band], explanation };
}

export interface LlmGate {
  justified: boolean;
  reasons: string[];
  blockedReason?: string;
}

/**
 * Гейт LLM. Высокий AI Applicability сам по себе ИИ не рекомендует:
 * модель оправдана только когда нужно понимать смысл, а не распознавать форму.
 */
export function evaluateLlmGate(answers: Answers): LlmGate {
  const reasons: string[] = [];
  const traits = new Set(
    Object.entries(answers).flatMap(([qid, optionId]) => {
      const option = questionById.get(qid)?.options.find((o) => o.id === optionId);
      return option?.traits ?? [];
    }),
  );

  if (traits.has('needs-interpretation')) {
    reasons.push('результат получается из контекста, а не из фиксированного набора правил');
  }
  if (traits.has('expert-judgement')) {
    reasons.push('нужно формировать содержательный вывод, а не выбирать из заранее известного');
  }
  if (traits.has('semantic-text') && traits.has('needs-interpretation')) {
    reasons.push('содержимое неструктурировано и его смысл надо извлекать');
  }
  if (traits.has('multimodal')) {
    reasons.push('данные разных типов нужно сводить в общий смысл');
  }
  if (traits.has('unlocks-new-capability')) {
    reasons.push('ожидается результат, который правилами сейчас не получить');
  }

  const q3 = getAnswer(answers, 'q3');
  const q4 = getAnswer(answers, 'q4');
  const q5 = getAnswer(answers, 'q5');

  // Распознавание документа — не понимание документа: OCR/шаблоны закрывают задачу.
  const recognitionOnly =
    (q4 === 'q4-images' || q4 === 'q4-audio') &&
    q5 === 'q5-definite' &&
    (q3 === 'q3-full' || q3 === 'q3-main');

  if (recognitionOnly) {
    return {
      justified: false,
      reasons: [],
      blockedReason:
        'Работа с документами сама по себе не требует ИИ: в ваших ответах результат однозначен и определяется правилами, поэтому достаточно распознавания (OCR) и обычной обработки данных.',
    };
  }

  if (q4 === 'q4-structured' && q5 === 'q5-definite') {
    return {
      justified: false,
      reasons: [],
      blockedReason:
        'Данные структурированы, а результат определяется правилами — эту задачу решает обычное программное обеспечение, LLM не нужен.',
    };
  }

  return { justified: reasons.length > 0, reasons };
}

function complexityOf(answers: Answers): Complexity {
  const option = questionById.get('q7')?.options.find((o) => o.id === answers.q7);
  const fromAnswer = option?.complexity;
  if (fromAnswer) return fromAnswer;
  // Ответа нет — берём середину шкалы, а не оптимистичный вариант.
  return 'medium';
}

function riskOf(answers: Answers): Risk {
  const option = questionById.get('q8')?.options.find((o) => o.id === answers.q8);
  return option?.risk ?? 'medium';
}

function humanControlOf(risk: Risk): { required: boolean; note: string } {
  const required = risk === 'high' || risk === 'critical';
  const label = required
    ? HUMAN_CONTROL_LABEL.mandatory
    : risk === 'medium'
      ? HUMAN_CONTROL_LABEL.sample
      : HUMAN_CONTROL_LABEL.minimal;
  return { required, note: `${label}. ${RISK_NOTE[risk]}` };
}

export interface RecommendationDecision {
  kind: RecommendationKind;
  /** Почему выбран именно этот сценарий — в терминах комбинации показателей. */
  rule: string;
}

/**
 * Итоговая рекомендация. Решает комбинация трёх метрик плюс гейт LLM и риск:
 * ни один показатель сам по себе вывод не определяет.
 */
export function decideRecommendation(
  readiness: number,
  ai: number,
  business: number,
  gate: LlmGate,
): RecommendationDecision {
  const highReadiness = readiness >= BAND_THRESHOLDS.readiness.high;
  const lowReadiness = readiness < BAND_THRESHOLDS.readiness.medium;
  const highAi = ai >= BAND_THRESHOLDS.ai.medium && gate.justified;

  if (business < BAND_THRESHOLDS.business.medium) {
    return {
      kind: 'none',
      rule: 'Бизнес-ценность ниже порога: автоматизация не окупается, даже если технически она возможна.',
    };
  }
  if (lowReadiness && !highAi) {
    return {
      kind: 'optimize',
      rule: 'Низкая готовность при низкой потребности в смысловой обработке: сначала стандартизация.',
    };
  }
  if (lowReadiness && highAi) {
    return {
      kind: 'partial',
      rule: 'Низкая готовность, но смысл разбирать нужно: автоматизация с участием человека.',
    };
  }
  if (highReadiness && highAi) {
    return {
      kind: 'hybrid',
      rule: 'Высокая готовность плюс обоснованная потребность в понимании смысла: гибрид правил и ИИ.',
    };
  }
  if (highReadiness) {
    return {
      kind: 'classic',
      rule: 'Процесс формализован, а смысловая обработка не обоснована: достаточно классической автоматизации.',
    };
  }
  return {
    kind: highAi ? 'partial' : 'classic',
    rule: 'Средняя готовность: процесс формализуется частично, поэтому внедрение начинают с отдельных шагов.',
  };
}

function buildArchitecture(
  answers: Answers,
  kind: RecommendationKind,
  gate: LlmGate,
  risk: Risk,
): ArchitectureComponent[] {
  const pick = (key: keyof typeof ARCHITECTURE_LIBRARY): ArchitectureComponent => ({
    ...ARCHITECTURE_LIBRARY[key],
  });

  const optimizePlan: Array<keyof typeof ARCHITECTURE_LIBRARY> = [
    'opt_as_is',
    'opt_exceptions',
    'opt_simplify',
    'opt_standard',
    'opt_rediagnose',
  ];
  const nonePlan: Array<keyof typeof ARCHITECTURE_LIBRARY> = ['none_measure', 'none_templates', 'none_script'];

  if (kind === 'optimize') return optimizePlan.map(pick);
  if (kind === 'none') return nonePlan.map(pick);

  const q4 = answers.q4;
  const q7 = answers.q7;
  const components: ArchitectureComponent[] = [];

  if (q4 === 'q4-structured') components.push(pick('intake_form'));
  if (q4 === 'q4-text') components.push(pick('intake_mail'));
  if (q4 === 'q4-images') components.push(pick('intake_ocr'));
  if (q4 === 'q4-audio') components.push(pick('intake_audio'));
  if (q4 === 'q4-multi') {
    components.push(pick('intake_mail'));
    components.push(pick('intake_ocr'));
  }
  if (q4 === undefined) components.push(pick('intake_form'));

  if (kind === 'classic') {
    components.push(pick('core_rules'));
    if (answers.q5 === 'q5-known') components.push(pick('core_classify'));
  }
  if (kind === 'hybrid') {
    components.push(pick('core_rules'));
    if (gate.justified) {
      components.push(pick('core_llm'));
      components.push(pick('core_guard'));
    } else {
      components.push(pick('core_classify'));
    }
  }
  if (kind === 'partial') {
    if (gate.justified) {
      components.push(pick('core_llm'));
      components.push(pick('core_guard'));
    }
    components.push(pick('core_rules'));
    components.push(pick('human_workbench'));
  }

  if (q7 === 'q7-single') components.push(pick('int_single'));
  if (q7 === 'q7-portable' || q7 === 'q7-manual') components.push(pick('int_api'));
  if (q7 === 'q7-multi') {
    components.push(pick('int_api'));
    components.push(pick('int_channels'));
  }
  if (q7 === 'q7-paper') {
    components.push(pick('int_digitize'));
    components.push(pick('int_api'));
  }
  if (q7 === undefined) components.push(pick('int_api'));

  components.push(pick('store_case'));

  if (risk === 'high' || risk === 'critical') {
    components.push(pick('human_approval'));
    components.push(pick('obs_audit'));
  } else {
    components.push(pick('obs_control'));
  }
  components.push(pick('obs_metrics'));

  return dedupe(components);
}

function dedupe(list: ArchitectureComponent[]): ArchitectureComponent[] {
  const seen = new Set<string>();
  return list.filter((c) => (seen.has(c.title) ? false : (seen.add(c.title), true)));
}

/** Честно показываем конфликты в ответах вместо категоричного вывода по одному баллу. */
function detectContradictions(answers: Answers, ai: number, gate: LlmGate): Contradiction[] {
  const out: Contradiction[] = [];

  if (answers.q3 === 'q3-full' && answers.q5 === 'q5-expert') {
    out.push({
      title: 'Стандартный процесс с неформализуемым результатом',
      description:
        'Процесс назван всегда выполняемым по одним правилам, но результат требует экспертного суждения. Обычно это значит, что правила описывают типовой сценарий, а исключения не зафиксированы — их и нужно разбирать в первую очередь.',
    });
  }

  if ((answers.q3 === 'q3-full' || answers.q3 === 'q3-main') && (answers.q10 === 'q10-often' || answers.q10 === 'q10-constant')) {
    out.push({
      title: 'Стабильные правила, которые часто меняются',
      description:
        'Вы описали процесс как стандартизированный, но правила меняются регулярно. Стоит проверить актуальность регламента: иначе автоматизация закрепит устаревший порядок.',
    });
  }

  if ((answers.q5 === 'q5-definite' || answers.q5 === 'q5-known') && answers.q3 === 'q3-var') {
    out.push({
      title: 'Предсказуемый результат при непредсказуемом ходе работ',
      description:
        'Результат описан как однозначный, хотя процесс каждый раз выполняется по-разному. Вероятно, предсказуем итог, а не путь: автоматизировать стоит именно шаг, дающий этот итог.',
    });
  }

  if (answers.q4 === 'q4-structured' && answers.q7 === 'q7-paper') {
    out.push({
      title: 'Структурированные данные на бумаге',
      description:
        'Данные названы структурированными, но значительная часть работы идёт вне информационных систем. Сначала нужен переход к цифровому виду — без этого автоматизация невозможна.',
    });
  }

  if (answers.q6 === 'q6-all' && answers.q1 === 'q1-daily-multiple') {
    out.push({
      title: 'Полностью ручная работа несколько раз в день',
      description:
        'Процесс выполняется вручную, но очень часто. Даже при неформализованных правилах это сильный кандидат на автоматизацию отдельных рутинных шагов — ждать полной стандартизации не обязательно.',
    });
  }

  if (ai >= BAND_THRESHOLDS.ai.medium && !gate.justified) {
    out.push({
      title: 'Высокий показатель ИИ без необходимости в ИИ',
      description: gate.blockedReason
        ? `${gate.blockedReason} Поэтому в рекомендации LLM не участвует, несмотря на высокий балл по типу данных.`
        : 'Показатель вырос за счёт типа данных, а не за счёт необходимости понимать смысл. В рекомендации LLM не участвует.',
    });
  }

  return out;
}

/** Гарантирует валидный результат даже при неполных или пустых ответах. */
export function diagnose(answers: Answers): DiagnosisResult {
  const readiness = scoreMetric('readiness', answers);
  const ai = scoreMetric('ai', answers);
  const business = scoreMetric('business', answers);

  const gate = evaluateLlmGate(answers);
  const risk = riskOf(answers);
  const complexity = complexityOf(answers);
  const decision = decideRecommendation(readiness.value, ai.value, business.value, gate);
  const content = RECOMMENDATIONS[decision.kind];
  const llmRecommended = (decision.kind === 'hybrid' || decision.kind === 'partial') && gate.justified;

  const nextSteps =
    risk === 'high' || risk === 'critical'
      ? [...content.nextSteps, 'Отдельно опишите процедуру подтверждения критических действий и порядок разбора ошибок.']
      : content.nextSteps;

  return {
    readiness,
    ai,
    business,
    complexity,
    risk,
    humanControl: humanControlOf(risk),
    recommendation: {
      kind: decision.kind,
      title: content.title,
      summary: `${content.lead} ${content.when}`,
      solutions: content.solutions,
      llmRecommended,
      llmReasons: gate.reasons,
      llmBlockedReason: gate.blockedReason,
    },
    architecture: buildArchitecture(answers, decision.kind, gate, risk),
    contradictions: detectContradictions(answers, ai.value, gate),
    nextSteps,
  };
}

export function describeComplexity(complexity: Complexity): string {
  return `${COMPLEXITY_LABEL[complexity]}. ${COMPLEXITY_NOTE[complexity]}`;
}

export function describeRisk(risk: Risk): string {
  return RISK_LABEL[risk];
}

export function missingQuestions(answers: Answers): string[] {
  return questions.filter((q) => answers[q.id] === undefined).map((q) => q.id);
}
