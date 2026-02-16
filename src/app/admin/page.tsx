"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import NavBar from "@/components/NavBar";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import FlatGrid from "@/components/FlatGrid";
import Toast from "@/components/ui/Toast";
import { type PaymentStatus, type PaymentMode, PAYMENT_MODE_LABELS, STATUS_LABELS } from "@/lib/constants";

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
}

interface FlatStatusItem {
  flatNumber: string;
  flatId: number;
  amount: number;
  status: PaymentStatus | "not_paid" | "overdue";
  paymentId?: number;
}

const formatPaymentDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    }>
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
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Flat history modal
  const [modalFlat, setModalFlat] = useState<FlatStatusItem | null>(null);
  const [flatPayments, setFlatPayments] = useState<PaymentData[]>([]);
  const [loadingFlatHistory, setLoadingFlatHistory] = useState(false);

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
        // If URL has monthId, use that; otherwise default to open month
        if (urlMonthId) {
          const urlMonth = monthsData.find((m: MonthData) => m.id === parseInt(urlMonthId));
          if (urlMonth) {
            setSelectedMonth(urlMonth);
            return;
          }
        }
        const openMonth = monthsData.find((m: MonthData) => m.status === "open");
        setSelectedMonth(openMonth || monthsData[0]);
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

  const handleFlatClick = async (flat: FlatStatusItem) => {
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

  const gridData: FlatStatusItem[] = allFlats.map((flat) => {
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
      <NavBar title="Laurel Residency" subtitle="Admin" />

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {/* Month Selector with Year Grouping */}
        {(() => {
          const years = [...new Set(allMonths.map((m) => m.year))].sort((a, b) => b - a);
          const selectedYear = selectedMonth?.year || years[0];
          const yearMonths = allMonths
            .filter((m) => m.year === selectedYear)
            .sort((a, b) => b.month - a.month);

          return (
            <div className="space-y-2">
              {/* Year selector (only if multiple years) */}
              {years.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {years.map((y) => (
                    <button
                      key={y}
                      onClick={() => {
                        const firstOfYear = allMonths.find((m) => m.year === y);
                        if (firstOfYear) setSelectedMonth(firstOfYear);
                      }}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all
                        ${selectedYear === y
                          ? "bg-slate-800 text-white"
                          : "bg-slate-100 text-slate-500"}`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              )}
              {/* Month pills for selected year */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {yearMonths.map((m) => (
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
                    {MONTH_NAMES[m.month - 1]}
                    {m.status === "closed" && " \u2713"}
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

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
            <FlatGrid flats={gridData} onFlatClick={handleFlatClick} />

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
                          {STATUS_LABELS[p.status] || p.status}
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
