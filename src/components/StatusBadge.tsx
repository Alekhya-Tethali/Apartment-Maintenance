import { STATUS_COLORS, STATUS_LABELS, type PaymentStatus } from "@/lib/constants";

interface StatusBadgeProps {
  status: PaymentStatus;
  className?: string;
}

export default function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  return (
    <span
      className={`
        inline-block px-3 py-1 rounded-full text-sm font-medium border
        ${STATUS_COLORS[status]}
        ${className}
      `}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
