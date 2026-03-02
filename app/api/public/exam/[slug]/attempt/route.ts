import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const exam = await prisma.exam.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: { _count: { select: { questions: true } }, questions: { select: { points: true } } },
  });

  if (!exam) {
    return NextResponse.json({ error: "Prova não encontrada ou encerrada" }, { status: 404 });
  }

  const { studentName, studentRef } = await req.json();
  if (!studentName?.trim()) {
    return NextResponse.json({ error: "Nome do aluno obrigatório" }, { status: 400 });
  }

  const maxScore = exam.questions.reduce((sum: number, q: { points: number }) => sum + q.points, 0);

  const attempt = await prisma.attempt.create({
    data: {
      examId: exam.id,
      studentName: studentName.trim(),
      studentRef: studentRef?.trim() || null,
      maxScore,
    },
  });

  return NextResponse.json({ attemptId: attempt.id }, { status: 201 });
}
