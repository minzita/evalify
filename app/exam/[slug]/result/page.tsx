"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface Result {
  score: number;
  maxScore: number;
  percentage: number;
  feedbackMsg: string;
  aiTheme: Record<string, string | string[]> | null;
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

function ResultContent() {
  const searchParams = useSearchParams();
  const attemptId = searchParams.get("attemptId");
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!attemptId) return;
    const stored = sessionStorage.getItem(`result_${attemptId}`);
    if (stored) setResult(JSON.parse(stored));
  }, [attemptId]);

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Carregando resultado...</p>
      </div>
    );
  }

  const theme = result.aiTheme;
  const { color, headerBg, pageStyle } = getThemeStyles(theme);
  const emoji = (theme?.emoji as string) ?? "🎉";
  const icons = (theme?.icons as string[]) ?? [];
  const isGoodScore = result.percentage >= 60;

  function getScoreEmoji(pct: number) {
    if (pct === 100) return "🏆";
    if (pct >= 80) return "⭐";
    if (pct >= 60) return "👍";
    if (pct >= 40) return "📚";
    return "💪";
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={pageStyle}>
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header com gradiente */}
        <div className="px-8 py-10 text-white text-center relative overflow-hidden" style={{ background: headerBg }}>
          {/* Ícones decorativos de fundo */}
          {icons.length > 0 && (
            <div className="absolute inset-0 flex items-center justify-around opacity-10 text-5xl pointer-events-none select-none">
              {icons.map((icon, i) => <span key={i}>{icon}</span>)}
            </div>
          )}
          <div className="relative z-10">
            <div className="text-6xl mb-3">{isGoodScore ? emoji : "📚"}</div>
            <h1 className="text-2xl font-bold">
              {isGoodScore ? "Parabéns!" : "Não desista!"}
            </h1>
            <p className="text-sm opacity-90 mt-2">{result.feedbackMsg}</p>
          </div>
        </div>

        {/* Score */}
        <div className="px-8 py-8 text-center">
          <div
            className="inline-flex items-center justify-center w-32 h-32 rounded-full text-white mb-4"
            style={{ background: headerBg }}
          >
            <div>
              <div className="text-3xl font-bold">{result.percentage.toFixed(1)}%</div>
              <div className="text-xs opacity-80">pontuação</div>
            </div>
          </div>

          <div className="flex justify-center gap-8 text-center mt-2">
            <div>
              <div className="text-2xl font-bold text-gray-900">{result.score}</div>
              <div className="text-xs text-gray-500">pontos obtidos</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-400">{result.maxScore}</div>
              <div className="text-xs text-gray-500">total possível</div>
            </div>
          </div>

          <div className="mt-6 text-3xl">{getScoreEmoji(result.percentage)}</div>

          <p className="text-sm text-gray-500 mt-6">
            Sua prova foi enviada com sucesso. O professor poderá visualizar seu resultado.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p>Carregando...</p></div>}>
      <ResultContent />
    </Suspense>
  );
}
