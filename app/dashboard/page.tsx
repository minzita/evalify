import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ExamStatusBadge } from "@/components/ExamStatusBadge";
import { DeleteExamButton } from "@/components/DeleteExamButton";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const exams = await prisma.exam.findMany({
    where: { teacherId: session!.user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { questions: true, attempts: true } } },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Minhas Provas</h1>
          <p className="text-gray-500 text-sm mt-1">{exams.length} prova(s) criada(s)</p>
        </div>
        <Link
          href="/dashboard/exams/new"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Nova Prova
        </Link>
      </div>

      {exams.length === 0 ? (
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
      ) : (
        <div className="space-y-3">
          {exams.map((exam) => (
            <div key={exam.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between hover:shadow-sm transition-shadow">
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
                {exam.status === "DRAFT" && (
                  <DeleteExamButton examId={exam.id} examTitle={exam.title} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
