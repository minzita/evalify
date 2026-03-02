"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteExamButton({ examId, examTitle }: { examId: string; examTitle: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(`Excluir "${examTitle}"? Esta ação não pode ser desfeita.`)) return;
    setLoading(true);
    await fetch(`/api/exams/${examId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-sm text-red-500 hover:underline disabled:opacity-50"
    >
      Excluir
    </button>
  );
}
