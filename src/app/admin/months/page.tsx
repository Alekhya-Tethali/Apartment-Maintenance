"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Toast from "@/components/ui/Toast";

interface MonthData {
  id: number;
  month: number;
  year: number;
  status: string;
  closedAt: string | null;
}

interface PaymentData {
  monthId: number;
  amount: number;
  status: string;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const TOTAL_FLATS = 12;

function getProgressColor(paid: number, total: number): string {
  const ratio = total > 0 ? paid / total : 0;
  if (ratio >= 1) return "bg-green-500";
  if (ratio >= 0.75) return "bg-green-400";
  if (ratio >= 0.5) return "bg-yellow-400";
  if (ratio >= 0.25) return "bg-orange-400";
  return "bg-red-400";
}

export default function MonthManagement() {
  const router = useRouter();
  const [months, setMonths] = useState<MonthData[]>([]);
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const loadData = useCallback(async () => {
    try {
      const [monthsRes, paymentsRes] = await Promise.all([
        fetch("/api/months"),
        fetch("/api/payments"),
      ]);
      const monthsData = await monthsRes.json();
      const paymentsData = await paymentsRes.json();
      setMonths(monthsData);
      setPayments(paymentsData);
    } catch {
      setToast({ message: "Failed to load", type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

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
      const res = await fetch("/api/months", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year }),
      });
      if (res.ok) {
        setToast({ message: `${MONTH_NAMES[month - 1]} ${year} opened!`, type: "success" });
        setSelectedYear(year);
        loadData();
      } else {
        const data = await res.json();
        setToast({ message: data.error, type: "error" });
      }
    } catch {
      setToast({ message: "Network error", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCloseMonth = async (e: React.MouseEvent, monthId: number) => {
    e.stopPropagation();
    setActionLoading(`close-${monthId}`);
    try {
      const res = await fetch("/api/months/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthId }),
      });
      if (res.ok) {
        setToast({ message: "Month closed!", type: "success" });
        loadData();
      } else {
        const data = await res.json();
        setToast({ message: data.error, type: "error" });
      }
    } catch {
      setToast({ message: "Network error", type: "error" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReopenMonth = async (e: React.MouseEvent, monthId: number) => {
    e.stopPropagation();
    setActionLoading(`reopen-${monthId}`);
    try {
      const res = await fetch("/api/months/reopen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthId }),
      });
      if (res.ok) {
        setToast({ message: "Month reopened!", type: "success" });
        loadData();
      } else {
        const data = await res.json();
        setToast({ message: data.error, type: "error" });
      }
    } catch {
      setToast({ message: "Network error", type: "error" });
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
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
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      <NavBar title="Month Management" backHref="/admin" />

      <main className="max-w-lg mx-auto p-4 space-y-4">
        <Button
          onClick={handleOpenMonth}
          loading={actionLoading === "open"}
          size="lg"
        >
          Open Next Month
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
                    ? "bg-blue-600 text-white"
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
                        <div className={`text-xs font-medium ${isOpen ? "text-green-600" : "text-slate-400"}`}>
                          {isOpen ? "Open" : `Closed${m.closedAt ? ` ${new Date(m.closedAt).toLocaleDateString("en-IN")}` : ""}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isOpen ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleCloseMonth(e, m.id)}
                            loading={actionLoading === `close-${m.id}`}
                          >
                            Close
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleReopenMonth(e, m.id)}
                            loading={actionLoading === `reopen-${m.id}`}
                          >
                            Reopen
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="w-full bg-slate-200 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full transition-all ${getProgressColor(stats.paid, TOTAL_FLATS)}`}
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
                      <span className="text-green-600">{stats.paid} paid</span>
                      {stats.pending > 0 && (
                        <span className="text-yellow-600">{stats.pending} pending</span>
                      )}
                      {stats.collected > 0 && (
                        <span className="text-blue-600">₹{stats.collected.toLocaleString("en-IN")}</span>
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
