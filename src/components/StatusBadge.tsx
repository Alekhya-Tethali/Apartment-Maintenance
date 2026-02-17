import { getStatusLabel, getStatusColor, type PaymentStatus, type Role } from "@/lib/constants";

interface StatusBadgeProps {
  status: PaymentStatus;
  className?: string;
  securityName?: string;
  adminName?: string;
  role?: Role;
}

export default function StatusBadge({ status, className = "", securityName, adminName, role }: StatusBadgeProps) {
  return (
    <span
      className={`
        inline-block px-3 py-1 rounded-full text-sm font-medium border
        ${getStatusColor(status, role)}
        ${className}
      `}
    >
      {getStatusLabel(status, securityName, role, adminName)}
    </span>
  );
}
