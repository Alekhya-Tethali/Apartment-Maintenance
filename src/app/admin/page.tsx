"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import NavBar from "@/components/NavBar";
import FlatGrid from "@/components/FlatGrid";
import Toast from "@/components/ui/Toast";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import FlatPaymentModal from "@/components/FlatPaymentModal";
import { useSession } from "@/contexts/SessionContext";
import { useToast } from "@/hooks/useToast";
import { apiGetFlats, apiGetMonths, apiGetPayments, apiGetReminders, apiTrackReminder } from "@/lib/api-client";
import { buildFlatGrid, computeMonthStats } from "@/lib/dashboard-helpers";
import { findCurrentMonth } from "@/lib/types";
import type { FlatStatus } from "@/lib/types";
import type { MonthData, PaymentData, FlatData, ReminderData } from "@/lib/types";
import { MONTH_NAMES } from "@/lib/constants";

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

  // No monthId → go to month management as default landing
  useEffect(() => {
    if (!urlMonthId) {
      router.replace("/admin/months");
    }
  }, [urlMonthId, router]);

  const [allFlats, setAllFlats] = useState<FlatData[]>([]);
  const [allMonths, setAllMonths] = useState<MonthData[]>([]);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<MonthData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast, showToast, clearToast } = useToast();

  // Flat history modal
  const [modalFlat, setModalFlat] = useState<FlatStatus | null>(null);
  const [modalFlatDetails, setModalFlatDetails] = useState<FlatData | null>(null);
  const [flatPayments, setFlatPayments] = useState<PaymentData[]>([]);
  const [loadingFlatHistory, setLoadingFlatHistory] = useState(false);

  // Reminders
  const [reminders, setReminders] = useState<ReminderData[]>([]);
  const [remindingFlatId, setRemindingFlatId] = useState<number | null>(null);
  const { config: { securityName, adminName } } = useSession();

  const loadData = useCallback(async () => {
    try {
      const [flatsData, monthsData, paymentsData] = await Promise.all([
        apiGetFlats(),
        apiGetMonths(),
        apiGetPayments(),
      ]);
      setAllFlats(flatsData);
      setAllMonths(monthsData);
      setPayments(paymentsData);

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
      showToast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, urlMonthId, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadReminders = useCallback(async () => {
    if (!selectedMonth) return;
    try {
      const data = await apiGetReminders(selectedMonth.id);
      setReminders(data);
    } catch { /* silently fail */ }
  }, [selectedMonth]);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  const handleFlatClick = async (flat: FlatStatus) => {
    setModalFlat(flat);
    setModalFlatDetails(allFlats.find((f) => f.id === flat.flatId) || null);
    setLoadingFlatHistory(true);
    setFlatPayments([]);
    try {
      const allPayments = await apiGetPayments();
      setFlatPayments(allPayments.filter((p) => p.flatId === flat.flatId));
    } catch {
      showToast("Failed to load payment history", "error");
    } finally {
      setLoadingFlatHistory(false);
    }
  };

  const closeModal = () => {
    setModalFlat(null);
    setModalFlatDetails(null);
    setFlatPayments([]);
  };

  const handleRemind = async (flatId: number) => {
    if (!selectedMonth) return;
    setRemindingFlatId(flatId);
    try {
      await apiTrackReminder(flatId, selectedMonth.id);
      showToast("Reminder recorded!", "success");
      loadReminders();
    } catch {
      showToast("Failed to record reminder", "error");
    } finally {
      setRemindingFlatId(null);
    }
  };

  // Redirecting to months page
  if (!urlMonthId) {
    return <LoadingSpinner fullPage />;
  }

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  const monthPayments = payments.filter(
    (p) => selectedMonth && p.monthId === selectedMonth.id
  );

  const gridData = buildFlatGrid(allFlats, monthPayments, reminders, selectedMonth);

  const {
    paidCount,
    pendingVerify,
    pendingCollect,
    totalCollected,
    cashToCollect,
    totalExpected,
    defaulterCount,
    defaulterAmount,
  } = computeMonthStats(monthPayments, allFlats);

  return (
    <div className="min-h-screen bg-slate-50">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={clearToast} />
      )}
      <NavBar
        title={selectedMonth ? `${selectedMonth.month && MONTH_NAMES[selectedMonth.month - 1]} ${selectedMonth.year}` : "Admin"}
        backHref="/admin/months"
      />

      <main className="max-w-lg mx-auto p-4 space-y-4">

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
                  onClick={() => router.push(`/admin/remind?monthId=${selectedMonth.id}`)}
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
        flatDetails={modalFlatDetails}
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
