import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const exam = await prisma.exam.findFirst({
    where: { id, teacherId: session.user.id },
  });

  if (!exam) return NextResponse.json({ error: "Prova não encontrada" }, { status: 404 });

  const attempts = await prisma.attempt.findMany({
    where: { examId: id, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
    select: {
      id: true,
      studentName: true,
      studentRef: true,
      score: true,
      maxScore: true,
      percentage: true,
      startedAt: true,
      completedAt: true,
    },
  });

  return NextResponse.json({ exam: { title: exam.title, slug: exam.slug }, attempts });
}
