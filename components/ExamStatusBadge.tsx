const statusConfig = {
  DRAFT: { label: "Rascunho", className: "bg-gray-100 text-gray-600" },
  PUBLISHED: { label: "Publicada", className: "bg-green-100 text-green-700" },
  CLOSED: { label: "Encerrada", className: "bg-red-100 text-red-600" },
};

export function ExamStatusBadge({ status }: { status: "DRAFT" | "PUBLISHED" | "CLOSED" }) {
  const config = statusConfig[status];
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.className}`}>
      {config.label}
    </span>
  );
}
