"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Option {
  id: string;
  content: string;
}

interface Question {
  id: string;
  content: string;
  points: number;
  options: Option[];
}

interface Props {
  slug: string;
  attemptId: string;
  timeLimitMin: number | null;
  theme: Record<string, string | string[]> | null;
  questions: Question[];
}

function getThemeStyles(theme: Record<string, string | string[]> | null) {
  const color = (theme?.color as string) ?? "#6366f1";
  const colorSecondary = (theme?.colorSecondary as string) ?? color;
  const bgPattern = (theme?.bgPattern as string) ?? "solido";

  const headerBg =
    colorSecondary !== color
      ? `linear-gradient(135deg, ${color}, ${colorSecondary})`
      : color;

  let pageStyle: React.CSSProperties = {};
  switch (bgPattern) {
    case "pontos":
      pageStyle = {
        backgroundColor: color + "0d",
        backgroundImage: `radial-gradient(circle, ${color}30 1px, transparent 1px)`,
        backgroundSize: "24px 24px",
      };
      break;
    case "ondas":
      pageStyle = {
        backgroundColor: color + "0d",
        backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 12px, ${color}18 12px, ${color}18 13px)`,
      };
      break;
    case "geometrico":
      pageStyle = {
        backgroundColor: color + "0d",
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 39px, ${color}18 39px, ${color}18 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, ${color}18 39px, ${color}18 40px)`,
      };
      break;
    default:
      pageStyle = { backgroundColor: "#f9fafb" };
  }

  return { color, headerBg, pageStyle };
}

export function ExamTaker({ slug, attemptId, timeLimitMin, theme, questions }: Props) {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [secondsLeft, setSecondsLeft] = useState(timeLimitMin ? timeLimitMin * 60 : null);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { color, headerBg, pageStyle } = getThemeStyles(theme);
  const emoji = (theme?.emoji as string) ?? "📝";
  const icons = (theme?.icons as string[]) ?? [];
  const question = questions[current];
  const progress = ((current + 1) / questions.length) * 100;
  const answeredCount = Object.keys(answers).length;

  const submitExam = useCallback(async () => {
    setSubmitting(true);
    const answersArray = questions.map((q) => ({
      questionId: q.id,
      selectedOptionId: answers[q.id] ?? null,
    }));

    const res = await fetch(`/api/public/attempt/${attemptId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: answersArray }),
    });

    if (res.ok) {
      const result = await res.json();
      sessionStorage.setItem(`result_${attemptId}`, JSON.stringify(result));
      router.push(`/exam/${slug}/result?attemptId=${attemptId}`);
    }
  }, [answers, attemptId, questions, router, slug]);

  // Timer
  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) { submitExam(); return; }
    const timer = setTimeout(() => setSecondsLeft((s) => (s ?? 1) - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, submitExam]);

  function selectAnswer(optionId: string) {
    setAnswers((prev) => ({ ...prev, [question.id]: optionId }));
  }

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  const isLastQuestion = current === questions.length - 1;
  const isTimeCritical = secondsLeft !== null && secondsLeft < 60;

  return (
    <div className="min-h-screen" style={pageStyle}>
      {/* Barra superior com gradiente */}
      <div className="sticky top-0 z-10 text-white px-4 py-3 relative overflow-hidden" style={{ background: headerBg }}>
        {/* Ícones decorativos */}
        {icons.length > 0 && (
          <div className="absolute inset-0 flex items-center justify-around opacity-10 text-3xl pointer-events-none select-none">
            {icons.map((icon, i) => <span key={i}>{icon}</span>)}
          </div>
        )}
        <div className="max-w-2xl mx-auto relative z-10">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs opacity-80 mb-1">
                <span>{emoji} {current + 1} de {questions.length}</span>
                <span>{answeredCount} respondida(s)</span>
              </div>
              <div className="w-full bg-white/30 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-300 bg-white"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {secondsLeft !== null && (
              <div className={`font-mono font-bold text-sm px-3 py-1.5 rounded-lg ${isTimeCritical ? "bg-red-500 animate-pulse" : "bg-white/20"}`}>
                ⏱ {formatTime(secondsLeft)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Questão */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {!showConfirm ? (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <p className="text-xs text-gray-400 mb-2">Questão {current + 1} • {question.points} ponto(s)</p>
              <p className="text-gray-900 font-medium text-base leading-relaxed">{question.content}</p>
            </div>

            <div className="space-y-3">
              {question.options.map((option, i) => {
                const selected = answers[question.id] === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => selectAnswer(option.id)}
                    className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all text-sm font-medium shadow-sm ${
                      selected
                        ? "border-transparent text-white"
                        : "border-gray-200 bg-white hover:border-gray-300 text-gray-700"
                    }`}
                    style={selected ? { background: headerBg, borderColor: "transparent" } : {}}
                  >
                    <span className="font-bold mr-3">{String.fromCharCode(65 + i)})</span>
                    {option.content}
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between gap-3">
              <button
                onClick={() => setCurrent((c) => c - 1)}
                disabled={current === 0}
                className="px-4 py-2.5 text-sm border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-colors bg-white"
              >
                ← Anterior
              </button>

              {isLastQuestion ? (
                <button
                  onClick={() => setShowConfirm(true)}
                  className="px-6 py-2.5 text-sm font-bold text-white rounded-xl transition-opacity hover:opacity-90"
                  style={{ background: headerBg }}
                >
                  Finalizar prova ✓
                </button>
              ) : (
                <button
                  onClick={() => setCurrent((c) => c + 1)}
                  className="px-6 py-2.5 text-sm font-medium text-white rounded-xl transition-opacity hover:opacity-90"
                  style={{ background: headerBg }}
                >
                  Próxima →
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Tela de confirmação */
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center max-w-sm mx-auto shadow-sm">
            <div className="text-5xl mb-4">📋</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Pronto para enviar?</h2>
            <p className="text-gray-600 text-sm mb-2">
              Você respondeu <strong>{answeredCount}</strong> de <strong>{questions.length}</strong> questões.
            </p>
            {answeredCount < questions.length && (
              <p className="text-amber-600 text-sm bg-amber-50 px-3 py-2 rounded-lg mb-4">
                ⚠️ {questions.length - answeredCount} questão(ões) sem resposta
              </p>
            )}
            <div className="flex flex-col gap-3 mt-6">
              <button
                onClick={submitExam}
                disabled={submitting}
                className="w-full text-white font-bold py-3 rounded-xl disabled:opacity-50 transition-opacity hover:opacity-90"
                style={{ background: headerBg }}
              >
                {submitting ? "Enviando..." : "Enviar prova 🚀"}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="w-full py-3 rounded-xl border border-gray-300 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
              >
                Revisar respostas
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
