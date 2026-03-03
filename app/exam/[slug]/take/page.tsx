import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ExamTaker } from "@/components/ExamTaker";

export default async function ExamTakePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ attemptId?: string }>;
}) {
  const { slug } = await params;
  const { attemptId } = await searchParams;

  if (!attemptId) notFound();

  const exam = await prisma.exam.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: {
          options: { select: { id: true, content: true } },
        },
      },
    },
  });

  if (!exam) notFound();

  const attempt = await prisma.attempt.findFirst({
    where: { id: attemptId, examId: exam.id, status: "IN_PROGRESS" },
  });

  if (!attempt) notFound();

  const theme = exam.aiTheme as Record<string, string | string[]> | null;

  return (
    <ExamTaker
      slug={slug}
      attemptId={attemptId}
      timeLimitMin={exam.timeLimitMin}
      theme={theme}
      questions={exam.questions.map((q) => ({
        id: q.id,
        content: q.content,
        points: q.points,
        options: q.options,
      }))}
    />
  );
}
