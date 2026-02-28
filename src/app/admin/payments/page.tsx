"use client";

import { useState } from "react";
import NavBar from "@/components/NavBar";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Toast from "@/components/ui/Toast";
import ScreenshotLightbox from "@/components/payment-detail/ScreenshotLightbox";
import { useToast } from "@/hooks/useToast";
import { useApiQuery } from "@/hooks/useApiQuery";
import { apiGetPendingPayments, apiApprovePayment, apiRejectPayment } from "@/lib/api-client";
import { PAYMENT_MODE_LABELS, MONTH_NAMES } from "@/lib/constants";
import type { PendingPayment } from "@/lib/types";

export default function PendingPayments() {
  const { data: payments, loading, refetch } = useApiQuery(apiGetPendingPayments);
  const [actionId, setActionId] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const { toast, showToast, clearToast } = useToast();

  const handleApprove = async (paymentId: number) => {
    setActionId(paymentId);
    try {
      await apiApprovePayment(paymentId);
      showToast("Payment approved!", "success");
      refetch();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Network error", "error");
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectId || !rejectReason) return;
    setActionId(rejectId);
    try {
      await apiRejectPayment(rejectId, rejectReason);
      showToast("Payment rejected", "success");
      setRejectId(null);
      setRejectReason("");
      refetch();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Network error", "error");
    } finally {
      setActionId(null);
    }
  };

  const viewScreenshot = (paymentId: number) => {
    setScreenshotUrl(`/api/screenshots?paymentId=${paymentId}`);
  };

  if (loading) {
    return <LoadingSpinner fullPage />;
  }

  const items = payments ?? [];

  return (
    <div className="min-h-screen bg-slate-50">
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={clearToast} />
      )}
      <NavBar title="Pending Approvals" backHref="/admin/months" />

      {/* Screenshot Modal with Loading */}
      {screenshotUrl && (
        <ScreenshotLightbox url={screenshotUrl} onClose={() => setScreenshotUrl(null)} />
      )}

      {/* Reject Modal */}
      {rejectId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm p-4 space-y-3">
            <h3 className="text-lg font-bold">Reject Payment</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              className="w-full p-3 border-2 border-slate-300 rounded-xl resize-none h-24 focus:border-rose-500 outline-none"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => { setRejectId(null); setRejectReason(""); }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleReject}
                loading={actionId === rejectId}
                disabled={!rejectReason.trim()}
              >
                Reject
              </Button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-lg mx-auto p-4 space-y-3">
        {items.length === 0 ? (
          <Card>
            <p className="text-slate-500 text-center py-4">
              No pending payments to verify.
            </p>
          </Card>
        ) : (
          (() => {
            // Group payments by month, sorted newest first
            const grouped = new Map<string, PendingPayment[]>();
            const sorted = [...items].sort((a, b) => b.year - a.year || b.month - a.month);
            for (const p of sorted) {
              const key = `${p.year}-${p.month}`;
              const list = grouped.get(key) || [];
              list.push(p);
              grouped.set(key, list);
            }
            return [...grouped.entries()].map(([key, monthPayments]) => {
              const first = monthPayments[0];
              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <h3 className="text-sm font-semibold text-slate-500">
                      {MONTH_NAMES[first.month - 1]} {first.year}
                    </h3>
                    <span className="text-xs text-slate-400">({monthPayments.length})</span>
                  </div>
                  {monthPayments.map((p) => (
                    <Card key={p.id}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-bold text-lg text-slate-800">
                            Flat {p.flatNumber}
                          </div>
                          <div className="text-sm text-slate-500">
                            {PAYMENT_MODE_LABELS[p.paymentMode]} — ₹{p.amount.toLocaleString("en-IN")}
                          </div>
                          <div className="text-xs text-slate-400">
                            {new Date(p.submittedAt).toLocaleDateString("en-IN")}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {p.hasScreenshot && (
                          <Button variant="outline" size="sm" onClick={() => viewScreenshot(p.id)}>
                            View Screenshot
                          </Button>
                        )}
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleApprove(p.id)}
                          loading={actionId === p.id}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setRejectId(p.id)}
                        >
                          Reject
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              );
            });
          })()
        )}
      </main>
    </div>
  );
}
