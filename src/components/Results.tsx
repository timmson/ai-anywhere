import type { DiagnosisResult } from '../diagnosis/types';
import Gauge from './Gauge';
import { COMPLEXITY_LABEL, COMPLEXITY_NOTE, RISK_LABEL } from '../diagnosis/rules';
import { useCallback } from 'react';

interface Props {
  result: DiagnosisResult;
  onRestart: () => void;
}

export default function Results({ result, onRestart }: Props) {
  const { recommendation } = result;

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <main className="results">
      <header className="results-head">
        <p className="eyebrow">Индивидуальный результат</p>
        <h2>Диагностика завершена</h2>
        <p className="results-sub">
          Оценка предварительная: она опирается на ваши ответы и не заменяет разбор процесса с
          участниками.
        </p>
      </header>

      <div className="gauges">
        <Gauge metric="readiness" score={result.readiness} />
        <Gauge metric="ai" score={result.ai} />
        <Gauge metric="business" score={result.business} />
      </div>

      <article className="card recommendation">
        <p className="eyebrow">Главная рекомендация</p>
        <h3>{recommendation.title}</h3>
        <p className="rec-summary">{recommendation.summary}</p>

        <h4>Подходящие решения</h4>
        <ul className="solutions">
          {recommendation.solutions.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>

        {recommendation.llmRecommended ? (
          <div className="llm-note llm-note--yes">
            <h4>Почему здесь нужен ИИ</h4>
            <ul>
              {recommendation.llmReasons.map((r) => (
                <li key={r}>{r.charAt(0).toUpperCase() + r.slice(1)}.</li>
              ))}
            </ul>
            <p className="llm-hint">
              Автономность модели стоит ограничить: она готовит черновик, подтверждение остаётся за
              человеком.
            </p>
          </div>
        ) : recommendation.llmBlockedReason ? (
          <div className="llm-note llm-note--no">
            <h4>Почему здесь не нужен ИИ</h4>
            <p>{recommendation.llmBlockedReason}</p>
          </div>
        ) : (
          <div className="llm-note llm-note--no">
            <h4>Почему здесь не нужен ИИ</h4>
            <p>
              В ваших ответах нет задачи, где требуется понимать смысл неструктурированных данных.
              Достаточно правил, скриптов и интеграций.
            </p>
          </div>
        )}
      </article>

      <div className="factors">
        <article className="card factor">
          <h4>Сложность технической реализации</h4>
          <p className="factor-value">{COMPLEXITY_LABEL[result.complexity]}</p>
          <p className="factor-note">{COMPLEXITY_NOTE[result.complexity]}</p>
        </article>
        <article className="card factor">
          <h4>Уровень риска</h4>
          <p className={`factor-value factor-value--${result.risk}`}>{RISK_LABEL[result.risk]}</p>
          <p className="factor-note">{result.humanControl.note}</p>
        </article>
        <article className="card factor">
          <h4>Необходимость участия человека</h4>
          <p className="factor-value">
            {result.humanControl.required ? 'Обязательна' : 'Желательна'}
          </p>
          <p className="factor-note">
            {result.humanControl.required
              ? 'Критические действия выполняются только после подтверждения ответственным.'
              : 'Человек контролирует результат и спорные случаи, рутину можно отдать системе.'}
          </p>
        </article>
      </div>

      {result.contradictions.length > 0 && (
        <article className="card contradictions">
          <h3>Ответы частично противоречат друг другу</h3>
          {result.contradictions.map((c) => (
            <div key={c.title} className="contradiction">
              <h4>{c.title}</h4>
              <p>{c.description}</p>
            </div>
          ))}
        </article>
      )}

      <article className="card architecture">
        <h3>Как это может выглядеть на практике</h3>
        <p className="architecture-sub">
          Состав слоёв собран по вашим ответам: тип данных, работа с системами и цена ошибки.
        </p>
        <ol className="layers">
          {result.architecture.map((c) => (
            <li key={c.title} className="layer">
              <span className="layer-role">{c.role}</span>
              <div className="layer-body">
                <h4>{c.title}</h4>
                <p>{c.description}</p>
                <p className="layer-reason">Потому что: {c.reason}</p>
              </div>
            </li>
          ))}
        </ol>
      </article>

      <article className="card next-steps">
        <h3>С чего начать</h3>
        <ol>
          {result.nextSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </article>

      <div className="results-actions">
        <button type="button" className="btn btn-primary" onClick={handlePrint}>
          <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: 'currentColor', marginRight: 4 }} focusable="false">
            <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2z" />
          </svg>
          Скачать отчёт PDF
        </button>
        <button type="button" className="btn btn-ghost" onClick={onRestart} style={{ marginLeft: '0.5rem' }}>
          Пройти заново
        </button>
      </div>
    </main>
  );
}
