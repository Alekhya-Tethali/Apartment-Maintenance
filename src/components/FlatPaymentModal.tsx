"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import PaymentDetailModal from "@/components/PaymentDetailModal";
import { MONTH_NAMES, PAYMENT_MODE_LABELS, getStatusLabelLong, getStatusColor, type Role } from "@/lib/constants";
import { formatPaymentDate } from "@/lib/types";
import type { PaymentData, ReminderData, MonthData, FlatStatus } from "@/lib/types";

interface FlatPaymentModalProps {
  flat: FlatStatus | null;
  onClose: () => void;
  payments: PaymentData[];
  loadingHistory: boolean;
  reminders: ReminderData[];
  securityName?: string;
  adminName?: string;
  selectedMonth?: MonthData | null;
  onRemind?: (flatId: number) => void;
  remindingFlatId?: number | null;
  role?: Role;
  /** Called after admin takes an action on a payment (approve, reject, override) */
  onPaymentUpdate?: () => void;
}

export default function FlatPaymentModal({
  flat,
  onClose,
  payments,
  loadingHistory,
  reminders,
  securityName,
  adminName,
  selectedMonth,
  onRemind,
  remindingFlatId,
  role,
  onPaymentUpdate,
}: FlatPaymentModalProps) {
  const [selectedPayment, setSelectedPayment] = useState<PaymentData | null>(null);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [recordMode, setRecordMode] = useState<string>("cash");
  const [recordError, setRecordError] = useState<string | null>(null);

  if (!flat) return null;

  const flatReminders = reminders.filter((r) => r.flatId === flat.flatId);
  const isDefaulter = flat.status === "not_paid" || flat.status === "overdue";
  const isOpenMonth = selectedMonth?.status === "open";
  const isAdmin = role === "admin";

  // Check if current selected month has a payment for this flat
  const hasCurrentMonthPayment = selectedMonth
    ? payments.some((p) => p.monthId === selectedMonth.id)
    : true;

  const handleRecordPayment = async () => {
    if (!selectedMonth || !flat) return;
    setRecordingPayment(true);
    setRecordError(null);
    try {
      const res = await fetch("/api/payments/admin-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flatId: flat.flatId,
          monthId: selectedMonth.id,
          amount: flat.amount,
          paymentMode: recordMode,
          status: "paid",
          adminNote: "Recorded by admin",
        }),
      });
      if (res.ok) {
        onPaymentUpdate?.();
      } else {
        const data = await res.json();
        setRecordError(data.error || "Failed to record");
      }
    } catch {
      setRecordError("Network error");
    } finally {
      setRecordingPayment(false);
    }
  };

  // Sort payments chronologically descending (newest first)
  const sortedPayments = [...payments].sort(
    (a, b) => b.year - a.year || b.month - a.month
  );

  // Group reminders by monthId for inline display
  const remindersByMonth = new Map<number, ReminderData[]>();
  for (const r of flatReminders) {
    const existing = remindersByMonth.get(r.monthId) || [];
    existing.push(r);
    remindersByMonth.set(r.monthId, existing);
  }

  // Remind cooldown logic
  const lastReminder = reminders.find((r) => r.flatId === flat.flatId);
  const cooldownMs = 2 * 24 * 60 * 60 * 1000;
  const canRemind = !lastReminder || (Date.now() - new Date(lastReminder.sentAt).getTime() > cooldownMs);

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <h3 className="text-lg font-bold text-slate-800">
              Flat {flat.flatNumber}
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="p-4 overflow-y-auto max-h-[65vh]">
            {/* Admin: Record payment for current month if missing */}
            {isAdmin && isOpenMonth && !hasCurrentMonthPayment && !loadingHistory && selectedMonth && (
              <div className="mb-4 border-2 border-dashed border-amber-300 bg-amber-50 rounded-xl p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm font-semibold text-amber-800">
                      No payment for {MONTH_NAMES[selectedMonth.month - 1]} {selectedMonth.year}
                    </div>
                    <div className="text-xs text-amber-600">
                      ₹{flat.amount.toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={recordMode}
                    onChange={(e) => setRecordMode(e.target.value)}
                    className="px-2 py-1.5 border rounded-lg text-xs bg-white flex-shrink-0"
                  >
                    <option value="cash">Cash</option>
                    <option value="gpay">GPay</option>
                    <option value="phonepe">PhonePe</option>
                  </select>
                  <button
                    onClick={handleRecordPayment}
                    disabled={recordingPayment}
                    className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    {recordingPayment ? "Recording..." : "Record as Paid"}
                  </button>
                </div>
                {recordError && (
                  <div className="text-xs text-rose-600">{recordError}</div>
                )}
              </div>
            )}

            {loadingHistory ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="sm" />
              </div>
            ) : payments.length === 0 ? (
              <p className="text-slate-500 text-center py-8">
                No payment history found.
              </p>
            ) : (
              <div className="space-y-3">
                {sortedPayments.map((p) => {
                  const monthReminders = remindersByMonth.get(p.monthId) || [];
                  const isCurrentMonth = selectedMonth ? p.monthId === selectedMonth.id : false;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPayment(p)}
                      className={`w-full text-left rounded-xl p-3 transition-all active:scale-[0.98] ${
                        isCurrentMonth
                          ? "border-2 border-indigo-400 bg-indigo-50/40 shadow-sm"
                          : "border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-slate-800">
                          {p.month && p.year
                            ? `${MONTH_NAMES[p.month - 1]} ${p.year}`
                            : `Month ID: ${p.monthId}`}
                        </span>
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full ${
                            getStatusColor(p.status, role).replace(/border-\S+/, "")
                          }`}
                        >
                          {getStatusLabelLong(p.status, securityName, role, adminName)}
                        </span>
                      </div>
                      <div className="text-sm text-slate-600">
                        ₹{p.amount.toLocaleString("en-IN")} via{" "}
                        {PAYMENT_MODE_LABELS[p.paymentMode]}
                      </div>
                      {p.submittedAt && (
                        <div className="text-xs text-slate-400 mt-1">
                          Submitted: {formatPaymentDate(p.submittedAt)}
                        </div>
                      )}
                      {monthReminders.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-100">
                          <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">Reminders</div>
                          {monthReminders.map((r) => (
                            <div key={r.id} className="text-xs text-slate-500 flex justify-between">
                              <span>By {r.sentBy}</span>
                              <span>
                                {new Date(r.sentAt).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Tap hint */}
                      <div className="text-[10px] text-indigo-400 mt-2 text-right">
                        Tap for details
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Remind Button */}
            {isOpenMonth && isDefaulter && onRemind && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <Button
                  variant="outline"
                  size="sm"
                  loading={remindingFlatId === flat.flatId}
                  disabled={!canRemind}
                  onClick={() => onRemind(flat.flatId)}
                  className="w-full"
                >
                  {canRemind ? "Mark as Reminded" : "Reminded recently"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Detail Modal — stacked on top */}
      <PaymentDetailModal
        payment={selectedPayment}
        onClose={() => setSelectedPayment(null)}
        role={role}
        securityName={securityName}
        adminName={adminName}
        onUpdate={() => {
          setSelectedPayment(null);
          onPaymentUpdate?.();
        }}
      />
    </>
  );
}
