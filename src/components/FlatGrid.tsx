"use client";

import { FLAT_GRID_COLORS, STATUS_LABELS, type PaymentStatus } from "@/lib/constants";

interface FlatStatus {
  flatNumber: string;
  flatId: number;
  amount: number;
  status: PaymentStatus | "not_paid" | "overdue";
  paymentId?: number;
}

interface FlatGridProps {
  flats: FlatStatus[];
  onFlatClick?: (flat: FlatStatus) => void;
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

        return (
          <button
            key={flat.flatId}
            onClick={() => onFlatClick?.(flat)}
            className={`${colorClass} rounded-xl p-3 text-center transition-all hover:opacity-90 active:scale-95`}
          >
            <div className="font-bold text-lg">{flat.flatNumber}</div>
            <div className="text-xs opacity-90">₹{flat.amount.toLocaleString("en-IN")}</div>
            <div className="text-xs mt-1 font-medium opacity-80">{label}</div>
          </button>
        );
      })}
    </div>
  );
}
