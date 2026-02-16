"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/StatusBadge";
import Toast from "@/components/ui/Toast";
import { PAYMENT_MODE_LABELS, type PaymentStatus, type PaymentMode } from "@/lib/constants";

interface MonthData {
  id: number;
  month: number;
  year: number;
  status: string;
  dueDateDay: number;
}

interface PaymentData {
  id: number;
  flatNumber: string;
  month: number;
  year: number;
  monthId: number;
  amount: number;
  paymentMode: PaymentMode;
  status: PaymentStatus;
  submittedAt: string;
  adminNote: string | null;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function ResidentDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<{ flatNumber: string; flatId: number } | null>(null);
  const [currentMonth, setCurrentMonth] = useState<MonthData | null>(null);
  const [currentPayment, setCurrentPayment] = useState<PaymentData | null>(null);
  const [pastPayments, setPastPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [sessionRes, monthsRes, paymentsRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/months"),
        fetch("/api/payments"),
      ]);

      const sessionData = await sessionRes.json();
      const monthsData = await monthsRes.json();
      const paymentsData = await paymentsRes.json();

      setSession(sessionData);

      // Find current open month
      const openMonth = monthsData.find((m: MonthData) => m.status === "open");
      setCurrentMonth(openMonth || null);

      // Find payment for current month
      if (openMonth) {
        const monthPayment = paymentsData.find(
          (p: PaymentData) => p.monthId === openMonth.id
        );
        setCurrentPayment(monthPayment || null);
      }

      // Past payments (not current month)
      const past = paymentsData.filter(
        (p: PaymentData) => !openMonth || p.monthId !== openMonth.id
      );
      setPastPayments(past);
    } catch {
      setToast({ message: "Failed to load data", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const isOverdue = currentMonth
    ? new Date().getDate() > currentMonth.dueDateDay
    : false;

  return (
    <div className="min-h-screen bg-slate-50">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <NavBar
        title="My Maintenance"
        subtitle={session ? `Flat ${session.flatNumber}` : ""}
      />
      <main className="max-w-lg mx-auto p-4 space-y-4">
        {/* Current Month Card */}
        {currentMonth ? (
          <Card>
            <h2 className="text-lg font-bold text-slate-800 mb-3">
              {MONTH_NAMES[currentMonth.month - 1]} {currentMonth.year}
            </h2>

            {currentPayment ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Amount</span>
                  <span className="text-xl font-bold">
                    ₹{currentPayment.amount.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Mode</span>
                  <span className="font-medium">
                    {PAYMENT_MODE_LABELS[currentPayment.paymentMode]}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Status</span>
                  <StatusBadge status={currentPayment.status} />
                </div>
                {currentPayment.adminNote && (
                  <div className="bg-red-50 p-3 rounded-xl text-sm text-red-700">
                    <strong>Note:</strong> {currentPayment.adminNote}
                  </div>
                )}
                {currentPayment.status === "rejected" && (
                  <Button
                    onClick={() =>
                      router.push(`/resident/submit?monthId=${currentMonth.id}`)
                    }
                    variant="primary"
                    size="lg"
                  >
                    Resubmit Payment
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Due</span>
                  <span className="text-xl font-bold text-red-600">Unpaid</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Due Date</span>
                  <span className={`font-medium ${isOverdue ? "text-red-600" : "text-slate-700"}`}>
                    {currentMonth.dueDateDay}th {MONTH_NAMES[currentMonth.month - 1]}
                    {isOverdue && " (Overdue!)"}
                  </span>
                </div>
                <Button
                  onClick={() =>
                    router.push(`/resident/submit?monthId=${currentMonth.id}`)
                  }
                  size="lg"
                >
                  Pay Now
                </Button>
              </div>
            )}
          </Card>
        ) : (
          <Card>
            <p className="text-slate-500 text-center py-4">
              No active month. Contact admin.
            </p>
          </Card>
        )}

        {/* Payment History */}
        {pastPayments.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
              Payment History
            </h3>
            <div className="space-y-2">
              {pastPayments.map((p) => (
                <Card key={p.id} className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-slate-800">
                      {MONTH_NAMES[p.month - 1]} {p.year}
                    </div>
                    <div className="text-sm text-slate-500">
                      ₹{p.amount.toLocaleString("en-IN")} via{" "}
                      {PAYMENT_MODE_LABELS[p.paymentMode]}
                    </div>
                  </div>
                  <StatusBadge status={p.status} />
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
