/**
 * Доменные типы диагностической модели.
 *
 * Модель (вопросы, веса, правила) полностью отделена от интерфейса:
 * чтобы изменить диагностику, правьте только `questions.ts` и `rules.ts`,
 * компоненты UI трогать не нужно.
 */

/** Метрики, рассчитываемые движком. */
export type Metric = 'readiness' | 'ai' | 'business';

/**
 * Поведенческие теги ответа. Used by the engine for:
 * `llm` — ответ сам по себе требует смысловой обработки (гейт LLM);
 * противоречия и подбор архитектуры решения.
 */
export type AnswerTrait =
  /** Неструктурированный текст, смысл которого нужно понимать. */
  | 'semantic-text'
  /** Несколько типов данных одновременно. */
  | 'multimodal'
  /** Результат зависит от контекста. */
  | 'needs-interpretation'
  /** Результат требует экспертного суждения. */
  | 'expert-judgement'
  /** Распознавание, но не понимание: OCR/шаблоны закрывают задачу. */
  | 'recognition-only'
  /** Человек в процессе почти не участвует. */
  | 'human-minimal'
  /** Человек принимает решения. */
  | 'human-decisions'
  /** Нужна коммуникация с другими участниками. */
  | 'needs-communication'
  /** Человек делает всё вручную. */
  | 'human-everything'
  | 'single-app'
  | 'portable-data'
  | 'manual-transfer'
  | 'multi-channel'
  | 'paper-heavy'
  /** Ожидание недостижимого вручную. */
  | 'unlocks-new-capability'
  /** Правила стабильны. */
  | 'stable-rules'
  /** Правила меняются часто или их нет. */
  | 'volatile-rules';

export interface AnswerOption {
  /** Стабильный идентификатор: используется в ответах и тестах. */
  id: string;
  /** Формулировка варианта в интерфейсе. */
  label: string;
  /**
   * Вклад варианта в метрики. Отсутствие ключа = 0 баллов.
   * Максимумы метрик считаются автоматически из этих весов,
   * поэтому правка веса не ломает диапазон 0–100.
   */
  weights?: Partial<Record<Metric, number>>;
  traits?: AnswerTrait[];
  /** Сложность технической реализации, если вариант её задаёт (вопрос 7). */
  complexity?: Complexity;
  /** Уровень риска, если вариант его задаёт (вопрос 8). */
  risk?: Risk;
}

export interface Question {
  id: string;
  /** Порядковый номер совпадает с позицией в массиве + 1. */
  title: string;
  /** Короткая подсказка под заголовком (не раскрывает баллы). */
  hint?: string;
  options: AnswerOption[];
}

export type Complexity = 'low' | 'low-medium' | 'medium' | 'high';

export type Risk = 'low' | 'medium' | 'high' | 'critical';

/**
 * Ответы пользователя: questionId -> optionId.
 * Значение может отсутствовать — движок обязан корректно считать результат
 * и в этом случае (см. защиту от отсутствующих ответов).
 */
export type Answers = Record<string, string | undefined>;

export type Band = 'low' | 'medium' | 'high';

export interface ScoreDetail {
  /** Итоговый балл 0–100. */
  value: number;
  band: Band;
  /** Человекочитаемая интерпретация уровня. */
  label: string;
  /** Что повлияло на результат (без формул и баллов). */
  explanation: string[];
}

export type RecommendationKind = 'classic' | 'hybrid' | 'partial' | 'optimize' | 'none';

export interface ArchitectureComponent {
  role: string;
  title: string;
  description: string;
  /** Компонент добавлен из-за конкретного сигнала в ответах. */
  reason: string;
}

export interface Contradiction {
  title: string;
  description: string;
}

export interface DiagnosisResult {
  readiness: ScoreDetail;
  ai: ScoreDetail;
  business: ScoreDetail;
  complexity: Complexity;
  risk: Risk;
  /** Нужен ли обязательный контроль человека. */
  humanControl: { required: boolean; note: string };
  recommendation: {
    kind: RecommendationKind;
    title: string;
    summary: string;
    solutions: string[];
    /** Показывать ли LLM как часть решения. */
    llmRecommended: boolean;
    llmReasons: string[];
    llmBlockedReason?: string;
  };
  architecture: ArchitectureComponent[];
  contradictions: Contradiction[];
  nextSteps: string[];
}
