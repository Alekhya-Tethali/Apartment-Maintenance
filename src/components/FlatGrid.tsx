"use client";

import { getStatusLabel, type PaymentStatus, type Role } from "@/lib/constants";
import { FLAT_GRID_TILE_COLORS, getThemeStatusColor } from "@/lib/theme";
import type { FlatStatus } from "@/lib/types";

export type { FlatStatus };

interface FlatGridProps {
  flats: FlatStatus[];
  onFlatClick?: (flat: FlatStatus) => void;
  securityName?: string;
  adminName?: string;
  role?: Role;
}

function formatRemindedAgo(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffHours < 1) return "Reminded now";
  if (diffHours < 24) return `Reminded ${diffHours}h ago`;
  return `Reminded ${diffDays}d ago`;
}

export default function FlatGrid({ flats, onFlatClick, securityName, adminName, role }: FlatGridProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {flats.map((flat) => {
        const colorClass =
          getThemeStatusColor(FLAT_GRID_TILE_COLORS, flat.status, role)
          || getThemeStatusColor(FLAT_GRID_TILE_COLORS, "not_paid");
        const label =
          flat.status === "not_paid"
            ? "Not Paid"
            : flat.status === "overdue"
              ? "Overdue"
              : getStatusLabel(flat.status as PaymentStatus, securityName, role, adminName);

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
