"use client";

import { useEffect, useState, useCallback } from "react";
import NavBar from "@/components/NavBar";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import FlatGrid from "@/components/FlatGrid";
import type { FlatStatus } from "@/components/FlatGrid";
import Toast from "@/components/ui/Toast";
import {
  type PaymentStatus,
  type PaymentMode,
  PAYMENT_MODE_LABELS,
  STATUS_LABELS_LONG,
} from "@/lib/constants";

interface FlatData {
  id: number;
  flatNumber: string;
  maintenanceAmount: number;
}

interface MonthData {
  id: number;
  month: number;
  year: number;
  status: string;
  dueDateDay: number;
}

interface PaymentData {
  id: number;
  flatId: number;
  flatNumber: string;
  monthId: number;
  amount: number;
  paymentMode: PaymentMode;
  status: PaymentStatus;
  submittedAt: string;
  month?: number;
  year?: number;
  paymentDate?: string;
  securityConfirmedAt?: string;
  verifiedAt?: string;
  collectedAt?: string;
  adminNote?: string;
}

interface ReminderData {
  id: number;
  flatId: number;
  flatNumber: string;
  monthId: number;
  sentBy: string;
  sentAt: string;
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export default function SecurityDashboard() {
  const [allFlats, setAllFlats] = useState<FlatData[]>([]);
  const [allMonths, setAllMonths] = useState<MonthData[]>([]);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<MonthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Reminders
  const [reminders, setReminders] = useState<ReminderData[]>([]);
  const [remindingFlatId, setRemindingFlatId] = useState<number | null>(null);

  // Flat history modal
  const [modalFlat, setModalFlat] = useState<FlatStatus | null>(null);
  const [flatPayments, setFlatPayments] = useState<PaymentData[]>([]);
  const [loadingFlatHistory, setLoadingFlatHistory] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [flatsRes, monthsRes, paymentsRes] = await Promise.all([
        fetch("/api/flats"),
        fetch("/api/months"),
        fetch("/api/payments"),
      ]);
      const flatsData = await flatsRes.json();
      const monthsData = await monthsRes.json();
      const paymentsData = await paymentsRes.json();

      setAllFlats(flatsData);
      setAllMonths(monthsData);
      setPayments(paymentsData);

      if (!selectedMonth && monthsData.length > 0) {
        // Default to the first open month, otherwise the most recent
        const openMonth = monthsData.find(
          (m: MonthData) => m.status === "open"
        );
        setSelectedMonth(openMonth || monthsData[0]);
      }
    } catch {
      setToast({ message: "Failed to load data", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load reminders when selectedMonth changes
  const loadReminders = useCallback(async () => {
    if (!selectedMonth) return;
    try {
      const res = await fetch(`/api/reminders?monthId=${selectedMonth.id}`);
      if (res.ok) {
        setReminders(await res.json());
      }
    } catch {
      // Silently fail for reminders
    }
  }, [selectedMonth]);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  const handleConfirmCash = async (paymentId: number) => {
    setConfirmingId(paymentId);
    try {
      const res = await fetch("/api/payments/security-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId }),
      });
      if (res.ok) {
        setToast({ message: "Cash receipt confirmed!", type: "success" });
        loadData();
      } else {
        const data = await res.json();
        setToast({
          message: data.error || "Failed to confirm",
          type: "error",
        });
      }
    } catch {
      setToast({ message: "Network error", type: "error" });
    } finally {
      setConfirmingId(null);
    }
  };

  const handleRemind = async (flatId: number) => {
    if (!selectedMonth) return;
    setRemindingFlatId(flatId);
    try {
      const res = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flatId, monthId: selectedMonth.id }),
      });
      if (res.ok) {
        setToast({ message: "Reminder recorded!", type: "success" });
        loadReminders();
      } else {
        const data = await res.json();
        setToast({
          message: data.error || "Failed to record reminder",
          type: "error",
        });
      }
    } catch {
      setToast({ message: "Network error", type: "error" });
    } finally {
      setRemindingFlatId(null);
    }
  };

  const handleFlatClick = async (flat: FlatStatus) => {
    setModalFlat(flat);
    setLoadingFlatHistory(true);
    setFlatPayments([]);

    try {
      // Fetch all payments (not filtered by month) and filter client-side by flatId
      const res = await fetch("/api/payments");
      if (res.ok) {
        const allPayments: PaymentData[] = await res.json();
        const filtered = allPayments.filter((p) => p.flatId === flat.flatId);
        setFlatPayments(filtered);
      }
    } catch {
      setToast({
        message: "Failed to load payment history",
        type: "error",
      });
    } finally {
      setLoadingFlatHistory(false);
    }
  };

  const closeModal = () => {
    setModalFlat(null);
    setFlatPayments([]);
  };

  const isMonthClosed = selectedMonth?.status === "closed";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Build flat grid data for selected month
  const monthPayments = payments.filter(
    (p) => selectedMonth && p.monthId === selectedMonth.id
  );

  const gridData: FlatStatus[] = allFlats.map((flat) => {
    const payment = monthPayments.find((p) => p.flatId === flat.id);
    const isOverdue = selectedMonth
      ? selectedMonth.status === "open" &&
        new Date().getDate() > selectedMonth.dueDateDay
      : false;
    const lastReminder = reminders.find((r) => r.flatId === flat.id);

    return {
      flatNumber: flat.flatNumber,
      flatId: flat.id,
      amount: flat.maintenanceAmount,
      status: payment
        ? (payment.status as PaymentStatus)
        : isOverdue
          ? ("overdue" as const)
          : ("not_paid" as const),
      paymentId: payment?.id,
      lastRemindedAt: lastReminder?.sentAt || null,
    };
  });

  const pendingSecurityPayments = monthPayments.filter(
    (p) => p.status === "pending_security"
  );

  const paidCount = gridData.filter(
    (f) =>
      f.status === "paid" ||
      f.status === "pending_collection" ||
      f.status === "pending_verification"
  ).length;

  const formatPaymentDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <NavBar title="Laurel Residency" subtitle="Security" />

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {/* Month Selector - always visible, shows all months */}
        {allMonths.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {allMonths.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMonth(m)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all
                  ${
                    selectedMonth?.id === m.id
                      ? "bg-blue-600 text-white"
                      : m.status === "closed"
                        ? "bg-slate-200 text-slate-500"
                        : "bg-white text-slate-600 border border-slate-200"
                  }`}
              >
                {MONTH_NAMES[m.month - 1]} {m.year}
                {m.status === "closed" && " \u2713"}
              </button>
            ))}
          </div>
        )}

        {selectedMonth ? (
          <>
            {/* Closed Month Banner */}
            {isMonthClosed && (
              <div className="bg-slate-100 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-600 text-center">
                This month is closed. Viewing in read-only mode.
              </div>
            )}

            {/* Summary */}
            <Card>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-bold text-slate-800">
                  {MONTH_NAMES[selectedMonth.month - 1]} {selectedMonth.year}
                  {isMonthClosed && (
                    <span className="ml-2 text-sm text-green-600 font-normal">
                      (Closed)
                    </span>
                  )}
                </h2>
                <span className="text-sm text-slate-500">
                  {paidCount}/{allFlats.length} paid
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3 mb-1">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all"
                  style={{
                    width: `${allFlats.length > 0 ? (paidCount / allFlats.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </Card>

            {/* Flat Grid */}
            <FlatGrid flats={gridData} onFlatClick={handleFlatClick} />

            {/* Pending Security Confirmations - only for open months */}
            {!isMonthClosed && pendingSecurityPayments.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
                  Confirm Cash Receipts
                </h3>
                <div className="space-y-2">
                  {pendingSecurityPayments.map((p) => (
                    <Card key={p.id}>
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-bold text-slate-800">
                            Flat {p.flatNumber}
                          </div>
                          <div className="text-sm text-slate-500">
                            ₹{p.amount.toLocaleString("en-IN")} —{" "}
                            {PAYMENT_MODE_LABELS[p.paymentMode]}
                          </div>
                        </div>
                        <Button
                          variant="success"
                          size="sm"
                          loading={confirmingId === p.id}
                          onClick={() => handleConfirmCash(p.id)}
                          className="!w-auto"
                        >
                          Confirm
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

          </>
        ) : (
          <Card>
            <p className="text-slate-500 text-center py-4">
              No months to display.
            </p>
          </Card>
        )}
      </main>

      {/* Flat Payment History Modal */}
      {modalFlat && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800">
                Flat {modalFlat.flatNumber}
              </h3>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg
                  className="w-5 h-5 text-slate-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto max-h-[65vh]">
              {loadingFlatHistory ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-6 w-6 border-4 border-blue-600 border-t-transparent rounded-full" />
                </div>
              ) : flatPayments.length === 0 ? (
                <p className="text-slate-500 text-center py-8">
                  No payment history found.
                </p>
              ) : (
                <div className="space-y-3">
                  {flatPayments.map((p) => (
                    <div
                      key={p.id}
                      className="border border-slate-200 rounded-xl p-3"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-slate-800">
                          {p.month && p.year
                            ? `${MONTH_NAMES[p.month - 1]} ${p.year}`
                            : `Month ID: ${p.monthId}`}
                        </span>
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full ${
                            p.status === "paid"
                              ? "bg-green-100 text-green-700"
                              : p.status === "rejected"
                                ? "bg-red-100 text-red-700"
                                : p.status === "pending_collection"
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {STATUS_LABELS_LONG[p.status] || p.status}
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
                    </div>
                  ))}
                </div>
              )}

              {/* Reminder History */}
              {(() => {
                const flatReminders = reminders.filter((r) => r.flatId === modalFlat.flatId);
                if (flatReminders.length === 0) return null;
                return (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-600 mb-2">Reminder History</h4>
                    <div className="space-y-1">
                      {flatReminders.map((r) => (
                        <div key={r.id} className="text-xs text-slate-500 flex justify-between">
                          <span>By {r.sentBy}</span>
                          <span>{new Date(r.sentAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Remind Button */}
              {!isMonthClosed && (modalFlat.status === "not_paid" || modalFlat.status === "overdue") && (() => {
                const lastReminder = reminders.find((r) => r.flatId === modalFlat.flatId);
                const cooldownMs = 2 * 24 * 60 * 60 * 1000; // 2 days
                const canRemind = !lastReminder || (Date.now() - new Date(lastReminder.sentAt).getTime() > cooldownMs);

                return (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <Button
                      variant="outline"
                      size="sm"
                      loading={remindingFlatId === modalFlat.flatId}
                      disabled={!canRemind}
                      onClick={() => handleRemind(modalFlat.flatId)}
                      className="w-full"
                    >
                      {canRemind ? "Mark as Reminded" : "Reminded recently"}
                    </Button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
