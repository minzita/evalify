"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  examId: string;
  slug: string;
  title: string;
  description: string | null;
  timeLimitMin: number | null;
  questionCount: number;
  theme: Record<string, string | string[]> | null;
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
      pageStyle = { backgroundColor: color + "15" };
  }

  return { color, headerBg, pageStyle };
}

export function ExamEntrance({ examId, slug, title, description, timeLimitMin, questionCount, theme }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [ref, setRef] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { color, headerBg, pageStyle } = getThemeStyles(theme);
  const emoji = (theme?.emoji as string) ?? "📝";
  const icons = (theme?.icons as string[]) ?? [];
  const welcomeMsg = (theme?.welcomeMsg as string) ?? `Bem-vindo à prova: ${title}`;

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Digite seu nome"); return; }
    setError("");
    setLoading(true);

    const res = await fetch(`/api/public/exam/${slug}/attempt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentName: name.trim(), studentRef: ref.trim() }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Erro ao iniciar prova");
      return;
    }

    const { attemptId } = await res.json();
    router.push(`/exam/${slug}/take?attemptId=${attemptId}`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={pageStyle}>
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header gamificado com gradiente */}
        <div className="px-8 py-10 text-white text-center relative overflow-hidden" style={{ background: headerBg }}>
          {/* Ícones decorativos de fundo */}
          {icons.length > 0 && (
            <div className="absolute inset-0 flex items-center justify-around opacity-10 text-5xl pointer-events-none select-none">
              {icons.map((icon, i) => (
                <span key={i}>{icon}</span>
              ))}
            </div>
          )}
          <div className="relative z-10">
            <div className="text-6xl mb-3">{emoji}</div>
            <h1 className="text-2xl font-bold leading-tight">{title}</h1>
            <p className="text-sm opacity-90 mt-2">{welcomeMsg}</p>
          </div>
        </div>

        {/* Info da prova */}
        <div className="px-8 py-4 bg-gray-50 flex justify-center gap-6 text-center text-sm text-gray-600 border-b">
          <div>
            <div className="font-bold text-gray-900 text-lg">{questionCount}</div>
            <div>questões</div>
          </div>
          {timeLimitMin && (
            <div>
              <div className="font-bold text-gray-900 text-lg">{timeLimitMin}</div>
              <div>minutos</div>
            </div>
          )}
        </div>

        {/* Formulário */}
        <div className="px-8 py-6">
          {description && (
            <p className="text-sm text-gray-600 mb-5 bg-gray-50 rounded-lg px-3 py-2">{description}</p>
          )}

          <form onSubmit={handleStart} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Seu nome <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
                style={{ "--tw-ring-color": color } as React.CSSProperties}
                placeholder="Como você se chama?"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número/Turma (opcional)
              </label>
              <input
                type="text"
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
                placeholder="Ex: 15 / Turma A"
              />
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-bold py-3 rounded-xl text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: headerBg }}
            >
              {loading ? "Preparando..." : "Começar prova 🚀"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
