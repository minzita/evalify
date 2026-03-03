import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ExamEntrance } from "@/components/ExamEntrance";

export default async function ExamLandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const exam = await prisma.exam.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: { _count: { select: { questions: true } } },
  });

  if (!exam) notFound();

  const theme = exam.aiTheme as Record<string, string | string[]> | null;

  return (
    <ExamEntrance
      examId={exam.id}
      slug={slug}
      title={exam.title}
      description={exam.description}
      timeLimitMin={exam.timeLimitMin}
      questionCount={exam._count.questions}
      theme={theme}
    />
  );
}
