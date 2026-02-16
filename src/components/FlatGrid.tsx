"use client";

import { FLAT_GRID_COLORS, STATUS_LABELS, type PaymentStatus } from "@/lib/constants";

export interface FlatStatus {
  flatNumber: string;
  flatId: number;
  amount: number;
  status: PaymentStatus | "not_paid" | "overdue";
  paymentId?: number;
  lastRemindedAt?: string | null;
}

interface FlatGridProps {
  flats: FlatStatus[];
  onFlatClick?: (flat: FlatStatus) => void;
}

function formatRemindedAgo(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffHours < 1) return "Reminded now";
  if (diffHours < 24) return `Reminded ${diffHours}h ago`;
  return `Reminded ${diffDays}d ago`;
}

export default function FlatGrid({ flats, onFlatClick }: FlatGridProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {flats.map((flat) => {
        const colorClass =
          FLAT_GRID_COLORS[flat.status] || FLAT_GRID_COLORS.not_paid;
        const label =
          flat.status === "not_paid"
            ? "Not Paid"
            : flat.status === "overdue"
              ? "Overdue"
              : STATUS_LABELS[flat.status as PaymentStatus];

        const isDefaulter = flat.status === "not_paid" || flat.status === "overdue";

        return (
          <button
            key={flat.flatId}
            onClick={() => onFlatClick?.(flat)}
            className={`${colorClass} rounded-xl p-3 text-center transition-all hover:opacity-90 active:scale-95`}
          >
            <div className="font-bold text-lg">{flat.flatNumber}</div>
            <div className="text-xs opacity-90">₹{flat.amount.toLocaleString("en-IN")}</div>
            <div className="text-xs mt-1 font-medium opacity-80">{label}</div>
            {isDefaulter && flat.lastRemindedAt && (
              <div className="text-[10px] mt-0.5 opacity-70">
                {formatRemindedAgo(flat.lastRemindedAt)}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
