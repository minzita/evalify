"use client";

import { useState } from "react";
import Link from "next/link";
import { ExamStatusBadge } from "./ExamStatusBadge";

type ExamStatus = "DRAFT" | "PUBLISHED" | "CLOSED";

interface Exam {
  id: string;
  title: string;
  status: ExamStatus;
  timeLimitMin: number | null;
  _count: { questions: number; attempts: number };
}

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

export function DashboardExamList({ initialExams }: { initialExams: Exam[] }) {
  const [exams, setExams] = useState<Exam[]>(initialExams);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  function addToast(message: string, type: "success" | "error") {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }

  async function finalizeExam(id: string, title: string) {
    if (!confirm(`Tem certeza que deseja finalizar a prova "${title}"?\nOs alunos não poderão mais responder.`)) return;
    setLoadingId(id);
    try {
      const res = await fetch(`/api/exams/${id}`, { method: "PATCH" });
      const data = await res.json();
      if (!res.ok) {
        addToast(data.error ?? "Erro ao finalizar prova", "error");
        return;
      }
      setExams((prev) => prev.map((e) => (e.id === id ? { ...e, status: "CLOSED" } : e)));
      addToast(`Prova "${title}" encerrada com sucesso!`, "success");
    } catch {
      addToast("Erro de conexão ao finalizar prova", "error");
    } finally {
      setLoadingId(null);
    }
  }

  async function deleteExam(id: string, title: string) {
    if (!confirm(`Excluir "${title}"?\n\nEsta ação não pode ser desfeita.`)) return;
    setLoadingId(id);
    try {
      const res = await fetch(`/api/exams/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        addToast(data.error ?? "Erro ao excluir prova", "error");
        return;
      }
      setExams((prev) => prev.filter((e) => e.id !== id));
      addToast(`Prova "${title}" excluída com sucesso!`, "success");
    } catch {
      addToast("Erro de conexão ao excluir prova", "error");
    } finally {
      setLoadingId(null);
    }
  }

  if (exams.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
        <div className="text-5xl mb-4">📝</div>
        <h2 className="text-lg font-semibold text-gray-700">Nenhuma prova criada ainda</h2>
        <p className="text-gray-500 text-sm mt-1">Crie sua primeira prova gamificada com IA</p>
        <Link
          href="/dashboard/exams/new"
          className="inline-block mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Criar primeira prova
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white transition-all ${
              t.type === "success" ? "bg-green-600" : "bg-red-600"
            }`}
          >
            {t.type === "success" ? "✅ " : "❌ "}
            {t.message}
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {exams.map((exam) => {
          const isLoading = loadingId === exam.id;
          return (
            <div
              key={exam.id}
              className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between hover:shadow-sm transition-shadow"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="font-semibold text-gray-900 truncate">{exam.title}</h2>
                  <ExamStatusBadge status={exam.status} />
                </div>
                <p className="text-sm text-gray-500">
                  {exam._count.questions} questão(ões) · {exam._count.attempts} resposta(s)
                  {exam.timeLimitMin ? ` · ${exam.timeLimitMin} min` : ""}
                </p>
              </div>

              <div className="flex items-center gap-2 ml-4 shrink-0">
                <Link
                  href={`/dashboard/exams/${exam.id}/edit`}
                  className="text-sm text-indigo-600 hover:underline"
                >
                  Editar
                </Link>

                {exam.status !== "DRAFT" && (
                  <Link
                    href={`/dashboard/exams/${exam.id}/results`}
                    className="text-sm text-green-600 hover:underline"
                  >
                    Resultados
                  </Link>
                )}

                {exam.status === "PUBLISHED" && (
                  <button
                    onClick={() => finalizeExam(exam.id, exam.title)}
                    disabled={isLoading}
                    className="text-sm bg-amber-100 text-amber-700 hover:bg-amber-200 px-3 py-1 rounded-lg font-medium disabled:opacity-50 transition-colors"
                  >
                    {isLoading ? "..." : "Finalizar"}
                  </button>
                )}

                <button
                  onClick={() => deleteExam(exam.id, exam.title)}
                  disabled={isLoading}
                  className="text-sm bg-red-100 text-red-600 hover:bg-red-200 px-3 py-1 rounded-lg font-medium disabled:opacity-50 transition-colors"
                >
                  {isLoading ? "..." : "Excluir"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
