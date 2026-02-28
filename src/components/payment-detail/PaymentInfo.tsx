"use client";

import StatusBadge from "@/components/StatusBadge";
import Button from "@/components/ui/Button";
import { PAYMENT_MODE_LABELS, MONTH_NAMES, type Role } from "@/lib/constants";
import { formatPaymentDate } from "@/lib/types";
import type { PaymentData } from "@/lib/types";

interface PaymentInfoProps {
  payment: PaymentData;
  role?: Role;
  securityName?: string;
  adminName?: string;
  onViewScreenshot?: () => void;
}

export default function PaymentInfo({
  payment,
  role,
  securityName,
  adminName,
  onViewScreenshot,
}: PaymentInfoProps) {
  const isAdmin = role === "admin";
  const monthLabel = payment.month && payment.year
    ? `${MONTH_NAMES[payment.month - 1]} ${payment.year}`
    : `Month #${payment.monthId}`;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-slate-500">Status</span>
        <StatusBadge status={payment.status} securityName={securityName} adminName={adminName} role={role} />
      </div>

      <div className="flex justify-between items-center">
        <span className="text-sm text-slate-500">Amount</span>
        <span className="text-lg font-bold text-slate-800">₹{payment.amount.toLocaleString("en-IN")}</span>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-sm text-slate-500">Payment Mode</span>
        <span className="font-medium text-slate-700">{PAYMENT_MODE_LABELS[payment.paymentMode]}</span>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-sm text-slate-500">Month</span>
        <span className="font-medium text-slate-700">{monthLabel}</span>
      </div>

      {payment.paymentDate && (
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-500">Payment Date</span>
          <span className="text-sm text-slate-700">{formatPaymentDate(payment.paymentDate)}</span>
        </div>
      )}
      {payment.submittedAt && (
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-500">Submitted</span>
          <span className="text-sm text-slate-700">{formatPaymentDate(payment.submittedAt)}</span>
        </div>
      )}
      {payment.paymentMode === "cash" && payment.securityConfirmedAt && (
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-500">Security Confirmed</span>
          <span className="text-sm text-slate-700">{formatPaymentDate(payment.securityConfirmedAt)}</span>
        </div>
      )}
      {payment.verifiedAt && (
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-500">Admin Verified</span>
          <span className="text-sm text-slate-700">{formatPaymentDate(payment.verifiedAt)}</span>
        </div>
      )}
      {payment.paymentMode === "cash" && payment.collectedAt && (
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-500">Cash Collected</span>
          <span className="text-sm text-slate-700">{formatPaymentDate(payment.collectedAt)}</span>
        </div>
      )}

      {payment.adminNote && (
        <div className="bg-rose-50 p-3 rounded-xl text-sm text-rose-700">
          <strong>Admin Note:</strong> {payment.adminNote}
        </div>
      )}

      {isAdmin && payment.hasScreenshot && onViewScreenshot && (
        <div>
          <Button variant="outline" size="sm" onClick={onViewScreenshot}>
            View Screenshot
          </Button>
        </div>
      )}
    </div>
  );
}
