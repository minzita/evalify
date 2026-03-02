import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";

export default async function PrintResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { id } = await params;
  const exam = await prisma.exam.findFirst({
    where: { id, teacherId: session.user.id },
  });

  if (!exam) notFound();

  const attempts = await prisma.attempt.findMany({
    where: { examId: id, status: "COMPLETED" },
    orderBy: [{ percentage: "desc" }, { studentName: "asc" }],
  });

  const avgPct = attempts.length
    ? attempts.reduce((sum, a) => sum + a.percentage, 0) / attempts.length
    : 0;

  return (
    <div className="p-8 max-w-4xl mx-auto font-sans text-sm">
      <style>{`@media print { .no-print { display: none !important; } }`}</style>

      <button
        onClick={() => window.print()}
        className="no-print mb-6 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-700"
      >
        🖨️ Imprimir / Salvar PDF
      </button>

      <div className="border-b-2 border-gray-900 pb-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{exam.title}</h1>
        {exam.description && <p className="text-gray-600 mt-1">{exam.description}</p>}
        <div className="flex gap-6 mt-2 text-gray-500 text-xs">
          <span>Professor: {session.user.name}</span>
          <span>Total de alunos: {attempts.length}</span>
          <span>Média da turma: {avgPct.toFixed(1)}%</span>
          <span>Gerado em: {new Date().toLocaleDateString("pt-BR")}</span>
        </div>
      </div>

      {attempts.length === 0 ? (
        <p className="text-gray-500">Nenhuma resposta registrada.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="text-left p-2 border border-gray-300 font-semibold">#</th>
              <th className="text-left p-2 border border-gray-300 font-semibold">Aluno</th>
              <th className="text-left p-2 border border-gray-300 font-semibold">Ref.</th>
              <th className="text-center p-2 border border-gray-300 font-semibold">Pontos</th>
              <th className="text-center p-2 border border-gray-300 font-semibold">Nota (%)</th>
              <th className="text-center p-2 border border-gray-300 font-semibold">Resultado</th>
              <th className="text-right p-2 border border-gray-300 font-semibold">Horário</th>
            </tr>
          </thead>
          <tbody>
            {attempts.map((attempt, i) => (
              <tr key={attempt.id} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                <td className="p-2 border border-gray-200 text-gray-500">{i + 1}</td>
                <td className="p-2 border border-gray-200 font-medium">{attempt.studentName}</td>
                <td className="p-2 border border-gray-200 text-gray-500">{attempt.studentRef ?? "—"}</td>
                <td className="p-2 border border-gray-200 text-center">{attempt.score}/{attempt.maxScore}</td>
                <td className="p-2 border border-gray-200 text-center font-bold">
                  {attempt.percentage.toFixed(1)}%
                </td>
                <td className="p-2 border border-gray-200 text-center">
                  {attempt.percentage >= 60 ? "✅ Aprovado" : "❌ Reprovado"}
                </td>
                <td className="p-2 border border-gray-200 text-right text-xs text-gray-500">
                  {attempt.completedAt
                    ? new Date(attempt.completedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-semibold">
              <td colSpan={4} className="p-2 border border-gray-300">Média da turma</td>
              <td className="p-2 border border-gray-300 text-center">{avgPct.toFixed(1)}%</td>
              <td colSpan={2} className="p-2 border border-gray-300 text-center text-xs text-gray-500">
                {attempts.filter((a) => a.percentage >= 60).length} aprovados de {attempts.length}
              </td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
}
