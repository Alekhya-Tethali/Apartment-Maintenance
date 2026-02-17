"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/StatusBadge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Toast from "@/components/ui/Toast";
import { useAppConfig } from "@/hooks/useAppConfig";
import { PAYMENT_MODE_LABELS, MONTH_NAMES } from "@/lib/constants";
import { findCurrentMonth } from "@/lib/types";
import type { MonthData, PaymentData, ToastState } from "@/lib/types";

function getLateInfo(payment: PaymentData): string | null {
  const dueDate = new Date(payment.year, payment.month - 1, payment.dueDateDay);
  const submittedDate = new Date(payment.submittedAt);

  if (submittedDate <= dueDate) return null;

  const diffDays = Math.ceil(
    (submittedDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays <= 0) return null;
  return `Submitted ${diffDays} day${diffDays > 1 ? "s" : ""} after due date`;
}

function isEditable(payment: PaymentData): boolean {
  // Can only edit if payment is still in initial pending state and month is open
  if (payment.monthStatus === "closed") return false;
  if (payment.status === "paid") return false;
  if (payment.status === "pending_collection") return false;
  // pending_verification without screenshot = upload failed, allow retry
  // pending_verification with screenshot = waiting on admin
  // pending_security = waiting on security confirmation
  // rejected = can resubmit
  return true;
}

export default function ResidentDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<{ flatNumber: string; flatId: number } | null>(null);
  const [currentMonth, setCurrentMonth] = useState<MonthData | null>(null);
  const [currentPayment, setCurrentPayment] = useState<PaymentData | null>(null);
  const [pastPayments, setPastPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState>(null);
  const { securityName, adminName } = useAppConfig();

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

      // Find current month — prefer open month matching current calendar month
      const bestMonth = findCurrentMonth(monthsData);
      setCurrentMonth(bestMonth);

      // Find payment for current month
      if (bestMonth) {
        const monthPayment = paymentsData.find(
          (p: PaymentData) => p.monthId === bestMonth.id
        );
        setCurrentPayment(monthPayment || null);
      }

      // Past payments (not current month) — sorted newest first
      const past = paymentsData
        .filter((p: PaymentData) => !bestMonth || p.monthId !== bestMonth.id)
        .sort((a: PaymentData, b: PaymentData) => b.year - a.year || b.month - a.month);
      setPastPayments(past);
    } catch {
      setToast({ message: "Failed to load data", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingSpinner fullPage />;
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
        title="Laurel Residency"
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
                  <StatusBadge status={currentPayment.status} securityName={securityName} adminName={adminName} role="resident" />
                </div>

                {/* Submitted without screenshot — neutral info */}
                {currentPayment.status === "pending_verification" &&
                  !currentPayment.hasScreenshot &&
                  currentPayment.paymentMode !== "cash" && (
                  <div className="bg-indigo-50 p-3 rounded-xl text-sm text-indigo-700">
                    Submitted without screenshot. You can edit your submission to add one.
                  </div>
                )}

                {currentPayment.adminNote && (
                  <div className="bg-rose-50 p-3 rounded-xl text-sm text-rose-700">
                    <strong>Note:</strong> {currentPayment.adminNote}
                  </div>
                )}

                {/* Action buttons based on editable state */}
                {isEditable(currentPayment) && (
                  <Button
                    onClick={() =>
                      router.push(`/resident/submit?monthId=${currentMonth.id}`)
                    }
                    variant={currentPayment.status === "rejected" ? "primary" : "outline"}
                    size="lg"
                  >
                    {currentPayment.status === "rejected"
                      ? "Resubmit Payment"
                      : "Edit Submission"}
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Due</span>
                  <span className="text-xl font-bold text-rose-600">Unpaid</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Due Date</span>
                  <span className={`font-medium ${isOverdue ? "text-rose-600" : "text-slate-700"}`}>
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

        {/* Past Months */}
        {pastPayments.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
              Past Months
            </h3>
            <div className="space-y-2">
              {pastPayments.slice(0, 3).map((p) => {
                const lateInfo = getLateInfo(p);
                return (
                  <Card key={p.id}>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-slate-800">
                          {MONTH_NAMES[p.month - 1]} {p.year}
                        </div>
                        <div className="text-sm text-slate-500">
                          ₹{p.amount.toLocaleString("en-IN")} via{" "}
                          {PAYMENT_MODE_LABELS[p.paymentMode]}
                        </div>
                        {lateInfo && (
                          <div className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.828a1 1 0 101.415-1.414L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                            {lateInfo}
                          </div>
                        )}
                      </div>
                      <StatusBadge status={p.status} securityName={securityName} adminName={adminName} role="resident" />
                    </div>
                  </Card>
                );
              })}
            </div>
            {pastPayments.length > 3 && (
              <div className="text-center mt-3">
                <button
                  onClick={() => router.push("/resident/history")}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  View All ({pastPayments.length})
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
