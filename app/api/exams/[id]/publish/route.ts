import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { nanoid } from "nanoid";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const exam = await prisma.exam.findFirst({
    where: { id, teacherId: session.user.id },
    include: { _count: { select: { questions: true } } },
  });

  if (!exam) return NextResponse.json({ error: "Prova não encontrada" }, { status: 404 });
  if (exam._count.questions === 0) {
    return NextResponse.json({ error: "Adicione pelo menos uma questão antes de publicar" }, { status: 400 });
  }
  if (exam.status === "PUBLISHED") {
    return NextResponse.json({ slug: exam.slug, url: `${process.env.NEXTAUTH_URL}/exam/${exam.slug}` });
  }

  const slug = nanoid(10);
  const updated = await prisma.exam.update({
    where: { id },
    data: { slug, status: "PUBLISHED", publishedAt: new Date() },
  });

  return NextResponse.json({
    slug: updated.slug,
    url: `${process.env.NEXTAUTH_URL}/exam/${updated.slug}`,
  });
}
