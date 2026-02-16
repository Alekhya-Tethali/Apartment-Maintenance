"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import FlatGrid from "@/components/FlatGrid";
import Toast from "@/components/ui/Toast";
import { type PaymentStatus, type PaymentMode } from "@/lib/constants";

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
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function AdminDashboard() {
  const router = useRouter();
  const [allFlats, setAllFlats] = useState<FlatData[]>([]);
  const [allMonths, setAllMonths] = useState<MonthData[]>([]);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<MonthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

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
        const openMonth = monthsData.find((m: MonthData) => m.status === "open");
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const monthPayments = payments.filter(
    (p) => selectedMonth && p.monthId === selectedMonth.id
  );

  const gridData = allFlats.map((flat) => {
    const payment = monthPayments.find((p) => p.flatId === flat.id);
    const isOverdue = selectedMonth
      ? selectedMonth.status === "open" && new Date().getDate() > selectedMonth.dueDateDay
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

  const paidCount = monthPayments.filter((p) => p.status === "paid").length;
  const pendingVerify = monthPayments.filter((p) => p.status === "pending_verification").length;
  const pendingCollect = monthPayments.filter((p) => p.status === "pending_collection").length;
  const totalCollected = monthPayments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);
  const cashToCollect = monthPayments
    .filter((p) => p.status === "pending_collection")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      <NavBar title="Admin Dashboard" />

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {/* Month Selector */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {allMonths.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedMonth(m)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all
                ${selectedMonth?.id === m.id
                  ? "bg-blue-600 text-white"
                  : m.status === "closed"
                    ? "bg-slate-200 text-slate-500"
                    : "bg-white text-slate-600 border border-slate-200"}`}
            >
              {MONTH_NAMES[m.month - 1]} {m.year}
              {m.status === "closed" && " ✓"}
            </button>
          ))}
        </div>

        {selectedMonth && (
          <>
            {/* Summary */}
            <Card>
              <h2 className="text-lg font-bold text-slate-800 mb-2">
                {MONTH_NAMES[selectedMonth.month - 1]} {selectedMonth.year}
                {selectedMonth.status === "closed" && (
                  <span className="ml-2 text-sm text-green-600 font-normal">(Closed)</span>
                )}
              </h2>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-green-50 p-3 rounded-xl">
                  <div className="text-2xl font-bold text-green-700">{paidCount}/{allFlats.length}</div>
                  <div className="text-xs text-green-600">Paid</div>
                </div>
                <div className="bg-blue-50 p-3 rounded-xl">
                  <div className="text-2xl font-bold text-blue-700">₹{totalCollected.toLocaleString("en-IN")}</div>
                  <div className="text-xs text-blue-600">Collected</div>
                </div>
                {pendingVerify > 0 && (
                  <div className="bg-yellow-50 p-3 rounded-xl">
                    <div className="text-2xl font-bold text-yellow-700">{pendingVerify}</div>
                    <div className="text-xs text-yellow-600">Verify</div>
                  </div>
                )}
                {pendingCollect > 0 && (
                  <div className="bg-orange-50 p-3 rounded-xl">
                    <div className="text-2xl font-bold text-orange-700">₹{cashToCollect.toLocaleString("en-IN")}</div>
                    <div className="text-xs text-orange-600">Collect from Security</div>
                  </div>
                )}
              </div>
            </Card>

            {/* Flat Grid */}
            <FlatGrid flats={gridData} />

            {/* Action Buttons */}
            <div className="space-y-2">
              {pendingVerify > 0 && (
                <Button
                  onClick={() => router.push("/admin/payments")}
                  variant="primary"
                  size="lg"
                >
                  Pending Approvals ({pendingVerify})
                </Button>
              )}
              {pendingCollect > 0 && (
                <Button
                  onClick={() => router.push("/admin/reconcile")}
                  variant="outline"
                  size="lg"
                >
                  Collect Cash — ₹{cashToCollect.toLocaleString("en-IN")}
                </Button>
              )}
              <Button
                onClick={() => router.push("/admin/remind")}
                variant="outline"
                size="lg"
              >
                Remind Defaulters
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => router.push("/admin/months")}
                  variant="outline"
                  size="sm"
                >
                  Months
                </Button>
                <Button
                  onClick={() => router.push("/admin/settings")}
                  variant="outline"
                  size="sm"
                >
                  Settings
                </Button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
