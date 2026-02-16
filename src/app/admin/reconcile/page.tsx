"use client";

import { useEffect, useState, useCallback } from "react";
import NavBar from "@/components/NavBar";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Toast from "@/components/ui/Toast";

interface PendingCash {
  id: number;
  flatNumber: string;
  amount: number;
  submittedAt: string;
  securityConfirmedAt: string;
  month: number;
  year: number;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function ReconcileCash() {
  const [payments, setPayments] = useState<PendingCash[]>([]);
  const [loading, setLoading] = useState(true);
  const [collectingId, setCollectingId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/payments?status=pending_collection");
      setPayments(await res.json());
    } catch {
      setToast({ message: "Failed to load", type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCollect = async (paymentId: number) => {
    setCollectingId(paymentId);
    try {
      const res = await fetch("/api/payments/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId }),
      });
      if (res.ok) {
        setToast({ message: "Cash collected!", type: "success" });
        loadData();
      } else {
        const data = await res.json();
        setToast({ message: data.error, type: "error" });
      }
    } catch {
      setToast({ message: "Network error", type: "error" });
    } finally {
      setCollectingId(null);
    }
  };

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);

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
      <NavBar title="Collect from Security" backHref="/admin" />

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {payments.length > 0 && (
          <Card className="bg-orange-50 border-orange-200">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-700">
                ₹{totalAmount.toLocaleString("en-IN")}
              </div>
              <div className="text-sm text-orange-600">
                Total to collect from security ({payments.length} flats)
              </div>
            </div>
          </Card>
        )}

        {payments.length === 0 ? (
          <Card>
            <p className="text-slate-500 text-center py-4">
              No cash pending collection.
            </p>
          </Card>
        ) : (
          payments.map((p) => (
            <Card key={p.id}>
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-bold text-slate-800">Flat {p.flatNumber}</div>
                  <div className="text-lg font-semibold text-orange-700">
                    ₹{p.amount.toLocaleString("en-IN")}
                  </div>
                  <div className="text-xs text-slate-400">
                    {MONTH_NAMES[p.month - 1]} {p.year} — Confirmed{" "}
                    {new Date(p.securityConfirmedAt).toLocaleDateString("en-IN")}
                  </div>
                </div>
                <Button
                  variant="success"
                  size="sm"
                  loading={collectingId === p.id}
                  onClick={() => handleCollect(p.id)}
                >
                  Collected
                </Button>
              </div>
            </Card>
          ))
        )}
      </main>
    </div>
  );
}
