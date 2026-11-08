import type { ScoreDetail } from '../diagnosis/types';
import { METRIC_PRESENTATION } from '../diagnosis/rules';
import type { Metric } from '../diagnosis/types';

interface Props {
  metric: Metric;
  score: ScoreDetail;
}

/** Визуальная шкала 0–100 без технических баллов и формул. */
export default function Gauge({ metric, score }: Props) {
  const presentation = METRIC_PRESENTATION[metric];

  return (
    <article className={`gauge gauge--${score.band}`}>
      <div className="gauge-head">
        <h3>{presentation.title}</h3>
        <span className="gauge-value">{score.value}</span>
      </div>

      <div
        className="gauge-track"
        role="progressbar"
        aria-valuenow={score.value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={presentation.title}
      >
        <div className="gauge-fill" style={{ width: `${score.value}%` }} />
      </div>

      <p className="gauge-label">{score.label}</p>
      <p className="gauge-note">{score.explanation[0]}</p>

      {score.explanation.length > 1 && (
        <details className="gauge-why">
          <summary>Какие ответы на это повлияли</summary>
          <ul>
            {score.explanation.slice(1).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}
