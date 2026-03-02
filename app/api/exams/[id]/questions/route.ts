import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id: examId } = await params;

  const exam = await prisma.exam.findFirst({ where: { id: examId, teacherId: session.user.id } });
  if (!exam) return NextResponse.json({ error: "Prova não encontrada" }, { status: 404 });

  const { content, points, options } = await req.json();
  if (!content || !options || options.length < 2) {
    return NextResponse.json({ error: "Conteúdo e pelo menos 2 opções são obrigatórios" }, { status: 400 });
  }

  const hasCorrect = options.some((o: { isCorrect: boolean }) => o.isCorrect);
  if (!hasCorrect) {
    return NextResponse.json({ error: "Marque pelo menos uma opção correta" }, { status: 400 });
  }

  const count = await prisma.question.count({ where: { examId } });

  const question = await prisma.question.create({
    data: {
      examId,
      content,
      points: points ?? 1,
      order: count + 1,
      options: {
        create: options.map((o: { content: string; isCorrect: boolean }) => ({
          content: o.content,
          isCorrect: o.isCorrect,
        })),
      },
    },
    include: { options: true },
  });

  return NextResponse.json(question, { status: 201 });
}
