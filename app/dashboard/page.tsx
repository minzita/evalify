import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { DashboardExamList } from "@/components/DashboardExamList";

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

      <DashboardExamList initialExams={JSON.parse(JSON.stringify(exams))} />
    </div>
  );
}
