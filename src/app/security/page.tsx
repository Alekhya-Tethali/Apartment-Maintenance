"use client";

import { useEffect, useState, useCallback } from "react";
import NavBar from "@/components/NavBar";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import FlatGrid from "@/components/FlatGrid";
import Toast from "@/components/ui/Toast";
import { type PaymentStatus, type PaymentMode, PAYMENT_MODE_LABELS } from "@/lib/constants";

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
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function SecurityDashboard() {
  const [allFlats, setAllFlats] = useState<FlatData[]>([]);
  const [openMonths, setOpenMonths] = useState<MonthData[]>([]);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<MonthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

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
      setOpenMonths(monthsData);
      setPayments(paymentsData);

      if (!selectedMonth && monthsData.length > 0) {
        setSelectedMonth(monthsData[0]);
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
        setToast({ message: data.error || "Failed to confirm", type: "error" });
      }
    } catch {
      setToast({ message: "Network error", type: "error" });
    } finally {
      setConfirmingId(null);
    }
  };

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

  const gridData = allFlats.map((flat) => {
    const payment = monthPayments.find((p) => p.flatId === flat.id);
    const isOverdue = selectedMonth
      ? new Date().getDate() > selectedMonth.dueDateDay
      : false;

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
    };
  });

  const pendingSecurityPayments = monthPayments.filter(
    (p) => p.status === "pending_security"
  );

  const paidCount = gridData.filter(
    (f) => f.status === "paid" || f.status === "pending_collection" || f.status === "pending_verification"
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
      <NavBar title="Security View" />

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {/* Month Selector */}
        {openMonths.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {openMonths.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedMonth(m)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all
                  ${selectedMonth?.id === m.id
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-600 border border-slate-200"}`}
              >
                {MONTH_NAMES[m.month - 1]} {m.year}
              </button>
            ))}
          </div>
        )}

        {selectedMonth ? (
          <>
            {/* Summary */}
            <Card>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-bold text-slate-800">
                  {MONTH_NAMES[selectedMonth.month - 1]} {selectedMonth.year}
                </h2>
                <span className="text-sm text-slate-500">
                  {paidCount}/{allFlats.length} paid
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3 mb-1">
                <div
                  className="bg-green-500 h-3 rounded-full transition-all"
                  style={{ width: `${(paidCount / allFlats.length) * 100}%` }}
                />
              </div>
            </Card>

            {/* Flat Grid */}
            <FlatGrid flats={gridData} />

            {/* Pending Security Confirmations */}
            {pendingSecurityPayments.length > 0 && (
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
                            ₹{p.amount.toLocaleString("en-IN")} — {PAYMENT_MODE_LABELS[p.paymentMode]}
                          </div>
                        </div>
                        <Button
                          variant="success"
                          size="sm"
                          loading={confirmingId === p.id}
                          onClick={() => handleConfirmCash(p.id)}
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
              No open months to display.
            </p>
          </Card>
        )}
      </main>
    </div>
  );
}
