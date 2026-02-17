"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import NavBar from "@/components/NavBar";
import FlatGrid from "@/components/FlatGrid";
import type { FlatStatus } from "@/components/FlatGrid";
import Toast from "@/components/ui/Toast";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import MonthSelector from "@/components/MonthSelector";
import FlatPaymentModal from "@/components/FlatPaymentModal";
import { useAppConfig } from "@/hooks/useAppConfig";
import { findCurrentMonth } from "@/lib/types";
import type { MonthData, PaymentData, FlatData, ReminderData, ToastState } from "@/lib/types";
import type { PaymentStatus } from "@/lib/constants";

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <AdminDashboard />
    </Suspense>
  );
}

function AdminDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlMonthId = searchParams.get("monthId");

  const [allFlats, setAllFlats] = useState<FlatData[]>([]);
  const [allMonths, setAllMonths] = useState<MonthData[]>([]);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<MonthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);

  // Flat history modal
  const [modalFlat, setModalFlat] = useState<FlatStatus | null>(null);
  const [flatPayments, setFlatPayments] = useState<PaymentData[]>([]);
  const [loadingFlatHistory, setLoadingFlatHistory] = useState(false);

  // Reminders
  const [reminders, setReminders] = useState<ReminderData[]>([]);
  const [remindingFlatId, setRemindingFlatId] = useState<number | null>(null);
  const { securityName, adminName } = useAppConfig();

  const loadData = useCallback(async () => {
    try {
      const [flatsRes, monthsRes, paymentsRes] = await Promise.all([
        fetch("/api/flats"),
        fetch("/api/months"),
        fetch("/api/payments"),
      ]);
      setAllFlats(await flatsRes.json());
      const monthsData = await monthsRes.json();
      setAllMonths(monthsData);
      setPayments(await paymentsRes.json());

      if (!selectedMonth && monthsData.length > 0) {
        // If URL has monthId, use that; otherwise default to current calendar month
        if (urlMonthId) {
          const urlMonth = monthsData.find((m: MonthData) => m.id === parseInt(urlMonthId));
          if (urlMonth) {
            setSelectedMonth(urlMonth);
            return;
          }
        }
        setSelectedMonth(findCurrentMonth(monthsData));
      }
    } catch {
      setToast({ message: "Failed to load data", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, urlMonthId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadReminders = useCallback(async () => {
    if (!selectedMonth) return;
    try {
      const res = await fetch(`/api/reminders?monthId=${selectedMonth.id}`);
      if (res.ok) setReminders(await res.json());
    } catch { /* silently fail */ }
  }, [selectedMonth]);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  const handleFlatClick = async (flat: FlatStatus) => {
    setModalFlat(flat);
    setLoadingFlatHistory(true);
    setFlatPayments([]);
    try {
      const res = await fetch("/api/payments");
      if (res.ok) {
        const allPayments: PaymentData[] = await res.json();
        setFlatPayments(allPayments.filter((p) => p.flatId === flat.flatId));
      }
    } catch {
      setToast({ message: "Failed to load payment history", type: "error" });
    } finally {
      setLoadingFlatHistory(false);
    }
  };

  const closeModal = () => {
    setModalFlat(null);
    setFlatPayments([]);
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
      }
    } catch {
      setToast({ message: "Failed to record reminder", type: "error" });
    } finally {
      setRemindingFlatId(null);
    }
  };

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  const monthPayments = payments.filter(
    (p) => selectedMonth && p.monthId === selectedMonth.id
  );

  const gridData: FlatStatus[] = allFlats.map((flat) => {
    const payment = monthPayments.find((p) => p.flatId === flat.id);
    const isOverdue = selectedMonth
      ? selectedMonth.status === "open" && new Date().getDate() > selectedMonth.dueDateDay
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

  const paidCount = monthPayments.filter((p) => p.status === "paid").length;
  const pendingVerify = monthPayments.filter((p) => p.status === "pending_verification").length;
  const pendingCollect = monthPayments.filter((p) => p.status === "pending_collection").length;
  const totalCollected = monthPayments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);
  const cashToCollect = monthPayments
    .filter((p) => p.status === "pending_collection")
    .reduce((sum, p) => sum + p.amount, 0);
  const totalExpected = allFlats.reduce((sum, f) => sum + f.maintenanceAmount, 0);
  const defaulterCount = allFlats.length - monthPayments.filter((p) => p.status !== "rejected").length;
  const defaulterAmount = allFlats
    .filter((flat) => !monthPayments.find((p) => p.flatId === flat.id && p.status !== "rejected"))
    .reduce((sum, f) => sum + f.maintenanceAmount, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      <NavBar
        title="Laurel Residency"
        subtitle="Admin"
        actions={
          <>
            <button
              onClick={() => router.push("/admin/months")}
              className="p-2 hover:bg-indigo-800 rounded-lg transition-colors"
              title="Months"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              onClick={() => router.push("/admin/settings")}
              className="p-2 hover:bg-indigo-800 rounded-lg transition-colors"
              title="Settings"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </>
        }
      />

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {/* Month Selector with Year Grouping */}
        <MonthSelector
          months={allMonths}
          selectedMonth={selectedMonth}
          onSelectMonth={setSelectedMonth}
        />

        {selectedMonth && (
          <>
            {/* Compact Summary Row */}
            <div className="flex flex-wrap gap-2 text-center">
              <div className="flex-1 min-w-[30%] bg-emerald-50 rounded-xl py-2 px-1">
                <div className="text-lg font-bold text-emerald-700">{paidCount}/{allFlats.length}</div>
                <div className="text-[10px] text-emerald-600">Paid</div>
              </div>
              <div className="flex-1 min-w-[30%] bg-indigo-50 rounded-xl py-2 px-1">
                <div className="text-lg font-bold text-indigo-700">₹{totalCollected.toLocaleString("en-IN")}</div>
                <div className="text-[10px] text-indigo-600">Collected</div>
              </div>
              {selectedMonth.status === "open" && (
                <div className="flex-1 min-w-[30%] bg-slate-50 border border-slate-200 rounded-xl py-2 px-1">
                  <div className="text-lg font-bold text-slate-700">₹{totalExpected.toLocaleString("en-IN")}</div>
                  <div className="text-[10px] text-slate-500">Expected</div>
                </div>
              )}
              {pendingVerify > 0 && (
                <button
                  onClick={() => router.push("/admin/payments")}
                  className="flex-1 min-w-[30%] bg-amber-50 rounded-xl py-2 px-1 hover:bg-amber-100 transition-colors text-center"
                >
                  <div className="text-lg font-bold text-amber-700">{pendingVerify}</div>
                  <div className="text-[10px] text-amber-600">To Verify →</div>
                </button>
              )}
              {pendingCollect > 0 && (
                <button
                  onClick={() => router.push("/admin/reconcile")}
                  className="flex-1 min-w-[30%] bg-orange-50 rounded-xl py-2 px-1 hover:bg-orange-100 transition-colors text-center"
                >
                  <div className="text-lg font-bold text-orange-700">₹{cashToCollect.toLocaleString("en-IN")}</div>
                  <div className="text-[10px] text-orange-600">From Security →</div>
                </button>
              )}
              {selectedMonth.status === "open" && defaulterCount > 0 && (
                <button
                  onClick={() => router.push("/admin/remind")}
                  className="flex-1 min-w-[30%] bg-rose-50 rounded-xl py-2 px-1 hover:bg-rose-100 transition-colors text-center"
                >
                  <div className="text-lg font-bold text-rose-700">{defaulterCount}</div>
                  <div className="text-[10px] text-rose-600">Defaulters (₹{defaulterAmount.toLocaleString("en-IN")}) →</div>
                </button>
              )}
            </div>

            {/* Flat Grid */}
            <FlatGrid flats={gridData} onFlatClick={handleFlatClick} securityName={securityName} adminName={adminName} role="admin" />

          </>
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
        role="admin"
        onPaymentUpdate={() => { closeModal(); loadData(); }}
      />
    </div>
  );
}
