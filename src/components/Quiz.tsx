import { useState } from 'react';
import { questions } from '../diagnosis/questions';
import type { Answers } from '../diagnosis/types';

interface Props {
  onSubmit: (answers: Answers) => void;
  onExit: () => void;
}

export default function Quiz({ onSubmit, onExit }: Props) {
  const [answers, setAnswers] = useState<Answers>({});
  const [index, setIndex] = useState(0);

  const question = questions[index];
  const selected = answers[question.id];
  const isLast = index === questions.length - 1;
  const progress = Math.round(((index + (selected ? 1 : 0)) / questions.length) * 100);

  const select = (optionId: string) => {
    setAnswers((prev) => ({ ...prev, [question.id]: optionId }));
  };

  const goBack = () => {
    if (index === 0) {
      onExit();
      return;
    }
    setIndex((i) => i - 1);
    window.scrollTo({ top: 0 });
  };

  const goNext = () => {
    if (!selected) return;
    if (isLast) {
      onSubmit(answers);
      return;
    }
    setIndex((i) => i + 1);
    window.scrollTo({ top: 0 });
  };

  return (
    <section className="quiz">
      <header className="topbar">
        <button type="button" className="link-back" onClick={goBack}>
          {index === 0 ? '← На главную' : '← Назад'}
        </button>
        <span className="progress-label">
          Вопрос {index + 1} из {questions.length}
        </span>
      </header>

      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
        <span className="progress-bar" style={{ width: `${progress}%` }} />
      </div>

      <main className="quiz-body" key={question.id}>
        <h2 className="question-title">{question.title}</h2>
        {question.hint && <p className="question-hint">{question.hint}</p>}

        <div className="options" role="radiogroup" aria-label={question.title}>
          {question.options.map((option) => {
            const active = selected === option.id;
            return (
              <label key={option.id} className={`option${active ? ' option-active' : ''}`}>
                <input
                  type="radio"
                  name={question.id}
                  value={option.id}
                  checked={active}
                  onChange={() => select(option.id)}
                />
                <span className="option-mark" aria-hidden="true" />
                <span className="option-label">{option.label}</span>
              </label>
            );
          })}
        </div>
      </main>

      <footer className="quiz-footer">
        {index > 0 ? (
          <button type="button" className="btn btn-ghost" onClick={goBack}>
            Назад
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          className="btn btn-primary"
          onClick={goNext}
          disabled={!selected}
        >
          {isLast ? 'Получить результат' : 'Продолжить'}
        </button>
      </footer>
    </section>
  );
}
