import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface AnswerInput {
  questionId: string;
  selectedOptionId: string | null;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: attemptId } = await params;

  const attempt = await prisma.attempt.findUnique({
    where: { id: attemptId },
    include: {
      exam: {
        include: {
          questions: { include: { options: true } },
        },
      },
    },
  });

  if (!attempt) return NextResponse.json({ error: "Tentativa não encontrada" }, { status: 404 });
  if (attempt.status === "COMPLETED") {
    return NextResponse.json({ error: "Esta tentativa já foi finalizada" }, { status: 400 });
  }

  const { answers }: { answers: AnswerInput[] } = await req.json();
  if (!answers || !Array.isArray(answers)) {
    return NextResponse.json({ error: "Respostas inválidas" }, { status: 400 });
  }

  // Mapa questionId -> opção correta
  const correctMap = new Map<string, string>();
  for (const q of attempt.exam.questions) {
    const correct = q.options.find((o: { isCorrect: boolean; id: string }) => o.isCorrect);
    if (correct) correctMap.set(q.id, correct.id);
  }

  let totalScore = 0;
  const answerRecords = answers.map((a) => {
    const correctId = correctMap.get(a.questionId);
    const isCorrect = !!correctId && a.selectedOptionId === correctId;
    const question = attempt.exam.questions.find((q: { id: string; points: number }) => q.id === a.questionId);
    const pointsEarned = isCorrect ? (question?.points ?? 1) : 0;
    totalScore += pointsEarned;

    return {
      attemptId,
      questionId: a.questionId,
      selectedOptionId: a.selectedOptionId || null,
      isCorrect,
      pointsEarned,
    };
  });

  const percentage = attempt.maxScore > 0
    ? Math.round((totalScore / attempt.maxScore) * 1000) / 10
    : 0;

  await prisma.answer.createMany({ data: answerRecords });
  await prisma.attempt.update({
    where: { id: attemptId },
    data: {
      score: totalScore,
      percentage,
      completedAt: new Date(),
      status: "COMPLETED",
    },
  });

  const aiTheme = attempt.exam.aiTheme as Record<string, string> | null;
  const feedbackMsg = percentage >= 60
    ? aiTheme?.congratsMsg ?? "Parabéns! Boa prova!"
    : aiTheme?.encourageMsg ?? "Continue estudando, você vai melhorar!";

  return NextResponse.json({
    score: totalScore,
    maxScore: attempt.maxScore,
    percentage,
    feedbackMsg,
    aiTheme,
  });
}
