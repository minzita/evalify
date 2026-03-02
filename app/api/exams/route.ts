import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const exams = await prisma.exam.findMany({
    where: { teacherId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { questions: true, attempts: true } } },
  });

  return NextResponse.json(exams);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { title, description, timeLimitMin } = await req.json();
  if (!title) return NextResponse.json({ error: "Título obrigatório" }, { status: 400 });

  const exam = await prisma.exam.create({
    data: {
      title,
      description: description || null,
      timeLimitMin: timeLimitMin ? Number(timeLimitMin) : null,
      teacherId: session.user.id,
    },
  });

  return NextResponse.json(exam, { status: 201 });
}
