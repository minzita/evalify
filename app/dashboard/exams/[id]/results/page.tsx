import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ExamStatusBadge } from "@/components/ExamStatusBadge";

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { id } = await params;
  const exam = await prisma.exam.findFirst({
    where: { id, teacherId: session.user.id },
  });

  if (!exam) notFound();

  const attempts = await prisma.attempt.findMany({
    where: { examId: id, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
  });

  const avgPct = attempts.length
    ? attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length
    : 0;
  const topScore = attempts.length ? Math.max(...attempts.map((a) => a.percentage)) : 0;
  const passing = attempts.filter((a) => a.percentage >= 60).length;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">← Painel</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900 flex-1 truncate">{exam.title}</h1>
        <ExamStatusBadge status={exam.status} />
        <Link
          href={`/dashboard/exams/${id}/results/print`}
          target="_blank"
          className="text-sm border border-gray-300 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg transition-colors"
        >
          🖨️ Imprimir
        </Link>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Respostas", value: attempts.length },
          { label: "Média", value: `${avgPct.toFixed(1)}%` },
          { label: "Maior nota", value: `${topScore.toFixed(1)}%` },
          { label: "Aprovados (≥60%)", value: passing },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-indigo-600">{stat.value}</div>
            <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tabela */}
      {attempts.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center">
          <p className="text-gray-500">Nenhum aluno respondeu ainda.</p>
          {exam.slug && (
            <p className="text-sm text-gray-400 mt-2">
              Link da prova: <span className="font-mono text-indigo-600">/exam/{exam.slug}</span>
            </p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Aluno</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Ref.</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Pontos</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">%</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Resultado</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Horário</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {attempts.map((attempt) => (
                <tr key={attempt.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{attempt.studentName}</td>
                  <td className="px-4 py-3 text-gray-500">{attempt.studentRef ?? "—"}</td>
                  <td className="px-4 py-3 text-center text-gray-700">{attempt.score}/{attempt.maxScore}</td>
                  <td className="px-4 py-3 text-center font-bold" style={{ color: attempt.percentage >= 60 ? "#16a34a" : "#dc2626" }}>
                    {attempt.percentage.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${attempt.percentage >= 60 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                      {attempt.percentage >= 60 ? "Aprovado" : "Reprovado"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 text-xs">
                    {attempt.completedAt
                      ? new Date(attempt.completedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
