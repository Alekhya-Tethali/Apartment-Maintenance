"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Toast from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import { apiGetMonths, apiGetPayments, apiOpenMonth, apiCloseMonth, apiReopenMonth } from "@/lib/api-client";
import { MONTH_NAMES } from "@/lib/constants";
import { getProgressColor } from "@/lib/theme";
import type { MonthData, PaymentData } from "@/lib/types";
const TOTAL_FLATS = 12;

export default function MonthManagement() {
  const router = useRouter();
  const [months, setMonths] = useState<MonthData[]>([]);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { toast, showToast, clearToast } = useToast();
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [notifyingMonthId, setNotifyingMonthId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [monthsData, paymentsData] = await Promise.all([
        apiGetMonths(),
        apiGetPayments(),
      ]);
      setMonths(monthsData);
      setPayments(paymentsData);
    } catch {
      showToast("Failed to load", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenMonth = async () => {
    setActionLoading("open");
    const now = new Date();
    let month = now.getMonth() + 1;
    let year = now.getFullYear();

    const exists = months.find((m) => m.month === month && m.year === year);
    if (exists) {
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }

    try {
      await apiOpenMonth(month, year);
      showToast(`${MONTH_NAMES[month - 1]} ${year} opened!`, "success");
      setSelectedYear(year);
      loadData();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Network error", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCloseMonth = async (e: React.MouseEvent, monthId: number) => {
    e.stopPropagation();
    setActionLoading(`close-${monthId}`);
    try {
      await apiCloseMonth(monthId);
      showToast("Month closed!", "success");
      loadData();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Network error", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleNotify = async (e: React.MouseEvent, monthId: number) => {
    e.stopPropagation();
    setNotifyingMonthId(monthId);
    try {
      const res = await fetch("/api/notifications/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthId }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`Sent to Telegram! ${data.defaulters} defaulter(s)`, "success");
      } else {
        showToast(data.error || "Failed to send", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setNotifyingMonthId(null);
    }
  };

  const handleReopenMonth = async (e: React.MouseEvent, monthId: number) => {
    e.stopPropagation();
    setActionLoading(`reopen-${monthId}`);
    try {
      await apiReopenMonth(monthId);
      showToast("Month reopened!", "success");
      loadData();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Network error", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const getMonthStats = (monthId: number) => {
    const monthPayments = payments.filter((p) => p.monthId === monthId);
    const paid = monthPayments.filter((p) => p.status === "paid").length;
    const submitted = monthPayments.filter((p) => p.status !== "rejected").length;
    const collected = monthPayments
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + p.amount, 0);
    const pending = monthPayments.filter(
      (p) => p.status === "pending_verification" || p.status === "pending_security" || p.status === "pending_collection"
    ).length;
    return { paid, submitted, collected, pending };
  };

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  // Get unique years
  const years = [...new Set(months.map((m) => m.year))].sort((a, b) => b - a);
  if (years.length === 0) years.push(new Date().getFullYear());

  // Filter months by selected year, sort by month
  const yearMonths = months
    .filter((m) => m.year === selectedYear)
    .sort((a, b) => b.month - a.month);

  return (
    <div className="min-h-screen bg-slate-50">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={clearToast} />
      )}
      <NavBar
        title="Laurel Residency"
        subtitle="Admin"
        actions={
          <>
            <button
              onClick={() => router.push("/admin/requests")}
              className="p-2 hover:bg-indigo-800 rounded-lg transition-colors"
              title="Requests"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
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
        <Button
          onClick={handleOpenMonth}
          loading={actionLoading === "open"}
          size="sm"
          variant="outline"
        >
          + Open Next Month
        </Button>

        {/* Year Selector */}
        {years.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {years.map((y) => (
              <button
                key={y}
                onClick={() => setSelectedYear(y)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all
                  ${selectedYear === y
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-slate-600 border border-slate-200"}`}
              >
                {y}
              </button>
            ))}
          </div>
        )}

        {/* Months for selected year */}
        {yearMonths.length === 0 ? (
          <Card>
            <p className="text-slate-500 text-center py-4">No months for {selectedYear}</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {yearMonths.map((m) => {
              const stats = getMonthStats(m.id);
              const isOpen = m.status === "open";

              return (
                <Card
                  key={m.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => router.push(`/admin?monthId=${m.id}`)}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-bold text-slate-800 text-lg">
                          {MONTH_NAMES[m.month - 1]} {m.year}
                        </div>
                        <div className={`text-xs font-medium ${isOpen ? "text-emerald-600" : "text-slate-400"}`}>
                          {isOpen ? "Open" : `Closed${m.closedAt ? ` ${new Date(m.closedAt).toLocaleDateString("en-IN")}` : ""}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isOpen ? (
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => handleNotify(e, m.id)}
                              disabled={notifyingMonthId === m.id}
                              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Send status to Telegram"
                            >
                              {notifyingMonthId === m.id ? (
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                              )}
                            </button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => handleCloseMonth(e, m.id)}
                              loading={actionLoading === `close-${m.id}`}
                              className="!w-auto"
                            >
                              Close
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(`/api/months/${m.id}/report`, "_blank");
                              }}
                              className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                              PDF
                            </button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => handleReopenMonth(e, m.id)}
                              loading={actionLoading === `reopen-${m.id}`}
                              className="!w-auto whitespace-nowrap"
                            >
                              Reopen
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="w-full bg-slate-200 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full transition-all ${getProgressColor(TOTAL_FLATS > 0 ? stats.paid / TOTAL_FLATS : 0)}`}
                            style={{ width: `${(stats.submitted / TOTAL_FLATS) * 100}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">
                        {stats.submitted}/{TOTAL_FLATS}
                      </span>
                    </div>

                    {/* Stats row */}
                    <div className="flex gap-3 text-xs text-slate-500">
                      <span className="text-emerald-600">{stats.paid} paid</span>
                      {stats.pending > 0 && (
                        <span className="text-amber-600">{stats.pending} pending</span>
                      )}
                      {stats.collected > 0 && (
                        <span className="text-indigo-600">₹{stats.collected.toLocaleString("en-IN")}</span>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
