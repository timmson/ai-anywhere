import { useCallback, useState } from 'react';
import Hero from './components/Hero';
import Quiz from './components/Quiz';
import Results from './components/Results';
import { diagnose } from './diagnosis/scoring';
import type { Answers, DiagnosisResult } from './diagnosis/types';

type Screen = 'hero' | 'quiz' | 'results';

export default function App() {
  const [screen, setScreen] = useState<Screen>('hero');
  const [result, setResult] = useState<DiagnosisResult | null>(null);

  const start = useCallback(() => {
    setResult(null);
    setScreen('quiz');
  }, []);

  const submit = useCallback((final: Answers) => {
    // Все вычисления — на клиенте, ответы никуда не отправляются.
    setResult(diagnose(final));
    setScreen('results');
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <div className="app">
      {screen === 'hero' && <Hero onStart={start} />}
      {screen === 'quiz' && <Quiz onSubmit={submit} onExit={() => setScreen('hero')} />}
      {screen === 'results' && result && <Results result={result} onRestart={start} />}
    </div>
  );
}
