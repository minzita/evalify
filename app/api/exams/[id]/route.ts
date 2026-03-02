import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getExamForTeacher(id: string, teacherId: string) {
  return prisma.exam.findFirst({ where: { id, teacherId } });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const exam = await prisma.exam.findFirst({
    where: { id, teacherId: session.user.id },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: { options: true },
      },
    },
  });

  if (!exam) return NextResponse.json({ error: "Prova não encontrada" }, { status: 404 });
  return NextResponse.json(exam);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const exam = await getExamForTeacher(id, session.user.id);
  if (!exam) return NextResponse.json({ error: "Prova não encontrada" }, { status: 404 });

  const { title, description, timeLimitMin } = await req.json();
  const updated = await prisma.exam.update({
    where: { id },
    data: {
      title: title ?? exam.title,
      description: description !== undefined ? description : exam.description,
      timeLimitMin: timeLimitMin !== undefined ? timeLimitMin : exam.timeLimitMin,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const exam = await getExamForTeacher(id, session.user.id);
  if (!exam) return NextResponse.json({ error: "Prova não encontrada" }, { status: 404 });
  if (exam.status !== "DRAFT") {
    return NextResponse.json({ error: "Somente provas em rascunho podem ser excluídas" }, { status: 400 });
  }

  await prisma.exam.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
