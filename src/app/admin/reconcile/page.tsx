"use client";

import { useState } from "react";
import NavBar from "@/components/NavBar";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Toast from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import { useApiQuery } from "@/hooks/useApiQuery";
import { useSession } from "@/contexts/SessionContext";
import { apiGetPendingCash, apiCollectPayment } from "@/lib/api-client";
import { MONTH_NAMES } from "@/lib/constants";

export default function ReconcileCash() {
  const { data: payments, loading, refetch } = useApiQuery(apiGetPendingCash);
  const [collectingId, setCollectingId] = useState<number | null>(null);
  const { toast, showToast, clearToast } = useToast();
  const { config: { securityName } } = useSession();

  const handleCollect = async (paymentId: number) => {
    setCollectingId(paymentId);
    try {
      await apiCollectPayment(paymentId);
      showToast("Cash collected!", "success");
      refetch();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Network error", "error");
    } finally {
      setCollectingId(null);
    }
  };

  const items = payments ?? [];
  const totalAmount = items.reduce((sum, p) => sum + p.amount, 0);

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={clearToast} />
      )}
      <NavBar title={`Collect from ${securityName || "Security"}`} backHref="/admin/months" />

      <main className="max-w-lg mx-auto p-4 space-y-4">
        {items.length > 0 && (
          <Card className="bg-orange-50 border-orange-200">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-700">
                ₹{totalAmount.toLocaleString("en-IN")}
              </div>
              <div className="text-sm text-orange-600">
                Total to collect from {securityName || "security"} ({items.length} flats)
              </div>
            </div>
          </Card>
        )}

        {items.length === 0 ? (
          <Card>
            <p className="text-slate-500 text-center py-4">
              No cash pending collection.
            </p>
          </Card>
        ) : (
          items.map((p) => (
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
                  className="!w-auto"
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
