"use client";

import { useEffect, useState, useCallback } from "react";
import NavBar from "@/components/NavBar";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Toast from "@/components/ui/Toast";
import { PAYMENT_MODE_LABELS, type PaymentMode } from "@/lib/constants";

interface PendingPayment {
  id: number;
  flatNumber: string;
  amount: number;
  paymentMode: PaymentMode;
  submittedAt: string;
  hasScreenshot: boolean;
  month: number;
  year: number;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function PendingPayments() {
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const loadPayments = useCallback(async () => {
    try {
      const res = await fetch("/api/payments?status=pending_verification");
      setPayments(await res.json());
    } catch {
      setToast({ message: "Failed to load payments", type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const handleApprove = async (paymentId: number) => {
    setActionId(paymentId);
    try {
      const res = await fetch("/api/payments/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId }),
      });
      if (res.ok) {
        setToast({ message: "Payment approved!", type: "success" });
        loadPayments();
      } else {
        const data = await res.json();
        setToast({ message: data.error, type: "error" });
      }
    } catch {
      setToast({ message: "Network error", type: "error" });
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectId || !rejectReason) return;
    setActionId(rejectId);
    try {
      const res = await fetch("/api/payments/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: rejectId, reason: rejectReason }),
      });
      if (res.ok) {
        setToast({ message: "Payment rejected", type: "success" });
        setRejectId(null);
        setRejectReason("");
        loadPayments();
      } else {
        const data = await res.json();
        setToast({ message: data.error, type: "error" });
      }
    } catch {
      setToast({ message: "Network error", type: "error" });
    } finally {
      setActionId(null);
    }
  };

  const viewScreenshot = (paymentId: number) => {
    setScreenshotUrl(`/api/screenshots?paymentId=${paymentId}`);
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
      <NavBar title="Pending Approvals" backHref="/admin" />

      {/* Screenshot Modal */}
      {screenshotUrl && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setScreenshotUrl(null)}
        >
          <div className="bg-white rounded-2xl max-w-sm w-full max-h-[80vh] overflow-auto p-2">
            <img
              src={screenshotUrl}
              alt="Payment screenshot"
              className="w-full rounded-xl"
            />
            <Button
              onClick={() => setScreenshotUrl(null)}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              Close
            </Button>
          </div>
        </div>
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
              className="w-full p-3 border-2 border-slate-300 rounded-xl resize-none h-24 focus:border-red-500 outline-none"
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
        {payments.length === 0 ? (
          <Card>
            <p className="text-slate-500 text-center py-4">
              No pending payments to verify.
            </p>
          </Card>
        ) : (
          payments.map((p) => (
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
                    {MONTH_NAMES[p.month - 1]} {p.year} — {new Date(p.submittedAt).toLocaleDateString("en-IN")}
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
          ))
        )}
      </main>
    </div>
  );
}
