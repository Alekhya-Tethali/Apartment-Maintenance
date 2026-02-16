"use client";

import { useEffect, useState, useCallback } from "react";
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

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function MonthManagement() {
  const [months, setMonths] = useState<MonthData[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/months");
      setMonths(await res.json());
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
    setActionLoading(true);
    const now = new Date();
    let month = now.getMonth() + 1;
    let year = now.getFullYear();

    // If current month already exists, open next month
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
        loadData();
      } else {
        const data = await res.json();
        setToast({ message: data.error, type: "error" });
      }
    } catch {
      setToast({ message: "Network error", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseMonth = async (monthId: number) => {
    setActionLoading(true);
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
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
      <NavBar title="Month Management" backHref="/admin" />

      <main className="max-w-lg mx-auto p-4 space-y-4">
        <Button
          onClick={handleOpenMonth}
          loading={actionLoading}
          size="lg"
        >
          Open Next Month
        </Button>

        <div className="space-y-2">
          {months.map((m) => (
            <Card key={m.id}>
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-bold text-slate-800">
                    {MONTH_NAMES[m.month - 1]} {m.year}
                  </div>
                  <div className="text-sm text-slate-500">
                    {m.status === "open" ? (
                      <span className="text-green-600 font-medium">Open</span>
                    ) : (
                      <span className="text-slate-400">
                        Closed {m.closedAt ? new Date(m.closedAt).toLocaleDateString("en-IN") : ""}
                      </span>
                    )}
                  </div>
                </div>
                {m.status === "open" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCloseMonth(m.id)}
                    loading={actionLoading}
                  >
                    Close Month
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
