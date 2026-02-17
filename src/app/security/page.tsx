"use client";

import { useEffect, useState, useCallback } from "react";
import NavBar from "@/components/NavBar";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import FlatGrid from "@/components/FlatGrid";
import type { FlatStatus } from "@/components/FlatGrid";
import Toast from "@/components/ui/Toast";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import MonthSelector from "@/components/MonthSelector";
import FlatPaymentModal from "@/components/FlatPaymentModal";
import { useAppConfig } from "@/hooks/useAppConfig";
import { PAYMENT_MODE_LABELS } from "@/lib/constants";
import { findCurrentMonth } from "@/lib/types";
import type { MonthData, PaymentData, FlatData, ReminderData, ToastState } from "@/lib/types";
import {
  type PaymentStatus,
  type PaymentMode,
} from "@/lib/constants";

export default function SecurityDashboard() {
  const [allFlats, setAllFlats] = useState<FlatData[]>([]);
  const [allMonths, setAllMonths] = useState<MonthData[]>([]);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<MonthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  // Reminders
  const [reminders, setReminders] = useState<ReminderData[]>([]);
  const [remindingFlatId, setRemindingFlatId] = useState<number | null>(null);
  const { securityName, adminName } = useAppConfig();

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
        setSelectedMonth(findCurrentMonth(monthsData));
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
    return <LoadingSpinner fullPage />;
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
        <MonthSelector
          months={allMonths}
          selectedMonth={selectedMonth}
          onSelectMonth={setSelectedMonth}
        />

        {selectedMonth ? (
          <>
            {/* Closed Month Banner */}
            {isMonthClosed && (
              <div className="bg-slate-100 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-600 text-center">
                This month is closed. Viewing in read-only mode.
              </div>
            )}

            {/* Compact Stats Row */}
            <div className="flex gap-2 text-center">
              <div className="flex-1 bg-emerald-50 rounded-xl py-2 px-1">
                <div className="text-lg font-bold text-emerald-700">{paidCount}/{allFlats.length}</div>
                <div className="text-[10px] text-emerald-600">Submitted</div>
              </div>
              {pendingSecurityPayments.length > 0 && (
                <div className="flex-1 bg-amber-50 rounded-xl py-2 px-1">
                  <div className="text-lg font-bold text-amber-700">{pendingSecurityPayments.length}</div>
                  <div className="text-[10px] text-amber-600">To Confirm</div>
                </div>
              )}
            </div>

            {/* Flat Grid */}
            <FlatGrid flats={gridData} onFlatClick={handleFlatClick} securityName={securityName} adminName={adminName} role="security" />

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
      <FlatPaymentModal
        flat={modalFlat}
        onClose={closeModal}
        payments={flatPayments}
        loadingHistory={loadingFlatHistory}
        reminders={reminders}
        securityName={securityName}
        adminName={adminName}
        selectedMonth={selectedMonth}
        onRemind={handleRemind}
        remindingFlatId={remindingFlatId}
        role="security"
      />
    </div>
  );
}
