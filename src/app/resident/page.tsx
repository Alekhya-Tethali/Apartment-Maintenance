"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/StatusBadge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Toast from "@/components/ui/Toast";
import { useSession } from "@/contexts/SessionContext";
import { useToast } from "@/hooks/useToast";
import { apiGetMonths, apiGetPayments, apiGetFlats, apiUpdateResidentName } from "@/lib/api-client";
import { getLateInfo, isEditable } from "@/lib/payment-helpers";
import { PAYMENT_MODE_LABELS, MONTH_NAMES } from "@/lib/constants";
import { findCurrentMonth } from "@/lib/types";
import type { MonthData, PaymentData } from "@/lib/types";

export default function ResidentDashboard() {
  const router = useRouter();
  const { session, config: { securityName, adminName }, loading: sessionLoading } = useSession();
  const [currentMonth, setCurrentMonth] = useState<MonthData | null>(null);
  const [currentPayment, setCurrentPayment] = useState<PaymentData | null>(null);
  const [pastPayments, setPastPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast, showToast, clearToast } = useToast();
  const [residentName, setResidentName] = useState<string>("");
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (!sessionLoading) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionLoading]);

  async function loadData() {
    try {
      const [monthsData, paymentsData, flatsData] = await Promise.all([
        apiGetMonths(),
        apiGetPayments(),
        apiGetFlats(),
      ]);

      // Find this resident's flat and get their display name
      if (session?.flatId) {
        const myFlat = flatsData.find((f) => f.id === session.flatId);
        if (myFlat) {
          const name = myFlat.isRented && myFlat.tenantName
            ? myFlat.tenantName
            : myFlat.ownerName || "";
          setResidentName(name);
        }
      }

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
      showToast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setSavingName(true);
    try {
      await apiUpdateResidentName(trimmed);
      setResidentName(trimmed);
      setEditingName(false);
      showToast("Name updated!", "success");
    } catch {
      showToast("Failed to update name", "error");
    } finally {
      setSavingName(false);
    }
  };

  if (loading || sessionLoading) {
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
          onClose={clearToast}
        />
      )}
      <NavBar
        title="Laurel Residency"
        subtitle={session ? `Flat ${session.flatNumber}` : ""}
      />
      <main className="max-w-lg mx-auto p-4 space-y-4">
        {/* Resident Name */}
        <div className="flex items-center gap-2">
          {editingName ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Enter your name"
                className="flex-1 px-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setEditingName(false); }}
              />
              <button
                onClick={handleSaveName}
                disabled={savingName || !nameInput.trim()}
                className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg disabled:opacity-50"
              >
                {savingName ? "..." : "Save"}
              </button>
              <button
                onClick={() => setEditingName(false)}
                className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setNameInput(residentName); setEditingName(true); }}
              className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-indigo-600 transition-colors"
            >
              {residentName ? (
                <span>{residentName}</span>
              ) : (
                <span className="text-slate-400 italic">Add your name</span>
              )}
              <svg className="w-3.5 h-3.5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
        </div>

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
