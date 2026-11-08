interface Props {
  onStart: () => void;
}

export default function Hero({ onStart }: Props) {
  return (
    <section className="hero">
      <header className="topbar">
        <span className="brand">Диагностика процессов</span>
        <span className="brand-note">Без регистрации и отправки данных</span>
      </header>

      <main className="hero-inner">
        <p className="eyebrow">Первичная оценка перед внедрением</p>
        <h1 className="hero-title">Можно ли автоматизировать ваш бизнес-процесс?</h1>
        <p className="hero-subtitle">
          Ответьте на 10 простых вопросов и узнайте, достаточно ли обычного программного обеспечения
          или вашему процессу действительно нужен искусственный интеллект.
        </p>

        <button type="button" className="btn btn-primary btn-lg" onClick={onStart}>
          Пройти диагностику
        </button>

        <p className="hero-meta">10 вопросов · 3–5 минут · Бесплатно</p>

        <ul className="hero-points">
          <li>
            <span className="point-num">1</span>
            <div>
              <h2 className="point-title">Поймёте, есть ли смысл</h2>
              <p>Частота и трудоёмкость процесса против стоимости внедрения.</p>
            </div>
          </li>
          <li>
            <span className="point-num">2</span>
            <div>
              <h2 className="point-title">Узнаете, чем решать</h2>
              <p>Обычное ПО, гибрид с ИИ или пока только оптимизация процесса.</p>
            </div>
          </li>
          <li>
            <span className="point-num">3</span>
            <div>
              <h2 className="point-title">Увидите риски</h2>
              <p>Сложность реализации и место, где нужен контроль человека.</p>
            </div>
          </li>
        </ul>
      </main>

      <footer className="hero-footer">
        <p>
          ИИ — не самоцель. Мы рекомендуем самое простое и экономически оправданное решение
          бизнес-задачи.
        </p>
      </footer>
    </section>
  );
}
