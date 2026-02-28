"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import PaymentDetailModal from "@/components/PaymentDetailModal";
import RequestUpdateModal from "@/components/RequestUpdateModal";
import RecordPaymentForm from "@/components/flat-payment/RecordPaymentForm";
import PaymentHistoryList from "@/components/flat-payment/PaymentHistoryList";
import type { Role } from "@/lib/constants";
import type { PaymentData, ReminderData, MonthData, FlatStatus, FlatData } from "@/lib/types";

interface FlatPaymentModalProps {
  flat: FlatStatus | null;
  flatDetails?: FlatData | null;
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
  onPaymentUpdate?: () => void;
}

export default function FlatPaymentModal({
  flat,
  flatDetails,
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
  const [showRequestModal, setShowRequestModal] = useState(false);

  if (!flat) return null;

  const flatReminders = reminders.filter((r) => r.flatId === flat.flatId);
  const isDefaulter = flat.status === "not_paid" || flat.status === "overdue";
  const isOpenMonth = selectedMonth?.status === "open";
  const isAdmin = role === "admin";

  const hasCurrentMonthPayment = selectedMonth
    ? payments.some((p) => p.monthId === selectedMonth.id)
    : true;

  // Remind cooldown logic
  const lastReminder = reminders.find((r) => r.flatId === flat.flatId);
  const cooldownMs = 2 * 24 * 60 * 60 * 1000;
  const canRemind = !lastReminder || (Date.now() - new Date(lastReminder.sentAt).getTime() > cooldownMs);

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
        <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Flat {flat.flatNumber}</h3>
              {(flatDetails?.ownerName || flatDetails?.tenantName) && (
                <div className="text-xs text-slate-400">
                  {flatDetails.ownerName}{flatDetails.isRented && flatDetails.tenantName ? ` · Tenant: ${flatDetails.tenantName}` : ""}
                </div>
              )}
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="p-4 overflow-y-auto max-h-[65vh]">
            {/* Admin: Record payment for current month if missing */}
            {isAdmin && isOpenMonth && !hasCurrentMonthPayment && !loadingHistory && selectedMonth && (
              <RecordPaymentForm
                flat={flat}
                flatDetails={flatDetails}
                selectedMonth={selectedMonth}
                onSuccess={() => onPaymentUpdate?.()}
              />
            )}

            {loadingHistory ? (
              <div className="flex justify-center py-8"><LoadingSpinner size="sm" /></div>
            ) : (
              <PaymentHistoryList
                payments={payments}
                selectedMonth={selectedMonth}
                reminders={flatReminders}
                securityName={securityName}
                adminName={adminName}
                role={role}
                onPaymentSelect={setSelectedPayment}
              />
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

            {/* Security: Request Update */}
            {role === "security" && isOpenMonth && (
              <div className="mt-2">
                <button
                  onClick={() => setShowRequestModal(true)}
                  className="w-full px-3 py-2 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                >
                  Request Update (Tenant / Amount)
                </button>
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
        ownerName={flatDetails?.ownerName}
        tenantName={flatDetails?.isRented ? flatDetails?.tenantName : undefined}
        onUpdate={() => { setSelectedPayment(null); onPaymentUpdate?.(); }}
      />

      {/* Request Update Modal — for security */}
      {showRequestModal && (
        <RequestUpdateModal
          flatId={flat.flatId}
          flatNumber={flat.flatNumber}
          currentOwnerName={flatDetails?.ownerName}
          currentIsRented={flatDetails?.isRented}
          currentTenantName={flatDetails?.tenantName}
          onClose={() => setShowRequestModal(false)}
          onSuccess={() => setShowRequestModal(false)}
        />
      )}
    </>
  );
}
