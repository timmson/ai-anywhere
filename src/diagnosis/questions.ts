/**
 * Конфигурация диагностической модели: вопросы, варианты ответов, веса.
 *
 * Модель полностью отделена от интерфейса. Чтобы настроить диагностику:
 *   · формулировки и веса ответов — этот файл;
 *   · пороги интерпретации, тексты рекомендаций и блоки архитектуры — `rules.ts`.
 * Компоненты UI при этом менять не нужно.
 */

import type { Question } from './types';

export const questions: Question[] = [
  {
    id: 'q1',
    title: 'Как часто выполняется этот бизнес-процесс?',
    options: [
      { id: 'q1-daily-multiple', label: 'Несколько раз в день.', weights: { business: 4 } },
      { id: 'q1-daily', label: 'Ежедневно.', weights: { business: 3 } },
      { id: 'q1-weekly', label: 'Несколько раз в неделю.', weights: { business: 2 } },
      { id: 'q1-monthly', label: 'Несколько раз в месяц.', weights: { business: 1 } },
      { id: 'q1-rare', label: 'Реже одного раза в месяц.', weights: { business: 0 } },
    ],
  },
  {
    id: 'q2',
    title: 'Сколько человеческих ресурсов требуется для выполнения процесса?',
    options: [
      { id: 'q2-min', label: 'Один человек тратит до 5 минут.', weights: { business: 0 } },
      { id: 'q2-low', label: 'Один человек тратит от 5 до 30 минут.', weights: { business: 1 } },
      { id: 'q2-mid', label: 'Один человек тратит от 30 минут до 2 часов.', weights: { business: 2 } },
      { id: 'q2-high', label: 'Один человек тратит от 2 часов до одного рабочего дня.', weights: { business: 3 } },
      { id: 'q2-team', label: 'Несколько человек тратят от 1 до 5 рабочих дней.', weights: { business: 4 } },
      { id: 'q2-heavy', label: 'Более 5 человек тратят более 5 рабочих дней.', weights: { business: 5 } },
    ],
  },
  {
    id: 'q3',
    title: 'Насколько процесс стандартизирован?',
    hint: 'Правила выполнения процесса обычно описаны, но не обязательно формализованы.',
    options: [
      { id: 'q3-full', label: 'Полностью стандартизирован: всегда выполняется по одним правилам.', weights: { readiness: 3, ai: 0 }, traits: ['stable-rules'] },
      { id: 'q3-main', label: 'В основном стандартизирован, но есть исключения.', weights: { readiness: 2, ai: 0 } },
      { id: 'q3-part', label: 'Частично стандартизирован: многое зависит от ситуации.', weights: { readiness: 1, ai: 1 }, traits: ['needs-interpretation'] },
      { id: 'q3-var', label: 'Практически каждый раз выполняется по-разному.', weights: { readiness: 0, ai: 2 }, traits: ['volatile-rules', 'needs-interpretation'] },
    ],
  },
  {
    id: 'q4',
    title: 'С какими данными работает процесс?',
    options: [
      { id: 'q4-structured', label: 'Структурированные данные (таблицы, формы, базы данных).', weights: { ai: 0 } },
      { id: 'q4-text', label: 'Текст (письма, документы, сообщения).', weights: { ai: 2 }, traits: ['semantic-text'] },
      { id: 'q4-images', label: 'Изображения, сканы, PDF.', weights: { ai: 2 }, traits: ['recognition-only', 'semantic-text'] },
      { id: 'q4-audio', label: 'Аудио или видео.', weights: { ai: 2 }, traits: ['semantic-text'] },
      { id: 'q4-multi', label: 'Разные типы данных одновременно.', weights: { ai: 3 }, traits: ['multimodal', 'semantic-text'] },
    ],
  },
  {
    id: 'q5',
    title: 'Насколько предсказуем результат обработки?',
    options: [
      { id: 'q5-definite', label: 'Результат всегда однозначен и определяется правилами.', weights: { readiness: 3, ai: 0 }, traits: ['stable-rules'] },
      { id: 'q5-known', label: 'Есть несколько возможных вариантов, но они заранее известны.', weights: { readiness: 2, ai: 1 } },
      { id: 'q5-context', label: 'Результат зависит от контекста и требует интерпретации.', weights: { readiness: 1, ai: 3 }, traits: ['needs-interpretation'] },
      { id: 'q5-expert', label: 'Результат требует экспертного суждения или творческого подхода.', weights: { readiness: 0, ai: 2 }, traits: ['expert-judgement', 'needs-interpretation'] },
    ],
  },
  {
    id: 'q6',
    title: 'Какую роль человек играет в выполнении процесса?',
    options: [
      { id: 'q6-launch', label: 'Человек только запускает процесс.', weights: { readiness: 3, ai: 0 }, traits: ['human-minimal'] },
      { id: 'q6-check', label: 'Человек проверяет результат автоматической обработки.', weights: { readiness: 2, ai: 1 }, traits: ['human-minimal'] },
      { id: 'q6-decide', label: 'Человек принимает отдельные решения в процессе.', weights: { readiness: 1, ai: 2 }, traits: ['human-decisions'] },
      { id: 'q6-communicate', label: 'Человеку требуется связываться с другими участниками для уточнения деталей.', weights: { readiness: 1, ai: 2 }, traits: ['needs-communication'] },
      { id: 'q6-all', label: 'Человек выполняет практически все действия самостоятельно.', weights: { readiness: 0, ai: 1 }, traits: ['human-everything'] },
    ],
  },
  {
    id: 'q7',
    title: 'Как происходит взаимодействие с используемыми в процессе программами и информационными системами?',
    options: [
      { id: 'q7-single', label: 'Вся работа происходит в одной программе.', complexity: 'low', traits: ['single-app'] },
      { id: 'q7-portable', label: 'Работа происходит в нескольких программах, между которыми можно переносить данные.', complexity: 'low-medium' },
      { id: 'q7-manual', label: 'Необходимо вручную переносить информацию между разными программами.', complexity: 'medium' },
      { id: 'q7-multi', label: 'Используются программы, электронная почта, мессенджеры и другие каналы одновременно.', complexity: 'high', traits: ['needs-communication'] },
      { id: 'q7-paper', label: 'Значительная часть работы выполняется с бумажными документами или вне информационных систем.', complexity: 'high' },
    ],
  },
  {
    id: 'q8',
    title: 'Какова цена ошибки при выполнении процесса?',
    options: [
      { id: 'q8-minor', label: 'Незначительная: ошибка легко исправляется.', risk: 'low' },
      { id: 'q8-moderate', label: 'Умеренная: приводит к дополнительным затратам времени или денег.', risk: 'medium' },
      { id: 'q8-high', label: 'Высокая: может привести к финансовым или репутационным потерям.', risk: 'high' },
      { id: 'q8-critical', label: 'Критическая: может повлечь юридические, финансовые или другие серьёзные последствия.', risk: 'critical' },
    ],
  },
  {
    id: 'q9',
    title: 'Какой результат вы ожидаете от автоматизации?',
    options: [
      { id: 'q9-time', label: 'Сократить время выполнения процесса.', weights: { business: 2 } },
      { id: 'q9-cost', label: 'Снизить операционные расходы.', weights: { business: 2 } },
      { id: 'q9-errors', label: 'Уменьшить количество ошибок.', weights: { business: 1 } },
      { id: 'q9-throughput', label: 'Увеличить пропускную способность процесса.', weights: { business: 2 } },
      { id: 'q9-cx', label: 'Улучшить качество обслуживания клиентов.', weights: { business: 1 } },
      { id: 'q9-new', label: 'Сделать возможным то, что сейчас невозможно выполнять вручную.', weights: { business: 3 }, traits: ['unlocks-new-capability'] },
    ],
  },
  {
    id: 'q10',
    title: 'Как часто меняются правила и условия выполнения процесса?',
    options: [
      { id: 'q10-never', label: 'Практически никогда: правила стабильны годами.', weights: { readiness: 3 }, traits: ['stable-rules'] },
      { id: 'q10-rare', label: 'Редко: изменения происходят несколько раз в год.', weights: { readiness: 2 } },
      { id: 'q10-periodic', label: 'Периодически: правила меняются каждый месяц или квартал.', weights: { readiness: 1 } },
      { id: 'q10-often', label: 'Часто: правила регулярно меняются в зависимости от ситуации.', weights: { readiness: 0 }, traits: ['volatile-rules'] },
      { id: 'q10-constant', label: 'Постоянно: единого устойчивого порядка выполнения нет.', weights: { readiness: 0 }, traits: ['volatile-rules'] },
    ],
  },
];
