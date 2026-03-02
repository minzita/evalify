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
  theme: Record<string, string> | null;
  questions: Question[];
}

export function ExamTaker({ slug, attemptId, timeLimitMin, theme, questions }: Props) {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [secondsLeft, setSecondsLeft] = useState(timeLimitMin ? timeLimitMin * 60 : null);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const bgColor = theme?.color ?? "#6366f1";
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
    <div className="min-h-screen bg-gray-50">
      {/* Barra superior */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>{current + 1} de {questions.length}</span>
              <span>{answeredCount} respondida(s)</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%`, backgroundColor: bgColor }}
              />
            </div>
          </div>

          {secondsLeft !== null && (
            <div className={`font-mono font-bold text-sm px-3 py-1.5 rounded-lg ${isTimeCritical ? "bg-red-100 text-red-600 animate-pulse" : "bg-gray-100 text-gray-700"}`}>
              ⏱ {formatTime(secondsLeft)}
            </div>
          )}
        </div>
      </div>

      {/* Questão */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        {!showConfirm ? (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
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
                    className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all text-sm font-medium ${
                      selected
                        ? "border-current text-white"
                        : "border-gray-200 bg-white hover:border-gray-300 text-gray-700"
                    }`}
                    style={selected ? { backgroundColor: bgColor, borderColor: bgColor } : {}}
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
                className="px-4 py-2.5 text-sm border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-colors"
              >
                ← Anterior
              </button>

              {isLastQuestion ? (
                <button
                  onClick={() => setShowConfirm(true)}
                  className="px-6 py-2.5 text-sm font-bold text-white rounded-xl transition-opacity hover:opacity-90"
                  style={{ backgroundColor: bgColor }}
                >
                  Finalizar prova ✓
                </button>
              ) : (
                <button
                  onClick={() => setCurrent((c) => c + 1)}
                  className="px-6 py-2.5 text-sm font-medium text-white rounded-xl transition-opacity hover:opacity-90"
                  style={{ backgroundColor: bgColor }}
                >
                  Próxima →
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Tela de confirmação */
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center max-w-sm mx-auto">
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
                style={{ backgroundColor: bgColor }}
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
