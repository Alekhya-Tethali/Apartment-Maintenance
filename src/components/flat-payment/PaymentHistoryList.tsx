"use client";

import { MONTH_NAMES, PAYMENT_MODE_LABELS, getStatusLabelLong, getStatusColor, type Role } from "@/lib/constants";
import { formatPaymentDate } from "@/lib/types";
import type { PaymentData, ReminderData, MonthData } from "@/lib/types";

interface PaymentHistoryListProps {
  payments: PaymentData[];
  selectedMonth?: MonthData | null;
  reminders: ReminderData[];
  securityName?: string;
  adminName?: string;
  role?: Role;
  onPaymentSelect: (payment: PaymentData) => void;
}

export default function PaymentHistoryList({
  payments,
  selectedMonth,
  reminders,
  securityName,
  adminName,
  role,
  onPaymentSelect,
}: PaymentHistoryListProps) {
  const sortedPayments = [...payments].sort((a, b) => b.year - a.year || b.month - a.month);

  // Group reminders by monthId for inline display
  const remindersByMonth = new Map<number, ReminderData[]>();
  for (const r of reminders) {
    const existing = remindersByMonth.get(r.monthId) || [];
    existing.push(r);
    remindersByMonth.set(r.monthId, existing);
  }

  if (payments.length === 0) {
    return <p className="text-slate-500 text-center py-8">No payment history found.</p>;
  }

  return (
    <div className="space-y-3">
      {sortedPayments.map((p) => {
        const monthReminders = remindersByMonth.get(p.monthId) || [];
        const isCurrentMonth = selectedMonth ? p.monthId === selectedMonth.id : false;
        return (
          <button
            key={p.id}
            onClick={() => onPaymentSelect(p)}
            className={`w-full text-left rounded-xl p-3 transition-all active:scale-[0.98] ${
              isCurrentMonth
                ? "border-2 border-indigo-400 bg-indigo-50/40 shadow-sm"
                : "border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30"
            }`}
          >
            <div className="flex justify-between items-start mb-1">
              <span className="font-semibold text-slate-800">
                {p.month && p.year ? `${MONTH_NAMES[p.month - 1]} ${p.year}` : `Month ID: ${p.monthId}`}
              </span>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(p.status, role).replace(/border-\S+/, "")}`}>
                {getStatusLabelLong(p.status, securityName, role, adminName)}
              </span>
            </div>
            <div className="text-sm text-slate-600">
              ₹{p.amount.toLocaleString("en-IN")} via {PAYMENT_MODE_LABELS[p.paymentMode]}
            </div>
            {p.submittedAt && (
              <div className="text-xs text-slate-400 mt-1">Submitted: {formatPaymentDate(p.submittedAt)}</div>
            )}
            {monthReminders.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-100">
                <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">Reminders</div>
                {monthReminders.map((r) => (
                  <div key={r.id} className="text-xs text-slate-500 flex justify-between">
                    <span>By {r.sentBy}</span>
                    <span>{new Date(r.sentAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="text-[10px] text-indigo-400 mt-2 text-right">Tap for details</div>
          </button>
        );
      })}
    </div>
  );
}
