import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const exam = await prisma.exam.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: {
          options: {
            select: { id: true, content: true }, // sem isCorrect
          },
        },
      },
    },
  });

  if (!exam) {
    return NextResponse.json({ error: "Prova não encontrada ou encerrada" }, { status: 404 });
  }

  return NextResponse.json({
    id: exam.id,
    title: exam.title,
    description: exam.description,
    timeLimitMin: exam.timeLimitMin,
    aiTheme: exam.aiTheme,
    questions: exam.questions.map((q: { id: string; content: string; points: number; order: number; options: { id: string; content: string }[] }) => ({
      id: q.id,
      content: q.content,
      points: q.points,
      order: q.order,
      options: q.options,
    })),
  });
}
