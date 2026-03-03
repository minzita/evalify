"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ExamStatusBadge } from "./ExamStatusBadge";

interface Option {
  id?: string;
  content: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  content: string;
  points: number;
  order: number;
  options: Option[];
}

interface Exam {
  id: string;
  title: string;
  description: string | null;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
  timeLimitMin: number | null;
  aiTheme: Record<string, string> | null;
  slug: string | null;
  questions: Question[];
}

export function ExamEditor({ exam: initialExam }: { exam: Exam }) {
  const router = useRouter();
  const [exam, setExam] = useState(initialExam);
  const [showForm, setShowForm] = useState(false);
  const [generatingTheme, setGeneratingTheme] = useState(false);
  const [themeError, setThemeError] = useState("");
  const [themeSuccess, setThemeSuccess] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<{ url: string; slug: string } | null>(
    exam.status === "PUBLISHED" && exam.slug
      ? { url: `/exam/${exam.slug}`, slug: exam.slug }
      : null
  );
  const [copied, setCopied] = useState(false);

  // Resolve full URL after hydration (window not available during SSR)
  useEffect(() => {
    if (exam.status === "PUBLISHED" && exam.slug && !publishResult?.url.startsWith("http")) {
      setPublishResult({ url: `${window.location.origin}/exam/${exam.slug}`, slug: exam.slug });
    }
  }, []);

  // Form state for new question
  const [qContent, setQContent] = useState("");
  const [qPoints, setQPoints] = useState(1);
  const [qOptions, setQOptions] = useState<Option[]>([
    { content: "", isCorrect: false },
    { content: "", isCorrect: false },
    { content: "", isCorrect: false },
    { content: "", isCorrect: false },
  ]);
  const [savingQ, setSavingQ] = useState(false);
  const [qError, setQError] = useState("");

  // Edit question state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editPoints, setEditPoints] = useState(1);
  const [editOptions, setEditOptions] = useState<Option[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  function updateOption(index: number, field: keyof Option, value: string | boolean) {
    setQOptions((prev) =>
      prev.map((o, i) => {
        if (field === "isCorrect") return { ...o, isCorrect: i === index };
        return i === index ? { ...o, [field]: value } : o;
      })
    );
  }

  async function saveQuestion() {
    setQError("");
    if (!qContent.trim()) { setQError("Escreva o enunciado da questão"); return; }
    const filledOptions = qOptions.filter((o) => o.content.trim());
    if (filledOptions.length < 2) { setQError("Preencha pelo menos 2 alternativas"); return; }
    if (!qOptions.some((o) => o.isCorrect)) { setQError("Marque a alternativa correta"); return; }

    setSavingQ(true);
    const res = await fetch(`/api/exams/${exam.id}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: qContent.trim(), points: qPoints, options: filledOptions }),
    });
    setSavingQ(false);

    if (!res.ok) { setQError("Erro ao salvar questão"); return; }
    const newQ = await res.json();
    setExam((prev) => ({ ...prev, questions: [...prev.questions, newQ] }));
    setQContent("");
    setQPoints(1);
    setQOptions([
      { content: "", isCorrect: false }, { content: "", isCorrect: false },
      { content: "", isCorrect: false }, { content: "", isCorrect: false },
    ]);
    setShowForm(false);
  }

  async function deleteQuestion(questionId: string) {
    if (!confirm("Excluir esta questão?")) return;
    await fetch(`/api/questions/${questionId}`, { method: "DELETE" });
    setExam((prev) => ({ ...prev, questions: prev.questions.filter((q) => q.id !== questionId) }));
  }

  function startEdit(q: Question) {
    setEditingId(q.id);
    setEditContent(q.content);
    setEditPoints(q.points);
    setEditOptions(q.options.map((o) => ({ id: o.id, content: o.content, isCorrect: o.isCorrect })));
    setEditError("");
  }

  function updateEditOption(index: number, field: keyof Option, value: string | boolean) {
    setEditOptions((prev) =>
      prev.map((o, i) => {
        if (field === "isCorrect") return { ...o, isCorrect: i === index };
        return i === index ? { ...o, [field]: value } : o;
      })
    );
  }

  async function saveEditQuestion() {
    setEditError("");
    if (!editContent.trim()) { setEditError("Escreva o enunciado"); return; }
    const filled = editOptions.filter((o) => o.content.trim());
    if (filled.length < 2) { setEditError("Preencha pelo menos 2 alternativas"); return; }
    if (!editOptions.some((o) => o.isCorrect)) { setEditError("Marque a alternativa correta"); return; }

    setSavingEdit(true);
    const res = await fetch(`/api/questions/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editContent.trim(), points: editPoints, options: filled }),
    });
    setSavingEdit(false);

    if (!res.ok) { setEditError("Erro ao salvar"); return; }
    const updated = await res.json();
    setExam((prev) => ({ ...prev, questions: prev.questions.map((q) => q.id === editingId ? updated : q) }));
    setEditingId(null);
  }

  async function generateTheme() {
    setThemeError("");
    setThemeSuccess(false);
    setGeneratingTheme(true);
    try {
      const res = await fetch(`/api/exams/${exam.id}/generate-theme`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setThemeError(data.error ?? "Erro ao gerar tema. Tente novamente.");
      } else {
        setExam((prev) => ({ ...prev, aiTheme: data.aiTheme }));
        setThemeSuccess(true);
        setTimeout(() => setThemeSuccess(false), 3000);
      }
    } catch {
      setThemeError("Erro de conexão ao gerar tema.");
    } finally {
      setGeneratingTheme(false);
    }
  }

  async function publishExam() {
    setPublishing(true);
    const res = await fetch(`/api/exams/${exam.id}/publish`, { method: "POST" });
    setPublishing(false);
    if (res.ok) {
      const data = await res.json();
      setPublishResult(data);
      setExam((prev) => ({ ...prev, status: "PUBLISHED", slug: data.slug }));
    }
  }

  function copyLink() {
    if (publishResult) {
      navigator.clipboard.writeText(publishResult.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const theme = exam.aiTheme as Record<string, string | string[]> | null;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">← Voltar</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900 flex-1 truncate">{exam.title}</h1>
        <ExamStatusBadge status={exam.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna principal: questões */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-700">
              Questões ({exam.questions.length})
            </h2>
            {exam.status === "DRAFT" && (
              <button
                onClick={() => setShowForm(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
              >
                + Adicionar questão
              </button>
            )}
          </div>

          {exam.questions.length === 0 && !showForm && (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
              <p className="text-gray-500 text-sm">Nenhuma questão ainda. Adicione a primeira!</p>
            </div>
          )}

          {exam.questions.map((q, idx) => (
            <div key={q.id} className="bg-white rounded-xl border border-gray-200 p-4">
              {editingId === q.id ? (
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-800">Editar questão {idx + 1}</h3>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Enunciado</label>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={2}
                      className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Alternativas (marque a correta)</label>
                    <div className="space-y-2">
                      {editOptions.map((o, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="edit-correct"
                            checked={o.isCorrect}
                            onChange={() => updateEditOption(i, "isCorrect", true)}
                            className="accent-green-600"
                          />
                          <input
                            type="text"
                            value={o.content}
                            onChange={(e) => updateEditOption(i, "content", e.target.value)}
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder={`Alternativa ${String.fromCharCode(65 + i)}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-700">Pontos:</label>
                    <input
                      type="number"
                      value={editPoints}
                      onChange={(e) => setEditPoints(Number(e.target.value))}
                      min={1}
                      max={10}
                      className="w-16 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  {editError && <p className="text-red-600 text-sm">{editError}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={saveEditQuestion}
                      disabled={savingEdit}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                    >
                      {savingEdit ? "Salvando..." : "Salvar alterações"}
                    </button>
                    <button
                      onClick={() => { setEditingId(null); setEditError(""); }}
                      className="border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm px-4 py-2 rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800 mb-2">
                      <span className="text-gray-400 mr-2">{idx + 1}.</span>
                      {q.content}
                    </p>
                    <div className="space-y-1">
                      {q.options.map((o) => (
                        <div key={o.id} className={`flex items-center gap-2 text-sm px-2 py-1 rounded ${o.isCorrect ? "bg-green-50 text-green-700 font-medium" : "text-gray-600"}`}>
                          <span>{o.isCorrect ? "✓" : "○"}</span>
                          <span>{o.content}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-400">{q.points} pt</span>
                    {exam.status === "DRAFT" && (
                      <>
                        <button onClick={() => startEdit(q)} className="text-indigo-500 hover:text-indigo-700 text-xs">
                          Editar
                        </button>
                        <button onClick={() => deleteQuestion(q.id)} className="text-red-400 hover:text-red-600 text-xs">
                          Excluir
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {showForm && (
            <div className="bg-white rounded-xl border-2 border-indigo-200 p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Nova questão</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Enunciado</label>
                  <textarea
                    value={qContent}
                    onChange={(e) => setQContent(e.target.value)}
                    rows={2}
                    className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    placeholder="Digite a pergunta..."
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Alternativas (marque a correta)</label>
                  <div className="space-y-2">
                    {qOptions.map((o, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="correct"
                          checked={o.isCorrect}
                          onChange={() => updateOption(i, "isCorrect", true)}
                          className="accent-green-600"
                        />
                        <input
                          type="text"
                          value={o.content}
                          onChange={(e) => updateOption(i, "content", e.target.value)}
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder={`Alternativa ${String.fromCharCode(65 + i)}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700">Pontos:</label>
                  <input
                    type="number"
                    value={qPoints}
                    onChange={(e) => setQPoints(Number(e.target.value))}
                    min={1}
                    max={10}
                    className="w-16 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {qError && <p className="text-red-600 text-sm">{qError}</p>}

                <div className="flex gap-2">
                  <button
                    onClick={saveQuestion}
                    disabled={savingQ}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                  >
                    {savingQ ? "Salvando..." : "Salvar questão"}
                  </button>
                  <button
                    onClick={() => { setShowForm(false); setQError(""); }}
                    className="border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm px-4 py-2 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Coluna lateral: IA + publicação */}
        <div className="space-y-4">
          {/* Tema da IA */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-700 mb-3">🤖 Tema com IA</h3>
            {theme ? (
              <div className="space-y-2 mb-3">
                <div
                  className="rounded-lg p-3 text-white text-center text-sm relative overflow-hidden"
                  style={{
                    background: theme.colorSecondary
                      ? `linear-gradient(135deg, ${theme.color}, ${theme.colorSecondary})`
                      : (theme.color as string) ?? "#6366f1",
                  }}
                >
                  <div className="text-2xl mb-1">{theme.emoji as string}</div>
                  <div className="font-bold">{theme.themeName as string}</div>
                  <div className="text-xs opacity-90 mt-1">{theme.welcomeMsg as string}</div>
                </div>
                <div className="flex gap-2 text-xs text-gray-500 justify-center flex-wrap pt-1">
                  {theme.style && <span className="bg-gray-100 px-2 py-0.5 rounded-full">✨ {theme.style as string}</span>}
                  {theme.bgPattern && <span className="bg-gray-100 px-2 py-0.5 rounded-full">🎨 {theme.bgPattern as string}</span>}
                  {(theme.icons as string[] | undefined)?.length ? (
                    <span className="bg-gray-100 px-2 py-0.5 rounded-full">{(theme.icons as string[]).join(" ")}</span>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-3">
                Gere um tema gamificado automático para a prova.
              </p>
            )}
            {themeError && (
              <p className="text-red-600 text-xs mb-2 bg-red-50 px-2 py-1 rounded">{themeError}</p>
            )}
            {themeSuccess && (
              <p className="text-green-600 text-xs mb-2 bg-green-50 px-2 py-1 rounded">✅ Tema gerado com sucesso!</p>
            )}
            <button
              onClick={generateTheme}
              disabled={generatingTheme || exam.questions.length === 0}
              className="w-full border border-indigo-300 hover:bg-indigo-50 disabled:opacity-50 text-indigo-600 text-sm px-3 py-2 rounded-lg transition-colors"
            >
              {generatingTheme ? "⏳ Gerando tema..." : theme ? "Regenerar tema" : "Gerar tema"}
            </button>
            {exam.questions.length === 0 && (
              <p className="text-xs text-gray-400 mt-1 text-center">Adicione questões primeiro</p>
            )}
          </div>

          {/* Publicação */}
          {exam.status === "DRAFT" && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-700 mb-3">🚀 Publicar prova</h3>
              <p className="text-sm text-gray-500 mb-3">
                Gera link único e QR code para os alunos acessarem.
              </p>
              <button
                onClick={publishExam}
                disabled={publishing || exam.questions.length === 0}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm px-3 py-2 rounded-lg transition-colors"
              >
                {publishing ? "Publicando..." : "Publicar prova"}
              </button>
            </div>
          )}

          {publishResult && (
            <div className="bg-green-50 rounded-xl border border-green-200 p-4">
              <h3 className="font-semibold text-green-800 mb-2">✅ Prova publicada!</h3>
              <p className="text-xs text-green-700 font-mono break-all mb-3">{publishResult.url}</p>
              <div className="flex gap-2">
                <button
                  onClick={copyLink}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-2 rounded-lg transition-colors"
                >
                  {copied ? "Copiado!" : "Copiar link"}
                </button>
                <Link
                  href={`/dashboard/exams/${exam.id}/results`}
                  className="flex-1 text-center border border-green-600 text-green-700 hover:bg-green-50 text-xs px-3 py-2 rounded-lg transition-colors"
                >
                  Ver resultados
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
