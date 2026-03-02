import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import Anthropic from "@anthropic-ai/sdk";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;
  const exam = await prisma.exam.findFirst({
    where: { id, teacherId: session.user.id },
    include: { questions: { select: { content: true }, take: 5 } },
  });

  if (!exam) return NextResponse.json({ error: "Prova não encontrada" }, { status: 404 });

  if (!anthropic) {
    const fallback = {
      themeName: exam.title,
      color: "#6366f1",
      emoji: "📝",
      welcomeMsg: `Bem-vindo à prova: ${exam.title}`,
      congratsMsg: "Parabéns! Você completou a prova!",
      encourageMsg: "Continue estudando, você vai melhorar!",
    };
    await prisma.exam.update({ where: { id }, data: { aiTheme: fallback } });
    return NextResponse.json({ aiTheme: fallback });
  }

  const questionsPreview = exam.questions.map((q: { content: string }, i: number) => `${i + 1}. ${q.content}`).join("\n");

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `Você é um designer de experiências educacionais gamificadas. Com base no título e questões da prova abaixo, crie um tema visual divertido e motivador para o mini-site da prova.

Título da prova: "${exam.title}"
${exam.description ? `Descrição: "${exam.description}"` : ""}
${questionsPreview ? `Primeiras questões:\n${questionsPreview}` : ""}

Responda SOMENTE com JSON válido (sem markdown, sem explicações), seguindo exatamente este formato:
{
  "themeName": "nome criativo do tema",
  "color": "#hexcolor",
  "emoji": "um emoji representativo",
  "welcomeMsg": "mensagem de boas-vindas animada (máx 80 chars)",
  "congratsMsg": "mensagem de parabéns ao final (máx 80 chars)",
  "encourageMsg": "mensagem de encorajamento para notas baixas (máx 80 chars)"
}`,
      },
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";

  let theme;
  try {
    theme = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Erro ao processar resposta da IA. Tente novamente." }, { status: 500 });
  }

  const updated = await prisma.exam.update({
    where: { id },
    data: { aiTheme: theme },
  });

  return NextResponse.json({ aiTheme: updated.aiTheme });
}
