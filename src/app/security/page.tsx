"use client";

import { useEffect, useState, useCallback } from "react";
import NavBar from "@/components/NavBar";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import FlatGrid from "@/components/FlatGrid";
import Toast from "@/components/ui/Toast";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import MonthSelector from "@/components/MonthSelector";
import FlatPaymentModal from "@/components/FlatPaymentModal";
import { useSession } from "@/contexts/SessionContext";
import { useToast } from "@/hooks/useToast";
import { apiGetFlats, apiGetMonths, apiGetPayments, apiGetReminders, apiTrackReminder, apiConfirmCash } from "@/lib/api-client";
import { buildFlatGrid, computeSecurityStats } from "@/lib/dashboard-helpers";
import { findCurrentMonth } from "@/lib/types";
import type { FlatStatus } from "@/lib/types";
import type { MonthData, PaymentData, FlatData, ReminderData } from "@/lib/types";
import { PAYMENT_MODE_LABELS } from "@/lib/constants";

export default function SecurityDashboard() {
  const [allFlats, setAllFlats] = useState<FlatData[]>([]);
  const [allMonths, setAllMonths] = useState<MonthData[]>([]);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<MonthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const { toast, showToast, clearToast } = useToast();

  // Reminders
  const [reminders, setReminders] = useState<ReminderData[]>([]);
  const [remindingFlatId, setRemindingFlatId] = useState<number | null>(null);
  const { config: { securityName, adminName } } = useSession();

  // Flat history modal
  const [modalFlat, setModalFlat] = useState<FlatStatus | null>(null);
  const [modalFlatDetails, setModalFlatDetails] = useState<FlatData | null>(null);
  const [flatPayments, setFlatPayments] = useState<PaymentData[]>([]);
  const [loadingFlatHistory, setLoadingFlatHistory] = useState(false);

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
        setSelectedMonth(findCurrentMonth(monthsData));
      }
    } catch {
      showToast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load reminders when selectedMonth changes
  const loadReminders = useCallback(async () => {
    if (!selectedMonth) return;
    try {
      const data = await apiGetReminders(selectedMonth.id);
      setReminders(data);
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
      await apiConfirmCash(paymentId);
      showToast("Cash receipt confirmed!", "success");
      loadData();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Network error", "error");
    } finally {
      setConfirmingId(null);
    }
  };

  const handleRemind = async (flatId: number) => {
    if (!selectedMonth) return;
    setRemindingFlatId(flatId);
    try {
      await apiTrackReminder(flatId, selectedMonth.id);
      showToast("Reminder recorded!", "success");
      loadReminders();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Network error", "error");
    } finally {
      setRemindingFlatId(null);
    }
  };

  const handleFlatClick = async (flat: FlatStatus) => {
    setModalFlat(flat);
    setModalFlatDetails(allFlats.find((f) => f.id === flat.flatId) || null);
    setLoadingFlatHistory(true);
    setFlatPayments([]);

    try {
      const allPayments = await apiGetPayments();
      const filtered = allPayments.filter((p) => p.flatId === flat.flatId);
      setFlatPayments(filtered);
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

  const isMonthClosed = selectedMonth?.status === "closed";

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  // Build flat grid data for selected month
  const monthPayments = payments.filter(
    (p) => selectedMonth && p.monthId === selectedMonth.id
  );

  const gridData = buildFlatGrid(allFlats, monthPayments, reminders, selectedMonth);

  const { paidCount, pendingSecurityPayments } = computeSecurityStats(gridData, monthPayments);

  return (
    <div className="min-h-screen bg-slate-50">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={clearToast}
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
        role="security"
      />
    </div>
  );
}
