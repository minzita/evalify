import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const question = await prisma.question.findUnique({
    where: { id },
    include: { exam: true },
  });

  if (!question || question.exam.teacherId !== session.user.id) {
    return NextResponse.json({ error: "Questão não encontrada" }, { status: 404 });
  }

  const { content, points, options } = await req.json();

  await prisma.option.deleteMany({ where: { questionId: id } });

  const updated = await prisma.question.update({
    where: { id },
    data: {
      content: content ?? question.content,
      points: points ?? question.points,
      options: options
        ? {
            create: options.map((o: { content: string; isCorrect: boolean }) => ({
              content: o.content,
              isCorrect: o.isCorrect,
            })),
          }
        : undefined,
    },
    include: { options: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const question = await prisma.question.findUnique({
    where: { id },
    include: { exam: true },
  });

  if (!question || question.exam.teacherId !== session.user.id) {
    return NextResponse.json({ error: "Questão não encontrada" }, { status: 404 });
  }

  await prisma.question.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
